# Supabase Migration Walkthrough

This document outlines the steps taken to migrate the Insider Game application from a local Mock API to a fully integrated Supabase backend.

## 1. Database Setup

We established the database schema to support the game logic, including rooms, players, game sessions, roles, topics, votes, and results.

### Schema Overview
- **rooms**: Manages game rooms and host information.
- **players**: Stores player profiles and connection status.
- **game_sessions**: Tracks individual game rounds, phases, and time limits.
- **roles**: Stores assigned roles (Master, Insider, Citizen) for each session.
- **topics**: Stores the selected topic for the session.
- **votes**: Records votes during the voting phases.
- **results**: Stores the final outcome of each game session.

### Migrations Applied
- `20251123_initial_schema.sql`: Created initial tables and RLS policies.
- `20251123_seed_topics.sql`: Populated `master_topics` with initial data.
- `20251123_fix_rls.sql`: Refined RLS policies for `roles` and `topics` to ensure correct `auth.uid()` mapping.

## 2. Edge Functions

We deployed server-side logic to Supabase Edge Functions to ensure security and fairness.

- **assign-roles**: Randomly assigns roles to players. Ensures exactly one Master and one Insider per game.
- **select-topic**: Randomly selects a topic from the `master_topics` table based on the chosen category.

## 3. Client-side Implementation

### Authentication
- Implemented anonymous authentication using `signInAnonymously` to allow users to join without creating an account.

### API Client (`lib/api.ts`)
- Created a new API client that interfaces with Supabase.
- Replaced all `mockAPI` calls with `api` calls across the application.
- Deleted `lib/mock-api.ts`.

### Realtime Synchronization
- Updated `RoomContext` and `GameContext` to subscribe to Supabase Realtime (`postgres_changes`).
- **RoomContext**: Syncs player list and host status.
- **GameContext**: Syncs game phase, roles, topic, and outcomes.

## 4. Security (Row Level Security)

Implemented RLS policies to protect sensitive game data:

- **Role Secrecy**: Players can only see their own role. Everyone can see all roles only when the phase is `RESULT`.
- **Topic Secrecy**: Only the Master and Insider can see the topic during the game. Everyone sees it in the `RESULT` phase.
- **Data Integrity**: Authenticated users can insert/update their own data (votes, player info) but cannot modify critical game state directly (handled by Host or Edge Functions).

## 5. Verification

- **Linting**: Fixed lint errors in `room-context.tsx`, `input.tsx`, and `game-context.tsx`.
- **Code Review**: Verified that no `mockAPI` references remain and that `api` client logic covers all game flows.

## Next Steps

- Perform End-to-End testing with multiple clients.
- Improve error handling and user feedback in the UI.
