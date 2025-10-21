'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { useMachine } from '@xstate/react';
import { gameMachine, type GameEvent } from '@/lib/machines/gameMachine';
import type { GameMachineSnapshot } from '@/lib/machines/gameMachine';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RoomContextType {
  roomId: string;
  isConnected: boolean;
  // XState machine state
  gameState: GameMachineSnapshot;
  // Method to send events to the state machine
  sendEvent: (event: GameEvent) => void;
  // Supabase channel for broadcasting events
  channel: RealtimeChannel | null;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within RoomProvider');
  }
  return context;
}

interface RoomProviderProps {
  roomId: string;
  children: React.ReactNode;
}

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  // XState machine for game flow
  const [gameState, send] = useMachine(gameMachine, {
    input: { roomId },
  });

  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // Connection pooling: Prevent duplicate WebSocket connections
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const [currentPlayerData, setCurrentPlayerData] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();

    // Reuse existing channel if available
    if (channelRef.current) {
      logger.debug('Reusing existing WebSocket channel for room:', roomId);
      return;
    }

    // Fetch current authenticated user and player data from database
    const initializePlayer = async () => {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.error('Failed to get authenticated user:', authError);
        return;
      }

      playerIdRef.current = user.id;
      logger.debug('Using authenticated user ID:', user.id);

      // Fetch player data from database
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .eq('room_id', roomId)
        .single();

      if (playerError || !player) {
        logger.error('Failed to fetch player from database:', playerError);
        return;
      }

      setCurrentPlayerData(player);
      logger.debug('Loaded player data from database:', player);

      // Fetch all players in the room
      const { data: allPlayers, error: allPlayersError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);

      if (!allPlayersError && allPlayers) {
        logger.debug('Initial players in room:', allPlayers.length);
        // Update XState machine with initial player list
        allPlayers.forEach((p) => {
          send({
            type: 'player.join',
            player: {
              id: p.id,
              nickname: p.nickname,
              isHost: p.is_host,
              isConnected: p.is_connected,
              isReady: p.confirmed,
            },
          });
        });
      }

      setupRealtimeChannel(player);
    };

    const setupRealtimeChannel = (player: any) => {
      logger.debug('Creating new WebSocket channel for room:', roomId);

      // Supabase Realtime channel for this room
      const channel = supabase.channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: player.id },
        },
      });

      channelRef.current = channel;

      // Listen for game events broadcast from other players (or server)
      channel.on('broadcast', { event: 'game-event' }, (payload) => {
        logger.debug('Received game event:', payload);
        const event = payload.payload as GameEvent;
        // Send the event to our local state machine
        send(event);
      });

      // Listen for database changes to players table
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          logger.debug('Player database change:', payload);

          if (payload.eventType === 'INSERT') {
            const newPlayer = payload.new as any;
            send({
              type: 'player.join',
              player: {
                id: newPlayer.id,
                nickname: newPlayer.nickname,
                isHost: newPlayer.is_host,
                isConnected: newPlayer.is_connected,
                isReady: newPlayer.confirmed,
              },
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPlayer = payload.new as any;
            // Update ready status using existing event
            send({
              type: 'player.ready',
              playerId: updatedPlayer.id,
              isReady: updatedPlayer.confirmed,
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedPlayer = payload.old as any;
            send({ type: 'player.leave', playerId: deletedPlayer.id });
          }
        }
      );

      // Listen for presence changes (for connection status)
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          logger.debug('Presence sync - total online:', Object.keys(state).length);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          logger.debug('Player came online:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          logger.debug('Player went offline:', leftPresences);
          // Update database to mark player as disconnected
          Object.keys(leftPresences).forEach(async (key) => {
            const playerId = ((leftPresences as any)[key][0] as any).id;
            await supabase
              .from('players')
              .update({ is_connected: false })
              .eq('id', playerId);
          });
        })
        .subscribe(async (status, error) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('WebSocket subscribed successfully');
            setIsConnected(true);

            // Track this player's presence with actual data from database
            await channel.track({
              id: player.id,
              displayName: player.nickname,
              isReady: player.confirmed,
              isHost: player.is_host,
            });

            // Update database to mark player as connected
            await supabase
              .from('players')
              .update({ is_connected: true })
              .eq('id', player.id);
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('WebSocket channel error:', error);
            setIsConnected(false);
          } else if (status === 'TIMED_OUT') {
            logger.warn('WebSocket subscription timed out');
            setIsConnected(false);
          } else if (status === 'CLOSED') {
            logger.debug('WebSocket channel closed');
            setIsConnected(false);
          }
        });
    };

    initializePlayer();

    return () => {
      logger.debug('Cleaning up WebSocket channel for room:', roomId);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [roomId, send]);

  /**
   * Send a game event to the state machine and broadcast to all players
   * For MVP: Client-coordinated model (all clients broadcast directly)
   * Future: Server-authoritative model (send to Edge Function for validation)
   */
  const sendEvent = async (event: GameEvent) => {
    logger.debug('Sending game event:', event);

    // Update local state machine immediately (optimistic update)
    send(event);

    // Broadcast to all other players via Supabase Realtime
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'game-event',
        payload: event,
      });
    }
  };

  const value: RoomContextType = {
    roomId,
    isConnected,
    gameState,
    sendEvent,
    channel: channelRef.current,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
