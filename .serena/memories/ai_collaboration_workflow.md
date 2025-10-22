# AI Collaboration Workflow

## Three-Way Collaboration Model

**CRITICAL**: All implementation work must follow this collaboration pattern:
- **User**: Decision maker, requirements owner
- **Claude Code**: Implementation executor, task manager
- **Gemini**: Technical researcher, latest docs, Google Search
- **o3**: Architectural advisor, deep reasoning, Bing Search
- **Codex**: Implementation guide, code optimization (MANDATORY for /sc: commands)

## Mandatory Consultation Pattern

### When to Consult Gemini + o3

**ALWAYS consult BOTH in parallel for**:
1. New feature planning
2. Architecture decisions
3. Technical approach validation
4. Error troubleshooting (if Claude stuck)
5. Library/framework selection
6. Performance optimization strategies
7. Security implementation guidance
8. Testing strategy design

**Ask in parallel** - don't wait for one to finish:
```typescript
// ✅ Good - Parallel consultation
Promise.all([
  askGemini('How to optimize Next.js 15 bundle size?'),
  askO3('What are architectural trade-offs for XState vs Zustand?')
]);

// ❌ Bad - Sequential consultation (wastes time)
const geminiAnswer = await askGemini('...');
const o3Answer = await askO3('...');
```

### /sc: Command Codex Requirement

**MANDATORY**: All `/sc:` slash commands MUST use Codex at least once:
- `/sc:implement` - Use Codex for implementation strategy
- `/sc:load` - Use Codex for session restoration strategy (already implemented)
- `/sc:save` - Use Codex for session state optimization
- Any future `/sc:` commands - Include Codex consultation

**Pattern**:
```typescript
// 1. Call Codex first with user prompt context
const codexGuidance = await mcp__codex__codex({
  prompt: `User request: ${userPrompt}\nProject context: ${projectContext}`
});

// 2. Apply Codex recommendations
implementWithCodexGuidance(codexGuidance);
```

## Tool Selection Matrix

| Need | Tool | Command |
|------|------|---------|
| Latest Next.js patterns | Gemini | `mcp gemini-cli googleSearch "Next.js 15 App Router SSR"` |
| Library documentation | Gemini | `mcp gemini-cli googleSearch "XState 5 TypeScript setup"` |
| Debugging approach | Gemini | `mcp gemini-cli googleSearch "Supabase Realtime connection issues"` |
| Architecture validation | o3-low | `mcp o3-low o3-search "Is XState overkill for this state?"` |
| Design trade-offs | o3-low | `mcp o3-low o3-search "Argon2 vs bcrypt for passphrase hashing"` |
| Deep reasoning | o3 | `mcp o3 o3-search "How to prevent race conditions in voting?"` |
| High reasoning | o3-high | `mcp o3-high o3-search "Optimize database schema for scale"` |
| Implementation guide | Codex | `mcp codex --prompt "Implement feature X"` |
| /sc: commands | Codex | `mcp codex --prompt "Execute /sc:load command"` |

## Workflow Patterns

### Pattern 1: New Feature Implementation

```
1. User Request
   "Add real-time player list updates"

2. Claude Planning
   - Break down into steps
   - Identify unknowns

3. Parallel AI Consultation
   Gemini: "Next.js 15 + Supabase Realtime best practices"
   o3-low: "Should we use Presence API or Broadcast?"

4. Synthesize Recommendations
   - Gemini: Use Presence API for automatic heartbeat
   - o3-low: Broadcast is simpler but requires manual heartbeat
   - Decision: Use Presence API (less complexity)

5. Implementation (Claude)
   - Write code based on guidance
   - Follow project conventions
   - Add tests

6. Validation
   - Run checks (lint, build, test)
   - Verify with user
```

### Pattern 2: Error Debugging

```
1. Error Occurs
   "Supabase Realtime channel not receiving messages"

2. Initial Troubleshooting (Claude)
   - Check Supabase status
   - Verify channel subscription
   - Check RLS policies

3. If Stuck → Consult Gemini
   Gemini: "Supabase Realtime troubleshooting Next.js"
   → Finds: Need to enable Realtime on table in Studio

4. Apply Fix
   - Enable Realtime on table
   - Test again

5. If Still Stuck → Consult o3
   o3-low: "Why would Supabase Realtime work locally but not in production?"
   → Deep analysis: Anon key vs service role key permissions
```

### Pattern 3: Architecture Decision

```
1. Decision Needed
   "How to handle timer synchronization across clients?"

2. Research (Gemini)
   Gemini: "Client-side timer synchronization best practices"
   → Finds: Epoch-based timestamps, NTP sync, server heartbeat

3. Deep Analysis (o3)
   o3: "Compare epoch-based vs NTP for browser game timers"
   → Analysis: Epoch simpler, NTP overkill for 5-minute timers

4. Implementation Guidance (Codex)
   Codex: "Implement epoch-based timer with drift correction"
   → Provides: Code patterns, optimization suggestions

5. Validation (Claude)
   - Implement chosen approach
   - Add tests for clock drift scenarios
   - Document decision in code comments

6. User Approval
   - Present approach
   - Get confirmation
   - Proceed
```

## Question Optimization

### Good Gemini Questions
```
✅ "Next.js 15 App Router Server Actions error handling patterns"
✅ "Supabase Row Level Security for multi-tenant apps"
✅ "Playwright multi-context testing best practices"
✅ "XState 5 TypeScript setup with React"
```

### Good o3 Questions
```
✅ "Should I use XState or Zustand for game phase management? Trade-offs?"
✅ "Is Argon2id necessary for 3-10 character passphrases? Security analysis."
✅ "How to prevent vote race conditions: Advisory locks vs unique constraints?"
✅ "Database schema optimization: Normalize topics table or denormalize?"
```

### Good Codex Questions
```
✅ "Implement role assignment with Fisher-Yates shuffle and previous Master exclusion"
✅ "Optimize bundle size for Next.js 15 app with XState and Zustand"
✅ "Create comprehensive E2E test for 5-player game flow"
✅ "Execute /sc:implement command for authentication feature"
```

### Bad Questions (Too Vague)
```
❌ "How to fix my app?"
❌ "Is this good?"
❌ "What should I do next?"
```

## Synthesizing Recommendations

When Gemini and o3 provide different advice:

1. **Understand Context**
   - Gemini: Latest docs, common patterns
   - o3: Deep reasoning, trade-off analysis
   - Codex: Implementation optimization, code quality

2. **Identify Conflicts**
   - Gemini says use Server Components
   - o3 says use Client Components for this case
   - Analyze WHY each recommends differently

3. **Make Informed Decision**
   - Consider project constraints (mobile-first, real-time)
   - Prioritize: Security > Performance > Developer Experience
   - Document decision reasoning

4. **Present to User**
   - Summarize both perspectives
   - Recommend best fit for project
   - Get user approval if significant

## Error Handling

### Gemini/o3/Codex Errors

**If Gemini fails**:
```
1. Retry with simplified query
2. If still fails, use o3 as backup
3. If both fail, document assumption and proceed
```

**If o3 fails**:
```
1. Retry with different phrasing
2. Use o3-low for lighter reasoning
3. Fall back to Gemini for research
4. Use Codex for implementation guidance
```

**If Codex fails**:
```
1. Retry with more specific context
2. Break down into smaller tasks
3. Use direct implementation without Codex
4. Document limitations
```

### Rate Limiting
If hitting rate limits:
- Space out queries (wait 10s between calls)
- Batch related questions together
- Prioritize critical decisions over nice-to-haves

## Best Practices

### DO
✅ Ask both Gemini and o3 in parallel
✅ Use Codex for all /sc: commands (MANDATORY)
✅ Provide context in questions (project tech stack, constraints)
✅ Synthesize recommendations before implementing
✅ Document AI-informed decisions
✅ Present approach to user before large changes
✅ Use specific, technical questions

### DON'T
❌ Skip AI consultation for "trivial" decisions (they often aren't)
❌ Blindly follow one AI's recommendation without considering others
❌ Ask vague questions ("Is this good?")
❌ Implement without user approval on architecture changes
❌ Use built-in WebSearch (use Gemini/o3 instead)
❌ Forget Codex for /sc: commands

## Session Pattern

Typical development session:

```
1. /sc:load
   - Loads project context (with Codex consultation)

2. User Request
   "Add voting functionality"

3. Parallel Consultation
   - Gemini: "React voting UI patterns with real-time updates"
   - o3-low: "Database design for vote tallying with tie-breaking"

4. Planning
   - TodoWrite tasks based on AI recommendations
   - Document approach

5. Implementation
   - Follow task list
   - Apply AI guidance
   - Write tests

6. Validation
   - Run checks
   - E2E test
   - User review

7. /sc:save
   - Save session context for next time
```

## Quick Reference

**Before Any Implementation**:
1. Consult Gemini for latest patterns
2. Consult o3 for architecture validation
3. Use Codex for /sc: commands (MANDATORY)
4. Synthesize recommendations
5. Present approach to user
6. Implement with TodoWrite tracking

**When Stuck**:
1. Check error messages
2. Consult Gemini for troubleshooting
3. If still stuck, consult o3 for deep analysis
4. Try Codex for implementation alternatives
5. Document findings

**For /sc: Commands**:
1. MUST call Codex with user prompt context
2. Apply Codex recommendations
3. Proceed with command execution
4. This is non-negotiable for all /sc: commands
