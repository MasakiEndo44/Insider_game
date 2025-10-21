"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/app/providers'
import type { Database } from '@/lib/supabase/database.types'

export type PlayerRole = 'MASTER' | 'INSIDER' | 'CITIZEN'

interface UsePlayerRoleReturn {
  role: PlayerRole | null
  loading: boolean
  error: Error | null
}

/**
 * Hook for fetching current player's role
 *
 * RLS policy ensures players can only see their own role
 * (except in RESULT phase where all roles are visible)
 *
 * @example
 * ```tsx
 * const { role, loading } = usePlayerRole(sessionId, playerId);
 * ```
 */
export function usePlayerRole(
  sessionId: string | null,
  playerId: string | null
): UsePlayerRoleReturn {
  const supabase = useSupabase()
  const [role, setRole] = useState<PlayerRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sessionId || !playerId) {
      setRole(null)
      setLoading(false)
      return
    }

    async function fetchRole() {
      if (!sessionId || !playerId) return

      try {
        const { data, error: fetchError } = await supabase
          .from('roles')
          .select('role')
          .eq('session_id', sessionId)
          .eq('player_id', playerId)
          .single()

        if (fetchError) throw fetchError

        setRole(data.role as PlayerRole)
        setLoading(false)
      } catch (err) {
        console.error('[usePlayerRole] Fetch error:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchRole()
  }, [sessionId, playerId, supabase])

  return { role, loading, error }
}
