# Insider Game - Project Overview

## Purpose
Real-time online multiplayer social deduction game for 5-8 players. Browser-based implementation of the popular board game with Discord voice chat integration.

### Game Concept
- **Roles**: Master (1), Insider (1), Citizens (remaining)
- **Objective**: Citizens guess the topic within 5 minutes, then identify the Insider through voting
- **Phases**: Role Assignment → Topic Confirmation → Question (5min) → Debate → Vote 1 → Vote 2 → Results

## Current Status
**Phase**: Week 4-5 of MVP (80% complete)
**Target**: 100% MVP completion, then production deployment

### Recent Achievements (Week 1-4)
- ✅ Next.js 15 + TypeScript 5 infrastructure
- ✅ Supabase PostgreSQL + Realtime integration
- ✅ Database schema (9 tables, 19 RLS policies)
- ✅ XState 5 state machine (9 game phases)
- ✅ Zustand global state management
- ✅ Game logic (roles, topics, voting, passphrase hashing)
- ✅ 9 API routes (rooms, games)
- ✅ E2E testing infrastructure (Playwright)
- ✅ Accessibility compliance (WCAG 2.2 AA)
- ✅ Load testing setup (Artillery - 240 players)

### Active Work (Week 5)
- UI-API integration
- Realtime phase transitions
- Room management improvements
- Multiplayer E2E testing
- Bug fixes and optimizations

## Tech Stack

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS 4.1.9
- **UI**: shadcn/ui + Radix UI
- **State**: XState 5.23.0 (game flow) + Zustand 5.0.8 (UI state)
- **Icons**: Lucide React

### Backend
- **Database**: PostgreSQL 15.8 (Supabase)
- **Auth**: Supabase Anonymous Auth
- **Realtime**: Supabase Realtime (WebSocket)
- **API**: Next.js API Routes (Node.js runtime)
- **Security**: Argon2id (@node-rs/argon2), Row Level Security (RLS)

### Testing & Quality
- **E2E**: Playwright 1.56.1
- **Unit**: Vitest 3.2.4
- **Accessibility**: axe-core + eslint-plugin-jsx-a11y
- **Load**: Artillery 2.0.26
- **Performance**: Lighthouse CI

### Development
- **Linter**: ESLint 8
- **Formatter**: Prettier 3.6.2
- **Version Control**: Git
- **CI/CD**: GitHub Actions (planned)
- **Deployment**: Vercel (target platform)

## Key Architecture Patterns

### 1. Authoritative Server Pattern
- Server (Supabase PostgreSQL) is source of truth
- Clients subscribe to Realtime and display only
- All state changes validated server-side

### 2. Timer Synchronization (Epoch-based)
- Server sends `deadline_epoch` (Unix timestamp)
- Client calculates: `remaining = deadline_epoch - Math.floor(Date.now() / 1000)`
- Prevents clock drift issues

### 3. Role & Topic Secrecy (RLS)
- Role assignments: players see only their own role
- Topics: visible only to Master (always) and Insider (10-second popup)
- Database-level security via RLS policies

### 4. State Machine (XState)
- 9 explicit game phases: LOBBY → DEAL → TOPIC → QUESTION → DEBATE → VOTE1 → VOTE2 → VOTE2_RUNOFF → RESULT
- Type-safe transitions and guards
- Integrated with Supabase Realtime

## Development Workflow

### AI Collaboration (Mandatory)
**CRITICAL**: All work must consult Gemini + o3 before implementation
- **Gemini** (`mcp gemini-cli googleSearch`): Technical research, latest docs, patterns
- **o3** (`mcp o3-low o3-search`): Architecture decisions, deep reasoning
- **Claude Code**: Implementation, refactoring, task management
- **Pattern**: Ask both in parallel → Synthesize → Implement

### Typical Session
1. `/sc:load` - Load project context
2. Gemini + o3 consultation for task approach
3. Implementation with TodoWrite tracking
4. Testing (E2E, unit, accessibility)
5. `/sc:save` - Save session context

## Documentation
- [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) - Latest status
- [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) - Full roadmap
- [docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md](docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md) - Product specs
- [docs/20251019_インサイダー実装図一覧.md](docs/20251019_インサイダー実装図一覧.md) - Diagrams
- [docs/epic5-implementation-report.md](docs/epic5-implementation-report.md) - Quality assurance

## Contact & Resources
- **Primary Language**: Japanese (UI), English (code/docs)
- **Target Platform**: Mobile-first (iPhone, Android)
- **Browser Support**: Latest 2 versions (Chrome, Firefox, Safari)
