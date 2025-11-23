import { supabase, signInAnonymously } from '@/lib/supabase/client';

export const api = {
    createRoom: async (passphrase: string, nickname: string) => {
        // 1. Ensure Auth
        const { data: session } = await supabase.auth.getSession();
        let userId = session.session?.user?.id;
        if (!userId) {
            const authData = await signInAnonymously();
            userId = authData.user?.id;
        }

        if (!userId) throw new Error('Authentication failed');

        // 2. Clean up existing rooms (optional, logic from mock)
        // For now, we rely on unique constraint on passphrase_hash.
        // If we want to overwrite, we need to handle it.
        // Let's try to find if it exists.
        const { data: existingRoom } = await supabase
            .from('rooms')
            .select('id, host_id')
            .eq('passphrase_hash', passphrase)
            .single();

        if (existingRoom) {
            // Check if active players?
            const { count } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', existingRoom.id)
                .eq('is_connected', true);

            if (count === 0) {
                // Delete old room
                await supabase.from('rooms').delete().eq('id', existingRoom.id);
            } else {
                throw new Error('Room with this passphrase already exists and is active.');
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

        if (roomError) throw roomError;

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

        if (playerError) throw playerError;

        // 5. Update Room host_id
        await supabase
            .from('rooms')
            .update({ host_id: player.id })
            .eq('id', room.id);

        return { roomId: room.id, player: { ...player, isHost: player.is_host, isReady: player.is_ready, isConnected: player.is_connected } };
    },

    joinRoom: async (passphrase: string, nickname: string) => {
        // 1. Ensure Auth
        const { data: session } = await supabase.auth.getSession();
        let userId = session.session?.user?.id;
        if (!userId) {
            const authData = await signInAnonymously();
            userId = authData.user?.id;
        }

        if (!userId) throw new Error('Authentication failed');

        // 2. Find Room
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select()
            .eq('passphrase_hash', passphrase)
            .single();

        if (roomError || !room) throw new Error('Room not found or invalid passphrase');

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

        if (playerError) throw playerError;

        return { roomId: room.id, player: { ...player, isHost: player.is_host, isReady: player.is_ready, isConnected: player.is_connected } };
    },

    startGame: async (roomId: string, category: string = '全般') => {
        // 1. Create Game Session
        const { data: session, error: sessionError } = await supabase
            .from('game_sessions')
            .insert({
                room_id: roomId,
                time_limit: 300, // Default 5 min
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
        const { error } = await supabase
            .from('rooms')
            .update({ phase })
            .eq('id', roomId);

        if (error) throw error;
        return { success: true };
    }
};
