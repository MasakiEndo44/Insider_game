'use server';

/**
 * Server Actions for Room Operations
 *
 * Following Gemini's recommendation for Next.js 14 App Router best practices:
 * - Server Actions for form handling and data mutations
 * - Progressive enhancement with JavaScript disabled support
 * - Seamless integration with revalidatePath and caching
 */

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hashPassphrase, verifyPassphrase } from '@/lib/game/passphrase';
import {
  RoomCreationFormSchema,
  RoomJoinFormSchema,
  type RoomCreationForm,
  type RoomJoinForm,
} from '@/lib/validations/database.schema';

// ============================================================
// Types
// ============================================================

/**
 * Form State for Server Action responses
 * Follows Next.js Server Actions pattern
 */
export type FormState<T = unknown> = {
  success: boolean;
  message?: string;
  errors?: {
    [K in keyof T]?: string[];
  };
  fieldErrors?: Record<string, string[]>;
};

// ============================================================
// Create Room Action
// ============================================================

/**
 * Create a new game room with the host player
 *
 * @param formData - Form data containing passphrase and nickname
 * @returns FormState with success/error information
 */
export async function createRoomAction(
  formData: FormData
): Promise<FormState<RoomCreationForm>> {
  try {
    // 1. Parse and validate form data
    const rawData = {
      passphrase: formData.get('passphrase') as string,
      nickname: formData.get('nickname') as string,
    };

    const validation = RoomCreationFormSchema.safeParse(rawData);

    if (!validation.success) {
      return {
        success: false,
        message: '入力内容に誤りがあります',
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { passphrase, nickname } = validation.data;

    // 2. Create Supabase client and sign in anonymously
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.signInAnonymously();

    if (authError || !user) {
      console.error('Failed to sign in anonymously:', authError);
      return {
        success: false,
        message: '認証に失敗しました',
      };
    }

    // 3. Hash passphrase with Argon2id
    const passphraseHash = await hashPassphrase(passphrase);

    // 4. Create room in database
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        passphrase_hash: passphraseHash,
        phase: 'LOBBY',
        is_suspended: false,
      })
      .select()
      .single();

    if (roomError || !room) {
      console.error('Failed to create room:', roomError);
      return {
        success: false,
        message: 'ルームの作成に失敗しました',
      };
    }

    // 5. Add host player to the room
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        id: user.id,
        room_id: room.id,
        nickname,
        is_host: true,
        is_connected: true,
        confirmed: false,
      })
      .select()
      .single();

    if (playerError || !player) {
      console.error('Failed to create player:', playerError);
      // Rollback: Delete room if player creation failed
      await supabase.from('rooms').delete().eq('id', room.id);
      return {
        success: false,
        message: 'プレイヤーの登録に失敗しました',
      };
    }

    // 6. Update room host_id
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ host_id: player.id })
      .eq('id', room.id);

    if (updateError) {
      console.error('Failed to update room host_id:', updateError);
      // Continue anyway - not critical
    }

    // 7. Revalidate and redirect
    revalidatePath('/');
    redirect(`/room/${room.id}`);
  } catch (error) {
    console.error('Unexpected error in createRoomAction:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました',
    };
  }
}

// ============================================================
// Join Room Action
// ============================================================

/**
 * Join an existing game room
 *
 * @param formData - Form data containing passphrase and nickname
 * @returns FormState with success/error information
 */
export async function joinRoomAction(
  formData: FormData
): Promise<FormState<RoomJoinForm>> {
  try {
    // 1. Parse and validate form data
    const rawData = {
      passphrase: formData.get('passphrase') as string,
      nickname: formData.get('nickname') as string,
    };

    const validation = RoomJoinFormSchema.safeParse(rawData);

    if (!validation.success) {
      return {
        success: false,
        message: '入力内容に誤りがあります',
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { passphrase, nickname } = validation.data;

    // 2. Create Supabase client and sign in anonymously
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.signInAnonymously();

    if (authError || !user) {
      console.error('Failed to sign in anonymously:', authError);
      return {
        success: false,
        message: '認証に失敗しました',
      };
    }

    // 3. Find room with matching passphrase
    // Note: This fetches all rooms and verifies passphrase - not optimal for scale
    // In production, consider using a deterministic hash lookup
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, passphrase_hash, phase')
      .eq('is_suspended', false);

    if (roomsError) {
      console.error('Failed to fetch rooms:', roomsError);
      return {
        success: false,
        message: 'ルームの検索に失敗しました',
      };
    }

    // Verify passphrase against all rooms
    let matchedRoom: { id: string; phase: string } | null = null;
    for (const room of rooms || []) {
      const isValid = await verifyPassphrase(passphrase, room.passphrase_hash);
      if (isValid) {
        matchedRoom = room;
        break;
      }
    }

    if (!matchedRoom) {
      return {
        success: false,
        message: 'パスフレーズが間違っているか、ルームが見つかりません',
        fieldErrors: {
          passphrase: ['パスフレーズが間違っています'],
        },
      };
    }

    // 4. Check if room is full (max 8 players)
    const { count: playerCount, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', matchedRoom.id)
      .eq('is_connected', true);

    if (countError) {
      console.error('Failed to count players:', countError);
    }

    if (playerCount !== null && playerCount >= 8) {
      return {
        success: false,
        message: 'このルームは満員です（最大8人）',
      };
    }

    // 5. Check for nickname duplication and auto-correct with -2 suffix
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('nickname')
      .eq('room_id', matchedRoom.id);

    const existingNicknames = (existingPlayers || []).map((p) => p.nickname);
    let finalNickname = nickname;

    if (existingNicknames.includes(nickname)) {
      finalNickname = `${nickname}-2`;

      // If -2 also exists, increment until unique
      let suffix = 3;
      while (existingNicknames.includes(finalNickname) && suffix < 100) {
        finalNickname = `${nickname}-${suffix}`;
        suffix++;
      }
    }

    // 6. Add player to the room
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        id: user.id,
        room_id: matchedRoom.id,
        nickname: finalNickname,
        is_host: false,
        is_connected: true,
        confirmed: false,
      })
      .select()
      .single();

    if (playerError || !player) {
      console.error('Failed to create player:', playerError);
      return {
        success: false,
        message: 'ルームへの参加に失敗しました',
      };
    }

    // 7. Revalidate and redirect
    revalidatePath('/');
    revalidatePath(`/room/${matchedRoom.id}`);
    redirect(`/room/${matchedRoom.id}`);
  } catch (error) {
    console.error('Unexpected error in joinRoomAction:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました',
    };
  }
}
