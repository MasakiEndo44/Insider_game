/**
 * Role Assignment Logic
 *
 * Handles random role distribution for Insider Game
 */

import type { Role } from '@/lib/validations/database.schema';

export interface Player {
  id: string;
  nickname: string;
}

export interface RoleAssignment {
  playerId: string;
  role: Role;
}

/**
 * Assign roles to players for a game session
 *
 * Rules:
 * - 1 MASTER
 * - 1 INSIDER
 * - Remaining players are CITIZEN
 *
 * @param players - Array of players to assign roles to
 * @param prevMasterId - ID of previous master (to avoid same master twice in a row)
 * @returns Array of role assignments
 */
export function assignRoles(
  players: Player[],
  prevMasterId?: string | null
): RoleAssignment[] {
  if (players.length < 4) {
    throw new Error('Minimum 4 players required');
  }

  if (players.length > 8) {
    throw new Error('Maximum 8 players allowed');
  }

  // Shuffle players array (Fisher-Yates algorithm)
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Filter out previous master if specified
  const eligibleForMaster = prevMasterId
    ? shuffled.filter((p) => p.id !== prevMasterId)
    : shuffled;

  // Assign MASTER (first eligible player)
  const masterPlayer =
    eligibleForMaster.length > 0 ? eligibleForMaster[0] : shuffled[0];

  // Assign INSIDER (second player in shuffled array, but not master)
  const insiderPlayer = shuffled.find((p) => p.id !== masterPlayer.id);

  if (!insiderPlayer) {
    throw new Error('Failed to assign insider role');
  }

  // Create role assignments
  const assignments: RoleAssignment[] = players.map((player) => {
    if (player.id === masterPlayer.id) {
      return { playerId: player.id, role: 'MASTER' };
    } else if (player.id === insiderPlayer.id) {
      return { playerId: player.id, role: 'INSIDER' };
    } else {
      return { playerId: player.id, role: 'CITIZEN' };
    }
  });

  return assignments;
}

/**
 * Get role distribution summary
 *
 * @param playerCount - Number of players
 * @returns Object with role counts
 */
export function getRoleDistribution(playerCount: number): {
  master: number;
  insider: number;
  citizens: number;
} {
  if (playerCount < 4 || playerCount > 8) {
    throw new Error('Player count must be between 4 and 8');
  }

  return {
    master: 1,
    insider: 1,
    citizens: playerCount - 2,
  };
}
