/**
 * Topic Selection Logic
 *
 * Handles topic selection from master_topics table
 */

import type { Database } from '@/lib/supabase/database.types';
import type { Difficulty } from '@/lib/validations/database.schema';
import type { SupabaseClient } from '@supabase/supabase-js';

type MasterTopic = Database['public']['Tables']['master_topics']['Row'];

/**
 * Select random topics from master_topics table
 *
 * @param supabase - Supabase client instance
 * @param difficulty - Difficulty level
 * @param count - Number of topics to select
 * @param excludeTopicIds - Topic IDs to exclude (already used in session)
 * @returns Promise<MasterTopic[]> - Array of selected topics
 */
export async function selectRandomTopics(
  supabase: SupabaseClient<Database>,
  difficulty: Difficulty,
  count: number = 3,
  excludeTopicIds: string[] = []
): Promise<MasterTopic[]> {
  // Query topics from master_topics table
  let query = supabase
    .from('master_topics')
    .select('*')
    .eq('difficulty', difficulty);

  // Exclude already used topics
  if (excludeTopicIds.length > 0) {
    query = query.not('id', 'in', `(${excludeTopicIds.join(',')})`);
  }

  const { data: topics, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch topics: ${error.message}`);
  }

  if (!topics || topics.length === 0) {
    throw new Error(`No topics available for difficulty: ${difficulty}`);
  }

  // Shuffle topics (Fisher-Yates algorithm)
  const shuffled = [...topics];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return requested number of topics
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get used topic IDs for a session
 *
 * @param supabase - Supabase client instance
 * @param sessionId - Game session ID
 * @returns Promise<string[]> - Array of used topic IDs
 */
export async function getUsedTopicIds(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('used_topics')
    .select('topic_id')
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to fetch used topics: ${error.message}`);
  }

  return data ? data.map((row) => row.topic_id) : [];
}

/**
 * Mark topics as used in a session
 *
 * @param supabase - Supabase client instance
 * @param sessionId - Game session ID
 * @param topicIds - Topic IDs to mark as used
 * @returns Promise<void>
 */
export async function markTopicsAsUsed(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  topicIds: string[]
): Promise<void> {
  const usedTopics = topicIds.map((topicId) => ({
    session_id: sessionId,
    topic_id: topicId,
  }));

  const { error } = await supabase.from('used_topics').insert(usedTopics);

  if (error) {
    throw new Error(`Failed to mark topics as used: ${error.message}`);
  }
}
