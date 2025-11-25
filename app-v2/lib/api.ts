import { supabase, signInAnonymously } from '@/lib/supabase/client';
import { APIError, ERROR_MESSAGES } from '@/lib/errors';

export const api = {
    createRoom: async (passphrase: string, nickname: string) => {
        try {
            // 1. Ensure Auth
            const { data: session } = await supabase.auth.getSession();
            let userId = session.session?.user?.id;
            if (!userId) {
                const authData = await signInAnonymously();
                userId = authData.user?.id;
            }

            if (!userId) throw new APIError(ERROR_MESSAGES.SESSION_EXPIRED, 'AUTH_FAILED', 401);

            // 2. Clean up existing rooms
            // Use RPC to safely check room status without exposing players table
            const { data: roomStatus } = await supabase
                .rpc('get_room_status', { check_passphrase_hash: passphrase });

            if (roomStatus && roomStatus.length > 0) {
                const existingRoom = roomStatus[0];
                const count = existingRoom.player_count;

                // Check if room is expired (older than 2 hours)
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
                const isExpired = existingRoom.last_updated && existingRoom.last_updated < twoHoursAgo;

                if (count === 0 || isExpired) {
                    // Use RPC to clean up the room (bypasses RLS)
                    const { data: cleaned, error: cleanupError } = await supabase
                        .rpc('cleanup_room', { check_passphrase_hash: passphrase });

                    if (cleanupError || !cleaned) {
                        throw new APIError(ERROR_MESSAGES.DUPLICATE_ROOM, 'DUPLICATE_ROOM', 409);
                    }
                } else {
                    throw new APIError(ERROR_MESSAGES.DUPLICATE_ROOM, 'DUPLICATE_ROOM', 409);
                }
            }

            // 3. Create Room
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .insert({
                    passphrase_hash: passphrase,
                    phase: 'LOBBY'
                })
                .select()
                .single();

            if (roomError) {
                if (roomError.code === '23505') {
                    throw new APIError(ERROR_MESSAGES.DUPLICATE_ROOM, 'DUPLICATE_ROOM', 409);
                }
                throw new APIError(roomError.message, 'DB_ERROR', 500);
            }

            // 4. Create Player (Host)
            const { data: player, error: playerError } = await supabase
                .from('players')
                .insert({
                    room_id: room.id,
                    nickname,
                    is_host: true,
                    is_ready: true,
                    is_connected: true,
                    user_id: userId
                })
                .select()
                .single();

            if (playerError) {
                if (playerError.code === '23505') {
                    throw new APIError(ERROR_MESSAGES.DUPLICATE_NICKNAME, 'DUPLICATE_NICKNAME', 409);
                }
                throw new APIError(playerError.message, 'DB_ERROR', 500);
            }

            // 5. Update Room host_id
            await supabase
                .from('rooms')
                .update({ host_id: player.id })
                .eq('id', room.id);

            return { roomId: room.id, player: { ...player, isHost: player.is_host, isReady: player.is_ready, isConnected: player.is_connected } };
        } catch (error) {
            if (error instanceof APIError) throw error;

            if (!navigator.onLine) {
                throw new APIError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', 0);
            }

            throw new APIError(ERROR_MESSAGES.UNKNOWN_ERROR, 'UNKNOWN', 500);
        }
    },


    joinRoom: async (passphrase: string, nickname: string) => {
        try {
            // 1. Ensure Auth
            const { data: session } = await supabase.auth.getSession();
            let userId = session.session?.user?.id;
            if (!userId) {
                const authData = await signInAnonymously();
                userId = authData.user?.id;
            }

            if (!userId) throw new APIError(ERROR_MESSAGES.SESSION_EXPIRED, 'AUTH_FAILED', 401);

            // 2. Find Room
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .select()
                .eq('passphrase_hash', passphrase)
                .single();

            if (roomError || !room) {
                throw new APIError(ERROR_MESSAGES.ROOM_NOT_FOUND, 'ROOM_NOT_FOUND', 404);
            }

            // 3. Create Player
            const { data: player, error: playerError } = await supabase
                .from('players')
                .insert({
                    room_id: room.id,
                    nickname,
                    is_host: false,
                    is_ready: true,
                    is_connected: true,
                    user_id: userId
                })
                .select()
                .single();

            if (playerError) {
                if (playerError.code === '23505') {
                    throw new APIError(ERROR_MESSAGES.DUPLICATE_NICKNAME, 'DUPLICATE_NICKNAME', 409);
                }
                throw new APIError(playerError.message, 'DB_ERROR', 500);
            }

            return { roomId: room.id, player: { ...player, isHost: player.is_host, isReady: player.is_ready, isConnected: player.is_connected } };
        } catch (error) {
            if (error instanceof APIError) throw error;

            if (!navigator.onLine) {
                throw new APIError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', 0);
            }

            throw new APIError(ERROR_MESSAGES.UNKNOWN_ERROR, 'UNKNOWN', 500);
        }
    },

    startGame: async (roomId: string, category: string = '全般', timeLimit: number = 300) => {
        // 1. Create Game Session
        const { data: session, error: sessionError } = await supabase
            .from('game_sessions')
            .insert({
                room_id: roomId,
                time_limit: timeLimit,
                category,
                phase: 'DEAL'
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 2. Assign Roles (Edge Function)
        const { error: assignError } = await supabase.functions.invoke('assign-roles', {
            body: { session_id: session.id, room_id: roomId }
        });

        if (assignError) throw assignError;

        // 3. Select Topic (Edge Function)
        const { error: topicError } = await supabase.functions.invoke('select-topic', {
            body: { session_id: session.id, category: category || '全般' }
        });

        if (topicError) throw topicError;

        // 4. Update Room Phase
        await supabase
            .from('rooms')
            .update({ phase: 'ROLE_ASSIGNMENT' })
            .eq('id', roomId);

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

    updatePhase: async (roomId: string, phase: string) => {
        // Update Room
        const { error: roomError } = await supabase
            .from('rooms')
            .update({ phase })
            .eq('id', roomId);

        if (roomError) throw roomError;

        // Update latest Game Session if exists
        // This is crucial for triggers that rely on session phase (like Vote1)
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
        const { error } = await supabase
            .from('players')
            .update({ is_connected: false })
            .eq('id', playerId)
            .eq('room_id', roomId);

        if (error) throw error;
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
    }
};
