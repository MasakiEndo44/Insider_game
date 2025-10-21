# 🚨 CRITICAL: Production Deployment Required

## What Was Fixed

**CRITICAL BUG RESOLVED**: Room creation was completely broken due to Row Level Security (RLS) infinite recursion error.

### Root Cause
- Server Actions were using `NEXT_PUBLIC_SUPABASE_ANON_KEY` which enforces RLS policies
- Without authenticated user (`auth.uid()` = null), RLS policies caused infinite recursion
- Production returned 500 errors: "infinite recursion detected in policy for relation 'players'"

### Solution Implemented
1. Created `createServiceClient()` function that uses service role key (bypasses RLS)
2. Updated Server Actions (`createRoom`, `joinRoom`) to use service role client
3. Added `SUPABASE_SERVICE_ROLE_KEY` environment variable validation

### Commits
- `19350db` - RLS fix with service role client
- `bdfb3bc` - Original Supabase integration (had the bug)

---

## ✅ What's Working Now

**Local Development**: Room creation works perfectly
- ✅ Proper UUID generation: `91d0ee93-67fa-4853-9268-2465cb6aab08`
- ✅ No RLS errors
- ✅ Database operations successful

---

## 🔧 Required Action: Add Service Role Key to Vercel

**Code is deployed to GitHub, but Vercel deployment will FAIL without this environment variable.**

### Step 1: Get Production Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **qqvxtmjyrjbzemxnfdwy**
3. Navigate to: **Project Settings → API**
4. Under **Project API keys**, find **`service_role`** key
5. Click **"Reveal"** and copy the key (starts with `eyJ...`)

⚠️  **WARNING**: This is a sensitive key that bypasses all security policies. Never commit to git or expose to client-side code.

### Step 2: Add to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: **insider-game-self**
3. Go to: **Settings → Environment Variables**
4. Add new variable:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (paste the service_role key from Step 1)
   - **Environments**: Select **Production**, **Preview**, and **Development**
5. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment (should be pending or failed)
3. Click **"..."** menu → **Redeploy**

OR

Simply trigger a new deployment:
```bash
git commit --allow-empty -m "trigger deployment with service role key"
git push
```

---

## 🧪 Verification Checklist

After redeployment, test on production: **https://insider-game-self.vercel.app/**

1. Click **"PLAY"** button
2. Enter:
   - 合言葉: `productiontest`
   - プレイヤー名: `VerifyUser`
3. Click **"ルームを作る"**
4. **EXPECTED**: Navigate to `/lobby?roomId=<UUID>&...`
5. **CHECK**:
   - ✅ URL contains valid UUID (36 characters with dashes)
   - ✅ No error message displayed
   - ✅ Lobby page loads (even if empty due to realtime connection issues)

**FAILURE SIGNS**:
- ❌ Error: "invalid input syntax for type uuid"
- ❌ Error: "infinite recursion detected"
- ❌ Error: "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY"
- ❌ URL has 6-character mock ID like `L5MN7V`

---

## 📊 Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Code Fix | ✅ Complete | Committed and pushed (19350db) |
| Local Testing | ✅ Verified | Room creation works with proper UUIDs |
| Production Code | ✅ Deployed | GitHub → Vercel auto-deploy triggered |
| Vercel Env Var | ⏳ **PENDING** | **USER ACTION REQUIRED** |
| Production Test | ⏳ Blocked | Waiting for env var |

---

## 🔍 Technical Details

### Files Changed
1. **lib/supabase/server.ts**: Added `createServiceClient()` for service role operations
2. **lib/env.ts**: Added `SUPABASE_SERVICE_ROLE_KEY` validation
3. **app/actions/rooms.ts**: Changed from `createClient()` to `createServiceClient()`

### Security Notes
- Service role client bypasses Row Level Security (RLS)
- Only used in trusted Server Actions (never exposed to client)
- Required for operations that don't have an authenticated user context
- Alternative would be to restructure RLS policies, but service role is the standard pattern for this use case

### Why This Happened
The original implementation used mock UUID generation (`Math.random().toString(36)`) which was never tested with the real database. When the real Supabase integration was added, it exposed the RLS policy issue that was masked by the mock implementation.

---

## 📝 Next Steps

1. **Immediate**: Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel (see above)
2. **Verify**: Test production room creation (see checklist)
3. **Monitor**: Check Vercel deployment logs for any other env var issues
4. **Cleanup**: Delete test rooms from production database if needed

---

## 🆘 Troubleshooting

### Deployment Still Failing?
Check Vercel deployment logs:
```
Vercel Dashboard → Deployments → Latest → Function Logs
```

Look for:
- `Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY`
- `RLS policy violation`
- `infinite recursion detected`

### Can't Find Service Role Key?
The service role key is **different** from the anon key. Make sure you're copying from the **"service_role"** row in Supabase API settings, not the **"anon"** row.

### Vercel Environment Variable Not Taking Effect?
After adding the env var:
1. Redeploy the project (don't just restart)
2. Environment variables are only loaded during build/deployment
3. May need to wait 1-2 minutes for propagation

---

**Generated**: 2025-10-22
**Commit**: 19350db
**Priority**: 🔴 CRITICAL - Production is broken until this is completed
