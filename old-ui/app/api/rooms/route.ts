/**
 * POST /api/rooms
 *
 * Create a new game room
 */

// Force Node.js runtime for native modules (@node-rs/argon2)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassphrase } from '@/lib/game/passphrase';
import { RoomCreationFormSchema } from '@/lib/validations/database.schema';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const validation = RoomCreationFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { passphrase } = validation.data;

    // Hash passphrase with Argon2id
    const passphraseHash = await hashPassphrase(passphrase);

    // Create room in database
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        passphrase_hash: passphraseHash,
        phase: 'LOBBY',
        is_suspended: false,
      })
      .select()
      .single();

    if (roomError) {
      console.error('Failed to create room:', roomError);
      return NextResponse.json(
        { error: 'Failed to create room' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        roomId: room.id,
        phase: room.phase,
        message: 'Room created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/rooms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
