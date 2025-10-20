'use client';

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';

interface RoomContextType {
  roomId: string;
  isConnected: boolean;
  players: Player[];
  roomStatus: string;
}

interface Player {
  id: string;
  displayName: string;
  isReady: boolean;
  isHost: boolean;
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
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomStatus, setRoomStatus] = useState('WAITING_FOR_PLAYERS');

  // Connection pooling: Prevent duplicate WebSocket connections
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>['channel']
  > | null>(null);
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

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Player>();
        const playerList: Player[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const playerData = presences[0] as unknown as Player;
            playerList.push(playerData);
          }
        });

        setPlayers(playerList);
        setIsConnected(true);
        logger.debug('Presence sync - total players:', playerList.length);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.debug('Player joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.debug('Player left:', leftPresences);
      })
      .subscribe(async (status, error) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('WebSocket subscribed successfully');

          // Get current player count to determine host status
          const currentState = channel.presenceState<Player>();
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
  }, [roomId]);

  const value: RoomContextType = {
    roomId,
    isConnected,
    players,
    roomStatus,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
