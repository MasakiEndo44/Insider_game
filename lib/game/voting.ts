/**
 * Voting and Result Calculation Logic
 *
 * Handles vote counting and game outcome determination
 */

import type { Database } from '@/lib/supabase/database.types';
import type { VoteType, Outcome } from '@/lib/validations/database.schema';
import type { SupabaseClient } from '@supabase/supabase-js';

type Vote = Database['public']['Tables']['votes']['Row'];
type Role = Database['public']['Tables']['roles']['Row'];

export interface VoteCount {
  playerId: string;
  count: number;
}

export interface GameResult {
  outcome: Outcome;
  insiderId: string;
  masterId: string;
  votedPlayerId?: string;
  wordGuessed: boolean;
}

/**
 * Count votes for a specific vote type and round
 *
 * @param votes - Array of votes
 * @returns Array of vote counts sorted by count (descending)
 */
export function countVotes(votes: Vote[]): VoteCount[] {
  const voteCounts = new Map<string, number>();

  for (const vote of votes) {
    if (!vote.vote_value) continue;

    const currentCount = voteCounts.get(vote.vote_value) || 0;
    voteCounts.set(vote.vote_value, currentCount + 1);
  }

  const counts: VoteCount[] = Array.from(voteCounts.entries()).map(
    ([playerId, count]) => ({
      playerId,
      count,
    })
  );

  // Sort by count descending
  counts.sort((a, b) => b.count - a.count);

  return counts;
}

/**
 * Determine if there is a tie in votes
 *
 * @param voteCounts - Array of vote counts
 * @returns True if there is a tie for the highest vote count
 */
export function hasTie(voteCounts: VoteCount[]): boolean {
  if (voteCounts.length < 2) return false;

  const highestCount = voteCounts[0].count;
  const secondHighestCount = voteCounts[1].count;

  return highestCount === secondHighestCount;
}

/**
 * Get the player with the most votes
 *
 * @param voteCounts - Array of vote counts
 * @returns Player ID with most votes, or null if tie
 */
export function getTopVotedPlayer(
  voteCounts: VoteCount[]
): string | null {
  if (voteCounts.length === 0) return null;
  if (hasTie(voteCounts)) return null;

  return voteCounts[0].playerId;
}

/**
 * Calculate game outcome based on game state
 *
 * @param insiderId - Insider player ID
 * @param masterId - Master player ID
 * @param votedPlayerId - Player who was voted as insider (or null)
 * @param wordGuessed - Whether the word was guessed correctly
 * @returns Game outcome
 */
export function calculateOutcome(
  insiderId: string,
  masterId: string,
  votedPlayerId: string | null,
  wordGuessed: boolean
): Outcome {
  // Case 1: Word was guessed correctly
  if (wordGuessed) {
    // If insider was correctly identified
    if (votedPlayerId === insiderId) {
      return 'CITIZENS_WIN';
    }
    // If wrong person was identified (including master)
    else {
      return 'INSIDER_WIN';
    }
  }
  // Case 2: Word was not guessed correctly
  else {
    // Everyone loses if word not guessed
    return 'ALL_LOSE';
  }
}

/**
 * Get role assignments for a session
 *
 * @param supabase - Supabase client
 * @param sessionId - Game session ID
 * @returns Object with insiderId and masterId
 */
export async function getRoleAssignments(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<{ insiderId: string; masterId: string } | null> {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('player_id, role')
    .eq('session_id', sessionId);

  if (error || !roles) {
    throw new Error(`Failed to fetch roles: ${error?.message}`);
  }

  const insider = roles.find((r) => r.role === 'INSIDER');
  const master = roles.find((r) => r.role === 'MASTER');

  if (!insider || !master) {
    return null;
  }

  return {
    insiderId: insider.player_id,
    masterId: master.player_id,
  };
}

/**
 * Submit a vote
 *
 * @param supabase - Supabase client
 * @param sessionId - Game session ID
 * @param playerId - Player ID
 * @param voteType - Type of vote
 * @param voteValue - Vote value (player ID or "yes"/"no")
 * @param round - Vote round (for runoff votes)
 * @returns Created vote record
 */
export async function submitVote(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  playerId: string,
  voteType: VoteType,
  voteValue: string,
  round: number = 1
): Promise<Vote> {
  // Check if player already voted in this round
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('session_id', sessionId)
    .eq('player_id', playerId)
    .eq('vote_type', voteType)
    .eq('round', round)
    .maybeSingle();

  if (existingVote) {
    throw new Error('Player has already voted in this round');
  }

  // Insert vote
  const { data: vote, error } = await supabase
    .from('votes')
    .insert({
      session_id: sessionId,
      player_id: playerId,
      vote_type: voteType,
      vote_value: voteValue,
      round,
    })
    .select()
    .single();

  if (error || !vote) {
    throw new Error(`Failed to submit vote: ${error?.message}`);
  }

  return vote;
}

/**
 * Get all votes for a specific vote type and round
 *
 * @param supabase - Supabase client
 * @param sessionId - Game session ID
 * @param voteType - Type of vote
 * @param round - Vote round
 * @returns Array of votes
 */
export async function getVotes(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  voteType: VoteType,
  round: number = 1
): Promise<Vote[]> {
  const { data: votes, error } = await supabase
    .from('votes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('vote_type', voteType)
    .eq('round', round);

  if (error) {
    throw new Error(`Failed to fetch votes: ${error.message}`);
  }

  return votes || [];
}
