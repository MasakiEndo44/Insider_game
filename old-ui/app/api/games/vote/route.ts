/**
 * POST /api/games/vote
 *
 * Submit a vote in a game session
 */

// Force Node.js runtime
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitVote } from '@/lib/game/voting';
import { VoteSubmissionFormSchema } from '@/lib/validations/database.schema';

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

    // Parse and validate request body
    const body = await request.json();
    const { sessionId, voteValue, round = 1 } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Validate vote type and value
    const validation = VoteSubmissionFormSchema.safeParse({
      vote_type: body.voteType,
      vote_value: voteValue,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid vote data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { vote_type: voteType } = validation.data;

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

    // Verify user is a player in this session's room
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', session.room_id)
      .eq('id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'You are not a player in this session' },
        { status: 403 }
      );
    }

    // Submit vote
    const vote = await submitVote(
      supabase,
      sessionId,
      user.id,
      voteType,
      voteValue,
      round
    );

    return NextResponse.json(
      {
        voteId: vote.id,
        voteType: vote.vote_type,
        round: vote.round,
        message: 'Vote submitted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/games/vote:', error);

    // Handle duplicate vote error
    if (
      error instanceof Error &&
      error.message.includes('already voted')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
