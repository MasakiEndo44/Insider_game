import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { session_id, room_id } = await req.json();

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Get players in the room
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('id, nickname')
            .eq('room_id', room_id)
            .eq('is_connected', true); // Only assign to connected players? Or all? Plan says "players".

        if (playersError || !players || players.length < 3) {
            throw new Error('Insufficient players or error fetching players');
        }

        // 2. Shuffle players
        const shuffled = [...players].sort(() => Math.random() - 0.5);

        // 3. Assign roles
        const master = shuffled[0];
        const insider = shuffled[1];
        const citizens = shuffled.slice(2);

        const roles = [
            { session_id, player_id: master.id, role: 'MASTER' },
            { session_id, player_id: insider.id, role: 'INSIDER' },
            ...citizens.map((c) => ({ session_id, player_id: c.id, role: 'CITIZEN' })),
        ];

        // 4. Save roles
        const { error: insertError } = await supabase.from('roles').insert(roles);

        if (insertError) {
            throw insertError;
        }

        return new Response(JSON.stringify({ success: true, count: roles.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
