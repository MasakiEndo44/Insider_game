/**
 * tally-votes Edge Function
 *
 * Counts votes and determines game outcome or triggers runoff
 *
 * Request body:
 * {
 *   session_id: string,
 *   room_id: string,
 *   vote_type: 'VOTE1' | 'VOTE2'
 * }
 *
 * Response:
 * {
 *   data: {
 *     outcome: 'CITIZENS_WIN' | 'INSIDER_WIN' | 'ALL_LOSE' | 'RUNOFF',
 *     winner_id?: string,
 *     runoff_candidates?: string[]
 *   }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabaseAdmin.ts'
import { ok, err, corsHeaders } from '../_shared/http.ts'
import { broadcastPhaseUpdate } from '../_shared/broadcast.ts'
import { broadcast } from '../_shared/broadcast.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, room_id, vote_type } = await req.json()

    // Validate input
    if (!session_id || !room_id || !vote_type) {
      return err('Missing required fields', 400, 'MISSING_PARAMS')
    }

    if (vote_type !== 'VOTE1' && vote_type !== 'VOTE2') {
      return err('vote_type must be VOTE1 or VOTE2', 400, 'INVALID_VOTE_TYPE')
    }

    // Get total player count
    const { count: playerCount, error: playerCountError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room_id)

    if (playerCountError) {
      console.error('[tally-votes] Error counting players:', playerCountError)
      return err('Failed to count players', 500, 'DATABASE_ERROR')
    }

    const totalPlayers = playerCount || 0

    // Get votes
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('vote_value, round')
      .eq('session_id', session_id)
      .eq('vote_type', vote_type)

    if (votesError) {
      console.error('[tally-votes] Error fetching votes:', votesError)
      return err('Failed to fetch votes', 500, 'DATABASE_ERROR')
    }

    if (!votes || votes.length !== totalPlayers) {
      return err(
        `Not all players have voted (${votes?.length || 0}/${totalPlayers})`,
        400,
        'INCOMPLETE_VOTING'
      )
    }

    // Determine current round
    const currentRound = Math.max(...votes.map((v) => v.round || 1))

    // Tally votes by value
    const tallies = votes.reduce((acc, vote) => {
      const value = vote.vote_value
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('[tally-votes] Vote tallies:', tallies)

    // VOTE1: "Is answerer the Insider?" (yes/no)
    if (vote_type === 'VOTE1') {
      const yesVotes = tallies['yes'] || 0
      const noVotes = tallies['no'] || 0
      const majority = totalPlayers / 2

      console.log('[tally-votes] VOTE1 results:', { yesVotes, noVotes, majority })

      // Get answerer and Insider IDs
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('answerer_id')
        .eq('id', session_id)
        .single()

      const { data: insiderRole } = await supabase
        .from('roles')
        .select('player_id')
        .eq('session_id', session_id)
        .eq('role', 'INSIDER')
        .single()

      const answererId = sessionData?.answerer_id
      const insiderId = insiderRole?.player_id

      if (yesVotes > majority) {
        // Majority says answerer is Insider
        const outcome = answererId === insiderId ? 'CITIZENS_WIN' : 'INSIDER_WIN'

        await saveResult(session_id, outcome, answererId)
        await updateRoomPhase(room_id, 'RESULT')
        await broadcastPhaseUpdate(session_id, 'RESULT')

        return ok({ outcome, revealed_player_id: answererId })
      } else {
        // Majority says answerer is not Insider → Move to VOTE2
        await updateRoomPhase(room_id, 'VOTE2')
        await broadcastPhaseUpdate(session_id, 'VOTE2')

        return ok({ outcome: 'PROCEED_TO_VOTE2' })
      }
    }

    // VOTE2: Select Insider from candidates
    if (vote_type === 'VOTE2') {
      // Sort by vote count
      const sorted = Object.entries(tallies).sort((a, b) => b[1] - a[1])
      const topVotes = sorted[0][1]
      const topCandidates = sorted.filter(([_, count]) => count === topVotes).map(([id]) => id)

      console.log('[tally-votes] VOTE2 results:', { sorted, topCandidates, currentRound })

      // Single winner
      if (topCandidates.length === 1) {
        const winnerId = topCandidates[0]

        // Check if winner is Insider
        const { data: winnerRole } = await supabase
          .from('roles')
          .select('role')
          .eq('session_id', session_id)
          .eq('player_id', winnerId)
          .single()

        const outcome = winnerRole?.role === 'INSIDER' ? 'CITIZENS_WIN' : 'INSIDER_WIN'

        await saveResult(session_id, outcome, winnerId)
        await updateRoomPhase(room_id, 'RESULT')
        await broadcastPhaseUpdate(session_id, 'RESULT')

        return ok({ outcome, revealed_player_id: winnerId })
      }

      // Tie - check if runoff is still possible
      if (currentRound < 3) {
        // Update room phase to VOTE2_RUNOFF
        await updateRoomPhase(room_id, 'VOTE2_RUNOFF')

        // Broadcast phase update with runoff metadata
        await broadcastPhaseUpdate(session_id, 'VOTE2_RUNOFF', {
          runoff_candidates: topCandidates,
          runoff_round: currentRound + 1,
        })

        // Also send runoff_required broadcast for compatibility
        await broadcast(session_id, 'runoff_required', {
          candidates: topCandidates,
          round: currentRound + 1,
        })

        return ok({
          outcome: 'RUNOFF',
          runoff_candidates: topCandidates,
          round: currentRound + 1,
        })
      }

      // 3rd tie → Insider wins by escape
      const { data: insiderRole } = await supabase
        .from('roles')
        .select('player_id')
        .eq('session_id', session_id)
        .eq('role', 'INSIDER')
        .single()

      await saveResult(session_id, 'INSIDER_WIN', null)
      await updateRoomPhase(room_id, 'RESULT')
      await broadcastPhaseUpdate(session_id, 'RESULT')

      return ok({ outcome: 'INSIDER_WIN', reason: 'escaped_via_runoff_tie' })
    }
  } catch (error) {
    console.error('[tally-votes] Unexpected error:', error)
    return err('Internal server error', 500, 'INTERNAL_ERROR')
  }
})

// Helper: Save result to database
async function saveResult(
  sessionId: string,
  outcome: string,
  revealedPlayerId: string | null
) {
  const { error } = await supabase.from('results').insert({
    session_id: sessionId,
    outcome,
    revealed_player_id: revealedPlayerId,
  })

  if (error) {
    console.error('[tally-votes] Error saving result:', error)
    throw new Error('Failed to save result')
  }
}

// Helper: Update room phase
async function updateRoomPhase(roomId: string, phase: string) {
  const { error } = await supabase
    .from('rooms')
    .update({ phase })
    .eq('id', roomId)

  if (error) {
    console.error('[tally-votes] Error updating phase:', error)
    throw new Error('Failed to update phase')
  }
}
