# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 【MUST GLOBAL】AI Assistant Integration

**Always consult Gemini, o3, and Codex for comprehensive development support:**
- Use `mcp gemini-cli googleSearch` for technical research and validation
- Use `mcp o3-low o3-search` for design decisions and architectural questions
- Use `mcp codex` for implementation guidance and code optimization
- Consult all three in parallel, optimize questions for each platform
- Never use Claude Code's built-in WebSearch tool

### /sc: Command Codex Integration Requirement
**MANDATORY**: All `/sc:` commands (SuperClaude framework commands) must use Codex at least once per execution based on user prompts:
- `/sc:implement` - Use Codex for implementation strategy and code optimization
- `/sc:load` - Use Codex for session restoration and context analysis
- `/sc:save` - Use Codex for session state optimization and persistence strategy
- Any future `/sc:` commands must include Codex consultation as core requirement

**Implementation Pattern**: Each `/sc:` command should call `mcp__codex__codex` with user prompt context before proceeding with primary task execution.

## Project Overview

**Insider Game (インサイダーゲーム)** - Real-time online multiplayer social deduction game for 5-8 players. This browser-based application brings the popular board game online with Discord voice chat integration.

### Game Concept
- **Roles**: Master (1), Insider (1), Citizens (remaining players)
- **Objective**: Citizens ask questions to guess the topic within 5 minutes, then identify the Insider through voting
- **Phases**: Role Assignment → Topic Confirmation → Question (5min) → Debate → Vote 1 → Vote 2 (if needed) → Results

### Current Status
**Project Phase**: Planning/Design - No implementation yet. Comprehensive specifications exist in Japanese documentation.

## Core Documentation

**Primary References** (read these first):
- [docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md](docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md) - Product overview and architecture
- [docs/20251019_インサイダー実装図一覧.md](docs/20251019_インサイダー実装図一覧.md) - Complete flowcharts, sequence diagrams, and database schemas

## Planned Tech Stack

### Frontend
- **Framework**: React + Vite or Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **State Management**: Redux Toolkit or XState (for explicit state machine)
- **UI Library**: Tailwind CSS / MUI / Chakra UI (iPhone-like components)
- **Real-time**: Supabase Realtime or Socket.io client

### Backend
- **Platform**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Supabase Realtime (room-based subscriptions)
- **Functions**: Supabase Edge Functions for role assignment, vote tallying, phase transitions

### Infrastructure
- **Hosting**: Vercel (recommended) or similar edge platform
- **Voice**: Discord voice channels (external, not part of app)

## Key Architecture Patterns

### 1. Authoritative Server Pattern
**Critical**: Server is source of truth. Client displays only.
- All game state stored in Supabase PostgreSQL
- Clients subscribe to room-specific Realtime channels: `room:{roomId}`
- Phase transitions controlled by server Edge Functions
- Client requests validated server-side before state changes

### 2. Timer Synchronization (epoch-based)
**Problem**: Client clocks drift, causing desynced timers
**Solution**: Server sends deadline as Unix epoch timestamp
```typescript
// Server calculates and stores
deadline_epoch = now() + 300 // 5 minutes

// Client calculates remaining time locally
remaining = deadline_epoch - Math.floor(Date.now() / 1000)
```

### 3. Role & Topic Secrecy (RLS)
**Critical**: Prevent role/topic leaks via database security
- Role assignments stored with RLS: players can only read their own role
- Topics sent only to Master (always visible) and Insider (10-second popup)
- RLS policies enforce secrecy at database level, not just UI

### 4. Reconnection & Resume
**Reconnection**: Player rejoins mid-game
- Fetch current phase and reconstruct UI state
- If in voting phase and haven't voted → show voting UI
- If in timer phase → recalculate remaining time from deadline_epoch

**Resume**: Host restarts suspended game
- Game state snapshot saved to `suspended_state` JSONB column
- All original members must rejoin before resume allowed
- Timer recalculated: `new_deadline = now() + saved_remaining_time`

### 5. Voting System
**First Vote**: "Is the correct answerer the Insider?" (Yes/No)
- Simple majority required (>50%)
- If Yes wins → reveal answerer's role → determine winner
- If No wins → proceed to Second Vote

**Second Vote**: Select Insider from candidates
- Exclude Master and correct answerer from candidates
- Players vote for one candidate
- **Tie-breaking**: Up to 2 runoff votes among tied candidates
- **3rd tie**: Insider wins by escape

**Revote**: Host can trigger one revote in Second Vote (1x only)

## Database Schema (Supabase PostgreSQL)

### Core Tables
```sql
rooms
  - id (UUID, PK)
  - passphrase (TEXT, UNIQUE) -- 3-10 characters, Japanese supported
  - host_id (UUID, FK → players)
  - phase (TEXT) -- LOBBY/DEAL/TOPIC/QUESTION/DEBATE/VOTE1/VOTE2/RESULT
  - is_suspended (BOOLEAN)
  - suspended_state (JSONB) -- snapshot for resume

players
  - id (UUID, PK)
  - room_id (UUID, FK → rooms)
  - nickname (TEXT)
  - is_host (BOOLEAN)
  - is_connected (BOOLEAN) -- heartbeat status
  - confirmed (BOOLEAN) -- phase confirmation flag

game_sessions
  - id (UUID, PK)
  - room_id (UUID, FK → rooms)
  - difficulty (TEXT) -- Easy/Normal/Hard
  - start_time (TIMESTAMP)
  - deadline_epoch (BIGINT) -- Unix timestamp
  - answerer_id (UUID, FK → players) -- who got the correct answer
  - prev_master_id (UUID, FK → players) -- for rotation logic

roles
  - session_id (UUID, FK → game_sessions)
  - player_id (UUID, FK → players)
  - role (TEXT) -- MASTER/INSIDER/CITIZEN
  - RLS: SELECT only if (player_id = auth.uid() OR session.phase = 'RESULT')

topics
  - session_id (UUID, FK → game_sessions)
  - topic_text (TEXT)
  - difficulty (TEXT)
  - RLS: SELECT only if (role = 'MASTER' OR role = 'INSIDER')

votes
  - session_id (UUID, FK → game_sessions)
  - player_id (UUID, FK → players)
  - vote_type (TEXT) -- VOTE1/VOTE2/RUNOFF
  - vote_value (TEXT) -- yes/no for VOTE1, player_id for VOTE2
  - round (INT) -- runoff round number

results
  - session_id (UUID, FK → game_sessions)
  - outcome (TEXT) -- CITIZENS_WIN/INSIDER_WIN/ALL_LOSE
  - revealed_player_id (UUID, FK → players)
```

## Critical Implementation Requirements

### 1. Role Assignment Logic
```typescript
// Exclude previous Master from being Master again
const eligibleForMaster = allPlayers.filter(p => p.id !== prevMasterId);
const master = randomSelect(eligibleForMaster, 1);
const insider = randomSelect(allPlayers.except(master), 1);
const citizens = allPlayers.except(master, insider);

// Save with history tracking
savePrevMaster(currentSession, master.id);
```

### 2. Time Inheritance (Question → Debate)
```typescript
// When Master reports correct answer during Question phase
const elapsed = now() - startTime;
const remaining = 300 - elapsed; // 5min - elapsed
const debateDeadline = now() + remaining;

// Debate uses remaining time from Question phase
updateSession({
  phase: 'DEBATE',
  deadline_epoch: debateDeadline
});
```

### 3. Duplicate Nickname Handling
```typescript
// On join, if nickname exists in room
if (nicknameExists(room, nickname)) {
  nickname = `${nickname}-2`;
}
// Auto-append "-2" suffix
```

### 4. Passphrase Validation
- Length: 3-10 characters
- Unicode support: Japanese characters allowed
- Uniqueness: Must not exist in active rooms
- Security: Store hashed (not plaintext)

## Development Workflow

### When Implementation Starts

**Initial Setup**:
```bash
# Frontend (example with Next.js)
npx create-next-app@latest insider-game --typescript --tailwind --app
cd insider-game
npm install @supabase/supabase-js zustand

# Supabase setup
npx supabase init
npx supabase start  # Local development
```

**Database Setup**:
```bash
# Create tables from schema in docs
npx supabase migration new initial_schema
# Edit migration file with SQL from docs
npx supabase db push
```

**Development Server**:
```bash
npm run dev  # Frontend dev server
npx supabase start  # Local Supabase
```

**Testing**:
```bash
npm test              # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:load     # Load testing (30 concurrent users)
```

## UI/UX Requirements

### Mobile-First Design (iPhone-like)
- **Tap targets**: Minimum 44px × 44px
- **Font size**: Minimum 16px (prevent zoom on iOS)
- **Layout**: Bottom-fixed buttons for one-handed operation
- **Orientation**: Portrait optimized, responsive to landscape

### Color & Accessibility
- **Brand colors**: Red (#E50012) × Black × White
- **Contrast**: WCAG AA minimum (4.5:1 for text)
- **Color-blind safe**: Use icons + labels, not color alone
- **Role indicators**:
  - Master: "!" icon
  - Insider: Eye icon "👁"
  - Citizen: "?" icon

### Animations
- Subtle fades and slides (200-300ms)
- Card flip for role reveal
- Smooth phase transitions

## Testing Strategy

### Unit Tests
- Role assignment randomness (run 100 times, verify distribution)
- Vote tallying logic (all tie scenarios)
- Timer calculation edge cases (0 seconds, 1 second before deadline)
- Nickname deduplication

### Integration Tests
- Full game flow (5 players, happy path)
- Reconnection at each phase
- Suspend/resume with state validation
- Concurrent correct answer attempts (race condition)

### Load Tests
- 30 simultaneous rooms (8 players each)
- Network latency simulation (100ms, 500ms, 1000ms)
- Packet loss scenarios

## Security Considerations

1. **Row Level Security (RLS)**: Enforce role/topic secrecy at database level
2. **Passphrase hashing**: Use bcrypt or Argon2 for room passwords
3. **Input validation**: Sanitize all user inputs (nickname, passphrase)
4. **Rate limiting**: Prevent spam (vote spam, reconnect spam)
5. **CORS**: Restrict to production domain only
6. **No client-side secrets**: API keys in environment variables only

## Known Edge Cases

1. **Master disconnects during Question phase**:
   - Option A: Auto-suspend game
   - Option B: Promote another player to Master role

2. **All players disconnect**:
   - Auto-archive room after 5 minutes of inactivity

3. **Timezone differences**:
   - Always use server-side Unix timestamps
   - Display local time in UI using `Intl.DateTimeFormat`

4. **Browser refresh during voting**:
   - Restore voting state if vote not yet submitted
   - Show "waiting for results" if already voted

## Future Enhancements (Post-MVP)

- Question log/turn indicator
- Personal memo feature
- Scoring system across multiple rounds
- Room settings (tie-breaking rules, topic display duration)
- Master rotation options for consecutive games
- Spectator mode
- Game replay/history

## Important Notes

- **Language**: All UI text in Japanese (primary), consider i18n for future
- **Copyright**: Respect original board game IP - use abstract icons, avoid copying official artwork
- **Voice**: App does NOT handle voice - users use Discord/LINE externally
- **Browser support**: Modern browsers only (Chrome/Firefox/Safari latest 2 versions)

## Common Development Commands (Once Implemented)

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # ESLint
npm run type-check             # TypeScript validation

# Database
npx supabase db reset          # Reset local DB
npx supabase db diff           # Generate migration
npx supabase db push           # Apply migrations

# Testing
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:e2e               # Playwright E2E tests

# Deployment
vercel deploy                  # Deploy to Vercel
npx supabase link              # Link to production Supabase
npx supabase db push --linked  # Push migrations to production
```

## Troubleshooting

**Realtime not working**:
1. Check Supabase Realtime is enabled for table
2. Verify channel subscription: `supabase.channel('room:123').subscribe()`
3. Check RLS policies allow SELECT on subscribed tables

**Timer desync**:
1. Always use `deadline_epoch` from server
2. Calculate client-side: `remaining = deadline - Math.floor(Date.now() / 1000)`
3. Never trust client-submitted time values

**Role leaked to client**:
1. Verify RLS policies on `roles` table
2. Check Supabase client has correct user context
3. Test with browser DevTools network tab (should not see other roles)

## Contact & Resources

- **Specs**: See `docs/` folder for complete Japanese specifications
- **Game Rules**: [Insider Game Official](https://www.oinkgames.com/ja/games/analog/insider/) (reference only)
- **Supabase Docs**: https://supabase.com/docs
- **Realtime Guide**: https://supabase.com/docs/guides/realtime
