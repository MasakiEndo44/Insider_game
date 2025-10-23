# Gap Analysis: Phase Transition Implementation

**Date**: 2025-10-22
**Scope**: Minimal viable implementation of 9-phase state transition flow
**Status**: 80% complete (Week 4-5 of MVP)

---

## Executive Summary

Analyzed implementation diagrams against current codebase to identify missing elements for minimal phase transition flow. **Critical gap identified**: VOTE2_RUNOFF phase exists in state machine but is not fully implemented in client-side rendering and server-side phase transitions.

### AI Assistant Consultation Results

**Gemini** - XState v5 Best Practices:
- ✅ Actor model used correctly
- ✅ `setup` function with type safety implemented
- ✅ `context` for game state properly utilized
- ✅ Guards and actions well-defined

**o3-low** - Critical Elements Checklist:
- ✅ Phase-transition state machine (single linear path)
- ✅ Server-authoritative loop via Edge Functions
- ✅ Supabase Realtime wiring
- ✅ Timer synchronization (epoch-based)
- ✅ Player state & validation
- ⚠️ **Missing**: Complete VOTE2_RUNOFF implementation

**Codex** - Implementation Status:
- ✅ Phase control in `gameMachine.ts`
- ✅ Timer sync via `useGamePhase` + `useCountdown`
- ✅ Player validation via RLS
- ✅ Server Edge Flow exists
- ❌ **Critical**: VOTE2_RUNOFF not in PhaseClient switch
- ❌ **Critical**: `tally-votes` doesn't update phase to VOTE2_RUNOFF

---

## Phase Implementation Matrix

| Phase | State Machine | Edge Function | Screen Component | PhaseClient Case | Status |
|-------|--------------|---------------|------------------|-----------------|---------|
| LOBBY | ✅ gameMachine.ts:295 | N/A | ⚠️ Fallback only | ✅ default | 🟡 Minimal |
| DEAL | ✅ gameMachine.ts:308 | ✅ assign-roles | ✅ Deal.tsx | ✅ Line 53 | ✅ Complete |
| TOPIC | ✅ gameMachine.ts:316 | ✅ transition-phase | ✅ Topic.tsx | ✅ Line 56 | ✅ Complete |
| QUESTION | ✅ gameMachine.ts:322 | ✅ report-answer | ✅ Question.tsx | ✅ Line 59 | ✅ Complete |
| DEBATE | ✅ gameMachine.ts:331 | ✅ report-answer | ✅ Debate.tsx | ✅ Line 62 | ✅ Complete |
| VOTE1 | ✅ gameMachine.ts:338 | ✅ tally-votes | ✅ Vote1.tsx | ✅ Line 65 | ✅ Complete |
| VOTE2 | ✅ gameMachine.ts:349 | ✅ tally-votes | ✅ Vote2.tsx | ✅ Line 68 | ✅ Complete |
| **VOTE2_RUNOFF** | ✅ gameMachine.ts:364 | ⚠️ Partial | ❌ **Missing** | ❌ **Missing** | 🔴 **Incomplete** |
| RESULT | ✅ gameMachine.ts:376 | ✅ tally-votes | ✅ Result.tsx | ✅ Line 71 | ✅ Complete |

---

## Critical Missing Elements

### 1. VOTE2_RUNOFF Screen Component ❌

**File**: `app/game/[sessionId]/screens/Vote2Runoff.tsx`

**Status**: Does not exist

**Impact**: When runoff occurs, clients cannot render voting UI

**Requirements**:
- Display runoff round number (1st, 2nd)
- Show only tied candidates from previous vote
- Handle vote submission with correct round number
- Auto-tally when all players vote
- Subscribe to further runoff events or transition to RESULT

**Reference Implementation**: Vote2.tsx (lines 1-339)

---

### 2. PhaseClient Switch Case ❌

**File**: `app/game/[sessionId]/PhaseClient.tsx`

**Location**: Lines 54-76 (switch statement)

**Status**: Missing case for 'VOTE2_RUNOFF'

**Current Code**:
```typescript
switch (phase) {
  case 'DEAL':
    return <DealScreen {...commonProps} />
  // ... other cases ...
  case 'VOTE2':
    return <Vote2Screen {...commonProps} />
  case 'RESULT':
    return <ResultScreen {...commonProps} />
  // ❌ No case for 'VOTE2_RUNOFF'
  default:
    return <div>Lobby or unknown phase</div>
}
```

**Required Fix**:
```typescript
case 'VOTE2_RUNOFF':
  return <Vote2RunoffScreen {...commonProps} runoffRound={runoffRound} runoffCandidates={runoffCandidates} />
```

**Dependencies**: Requires Vote2Runoff.tsx to be created first

---

### 3. tally-votes Phase Transition ⚠️

**File**: `supabase/functions/tally-votes/index.ts`

**Location**: Lines 165-178 (runoff detection logic)

**Current Behavior**:
```typescript
// Line 166-171: When tie detected
await broadcast(session_id, 'runoff_required', {
  candidates: topCandidates,
  round: currentRound + 1,
})

return ok({
  outcome: 'RUNOFF',
  runoff_candidates: topCandidates,
  round: currentRound + 1,
})
```

**Problem**:
- Broadcasts custom `runoff_required` event
- Does NOT update `rooms.phase` to 'VOTE2_RUNOFF'
- Clients listening to phase changes won't detect runoff

**Required Fix**:
```typescript
// Add phase update before broadcast
await updateRoomPhase(room_id, 'VOTE2_RUNOFF')
await broadcastPhaseUpdate(session_id, 'VOTE2_RUNOFF', {
  runoff_candidates: topCandidates,
  runoff_round: currentRound + 1,
})

await broadcast(session_id, 'runoff_required', {
  candidates: topCandidates,
  round: currentRound + 1,
})
```

---

### 4. Runoff Event Subscription ⚠️

**File**: Multiple screen components

**Current Behavior**:
- Vote2.tsx (lines 114-134) subscribes to `votes` table changes
- Does NOT subscribe to `runoff_required` broadcast

**Impact**: Clients don't react to runoff events in real-time

**Required Fix** (in Vote2.tsx and future Vote2Runoff.tsx):
```typescript
// Add broadcast channel subscription
const channel = supabase
  .channel(`game:${sessionId}`)
  .on('broadcast', { event: 'runoff_required' }, (payload) => {
    console.log('[Vote2] Runoff triggered:', payload)
    // Handle transition to VOTE2_RUNOFF phase
    // This will be handled automatically by phase subscription in useGamePhase
  })
  .subscribe()
```

---

## Secondary Missing Elements

### 5. useGamePhase Hook Enhancements ⚠️

**File**: `hooks/use-game-phase.ts`

**Current Status**: Fetches phase from `rooms` table

**Enhancement Needed**:
- Subscribe to broadcast events for runoff metadata
- Expose `runoffRound` and `runoffCandidates` to consumers

**Proposed Addition**:
```typescript
export function useGamePhase(sessionId: string) {
  const [runoffRound, setRunoffRound] = useState<number | null>(null)
  const [runoffCandidates, setRunoffCandidates] = useState<string[]>([])

  // Add broadcast subscription for runoff metadata
  useEffect(() => {
    const channel = supabase
      .channel(`game:${sessionId}`)
      .on('broadcast', { event: 'runoff_required' }, (payload) => {
        setRunoffRound(payload.round)
        setRunoffCandidates(payload.candidates)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  return {
    phase,
    deadlineEpoch,
    serverOffset,
    answererId,
    runoffRound,  // NEW
    runoffCandidates,  // NEW
    loading,
    error
  }
}
```

---

### 6. Round Number Tracking ⚠️

**Database**: `votes` table has `round` column

**Current Usage**:
- tally-votes.ts:81 - Calculates `currentRound = Math.max(...votes.map(v => v.round))`
- Vote2.tsx:144 - Hardcodes `round: 1` when submitting vote

**Gap**: Round number not incremented properly for runoff votes

**Required Fix** (in Vote2Runoff.tsx):
```typescript
await submitVote(sessionId, playerId, 'VOTE2', selectedCandidate, runoffRound)
```

---

## Implementation Recommendations

### Phase 1: Core VOTE2_RUNOFF Implementation (Critical) 🔴

1. **Create Vote2Runoff Screen Component**
   - Copy Vote2.tsx as template
   - Accept `runoffRound` and `runoffCandidates` as props
   - Filter candidates list to show only tied players
   - Display round number ("第1決選投票" / "第2決選投票")
   - Submit votes with correct round number

2. **Update PhaseClient Switch**
   - Add `case 'VOTE2_RUNOFF': return <Vote2RunoffScreen />`
   - Pass runoff metadata from useGamePhase hook

3. **Fix tally-votes Phase Transition**
   - Add `await updateRoomPhase(room_id, 'VOTE2_RUNOFF')` before broadcast
   - Update `broadcastPhaseUpdate` to include runoff metadata

### Phase 2: Metadata Flow (Important) 🟡

4. **Enhance useGamePhase Hook**
   - Add runoffRound and runoffCandidates state
   - Subscribe to runoff_required broadcast
   - Expose metadata to consumers

5. **Update PhaseClient Props**
   - Pass runoffRound and runoffCandidates to Vote2RunoffScreen

### Phase 3: Polish & Edge Cases (Nice-to-have) 🟢

6. **Add Runoff UI Indicators**
   - Show "決選投票 第X回" badge
   - Highlight that this is a tie-breaker vote
   - Display previous vote results if desired

7. **Handle 3rd Tie Edge Case UI**
   - Show special message when Insider escapes via 3rd tie
   - Display "インサイダー逃げ切り!" in Result screen

---

## Testing Checklist

### Unit Tests

- [x] gameMachine: VOTE2 → VOTE2_RUNOFF transition exists
- [ ] tally-votes: Properly updates phase to VOTE2_RUNOFF
- [ ] tally-votes: Handles 1st tie → runoff
- [ ] tally-votes: Handles 2nd tie → runoff
- [ ] tally-votes: Handles 3rd tie → Insider wins

### Integration Tests

- [ ] Full game flow with 1st runoff
- [ ] Full game flow with 2nd runoff
- [ ] Full game flow with 3rd tie (Insider escape)
- [ ] Runoff candidates correctly filtered
- [ ] Round number increments properly
- [ ] All players can vote in runoff
- [ ] Phase transition: VOTE2 → VOTE2_RUNOFF → RESULT

### E2E Tests

- [ ] 5 players: Force 2-way tie in VOTE2
- [ ] 5 players: Force 3-way tie in VOTE2
- [ ] Verify UI shows runoff screen
- [ ] Verify runoff vote submission works
- [ ] Verify 3rd tie shows Insider win

---

## Estimated Effort

| Task | Complexity | Time | Priority |
|------|-----------|------|----------|
| Vote2Runoff.tsx | Low (copy Vote2.tsx) | 30 min | 🔴 Critical |
| PhaseClient case | Trivial | 5 min | 🔴 Critical |
| tally-votes fix | Low | 15 min | 🔴 Critical |
| useGamePhase enhancement | Medium | 45 min | 🟡 Important |
| Testing | Medium | 1 hour | 🟡 Important |
| **Total** | | **~2.5 hours** | |

---

## Dependencies Graph

```
Vote2Runoff.tsx (create)
    ↓
PhaseClient.tsx (add case)
    ↓
useGamePhase.ts (enhance - optional but recommended)
    ↓
tally-votes/index.ts (fix phase transition)
    ↓
Integration Testing
```

---

## References

- **Implementation Diagrams**: `docs/20251019_インサイダー実装図一覧.md`
- **Sequence Diagram**: Section 3-5 (投票フェーズシーケンス)
- **Flowchart**: Section 2-8 (第二投票フロー・決選投票含む)
- **State Machine**: `lib/machines/gameMachine.ts:364-374`
- **Existing Vote2**: `app/game/[sessionId]/screens/Vote2.tsx`
- **tally-votes**: `supabase/functions/tally-votes/index.ts:165-178`

---

## Decision Log

**2025-10-22**: Identified VOTE2_RUNOFF as only critical missing element for minimal phase transition flow. All other 8 phases are fully implemented. Recommended immediate implementation of 3 critical fixes before production deployment.

**Rationale**: Without VOTE2_RUNOFF, tie scenarios in second vote will cause game to hang. This blocks a core gameplay path outlined in the specification (決選投票).

---

**Status**: Ready for implementation
**Blocking**: Production deployment of voting features
**Next Steps**: Execute Phase 1 implementation (Critical fixes)
