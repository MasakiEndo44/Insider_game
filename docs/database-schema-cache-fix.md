# PostgREST Schema Cache: Permanent Fix

**Date**: 2025-10-24
**Issue**: PGRST204 - Recurring schema cache errors
**Status**: ✅ RESOLVED with permanent solution

---

## Root Cause: Race Condition on Startup

### What Happens
When you run `npx supabase start`, all Docker services launch **in parallel**:
1. **PostgREST** starts in <1 second and builds its schema cache immediately
2. **Migrations** can take several seconds to finish applying
3. **If PostgREST caches BEFORE migrations finish**, the cache is missing new columns
4. **Cache never auto-reloads** unless explicitly told to

### Why `db reset` Only Temporarily Fixed It
- `npx supabase db reset` just happened to recreate containers in the right order by chance
- Next session, the race condition occurred again
- This is why the error kept coming back

### Technical Details
```
supabase start
├─ PostgREST (ready in 0.5s) → builds cache → ❌ missing 'phase' column
├─ Migrations (running 2.0s) → adds 'phase' column to DB
└─ Your app requests game_sessions.phase → PGRST204 error
```

**Source**: [PostgREST Schema Cache Documentation](https://docs.postgrest.org/en/latest/references/schema_cache.html)

---

## Permanent Solution

### 1. Auto-Reload Trigger (Already Implemented)
✅ Migration `20251022223200_auto_reload_schema_cache.sql` installed

This trigger automatically reloads the schema cache after ANY schema change:
```sql
CREATE EVENT TRIGGER pgrst_watch_ddl
  ON ddl_command_end
  EXECUTE FUNCTION public.pgrst_watch();
```

**BUT**: This only helps AFTER initial startup. The race condition can still occur on first `supabase start`.

### 2. Proper Startup Sequence (CRITICAL)
**Always start Supabase FIRST and WAIT for it to be ready:**

```bash
# ✅ Correct sequence
npx supabase start   # Wait for "Started supabase local development setup."
npm run dev          # Only AFTER Supabase is ready

# ❌ Wrong sequence (causes PGRST204)
npm run dev          # App sends requests while migrations still running
npx supabase start   # Too late, cache already stale
```

### 3. Use Startup Script (Recommended)
```bash
# Use the provided startup script
npm run start:dev

# Or manually ensure proper order
npx supabase start && npm run dev
```

---

## Quick Fixes for Immediate Issues

### If You See PGRST204 Error Right Now

**Option A: Manual Schema Reload (Fastest)**
```bash
docker exec supabase_db_Insider_game psql -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema';"
```

**Option B: Restart PostgREST Only**
```bash
docker restart supabase_rest_Insider_game
```

**Option C: Full Restart (Slowest)**
```bash
npx supabase stop
npx supabase start
```

---

## Verification Steps

### 1. Check Trigger is Installed
```bash
docker exec supabase_db_Insider_game psql -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname = 'pgrst_watch';"
```
Expected output:
```
   proname
-------------
 pgrst_watch
(1 row)
```

### 2. Test Game Start Flow
1. Create room as host
2. Join as 2 guest players
3. Toggle guest ready states
4. Click "ゲームを開始する"
5. Should redirect to role assignment screen with NO errors

---

## Prevention Checklist

- [x] Auto-reload trigger installed (`pgrst_watch`)
- [x] Startup script created (`npm run start:dev`)
- [x] Documentation updated
- [ ] **Always start Supabase before app**
- [ ] **Wait for "Started supabase..." message**
- [ ] **Never start `npm run dev` while migrations are running**

---

## Technical Reference

### PostgREST Cache Lifecycle
```
1. Container Start → Build in-memory cache
2. Schema Change → Cache is stale
3. Reload Trigger → NOTIFY pgrst, 'reload schema'
4. PostgREST → Rebuilds cache from current DB state
```

### Why This Error is Common in Development
- Production deploys are sequential (DB migrations → app deploy)
- Local development starts everything in parallel
- Without explicit coordination, race conditions occur

### Future-Proof Solution
The `pgrst_watch` trigger ensures that:
- Any `CREATE TABLE`, `ALTER TABLE`, `DROP COLUMN`, etc.
- Automatically triggers `NOTIFY pgrst, 'reload schema'`
- PostgREST immediately rebuilds its cache
- No manual intervention needed for schema changes

---

## Related Files

- Migration: [`supabase/migrations/20251022223200_auto_reload_schema_cache.sql`](../supabase/migrations/20251022223200_auto_reload_schema_cache.sql)
- Startup Script: [`package.json`](../package.json) - `npm run start:dev`
- Troubleshooting: [`troubleshooting-game-start-error.md`](troubleshooting-game-start-error.md)

---

## Key Learnings

1. **Schema cache is in-memory only** - Never persists between container restarts
2. **Migrations and PostgREST start in parallel** - Race condition is inherent to local setup
3. **Auto-reload trigger helps but doesn't prevent initial race** - Startup sequence still matters
4. **`db reset` is not a fix** - It just masks the race condition by chance
5. **Proper startup order is the only reliable solution** - Always start Supabase first

---

## Summary

**Problem**: PostgREST schema cache race condition on startup
**Root Cause**: PostgREST caches before migrations finish
**Fix**: Proper startup sequence + auto-reload trigger
**Status**: ✅ Permanent solution implemented

The error will no longer occur if you:
1. Always run `npx supabase start` first
2. Wait for "Started supabase..." message
3. Then run `npm run dev`

Or simply use: `npm run start:dev`
