# Task Completion Checklist

## Pre-Completion Verification

Before marking any task as complete, ensure ALL of the following steps are performed:

### 1. Code Quality Checks

#### TypeScript Validation
```bash
npx tsc --noEmit
```
- ✅ Zero TypeScript errors
- ✅ All types properly inferred or declared
- ✅ No `any` types used

#### Linting
```bash
npm run lint
```
- ✅ Zero ESLint errors
- ✅ Minimal warnings (< 5)
- ✅ Accessibility rules passed (jsx-a11y)

#### Formatting
```bash
npm run format
```
- ✅ All files formatted with Prettier
- ✅ Consistent code style (semi, singleQuote, etc.)

### 2. Build Verification

```bash
npm run build
```
- ✅ Build succeeds without errors
- ✅ No unused dependencies warnings
- ✅ Bundle size within budget (< 1 MB)

### 3. Testing

#### Unit Tests (if applicable)
```bash
npm run test
```
- ✅ All existing tests pass
- ✅ New tests written for new logic
- ✅ Edge cases covered

#### E2E Tests (for UI changes)
```bash
npm run test:e2e
```
- ✅ Relevant E2E tests pass
- ✅ No regressions in existing flows
- ✅ Accessibility tests pass

### 4. Git Workflow

#### Status Check
```bash
git status
git branch
```
- ✅ Working on feature branch (NOT main/master)
- ✅ No unexpected files staged
- ✅ Clean working directory

#### Review Changes
```bash
git diff --cached
```
- ✅ Only intended changes included
- ✅ No `console.log` or debug code
- ✅ No commented-out code blocks

### 5. Supabase Verification (if database changes)

```bash
supabase db diff
```
- ✅ Migration file created
- ✅ RLS policies updated if needed
- ✅ Types regenerated (`npx supabase gen types`)

### 6. Documentation

- ✅ Code comments added for complex logic
- ✅ JSDoc added for public functions
- ✅ README or docs updated if needed
- ✅ CURRENT_STATUS.md updated if milestone reached

### 7. AI Consultation Verification

- ✅ Gemini consulted for technical approach (if applicable)
- ✅ o3 consulted for architecture decisions (if applicable)
- ✅ Codex used for /sc: commands (MANDATORY for slash commands)
- ✅ Recommendations synthesized and applied

## Special Cases

### For New Features
- [ ] Feature flag added (if applicable)
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] User feedback (toast/modal) added
- [ ] Analytics events added (if applicable)

### For Bug Fixes
- [ ] Root cause identified and documented
- [ ] Regression test added
- [ ] Fix verified in multiple scenarios
- [ ] Similar bugs checked elsewhere

### For API Changes
- [ ] API route tested with Postman/curl
- [ ] Input validation (Zod schema)
- [ ] Error responses standardized
- [ ] Rate limiting considered

### For UI Changes
- [ ] Mobile responsive (iPhone 12 Pro, Pixel 5)
- [ ] Accessibility (keyboard navigation, ARIA)
- [ ] Color contrast (WCAG 2.2 AA)
- [ ] Loading states
- [ ] Error states

### For Database Changes
- [ ] Migration file created and tested
- [ ] RLS policies added/updated
- [ ] Indexes added for query performance
- [ ] TypeScript types regenerated
- [ ] Rollback plan documented

## Commit Message Format

```
type: brief description

Longer explanation if needed.

- Bullet points for details
- Multiple changes listed

Refs: #issue-number (if applicable)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Build, dependencies, etc.

**Example**:
```
feat: implement role assignment with Fisher-Yates shuffle

- Add assignRoles() function in lib/game/roles.ts
- Exclude previous Master from Master role
- Add unit tests with 100-iteration fairness check

Refs: #23
```

## Final Checklist Summary

Quick reference before marking task complete:

- [ ] `npx tsc --noEmit` ✅
- [ ] `npm run lint` ✅
- [ ] `npm run format` ✅
- [ ] `npm run build` ✅
- [ ] `npm run test` (if applicable) ✅
- [ ] `npm run test:e2e` (if UI changes) ✅
- [ ] `git status` clean ✅
- [ ] On feature branch ✅
- [ ] Gemini/o3/Codex consulted ✅
- [ ] Documentation updated ✅
- [ ] No debug code left ✅

## Post-Completion

### After Task Marked Complete

1. **Update Status**
   ```bash
   # Update CURRENT_STATUS.md if milestone
   # Update TodoWrite with completed status
   ```

2. **Session Checkpoint**
   ```bash
   # If 30+ minutes elapsed, run:
   /sc:save
   ```

3. **Git Commit**
   ```bash
   git add .
   git commit -m "type: description"
   # Do NOT push until explicitly requested
   ```

4. **Review Next Task**
   - Check IMPLEMENTATION_ROADMAP.md
   - Update TodoWrite with next priority
   - Consult Gemini/o3 for next approach

## Troubleshooting

### Build Fails
1. Check TypeScript errors: `npx tsc --noEmit`
2. Check for missing dependencies: `npm install`
3. Clear cache: `rm -rf .next && npm run build`

### Tests Fail
1. Check Supabase running: `supabase status`
2. Reset database: `supabase db reset`
3. Check environment variables: `.env.local`

### Lint Fails
1. Auto-fix: `npm run lint -- --fix`
2. Format: `npm run format`
3. Manual fixes for remaining errors

## Remember

**Quality > Speed**
- Never skip checks to mark tasks "done faster"
- Incomplete tasks create technical debt
- Proper completion saves debugging time later

**When in Doubt**
- Ask user for clarification
- Consult Gemini/o3 for best practices
- Check existing code patterns
