'use client';

/**
 * useHostPresence Hook
 *
 * ホストの接続状態を監視するカスタムフック。
 * Supabase Realtime Presenceを使用して、ホストが退出したことを検知します。
 *
 * 機能:
 * - ホストのPresence（接続状態）をリアルタイム監視
 * - ホストが退出した際に `hostLeft` を true に設定
 * - ゲストプレイヤー専用（ホスト自身は使用しない）
 *
 * 使用例:
 * ```tsx
 * const { hostLeft } = useHostPresence(roomId, hostPlayerId, isHost);
 *
 * <HostLeftOverlay isOpen={hostLeft} />
 * ```
 */

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/providers';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  player_id: string;
  is_host: boolean;
  joined_at: string;
}

interface UseHostPresenceReturn {
  /**
   * ホストが退出したかどうか
   */
  hostLeft: boolean;
  /**
   * 現在オンラインのプレイヤーID一覧
   */
  onlinePlayerIds: string[];
}

/**
 * ホストの接続状態を監視
 *
 * @param roomId - ルームID
 * @param hostPlayerId - ホストのプレイヤーID
 * @param isCurrentUserHost - 現在のユーザーがホストかどうか
 * @returns ホスト退出状態とオンラインプレイヤー一覧
 */
export function useHostPresence(
  roomId: string | null,
  hostPlayerId: string | null,
  isCurrentUserHost: boolean
): UseHostPresenceReturn {
  const supabase = useSupabase();
  const [hostLeft, setHostLeft] = useState(false);
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<string[]>([]);

  useEffect(() => {
    // ホスト自身は監視不要
    if (!roomId || !hostPlayerId || isCurrentUserHost) {
      return;
    }

    let channel: RealtimeChannel | null = null;

    // Presenceチャネルをセットアップ
    channel = supabase.channel(`room-presence:${roomId}`, {
      config: {
        presence: {
          key: roomId, // ルームごとに一意のキー
        },
      },
    });

    // Presence sync イベント（初回と状態変化時）
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel?.presenceState<PresenceState>();
      if (!state) return;

      const presences = Object.values(state).flat();
      const playerIds = presences.map((p) => p.player_id);

      console.log('[useHostPresence] Presence sync:', presences);
      setOnlinePlayerIds(playerIds);

      // ホストがオンラインプレイヤーリストに存在しない場合
      const hostIsOnline = playerIds.includes(hostPlayerId);
      if (!hostIsOnline && presences.length > 0) {
        console.warn('[useHostPresence] Host is not online, setting hostLeft to true');
        setHostLeft(true);
      }
    });

    // Presence leave イベント（プレイヤーが退出）
    channel.on(
      'presence',
      { event: 'leave' },
      ({ leftPresences }: { leftPresences: PresenceState[] }) => {
        console.log('[useHostPresence] Presence leave:', leftPresences);

        // 退出したプレイヤーの中にホストがいるか確認
        const hostHasLeft = leftPresences.some((p) => p.player_id === hostPlayerId);

        if (hostHasLeft) {
          console.warn('[useHostPresence] Host has left the room');
          setHostLeft(true);
        }

        // オンラインプレイヤーリストを更新
        setOnlinePlayerIds((prev) =>
          prev.filter((id) => !leftPresences.some((p) => p.player_id === id))
        );
      }
    );

    // チャネルをサブスクライブ
    channel.subscribe(async (status) => {
      console.log('[useHostPresence] Subscription status:', status);

      if (status === 'SUBSCRIBED') {
        console.log('[useHostPresence] Successfully subscribed to presence channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[useHostPresence] Channel error');
      } else if (status === 'TIMED_OUT') {
        console.warn('[useHostPresence] Subscription timed out');
      }
    });

    // クリーンアップ
    return () => {
      if (channel) {
        console.log('[useHostPresence] Unsubscribing from presence channel');
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, hostPlayerId, isCurrentUserHost, supabase]);

  return { hostLeft, onlinePlayerIds };
}
