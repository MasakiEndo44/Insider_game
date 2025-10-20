/**
 * POST /api/games/start
 *
 * Start a new game session with role assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assignRoles } from '@/lib/game/roles';
import { selectRandomTopics } from '@/lib/game/topics';
import { DifficultySelectionFormSchema } from '@/lib/validations/database.schema';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const { roomId, difficulty: rawDifficulty } = body;

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    // Validate difficulty
    const difficultyValidation = DifficultySelectionFormSchema.safeParse({
      difficulty: rawDifficulty,
    });

    if (!difficultyValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid difficulty',
          details: difficultyValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { difficulty } = difficultyValidation.data;

    // Fetch room to verify it exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id, phase')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify room is in LOBBY phase
    if (room.phase !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Game already started or in progress' },
        { status: 400 }
      );
    }

    // Fetch all connected players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, nickname, is_connected')
      .eq('room_id', roomId)
      .eq('is_connected', true);

    if (playersError) {
      console.error('Failed to fetch players:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    // Verify minimum players (4)
    if (!players || players.length < 4) {
      return NextResponse.json(
        { error: 'Minimum 4 players required to start game' },
        { status: 400 }
      );
    }

    // Verify maximum players (8)
    if (players.length > 8) {
      return NextResponse.json(
        { error: 'Maximum 8 players allowed' },
        { status: 400 }
      );
    }

    // Get previous master ID (if any) to avoid same master twice in a row
    const { data: previousSession } = await supabase
      .from('game_sessions')
      .select('prev_master_id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevMasterId = previousSession?.prev_master_id || null;

    // Assign roles
    const roleAssignments = assignRoles(players, prevMasterId);

    // Find master ID for this session
    const masterAssignment = roleAssignments.find((r) => r.role === 'MASTER');
    const masterId = masterAssignment?.playerId || null;

    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id: roomId,
        difficulty,
        phase: 'DEAL',
        start_time: new Date().toISOString(),
        prev_master_id: masterId,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Failed to create game session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create game session' },
        { status: 500 }
      );
    }

    // Insert role assignments
    const roleInserts = roleAssignments.map((assignment) => ({
      session_id: session.id,
      player_id: assignment.playerId,
      role: assignment.role,
    }));

    const { error: rolesError } = await supabase
      .from('roles')
      .insert(roleInserts);

    if (rolesError) {
      console.error('Failed to insert role assignments:', rolesError);
      return NextResponse.json(
        { error: 'Failed to assign roles' },
        { status: 500 }
      );
    }

    // Select random topics for master to choose from
    const topics = await selectRandomTopics(supabase, difficulty, 3);

    if (topics.length === 0) {
      return NextResponse.json(
        { error: `No topics available for difficulty: ${difficulty}` },
        { status: 500 }
      );
    }

    // Update room phase to DEAL
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ phase: 'DEAL' })
      .eq('id', roomId);

    if (updateError) {
      console.error('Failed to update room phase:', updateError);
      return NextResponse.json(
        { error: 'Failed to update room phase' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        sessionId: session.id,
        difficulty: session.difficulty,
        phase: session.phase,
        roleAssignments: roleAssignments.map((r) => ({
          playerId: r.playerId,
          role: r.role,
        })),
        topics: topics.map((t) => ({
          id: t.id,
          text: t.topic_text,
          difficulty: t.difficulty,
        })),
        message: 'Game started successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/games/start:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
