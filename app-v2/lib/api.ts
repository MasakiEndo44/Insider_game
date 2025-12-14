import { supabase, signInAnonymously } from '@/lib/supabase/client';
import { APIError, ERROR_MESSAGES } from '@/lib/errors';
import { Player } from '@/context/room-context';

// Helper for retrying operations with exponential backoff
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            // Only retry on 429 or network errors
            const isRateLimit = error?.status === 429 ||
                error?.message?.includes('429') ||
                error?.message?.includes('Too Many Requests');
            const isNetworkError = error?.message === 'Failed to fetch' || error?.status === 0;

            if (!isRateLimit && !isNetworkError) {
                throw error;
            }

            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
            console.log(`Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms due to error:`, error.message || error.status);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

export const api = {
    createRoom: async (passphrase: string, nickname: string) => {
        return retryOperation(async () => {
            try {
                // 1. Ensure Auth
                const { data: session } = await supabase.auth.getSession();
                let userId = session.session?.user?.id;
                if (!userId) {
                    const authData = await signInAnonymously();
                    userId = authData.user?.id;
                }

                if (!userId) throw new APIError(ERROR_MESSAGES.SESSION_EXPIRED, 'AUTH_FAILED', 401);

                // 2. Call Atomic RPC
                const { data, error } = await supabase
                    .rpc('create_room_with_host', {
                        p_passphrase_hash: passphrase,
                        p_nickname: nickname,
                        p_user_id: userId
                    });

                if (error) {
                    if (error.message.includes('DUPLICATE_ROOM')) {
                        throw new APIError(ERROR_MESSAGES.DUPLICATE_ROOM, 'DUPLICATE_ROOM', 409);
                    }
                    // Propagate 429s to trigger retry
                    if (error.code === '429' || error.message?.includes('429')) {
                        throw { status: 429, message: 'Too Many Requests' };
                    }
                    throw new APIError(error.message, 'DB_ERROR', 500);
                }

                return data as { roomId: string, player: Player };
            } catch (error) {
                if (error instanceof APIError) throw error;
                // Pass through objects that look like rate limit errors
                if ((error as any)?.status === 429) throw error;

                if (!navigator.onLine) {
                    throw new APIError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', 0);
                }

                throw new APIError(ERROR_MESSAGES.UNKNOWN_ERROR, 'UNKNOWN', 500);
            }
        });
    },


    joinRoom: async (passphrase: string, nickname: string) => {
        return retryOperation(async () => {
            try {
                // 1. Ensure Auth
                const { data: session } = await supabase.auth.getSession();
                let userId = session.session?.user?.id;
                if (!userId) {
                    const authData = await signInAnonymously();
                    userId = authData.user?.id;
                }

                if (!userId) throw new APIError(ERROR_MESSAGES.SESSION_EXPIRED, 'AUTH_FAILED', 401);

                // 2. Call Atomic RPC
                const { data, error } = await supabase
                    .rpc('join_room', {
                        p_passphrase_hash: passphrase,
                        p_nickname: nickname,
                        p_user_id: userId
                    });

                if (error) {
                    if (error.message.includes('ROOM_NOT_FOUND')) {
                        throw new APIError(ERROR_MESSAGES.ROOM_NOT_FOUND, 'ROOM_NOT_FOUND', 404);
                    }
                    if (error.message.includes('DUPLICATE_NICKNAME') || error.code === '23505') {
                        throw new APIError(ERROR_MESSAGES.DUPLICATE_NICKNAME, 'DUPLICATE_NICKNAME', 409);
                    }
                    // Propagate 429s to trigger retry
                    if (error.code === '429' || error.message?.includes('429')) {
                        throw { status: 429, message: 'Too Many Requests' };
                    }
                    throw new APIError(error.message, 'DB_ERROR', 500);
                }

                return data as { roomId: string, player: Player };
            } catch (error) {
                if (error instanceof APIError) throw error;
                if ((error as any)?.status === 429) throw error;

                if (!navigator.onLine) {
                    throw new APIError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', 0);
                }

                throw new APIError(ERROR_MESSAGES.UNKNOWN_ERROR, 'UNKNOWN', 500);
            }
        });
    },

    startGame: async (roomId: string, category: string = '全般', timeLimit: number = 300) => {
        // 1. Create Game Session AND Assign Roles atomically using RPC
        const { data: sessionId, error: sessionError } = await supabase
            .rpc('start_game_session', {
                p_room_id: roomId,
                p_category: category,
                p_time_limit: timeLimit
            });

        if (sessionError) throw sessionError;

        // 2. Select Topic (Edge Function)
        const { error: topicError } = await supabase.functions.invoke('select-topic', {
            body: { session_id: sessionId, category: category || '全般' }
        });

        if (topicError) throw topicError;

        return { success: true };
    },

    submitVote1: async (roomId: string, playerId: string, vote: 'yes' | 'no') => {
        // Get latest session
        const { data: session } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!session) throw new Error('No active session');

        await supabase.from('votes').insert({
            session_id: session.id,
            player_id: playerId,
            vote_type: 'VOTE1',
            vote_value: vote
        });

        return { success: true };
    },

    submitVote2: async (roomId: string, playerId: string, votedPlayerId: string) => {
        const { data: session } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!session) throw new Error('No active session');

        await supabase.from('votes').insert({
            session_id: session.id,
            player_id: playerId,
            vote_type: 'VOTE2',
            vote_value: votedPlayerId
        });

        return { success: true };
    },

    async confirmRole(roomId: string, playerId: string) {
        const { error } = await supabase.rpc('confirm_role_and_check_phase', {
            p_room_id: roomId,
            p_player_id: playerId
        });

        if (error) throw error;
    },

    updatePhase: async (roomId: string, phase: string) => {
        // Update Room
        const { error: roomError } = await supabase
            .from('rooms')
            .update({ phase })
            .eq('id', roomId);

        if (roomError) throw roomError;

        // Update latest Game Session if exists
        const { data: session } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (session) {
            await supabase
                .from('game_sessions')
                .update({ phase })
                .eq('id', session.id);
        }

        return { success: true };
    },

    leaveRoom: async (roomId: string, playerId: string) => {
        // 1. Get current room and player info
        const { data: room } = await supabase
            .from('rooms')
            .select('host_id')
            .eq('id', roomId)
            .single();

        const isHost = room?.host_id === playerId;

        // 2. Mark player as disconnected
        await supabase
            .from('players')
            .update({ is_connected: false })
            .eq('id', playerId)
            .eq('room_id', roomId);

        // 3. If host is leaving, delegate to next player
        if (isHost) {
            const { data: nextPlayer } = await supabase
                .from('players')
                .select('id')
                .eq('room_id', roomId)
                .eq('is_connected', true)
                .neq('id', playerId)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (nextPlayer) {
                // Update room host
                await supabase
                    .from('rooms')
                    .update({ host_id: nextPlayer.id })
                    .eq('id', roomId);

                // Update new host's isHost flag
                await supabase
                    .from('players')
                    .update({ is_host: true })
                    .eq('id', nextPlayer.id);

                // Update old host's isHost flag
                await supabase
                    .from('players')
                    .update({ is_host: false })
                    .eq('id', playerId);
            }
        }

        return { success: true };
    },

    askQuestion: async (roomId: string, playerId: string, text: string) => {
        // Get latest session
        const { data: session } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!session) throw new Error('No active session');

        const { error } = await supabase
            .from('questions')
            .insert({
                session_id: session.id,
                player_id: playerId,
                text,
                answer: 'pending'
            });

        if (error) throw error;
        return { success: true };
    },

    answerQuestion: async (questionId: string, answer: 'yes' | 'no') => {
        const { error } = await supabase
            .from('questions')
            .update({ answer })
            .eq('id', questionId);
        if (error) throw error;
        return { success: true };
    },

    resolveQuestionPhase: async (roomId: string, answererId: string) => {
        // 1. Get latest session
        const { data: session, error: sessionError } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (sessionError) throw sessionError;

        // 2. Set answerer_id
        const { error: updateError } = await supabase
            .from('game_sessions')
            .update({ answerer_id: answererId })
            .eq('id', session.id);

        if (updateError) throw updateError;

        // 3. Update phase to DEBATE
        const { error: phaseError } = await supabase
            .from('rooms')
            .update({ phase: 'DEBATE' })
            .eq('id', roomId);

        if (phaseError) throw phaseError;

        // Also update session phase
        await supabase
            .from('game_sessions')
            .update({ phase: 'DEBATE' })
            .eq('id', session.id);

        return { success: true };
    },

    updatePlayerPage: async (playerId: string, page: string) => {
        const { error } = await supabase
            .from('players')
            .update({ current_page: page })
            .eq('id', playerId);

        if (error) throw error;
        return { success: true };
    },

    updatePlayerReadyStatus: async (playerId: string, isReady: boolean, currentPage: string = 'lobby') => {
        const { error } = await supabase
            .from('players')
            .update({ is_ready: isReady, current_page: currentPage })
            .eq('id', playerId);

        if (error) throw error;
        return { success: true };
    }
};

