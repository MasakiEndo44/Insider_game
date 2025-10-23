/**
 * Game Management Server Actions
 *
 * Server-side actions for starting games and assigning roles.
 */

'use server';

import { createServiceClient } from '@/lib/supabase/server';

/**
 * Start a new game session and assign roles to players
 *
 * @param roomId - Room UUID
 * @returns {sessionId} - Game session UUID
 * @throws Error if game start fails
 */
export async function startGame(roomId: string) {
  const supabase = createServiceClient();

  try {
    // 1. Get all connected players in the room
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_connected', true);

    if (playersError) {
      console.error('[startGame] Players fetch error:', playersError);
      throw new Error(`プレイヤー情報の取得に失敗しました: ${playersError.message}`);
    }

    // 2. Validate player count (5-8 players as per FR-002)
    if (!players || players.length < 5) {
      throw new Error('ゲームを開始するには5人以上必要です');
    }

    if (players.length > 8) {
      throw new Error('ゲームは最大8人までです');
    }

    // 3. Get previous master ID for exclusion logic (FR-002-1)
    const { data: previousSession } = await supabase
      .from('game_sessions')
      .select('prev_master_id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevMasterId = previousSession?.prev_master_id || null;

    // 4. Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id: roomId,
        difficulty: 'Normal', // TODO: Allow difficulty selection
        phase: 'DEAL',
        deadline_epoch: null, // Set when QUESTION phase starts
        prev_master_id: null, // Will be updated after role assignment
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[startGame] Session creation error:', sessionError);
      throw new Error(`ゲームセッション作成に失敗しました: ${sessionError.message}`);
    }

    // 5. Assign roles using Fisher-Yates algorithm (lib/game/roles.ts)
    const { assignRoles } = await import('@/lib/game/roles');
    const roleAssignments = assignRoles(
      players.map(p => ({ id: p.id, nickname: p.nickname })),
      prevMasterId
    );

    // Find master ID for history tracking
    const masterAssignment = roleAssignments.find(r => r.role === 'MASTER');
    if (!masterAssignment) {
      throw new Error('マスターの割り当てに失敗しました');
    }

    // 6. Insert role assignments
    const { error: rolesError } = await supabase
      .from('roles')
      .insert(
        roleAssignments.map(assignment => ({
          session_id: session.id,
          player_id: assignment.playerId,
          role: assignment.role,
        }))
      );

    if (rolesError) {
      console.error('[startGame] Roles creation error:', rolesError);
      // Rollback: Delete the created session
      await supabase.from('game_sessions').delete().eq('id', session.id);
      throw new Error(`役割割り当てに失敗しました: ${rolesError.message}`);
    }

    // 7. Update session with prev_master_id for next round
    const { error: updateSessionError } = await supabase
      .from('game_sessions')
      .update({ prev_master_id: masterAssignment.playerId })
      .eq('id', session.id);

    if (updateSessionError) {
      console.error('[startGame] Session update error:', updateSessionError);
      // Continue anyway - not critical
    }

    // 8. Select topic (lib/game/topics.ts)
    const { selectRandomTopics } = await import('@/lib/game/topics');
    const topics = await selectRandomTopics(supabase, 'Normal', 1, []);

    if (topics.length === 0) {
      throw new Error('お題の取得に失敗しました');
    }

    const selectedTopic = topics[0];

    // 9. Insert selected topic
    const { error: topicError } = await supabase
      .from('topics')
      .insert({
        session_id: session.id,
        topic_text: selectedTopic.topic_text,
        difficulty: selectedTopic.difficulty,
      });

    if (topicError) {
      console.error('[startGame] Topic creation error:', topicError);
      // Rollback: Delete session and roles
      await supabase.from('game_sessions').delete().eq('id', session.id);
      throw new Error(`お題の設定に失敗しました: ${topicError.message}`);
    }

    // 10. Mark topic as used to prevent reuse in same session
    const { markTopicsAsUsed } = await import('@/lib/game/topics');
    try {
      await markTopicsAsUsed(supabase, session.id, [selectedTopic.id]);
    } catch (markError) {
      console.error('[startGame] Mark topics as used error:', markError);
      // Continue anyway - not critical for game flow
    }

    // 11. Update room phase to DEAL
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ phase: 'DEAL' })
      .eq('id', roomId);

    if (updateError) {
      console.error('[startGame] Room phase update error:', updateError);
      // Continue anyway - session is created
    }

    console.log('[startGame] Success:', {
      sessionId: session.id,
      roomId,
      playerCount: players.length,
      prevMasterId,
      newMasterId: masterAssignment.playerId,
      topic: selectedTopic.topic_text,
    });

    return {
      sessionId: session.id,
    };
  } catch (error) {
    console.error('[startGame] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('予期しないエラーが発生しました');
  }
}


/**
 * Report correct answer during QUESTION phase
 * 
 * Transitions game from QUESTION → DEBATE phase with time inheritance
 * 
 * @param sessionId - Game session UUID
 * @param answererId - Player who answered correctly
 * @returns Success status
 * @throws Error if report fails
 */
export async function reportCorrectAnswer(sessionId: string, answererId: string) {
  const supabase = createServiceClient();

  try {
    // 1. Get current session data
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*, rooms!inner(id, phase)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`セッション情報の取得に失敗しました: ${sessionError?.message}`);
    }

    // 2. Validate current phase is QUESTION
    if (session.rooms.phase !== 'QUESTION') {
      throw new Error(`正解報告は質問フェーズ中のみ可能です（現在: ${session.rooms.phase}）`);
    }

    // 3. Calculate elapsed time and debate time (FR-004-2: Time Inheritance)
    const startTime = new Date(session.start_time).getTime() / 1000; // Convert to Unix seconds
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - startTime;
    const questionPhaseDuration = 300; // 5 minutes
    const remainingTime = Math.max(0, questionPhaseDuration - elapsed);

    // Calculate new deadline for DEBATE phase
    const debateDeadlineEpoch = now + remainingTime;

    console.log('[reportCorrectAnswer] Time calculation:', {
      startTime,
      now,
      elapsed,
      remainingTime,
      debateDeadlineEpoch,
    });

    // 4. Update game_sessions with answerer and new deadline
    const { error: updateSessionError } = await supabase
      .from('game_sessions')
      .update({
        answerer_id: answererId,
        deadline_epoch: debateDeadlineEpoch,
        phase: 'DEBATE',
      })
      .eq('id', sessionId);

    if (updateSessionError) {
      throw new Error(`セッション更新に失敗しました: ${updateSessionError.message}`);
    }

    // 5. Update room phase to DEBATE
    const { error: updateRoomError } = await supabase
      .from('rooms')
      .update({ phase: 'DEBATE' })
      .eq('id', session.rooms.id);

    if (updateRoomError) {
      throw new Error(`ルームフェーズ更新に失敗しました: ${updateRoomError.message}`);
    }

    // 6. Broadcast phase update to all clients
    // Note: Realtime broadcast is best-effort; phase is persisted in database
    try {
      await supabase
        .channel(`game:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'phase_update',
          payload: {
            phase: 'DEBATE',
            deadline_epoch: debateDeadlineEpoch,
            server_now: now,
            answerer_id: answererId,
          },
        });
    } catch (broadcastError) {
      console.error('[reportCorrectAnswer] Broadcast error:', broadcastError);
      // Continue anyway - phase is updated in database
    }

    console.log('[reportCorrectAnswer] Success:', {
      sessionId,
      answererId,
      remainingTime,
      debateDeadlineEpoch,
    });

    return { success: true };
  } catch (error) {
    console.error('[reportCorrectAnswer] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('予期しないエラーが発生しました');
  }
}


/**
 * Submit a vote (VOTE1, VOTE2, or RUNOFF)
 * 
 * Validates vote and inserts into votes table
 * 
 * @param sessionId - Game session UUID
 * @param playerId - Player UUID
 * @param voteType - Type of vote ('VOTE1', 'VOTE2', 'RUNOFF')
 * @param voteValue - Vote value (player ID for VOTE2/RUNOFF, 'yes'/'no' for VOTE1)
 * @param round - Round number (default: 1)
 * @returns Success status
 * @throws Error if vote submission fails
 */
export async function submitVote(
  sessionId: string,
  playerId: string,
  voteType: 'VOTE1' | 'VOTE2' | 'RUNOFF',
  voteValue: string,
  round: number = 1
) {
  const supabase = createServiceClient();

  try {
    // 1. Check if player already voted in this round
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .eq('vote_type', voteType)
      .eq('round', round)
      .maybeSingle();

    if (existingVote) {
      throw new Error('既に投票済みです');
    }

    // 2. Insert vote
    const { error } = await supabase
      .from('votes')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        vote_type: voteType,
        vote_value: voteValue,
        round,
      });

    if (error) {
      console.error('[submitVote] Insert error:', error);
      throw new Error(`投票の送信に失敗しました: ${error.message}`);
    }

    console.log('[submitVote] Success:', {
      sessionId,
      playerId,
      voteType,
      round,
    });

    return { success: true };
  } catch (error) {
    console.error('[submitVote] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('予期しないエラーが発生しました');
  }
}
