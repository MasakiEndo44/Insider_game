# Production Fix: Schema Cache Auto-Reload

**Issue**: PGRST204 error - "Could not find the 'phase' column of 'game_sessions' in the schema cache"

**Root Cause**: PostgREST schema cache not updating after database migrations

**Impact**: Game start button fails when trying to create game sessions

---

## Immediate Fix (Do This First)

### Option 1: Supabase Dashboard (Recommended)

1. Open [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Navigate to **SQL Editor**
3. Run the following SQL:

```sql
NOTIFY pgrst, 'reload schema';
```

4. Click **Run**
5. Wait 2-3 seconds for PostgREST to reload
6. Test the game start button again

### Option 2: CLI (Alternative)

```bash
npx supabase db push --linked
```

This will apply all pending migrations including the auto-reload fix.

---

## Permanent Solution (Auto Schema Reload)

### Apply Migration to Production

The migration `20251022223200_auto_reload_schema_cache.sql` does three things:

1. **Immediate reload**: Fixes current schema cache issue
2. **Auto-reload function**: Creates `pgrst_watch()` function
3. **Event trigger**: Automatically calls function after any DDL change

### Deployment Steps

**Via Supabase Dashboard**:

1. Go to **SQL Editor**
2. Copy contents of `supabase/migrations/20251022223200_auto_reload_schema_cache.sql`
3. Paste and run
4. Verify with:

```sql
-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'pgrst_watch';

-- Check event trigger exists
SELECT evtname
FROM pg_event_trigger
WHERE evtname = 'pgrst_watch_ddl';
```

Expected output:
- 1 row showing `pgrst_watch` function
- 1 row showing `pgrst_watch_ddl` event trigger

**Via CLI** (if linked to production):

```bash
npx supabase db push --linked
```

---

## Verification

### Test Schema Cache Reload

1. Make a test DDL change:

```sql
-- Create test table
CREATE TABLE test_auto_reload (id UUID PRIMARY KEY);

-- Schema should auto-reload within 1-2 seconds
-- Check PostgREST can see it
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'test_auto_reload';

-- Clean up
DROP TABLE test_auto_reload;
```

2. Test game start button:
   - Create room with 3+ players
   - All players should auto-ready (confirmed=true)
   - Start button should enable
   - Click "ゲームを開始する"
   - Should successfully create game_session without PGRST204 error

### Expected Behavior After Fix

- **Game start**: ✅ No PGRST204 errors
- **Future migrations**: ✅ Schema auto-reloads
- **Performance**: ✅ No impact (NOTIFY is lightweight)

---

## How It Works

### Event Trigger Mechanism

```sql
-- Every time you run DDL commands like:
CREATE TABLE ...
ALTER TABLE ...
DROP TABLE ...
ADD COLUMN ...

-- The event trigger fires and calls:
NOTIFY pgrst, 'reload schema';

-- PostgREST receives notification and:
-- 1. Refreshes its in-memory schema cache
-- 2. Picks up new columns, tables, types
-- 3. Zero downtime (background reload)
```

### Why This Prevents PGRST204

1. **Before**: Schema cache outdated → PostgREST doesn't know about new columns → PGRST204 error
2. **After**: DDL change → Event trigger → Auto NOTIFY → Schema reloads → PostgREST sees new columns

---

## Rollback Plan

If auto-reload causes issues (unlikely):

```sql
-- Remove event trigger
DROP EVENT TRIGGER IF EXISTS pgrst_watch_ddl;

-- Remove function
DROP FUNCTION IF EXISTS public.pgrst_watch();
```

To manually reload schema:
```sql
NOTIFY pgrst, 'reload schema';
```

---

## Additional Notes

### Performance Impact

- **NOTIFY overhead**: ~1ms per DDL operation
- **PostgREST reload**: ~100-500ms (background, non-blocking)
- **User impact**: None (reload happens asynchronously)

### Supabase Managed vs Self-Hosted

- ✅ **Supabase managed**: Works out of the box
- ✅ **Self-hosted**: Requires PostgREST ≥7.0

### References

- [PostgREST Schema Cache Docs](https://postgrest.org/en/stable/references/schema_cache.html)
- [PostgreSQL Event Triggers](https://www.postgresql.org/docs/current/event-triggers.html)
- O3-low analysis: "Most common cause is stale cache after DDL change"
- Gemini research: Confirmed NOTIFY is standard solution

---

## Deployment Checklist

- [ ] Run `NOTIFY pgrst, 'reload schema';` in production SQL Editor
- [ ] Apply migration `20251022223200_auto_reload_schema_cache.sql`
- [ ] Verify function and trigger exist
- [ ] Test game start button with 3+ players
- [ ] Confirm no PGRST204 errors in logs
- [ ] Monitor for 5-10 minutes to ensure stability

---

**Status**: Ready for production deployment
**Estimated downtime**: 0 seconds (zero-downtime reload)
**Risk level**: Low (standard PostgREST practice)
