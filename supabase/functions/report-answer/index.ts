/**
 * report-answer Edge Function
 *
 * Called by Master when a player gives the correct answer
 * Transitions from QUESTION → DEBATE with time inheritance
 *
 * Request body:
 * {
 *   session_id: string,
 *   room_id: string,
 *   answerer_id: string,
 *   player_id: string (Master's ID for verification)
 * }
 *
 * Response:
 * {
 *   data: {
 *     phase: 'DEBATE',
 *     deadline_epoch: number,
 *     answerer_id: string
 *   }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabaseAdmin.ts'
import { ok, err, corsHeaders } from '../_shared/http.ts'
import { broadcastPhaseUpdate } from '../_shared/broadcast.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, room_id, answerer_id, player_id } = await req.json()

    // Validate input
    if (!session_id || !room_id || !answerer_id || !player_id) {
      return err('Missing required fields', 400, 'MISSING_PARAMS')
    }

    // Verify caller is Master
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('role')
      .eq('session_id', session_id)
      .eq('player_id', player_id)
      .single()

    if (roleError || roleData?.role !== 'MASTER') {
      return err('Only Master can report correct answer', 403, 'FORBIDDEN')
    }

    // Get current room phase
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('phase')
      .eq('id', room_id)
      .single()

    if (roomError) {
      console.error('[report-answer] Error fetching room:', roomError)
      return err('Failed to fetch room', 500, 'DATABASE_ERROR')
    }

    // Verify we're in QUESTION phase
    if (roomData.phase !== 'QUESTION') {
      return err(
        `Can only report answer during QUESTION phase (current: ${roomData.phase})`,
        409,
        'INVALID_PHASE'
      )
    }

    // Get current session deadline
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select('deadline_epoch')
      .eq('id', session_id)
      .single()

    if (sessionError) {
      console.error('[report-answer] Error fetching session:', sessionError)
      return err('Failed to fetch session', 500, 'DATABASE_ERROR')
    }

    // Calculate remaining time (inherit to DEBATE)
    const now = Math.floor(Date.now() / 1000)
    const currentDeadline = sessionData.deadline_epoch || now + 300 // Fallback 5 min
    const remainingSeconds = Math.max(0, currentDeadline - now)

    const debateDeadline = now + remainingSeconds

    console.log('[report-answer] Time inheritance:', {
      currentDeadline,
      now,
      remainingSeconds,
      debateDeadline,
    })

    // Update session with answerer and new deadline
    const { error: updateSessionError } = await supabase
      .from('game_sessions')
      .update({
        answerer_id,
        deadline_epoch: debateDeadline,
      })
      .eq('id', session_id)

    if (updateSessionError) {
      console.error('[report-answer] Error updating session:', updateSessionError)
      return err('Failed to update session', 500, 'DATABASE_ERROR')
    }

    // Update room phase to DEBATE
    const { error: updatePhaseError } = await supabase
      .from('rooms')
      .update({ phase: 'DEBATE' })
      .eq('id', room_id)

    if (updatePhaseError) {
      console.error('[report-answer] Error updating phase:', updatePhaseError)
      return err('Failed to update phase', 500, 'DATABASE_ERROR')
    }

    // Broadcast phase update with answerer info
    await broadcastPhaseUpdate(session_id, 'DEBATE', debateDeadline, answerer_id)

    return ok({
      phase: 'DEBATE',
      deadline_epoch: debateDeadline,
      answerer_id,
    })
  } catch (error) {
    console.error('[report-answer] Unexpected error:', error)
    return err('Internal server error', 500, 'INTERNAL_ERROR')
  }
})
