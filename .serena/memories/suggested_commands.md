# Suggested Commands - Insider Game

## Development

### Start Development Server
```bash
npm run dev
# Starts Next.js dev server at http://localhost:3000
# Includes hot module replacement
```

### Build for Production
```bash
npm run build
# Creates optimized production build
# Verifies TypeScript types and ESLint rules
```

### Start Production Server (Local)
```bash
npm run start
# Runs production build locally
# Requires `npm run build` first
```

## Code Quality

### Linting
```bash
npm run lint
# Runs ESLint with jsx-a11y plugin
# Checks TypeScript, React, accessibility rules
```

### Formatting
```bash
npm run format
# Runs Prettier on all files
# Config: semi, singleQuote, printWidth 100
```

### Type Checking
```bash
npx tsc --noEmit
# Runs TypeScript compiler without emitting files
# Strict mode enabled
```

## Testing

### Unit Tests (Vitest)
```bash
npm run test              # Run unit tests
npm run test:ui           # Interactive UI mode
npm run test:coverage     # Coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive debugging
npm run test:e2e:headed   # Headed browser mode
npm run test:e2e -- --grep "smoke"  # Run specific tests
```

### Load Tests (Artillery)
```bash
npm run test:load         # Full 240-player load test (17 min)
npm run test:load:quick   # Quick 10-user test
```

### Performance (Lighthouse)
```bash
npm run lhci              # Full Lighthouse CI run
npm run lhci:collect      # Collect reports only
npm run lhci:assert       # Assert against budgets
```

## Supabase (Local Development)

### Start Supabase Local
```bash
cd /Users/masaki/Documents/Projects/Insider_game
supabase start
# Starts 12 Docker containers (PostgreSQL, Auth, Realtime, etc.)
# Studio: http://127.0.0.1:54323
```

### Stop Supabase
```bash
supabase stop
# Stops all containers
```

### Database Migrations
```bash
supabase db reset         # Reset local DB to initial state
supabase db diff          # Generate migration from changes
supabase db push          # Apply migrations
```

### Generate TypeScript Types
```bash
npx supabase gen types typescript --local > lib/supabase/database.types.ts
# Regenerates types from current schema
```

## Git Workflow

### Check Status
```bash
git status
git branch
# ALWAYS check before starting work
```

### Create Feature Branch
```bash
git checkout -b feature/your-feature-name
# NEVER work on main/master directly
```

### Commit Changes
```bash
git add .
git diff --cached        # Review staged changes
git commit -m "type: message"
# Commit types: feat, fix, docs, chore, test, refactor
```

## Pre-Task Completion Checklist

Before marking any task as complete, run:

```bash
# 1. Lint & format
npm run lint
npm run format

# 2. Type check
npx tsc --noEmit

# 3. Build verification
npm run build

# 4. Run relevant tests
npm run test              # Unit tests
npm run test:e2e          # E2E tests

# 5. Git status
git status
```

## Debugging

### Supabase Studio
```bash
# Open: http://127.0.0.1:54323
# View tables, run SQL queries, check RLS policies
```

### Browser DevTools
- Network tab: Check API calls and Realtime subscriptions
- Console: Check for errors and warnings
- Application tab: Inspect localStorage, cookies

### Playwright Debugging
```bash
npm run test:e2e:ui       # Visual debugging
npm run test:e2e:headed   # See browser actions
npx playwright show-report  # View test report
```

## System Utilities (macOS)

### File Operations
```bash
ls -la                    # List files with details
find . -name "*.ts"       # Find TypeScript files
grep -r "pattern" .       # Search in files
```

### Process Management
```bash
lsof -i :3000             # Check what's using port 3000
kill -9 <PID>             # Kill process by ID
```

### Docker (Supabase)
```bash
docker ps                 # List running containers
docker logs <container>   # View container logs
docker stop $(docker ps -q)  # Stop all containers
```

## Quick Reference

**Most Common Commands**:
1. `npm run dev` - Start development
2. `npm run lint` - Check code quality
3. `npm run test:e2e` - Run E2E tests
4. `npm run build` - Verify production build
5. `supabase start` - Start local backend
