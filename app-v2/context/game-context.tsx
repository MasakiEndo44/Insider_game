'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useRoom } from './room-context';

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
    const { roomId, playerId } = useRoom();
    const router = useRouter();

    const setPhase = (phase: GamePhase) => setState(prev => ({ ...prev, phase }));
    const setTimer = (time: number) => setState(prev => ({ ...prev, timer: time }));
    const setRoles = (roles: Record<string, Role>) => setState(prev => ({ ...prev, roles }));
    const setTopic = (topic: string) => setState(prev => ({ ...prev, topic }));
    const setOutcome = (outcome: GameState['outcome']) => setState(prev => ({ ...prev, outcome }));
    const setRevealedPlayerId = (id: string | null) => setState(prev => ({ ...prev, revealedPlayerId: id }));

    const resetGame = () => setState(initialState);

    // Auto-navigate when phase changes
    useEffect(() => {
        if (!state.phase || state.phase === 'LOBBY') return;

        const phaseRoutes: Record<GamePhase, string> = {
            'LOBBY': '/lobby',
            'ROLE_ASSIGNMENT': '/game/role-assignment',
            'TOPIC': '/game/topic',
            'QUESTION': '/game/question',
            'DEBATE': '/game/debate',
            'VOTE1': '/game/vote1',
            'VOTE2': '/game/vote2',
            'RESULT': '/game/result'
        };

        const route = phaseRoutes[state.phase];
        if (route) {
            router.push(route);
        }
    }, [state.phase, router]);

    // Realtime Subscriptions
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`game:${roomId}`)
            // 1. Listen for Phase changes (rooms table)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${roomId}`
                },
                (payload) => {
                    const newPhase = payload.new.phase as GamePhase;
                    if (newPhase && newPhase !== state.phase) {
                        setState(prev => ({ ...prev, phase: newPhase }));
                    }
                }
            )
            // 2. Listen for Game Session changes (Master / Answerer / Phase)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    // If new session created or updated
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const session = payload.new;
                        if (session.answerer_id) {
                            // Set Master role
                            setState(prev => ({
                                ...prev,
                                roles: { ...prev.roles, [session.answerer_id]: 'MASTER' }
                            }));
                        }

                        // Update Phase from session
                        if (session.phase) {
                            setState(prev => ({ ...prev, phase: session.phase as GamePhase }));
                        }
                    }
                }
            )
            // 3. Listen for Roles (My Role)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'roles',
                    // Filter by my player ID if possible, but RLS handles visibility.
                    // We can listen to all inserts on roles table for this room's sessions?
                    // But we don't know session ID easily.
                    // RLS will only send rows visible to us.
                    // But we need to know which session.
                    // Or just listen to all roles?
                    // If RLS is working, we only receive our role (and maybe Master if public).
                    // But we need to know which session.
                    // Let's assume we just listen.
                },
                (payload) => {
                    const roleData = payload.new;
                    // If this role belongs to me
                    if (playerId && roleData.player_id === playerId) {
                        setState(prev => ({
                            ...prev,
                            roles: { ...prev.roles, [playerId]: roleData.role as Role }
                        }));
                    }
                }
            )
            // 4. Listen for Topics
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'topics',
                },
                (payload) => {
                    const topicData = payload.new;
                    // If we receive a topic, it means we are allowed to see it
                    setState(prev => ({ ...prev, topic: topicData.topic_text }));
                }
            )
            .subscribe();

        // Separate channel for results to avoid filter issues or just add to same channel if possible
        // But results table doesn't have room_id directly, it has session_id.
        // We need to know session_id.
        // But we can listen to all results and filter by session_id if we knew it.
        // Or we can rely on RLS if we select * from results.
        // But we don't have session_id in state easily (we could store it).
        // Alternatively, we can listen to 'rooms' phase change to 'RESULT', 
        // and then fetch the result from Supabase.
        // That might be safer than listening to a table we don't have a direct ID for.
        // But let's try to listen to results if we can.
        // Actually, results table has session_id. game_sessions has room_id.
        // We can't filter results by room_id directly.
        // So fetching on phase change is better.

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, playerId]);

    // Fetch initial phase
    useEffect(() => {
        if (!roomId) return;
        const fetchPhase = async () => {
            const { data: room } = await supabase
                .from('rooms')
                .select('phase')
                .eq('id', roomId)
                .single();

            if (room) {
                setPhase(room.phase as GamePhase);
            }
        };
        fetchPhase();
    }, [roomId]);

    // Fetch result when phase becomes RESULT
    useEffect(() => {
        if (state.phase === 'RESULT' && roomId) {
            const fetchResult = async () => {
                // Get latest session for this room
                const { data: session } = await supabase
                    .from('game_sessions')
                    .select('id')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (session) {
                    const { data: result } = await supabase
                        .from('results')
                        .select('*')
                        .eq('session_id', session.id)
                        .single();

                    if (result) {
                        setOutcome(result.outcome as GameState['outcome']);
                        setRevealedPlayerId(result.revealed_player_id);
                    }
                }
            };
            fetchResult();
        }
    }, [state.phase, roomId]);

    // Fetch role when phase is not LOBBY
    useEffect(() => {
        if (state.phase !== 'LOBBY' && roomId && playerId) {
            const fetchRole = async () => {
                if (state.phase === 'RESULT') {
                    // Fetch ALL roles for the session
                    // We need to find the session ID first
                    const { data: session } = await supabase
                        .from('game_sessions')
                        .select('id')
                        .eq('room_id', roomId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (session) {
                        const { data: allRoles } = await supabase
                            .from('roles')
                            .select('*')
                            .eq('session_id', session.id);

                        if (allRoles) {
                            const rolesMap: Record<string, Role> = {};
                            allRoles.forEach(r => {
                                rolesMap[r.player_id] = r.role as Role;
                            });
                            setRoles(rolesMap);
                        }
                    }
                } else {
                    // Fetch only my role
                    const { data: roleData } = await supabase
                        .from('roles')
                        .select('*')
                        .eq('player_id', playerId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (roleData) {
                        setRoles({ [playerId]: roleData.role as Role });
                    }
                }
            };
            fetchRole();
        }
    }, [state.phase, roomId, playerId]);

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
