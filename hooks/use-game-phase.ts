"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/app/providers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// Game phases
export type GamePhase =
  | 'LOBBY'
  | 'DEAL'
  | 'TOPIC'
  | 'QUESTION'
  | 'DEBATE'
  | 'VOTE1'
  | 'VOTE2'
  | 'RESULT'

interface GamePhaseData {
  phase: GamePhase
  deadline_epoch: number | null
  server_now: number // Unix timestamp in seconds for drift correction
  answerer_id: string | null // Player who answered correctly
}

interface UseGamePhaseReturn {
  phase: GamePhase | null
  deadlineEpoch: number | null
  serverOffset: number // Calculated offset: server_now - client_now
  answererId: string | null
  loading: boolean
  error: Error | null
}

/**
 * Hook for subscribing to game phase changes via Supabase Realtime
 *
 * Provides current phase, deadline_epoch, and server time offset for drift correction
 *
 * @example
 * ```tsx
 * const { phase, deadlineEpoch, serverOffset } = useGamePhase(sessionId);
 *
 * // Use with useCountdown
 * const { formatted } = useCountdown({
 *   deadlineEpoch,
 *   serverOffset
 * });
 * ```
 */
export function useGamePhase(sessionId: string | null): UseGamePhaseReturn {
  const supabase = useSupabase()
  const [phase, setPhase] = useState<GamePhase | null>(null)
  const [deadlineEpoch, setDeadlineEpoch] = useState<number | null>(null)
  const [serverOffset, setServerOffset] = useState(0)
  const [answererId, setAnswererId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setPhase(null)
      setLoading(false)
      return
    }

    let channel: RealtimeChannel | null = null

    // Fetch initial game session data
    async function fetchGameSession() {
      if (!sessionId) return

      try {
        const { data, error: fetchError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (fetchError) throw fetchError

        // Get current room phase from rooms table
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('phase')
          .eq('id', data.room_id)
          .single()

        if (roomError) throw roomError

        // Get server time via RPC for accurate drift correction
        const { data: serverTime } = await supabase.rpc('get_server_time')
        const clientNow = Math.floor(Date.now() / 1000)
        const offset = serverTime ? (serverTime as number) - clientNow : 0

        setPhase(roomData.phase as GamePhase)
        setDeadlineEpoch(data.deadline_epoch)
        setServerOffset(offset)
        setAnswererId(data.answerer_id)
        setLoading(false)
      } catch (err) {
        console.error('[useGamePhase] Fetch error:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    // Subscribe to phase updates via broadcast
    function subscribeToPhaseUpdates() {
      if (!sessionId) return

      channel = supabase
        .channel(`game:${sessionId}`)
        .on(
          'broadcast',
          { event: 'phase_update' },
          (payload) => {
            console.log('[useGamePhase] Phase update:', payload)

            const data = payload.payload as GamePhaseData
            const clientNow = Math.floor(Date.now() / 1000)
            const offset = data.server_now - clientNow

            setPhase(data.phase)
            setDeadlineEpoch(data.deadline_epoch)
            setServerOffset(offset)
            setAnswererId(data.answerer_id)
          }
        )
        .subscribe((status, err) => {
          console.log('[useGamePhase] Subscription status:', status)
          if (status === 'TIMED_OUT') {
            console.warn('[useGamePhase] Subscription timed out, refetching...')
            fetchGameSession()
          }
          if (err) {
            console.error('[useGamePhase] Subscription error:', err)
            setError(new Error('Realtime subscription error'))
          }
        })
    }

    // Initialize
    fetchGameSession()
    subscribeToPhaseUpdates()

    // Cleanup
    return () => {
      if (channel) {
        console.log('[useGamePhase] Unsubscribing from channel')
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, supabase])

  return {
    phase,
    deadlineEpoch,
    serverOffset,
    answererId,
    loading,
    error,
  }
}
