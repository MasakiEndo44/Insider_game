/**
 * transition-phase Edge Function
 *
 * Generic phase transition manager
 * Updates room phase and broadcasts to all clients
 *
 * Request body:
 * {
 *   session_id: string,
 *   room_id: string,
 *   to_phase: string,
 *   deadline_epoch?: number (optional)
 * }
 *
 * Response:
 * {
 *   data: {
 *     phase: string,
 *     deadline_epoch?: number
 *   }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabaseAdmin.ts'
import { ok, err, corsHeaders } from '../_shared/http.ts'
import { broadcastPhaseUpdate } from '../_shared/broadcast.ts'

const VALID_PHASES = [
  'LOBBY',
  'DEAL',
  'TOPIC',
  'QUESTION',
  'DEBATE',
  'VOTE1',
  'VOTE2',
  'RESULT',
]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, room_id, to_phase, deadline_epoch } = await req.json()

    // Validate input
    if (!session_id || !room_id || !to_phase) {
      return err('Missing required fields', 400, 'MISSING_PARAMS')
    }

    // Validate phase
    if (!VALID_PHASES.includes(to_phase)) {
      return err(
        `Invalid phase: ${to_phase}. Must be one of: ${VALID_PHASES.join(', ')}`,
        400,
        'INVALID_PHASE'
      )
    }

    console.log('[transition-phase] Transitioning to:', {
      to_phase,
      deadline_epoch,
    })

    // Update room phase
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ phase: to_phase })
      .eq('id', room_id)

    if (roomError) {
      console.error('[transition-phase] Error updating room:', roomError)
      return err('Failed to update room phase', 500, 'DATABASE_ERROR')
    }

    // Update session deadline if provided
    if (deadline_epoch) {
      const { error: sessionError } = await supabase
        .from('game_sessions')
        .update({ deadline_epoch })
        .eq('id', session_id)

      if (sessionError) {
        console.error('[transition-phase] Error updating session:', sessionError)
        return err('Failed to update session deadline', 500, 'DATABASE_ERROR')
      }
    }

    // Broadcast phase update
    await broadcastPhaseUpdate(session_id, to_phase, deadline_epoch || null)

    return ok({
      phase: to_phase,
      deadline_epoch: deadline_epoch || null,
    })
  } catch (error) {
    console.error('[transition-phase] Unexpected error:', error)
    return err('Internal server error', 500, 'INTERNAL_ERROR')
  }
})
