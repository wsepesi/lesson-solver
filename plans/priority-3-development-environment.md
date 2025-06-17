# Priority 3: Development Environment Setup (Parallelized)

**Status:** Medium Priority - Development Infrastructure  
**Estimated Time:** 4-5 hours (with 4 developers in parallel)
**Prerequisites:** Priority 1 (Critical Issues) completed
**Goal:** Establish local development environment with Supabase, improve developer experience, and organize project structure

## 🎯 Current Progress Status

### 🔄 SYNC 1 TARGET (1 hour)
**Target:** Infrastructure foundation setup complete
**Dependencies:** Dev A must complete local Supabase setup
**Status:** Not started - waiting for initialization

### 🔄 SYNC 2 TARGET (3 hours)
**Target:** Core development environment complete
**Dependencies:** Dev A, B, C coordination for shared configs
**Status:** Pending SYNC 1

### 🔄 FINAL MERGE TARGET (4 hours)
**Target:** All tracks complete and integrated
**Dependencies:** All developers complete their tracks
**Status:** Pending prior syncs

## Parallel Development Structure

This plan is structured for **4 developers working in parallel** with minimal dependencies and clear merge points.

### Developer Assignment Strategy
- **Dev A**: Local Supabase Setup & Database Configuration (Critical Path)
- **Dev B**: Development Scripts & Tooling Enhancement
- **Dev C**: Code Organization & Project Structure
- **Dev D**: Documentation & Developer Experience

### Sync Points & Dependencies
- **SYNC 1** (1hr): Local Supabase foundation → All devs can start their tracks
- **SYNC 2** (3hrs): Core environment configs complete → Integration begins
- **FINAL MERGE** (4hrs): All tracks complete → Full environment validation

## Overview

Currently, developers need access to a remote Supabase instance for development, which creates dependencies and potential data conflicts. This plan establishes a complete local development environment and improves the overall developer experience using parallel development practices.

---

## 🔥 DEV A: Local Supabase Setup & Database Configuration (Critical Path)

**Timeline:** 4 hours total
**Dependencies:** None - this is the foundation for other tracks

### Phase A1: Local Supabase Foundation (1hr) → **SYNC 1**

#### Task A1.1: Install Supabase CLI and Docker

**Prerequisites:**
- Docker Desktop installed and running
- Node.js 16+ (already satisfied)

**Steps:**
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Verify Docker is running:
   ```bash
   docker --version
   docker-compose --version
   ```

#### Task A1.2: Initialize Local Supabase Project

**Steps:**
1. Initialize Supabase in project root:
   ```bash
   supabase init
   ```

2. Start local Supabase services:
   ```bash
   supabase start
   ```

3. This creates local services:
   - PostgreSQL database (port 54322)
   - PostgREST API (port 54321) 
   - Supabase Studio (port 54323)
   - Auth service (port 54324)

4. Note the output credentials for local development

### Phase A2: Database Schema & Seeding (3hrs) → **SYNC 2**

#### Task A2.1: Configure Local Database Schema

**Steps:**
1. Create migration from existing schema:
   ```bash
   # Generate migration from current schema
   supabase db diff --file initial_schema
   ```

2. Alternatively, create manual migration in `supabase/migrations/`:
   ```sql
   -- 001_initial_schema.sql
   CREATE TYPE lesson_length AS ENUM ('30', '60');

   CREATE TABLE studios (
       id SERIAL PRIMARY KEY,
       user_id UUID,
       code VARCHAR(5) UNIQUE NOT NULL,
       owner_schedule JSON,
       studio_name TEXT,
       events JSONB
   );

   CREATE TABLE students (
       id SERIAL PRIMARY KEY,
       email TEXT NOT NULL,
       first_name TEXT,
       last_name TEXT,
       studio_id INTEGER REFERENCES studios(id),
       schedule JSON,
       lesson_length lesson_length
   );
   ```

3. Apply migrations:
   ```bash
   supabase db reset
   ```

#### Task A2.2: Seed Local Database

**Create seed script:** `supabase/seed.sql`
```sql
-- Insert test studio
INSERT INTO studios (user_id, code, studio_name, owner_schedule) VALUES 
(
    'test-user-uuid', 
    'TEST1',
    'Test Music Studio',
    '{"Monday": [{"start": {"hour": 9, "minute": 0}, "end": {"hour": 17, "minute": 0}}], "Tuesday": [{"start": {"hour": 9, "minute": 0}, "end": {"hour": 17, "minute": 0}}]}'
);

-- Insert test students
INSERT INTO students (email, first_name, last_name, studio_id, lesson_length, schedule) VALUES
(
    'alice@test.com',
    'Alice',
    'Smith', 
    1,
    '30',
    '{"Monday": [{"start": {"hour": 10, "minute": 0}, "end": {"hour": 12, "minute": 0}}]}'
),
(
    'bob@test.com',
    'Bob',
    'Johnson',
    1, 
    '60',
    '{"Tuesday": [{"start": {"hour": 14, "minute": 0}, "end": {"hour": 16, "minute": 0}}]}'
);
```

#### Task A2.3: Environment Configuration

**Create `.env.local` for local development:**
```env
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_here

# Development flags
NODE_ENV=development
SKIP_ENV_VALIDATION=true
```

**Update `.env.example`:**
```env
# Production Supabase (required for production)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Local Development (use .env.local)
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  
# NEXT_PUBLIC_SUPABASE_ANON_KEY=local_anon_key
```

**Update `.gitignore`:**
```gitignore
# Supabase
.supabase/
supabase/.temp/

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

## 🛠️ DEV B: Development Scripts & Tooling Enhancement

**Timeline:** 4 hours total
**Dependencies:** Waits for SYNC 1 (Supabase foundation)

### Phase B1: Enhanced Development Scripts (2hrs) → **SYNC 2**

#### Task B1.1: Enhanced Package.json Scripts

**Update `package.json`:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase migration up",
    "db:seed": "supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres",
    "db:studio": "supabase studio",
    
    "dev:full": "concurrently \"pnpm db:start\" \"pnpm dev\"",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    
    "clean": "rm -rf .next && rm -rf node_modules/.cache"
  }
}
```

**Install additional dev dependencies:**
```bash
pnpm add -D concurrently prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

#### Task B1.2: Prettier Configuration

**Create `.prettierrc.cjs`:**
```javascript
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
}
```

**Create `.prettierignore`:**
```
.next/
node_modules/
.supabase/
dist/
build/
coverage/
*.md
```

### Phase B2: Enhanced TypeScript & Tooling (2hrs) → **FINAL MERGE**

#### Task B2.1: Enhanced TypeScript Configuration

**Update `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"],
      "lib/*": ["./lib/*"]
    },
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".supabase"]
}
```

---

## 📁 DEV C: Code Organization & Project Structure

**Timeline:** 4 hours total
**Dependencies:** Waits for SYNC 1 (Supabase foundation)

### Phase C1: Project Structure Improvements (2hrs) → **SYNC 2**

#### Task C1.1: Project Structure Improvements

**Create standard directories:**
```bash
mkdir -p src/{hooks,utils,constants,types}
mkdir -p src/components/{forms,layout,ui}
mkdir -p docs
```

**Move files to logical locations:**
1. Move shared types from `lib/types.ts` to `src/types/`
2. Create `src/hooks/` for custom React hooks
3. Create `src/utils/` for shared utilities
4. Organize components by category

#### Task C1.2: Constants and Configuration

**Create `src/constants/index.ts`:**
```typescript
export const TIME_SLOTS = {
  START_HOUR: 9,
  END_HOUR: 21,
  SLOT_DURATION_MINUTES: 30,
  TOTAL_SLOTS: 24,
} as const

export const LESSON_LENGTHS = [30, 60] as const

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const DEFAULT_HEURISTICS = {
  numConsecHalfHours: 4,
  breakLenInHalfHours: 1,
} as const
```

### Phase C2: Custom Hooks & Utilities (2hrs) → **FINAL MERGE**

#### Task C2.1: Custom Hooks

**Create `src/hooks/useSupabase.ts`:**
```typescript
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../types/database'

export const useSupabase = () => {
  return useSupabaseClient<Database>()
}
```

**Create `src/hooks/useStudio.ts`:**
```typescript
import { useState, useEffect } from 'react'
import { useSupabase } from './useSupabase'
import type { StudioSchema } from 'lib/schema'

export const useStudio = (studioId: number) => {
  const [studio, setStudio] = useState<StudioSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = useSupabase()
  
  useEffect(() => {
    // Implementation
  }, [studioId, supabase])
  
  return { studio, loading, error, refetch: () => {} }
}
```

---

## 📚 DEV D: Documentation & Developer Experience

**Timeline:** 4 hours total
**Dependencies:** Waits for SYNC 1 (Supabase foundation)

### Phase D1: Development Documentation (2hrs) → **SYNC 2**

#### Task D1.1: Development Documentation

**Create `docs/development.md`:**
```markdown
# Development Guide

## Quick Start

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy environment template: `cp .env.example .env.local`
4. Start local database: `pnpm db:start`
5. Run development server: `pnpm dev`

## Local Database

### First Time Setup
```bash
pnpm db:start    # Start Supabase services
pnpm db:reset    # Apply schema and seed data
```

### Daily Development
```bash
pnpm dev:full    # Starts both database and Next.js
```

### Database Management
- Studio UI: http://localhost:54323
- Direct DB access: postgresql://postgres:postgres@localhost:54322/postgres
- Reset data: `pnpm db:reset`

## Scripts

- `pnpm dev` - Development server
- `pnpm build` - Production build
- `pnpm test` - Run tests
- `pnpm lint` - Check code style
- `pnpm format` - Format code
- `pnpm type-check` - TypeScript validation

## Project Structure

```
src/
├── components/     # React components
├── pages/         # Next.js pages
├── hooks/         # Custom React hooks
├── utils/         # Shared utilities
├── types/         # TypeScript types
└── constants/     # App constants

lib/               # Business logic
├── solver.ts      # Scheduling algorithms
├── schema.ts      # Database schema
└── types.ts       # Core types
```
```

**Update main `README.md`:**
```markdown
# Lesson Solver

Many-to-one lesson scheduling made easy.

## Development

See [docs/development.md](./docs/development.md) for detailed setup instructions.

### Quick Start
```bash
pnpm install
pnpm db:start
pnpm dev
```

## Testing
```bash
pnpm test          # Unit tests
pnpm test:e2e      # End-to-end tests
pnpm test:coverage # Coverage report
```
```

### Phase D2: VS Code Configuration & Developer Experience (2hrs) → **FINAL MERGE**

#### Task D2.1: VS Code Configuration

**Create `.vscode/settings.json`:**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/.supabase": true
  }
}
```

**Create `.vscode/extensions.json`:**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "ms-playwright.playwright"
  ]
}
```

---

## 📋 Sync Points & Coordination

### SYNC 1 (1 hour) - Infrastructure Foundation
**Who:** Dev A only (critical path)
**What:** Local Supabase services running and accessible
**Merge:** Dev A pushes foundation setup → Others can start their tracks
**Validation:** `supabase start` works, database accessible

### SYNC 2 (3 hours) - Core Environment Complete
**Who:** Dev A (database), Dev B (scripts), Dev C (structure), Dev D (docs)
**What:** All core development environment pieces ready
**Merge:** Coordinated merge of configs and directory structures
**Validation:** Full development workflow functional

### FINAL MERGE (4 hours) - All Tracks Complete
**Who:** All devs
**What:** Complete local development environment
**Merge:** All tracks integrated, conflicts resolved
**Validation:** One-command setup works for new developers

### Branch Strategy
```bash
# Dev A (critical path)
git checkout -b dev-env/supabase-setup

# Dev B
git checkout -b dev-env/scripts-tooling

# Dev C  
git checkout -b dev-env/code-organization

# Dev D
git checkout -b dev-env/documentation

# Merge order: A → B,C,D (parallel) → main
```

---

## 🎯 Verification & Success Criteria

### Local Development Environment
- [ ] Local Supabase services start successfully
- [ ] Database schema matches production
- [ ] Seed data loads correctly
- [ ] Application connects to local database
- [ ] All development scripts work

### Developer Experience
- [ ] One-command setup for new developers
- [ ] Clear documentation for all workflows
- [ ] Consistent code formatting
- [ ] Fast development feedback loop
- [ ] Easy database management

### Code Organization
- [ ] Logical file structure
- [ ] Consistent import paths
- [ ] Shared constants in one place
- [ ] Reusable hooks and utilities
- [ ] Clear separation of concerns

## Troubleshooting

### Common Issues

**Docker not running:**
```bash
# Start Docker Desktop, then:
supabase start
```

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :54321
lsof -i :54322

# Kill conflicting processes or use different ports
```

**Database connection issues:**
```bash
# Reset local database
supabase stop
supabase start
pnpm db:reset
```

**Environment variables not loading:**
1. Ensure `.env.local` exists
2. Restart development server
3. Check file is not in `.gitignore`

### Performance Issues
- Large seed data: Consider smaller test dataset
- Slow builds: Clear `.next` folder
- Database queries: Use Supabase Studio to debug

---

## 📚 Development Guidelines

### Parallel Work Best Practices
1. **Minimal dependencies:** Each track works independently until sync points
2. **Clear coordination:** Dev A foundation enables others; coordinate on shared configs
3. **Consistent patterns:** Follow directory structure and naming conventions
4. **Communication:** Use team channel for blockers and early completion

### Development Environment Standards
1. **Local-first:** Everything should work without external dependencies
2. **One-command setup:** New developers should get running quickly
3. **Consistent tooling:** Shared configs for formatting, linting, TypeScript
4. **Clear documentation:** Every workflow should be documented

### Merge Conflict Prevention
1. **Stay in your lane:** Don't modify files outside your track
2. **Coordinate shared files:** Config files require cross-team approval
3. **Early integration:** Merge at sync points to catch conflicts early
4. **Test integration:** Validate full setup after each merge

---

## 📊 Implementation Log

### Progress Tracking
Use this section to track actual completion times and any issues encountered during implementation.

**SYNC 1 Status:** Not started
**SYNC 2 Status:** Pending
**FINAL MERGE Status:** Pending

---

## Next Steps After Completion

1. All developers should be able to run locally with `pnpm dev:full`
2. CI/CD should use local Supabase for testing
3. Production deployments should use hosted Supabase
4. Database migrations should be version controlled
5. New developer onboarding should take <30 minutes