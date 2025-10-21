# Production E2E Test Report
**Date**: 2025-10-21
**Environment**: https://insider-game-self.vercel.app/
**Test Framework**: Playwright
**Browser**: Chromium

---

## Executive Summary

❌ **Status**: Critical Production Issues Identified
**Tests Executed**: 6 smoke tests
**Pass Rate**: 1/6 (16.7%)
**Critical Bugs**: 1

### Key Findings
1. ✅ Environment variables are correctly configured
2. ❌ Room creation flow has critical UUID validation error
3. ❌ Test suite expectations do not match production UI implementation
4. ⚠️ Lobby page fails to load due to backend validation error

---

## Test Results Summary

### ✅ Passing Tests (1)
| Test | Status | Duration |
|------|--------|----------|
| Environment variables are configured | PASS | 369ms |

### ❌ Failing Tests (5)
| Test | Status | Error | Root Cause |
|------|--------|-------|------------|
| Homepage loads successfully | FAIL | Title mismatch | Test expects "Insider Game", actual title is "INSIDER - オンライン推理ゲーム" |
| Can navigate to room creation flow | FAIL | Element not found | Test expects button text "ルームを作成", actual text is "PLAY" |
| Can create room and reach lobby | FAIL | Element not found | UI interaction pattern differs from test expectations |
| Lobby displays player count correctly | FAIL | Element not found | Cannot reach lobby due to upstream errors |
| Database connection is working | FAIL | Element not found | Cannot complete room creation flow |

---

## Critical Bug: UUID Validation Error

### 🔴 Severity: CRITICAL - Production Blocker

**Bug Location**: `/lobby` page
**Error Message**: `invalid input syntax for type uuid: "FDO2O5"`
**Impact**: Complete application flow is broken - users cannot enter lobby after creating room

### Reproduction Steps
1. Navigate to https://insider-game-self.vercel.app/
2. Click "PLAY" button
3. Enter passphrase: `test-passphrase`
4. Enter player name: `TestPlayer`
5. Click "ルームを作る"
6. **Result**: Redirected to `/lobby?roomId=FDO2O5&passphrase=...&playerName=...&isHost=true`
7. **Error**: Page displays "エラーが発生しました: invalid input syntax for type uuid: \"FDO2O5\""

### Root Cause Analysis
```
URL Generated: /lobby?roomId=FDO2O5&...
Expected Format: /lobby?roomId=<UUID-v4>&...

Problem: Room creation endpoint is returning a short random string (6 chars)
         instead of a proper UUID (36 chars with hyphens)

Database Query: SELECT * FROM players WHERE room_id = 'FDO2O5'
PostgreSQL Error: Cannot cast 'FDO2O5' to UUID type

Result: useRoomPlayers hook fails to fetch player data
```

### Console Errors (Production)
```javascript
[ERROR] Failed to load resource: the server responded with a status of 400 ()
        @ https://qqvxtmjyrjbzemxnfdwy.supabase.co/rest/v1/players?...

[ERROR] [useRoomPlayers] Initial fetch error:
        {
          code: '22P02',
          details: null,
          hint: null,
          message: 'invalid input syntax for type uuid: "FDO2O5"'
        }
```

### Expected Behavior
1. Room creation should generate a valid UUID-v4
2. URL should contain: `roomId=<UUID>` (e.g., `roomId=123e4567-e89b-12d3-a456-426614174000`)
3. Database query should succeed with valid UUID

### Recommended Fix
**File**: Likely in room creation API/action
**Action Required**:
1. Review room creation logic (API route or server action)
2. Ensure UUID generation using `crypto.randomUUID()` or `uuid.v4()`
3. Validate that database schema expects UUID type for `rooms.id`
4. Update URL generation to use actual room UUID from database response

**Code Pattern (Expected)**:
```typescript
// ❌ WRONG - Current Implementation (suspected)
const roomId = generateShortId(); // Returns "FDO2O5"

// ✅ CORRECT - Should be
const roomId = crypto.randomUUID(); // Returns "123e4567-e89b-12d3-a456-426614174000"
```

---

## UI Implementation Discrepancies

### Homepage Elements
| Test Expectation | Production Reality | Impact |
|-----------------|-------------------|---------|
| Button: "ルームを作成" | Button: "PLAY" | Tests cannot locate elements |
| Title: "Insider Game" | Title: "INSIDER - オンライン推理ゲーム" | Title assertion fails |
| Direct form access | Modal dialog pattern | Navigation flow differs |

### Room Creation Flow
**Test Expected**:
```
1. Click "ルームを作成" button
2. Form appears inline
3. Submit form
```

**Production Reality**:
```
1. Click "PLAY" button
2. Modal dialog opens with title "ルームを作る"
3. Fill textboxes labeled "合言葉" and "プレイヤー名"
4. Click "ルームを作る" button in modal
5. Modal closes, navigation occurs
```

---

## Database Schema Validation

### rooms Table (Expected)
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passphrase_hash TEXT NOT NULL UNIQUE,
  ...
)
```

**Verification Status**: ✅ Schema is correct (confirmed via earlier migration)
**Issue**: Room creation logic is not using proper UUID generation

---

## Test Environment Analysis

### ✅ Working Components
1. **Supabase Connection**: Environment variables correctly configured
2. **Database Tables**: Schema migrations successfully applied
3. **Frontend Build**: Application loads without compile errors
4. **Modal Interactions**: UI components render and respond to input

### ❌ Broken Components
1. **Room Creation Backend**: Not generating valid UUIDs
2. **Lobby Page**: Cannot handle malformed roomId parameter
3. **Database Queries**: Failing due to UUID type mismatch

---

## Recommendations

### 🔴 CRITICAL - Fix Immediately
1. **Fix UUID Generation in Room Creation**
   - Priority: P0 (Blocker)
   - Files to check:
     - `app/api/rooms/create/route.ts` (or similar)
     - `app/actions/rooms.ts` (if using Server Actions)
     - Room creation form handler
   - Action: Replace short ID generator with proper UUID

2. **Add Server-Side Validation**
   - Validate roomId format before database queries
   - Return 400 Bad Request for invalid UUIDs
   - Provide user-friendly error messages

### 🟡 HIGH - Fix Before Production Release
3. **Update E2E Test Suite**
   - Update element selectors to match production UI
   - Update title expectations
   - Update room creation flow to use modal pattern
   - Estimated effort: 2-3 hours

4. **Add Integration Tests**
   - Test room creation API directly
   - Validate UUID format in responses
   - Test database constraints

### 🟢 MEDIUM - Improve Quality
5. **Add Monitoring**
   - Log room creation attempts
   - Alert on UUID validation errors
   - Track user flow completion rates

6. **Error Handling**
   - Improve error messages for UUID validation
   - Add retry logic for transient failures
   - Implement graceful degradation

---

## Next Steps

### Immediate Actions (Today)
1. ✅ Generate this test report
2. ⏭ Notify development team of critical UUID bug
3. ⏭ Create GitHub issue for room creation bug
4. ⏭ Investigate room creation code

### Short-term (This Week)
1. ⏭ Fix UUID generation bug
2. ⏭ Deploy hotfix to production
3. ⏭ Update E2E tests to match production UI
4. ⏭ Verify fix with full test suite

### Medium-term (Next Sprint)
1. ⏭ Add automated production smoke tests
2. ⏭ Implement monitoring and alerting
3. ⏭ Review and improve error handling
4. ⏭ Add integration tests for critical flows

---

## Test Artifacts

### Screenshots
- `test-results/tests-production-smoke-*/test-failed-*.png`
- Available for each failed test case

### Videos
- `test-results/tests-production-smoke-*/video.webm`
- Screen recordings of test execution

### Console Logs
- Captured via Playwright console event listeners
- Includes error stack traces and network failures

---

## Appendix: Full Test Output

```
Running 6 tests using 4 workers

  ✘  [chromium] › homepage loads successfully (6.7s)
     Error: Title mismatch - Expected /Insider Game/i, Got "INSIDER - オンライン推理ゲーム"

  ✘  [chromium] › can navigate to room creation flow (30.2s)
     Error: Timeout waiting for 'button:has-text("ルームを作成")'

  ✘  [chromium] › can create room and reach lobby (30.2s)
     Error: Timeout waiting for 'button:has-text("ルームを作成")'

  ✘  [chromium] › lobby displays player count correctly (30.2s)
     Error: Timeout waiting for 'button:has-text("ルームを作成")'

  ✓  [chromium] › environment variables are configured (369ms)

  ✘  [chromium] › database connection is working (30.1s)
     Error: Timeout waiting for 'button:has-text("ルームを作成")'

  5 failed, 1 passed (39.6s)
```

---

## Contact
For questions about this report, please contact the QA team or refer to the Playwright test suite in `/e2e/tests/`.

**Report Generated**: 2025-10-21
**Generated By**: Claude Code - Production E2E Testing
**Test Suite Version**: 1.0.0
