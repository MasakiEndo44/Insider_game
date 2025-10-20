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

  useEffect(() => {
    const supabase = createClient();

    // Reuse existing channel if available
    if (channelRef.current) {
      logger.debug('Reusing existing WebSocket channel for room:', roomId);
      return;
    }

    // Generate or retrieve persistent player ID
    if (!playerIdRef.current) {
      const storageKey = `insider_game_player_id_${roomId}`;
      const storedId =
        typeof window !== 'undefined'
          ? sessionStorage.getItem(storageKey)
          : null;

      if (storedId) {
        playerIdRef.current = storedId;
        logger.debug('Restored player ID from sessionStorage:', storedId);
      } else {
        const newId = crypto.randomUUID();
        playerIdRef.current = newId;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, newId);
        }
        logger.debug('Generated new player ID:', newId);
      }
    }

    logger.debug('Creating new WebSocket channel for room:', roomId);

    // Supabase Realtime channel for this room
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: playerIdRef.current },
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

    // Listen for presence changes and update game state
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const playerList = Object.keys(state).map((key) => {
          const presence = state[key][0] as any; // Supabase presence type
          return {
            id: presence.id,
            nickname: presence.displayName,
            isHost: presence.isHost,
            isConnected: true,
            isReady: presence.isReady,
          };
        });

        logger.debug('Presence sync - total players:', playerList.length);

        // Update XState machine with current player list
        if (playerList.length > 0) {
          playerList.forEach((player) => {
            send({ type: 'player.join', player });
          });
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.debug('Player joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.debug('Player left:', leftPresences);
        // Update XState machine to remove left players
        Object.keys(leftPresences).forEach((key) => {
          const playerId = ((leftPresences as any)[key][0] as any).id;
          send({ type: 'player.leave', playerId });
        });
      })
      .subscribe(async (status, error) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('WebSocket subscribed successfully');
          setIsConnected(true);

          // Get current player count to determine host status
          const currentState = channel.presenceState();
          const isFirstPlayer = Object.keys(currentState).length === 0;

          // Track this player's presence
          await channel.track({
            id: playerIdRef.current,
            displayName: `Player${Math.floor(Math.random() * 1000)}`,
            isReady: false,
            isHost: isFirstPlayer,
          });
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

    return () => {
      logger.debug('Cleaning up WebSocket channel for room:', roomId);
      channel.unsubscribe();
      channelRef.current = null;
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
