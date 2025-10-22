/**
 * Insider Game State Machine (XState 5.x)
 *
 * Manages the 9-phase game flow with type-safe context and events.
 * This is the single source of truth for game state.
 *
 * Phase Flow:
 * LOBBY → DEAL → TOPIC → QUESTION → DEBATE → VOTE1 → VOTE2 → VOTE2_RUNOFF → RESULT
 */

import { setup, assign } from 'xstate';
import type { Difficulty, Role } from '@/lib/validations/database.schema';

// ============================================================
// Type Definitions
// ============================================================

/**
 * Game Phase Enum
 * Matches database schema phases
 */
export type GamePhase =
  | 'LOBBY'
  | 'DEAL'
  | 'TOPIC'
  | 'QUESTION'
  | 'DEBATE'
  | 'VOTE1'
  | 'VOTE2'
  | 'VOTE2_RUNOFF'
  | 'RESULT';

/**
 * Player in the game
 */
export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isReady: boolean;
}

/**
 * Role assignment for a player
 */
export interface RoleAssignment {
  playerId: string;
  role: Role;
}

/**
 * Vote record
 */
export interface Vote {
  voterId: string;
  votedForId: string;
  round: number;
}

/**
 * Game Context - The state data shared by all players
 * This is synchronized via Supabase Realtime
 */
export interface GameContext {
  // Room info
  roomId: string;
  sessionId: string | null;

  // Players
  players: Player[];
  hostId: string | null;

  // Game settings
  difficulty: Difficulty | null;
  timerDuration: number; // seconds for QUESTION phase
  deadlineEpoch: number | null; // Unix timestamp

  // Role assignments (hidden until RESULT)
  roles: RoleAssignment[];
  masterId: string | null;
  insiderId: string | null;

  // Topic
  topic: string | null;
  topicId: string | null;

  // Voting
  votes: Vote[];
  currentVoteRound: number;

  // Results
  outcome: 'CITIZENS_WIN' | 'INSIDER_WIN' | 'ALL_LOSE' | null;
  revealedPlayerId: string | null;
}

/**
 * Game Events - Actions that trigger state transitions
 * These are sent from UI → State Machine → Supabase → All Clients
 */
export type GameEvent =
  // Lobby phase
  | { type: 'player.join'; player: Player }
  | { type: 'player.leave'; playerId: string }
  | { type: 'player.ready'; playerId: string; isReady: boolean }
  | { type: 'game.start' }

  // Deal phase (role assignment)
  | { type: 'roles.assigned'; roles: RoleAssignment[]; sessionId: string }

  // Topic phase
  | {
      type: 'topic.selected';
      topic: string;
      topicId: string;
      difficulty: Difficulty;
    }

  // Question/Debate phase
  | { type: 'timer.start'; deadlineEpoch: number }
  | { type: 'timer.expired' }

  // Voting phases
  | { type: 'vote.cast'; voterId: string; votedForId: string }
  | { type: 'vote.complete' }
  | { type: 'vote.runoff'; candidates: string[] }

  // Result phase
  | {
      type: 'game.end';
      outcome: GameContext['outcome'];
      revealedPlayerId: string | null;
    }

  // Reset
  | { type: 'game.reset' };

// ============================================================
// State Machine Definition
// ============================================================

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as Partial<GameContext>,
  },
  guards: {
    hasMinPlayers: ({ context }) => {
      return context.players.length >= 3;
    },
    allPlayersReady: ({ context }) => {
      return (
        context.players.length >= 3 &&
        context.players.every((p: Player) => p.isReady || p.isHost)
      );
    },
    allPlayersVoted: ({ context }) => {
      const votesInCurrentRound = context.votes.filter(
        (v: Vote) => v.round === context.currentVoteRound
      );
      return votesInCurrentRound.length === context.players.length;
    },
  },
  actions: {
    addPlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'player.join') return context.players;
        return [...context.players, event.player];
      },
    }),
    removePlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'player.leave') return context.players;
        return context.players.filter((p: Player) => p.id !== event.playerId);
      },
    }),
    togglePlayerReady: assign({
      players: ({ context, event }) => {
        if (event.type !== 'player.ready') return context.players;
        return context.players.map((p: Player) =>
          p.id === event.playerId ? { ...p, isReady: event.isReady } : p
        );
      },
    }),
    assignRoles: assign({
      roles: ({ event }) => {
        if (event.type !== 'roles.assigned') return [];
        return event.roles;
      },
      sessionId: ({ event }) => {
        if (event.type !== 'roles.assigned') return null;
        return event.sessionId;
      },
      masterId: ({ event }) => {
        if (event.type !== 'roles.assigned') return null;
        const master = event.roles.find(
          (r: RoleAssignment) => r.role === 'MASTER'
        );
        return master?.playerId || null;
      },
      insiderId: ({ event }) => {
        if (event.type !== 'roles.assigned') return null;
        const insider = event.roles.find(
          (r: RoleAssignment) => r.role === 'INSIDER'
        );
        return insider?.playerId || null;
      },
    }),
    setTopic: assign({
      topic: ({ event }) => {
        if (event.type !== 'topic.selected') return null;
        return event.topic;
      },
      topicId: ({ event }) => {
        if (event.type !== 'topic.selected') return null;
        return event.topicId;
      },
      difficulty: ({ event }) => {
        if (event.type !== 'topic.selected') return null;
        return event.difficulty;
      },
    }),
    startTimer: assign({
      deadlineEpoch: ({ event }) => {
        if (event.type !== 'timer.start') return null;
        return event.deadlineEpoch;
      },
    }),
    recordVote: assign({
      votes: ({ context, event }) => {
        if (event.type !== 'vote.cast') return context.votes;
        return [
          ...context.votes,
          {
            voterId: event.voterId,
            votedForId: event.votedForId,
            round: context.currentVoteRound,
          },
        ];
      },
    }),
    incrementVoteRound: assign({
      currentVoteRound: ({ context }) => context.currentVoteRound + 1,
    }),
    setGameResult: assign({
      outcome: ({ event }) => {
        if (event.type !== 'game.end') return null;
        return event.outcome;
      },
      revealedPlayerId: ({ event }) => {
        if (event.type !== 'game.end') return null;
        return event.revealedPlayerId;
      },
    }),
    resetGame: assign({
      sessionId: null,
      difficulty: null,
      timerDuration: 300, // 5 minutes default
      deadlineEpoch: null,
      roles: [],
      masterId: null,
      insiderId: null,
      topic: null,
      topicId: null,
      votes: [],
      currentVoteRound: 1,
      outcome: null,
      revealedPlayerId: null,
      players: ({ context }) =>
        context.players.map((p: Player) => ({ ...p, isReady: false })),
    }),
  },
}).createMachine({
  id: 'insiderGame',
  initial: 'LOBBY',
  context: ({ input }) => ({
    roomId: input.roomId || '',
    sessionId: null,
    players: input.players || [],
    hostId: input.hostId || null,
    difficulty: null,
    timerDuration: 300, // 5 minutes
    deadlineEpoch: null,
    roles: [],
    masterId: null,
    insiderId: null,
    topic: null,
    topicId: null,
    votes: [],
    currentVoteRound: 1,
    outcome: null,
    revealedPlayerId: null,
  }),
  states: {
    LOBBY: {
      on: {
        'player.join': {
          actions: 'addPlayer',
        },
        'player.leave': {
          actions: 'removePlayer',
        },
        'player.ready': {
          actions: 'togglePlayerReady',
        },
        'game.start': {
          target: 'DEAL',
          guard: { type: 'allPlayersReady' },
        },
      },
    },

    DEAL: {
      on: {
        'roles.assigned': {
          target: 'TOPIC',
          actions: 'assignRoles',
        },
      },
    },

    TOPIC: {
      on: {
        'topic.selected': {
          target: 'QUESTION',
          actions: 'setTopic',
        },
      },
    },

    QUESTION: {
      entry: 'startTimer',
      on: {
        'timer.expired': {
          target: 'DEBATE',
        },
      },
    },

    DEBATE: {
      on: {
        'vote.complete': {
          target: 'VOTE1',
        },
      },
    },

    VOTE1: {
      on: {
        'vote.cast': {
          actions: 'recordVote',
        },
        'vote.complete': {
          target: 'VOTE2',
          guard: { type: 'allPlayersVoted' },
        },
      },
    },

    VOTE2: {
      entry: 'incrementVoteRound',
      on: {
        'vote.cast': {
          actions: 'recordVote',
        },
        'vote.complete': {
          target: 'RESULT',
          guard: { type: 'allPlayersVoted' },
        },
        'vote.runoff': {
          target: 'VOTE2_RUNOFF',
        },
      },
    },

    VOTE2_RUNOFF: {
      entry: 'incrementVoteRound',
      on: {
        'vote.cast': {
          actions: 'recordVote',
        },
        'vote.complete': {
          target: 'RESULT',
          guard: { type: 'allPlayersVoted' },
        },
      },
    },

    RESULT: {
      on: {
        'game.end': {
          actions: 'setGameResult',
        },
        'game.reset': {
          target: 'LOBBY',
          actions: 'resetGame',
        },
      },
    },
  },
});

// ============================================================
// Helper Types for Consumers
// ============================================================

import type { SnapshotFrom, ActorRefFrom } from 'xstate';

export type GameMachineSnapshot = SnapshotFrom<typeof gameMachine>;
export type GameMachineActor = ActorRefFrom<typeof gameMachine>;
