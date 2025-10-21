"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/app/providers'

interface UseTopicReturn {
  topic: string | null
  difficulty: string | null
  loading: boolean
  error: Error | null
  canViewTopic: boolean // False for CITIZEN
}

/**
 * Hook for fetching game topic
 *
 * RLS policy ensures only MASTER and INSIDER can see the topic
 * CITIZEN will receive empty result (canViewTopic = false)
 *
 * @example
 * ```tsx
 * const { topic, canViewTopic, loading } = useTopic(sessionId);
 *
 * if (canViewTopic) {
 *   return <div>トピック: {topic}</div>
 * }
 * ```
 */
export function useTopic(sessionId: string | null): UseTopicReturn {
  const supabase = useSupabase()
  const [topic, setTopic] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [canViewTopic, setCanViewTopic] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setTopic(null)
      setLoading(false)
      return
    }

    async function fetchTopic() {
      if (!sessionId) return

      try {
        const { data, error: fetchError } = await supabase
          .from('topics')
          .select('topic_text, difficulty')
          .eq('session_id', sessionId)
          .single()

        // RLS will return error if user is CITIZEN
        if (fetchError) {
          // Not an error - just means user is CITIZEN
          if (fetchError.code === 'PGRST116') {
            setCanViewTopic(false)
            setLoading(false)
            return
          }
          throw fetchError
        }

        setTopic(data.topic_text)
        setDifficulty(data.difficulty)
        setCanViewTopic(true)
        setLoading(false)
      } catch (err) {
        console.error('[useTopic] Fetch error:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchTopic()
  }, [sessionId, supabase])

  return { topic, difficulty, loading, error, canViewTopic }
}
