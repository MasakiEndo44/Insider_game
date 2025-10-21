/**
 * assign-roles Edge Function
 *
 * Randomly assigns MASTER, INSIDER, CITIZEN roles to players
 * Excludes previous Master from being Master again
 *
 * Request body:
 * {
 *   session_id: string,
 *   room_id: string
 * }
 *
 * Response:
 * {
 *   data: {
 *     master_id: string,
 *     insider_id: string,
 *     citizen_ids: string[]
 *   }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabaseAdmin.ts'
import { ok, err, corsHeaders } from '../_shared/http.ts'
import { broadcastPhaseUpdate } from '../_shared/broadcast.ts'

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, room_id } = await req.json()

    // Validate input
    if (!session_id || !room_id) {
      return err('session_id and room_id are required', 400, 'MISSING_PARAMS')
    }

    // Get all players in the room
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, nickname')
      .eq('room_id', room_id)
      .order('created_at', { ascending: true })

    if (playersError) {
      console.error('[assign-roles] Error fetching players:', playersError)
      return err('Failed to fetch players', 500, 'DATABASE_ERROR')
    }

    // Validate player count (5-8 players)
    if (!players || players.length < 5 || players.length > 8) {
      return err(
        `Player count must be 5-8 (current: ${players?.length || 0})`,
        400,
        'INVALID_PLAYER_COUNT'
      )
    }

    // Get previous Master ID
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('prev_master_id')
      .eq('id', session_id)
      .single()

    const prevMasterId = sessionData?.prev_master_id

    // Create pool excluding previous Master
    const eligibleForMaster = prevMasterId
      ? players.filter((p) => p.id !== prevMasterId)
      : players

    // Shuffle and assign roles
    const shuffled = shuffle(eligibleForMaster)
    const master = shuffled[0]
    const insider = shuffled[1]
    const citizens = shuffled.slice(2)

    console.log('[assign-roles] Role assignments:', {
      master: master.nickname,
      insider: insider.nickname,
      citizens: citizens.map((c) => c.nickname),
    })

    // Delete existing roles for this session
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('session_id', session_id)

    if (deleteError) {
      console.error('[assign-roles] Error deleting old roles:', deleteError)
      // Continue anyway - upsert will handle it
    }

    // Insert new role assignments
    const roleInserts = [
      { session_id, player_id: master.id, role: 'MASTER' },
      { session_id, player_id: insider.id, role: 'INSIDER' },
      ...citizens.map((c) => ({
        session_id,
        player_id: c.id,
        role: 'CITIZEN' as const,
      })),
    ]

    const { error: rolesError } = await supabase
      .from('roles')
      .insert(roleInserts)

    if (rolesError) {
      console.error('[assign-roles] Error inserting roles:', rolesError)
      return err('Failed to assign roles', 500, 'DATABASE_ERROR')
    }

    // Update game session (save current master as prev_master_id for next round)
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        prev_master_id: master.id,
      })
      .eq('id', session_id)

    if (updateError) {
      console.error('[assign-roles] Error updating session:', updateError)
      return err('Failed to update session', 500, 'DATABASE_ERROR')
    }

    // Update room phase to DEAL
    const { error: phaseError } = await supabase
      .from('rooms')
      .update({ phase: 'DEAL' })
      .eq('id', room_id)

    if (phaseError) {
      console.error('[assign-roles] Error updating phase:', phaseError)
      return err('Failed to update phase', 500, 'DATABASE_ERROR')
    }

    // Broadcast phase update
    await broadcastPhaseUpdate(session_id, 'DEAL')

    return ok(
      {
        master_id: master.id,
        insider_id: insider.id,
        citizen_ids: citizens.map((c) => c.id),
      },
      200
    )
  } catch (error) {
    console.error('[assign-roles] Unexpected error:', error)
    return err('Internal server error', 500, 'INTERNAL_ERROR')
  }
})
