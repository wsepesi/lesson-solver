# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev             # Start development server (Next.js 15)
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint

# Local Supabase
supabase start       # Start local Supabase services (Docker required)
supabase stop        # Stop local Supabase services
supabase status      # Check status of local services

# Database
pnpx drizzle-kit generate    # Generate database migrations
pnpx drizzle-kit push        # Push schema changes to database

# Testing
pnpm test            # Run tests with vitest in watch mode
pnpm test --run      # Run tests once and exit (recommended for CI/batch testing)
# NOTE: Some complex component tests have been excluded from vitest.config.ts due to hanging issues
# Core algorithm tests, integration tests, and essential component tests are included
```

## Core Architecture

This is a lesson scheduling application that solves the "many-to-one" scheduling problem using a sophisticated constraint satisfaction approach.

### MAJOR REWRITE IN PROGRESS (2025-08-08)

**Moving from boolean grid system to flexible TimeBlock tuples:**
- **OLD SYSTEM**: Fixed 30-minute slots from 9am-9pm using boolean grids (7×24 arrays)
- **NEW SYSTEM**: TimeBlock tuples `{start: minutes, duration: minutes}` with minute-level precision
- **No backward compatibility** - complete rewrite for flexibility

### New Architecture (In Development)

#### Phase 1: Data Model (lib/scheduling/)
- **TimeBlock**: `{start: number, duration: number}` - minutes from day start
- **DaySchedule**: Array of TimeBlocks with metadata (total time, largest block, fragmentation)
- **WeekSchedule**: 7 DaySchedules with timezone support
- **No more grids**: Direct interval representation for efficiency

#### Phase 2: Frontend Components (src/components/scheduling/)
- **AdaptiveCalendar**: Minute-level input with drag/drop and direct time entry
- **Flexible granularity**: 5, 10, 15, 30, or 60-minute visual grids
- **Any time range**: Not limited to 9am-9pm
- **Real-time persistence**: Auto-save with debounce

#### Phase 3: CSP Solver (lib/scheduling/solver.ts)
- **Constraint-based**: Hard constraints (availability, non-overlapping) and soft constraints (preferences, breaks)
- **No boolean operations**: Works directly with time intervals
- **Multiple strategies**: Backtracking, local search, hybrid approaches
- **Performance targets**: 50 students < 2 seconds

### Legacy Architecture (Being Replaced)

The core scheduling logic is split between two main solvers:

- **`lib/solver.ts`**: Contains basic solver types and heuristics configuration
- **`lib/heur_solver.ts`**: Main scheduling algorithm using backtracking with constraint satisfaction

The heuristic solver (`heur_solver.ts:112`) converts schedule objects to boolean grids representing 30-minute time slots from 9am-9pm across 7 days. It uses:
- Backtracking search with constraint propagation
- Heuristic ordering (most constrained variable, least constraining value)
- Support for both 30 and 60-minute lesson lengths
- Consecutive lesson grouping based on configurable heuristics

### Data Models and Database

**NEW SCHEMA** (in development - see lib/scheduling/schema.ts):
- **teachers**: Stores availability as WeekSchedule JSON with constraints
- **students**: Stores availability as WeekSchedule JSON with preferences
- **assignments**: Stores actual lesson assignments with minute precision

**LEGACY SCHEMA** (lib/schema.ts) uses Drizzle ORM with PostgreSQL:
- **Studios**: Teacher-owned lesson groups with unique 5-character codes
- **Students**: Enrolled in studios with individual schedules and lesson length preferences
- **Schedule objects**: JSON stored as `{ [Day]: BlockOfTime[] }` format

Key types in `lib/types.ts` (LEGACY):
- `Time`: Custom time class with comparison methods
- `BlockOfTime`: Start/end time intervals
- `Schedule`: Day-to-timeslots mapping
- `StudentSchedule`: Student + their availability schedule

### Authentication & Routing

- **Supabase** for authentication and database with local development environment
- **Next.js 15 App Router** with route groups for organized URL structure
- **Next.js middleware** (`src/middleware.ts`) protects `/studios/*` routes
- **Session management** via `@supabase/ssr` package with server/client components
- **Protected routes** use `(protected)` route group with authentication layout

### Component Architecture

The UI follows Next.js 15 App Router structure:
- **Route Groups**: `(auth)` for login/signup, `(protected)` for authenticated routes
- **Teacher workflow**: Studios dashboard → Create/manage studios → Set availability → Review schedules
- **Student workflow**: Enrollment page → Set availability → View assigned times
- **Shared components**: Calendar interfaces, form dialogs, schedule displays

Key patterns:
- **Server Components** by default with "use client" for interactive components
- **Module aliases**: `@/*` for src directory, `lib/*` for library files
- Calendar components use boolean grid representations matching the solver
- Form validation with React Hook Form + Zod schemas
- Radix UI primitives with Tailwind styling and RSC support
- Event-driven state updates for real-time schedule changes

### Time Representation Systems

**NEW SYSTEM (TimeBlocks)**:
- Direct minute representation: 0-1439 (minutes from midnight)
- TimeBlock: `{start: number, duration: number}`
- No grid limitations - any time, any duration
- Efficient interval operations (overlap detection, merging)

**LEGACY SYSTEM (Grid-based)**:
- 7 days × 24 half-hour slots (9am-9pm)
- Index calculation: `(hour - 9) * 2 + (minute / 30)`
- Boolean arrays represent availability/assignments
- Conversion utilities between `Schedule` objects and boolean grids

### Solver Approach

**NEW CSP SOLVER** (in development):
- **Variables**: Each student is a variable
- **Domains**: Available TimeBlocks that satisfy constraints
- **Constraints**: Pluggable constraint system (hard/soft)
- **Search**: MRV heuristic, AC-3 propagation, backtracking
- **Optimization**: Multi-objective (utilization, preferences, balance)

**LEGACY HEURISTICS**:
The `Heuristics` type controls scheduling behavior:
- `numConsecHalfHours`: Maximum consecutive lesson slots before requiring a break
- `breakLenInHalfHours`: Minimum break length between lesson groups

The solver prioritizes:
1. Students with fewer available slots
2. Time slots with fewer student conflicts
3. Maintaining consecutive lesson groupings when beneficial

## Project Management

- Use pnpm
- **Local Development**: Requires Docker Desktop for Supabase services
- **Environment**: `.env.local` for local development with Supabase credentials
- **Module Resolution**: Uses `@/*` aliases pointing to `src/*` directory
- **Architecture**: Next.js 15 App Router with React Server Components

## Local Development Setup

1. **Prerequisites**: Install Docker Desktop and ensure it's running
2. **Supabase**: Run `supabase start` to initialize local services
3. **Environment**: Copy `.env.local` with local Supabase credentials
4. **Development**: Run `pnpm dev` to start the development server

The application runs on:
- **Next.js Dev Server**: http://localhost:3000
- **Local Supabase**: http://localhost:54321
- **Supabase Studio**: http://localhost:54323

## Cloud Supabase Setup

**Project**: scheduler-25 (ufwwmolopxkhdiylsntk) - East US (North Virginia)

Connection commands:
```bash
# Link to cloud project
supabase link --project-ref ufwwmolopxkhdiylsntk

# Push schema changes
supabase db push

# Pull latest schema
supabase db pull

# Check connection status
supabase projects list
```

**Note**: The project is already linked and schema is synchronized. Use `USE_CLOUD_DB=true` environment variable when working with drizzle-kit to target cloud database instead of local.

## Current Development Status (2025-08-08)

### Active Work
**Complete rewrite to TimeBlock-based scheduling system**
- Eliminating all boolean grid dependencies
- Moving to minute-precision scheduling with (start, duration) tuples
- No backward compatibility - clean slate implementation

### Implementation Plan
See `/plans/data-model.md` for detailed 3-phase implementation:
1. **Phase 1**: New data model with TimeBlocks (lib/scheduling/)
2. **Phase 2**: Adaptive calendar UI for minute-level scheduling
3. **Phase 3**: CSP solver without grids

### Key Decisions Made
- **Data format**: TimeBlock `{start: minutes, duration: minutes}` where minutes are from day start (0-1439)
- **No grids**: Direct interval operations instead of boolean arrays
- **Flexible constraints**: Pluggable constraint system with hard/soft constraints
- **Performance target**: 50 students solved in < 2 seconds

### Files Created/Modified
- `/plans/data-model.md` - Complete implementation plan
- `/lib/time-utils.ts` - Time utilities (being replaced)
- `/lib/schema-v2.ts` - New database schema (being replaced)
- `/lib/migration/schedule-adapter.ts` - Migration adapter (deprecated)
- `/supabase/migrations/20250808230000_flexible_scheduling.sql` - DB migration (being revised)

### Next Steps
1. Implement core TimeBlock data types in `lib/scheduling/types.ts`
2. Create new database schema without legacy fields
3. Build AdaptiveCalendar component for minute-level input
4. Implement CSP solver with interval-based operations