/**
 * POST /api/rooms/join
 *
 * Join an existing game room by passphrase
 */

// Force Node.js runtime for native modules (@node-rs/argon2)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPassphrase } from '@/lib/game/passphrase';
import { RoomJoinFormSchema } from '@/lib/validations/database.schema';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const validation = RoomJoinFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { passphrase } = validation.data;

    // Fetch all rooms to check passphrase
    // Note: This is not optimal for large scale, but works for MVP
    // In production, consider using a deterministic hash lookup
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, passphrase_hash, phase, host_id')
      .eq('is_suspended', false);

    if (roomsError) {
      console.error('Failed to fetch rooms:', roomsError);
      return NextResponse.json(
        { error: 'Failed to find room' },
        { status: 500 }
      );
    }

    // Find room with matching passphrase
    let matchedRoom = null;
    for (const room of rooms || []) {
      const isValid = await verifyPassphrase(passphrase, room.passphrase_hash);
      if (isValid) {
        matchedRoom = room;
        break;
      }
    }

    if (!matchedRoom) {
      return NextResponse.json(
        { error: 'Invalid passphrase or room not found' },
        { status: 404 }
      );
    }

    // Get player count for this room
    const { count: playerCount, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', matchedRoom.id)
      .eq('is_connected', true);

    if (countError) {
      console.error('Failed to count players:', countError);
    }

    // Check if room is full (max 8 players)
    if (playerCount !== null && playerCount >= 8) {
      return NextResponse.json(
        { error: 'Room is full (maximum 8 players)' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        roomId: matchedRoom.id,
        phase: matchedRoom.phase,
        playerCount: playerCount || 0,
        message: 'Room found successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/rooms/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
