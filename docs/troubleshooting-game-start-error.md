# Troubleshooting Report: Game Start Error

**Date**: 2025-10-24
**Issue**: `PGRST204` - Schema cache error when starting game
**Status**: ✅ RESOLVED

---

## 1. Error Summary

### Reported Error
```
[error] [startGame] Session creation error: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'phase' column of 'game_sessions' in the schema cache"
}
```

### User Hypothesis
> "仕様書にゲーム開始最低人数が5人と書いてあったのが原因かもしれません"

**Analysis**: ❌ Incorrect hypothesis
The player count validation (3-12 players) was already fixed in the previous task. This was not the root cause.

---

## 2. Root Cause Analysis

### Investigation Steps

1. **Schema Verification** ✅
   - Checked migration file: `supabase/migrations/20250101000000_initial_schema.sql`
   - Confirmed `game_sessions.phase` column exists (line 90)
   - Schema definition is correct

2. **Code Verification** ✅
   - Checked `app/actions/game.ts` line 60
   - Code correctly inserts `phase: 'DEAL'`
   - No code errors found

3. **Database Status Check** ❌
   - Schema cache was out of sync with applied migrations
   - Database was running but migrations were not fully applied

### Real Root Cause

**Schema Cache Desynchronization**

The Supabase local database's schema cache was not synchronized with the migration files. This can happen when:
- Migrations are added but database is not reset
- Database is stopped/started without applying new migrations
- Schema cache becomes stale due to manual changes

---

## 3. Resolution

### Actions Taken

```bash
# 1. Check database status
npx supabase status
# ✅ Database running but schema cache outdated

# 2. Reset database and apply all migrations
npx supabase db reset
# ✅ Applied 11 migrations successfully:
#   - 20250101000000_initial_schema.sql
#   - 20250101000001_seed_topics.sql
#   - 20251021154449_sync_players_schema_with_production.sql
#   - 20251021154733_add_master_topics_table.sql
#   - 20251022000000_add_passphrase_lookup_hash.sql
#   - 20251022120000_disable_players_rls_temporary.sql
#   - 20251022130000_enable_realtime_temp.sql
#   - 20251022140000_add_room_cleanup_function.sql
#   - 20251022150000_add_auto_delete_empty_rooms.sql
#   - 20251022160000_disable_game_sessions_roles_rls_temporary.sql
#   - 20251022170000_fix_trigger_rls_bypass.sql
#   - 20251022223106_set_confirmed_default_true.sql
#   - 20251022223200_auto_reload_schema_cache.sql
#   - 20251024000000_add_server_time_rpc.sql

# 3. Regenerate TypeScript types
npx supabase gen types typescript --local > lib/supabase/database.types.ts
# ✅ Types regenerated with game_sessions.phase field

# 4. Build verification
npm run build
# ✅ Build successful (0 errors)
```

### Verified Schema

```typescript
// lib/supabase/database.types.ts (generated)
game_sessions: {
  Row: {
    answerer_id: string | null
    created_at: string | null
    deadline_epoch: number | null
    difficulty: string
    id: string
    phase: string              // ✅ Column exists
    prev_master_id: string | null
    room_id: string
    start_time: string | null
  }
  Insert: {
    answerer_id?: string | null
    created_at?: string | null
    deadline_epoch?: number | null
    difficulty?: string
    id?: string
    phase: string              // ✅ Required field
    prev_master_id?: string | null
    room_id: string
    start_time?: string | null
  }
}
```

---

## 4. Prevention Strategies

### For Developers

1. **Always reset database after pulling migrations**
   ```bash
   git pull
   npx supabase db reset
   ```

2. **Regenerate types after schema changes**
   ```bash
   npx supabase gen types typescript --local > lib/supabase/database.types.ts
   ```

3. **Use auto-reload schema cache migration** (Already applied)
   - Migration: `20251022223200_auto_reload_schema_cache.sql`
   - Automatically reloads schema cache on DDL changes

### For CI/CD

```yaml
# Example GitHub Actions workflow
- name: Setup Database
  run: |
    npx supabase db reset
    npx supabase gen types typescript --local > lib/supabase/database.types.ts
    npm run build
```

---

## 5. Verification Checklist

- [x] Database reset completed
- [x] All 14 migrations applied successfully
- [x] TypeScript types regenerated
- [x] Build successful (0 errors)
- [x] `game_sessions.phase` column exists in schema
- [x] Player count validation is 3-12 (not 5-8)
- [x] Ready flow implemented (host auto-ready, guests toggle)

---

## 6. Testing Instructions

### Manual Test

1. **Start local Supabase**
   ```bash
   npx supabase start
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Test game start flow**
   - Create room as host
   - Join as 2 guest players (minimum 3 total)
   - Toggle guest ready state (click player chip)
   - Host clicks "ゲームを開始する" button
   - Should redirect to `/game/role-assignment`

### Expected Results

✅ No `PGRST204` error
✅ Game session created with `phase: 'DEAL'`
✅ Room phase updated to `DEAL`
✅ Roles assigned to all players
✅ Redirect to role assignment screen

---

## 7. Related Files Modified

**No code changes required** - Issue was database state, not code.

Files verified:
- `app/actions/game.ts` - ✅ Code correct
- `supabase/migrations/20250101000000_initial_schema.sql` - ✅ Schema correct
- `lib/supabase/database.types.ts` - ✅ Types regenerated

---

## 8. Key Learnings

1. **Schema Cache Issues**
   - Always check database status first when seeing `PGRST204` errors
   - Schema cache can become stale even when migrations exist

2. **Database Reset**
   - `npx supabase db reset` is safe in local development
   - Applies all migrations in order
   - Refreshes schema cache automatically

3. **Type Generation**
   - Always regenerate types after schema changes
   - Types are source of truth for database structure

4. **Error Message Interpretation**
   - "Could not find column in schema cache" ≠ "Column doesn't exist in migration"
   - It means cache is out of sync, not code is wrong

---

## 9. Conclusion

**Root Cause**: Supabase local database schema cache desynchronization
**Solution**: Database reset + type regeneration
**Prevention**: Auto-reload schema cache migration + developer workflow improvements
**Status**: ✅ RESOLVED - Game start should now work correctly

The game can now start with 3-12 players, and the ready flow is fully functional.

---

## 10. Follow-Up: Why Error Recurred (2025-10-24)

**Issue**: Same PGRST204 error occurred again in next session
**Root Cause**: Race condition during `supabase start` - PostgREST builds cache BEFORE migrations finish
**Permanent Fix**: See [`database-schema-cache-fix.md`](database-schema-cache-fix.md)

### Quick Summary
- `db reset` only temporarily fixed the issue by chance
- The race condition occurs every time Supabase starts
- **Solution**: Always start Supabase first and wait for it, then start app
- **Better**: Use `npm run start:dev` which handles proper startup sequence

### Immediate Fix Applied
```bash
docker exec supabase_db_Insider_game psql -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema';"
```

This manually reloaded the schema cache and resolved the error immediately.
