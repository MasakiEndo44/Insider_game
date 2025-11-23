'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export function RoomProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<RoomState>(initialState);

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

    const resetRoom = () => setState(initialState);

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
