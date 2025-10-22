# Session Context - 2025-10-23

## Session Initialization Summary

**Command**: `/sc:load`
**Date**: 2025-10-23
**Project**: Insider Game (Real-time Multiplayer Social Deduction Game)

## Project Status Overview

### Current Phase
- **Week**: 4-5 of MVP Development (80% → 100%)
- **Target**: Production deployment readiness
- **Recent Work**: Realtime fixes, role assignment improvements, E2E testing

### Recent Commits (Last 10)
```
950243e - fix: resolve Realtime channel name conflict causing schema mismatch
8d35b5f - fix: update database types and fix Realtime schema mismatch
6c819d8 - feat: enable realtime phase transitions and room auto-deletion
efd49dd - feat: implement leaveRoom functionality with comprehensive tests
b84d330 - feat: enhance role assignment and lobby functionality
688172e - feat: add comprehensive E2E multiplayer lobby test with RLS/Realtime fixes
6d2e6ea - feat: add data-testid attributes for improved testing
74b9fc4 - chore: remove .mcp.json and update package dependencies
23f8823 - fix(rooms): resolve Argon2id hash comparison bug causing 500 error
25917b5 - docs: add critical deployment guide for service role key setup
```

### Tech Stack
- **Frontend**: Next.js 15.2.4, React 19, TypeScript 5, Tailwind CSS 4.1.9
- **Backend**: Supabase (PostgreSQL 15.8 + Realtime + Edge Functions)
- **State Management**: XState 5.23.0 (game flow) + Zustand 5.0.8 (UI state)
- **Security**: Argon2id, Row Level Security (RLS)
- **Testing**: Playwright 1.56.1 (E2E), Vitest 3.2.4 (unit), Artillery 2.0.26 (load)

## Key Architecture Patterns Identified

### 1. Authoritative Server Pattern
- PostgreSQL as source of truth
- Clients display via Realtime subscriptions
- Server-side validation for all state changes

### 2. Timer Synchronization (Epoch-based)
- `deadline_epoch` stored as Unix timestamp
- Client calculates: `remaining = deadline_epoch - Math.floor(Date.now() / 1000)`
- Prevents clock drift issues

### 3. Role & Topic Secrecy (RLS)
- Database-level security via Row Level Security
- Players see only their own role
- Topics visible only to Master/Insider

### 4. XState State Machine
- 9 explicit game phases
- Type-safe transitions and guards
- Realtime integration

### 5. AI Collaboration Workflow
- **Mandatory**: Gemini + o3 consultation for all implementations
- **Codex**: REQUIRED for all /sc: commands
- Pattern: Ask both in parallel → Synthesize → Implement

## Database Schema (9 Tables)
- `rooms` - Room information, passphrase hash, phase
- `players` - Player info, connection status
- `game_sessions` - Game state, deadline_epoch, answerer
- `roles` - Role assignments (RLS protected)
- `master_topics` - Topic master list (130 topics)
- `topics` - Session-specific topics (RLS protected)
- `used_topics` - Duplicate prevention
- `votes` - Voting data (RLS protected until RESULT phase)
- `results` - Game outcomes

## File Structure Summary

```
insider-game/
├── app/                    # Next.js 15 App Router
│   ├── lobby/             # Lobby pages
│   ├── game/              # Game pages (9 phases)
│   └── actions/           # Server Actions
├── components/ui/          # shadcn/ui components
├── lib/
│   ├── supabase/          # Clients & types
│   ├── game/              # Game logic (pure functions)
│   ├── machines/          # XState state machines
│   ├── stores/            # Zustand stores
│   ├── validations/       # Zod schemas
│   └── api/               # Type-safe API client
├── hooks/                  # Custom React hooks
├── supabase/
│   └── migrations/        # Database migrations
├── e2e/                   # Playwright E2E tests
├── load-tests/            # Artillery load tests
└── docs/                  # Documentation
```

## Critical Implementation Notes

### Completed (Week 1-4)
- ✅ Project infrastructure (Next.js 15, TypeScript, Tailwind)
- ✅ Supabase setup (9 tables, 19 RLS policies)
- ✅ XState state machine (9 phases)
- ✅ Game logic (roles, topics, voting, passphrase hashing)
- ✅ API routes (createRoom, joinRoom, startGame, etc.)
- ✅ E2E testing infrastructure (Playwright multi-context)
- ✅ Accessibility compliance (WCAG 2.2 AA)
- ✅ Load testing setup (240 concurrent players)

### In Progress (Week 5)
- UI-API integration
- Realtime phase transitions
- Room management improvements
- Multiplayer E2E testing
- Production deployment preparation

### Known Issues (from recent commits)
1. ✅ Fixed: Realtime channel name conflict
2. ✅ Fixed: Database schema mismatch
3. ✅ Fixed: Argon2id hash comparison bug (500 error)
4. Active: Service role key setup for deployment

## Development Workflow

### Standard Session Pattern
1. `/sc:load` - Load project context (with Codex)
2. Gemini + o3 consultation for approach
3. TodoWrite for task tracking
4. Implementation with type safety
5. Testing (E2E, unit, accessibility)
6. `/sc:save` - Save session context

### Pre-Commit Checklist
```bash
npm run lint              # ESLint + jsx-a11y
npx tsc --noEmit         # TypeScript validation
npm run build            # Production build
npm run test:e2e         # E2E tests (if UI changes)
git status               # Verify changes
```

## Memory Files Created

1. **project_overview.md** - Purpose, status, tech stack
2. **suggested_commands.md** - Development, testing, build commands
3. **code_conventions.md** - TypeScript, naming, formatting rules
4. **architecture.md** - Project structure, design patterns
5. **task_completion_checklist.md** - Pre-completion verification steps
6. **ai_collaboration_workflow.md** - Gemini/o3/Codex collaboration pattern

## Next Steps

Based on current status (80% MVP):
1. Complete UI-API integration
2. Verify Realtime phase transitions
3. Production environment testing
4. Deployment to Vercel + Supabase
5. User acceptance testing

## Key Contacts & Resources

- **Documentation**: `docs/CURRENT_STATUS.md`, `docs/IMPLEMENTATION_ROADMAP.md`
- **Specs**: `docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md`
- **Diagrams**: `docs/20251019_インサイダー実装図一覧.md`
- **Git Branch**: `main` (check before work)
- **Supabase**: Local instance at http://127.0.0.1:54323

## Session Ready

✅ Project context loaded
✅ Serena MCP activated
✅ Memory files created
✅ Architecture patterns identified
✅ Development workflow established

**Status**: Ready for development work
**Recommended**: Consult Gemini + o3 before starting new features
