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
        const { session_id, category } = await req.json();

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Select random topic
        let query = supabase.from('master_topics').select('topic_text');

        // If category is specific (not '全般' or empty), filter by it.
        // However, '全般' might be a category name in DB too.
        // If user selects '全般', they might want any topic? Or topics tagged '全般'?
        // Let's assume if category is provided, we try to match it.
        // If the category doesn't exist, we might get empty.
        // Let's check if category is 'Random' or 'Mix' -> then no filter.
        if (category && category !== 'Random' && category !== 'Mix') {
            query = query.eq('category', category);
        }

        const { data: topics, error: topicError } = await query;

        if (topicError || !topics || topics.length === 0) {
            // If no topics found for category, try fetching all?
            // Or throw error.
            throw new Error(`No topics found for category: ${category}`);
        }

        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        // 2. Insert into topics table
        const { error: insertError } = await supabase
            .from('topics')
            .insert({
                session_id,
                topic_text: randomTopic.topic_text,
                category: category || 'Random'
            });

        if (insertError) {
            throw insertError;
        }

        return new Response(JSON.stringify({ success: true, topic: randomTopic.topic_text }), {
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
