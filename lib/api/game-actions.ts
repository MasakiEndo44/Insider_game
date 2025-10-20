/**
 * Game Actions API Client
 *
 * Provides type-safe wrappers for game API calls
 */

import type { Difficulty, VoteType } from '@/lib/validations/database.schema';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Create a new room
 *
 * @param passphrase - Room passphrase
 * @returns Room ID and phase
 */
export async function createRoom(
  passphrase: string
): Promise<ApiResponse<{ roomId: string; phase: string }>> {
  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error, details: data.details };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

/**
 * Join an existing room
 *
 * @param passphrase - Room passphrase
 * @returns Room ID, phase, and player count
 */
export async function joinRoom(
  passphrase: string
): Promise<
  ApiResponse<{ roomId: string; phase: string; playerCount: number }>
> {
  try {
    const response = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error, details: data.details };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

/**
 * Start a game session
 *
 * @param roomId - Room ID
 * @param difficulty - Topic difficulty
 * @returns Session ID and role assignments
 */
export async function startGame(
  roomId: string,
  difficulty: Difficulty
): Promise<
  ApiResponse<{
    sessionId: string;
    difficulty: string;
    phase: string;
    roleAssignments: Array<{ playerId: string; role: string }>;
    topics: Array<{ id: string; text: string; difficulty: string }>;
  }>
> {
  try {
    const response = await fetch('/api/games/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, difficulty }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error, details: data.details };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

/**
 * Submit a vote
 *
 * @param sessionId - Game session ID
 * @param voteType - Type of vote
 * @param voteValue - Vote value (player ID or "yes"/"no")
 * @param round - Vote round
 * @returns Vote ID and confirmation
 */
export async function submitVote(
  sessionId: string,
  voteType: VoteType,
  voteValue: string,
  round: number = 1
): Promise<
  ApiResponse<{
    voteId: string;
    voteType: string;
    round: number;
  }>
> {
  try {
    const response = await fetch('/api/games/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, voteType, voteValue, round }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error, details: data.details };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

/**
 * Calculate game result
 *
 * @param sessionId - Game session ID
 * @param wordGuessed - Whether the word was guessed
 * @returns Game outcome and details
 */
export async function calculateResult(
  sessionId: string,
  wordGuessed: boolean
): Promise<
  ApiResponse<{
    resultId: string;
    outcome: string;
    insiderId: string;
    masterId: string;
    votedPlayerId: string | null;
    wordGuessed: boolean;
  }>
> {
  try {
    const response = await fetch('/api/games/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, wordGuessed }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error, details: data.details };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

/**
 * Get room state
 *
 * @param roomId - Room ID
 * @returns Room data, players, and session
 */
export async function getRoomState(roomId: string): Promise<
  ApiResponse<{
    room: {
      id: string;
      phase: string;
      hostId: string | null;
      isSuspended: boolean;
      createdAt: string;
      updatedAt: string;
    };
    players: Array<{
      id: string;
      nickname: string;
      isHost: boolean;
      isConnected: boolean;
      confirmed: boolean;
    }>;
    session: {
      id: string;
      difficulty: string;
      phase: string;
      startTime: string | null;
      deadlineEpoch: number | null;
    } | null;
  }>
> {
  try {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error, details: data.details };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}
