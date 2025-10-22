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
    // 1. Get all players in the room
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_connected', true);

    if (playersError) {
      console.error('[startGame] Players fetch error:', playersError);
      throw new Error(`プレイヤー情報の取得に失敗しました: ${playersError.message}`);
    }

    if (!players || players.length < 3) {
      throw new Error('ゲームを開始するには最低3人必要です');
    }

    // 2. Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id: roomId,
        difficulty: 'Normal',
        phase: 'DEAL', // Role assignment phase
        deadline_epoch: null, // Will be set when QUESTION phase starts
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[startGame] Session creation error:', sessionError);
      throw new Error(`ゲームセッション作成に失敗しました: ${sessionError.message}`);
    }

    // 3. Assign roles randomly
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    // First player is Master
    const masterPlayer = shuffledPlayers[0];
    // Second player is Insider
    const insiderPlayer = shuffledPlayers[1];
    // Rest are Citizens
    const citizenPlayers = shuffledPlayers.slice(2);

    // 4. Insert role assignments
    const roleAssignments = [
      {
        session_id: session.id,
        player_id: masterPlayer.id,
        role: 'MASTER',
      },
      {
        session_id: session.id,
        player_id: insiderPlayer.id,
        role: 'INSIDER',
      },
      ...citizenPlayers.map((player) => ({
        session_id: session.id,
        player_id: player.id,
        role: 'CITIZEN',
      })),
    ];

    const { error: rolesError } = await supabase
      .from('roles')
      .insert(roleAssignments);

    if (rolesError) {
      console.error('[startGame] Roles creation error:', rolesError);
      // Rollback: Delete the created session
      await supabase.from('game_sessions').delete().eq('id', session.id);
      throw new Error(`役割割り当てに失敗しました: ${rolesError.message}`);
    }

    // 5. Update room phase to DEAL
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
      roles: roleAssignments.map(r => r.role),
    });

    return {
      sessionId: session.id,
    };
  } catch (error) {
    console.error('[startGame] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('予期しないエラーが発生しました');
  }
}
