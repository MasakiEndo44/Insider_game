# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 【MUST GLOBAL】AI Assistant Integration

**Always consult Gemini, o3, and Codex for comprehensive development support:**
- Use `mcp gemini-cli googleSearch` for technical research and validation
- Use `mcp o3-low o3-search` for design decisions and architectural questions
- Use `mcp codex` for implementation guidance and code optimization
- Consult all three in parallel, optimize questions for each platform
- Never use Claude Code's built-in WebSearch tool

### /sc: Command Codex Integration Requirement
**MANDATORY**: All `/sc:` commands (SuperClaude framework commands) must use Codex at least once per execution based on user prompts:
- `/sc:implement` - Use Codex for implementation strategy and code optimization
- `/sc:load` - Use Codex for session restoration and context analysis
- `/sc:save` - Use Codex for session state optimization and persistence strategy
- Any future `/sc:` commands must include Codex consultation as core requirement

**Implementation Pattern**: Each `/sc:` command should call `mcp__codex__codex` with user prompt context before proceeding with primary task execution.

## Project Overview

COCOSiL is a comprehensive personality diagnosis system that integrates:
- **Taiheki Theory (体癖理論)**: Traditional Japanese body-type personality analysis
- **MBTI**: Myers-Briggs Type Indicator personality assessment  
- **Sanmeigaku (算命学)**: Oriental fortune-telling based on birth date
- **Animal Fortune**: Japanese animal-based personality analysis

**Current Status**: All 4 core features (F001-F004) implemented at 85-95% completion

## Development Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run build           # Production build
npm run lint            # ESLint code quality check
npm run type-check      # TypeScript type validation
npm test                # Run Jest unit tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Test coverage report (80% threshold)
npm run test:e2e        # Playwright E2E tests
npm run format          # Prettier code formatting
npm run analyze         # Bundle analyzer

# Run single test file
npm test -- src/__tests__/path/to/test.test.ts

# Admin utilities
node scripts/seed-admin.js           # Seed admin database
node scripts/check-admin.js          # Verify admin setup
node scripts/update-admin-password.js # Update admin password

# Python utilities (data analysis)
python scripts/analyze_correct_data.py  # Analyze diagnosis data
```

## Architecture & Key Patterns

### Tech Stack
- **Next.js 14 App Router** - Server components preferred over client components
- **TypeScript** - Strict typing, interfaces over types
- **Zustand** - State management for diagnosis data flow
- **Tailwind + shadcn/ui** - Styling and component system
- **OpenAI API** - GPT-4 streaming chat integration
- **MDX** - Learning content with rehype/remark plugins
- **TypeScript Fortune Engine** - Edge Runtime optimized calculation

### State Management (Critical)
The application uses Zustand for cross-component state management:

```typescript
// Main diagnosis store at src/lib/zustand/diagnosis-store.ts
interface DiagnosisStore {
  basicInfo: BasicInfo | null;
  mbti: MBTIResult | null;
  taiheki: TaihekiResult | null;
  fortune: FortuneResult | null;
  progress: ProgressState;
}

// Learning progress store at src/lib/zustand/learning-store.ts
interface LearningStore {
  currentChapter: number;
  completedChapters: number[];
  chapterScores: Record<number, number>;
}
```

### Directory Structure
```
src/
├── app/                     # Next.js 14 App Router
│   ├── diagnosis/           # Main diagnosis flow + results
│   ├── learn/taiheki/       # Learning system (MDX content)
│   ├── admin/               # Admin dashboard + auth
│   ├── api/                 # API routes (OpenAI, fortune calc, admin)
│   └── (sites)/             # Route groups for different site sections
├── ui/
│   ├── features/            # Feature-specific components by domain
│   └── components/          # Shared UI components + shadcn/ui
├── hooks/                   # Custom React hooks (root level)
├── lib/
│   ├── zustand/             # State management stores (diagnosis + learning)
│   ├── data/                # Static data (questions, algorithms)
│   ├── fortune/             # Fortune calculation utilities
│   └── ai/                  # OpenAI client configuration
├── types/                   # TypeScript type definitions
├── content/taiheki/         # MDX content for learning system
└── __tests__/               # Unit tests (Jest + Testing Library)
```

### Path Aliases (tsconfig.json)
- `@/*` → `./src/*`
- `@/components/*` → `./src/ui/components/*`  
- `@/features/*` → `./src/ui/features/*`
- `@/hooks/*` → `./src/hooks/*` (Note: hooks are at root src level, not ui/hooks)
- `@/lib/*` → `./src/lib/*`
- `@/types/*` → `./src/types/*`
- `@/data/*` → `./data/*`
- `@/scripts/*` → `./scripts/*`

## Core Features Implementation

### F001: Main Diagnosis System (85% complete)
- **Entry**: `src/app/diagnosis/page.tsx`
- **Components**: `src/ui/features/forms/basic-info-form.tsx`
- **API**: `src/app/api/fortune-calc-v2/route.ts` (Edge Runtime TypeScript engine)
- **Missing**: Enhanced date validation, API retry logic

### F002: Taiheki Diagnosis (90% complete)
- **Entry**: `src/app/diagnosis/taiheki/page.tsx`
- **Logic**: `src/lib/data/taiheki-questions.ts` (20-question algorithm)
- **Components**: `src/ui/features/diagnosis/taiheki-step.tsx`
- **Missing**: Result image generation (1200x630px PNG)

### F003: Learning System (95% complete)
- **Entry**: `src/app/learn/taiheki/page.tsx`
- **Content**: `src/ui/features/learn/taiheki-chapter-content.tsx`
- **Navigation**: `src/ui/features/learn/taiheki-navigation-sidebar.tsx`
- **State**: `src/lib/zustand/learning-store.ts`

### F004: Admin Dashboard (80% complete)
- **Entry**: `src/app/admin/page.tsx`
- **Auth**: `src/lib/jwt-session.ts`
- **Components**: `src/components/admin/admin-dashboard.tsx`
- **Missing**: Role-based access, Excel export

## Critical Architecture Patterns

### State Management Flow (Zustand)
```typescript
// Diagnosis data flows through centralized store
useDiagnosisStore: BasicInfo → MBTI → Taiheki → Fortune → Integration
// 30-day auto-expiry via localStorage with checkDataExpiry()
// Progress tracking: each step updates completedSteps[] and progress%
```

### Data Privacy Architecture
- **Client-side only**: All personal data in localStorage, never server
- **Encryption**: Sensitive data encrypted before storage
- **Auto-deletion**: 30-day expiry enforced by `checkDataExpiry()`
- **Admin anonymization**: Dashboard shows stats only, no personal data

### MDX Learning System
```typescript
// src/app/learn/taiheki/[chapter]/page.tsx - Dynamic MDX rendering
// src/content/taiheki/ - Learning content with interactive components
// Zustand learning-store tracks progress across chapters
```

## API Integration Patterns

### OpenAI Streaming Chat
```typescript
// src/app/api/ai/chat/route.ts
export async function POST(request: Request) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    // ... configuration
  });
  
  return new Response(
    new ReadableStream({
      // Stream implementation
    })
  );
}
```

### TypeScript Fortune Calculator (Edge Runtime)
```typescript
// src/app/api/fortune-calc-v2/route.ts - Edge Runtime optimized
// Calls: calculateFortuneSimplified() from src/lib/fortune/precision-calculator.ts
// LRU cache with 7-day TTL, supports 50 concurrent users
// Returns: age, western_zodiac, animal_character, six_star
```

### Admin API Security
```typescript
// JWT-based session management in src/lib/jwt-session.ts
// All admin routes protected via middleware
// 4-digit PIN authentication with bcrypt hashing
```

## Testing Strategy

- **Unit Tests**: Jest + Testing Library (`src/__tests__/`)
- **Coverage Target**: 80% branches/functions/lines/statements (jest.config.js)
- **E2E Tests**: Playwright (`tests/e2e/`)
- **Mocking**: MSW for API calls, transformIgnorePatterns for ESM modules
- **Key Test Areas**: 
  - Diagnosis algorithms (`src/lib/data/`)
  - API integrations (`src/app/api/`)
  - Form validation (`src/ui/features/forms/`)
  - Interactive components (`src/ui/components/interactive/`)

### Test File Patterns
- `**/__tests__/**/*.(ts|tsx|js)` - Test directory structure  
- `**/*.(test|spec).(ts|tsx|js)` - Co-located tests

## Privacy & Data Protection

**Critical Requirements:**
- All personal data stored in localStorage with encryption
- 30-day automatic deletion policy
- No server-side storage of personal information
- Admin dashboard shows anonymized data only

## Common Development Tasks

### Adding New Diagnosis Questions
1. Update `src/lib/data/taiheki-questions.ts` or `src/lib/data/mbti-questions.ts`
2. Modify calculation logic in respective algorithm files
3. Update TypeScript types in `src/types/index.ts`
4. Add unit tests for new logic

### Modifying State Management
1. Update store interfaces in `src/lib/zustand/`
2. Ensure actions maintain immutability
3. Update components consuming the state
4. Test state persistence/hydration

### API Route Development
1. Follow existing patterns in `src/app/api/`
2. Implement proper error handling and validation
3. Use Zod schemas for request/response validation
4. Add comprehensive error logging

## MDX Learning System Configuration

The learning system uses MDX with custom plugins for educational content:

```javascript
// next.config.mjs - MDX configuration
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],           // GitHub Flavored Markdown
    rehypePlugins: [rehypeHighlight, rehypeSlug], // Syntax highlighting + slugs
  },
})
```

**MDX Content Structure:**
- `src/content/taiheki/` - Learning chapters as MDX files
- `src/app/learn/taiheki/[chapter]/page.tsx` - Dynamic MDX rendering
- Interactive components embedded in MDX content

## Environment & Configuration

### Required Environment Variables (.env.example)
```bash
OPENAI_API_KEY=your_openai_api_key_here  # GPT-4 streaming chat
ADMIN_PASSWORD=1234                      # 4-digit admin PIN
```

### Security Headers (next.config.mjs)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff` 
- `Referrer-Policy: origin-when-cross-origin`

### Build Requirements
- **TypeScript**: Strict mode, no build errors allowed
- **ESLint**: Must pass during build (ignoreDuringBuilds: false)
- **MDX**: Required for learning system content
- **Node.js**: >=18.0.0

## Deployment Notes

- **Platform**: Vercel (recommended) 
- **Edge Runtime**: Fortune calculation optimized for Edge Runtime
- **Build Validation**: `npm run build` must pass without errors
- **Security**: Environment variables for OpenAI API key, admin credentials

## Important Constraints

- **No Medical Claims**: All results marked as "reference only"
- **Privacy First**: Individual data never used for other purposes  
- **Educational Focus**: Taiheki theory presented as learning content
- **Data Retention**: 30-day automatic deletion enforced
- **Statistical Validity**: Diagnosis algorithms based on established theories

## Key Development Patterns

### Component Organization
- **Feature Components**: Located in `src/ui/features/` organized by domain (diagnosis, forms, learn, admin)
- **Shared UI Components**: Located in `src/ui/components/` for reusable shadcn/ui components
- **Custom Hooks**: Located in `src/hooks/` at root level for cross-feature logic

### State Management Patterns
```typescript
// Zustand stores follow this pattern
interface Store {
  // State
  data: DataType | null;
  
  // Actions
  setData: (data: DataType) => void;
  clearData: () => void;
  
  // Computed values
  isLoading: boolean;
}

// Persistence with localStorage
const useStore = create<Store>()(
  persist(
    (set, get) => ({...}),
    { name: 'store-name' }
  )
);
```

### API Route Patterns
- **Edge Runtime**: Use for performance-critical calculations (`src/app/api/fortune-calc-v2/route.ts`)
- **Streaming**: OpenAI integration uses Server-Sent Events pattern
- **Error Handling**: Consistent error response format with proper HTTP status codes
- **Validation**: Use Zod schemas for request/response validation

### Testing Patterns
- **Unit Tests**: Co-located in `src/__tests__/` directory structure
- **Mock Strategy**: Use MSW for API mocking, avoid jest.mock() when possible  
- **Test Utils**: Custom render functions with providers in test setup
- **Coverage**: Enforce 80% minimum coverage via jest.config.js

### Import Conventions
```typescript
// Preferred import order
import React from 'react';              // External libraries
import { NextRequest } from 'next/server';

import { Button } from '@/components/ui/button';    // UI components
import { useDiagnosisStore } from '@/lib/zustand/diagnosis-store';  // Lib/utilities
import { DiagnosisData } from '@/types';           // Types

import './component.css';               // Styles (last)
```

## Styling & CSS Guidelines (Prevention Rules)

**Critical styling rules to prevent UI regression issues:**

### Tailwind CSS Class Validation
- **ALWAYS verify** Tailwind classes exist before using them in components
- **NEVER use undefined** color tokens like `text-light-fg`, `border-brand-primary` without first defining them in:
  1. `tailwind.config.ts` - Add token definitions with CSS variable references
  2. `src/app/globals.css` - Add corresponding CSS custom properties
- **VALIDATE before commit**: Run `npm run build` to ensure all Tailwind classes compile correctly

### CSS Token Management
```typescript
// Required pattern for new color tokens in tailwind.config.ts
colors: {
  'token-name': 'rgb(var(--token-name) / <alpha-value>)',
}

// Corresponding CSS variables in globals.css
:root {
  --token-name: R G B; /* RGB values space-separated */
}
```

### Pre-Implementation Checklist
**Before adding new styling classes:**
1. Check if token exists in `tailwind.config.ts`
2. Verify CSS variable is defined in `globals.css`
3. Use existing design system tokens when possible
4. Test with `npm run build` before commit

### Common Undefined Class Patterns (AVOID)
```scss
// ❌ NEVER use these undefined patterns:
text-light-fg              // Use: text-muted-foreground or text-secondary-foreground
text-light-fg-muted        // Define in config first or use existing tokens
border-brand-primary       // Use: border-brand-500 or specific brand token
border-brand-300           // Define --brand-300 CSS variable first
bg-surface-light           // Use: bg-surface or define if needed

// ✅ ALWAYS use defined tokens:
text-foreground            // Defined main text color
text-muted-foreground      // Defined muted text color
border-brand-500           // Defined brand border color
bg-surface                 // Defined surface background
```

### Design System Integrity
- **Follow existing patterns**: Check similar components for color token usage
- **Maintain consistency**: Use the established brand color scale (25, 50, 100, 200, 300, 500, 600, 700, 800, 900)
- **Document new tokens**: Add comments in CSS files explaining token purpose

### Debug Commands for Styling Issues
```bash
# Validate Tailwind compilation
npm run build

# Clear Next.js cache if styles not updating
rm -rf .next && npm run dev

# Check for undefined Tailwind classes
grep -r "text-.*undefined\|border-.*undefined\|bg-.*undefined" src/
```