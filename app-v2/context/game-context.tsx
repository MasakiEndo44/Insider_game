'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type GamePhase =
    | 'LOBBY'
    | 'ROLE_ASSIGNMENT'
    | 'TOPIC'
    | 'QUESTION'
    | 'DEBATE'
    | 'VOTE1'
    | 'VOTE2'
    | 'RESULT';

export type Role = 'MASTER' | 'INSIDER' | 'CITIZEN';

export interface PlayerRole {
    playerId: string;
    role: Role;
}

export interface GameState {
    phase: GamePhase;
    timer: number; // Remaining time in seconds
    roles: Record<string, Role>; // playerId -> Role
    topic: string | null;
    outcome: 'CITIZENS_WIN' | 'INSIDER_WIN' | 'ALL_LOSE' | null;
    revealedPlayerId: string | null; // For result screen
}

interface GameContextType extends GameState {
    setPhase: (phase: GamePhase) => void;
    setTimer: (time: number) => void;
    setRoles: (roles: Record<string, Role>) => void;
    setTopic: (topic: string) => void;
    setOutcome: (outcome: GameState['outcome']) => void;
    setRevealedPlayerId: (id: string | null) => void;
    resetGame: () => void;
}

const initialState: GameState = {
    phase: 'LOBBY',
    timer: 0,
    roles: {},
    topic: null,
    outcome: null,
    revealedPlayerId: null,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<GameState>(initialState);

    const setPhase = (phase: GamePhase) => setState(prev => ({ ...prev, phase }));
    const setTimer = (time: number) => setState(prev => ({ ...prev, timer: time }));
    const setRoles = (roles: Record<string, Role>) => setState(prev => ({ ...prev, roles }));
    const setTopic = (topic: string) => setState(prev => ({ ...prev, topic }));
    const setOutcome = (outcome: GameState['outcome']) => setState(prev => ({ ...prev, outcome }));
    const setRevealedPlayerId = (id: string | null) => setState(prev => ({ ...prev, revealedPlayerId: id }));

    const resetGame = () => setState(initialState);

    return (
        <GameContext.Provider
            value={{
                ...state,
                setPhase,
                setTimer,
                setRoles,
                setTopic,
                setOutcome,
                setRevealedPlayerId,
                resetGame
            }}
        >
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
