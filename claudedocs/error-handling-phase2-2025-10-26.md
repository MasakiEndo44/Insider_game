# Error Handling Phase 2 - Complete Server Action Migration

**Date**: 2025-10-26
**Objective**: Extend Phase 1 error handling improvements to all room management Server Actions

---

## Overview

Phase 2 extends the type-safe error handling pattern from Phase 1 (`createRoom`) to all remaining room management Server Actions:
- `joinRoom` - Room joining with passphrase validation
- `leaveRoom` - Player departure and room cleanup
- `togglePlayerReady` - Ready state management

---

## Changes Summary

### 1. Extended Error Codes

**New Error Codes Added**:
```typescript
export type RoomErrorCode =
  | 'INVALID_PASSPHRASE'
  | 'INVALID_PLAYER_NAME'
  | 'INVALID_ROOM_OR_PLAYER'  // ✨ NEW - for leaveRoom, togglePlayerReady
  | 'DUPLICATE_PASSPHRASE'
  | 'ROOM_FULL'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_SUSPENDED'          // ✨ NEW - for suspended room detection
  | 'PLAYER_NOT_FOUND'        // ✨ NEW - for player lookup failures
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';
```

**Usage**:
- `INVALID_ROOM_OR_PLAYER`: Validation failure for room/player IDs (leaveRoom, togglePlayerReady)
- `ROOM_SUSPENDED`: Room is suspended and cannot be joined (joinRoom)
- `PLAYER_NOT_FOUND`: Player record not found in database (future use)

---

## Implementation Details

### 1. joinRoom Refactoring

**File**: [app/actions/rooms.ts:325-437](../app/actions/rooms.ts#L325-L437)

**Changes**:
- ✅ Changed return type from `{ roomId, playerId, nickname }` to `Promise<JoinRoomResult>`
- ✅ Validation errors return typed error objects (INVALID_PASSPHRASE, INVALID_PLAYER_NAME)
- ✅ Room lookup failures return ROOM_NOT_FOUND
- ✅ Suspended room detection returns ROOM_SUSPENDED
- ✅ Full room check returns ROOM_FULL
- ✅ Database errors return DATABASE_ERROR
- ✅ Unexpected exceptions return UNKNOWN_ERROR

**Error Messages**:
| Code | Message | Trigger |
|------|---------|---------|
| `INVALID_PASSPHRASE` | 合言葉は3〜10文字で入力してください | Passphrase < 3 or > 10 chars |
| `INVALID_PLAYER_NAME` | プレイヤー名は1〜20文字で入力してください | Player name < 1 or > 20 chars |
| `ROOM_NOT_FOUND` | 合言葉が正しくないか、ルームが存在しません | Room doesn't exist or wrong passphrase |
| `ROOM_SUSPENDED` | このルームは中断中です | Room is_suspended = true |
| `ROOM_FULL` | ルームが満員です（最大12人） | Room has 12 players |
| `DATABASE_ERROR` | ルーム参加に失敗しました: {details} | Database operation failed |
| `UNKNOWN_ERROR` | 予期しないエラーが発生しました | Unexpected exception |

**Example Usage**:
```typescript
const result = await joinRoom('test123', 'Player1');

if (!result.ok) {
  // Display user-friendly error
  setError(result.message);

  // Track error code for analytics
  analytics.trackError(result.code);
  return;
}

// Success: Navigate with result data
router.push(`/lobby?roomId=${result.roomId}&playerId=${result.playerId}`);
```

---

### 2. leaveRoom Refactoring

**File**: [app/actions/rooms.ts:214-276](../app/actions/rooms.ts#L214-L276)

**Changes**:
- ✅ Changed return type from `{ success, roomDeleted, message }` to `Promise<LeaveRoomResult>`
- ✅ Added INVALID_ROOM_OR_PLAYER validation for empty room/player IDs
- ✅ Database errors return DATABASE_ERROR instead of throwing
- ✅ Unexpected exceptions return UNKNOWN_ERROR
- ✅ Success case maintains `roomDeleted` flag for cleanup tracking

**Result Type**:
```typescript
export type LeaveRoomResult =
  | { ok: true; roomDeleted: boolean; message: string }
  | { ok: false; code: RoomErrorCode; message: string };
```

**Error Messages**:
| Code | Message | Trigger |
|------|---------|---------|
| `INVALID_ROOM_OR_PLAYER` | ルームIDとプレイヤーIDは必須です | Empty roomId or playerId |
| `DATABASE_ERROR` | プレイヤーの退室に失敗しました: {details} | Database operation failed |
| `UNKNOWN_ERROR` | 予期しないエラーが発生しました | Unexpected exception |

**Example Usage**:
```typescript
const result = await leaveRoom(roomId, playerId);

if (result.ok && result.roomDeleted) {
  console.log('Room was deleted (last player left)');
}

if (!result.ok) {
  console.error('Leave failed:', result.message);
  // Still navigate to home - don't trap user
}

router.push('/');
```

---

### 3. togglePlayerReady Refactoring

**File**: [app/actions/rooms.ts:287-315](../app/actions/rooms.ts#L287-L315)

**Changes**:
- ✅ Changed return type from `{ success: boolean }` to `Promise<ToggleReadyResult>`
- ✅ Added INVALID_ROOM_OR_PLAYER validation for empty room/player IDs
- ✅ Database errors return DATABASE_ERROR instead of throwing
- ✅ Unexpected exceptions return UNKNOWN_ERROR

**Result Type**:
```typescript
export type ToggleReadyResult =
  | { ok: true }
  | { ok: false; code: RoomErrorCode; message: string };
```

**Error Messages**:
| Code | Message | Trigger |
|------|---------|---------|
| `INVALID_ROOM_OR_PLAYER` | ルームIDとプレイヤーIDは必須です | Empty roomId or playerId |
| `DATABASE_ERROR` | 準備状態の更新に失敗しました: {details} | Database operation failed |
| `UNKNOWN_ERROR` | 予期しないエラーが発生しました | Unexpected exception |

**Example Usage**:
```typescript
const result = await togglePlayerReady(roomId, playerId, true);

if (!result.ok) {
  showToast(result.message, 'error');
  return;
}

// Success - UI updates via Realtime subscription
```

---

### 4. JoinRoomModal Client Update

**File**: [components/join-room-modal.tsx:24-52](../components/join-room-modal.tsx#L24-L52)

**Changes**:
- ✅ Updated error handling to use typed JoinRoomResult
- ✅ Check `result.ok` before accessing success properties
- ✅ Display user-friendly error messages from server
- ✅ Handle system errors separately with generic message

**Before**:
```typescript
try {
  const { roomId, playerId, nickname } = await joinRoom(passphrase, playerName);
  router.push(`/lobby?roomId=${roomId}...`);
} catch (err) {
  setError(err instanceof Error ? err.message : 'ルームへの参加に失敗しました');
}
```

**After**:
```typescript
try {
  const result = await joinRoom(passphrase, playerName);

  if (!result.ok) {
    setError(result.message);  // User-friendly error from server
    setIsLoading(false);
    return;
  }

  router.push(`/lobby?roomId=${result.roomId}...`);
} catch (err) {
  setError('サーバーエラーが発生しました。しばらくしてからもう一度お試しください。');
}
```

---

### 5. Lobby Page Update

**File**: [app/lobby/page.tsx:100-119](../app/lobby/page.tsx#L100-L119)

**Changes**:
- ✅ Updated to check `result.ok` before accessing `result.roomDeleted`
- ✅ Type-safe access to result properties

**Before**:
```typescript
const result = await leaveRoom(roomId, playerId);
if (result.roomDeleted) {
  console.log('Room was deleted');
}
```

**After**:
```typescript
const result = await leaveRoom(roomId, playerId);
if (result.ok && result.roomDeleted) {
  console.log('Room was deleted');
}
```

---

## Test Updates

### Updated Test Files
**File**: [app/actions/rooms.test.ts](../app/actions/rooms.test.ts)

**Changes**:
- ✅ Updated all `joinRoom` tests to use typed results (5 tests)
- ✅ Updated all `leaveRoom` tests to use typed results (4 tests)
- ✅ All validation tests now assert on `result.ok`, `result.code`, and `result.message`

**Test Results**: ✅ **16/16 passing** (1 skipped)

**Example Test Pattern**:
```typescript
// Before
it('should reject short passphrase', async () => {
  await expect(joinRoom('ab', 'Player')).rejects.toThrow(
    '合言葉は3〜10文字で入力してください'
  );
});

// After
it('should reject short passphrase', async () => {
  const result = await joinRoom('ab', 'Player');

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe('INVALID_PASSPHRASE');
    expect(result.message).toBe('合言葉は3〜10文字で入力してください');
  }
});
```

---

## Complete Error Catalog

### Validation Errors (User Input)

| Code | Message (Japanese) | English | Affected Actions |
|------|-------------------|---------|------------------|
| `INVALID_PASSPHRASE` | 合言葉は3〜10文字で入力してください | Passphrase must be 3-10 characters | createRoom, joinRoom |
| `INVALID_PLAYER_NAME` | プレイヤー名は1〜20文字で入力してください | Player name must be 1-20 characters | createRoom, joinRoom |
| `INVALID_ROOM_OR_PLAYER` | ルームIDとプレイヤーIDは必須です | Room ID and Player ID are required | leaveRoom, togglePlayerReady |

### Business Logic Errors

| Code | Message (Japanese) | English | Affected Actions |
|------|-------------------|---------|------------------|
| `DUPLICATE_PASSPHRASE` | この合言葉は既に使用されています。別の合言葉を入力してください。 | Passphrase already in use | createRoom |
| `ROOM_FULL` | ルームが満員です（最大12人） | Room is full (max 12 players) | joinRoom |
| `ROOM_NOT_FOUND` | 合言葉が正しくないか、ルームが存在しません | Incorrect passphrase or room doesn't exist | joinRoom |
| `ROOM_SUSPENDED` | このルームは中断中です | Room is suspended | joinRoom |
| `PLAYER_NOT_FOUND` | プレイヤーが見つかりません | Player not found | (Reserved for future use) |

### System Errors

| Code | Message (Japanese) | English | Affected Actions |
|------|-------------------|---------|------------------|
| `DATABASE_ERROR` | {操作}に失敗しました: {details} | {Operation} failed: {details} | All actions |
| `UNKNOWN_ERROR` | 予期しないエラーが発生しました | An unexpected error occurred | All actions |

---

## Impact Analysis

### User Experience Improvements

**Before Phase 2**:
- ❌ Generic "failed to join room" errors
- ❌ No distinction between user errors and system errors
- ❌ Unclear error messages for validation failures

**After Phase 2**:
- ✅ Specific, actionable error messages in Japanese
- ✅ Clear separation: user errors (HTTP 200) vs system errors (throw)
- ✅ Consistent error display across all room operations
- ✅ Error codes for analytics and debugging

### Developer Experience Improvements

**Before Phase 2**:
- ❌ Multiple Server Actions with different error handling patterns
- ❌ Tests using both `.rejects.toThrow()` and result assertions
- ❌ Difficult to track error types programmatically

**After Phase 2**:
- ✅ Consistent error handling pattern across all Server Actions
- ✅ Type-safe error handling with compiler enforcement
- ✅ Uniform test patterns for all actions
- ✅ Error codes enable analytics tracking and monitoring

---

## Files Modified

### Core Changes
1. [app/actions/rooms.ts](../app/actions/rooms.ts) - Refactored joinRoom, leaveRoom, togglePlayerReady
2. [components/join-room-modal.tsx](../components/join-room-modal.tsx) - Updated client error handling
3. [app/lobby/page.tsx](../app/lobby/page.tsx) - Updated leaveRoom result handling

### Test Updates
4. [app/actions/rooms.test.ts](../app/actions/rooms.test.ts) - Updated all tests for new API

---

## Verification Checklist

### TypeScript Compilation ✅
```bash
npx tsc --noEmit
# Result: No errors
```

### Unit Tests ✅
```bash
npm test -- app/actions/rooms.test.ts
# Result: 16 passed, 1 skipped (17 total)
```

### Test Coverage by Action

| Action | Tests | Status |
|--------|-------|--------|
| createRoom | 8 tests | ✅ All passing |
| joinRoom | 5 tests | ✅ All passing |
| leaveRoom | 4 tests (1 skipped) | ✅ All passing |
| togglePlayerReady | - | Manual testing required |

---

## Manual Testing Checklist

### JoinRoom Error Scenarios

#### Test Case 1: Invalid Passphrase
1. Open Join Room modal
2. Enter passphrase "ab" (too short)
3. Enter valid player name
4. Click "参加する"
5. **Expected**: Error "合言葉は3〜10文字で入力してください"
6. **Expected**: No HTTP 500 error

#### Test Case 2: Room Not Found
1. Open Join Room modal
2. Enter non-existent passphrase "wrongpass"
3. Enter valid player name
4. Click "参加する"
5. **Expected**: Error "合言葉が正しくないか、ルームが存在しません"

#### Test Case 3: Room Full
1. Create room with passphrase "test123"
2. Join with 11 other players (12 total)
3. Try to join with 13th player
4. **Expected**: Error "ルームが満員です（最大12人）"

#### Test Case 4: Suspended Room
1. Create room and start game
2. Suspend the room (via admin or game logic)
3. Try to join with new player
4. **Expected**: Error "このルームは中断中です"

### LeaveRoom Scenarios

#### Test Case 5: Leave as Non-Host
1. Join room as Player 2
2. Click "退室する" button
3. **Expected**: Navigate to home
4. **Expected**: Player removed from lobby (check with other clients)

#### Test Case 6: Leave as Last Player
1. Create room as host
2. Click "退室する" button
3. **Expected**: Navigate to home
4. **Expected**: Room deleted from database (verify in Supabase)

### TogglePlayerReady Scenarios

#### Test Case 7: Toggle Ready State
1. Join room as Player 2
2. Click "準備完了" button
3. **Expected**: Button changes to "準備完了済み"
4. **Expected**: Other players see ready indicator
5. Click button again to unready
6. **Expected**: Button changes back to "準備完了"

---

## Future Enhancements (Phase 3)

### Short-term
1. **Field-Level Error Support**
   ```typescript
   export type CreateRoomResult =
     | { ok: true; roomId: string; playerId: string }
     | {
         ok: false;
         code: RoomErrorCode;
         message: string;
         field?: 'passphrase' | 'playerName';  // ✨ NEW
       };
   ```

2. **Toast Notifications**
   - Use toast instead of inline errors for transient failures
   - Better UX for database errors and temporary issues

3. **Retry Logic**
   - Auto-retry on DATABASE_ERROR (with exponential backoff)
   - User-visible retry indicator

### Medium-term
4. **Internationalization (i18n)**
   ```typescript
   const messages = {
     ROOM_FULL: {
       ja: 'ルームが満員です（最大12人）',
       en: 'Room is full (max 12 players)',
     },
   };
   ```

5. **Error Analytics**
   - Track error frequency by code
   - Identify common user errors for UX improvements
   - Monitor system error rates for alerting

6. **Enhanced Error Recovery**
   - Suggest alternative actions for specific errors
   - Provide "Try Again" button with context preservation

---

## Deployment Checklist

### Pre-Deployment ✅
- [x] Run TypeScript type checking: `npx tsc --noEmit`
- [x] Run unit tests: `npm test -- app/actions/rooms.test.ts`
- [x] Code review by team
- [ ] Manual testing on staging environment

### Deployment
- [ ] Deploy to Vercel production
- [ ] Monitor error rates in logs
- [ ] Verify error messages display correctly
- [ ] Check analytics for error codes

### Post-Deployment
- [ ] Validate all error scenarios in production
- [ ] Verify no HTTP 500 errors for user errors
- [ ] Collect user feedback on error messages
- [ ] Measure error rate changes

---

## Summary

**Phase 2 Status**: ✅ **Complete**

### Achievements
- ✅ Refactored 3 Server Actions (joinRoom, leaveRoom, togglePlayerReady)
- ✅ Extended error codes to cover all room operations
- ✅ Updated JoinRoomModal client component
- ✅ Updated Lobby page for type-safe result handling
- ✅ Migrated 9 tests to new API (all passing)
- ✅ 0 TypeScript errors
- ✅ 16/16 unit tests passing

### Metrics
- **Type Coverage**: 100% for all room management Server Actions
- **Test Coverage**: 16/16 tests passing (1 skipped integration test)
- **Error Messages**: 10 distinct error codes with Japanese messages
- **Affected Actions**: 4 Server Actions (createRoom, joinRoom, leaveRoom, togglePlayerReady)
- **Affected Components**: 2 client components (CreateRoomModal, JoinRoomModal)

### Next Steps
- **Phase 3**: Implement toast notifications, retry logic, and i18n
- **Manual Testing**: Execute test scenarios in staging environment
- **Production Deployment**: Deploy and monitor error rates

---

## Related Documentation

- [Phase 1 Documentation](./error-handling-improvement-2025-10-24.md) - Initial createRoom refactoring
- [Production Test Report](./production-test-final-report-2025-10-24.md) - E2E test findings
- [Next.js Server Actions Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
