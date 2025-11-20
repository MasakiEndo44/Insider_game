# Production E2E Test Report - Insider Game

**Test Date**: 2025-10-24
**Test Environment**: Production (https://insider-game-self.vercel.app/)
**Test Framework**: Playwright MCP
**Test Objective**: 3-player game flow from room creation to game completion

---

## 🔴 CRITICAL: Test Execution Blocked by Production Error

### Test Status: **FAILED - Cannot Proceed**

The test was **unable to progress beyond room creation** due to a **server error (HTTP 500)** in the production environment.

---

## Test Execution Summary

### ✅ Completed Steps
1. **Initial Navigation**: Successfully loaded homepage
2. **UI Interaction**: Opened "Create Room" modal
3. **Form Input**: Entered passphrase (`test123`) and player name (`プレイヤー1`)
4. **Error Detection**: Identified critical server error when attempting room creation

### ❌ Blocked Steps
- Room creation and passphrase capture
- Multi-player joining (Player 2, Player 3)
- Game start and role assignment
- Question/Debate phases
- Voting phases
- Results verification

---

## Error Analysis

### Error Details

**Error Type**: HTTP 500 Internal Server Error
**Error Source**: Next.js Server Action (POST request to root URL)
**User-Facing Message**:
```
An error occurred in the Server Components render.
The specific message is omitted in production builds to avoid leaking sensitive details.
A digest property is included on this error instance which may provide additional details about the nature of the error.
```

### Network Diagnostics

**Console Errors**:
```
[ERROR] Failed to load resource: the server responded with a status of 500 ()
@ https://insider-game-self.vercel.app/:0

[ERROR] [CreateRoomModal] Error: Error: An error occurred in the Server Components render...
@ https://insider-game-self.vercel.app/_next/static/chunks/684-1d64f951cd692b0f.js:0
```

**HTTP Request Details**:
- **Method**: POST
- **URL**: https://insider-game-self.vercel.app/
- **Status**: 500
- **Note**: All static assets (JS, CSS, fonts, images) loaded successfully (200)

### Screenshot Evidence

![Error Screenshot](.playwright-mcp/error-room-creation.png)

---

## Root Cause Analysis

Based on consultation with Gemini and o3-low, the most probable causes are:

### 1. Environment Variables (Most Likely) 🎯
- Missing or incorrect `SUPABASE_URL` in Vercel production environment
- Missing or incorrect `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- Environment variables set for Preview but not Production
- Extra whitespace or formatting issues in variable values

### 2. Row Level Security (RLS) Policies 🛡️
- RLS policy blocking insert operation on `rooms` table
- Server Action using `anon` key instead of `service_role` key
- Missing policy for authenticated room creation

### 3. Supabase Client Configuration 🔧
- Not using `@supabase/ssr` for server-side rendering
- Attempting to access browser-only APIs (`localStorage`) on server
- Incorrect client initialization in Server Actions

### 4. Server Action Implementation 💻
- Unhandled exception in room creation logic
- Non-serializable return value (Date, BigInt, Supabase client instance)
- Missing `try-catch` blocks around Supabase calls

### 5. Database/Schema Issues 📊
- Table `rooms` doesn't exist or has schema mismatch
- Foreign key constraint violations
- Unique constraint violations (passphrase already exists)

### 6. Vercel Function Limits ⏱️
- Cold start timeout (>10s on free tier)
- Memory limit exceeded (>128MB)
- Response body size exceeded (>50MB)

---

## Recommended Diagnostic Steps

### Immediate Actions (Priority Order)

#### 1. Check Vercel Function Logs 🔍
```bash
# Access via Vercel Dashboard
Vercel → Project → Deployments → Production → Functions tab
# Look for the POST request that returned 500
# This will show the actual stack trace and error message
```

#### 2. Verify Environment Variables ✅
```bash
# Check in Vercel Dashboard
Settings → Environment Variables → Production

Required variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (for Server Actions)

# Verify no extra whitespace, correct values from Supabase dashboard
```

#### 3. Test RLS Policies 🛡️
```sql
-- Temporarily disable RLS on rooms table to isolate issue
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- If error disappears, the issue is RLS policy
-- Re-enable and fix policy:
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Add policy for room creation
CREATE POLICY "Anyone can create rooms"
ON rooms FOR INSERT
TO authenticated
WITH CHECK (true);
```

#### 4. Add Error Handling to Server Action 💻
```typescript
// In your createRoom Server Action
'use server';

export async function createRoom(formData: FormData) {
  try {
    const passphrase = formData.get('passphrase') as string;
    const playerName = formData.get('playerName') as string;

    console.log('[createRoom] Starting:', { passphrase, playerName });

    const { data, error } = await supabase
      .from('rooms')
      .insert({ passphrase, host_player_name: playerName })
      .select()
      .single();

    if (error) {
      console.error('[createRoom] Supabase error:', error);
      throw error;
    }

    console.log('[createRoom] Success:', data);
    return { success: true, data };

  } catch (err) {
    console.error('[createRoom] Exception:', err);
    // Return error instead of throwing to see it in client
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
```

#### 5. Verify Supabase Client Setup 🔧
```typescript
// Ensure using @supabase/ssr for Server Actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for Server Actions
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

#### 6. Check Supabase Dashboard Logs 📊
```
Supabase Dashboard → Your Project → Logs

Check:
- API logs for failed requests
- Postgres logs for query errors
- Auth logs for authentication issues
```

---

## Testing Strategy Adjustments

### Short-term Workaround
1. **Local Testing First**: Run tests against local Supabase instance
2. **Preview Deployment**: Test on Vercel preview deployment with debug enabled
3. **Staging Environment**: Set up staging environment with production-like config

### Long-term Improvements
1. **Add Comprehensive Error Handling**: Wrap all Server Actions in try-catch
2. **Set up Monitoring**: Integrate Sentry or similar for production error tracking
3. **Add Health Check Endpoint**: Create `/api/health` to verify all services
4. **CI/CD Integration**: Add smoke tests before deployment
5. **Environment Validation**: Script to validate all required env vars exist

---

## Multi-Player Testing Strategy (For After Fix)

Based on Gemini and o3 recommendations, the optimal approach for 3-player testing:

### Architecture: Multiple Browser Contexts

```typescript
import { test, chromium } from '@playwright/test';

test('3-player Insider full flow', async () => {
  const browser = await chromium.launch();

  // Create 3 isolated contexts (separate cookies, storage, WebSocket)
  const [ctx1, ctx2, ctx3] = await Promise.all([
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
    browser.newContext({ viewport: { width: 1280, height: 720 } })
  ]);

  const [page1, page2, page3] = await Promise.all([
    ctx1.newPage(),
    ctx2.newPage(),
    ctx3.newPage()
  ]);

  try {
    // Player 1: Create room
    await page1.goto('https://insider-game-self.vercel.app');
    await page1.click('text=PLAY');
    await page1.fill('[name=passphrase]', 'test123');
    await page1.fill('[name=playerName]', 'プレイヤー1');
    await page1.click('text=ルームを作る');

    // Capture room code
    const roomCode = await page1.textContent('[data-testid=room-code]');

    // Players 2 & 3: Join room in parallel
    await Promise.all([
      (async () => {
        await page2.goto('https://insider-game-self.vercel.app');
        await page2.click('text=ルームに参加する');
        await page2.fill('[name=passphrase]', 'test123');
        await page2.fill('[name=playerName]', 'プレイヤー2');
        await page2.click('text=参加する');
      })(),
      (async () => {
        await page3.goto('https://insider-game-self.vercel.app');
        await page3.click('text=ルームに参加する');
        await page3.fill('[name=passphrase]', 'test123');
        await page3.fill('[name=playerName]', 'プレイヤー3');
        await page3.click('text=参加する');
      })()
    ]);

    // Wait for all players to be ready
    await expect(page1.locator('text=プレイヤー2')).toBeVisible();
    await expect(page1.locator('text=プレイヤー3')).toBeVisible();

    // Start game (only host can start)
    await page1.click('text=ゲームを開始');

    // Verify all players see role assignment
    await Promise.all([
      expect(page1.locator('[data-testid=role-card]')).toBeVisible(),
      expect(page2.locator('[data-testid=role-card]')).toBeVisible(),
      expect(page3.locator('[data-testid=role-card]')).toBeVisible()
    ]);

    // Continue with game flow...

  } finally {
    await browser.close();
  }
});
```

### Key Testing Considerations

#### Timer Synchronization
```typescript
// Wait for phase transition by checking epoch deadline
async function waitForPhase(page: Page, phaseName: string) {
  await expect(
    page.locator(`[data-phase="${phaseName}"]`)
  ).toBeVisible({ timeout: 5000 });
}

// Verify timer sync across players
const [timer1, timer2, timer3] = await Promise.all([
  page1.locator('[data-testid=timer]').textContent(),
  page2.locator('[data-testid=timer]').textContent(),
  page3.locator('[data-testid=timer]').textContent()
]);

// Allow 1-2 second variance
expect(Math.abs(parseTime(timer1) - parseTime(timer2))).toBeLessThan(2);
```

#### WebSocket Monitoring
```typescript
// Listen for Supabase Realtime events
page1.on('websocket', ws => {
  ws.on('framereceived', event => {
    const data = JSON.parse(event.payload);
    if (data.event === 'PHASE_CHANGE') {
      console.log('Phase changed to:', data.payload.phase);
    }
  });
});
```

#### Role Verification
```typescript
// Verify roles are assigned correctly (1 Master, 1 Insider, 1 Citizen)
const roles = await Promise.all([
  page1.locator('[data-testid=role]').getAttribute('data-role'),
  page2.locator('[data-testid=role]').getAttribute('data-role'),
  page3.locator('[data-testid=role]').getAttribute('data-role')
]);

const roleCounts = roles.reduce((acc, role) => {
  acc[role] = (acc[role] || 0) + 1;
  return acc;
}, {});

expect(roleCounts).toEqual({ MASTER: 1, INSIDER: 1, CITIZEN: 1 });
```

---

## Test Automation Recommendations

### Test Suite Structure
```
tests/
├── e2e/
│   ├── 3-player-happy-path.spec.ts       # Full game flow, 3 players
│   ├── 5-player-voting.spec.ts           # Complex voting scenarios
│   ├── reconnection.spec.ts              # Mid-game reconnection
│   └── suspend-resume.spec.ts            # Game suspension
├── helpers/
│   ├── player-actions.ts                 # join(), ready(), vote()
│   ├── phase-waiters.ts                  # waitForPhase(), waitForTimer()
│   └── websocket-monitor.ts              # WebSocket event listeners
└── fixtures/
    └── multi-player.ts                   # Browser context setup
```

### CI/CD Integration
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Conclusion

### Current Status
🔴 **BLOCKER**: Production deployment has a critical server error preventing room creation. **All testing is blocked** until this issue is resolved.

### Next Steps (Priority Order)
1. ✅ **Access Vercel Function logs** to see actual error message
2. ✅ **Verify environment variables** in production
3. ✅ **Check RLS policies** on Supabase
4. ✅ **Add error handling** to Server Actions
5. ✅ **Test on Preview deployment** once fixed
6. ✅ **Resume E2E testing** with 3-player flow

### Estimated Time to Resolution
- **If env var issue**: 5-10 minutes
- **If RLS policy issue**: 15-30 minutes
- **If code issue**: 1-2 hours (depending on complexity)

### Success Criteria for Re-test
- ✅ Room creation completes successfully (no 500 error)
- ✅ Room code is displayed to host
- ✅ Other players can join using passphrase
- ✅ WebSocket connections established for all players
- ✅ Game start triggers role assignment

---

## Appendix: External Consultation Summary

### Gemini Search Results (gemini-2.5-pro)
**Query**: "Next.js 14 Server Components Server Action 500 error production Supabase common causes troubleshooting 2025"

**Key Findings**:
- Most common cause: Incorrect Supabase configuration for SSR
- Critical recommendation: Use `@supabase/ssr` package
- Primary diagnostic source: Vercel/hosting provider logs
- Secondary source: Supabase project dashboard logs

### o3-low Analysis
**Query**: "500 error diagnosis for Next.js Server Action with Supabase on Vercel"

**Key Findings**:
- 7 typical root causes identified (env vars, RLS, auth mismatch, etc.)
- Emphasized Vercel Function logs as primary diagnostic tool
- Provided checklist for rapid resolution
- Highlighted RLS policy testing as quick isolation method

---

## Test Report Metadata

**Generated**: 2025-10-24
**Framework**: Playwright MCP + Gemini CLI + o3-low
**Test Duration**: ~10 minutes (blocked at room creation)
**Screenshot**: `.playwright-mcp/error-room-creation.png`
**Status**: 🔴 **FAILED - Production Blocker**
