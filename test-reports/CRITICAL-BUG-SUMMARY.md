# 🔴 CRITICAL BUG: Room Creation Not Implemented

**Status**: Production Blocker  
**Severity**: P0 - Critical  
**Discovered**: 2025-10-21 via E2E Testing  
**Impact**: Complete application flow is broken

---

## Problem

Room creation is using **MOCK implementation** instead of actual Supabase integration.

### Bug Location
**File**: [components/create-room-modal.tsx](../components/create-room-modal.tsx)  
**Lines**: 22-35

```typescript
const handleCreate = async () => {
  if (!passphrase.trim() || !playerName.trim()) return

  setIsLoading(true)

  // Mock: Generate room ID and navigate to lobby
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
  //                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                          BUG: Generates "FDO2O5" instead of UUID

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Navigate to lobby with room data
  router.push(`/lobby?roomId=${roomId}&passphrase=${passphrase}&playerName=${playerName}&isHost=true`)
}
```

### Result
- **Generated**: `roomId=FDO2O5` (6-char random string)
- **Expected**: `roomId=123e4567-e89b-12d3-a456-426614174000` (UUID-v4)
- **Error**: PostgreSQL cannot cast `"FDO2O5"` to UUID type
- **User Impact**: Cannot create rooms or enter lobby

---

## Root Cause

The component has commented "Mock:" indicating this is placeholder code awaiting real implementation.

**Why This Happened**:
1. MVP phase code was deployed with mock implementation
2. Real Supabase room creation logic was never implemented
3. No integration tests to catch this before production

---

## Fix Required

### Step 1: Create Room Creation API

**Option A: API Route** (Recommended for complex logic)
```typescript
// app/api/rooms/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassphrase } from '@/lib/auth/passphrase';

export async function POST(request: NextRequest) {
  const { passphrase, playerName } = await request.json();

  const supabase = createClient();

  // 1. Hash passphrase
  const passphraseHash = await hashPassphrase(passphrase);

  // 2. Create room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      passphrase_hash: passphraseHash,
      phase: 'LOBBY',
    })
    .select()
    .single();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  // 3. Create host player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname: playerName,
      is_host: true,
      is_connected: true,
    })
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  // 4. Update room.host_id
  await supabase
    .from('rooms')
    .update({ host_id: player.id })
    .eq('id', room.id);

  return NextResponse.json({
    roomId: room.id,  // This is a proper UUID from database
    playerId: player.id,
  });
}
```

**Option B: Server Action** (Simpler for form submission)
```typescript
// app/actions/rooms.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { hashPassphrase } from '@/lib/auth/passphrase';

export async function createRoom(passphrase: string, playerName: string) {
  const supabase = createClient();

  const passphraseHash = await hashPassphrase(passphrase);

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ passphrase_hash: passphraseHash, phase: 'LOBBY' })
    .select()
    .single();

  if (roomError) throw new Error(roomError.message);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname: playerName,
      is_host: true,
      is_connected: true,
    })
    .select()
    .single();

  if (playerError) throw new Error(playerError.message);

  await supabase
    .from('rooms')
    .update({ host_id: player.id })
    .eq('id', room.id);

  return { roomId: room.id, playerId: player.id };
}
```

### Step 2: Update Create Room Modal

```typescript
// components/create-room-modal.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRoom } from "@/app/actions/rooms"  // or fetch to API route

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const router = useRouter()
  const [passphrase, setPassphrase] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!passphrase.trim() || !playerName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // ✅ FIXED: Call real Supabase backend
      const { roomId, playerId } = await createRoom(passphrase, playerName)

      // Navigate with proper UUID
      router.push(`/lobby?roomId=${roomId}&passphrase=${passphrase}&playerName=${playerName}&playerId=${playerId}&isHost=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* ... existing UI ... */}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {/* ... rest of component ... */}
    </Dialog>
  )
}
```

---

## Testing Checklist

After implementing the fix:

- [ ] Create new room via UI
- [ ] Verify URL contains valid UUID: `/lobby?roomId=<UUID>&...`
- [ ] Verify room appears in Supabase `rooms` table
- [ ] Verify player appears in Supabase `players` table
- [ ] Verify `rooms.host_id` is set correctly
- [ ] Verify lobby page loads without errors
- [ ] Verify player list displays correctly
- [ ] Run production smoke tests again
- [ ] Verify passphrase hashing works correctly

---

## Similar Issues to Check

1. **Join Room Flow**: Check [components/join-room-modal.tsx](../components/join-room-modal.tsx) for similar mock code
2. **Game Start**: Check if game start logic is also mocked
3. **Other Modals**: Search for `Math.random().toString(36)` pattern across codebase

```bash
grep -r "Math.random().toString(36)" components/
```

---

## Prevention

### Immediate
1. Add integration tests for room creation
2. Add E2E tests for full user flow
3. Add CI/CD smoke tests before deployment

### Long-term
1. Code review checklist: "No mock code in production"
2. Linting rule to detect `Mock:` comments
3. Staging environment with real data validation
4. Automated database schema validation

---

## Deployment Plan

1. **Develop**: Implement fix in feature branch
2. **Test**: Run full test suite locally
3. **Stage**: Deploy to staging environment
4. **Verify**: Run E2E tests on staging
5. **Production**: Deploy hotfix
6. **Monitor**: Watch error logs for 24 hours

---

## Contact

- **Bug Reporter**: Claude Code E2E Testing
- **Priority**: P0 - Blocker
- **ETA for Fix**: 2-4 hours (development + testing)

**Full Test Report**: [production-e2e-report-2025-10-21.md](./production-e2e-report-2025-10-21.md)
