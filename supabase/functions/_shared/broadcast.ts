/**
 * Supabase Realtime Broadcast Helpers
 *
 * Reliable broadcast pattern:
 * 1. Persist state change to database (within transaction)
 * 2. Send broadcast event to all subscribed clients
 * 3. Clients reconcile with DB on reconnect if packet missed
 */

import { supabase } from './supabaseAdmin.ts'

/**
 * Broadcast phase update to all clients in game session
 *
 * @param sessionId - Game session ID
 * @param event - Event type ('phase_update', 'vote_update', etc.)
 * @param payload - Event payload data
 *
 * @example
 * await broadcast(sessionId, 'phase_update', {
 *   phase: 'DEBATE',
 *   deadline_epoch: Math.floor(Date.now() / 1000) + 300,
 *   server_now: Math.floor(Date.now() / 1000)
 * })
 */
export async function broadcast(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const channel = supabase.channel(`game:${sessionId}`)

  try {
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })

    console.log(`[Broadcast] ${event} sent to game:${sessionId}`, payload)
  } catch (error) {
    console.error(`[Broadcast] Failed to send ${event}:`, error)
    // Don't throw - broadcast failures shouldn't break the function
    // Clients will reconcile on next DB poll
  } finally {
    // Clean up channel subscription
    await supabase.removeChannel(channel)
  }
}

/**
 * Broadcast phase transition with server time synchronization
 *
 * @param sessionId - Game session ID
 * @param phase - New game phase
 * @param deadlineEpoch - Optional deadline timestamp (Unix seconds)
 * @param answererId - Optional player ID who answered correctly
 */
export async function broadcastPhaseUpdate(
  sessionId: string,
  phase: string,
  deadlineEpoch: number | null = null,
  answererId: string | null = null
): Promise<void> {
  await broadcast(sessionId, 'phase_update', {
    phase,
    deadline_epoch: deadlineEpoch,
    server_now: Math.floor(Date.now() / 1000), // For drift correction
    answerer_id: answererId,
  })
}
