# Architecture - Insider Game

## Project Structure

```
insider-game/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Root layout (providers, fonts)
│   ├── page.tsx                 # Homepage (main lobby)
│   ├── globals.css              # Global styles
│   ├── providers.tsx            # React providers wrapper
│   ├── lobby/                   # Lobby pages
│   │   └── [roomId]/
│   │       └── page.tsx         # Waiting room
│   ├── game/                    # Game pages
│   │   └── [roomId]/
│   │       └── page.tsx         # Game screen (9 phases)
│   └── actions/                 # Server Actions
│       ├── createRoom.ts
│       ├── joinRoom.ts
│       ├── startGame.ts
│       └── leaveRoom.ts
│
├── components/                  # React components
│   └── ui/                      # shadcn/ui components
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       └── ...
│
├── lib/                         # Core business logic
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── database.types.ts   # Generated TypeScript types
│   ├── game/                    # Game logic (pure functions)
│   │   ├── roles.ts            # Role assignment (Fisher-Yates)
│   │   ├── topics.ts           # Topic selection
│   │   ├── voting.ts           # Vote counting & tie-breaking
│   │   └── passphrase.ts       # Argon2id hashing
│   ├── machines/
│   │   └── gameMachine.ts      # XState state machine (9 phases)
│   ├── stores/
│   │   └── uiStore.ts          # Zustand UI state
│   ├── validations/
│   │   └── database.schema.ts  # Zod validation schemas
│   ├── api/
│   │   └── game-actions.ts     # Type-safe API client
│   ├── logger.ts                # Structured logging
│   ├── utils.ts                 # Utility functions (cn, etc.)
│   └── env.ts                   # Environment variable validation
│
├── hooks/                       # Custom React hooks
│
├── supabase/
│   ├── config.toml             # Supabase local config
│   └── migrations/
│       ├── 20250101000000_initial_schema.sql
│       └── 20250101000001_seed_topics.sql
│
├── e2e/                         # Playwright E2E tests
│   ├── fixtures/
│   │   ├── multiContext.ts     # 5-player test fixture
│   │   └── helpers.ts          # Test utilities
│   └── tests/
│       ├── full-game-flow.spec.ts
│       ├── timer-sync.spec.ts
│       ├── vote-race-conditions.spec.ts
│       └── accessibility.spec.ts
│
├── load-tests/                  # Artillery load tests
│   ├── game-load-test.yml      # 240-player scenario
│   └── processor.js            # Custom functions
│
├── docs/                        # Documentation
│   ├── CURRENT_STATUS.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   └── epic5-implementation-report.md
│
├── playwright.config.ts
├── vitest.config.ts
├── lighthouserc.json
├── next.config.mjs
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── package.json
```

## Data Flow Architecture

### 1. Client → Server → Database
```
User Action (UI)
  ↓
React Component (app/*)
  ↓
Server Action (app/actions/*)
  ↓
Supabase Client (lib/supabase/server.ts)
  ↓
PostgreSQL (Supabase)
  ↓
Row Level Security (RLS) Validation
  ↓
Database Write
  ↓
Realtime Broadcast → All Subscribed Clients
```

### 2. Realtime Updates
```
Database Change (INSERT/UPDATE)
  ↓
Supabase Realtime Trigger
  ↓
WebSocket Broadcast (channel: room:{roomId})
  ↓
Client Supabase Client (lib/supabase/client.ts)
  ↓
XState Event Dispatch (lib/machines/gameMachine.ts)
  ↓
UI Re-render (React)
```

## Key Design Patterns

### 1. XState State Machine
**Purpose**: Manage complex game flow with 9 distinct phases

```typescript
// lib/machines/gameMachine.ts
const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
}).createMachine({
  id: 'game',
  initial: 'LOBBY',
  states: {
    LOBBY: {
      on: { START_GAME: 'DEAL' },
    },
    DEAL: {
      on: { ALL_CONFIRMED: 'TOPIC' },
    },
    TOPIC: {
      on: { ALL_CONFIRMED: 'QUESTION' },
    },
    QUESTION: {
      on: {
        CORRECT_ANSWER: 'DEBATE',
        TIMEOUT: 'RESULT',
      },
    },
    // ... more states
  },
});
```

**Benefits**:
- Explicit state transitions (no invalid states)
- Type-safe events and context
- Visualizable state chart
- Predictable behavior

### 2. Row Level Security (RLS)
**Purpose**: Database-level security for role/topic secrecy

```sql
-- roles table: Players can only see their own role
CREATE POLICY "Players can view own role"
  ON roles FOR SELECT
  USING (
    player_id = auth.uid()
    OR (
      SELECT phase FROM game_sessions
      WHERE id = session_id
    ) = 'RESULT'
  );

-- topics table: Only Master and Insider can view
CREATE POLICY "Master and Insider can view topics"
  ON topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE session_id = topics.session_id
        AND player_id = auth.uid()
        AND role IN ('MASTER', 'INSIDER')
    )
  );
```

### 3. Argon2id Password Hashing
**Purpose**: GPU-resistant passphrase hashing

```typescript
// lib/game/passphrase.ts
import * as argon2 from '@node-rs/argon2';

export async function hashPassphrase(passphrase: string): Promise<string> {
  // OWASP recommended settings
  return argon2.hash(passphrase, {
    memoryCost: 19456,        // 19 MiB
    timeCost: 2,              // Iterations
    outputLen: 32,            // 32 bytes
    parallelism: 1,           // Single-threaded
  });
}

export async function verifyPassphrase(
  hash: string,
  passphrase: string
): Promise<boolean> {
  return argon2.verify(hash, passphrase);
}
```

### 4. Timer Synchronization (Epoch-based)
**Purpose**: Prevent client clock drift

```typescript
// Server: Store deadline as Unix epoch
const deadlineEpoch = Math.floor(Date.now() / 1000) + 300; // +5 minutes
await db.from('game_sessions').update({
  deadline_epoch: deadlineEpoch,
});

// Client: Calculate remaining time
function useCountdown(deadlineEpoch: number | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadlineEpoch) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const newRemaining = Math.max(0, deadlineEpoch - now);
      setRemaining(newRemaining);

      if (newRemaining === 0) {
        clearInterval(interval);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [deadlineEpoch]);

  return remaining;
}
```

### 5. Zustand Global State
**Purpose**: UI state (modals, toasts, sidebar)

```typescript
// lib/stores/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  // Modal state
  createRoomOpen: boolean;
  joinRoomOpen: boolean;
  setCreateRoomOpen: (open: boolean) => void;
  setJoinRoomOpen: (open: boolean) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error') => void;

  // Theme (persisted to localStorage)
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      createRoomOpen: false,
      joinRoomOpen: false,
      toasts: [],
      theme: 'light',

      setCreateRoomOpen: (open) => set({ createRoomOpen: open }),
      addToast: (message, type) =>
        set((state) => ({
          toasts: [...state.toasts, { id: Date.now(), message, type }],
        })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }), // Only persist theme
    }
  )
);
```

## Database Schema (Simplified)

```sql
-- Core tables
rooms (
  id UUID PRIMARY KEY,
  passphrase_hash TEXT,
  host_id UUID REFERENCES players(id),
  phase TEXT,
  is_suspended BOOLEAN
)

players (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  nickname TEXT,
  is_host BOOLEAN,
  is_connected BOOLEAN
)

game_sessions (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  difficulty TEXT,
  deadline_epoch BIGINT,
  answerer_id UUID REFERENCES players(id)
)

roles (
  session_id UUID REFERENCES game_sessions(id),
  player_id UUID REFERENCES players(id),
  role TEXT,  -- 'MASTER' | 'INSIDER' | 'CITIZEN'
  PRIMARY KEY (session_id, player_id)
)

topics (
  session_id UUID REFERENCES game_sessions(id),
  topic_text TEXT,
  difficulty TEXT
)

votes (
  session_id UUID REFERENCES game_sessions(id),
  player_id UUID REFERENCES players(id),
  vote_type TEXT,  -- 'VOTE1' | 'VOTE2' | 'RUNOFF'
  vote_value TEXT,
  round INT
)

results (
  session_id UUID REFERENCES game_sessions(id),
  outcome TEXT,  -- 'CITIZENS_WIN' | 'INSIDER_WIN' | 'ALL_LOSE'
  revealed_player_id UUID
)
```

## API Routes

```typescript
// app/actions/createRoom.ts
export async function createRoom(formData: FormData) {
  'use server';
  // 1. Validate input
  // 2. Hash passphrase
  // 3. Create room in DB
  // 4. Return room ID
}

// app/actions/joinRoom.ts
export async function joinRoom(formData: FormData) {
  'use server';
  // 1. Validate passphrase
  // 2. Check room exists
  // 3. Add player to room
  // 4. Return player ID
}

// app/actions/startGame.ts
export async function startGame(roomId: string) {
  'use server';
  // 1. Verify host
  // 2. Check player count (4-8)
  // 3. Create game session
  // 4. Assign roles
  // 5. Select topic
  // 6. Broadcast phase change
}
```

## Testing Architecture

### E2E Tests (Playwright)
- **Multi-context fixture**: 5 isolated browser contexts
- **Real Supabase**: Tests run against local Supabase instance
- **Full game flow**: From lobby to result phase
- **Timer tests**: Fake timers for deterministic time testing
- **Race conditions**: Concurrent vote submission tests

### Unit Tests (Vitest)
- **Pure functions**: Game logic (roles, topics, voting)
- **Fast**: No database or network I/O
- **Deterministic**: Mocked randomness (Fisher-Yates seed)

### Load Tests (Artillery)
- **Scenario**: 30 rooms × 8 players = 240 concurrent users
- **Duration**: 17 minutes (ramp-up + sustained + ramp-down)
- **Metrics**: Response time, WebSocket stability, error rate

## Deployment Architecture (Planned)

```
Browser (Client)
  ↓ HTTPS
Vercel Edge Network
  ↓
Next.js App (Vercel)
  ↓ API Calls
Supabase (Tokyo region)
  ├── PostgreSQL 15.8
  ├── Realtime (WebSocket)
  └── Edge Functions
```

**Key Considerations**:
- Edge deployment for low latency
- Tokyo region for Japanese users
- WebSocket connection pooling
- Horizontal scaling (Vercel auto-scales)
