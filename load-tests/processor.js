/**
 * Artillery Load Test Processor
 *
 * Custom functions for load testing Insider Game
 */

const { createClient } = require('@supabase/supabase-js');

// Track room assignments (room index → player count)
const roomAssignments = new Map();
let nextRoomIndex = 0;
const PLAYERS_PER_ROOM = 8;

/**
 * Assign player to a room (round-robin distribution)
 */
function assignPlayerToRoom(context, events, done) {
  // Find or create room with space
  let assignedRoom = -1;

  for (let i = 0; i < 30; i++) {
    const playerCount = roomAssignments.get(i) || 0;
    if (playerCount < PLAYERS_PER_ROOM) {
      assignedRoom = i;
      roomAssignments.set(i, playerCount + 1);
      break;
    }
  }

  // If all rooms full, create new room (shouldn't happen with 30 rooms)
  if (assignedRoom === -1) {
    assignedRoom = nextRoomIndex++;
    roomAssignments.set(assignedRoom, 1);
  }

  context.vars.roomIndex = assignedRoom;
  context.vars.roomId = `loadtest${assignedRoom}`;
  context.vars.playerId = `${assignedRoom}-${roomAssignments.get(assignedRoom)}`;

  return done();
}

/**
 * Subscribe to Supabase Realtime channel
 */
async function subscribeToRealtimeChannel(context, events, done) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials not found in environment');
    return done();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const channelName = `game:${context.vars.sessionId}`;
  const channel = supabase.channel(channelName);

  // Listen for phase updates
  channel
    .on('broadcast', { event: 'phase_update' }, (payload) => {
      context.vars.currentPhase = payload.payload.phase;

      // Check if VOTE2 is required
      if (payload.payload.phase === 'VOTE2') {
        context.vars.vote2Required = true;
      }
    })
    .on('broadcast', { event: 'runoff_required' }, (payload) => {
      context.vars.runoffCandidates = payload.payload.candidates;
      context.vars.vote2Required = true;
    })
    .subscribe();

  // Store channel in context for cleanup
  context.vars._supabaseChannel = channel;

  return done();
}

/**
 * Unsubscribe from Realtime channel
 */
async function unsubscribeFromRealtimeChannel(context, events, done) {
  const channel = context.vars._supabaseChannel;

  if (channel) {
    await channel.unsubscribe();
  }

  return done();
}

/**
 * Set random vote for VOTE1 (yes/no)
 */
function setRandomVote1(requestParams, context, ee, next) {
  context.vars.vote1Value = Math.random() > 0.5 ? 'yes' : 'no';
  return next();
}

/**
 * Set random vote for VOTE2 (candidate selection)
 */
function setRandomVote2(requestParams, context, ee, next) {
  // Get candidates from runoff or default to random player
  const candidates = context.vars.runoffCandidates || [];

  if (candidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    context.vars.vote2Value = candidates[randomIndex];
  } else {
    // Default to random player (simplified)
    context.vars.vote2Value = `player-${Math.floor(Math.random() * 8)}`;
  }

  return next();
}

/**
 * Host reports correct answer (Master only)
 */
async function reportCorrectAnswerAsHost(context, events, done) {
  // Check if this player is Master
  if (context.vars.role !== 'MASTER') {
    return done();
  }

  // Select random answerer (simplified: pick first peer)
  const answererId = `${context.vars.roomIndex}-2`; // Second player in room

  // This would be an HTTP POST in real scenario
  // POST /api/game/{sessionId}/report-answer
  context.vars.answererId = answererId;

  return done();
}

module.exports = {
  assignPlayerToRoom,
  subscribeToRealtimeChannel,
  unsubscribeFromRealtimeChannel,
  setRandomVote1,
  setRandomVote2,
  reportCorrectAnswerAsHost,
};
