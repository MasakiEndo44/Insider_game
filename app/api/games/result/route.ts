/**
 * POST /api/games/result
 *
 * Calculate and store game result
 */

// Force Node.js runtime
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getRoleAssignments,
  getVotes,
  countVotes,
  getTopVotedPlayer,
  calculateOutcome,
} from '@/lib/game/voting';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { sessionId, wordGuessed } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (typeof wordGuessed !== 'boolean') {
      return NextResponse.json(
        { error: 'wordGuessed must be a boolean' },
        { status: 400 }
      );
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, room_id, phase')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify user is host
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', session.room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can calculate results' },
        { status: 403 }
      );
    }

    // Get role assignments
    const roles = await getRoleAssignments(supabase, sessionId);

    if (!roles) {
      return NextResponse.json(
        { error: 'Failed to get role assignments' },
        { status: 500 }
      );
    }

    const { insiderId, masterId } = roles;

    // Get final votes (VOTE2 or RUNOFF)
    let votes = await getVotes(supabase, sessionId, 'VOTE2', 1);

    // If no VOTE2 votes, try RUNOFF
    if (votes.length === 0) {
      votes = await getVotes(supabase, sessionId, 'RUNOFF', 1);
    }

    // Count votes
    const voteCounts = countVotes(votes);
    const votedPlayerId = getTopVotedPlayer(voteCounts);

    // Calculate outcome
    const outcome = calculateOutcome(
      insiderId,
      masterId,
      votedPlayerId,
      wordGuessed
    );

    // Store result
    const { data: result, error: resultError } = await supabase
      .from('results')
      .insert({
        session_id: sessionId,
        outcome,
        revealed_player_id: votedPlayerId,
      })
      .select()
      .single();

    if (resultError || !result) {
      console.error('Failed to store result:', resultError);
      return NextResponse.json(
        { error: 'Failed to store result' },
        { status: 500 }
      );
    }

    // Update room phase to RESULT
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ phase: 'RESULT' })
      .eq('id', session.room_id);

    if (updateError) {
      console.error('Failed to update room phase:', updateError);
    }

    // Update session phase to RESULT
    const { error: sessionUpdateError } = await supabase
      .from('game_sessions')
      .update({ phase: 'RESULT' })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('Failed to update session phase:', sessionUpdateError);
    }

    return NextResponse.json(
      {
        resultId: result.id,
        outcome: result.outcome,
        insiderId,
        masterId,
        votedPlayerId,
        wordGuessed,
        message: 'Result calculated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/games/result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
