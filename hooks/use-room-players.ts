'use client';

/**
 * useRoomPlayers Hook
 *
 * Custom hook for managing room players with Supabase Realtime.
 * Subscribes to `players:{roomId}` channel for real-time player updates.
 *
 * Features:
 * - Real-time player list synchronization
 * - Automatic reconnection handling
 * - Initial data fetching from database
 * - Cleanup on unmount
 *
 * Usage:
 * ```tsx
 * const { players, loading, error } = useRoomPlayers(roomId);
 * ```
 */

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/providers';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

// Player type from database
export type Player = Database['public']['Tables']['players']['Row'];

interface UseRoomPlayersReturn {
  players: Player[];
  loading: boolean;
  error: Error | null;
}

export function useRoomPlayers(roomId: string | null): UseRoomPlayersReturn {
  const supabase = useSupabase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel | null = null;

    // Initial fetch from database
    async function fetchInitialPlayers() {
      if (!roomId) return; // TypeScript guard

      try {
        const { data, error: fetchError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: true });

        if (fetchError) throw fetchError;
        setPlayers(data as Player[]);
        setLoading(false);
      } catch (err) {
        console.error('[useRoomPlayers] Initial fetch error:', err);
        setError(err as Error);
        setLoading(false);
      }
    }

    // Subscribe to Realtime channel
    function subscribeToChannel() {
      if (!roomId) return; // TypeScript guard

      channel = supabase
        .channel(`players:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            console.log('[useRoomPlayers] Realtime update:', payload);

            if (payload.eventType === 'INSERT') {
              setPlayers((prev) => [...prev, payload.new as Player]);
            } else if (payload.eventType === 'UPDATE') {
              setPlayers((prev) =>
                prev.map((p) => (p.id === payload.new.id ? (payload.new as Player) : p))
              );
            } else if (payload.eventType === 'DELETE') {
              setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[useRoomPlayers] Subscription status:', status);
          if (status === 'TIMED_OUT') {
            console.warn('[useRoomPlayers] Subscription timed out, refetching...');
            fetchInitialPlayers();
          }
          if (err) {
            console.error('[useRoomPlayers] Subscription error:', err);
            setError(new Error('Realtime subscription error'));
          }
        });
    }

    // Initialize
    fetchInitialPlayers();
    subscribeToChannel();

    // Cleanup
    return () => {
      if (channel) {
        console.log('[useRoomPlayers] Unsubscribing from channel');
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, supabase]);

  return { players, loading, error };
}
