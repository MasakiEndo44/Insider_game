/**
 * GET /api/rooms/[roomId]
 *
 * Get room state and metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient();
    const { roomId } = params;

    // Fetch room data
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, phase, host_id, is_suspended, created_at, updated_at')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Fetch players in this room
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, nickname, is_host, is_connected, confirmed')
      .eq('room_id', roomId);

    if (playersError) {
      console.error('Failed to fetch players:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    // Fetch current game session if exists
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, difficulty, phase, start_time, deadline_epoch')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error('Failed to fetch game session:', sessionError);
    }

    return NextResponse.json(
      {
        room: {
          id: room.id,
          phase: room.phase,
          hostId: room.host_id,
          isSuspended: room.is_suspended,
          createdAt: room.created_at,
          updatedAt: room.updated_at,
        },
        players: players || [],
        session: session || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/rooms/[roomId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
