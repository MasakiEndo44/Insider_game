'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Player {
    id: string;
    nickname: string;
    isHost: boolean;
    isReady: boolean;
    isConnected: boolean;
}

export interface RoomState {
    roomId: string | null;
    passphrase: string | null;
    players: Player[];
    hostId: string | null;
    playerId: string | null; // Current local player ID
}

interface RoomContextType extends RoomState {
    setRoomId: (id: string) => void;
    setPassphrase: (passphrase: string) => void;
    setPlayers: (players: Player[]) => void;
    addPlayer: (player: Player) => void;
    updatePlayer: (playerId: string, updates: Partial<Player>) => void;
    setHostId: (id: string) => void;
    setPlayerId: (id: string) => void;
    resetRoom: () => void;
}

const initialState: RoomState = {
    roomId: null,
    passphrase: null,
    players: [],
    hostId: null,
    playerId: null,
};

const RoomContext = createContext<RoomContextType | undefined>(undefined);

const STORAGE_KEY = 'insider_game_room_state';

// Load initial state from localStorage
const loadInitialState = (): RoomState => {
    if (typeof window === 'undefined') return initialState;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate the stored data has required fields
            if (parsed.roomId && parsed.playerId) {
                return {
                    roomId: parsed.roomId,
                    passphrase: parsed.passphrase || null,
                    players: parsed.players || [],
                    hostId: parsed.hostId || null,
                    playerId: parsed.playerId,
                };
            }
        }
    } catch (error) {
        console.error('Failed to load room state from localStorage:', error);
    }
    return initialState;
};

export function RoomProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<RoomState>(loadInitialState);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (state.roomId && state.playerId) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (error) {
                console.error('Failed to save room state to localStorage:', error);
            }
        }
    }, [state]);

    const setRoomId = (id: string) => setState(prev => ({ ...prev, roomId: id }));
    const setPassphrase = (passphrase: string) => setState(prev => ({ ...prev, passphrase }));
    const setPlayers = (players: Player[]) => setState(prev => ({ ...prev, players }));

    const addPlayer = (player: Player) => setState(prev => ({
        ...prev,
        players: [...prev.players, player]
    }));

    const updatePlayer = (playerId: string, updates: Partial<Player>) => setState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === playerId ? { ...p, ...updates } : p)
    }));

    const setHostId = (id: string) => setState(prev => ({ ...prev, hostId: id }));
    const setPlayerId = (id: string) => setState(prev => ({ ...prev, playerId: id }));

    const resetRoom = () => {
        setState(initialState);
        // Clear localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    useEffect(() => {
        if (!state.roomId) return;

        const fetchPlayers = async () => {
            const { data } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', state.roomId);

            if (data) {
                const mappedPlayers: Player[] = data.map((p: { id: string; nickname: string; is_host: boolean; is_ready: boolean; is_connected: boolean }) => ({
                    id: p.id,
                    nickname: p.nickname,
                    isHost: p.is_host,
                    isReady: p.is_ready,
                    isConnected: p.is_connected
                }));
                setPlayers(mappedPlayers);
            }
        };

        // Initial fetch
        fetchPlayers();

        const channel = supabase
            .channel(`room:${state.roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                    filter: `room_id=eq.${state.roomId}`
                },
                () => {
                    fetchPlayers();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${state.roomId}`
                },
                (payload) => {
                    const newHostId = payload.new.host_id;
                    if (newHostId) {
                        setHostId(newHostId);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [state.roomId]);

    return (
        <RoomContext.Provider
            value={{
                ...state,
                setRoomId,
                setPassphrase,
                setPlayers,
                addPlayer,
                updatePlayer,
                setHostId,
                setPlayerId,
                resetRoom
            }}
        >
            {children}
        </RoomContext.Provider>
    );
}

export function useRoom() {
    const context = useContext(RoomContext);
    if (context === undefined) {
        throw new Error('useRoom must be used within a RoomProvider');
    }
    return context;
}
