'use client';

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { createContext, useContext, useEffect, useState } from 'react';

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

  useEffect(() => {
    const supabase = createClient();

    // Supabase Realtime channel for this room
    const channel = supabase.channel(`room:${roomId}`);

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
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.debug('Player joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.debug('Player left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this player's presence
          await channel.track({
            id: crypto.randomUUID(),
            displayName: `Player${Math.floor(Math.random() * 1000)}`,
            isReady: false,
            isHost: players.length === 0,
          });
        }
      });

    return () => {
      channel.unsubscribe();
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
