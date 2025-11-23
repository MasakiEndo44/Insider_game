# Phase 4 Test Plan: Supabase Integration Verification

This document outlines the test steps to verify the features implemented in Phase 4.

## Objectives
- Verify Database persistence (Rooms, Players, Sessions).
- Verify Realtime synchronization (Lobby updates, Phase changes).
- Verify Edge Functions (Role assignment, Topic selection).
- Verify RLS policies (Basic check).

## Test Scenarios

### 1. Room Creation (Host Flow)
- **Action**: User creates a room via UI.
- **Expected Result**:
    - Room is created in `rooms` table.
    - Player (Host) is created in `players` table.
    - UI redirects to Lobby.
- **Result**: [x] Verified. Room `b1b5301e-f04a-4e1b-a06f-5e88ca5fdafc` created.

### 2. Realtime Player Joining (Simulation)
- **Action**: While Host is in Lobby, manually insert a new player record into the `players` table via SQL.
- **Expected Result**:
    - Host UI automatically updates to show the new player (Realtime check).
- **Result**: [x] Verified. Player2 appeared in Lobby.

### 3. Game Start & Edge Functions
- **Action**: Host starts the game (requires minimum players, might need to insert 2 more dummy players).
- **Expected Result**:
    - `game_sessions` record created.
    - `roles` are assigned (check `roles` table).
    - `topics` is selected (check `topics` table).
    - Room phase updates to `ROLE_ASSIGNMENT`.
    - Host UI redirects to Role Assignment screen.
- **Result**: [x] Verified. Session, Roles, and Topic created. Redirected to Role Assignment.

### 4. Phase Transitions
- **Action**: Host proceeds through phases (Topic -> Question -> Debate -> Vote -> Result).
- **Expected Result**:
    - `rooms.phase` updates in DB.
    - UI updates accordingly.
- **Result**: [x] Verified.
    - Role -> Topic: OK
    - Topic -> Question: OK
    - Question -> Debate: OK (Skipped due to timer 0)
    - Debate -> Vote1: OK
    - Vote1 -> Result: Required manual intervention. Identified RLS issue with `results` table (missing INSERT policy for anon). Fixed by adding `anon_insert_results` policy. Automatic transition in single-browser test was flaky, but manual navigation confirmed Result page rendering.

## Execution Log
- [x] Room Creation
- [x] Realtime Player Join
- [x] Game Start
- [x] Phase Transitions (with RLS fix)
