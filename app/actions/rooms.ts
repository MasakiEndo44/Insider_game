/**
 * Room Management Server Actions
 *
 * Server-side actions for creating and joining game rooms.
 * Uses Supabase for database operations and Argon2id for passphrase hashing.
 */

'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { hashPassphrase, verifyPassphrase } from '@/lib/game/passphrase';

/**
 * Create a new game room
 *
 * @param passphrase - Room passphrase (3-10 characters, Unicode supported)
 * @param playerName - Player nickname (1-20 characters)
 * @returns {roomId, playerId} - UUIDs for room and player
 * @throws Error if creation fails
 */
export async function createRoom(passphrase: string, playerName: string) {
  // Validate inputs
  if (!passphrase || passphrase.trim().length < 3 || passphrase.trim().length > 10) {
    throw new Error('合言葉は3〜10文字で入力してください');
  }

  if (!playerName || playerName.trim().length < 1 || playerName.trim().length > 20) {
    throw new Error('プレイヤー名は1〜20文字で入力してください');
  }

  const supabase = createServiceClient();

  try {
    // 1. Hash passphrase using Argon2id + HMAC-SHA256
    const passphraseHash = await hashPassphrase(passphrase.trim());

    // 2. Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        passphrase_hash: passphraseHash,
        phase: 'LOBBY',
      })
      .select()
      .single();

    if (roomError) {
      console.error('[createRoom] Room creation error:', roomError);
      throw new Error(`ルーム作成に失敗しました: ${roomError.message}`);
    }

    // 3. Create host player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        nickname: playerName.trim(),
        is_host: true,
        is_connected: true,
        confirmed: false,
      })
      .select()
      .single();

    if (playerError) {
      console.error('[createRoom] Player creation error:', playerError);
      // Rollback: Delete the created room
      await supabase.from('rooms').delete().eq('id', room.id);
      throw new Error(`プレイヤー作成に失敗しました: ${playerError.message}`);
    }

    // 4. Update room.host_id
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ host_id: player.id })
      .eq('id', room.id);

    if (updateError) {
      console.error('[createRoom] Host ID update error:', updateError);
      // Continue anyway - not critical for initial creation
    }

    console.log('[createRoom] Success:', { roomId: room.id, playerId: player.id });

    return {
      roomId: room.id, // This is a proper UUID from database
      playerId: player.id,
    };
  } catch (error) {
    console.error('[createRoom] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('予期しないエラーが発生しました');
  }
}

/**
 * Join an existing game room
 *
 * @param passphrase - Room passphrase to verify
 * @param playerName - Player nickname (1-20 characters)
 * @returns {roomId, playerId} - UUIDs for room and player
 * @throws Error if join fails or passphrase is incorrect
 */
export async function joinRoom(passphrase: string, playerName: string) {
  // Validate inputs
  if (!passphrase || passphrase.trim().length < 3 || passphrase.trim().length > 10) {
    throw new Error('合言葉は3〜10文字で入力してください');
  }

  if (!playerName || playerName.trim().length < 1 || playerName.trim().length > 20) {
    throw new Error('プレイヤー名は1〜20文字で入力してください');
  }

  const supabase = createServiceClient();

  try {
    // 1. Hash provided passphrase
    const passphraseHash = await hashPassphrase(passphrase.trim());

    // 2. Find room with matching passphrase hash
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('passphrase_hash', passphraseHash)
      .eq('is_suspended', false) // Only active rooms
      .single();

    if (roomError || !room) {
      console.error('[joinRoom] Room not found:', roomError);
      throw new Error('合言葉が正しくないか、ルームが存在しません');
    }

    // 3. Check if room is full (max 12 players as per spec)
    const { count: playerCount, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (countError) {
      console.error('[joinRoom] Player count error:', countError);
      throw new Error('ルーム情報の取得に失敗しました');
    }

    if (playerCount !== null && playerCount >= 12) {
      throw new Error('ルームが満員です（最大12人）');
    }

    // 4. Check if nickname is already taken in this room
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('nickname')
      .eq('room_id', room.id)
      .eq('nickname', playerName.trim())
      .maybeSingle();

    let finalNickname = playerName.trim();
    if (existingPlayer) {
      // Append "-2" suffix if nickname already exists
      finalNickname = `${playerName.trim()}-2`;
    }

    // 5. Create player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        nickname: finalNickname,
        is_host: false,
        is_connected: true,
        confirmed: false,
      })
      .select()
      .single();

    if (playerError) {
      console.error('[joinRoom] Player creation error:', playerError);
      throw new Error(`ルーム参加に失敗しました: ${playerError.message}`);
    }

    console.log('[joinRoom] Success:', { roomId: room.id, playerId: player.id });

    return {
      roomId: room.id,
      playerId: player.id,
      nickname: finalNickname, // Return actual nickname (may have "-2" suffix)
    };
  } catch (error) {
    console.error('[joinRoom] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('予期しないエラーが発生しました');
  }
}
