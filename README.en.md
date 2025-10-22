# インサイダーゲーム - Online Multiplayer

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Private-red)]()

Real-time online multiplayer social deduction game for 5-8 players. This browser-based application brings the popular Insider Game to online play with Discord voice chat integration.

🎮 **Live Demo**: [https://insider-game-self.vercel.app](https://insider-game-self.vercel.app)

---

## 📋 Table of Contents

- [Game Concept](#-game-concept)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Database Schema](#-database-schema)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Project Status](#-project-status)
- [Documentation](#-documentation)

---

## 🎯 Game Concept

**Insider Game** is a social deduction game where players must identify the hidden "Insider" among them.

### Roles
- **Master (マスター)**: 1 player - Knows the topic, guides questions
- **Insider (インサイダー)**: 1 player - Knows the topic, hides their identity
- **Citizens (市民)**: Remaining players - Ask questions to guess the topic

### Game Flow
1. **Role Assignment** - Players receive secret roles
2. **Topic Confirmation** - Master and Insider see the topic (5 seconds)
3. **Question Phase** - Citizens ask yes/no questions (5 minutes)
4. **Debate Phase** - Identify the Insider through discussion
5. **Voting** - Vote to find the Insider (up to 2 rounds)
6. **Results** - Citizens win if they find Insider, otherwise Insider wins

---

## ✨ Features

### Implemented (Phase 1)
- ✅ **Room Management**
  - Create/Join rooms with passphrase (3-10 characters, Unicode supported)
  - Argon2id encryption + HMAC-SHA256 lookup hash for security
  - Automatic nickname deduplication (appends "-2" suffix)
  - Maximum 12 players per room

- ✅ **Real-time Architecture**
  - Supabase Realtime subscriptions
  - PostgreSQL with Row Level Security (RLS)
  - Server-authoritative game state

- ✅ **Security**
  - Content Security Policy (CSP)
  - HSTS (HTTP Strict Transport Security)
  - Service Role Key for trusted operations
  - Environment variable validation with Zod

- ✅ **Developer Experience**
  - TypeScript strict mode
  - ESLint + Prettier
  - E2E tests with Playwright
  - Load testing with Artillery (30 concurrent users)
  - Accessibility testing with Axe
  - Performance monitoring with Lighthouse

### Planned (Phase 2+)
- ⏳ Game state machine (XState v5)
- ⏳ Role assignment logic
- ⏳ Timer synchronization (epoch-based)
- ⏳ Voting system with tie-breaking
- ⏳ Suspend/Resume functionality
- ⏳ Reconnection handling

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5.0 (strict mode)
- **UI Components**: Radix UI + Tailwind CSS 4.1.9
- **State Management**: XState v5 + Zustand
- **Real-time**: Supabase Realtime client

### Backend
- **Platform**: Supabase (PostgreSQL 15 + Realtime)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Auth**: Anonymous auth + service role for Server Actions
- **Security**: Argon2id (@node-rs/argon2), HMAC-SHA256

### Infrastructure
- **Hosting**: Vercel (Edge Runtime)
- **Database**: Supabase (managed PostgreSQL)
- **CI/CD**: GitHub Actions
- **Testing**: Playwright (E2E), Artillery (load), Axe (a11y), Lighthouse (perf)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20+ (LTS recommended)
- **Package Manager**: npm, pnpm, or yarn
- **Docker Desktop**: Required for local Supabase
- **Supabase CLI**: `brew install supabase/tap/supabase` (macOS)

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/insider-game.git
cd insider-game
npm install
```

### 2. Start Docker Desktop

```bash
open -a Docker
# Wait for Docker to fully start
```

### 3. Start Supabase Local

```bash
supabase start
# This will output:
# - API URL: http://localhost:54321
# - anon key: eyJ...
# - service_role key: eyJ...
```

**Important**: Copy the `anon key` and `service_role key` from the output.

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add the keys from `supabase start` output:

```env
# Supabase Configuration (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Security (generate with `openssl rand -base64 32`)
PASSPHRASE_HMAC_SECRET=your-random-32-byte-secret-here
```

### 5. Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Test Locally

1. Open two browser tabs: `http://localhost:3000`
2. Tab 1: Click **"PLAY"** → Enter passphrase `test123` → Create room
3. Tab 2: Click **"PLAY"** → Enter same passphrase `test123` → Join room
4. Verify both players appear in the lobby

---

## 🗄 Database Schema

### Core Tables

```sql
-- Rooms: Game room management
rooms
  - id (UUID, PK)
  - passphrase_hash (TEXT) -- Argon2id hash for verification
  - passphrase_lookup_hash (TEXT, UNIQUE) -- HMAC-SHA256 for fast queries
  - host_id (UUID, FK → players)
  - phase (TEXT) -- LOBBY/DEAL/TOPIC/QUESTION/DEBATE/VOTE1/VOTE2/RESULT
  - is_suspended (BOOLEAN)
  - suspended_state (JSONB) -- Snapshot for resume

-- Players: Player management
players
  - id (UUID, PK)
  - room_id (UUID, FK → rooms)
  - nickname (TEXT)
  - is_host (BOOLEAN)
  - is_connected (BOOLEAN) -- Realtime connection status
  - confirmed (BOOLEAN) -- Phase confirmation flag

-- Game Sessions: Active game state
game_sessions
  - id (UUID, PK)
  - room_id (UUID, FK → rooms)
  - difficulty (TEXT) -- Easy/Normal/Hard
  - start_time (TIMESTAMP)
  - deadline_epoch (BIGINT) -- Unix timestamp for timer sync
  - answerer_id (UUID) -- Player who guessed correctly
  - prev_master_id (UUID) -- For Master rotation logic

-- Roles: Secret role assignments (RLS protected)
roles
  - session_id (UUID, FK → game_sessions)
  - player_id (UUID, FK → players)
  - role (TEXT) -- MASTER/INSIDER/CITIZEN
  - RLS: SELECT only if (player_id = auth.uid() OR session.phase = 'RESULT')

-- Topics: Game topics (RLS protected)
topics
  - session_id (UUID, FK → game_sessions)
  - topic_text (TEXT)
  - difficulty (TEXT)
  - RLS: SELECT only if (role = 'MASTER' OR role = 'INSIDER')

-- Votes: Voting records
votes
  - session_id (UUID, FK → game_sessions)
  - player_id (UUID, FK → players)
  - vote_type (TEXT) -- VOTE1/VOTE2/RUNOFF
  - vote_value (TEXT) -- yes/no or player_id
  - round (INT) -- Runoff round number
```

### Migrations

```bash
supabase/migrations/
  ├── 20250101000000_initial_schema.sql      # Core tables + RLS
  ├── 20250101000001_seed_topics.sql         # 100+ game topics
  ├── 20251021154449_sync_players_schema.sql # Players table sync
  ├── 20251021154733_add_master_topics.sql   # Master topics table
  └── 20251022000000_add_passphrase_lookup_hash.sql # Fast passphrase lookup
```

Apply migrations:
```bash
supabase db reset  # Resets local DB and applies all migrations
```

---

## 💻 Development

### File Structure

```
insider-game/
├── app/                    # Next.js 15 App Router
│   ├── actions/           # Server Actions (room management)
│   ├── game/              # Game page (future)
│   ├── lobby/             # Lobby page (future)
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/                # Shadcn UI components (60+ files)
│   ├── create-room-modal.tsx
│   ├── join-room-modal.tsx
│   └── player-chip.tsx
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
│   ├── game/              # Game logic (passphrase, etc.)
│   ├── supabase/          # Supabase clients
│   └── env.ts             # Environment validation
├── supabase/              # Database migrations
├── e2e/                   # Playwright E2E tests
├── load-tests/            # Artillery load tests
└── docs/                  # Japanese specifications
```

### Common Commands

```bash
# Development
npm run dev                # Start dev server (http://localhost:3000)
npm run build              # Production build
npm run start              # Start production server

# Code Quality
npm run lint               # ESLint
npm run format             # Prettier

# Testing
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # Playwright UI mode (interactive)
npm run test:e2e:headed    # Playwright headed mode (see browser)
npm run test:load          # Artillery load test (30 concurrent users)
npm run lhci               # Lighthouse CI (performance audit)

# Database
supabase start             # Start local Supabase
supabase stop              # Stop local Supabase
supabase db reset          # Reset DB and apply migrations
supabase db diff           # Generate migration from changes
supabase gen types typescript --local > lib/supabase/database.types.ts
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (secret) |
| `PASSPHRASE_HMAC_SECRET` | ✅ | 32-byte secret for HMAC-SHA256 |

**Security Notes**:
- Never commit `.env.local` to Git
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies - keep secret!
- Generate `PASSPHRASE_HMAC_SECRET` with `openssl rand -base64 32`

---

## 🧪 Testing

### E2E Tests (Playwright)

```bash
# Run all tests
npm run test:e2e

# Interactive UI mode (recommended)
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Single test file
npx playwright test e2e/room-creation.spec.ts
```

**Test Coverage**:
- ✅ Room creation with valid/invalid passphrases
- ✅ Room joining with correct/incorrect passphrases
- ✅ Nickname deduplication (auto-append "-2")
- ✅ Maximum player limit (12 players)
- ✅ Accessibility (Axe violations)

### Load Tests (Artillery)

```bash
# Full load test (30 concurrent users, 5 min duration)
npm run test:load

# Quick test (10 users, 50 requests)
npm run test:load:quick
```

**Load Test Scenarios**:
- Room creation rate: 10 req/sec
- Room join rate: 20 req/sec
- Expected success rate: >95%
- p95 latency: <500ms

### Performance Tests (Lighthouse)

```bash
# Run Lighthouse CI
npm run lhci

# Collect only (skip assertions)
npm run lhci:collect
```

**Performance Targets**:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

---

## 🚀 Deployment

### Production (Vercel)

#### 1. Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link
```

#### 2. Configure Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add the following variables for **Production**, **Preview**, and **Development**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qqvxtmjyrjbzemxnfdwy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PASSPHRASE_HMAC_SECRET=<your-32-byte-secret>
```

**🚨 CRITICAL**: The `SUPABASE_SERVICE_ROLE_KEY` is **required** for room creation to work. Without it, you'll get RLS infinite recursion errors. See [DEPLOYMENT_REQUIRED.md](DEPLOYMENT_REQUIRED.md) for details.

#### 3. Deploy

```bash
# Production deployment
vercel --prod

# Or push to GitHub (auto-deploy)
git push origin main
```

#### 4. Verify Deployment

1. Open: https://insider-game-self.vercel.app
2. Click **"PLAY"**
3. Create room with passphrase `productiontest`
4. **Expected**: Navigate to `/lobby?roomId=<UUID>&...`
5. **Check**: URL contains valid UUID (36 characters with dashes)

**Failure Signs**:
- ❌ Error: "invalid input syntax for type uuid"
- ❌ Error: "infinite recursion detected"
- ❌ Error: "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY"

### Supabase Production Setup

#### 1. Create Production Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - Name: `insider-game-production`
   - Database Password: (generate secure password)
   - Region: Tokyo (ap-northeast-1)

#### 2. Apply Migrations

```bash
# Link to production project
supabase link --project-ref qqvxtmjyrjbzemxnfdwy

# Push migrations
supabase db push
```

#### 3. Enable Realtime

1. Dashboard → Database → Replication
2. Enable Realtime for tables:
   - ✅ `rooms`
   - ✅ `players`
   - ✅ `game_sessions`

#### 4. Verify RLS Policies

```bash
# Test RLS policies
supabase db remote exec "SELECT * FROM rooms LIMIT 1;"
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Realtime not firing locally"
**Solution**: Check if Realtime is enabled for the table
```bash
# Restart Supabase
supabase stop
supabase start

# Verify Realtime settings in Dashboard
```

#### "Types mismatch after migration"
**Solution**: Regenerate TypeScript types
```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

#### "Port conflicts (54321/54322)"
**Solution**: Stop other Supabase instances
```bash
supabase stop
# Kill any stuck processes
lsof -ti:54321,54322 | xargs kill
```

#### "Room creation fails with RLS error"
**Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
```bash
# Check .env.local
grep SUPABASE_SERVICE_ROLE_KEY .env.local

# Verify it matches `supabase start` output
supabase status
```

#### "Playwright tests failing"
**Solution**: Install browsers
```bash
npx playwright install
```

### Debug Mode

```bash
# Enable debug logs
DEBUG=supabase:* npm run dev

# Supabase logs
supabase logs
```

---

## 📊 Project Status

### Current Phase: **Phase 1 - Foundation** ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Room Management | ✅ Complete | Create/Join with passphrase |
| Database Schema | ✅ Complete | 5 migrations applied |
| Real-time Setup | ✅ Complete | Supabase Realtime configured |
| Security | ✅ Complete | Argon2id + HMAC-SHA256 + RLS |
| UI Components | ✅ Complete | 60+ Shadcn UI components |
| Testing | ✅ Complete | E2E, Load, A11y, Perf |
| CI/CD | ✅ Complete | GitHub Actions + Vercel |

### Next Phase: **Phase 2 - Game Logic** 🚧

- ⏳ XState state machine (role assignment → voting)
- ⏳ Timer synchronization (epoch-based)
- ⏳ Role assignment logic (exclude prev Master)
- ⏳ Topic selection and display
- ⏳ Question phase UI
- ⏳ Voting system with tie-breaking
- ⏳ Results calculation

### Future Phases

- **Phase 3**: Suspend/Resume, Reconnection
- **Phase 4**: Advanced features (memo, history, rotation)

See [docs/Phase_1_implementation_plan_v2.0.md](docs/Phase_1_implementation_plan_v2.0.md) for detailed roadmap.

---

## 📚 Documentation

### Primary Documentation (Japanese)

- [プロジェクト概要](docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md) - Product overview
- [実装図一覧](docs/20251019_インサイダー実装図一覧.md) - Complete flowcharts and diagrams
- [Phase 1 実装計画](docs/Phase_1_implementation_plan_v2.0.md) - Phase 1 implementation plan
- [セットアップ手順](docs/SETUP.md) - Detailed setup instructions
- [デプロイメント必須事項](DEPLOYMENT_REQUIRED.md) - Critical deployment guide

### Technical References

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [XState v5 Docs](https://stately.ai/docs/xstate)
- [Playwright Docs](https://playwright.dev/)

---

## 📄 License

**Private Project** - All rights reserved.

---

## 🙏 Acknowledgements

- Original board game: [Insider Game by Oink Games](https://www.oinkgames.com/ja/games/analog/insider/)
- UI Components: [Shadcn UI](https://ui.shadcn.com/)
- Real-time Infrastructure: [Supabase](https://supabase.com/)
- Framework: [Next.js by Vercel](https://nextjs.org/)

---

## 📞 Contact

For questions or issues, please create an issue in the GitHub repository.

**Generated**: 2025-10-22
**Version**: 0.1.0 (Phase 1 Complete)
