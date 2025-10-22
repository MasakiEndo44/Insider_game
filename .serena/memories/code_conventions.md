# Code Conventions - Insider Game

## TypeScript Configuration

### Strict Mode Enabled
```json
{
  "strict": true,
  "target": "ES2017",
  "module": "esnext",
  "moduleResolution": "bundler"
}
```

**Requirements**:
- All variables must have explicit types (inferred or declared)
- No implicit `any` types
- Strict null checks enabled
- No unused parameters/variables

### Path Aliases
```typescript
import { db } from '@/lib/supabase/client';
import { GamePhase } from '@/lib/machines/gameMachine';
```
- Use `@/*` for absolute imports from project root
- Prefer absolute imports for cross-directory references
- Use relative imports (`./`, `../`) for same-directory files

## Naming Conventions

### Files & Directories
- **Components**: PascalCase `CreateRoomDialog.tsx`
- **Utilities**: camelCase `passphrase.ts`
- **Directories**: kebab-case `game-logic/`, `api-routes/`
- **Test files**: `*.test.ts`, `*.spec.ts`

### Variables & Functions
```typescript
// camelCase for variables and functions
const playerCount = 5;
function assignRoles(players: Player[]) {}

// PascalCase for types, interfaces, components
interface GameSession {}
type GamePhase = 'LOBBY' | 'DEAL' | 'QUESTION';
function CreateRoomDialog() {}

// SCREAMING_SNAKE_CASE for constants
const MAX_PLAYERS = 8;
const QUESTION_DURATION_SEC = 300;
```

### Boolean Variables
```typescript
// Prefix with is/has/should
const isConnected = true;
const hasVoted = false;
const shouldShowTopic = role === 'MASTER' || role === 'INSIDER';
```

## Code Style (Prettier)

### Formatting Rules
```json
{
  "semi": true,                    // Use semicolons
  "trailingComma": "es5",         // Trailing commas in objects/arrays
  "singleQuote": true,            // Single quotes for strings
  "printWidth": 100,              // Max line length
  "tabWidth": 2                   // 2-space indentation
}
```

### Examples
```typescript
// ✅ Good
const config = {
  maxPlayers: 8,
  questionDuration: 300,
};

const players = ['Alice', 'Bob', 'Charlie'];

// ❌ Bad
const config = {
  maxPlayers: 8,
  questionDuration: 300  // Missing trailing comma
}

const players = ["Alice", "Bob", "Charlie"]  // Double quotes, no semicolon
```

## React/Next.js Conventions

### Component Structure
```typescript
// 1. Imports (grouped: React, libraries, local)
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// 2. Type definitions
interface Props {
  roomId: string;
  isHost: boolean;
}

// 3. Component (function declaration for top-level, arrow for inline)
export function RoomLobby({ roomId, isHost }: Props) {
  // 4. Hooks (useState, useEffect, custom hooks)
  const [players, setPlayers] = useState<Player[]>([]);
  const router = useRouter();

  // 5. Event handlers
  function handleStartGame() {
    // ...
  }

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### File Organization
```
app/
  layout.tsx              # Root layout
  page.tsx                # Homepage
  lobby/
    page.tsx              # Lobby page
    CreateRoomDialog.tsx  # Dialog component (co-located)
  game/
    [roomId]/
      page.tsx            # Game page
      PhaseDisplay.tsx    # Phase-specific components

components/
  ui/                     # shadcn/ui components
    button.tsx
    dialog.tsx

lib/
  supabase/               # Supabase clients & types
  game/                   # Game logic (pure functions)
  machines/               # XState state machines
  stores/                 # Zustand stores
```

## TypeScript Patterns

### Prefer Explicit Return Types
```typescript
// ✅ Good
function calculateVotes(votes: Vote[]): VoteResult {
  return { winner: 'CITIZENS', votes: 5 };
}

// ⚠️ Acceptable for simple functions
const sum = (a: number, b: number) => a + b;
```

### Use Zod for Runtime Validation
```typescript
import { z } from 'zod';

const createRoomSchema = z.object({
  passphrase: z.string().min(3).max(10),
  hostNickname: z.string().min(1).max(20),
});

type CreateRoomInput = z.infer<typeof createRoomSchema>;
```

### Type-Safe Database Access
```typescript
import { Database } from '@/lib/supabase/database.types';

type Room = Database['public']['Tables']['rooms']['Row'];
type RoomInsert = Database['public']['Tables']['rooms']['Insert'];
```

## ESLint Rules

### Accessibility (jsx-a11y)
```typescript
// ✅ Good - Always provide alt text
<img src="/logo.png" alt="Insider Game Logo" />

// ✅ Good - Label associations
<label htmlFor="nickname">
  Nickname
  <input id="nickname" type="text" />
</label>

// ✅ Good - Keyboard handlers with click handlers
<div onClick={handleClick} onKeyDown={handleKeyDown} role="button" tabIndex={0}>
  Click me
</div>
```

### React Best Practices
- No unused variables or imports
- Prefer functional components over class components
- Use React hooks correctly (no conditional hooks)
- Exhaustive dependency arrays in `useEffect`

## Testing Conventions

### Test File Naming
```
lib/game/passphrase.ts
lib/game/passphrase.test.ts      # Unit test (co-located)

e2e/tests/full-game-flow.spec.ts  # E2E test (e2e/ directory)
```

### Test Structure (Vitest)
```typescript
import { describe, it, expect } from 'vitest';

describe('assignRoles', () => {
  it('should assign 1 Master, 1 Insider, N Citizens', () => {
    const players = createMockPlayers(5);
    const roles = assignRoles(players);

    expect(roles.filter(r => r.role === 'MASTER')).toHaveLength(1);
    expect(roles.filter(r => r.role === 'INSIDER')).toHaveLength(1);
    expect(roles.filter(r => r.role === 'CITIZEN')).toHaveLength(3);
  });
});
```

### E2E Test Structure (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Room Creation', () => {
  test('should create room and navigate to lobby', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("ルームを作成")');
    await page.fill('input[name="passphrase"]', 'test123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/lobby\/[a-z0-9-]+/);
  });
});
```

## Comments & Documentation

### When to Comment
```typescript
// ✅ Good - Explain WHY, not WHAT
// Use Argon2id for GPU-resistant hashing (OWASP recommendation)
const hash = await argon2.hash(passphrase);

// ❌ Bad - Obvious comment
// Hash the passphrase
const hash = await argon2.hash(passphrase);
```

### Function Documentation
```typescript
/**
 * Assigns random roles to players with fairness guarantees.
 *
 * @param players - List of players in the room
 * @param prevMasterId - Previous Master's ID (excluded from Master role)
 * @returns Array of role assignments (1 Master, 1 Insider, N Citizens)
 *
 * @throws Error if players < 4 or > 8
 */
export function assignRoles(
  players: Player[],
  prevMasterId?: string
): RoleAssignment[] {
  // ...
}
```

## Anti-Patterns to Avoid

### ❌ Don't Use `any`
```typescript
// ❌ Bad
const data: any = await fetchData();

// ✅ Good
const data: GameSession = await fetchData();
```

### ❌ Don't Mutate Props
```typescript
// ❌ Bad
function updatePlayer(player: Player) {
  player.nickname = 'new name';  // Mutation!
}

// ✅ Good
function updatePlayer(player: Player): Player {
  return { ...player, nickname: 'new name' };
}
```

### ❌ Don't Use `console.log` in Production
```typescript
// ❌ Bad
console.log('User joined:', userId);

// ✅ Good - Use logger
import { logger } from '@/lib/logger';
logger.info('User joined', { userId });
```

### ❌ Don't Ignore Errors
```typescript
// ❌ Bad
try {
  await createRoom();
} catch (e) {
  // Silent failure
}

// ✅ Good
try {
  await createRoom();
} catch (error) {
  logger.error('Failed to create room', { error });
  throw new Error('Room creation failed');
}
```

## Summary Checklist

Before committing code:
- [ ] TypeScript strict mode passes (no errors)
- [ ] ESLint passes (no errors, minimal warnings)
- [ ] Prettier formatted
- [ ] Accessibility rules followed (WCAG 2.2 AA)
- [ ] Tests written for new logic
- [ ] No `console.log` or `any` types
- [ ] Proper error handling
