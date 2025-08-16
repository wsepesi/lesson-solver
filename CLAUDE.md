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

# Database Schema Inspection
# Check remote DB directly with psql
psql postgresql://postgres:[password]@[host]/postgres -c "\d students"

# Testing
pnpm test              # Run unit and integration tests
pnpm test:run          # Run tests once and exit
pnpm test:ui           # Run tests with UI interface
pnpm test:coverage     # Run tests with coverage report
pnpm test:e2e          # Run E2E tests (requires running dev server)
pnpm test:e2e:ui       # Run E2E tests with UI
pnpm test:e2e:headed   # Run E2E tests in headed mode
```

## Core Architecture

This is a lesson scheduling application that solves the "many-to-one" scheduling problem using a sophisticated constraint satisfaction approach. The application uses Next.js 15 App Router with a complete TimeBlock-based scheduling system.

### Scheduling System (✅ IMPLEMENTED)

**Unified TimeBlock CSP solver with minute precision:**
- **TimeBlock**: `{start: minutes, duration: minutes}` - minutes from day start (0-1439)
- **DaySchedule**: Array of TimeBlocks with metadata (total time, largest block, fragmentation)
- **WeekSchedule**: 7 DaySchedules with timezone support
- **CSP Solver**: Complete backtracking search with constraint propagation
- **Advanced Features**: Performance optimizations, parallel search, incremental solving
- **Search Strategies**: Backtracking, local search, hybrid approaches
- **Performance**: Optimized for 50+ students in < 2 seconds

### Frontend Components (✅ IMPLEMENTED)

#### Advanced UI (src/components/scheduling/)
- **AdaptiveCalendar**: ✅ Complete drag/drop calendar with minute precision
- **ScheduleDisplay**: ✅ Display component for viewing schedules
- **Flexible granularity**: 5, 10, 15, 30, or 60-minute visual grids
- **Any time range**: Not limited to 9am-9pm, supports full 24-hour scheduling
- **Real-time editing**: Click to edit, drag to create, direct time entry

#### Standard UI Components (src/components/)
- **InteractiveCalendar**: Grid-based calendar for teacher/student input
- **Calendar/CalendarHandler**: Schedule management components
- **Various dialogs**: SetAvailability, SolveSchedule, ManualSchedule, etc.

### Data Models and Database

#### Current Database Schema
**Production schema used by the application:**
- **studios**: Teacher-owned lesson groups with unique 5-character codes
- **students**: Enrolled students with JSON schedules and lesson length preferences
- **Schedule format**: JSON objects with start/end time objects for database storage

#### Advanced Schema (lib/scheduling/schema.ts) - ✅ AVAILABLE
**Enhanced schema for advanced scheduling features:**
- **teachers**: Teacher profiles with WeekSchedule availability and SchedulingConstraints
- **students**: Student profiles with availability, preferred duration, max lessons per week
- **assignments**: Minute-precision lesson assignments (dayOfWeek, startMinute, durationMinutes)
- **Uses UUIDs**: Enhanced primary keys with proper foreign key relationships

#### Type Systems
**Main Types** (lib/types.ts):
- `TimeBlock`: `{start: number, duration: number}` - minute precision
- `WeekSchedule`: Array of 7 DaySchedules with timezone support
- `StudentConfig`/`TeacherConfig`: Complete configuration objects for CSP solver
- `Schedule`: Day-to-timeslots mapping for database compatibility
- `TimeInterval`: Start/end time intervals

**Scheduling Types** (lib/scheduling/types.ts):
- Advanced CSP solver types
- Constraint system definitions
- Performance optimization types

### Authentication & Routing (✅ IMPLEMENTED)

- **Supabase SSR**: `@supabase/ssr` package for server/client authentication
- **Next.js 15 App Router**: Complete migration with route groups
- **Middleware Protection**: `src/middleware.ts` protects `/studios/*` routes
- **Route Organization**: Clean URL structure with grouped routes

#### App Router Structure
```
src/app/
├── layout.tsx                 # Root layout with auth providers
├── page.tsx                   # Landing page
├── (auth)/                    # Authentication routes
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── loading.tsx
├── (protected)/               # Protected routes requiring auth
│   └── studios/
│       ├── layout.tsx         # Studios layout
│       ├── page.tsx           # Studios dashboard
│       ├── new/page.tsx       # Create studio
│       └── [slug]/page.tsx    # Individual studio
└── enroll/page.tsx           # Public enrollment page
```

### Component Architecture (✅ IMPLEMENTED)

**React Architecture:**
- **Server Components** by default for performance
- **Client Components** ("use client") for interactivity
- **Type Safety**: Full TypeScript with strict mode
- **UI System**: Radix UI primitives + Tailwind CSS
- **Form Handling**: React Hook Form + Zod validation

#### User Workflows
- **Teacher Flow**: Dashboard → Create studio → Set availability → Solve schedule → Review assignments
- **Student Flow**: Enroll via studio code → Set availability → View assigned lessons
- **Admin Features**: Manual scheduling, schedule adjustments, student management

### Scheduling Implementation

#### TimeBlock CSP Solver (lib/scheduling/solver.ts) - ✅ COMPLETE
**Advanced constraint satisfaction problem solver:**
- **Variables**: Each student as a CSP variable with domain of available time slots
- **Constraints**: Pluggable hard/soft constraint system (overlap, breaks, preferences)
- **Search Strategies**: Backtracking with MRV/LCV heuristics, local search, hybrid
- **Performance Optimizations**: 
  - Preprocessing for domain reduction
  - Incremental solving for schedule updates
  - Parallel search branches
  - Early termination detection
  - Intelligent caching system
- **Time Representation**: Minute precision (0-1439 minutes from midnight)
- **Advanced Features**: Multi-objective optimization, constraint violation costs

#### Scheduling Adapter (lib/scheduling-adapter.ts) - ✅ ACTIVE
**Data format conversion and solver interface:**
- **Format Conversion**: Between TimeBlock and database JSON formats
- **Solver Interface**: Streamlined API for components
- **Event Generation**: Convert solutions to calendar events
- **Database Integration**: Handle storage format compatibility

#### Test Generation System (lib/scheduling/test-generator/) - ✅ COMPLETE
**Sophisticated test case generation for algorithm validation:**
- **Generators**: Students, availability patterns, constraints
- **Difficulty Calculator**: Quantifies scheduling problem hardness
- **K-Solution Generator**: Creates problems with known solution counts
- **Examples**: Pre-built test scenarios for common cases

## Technology Stack

**Framework & Core:**
- **Next.js 15.1.4** with App Router and React Server Components
- **React 18.3.1** with TypeScript 5.5.4
- **pnpm** for package management with workspace support

**Database & Auth:**
- **Supabase** for authentication and PostgreSQL database
- **Drizzle ORM 0.44.4** for type-safe database operations
- **Local development** with Supabase CLI and Docker

**UI & Styling:**
- **Radix UI** components for accessibility
- **Tailwind CSS 3.4.10** for styling
- **Lucide React** for icons
- **React Hook Form** with Zod validation

**Testing & Tools:**
- **Vitest 3.2.2** for unit/integration testing (currently disabled)
- **Playwright** for E2E testing
- **ESLint & Prettier** for code quality

## Local Development Setup

### Prerequisites
1. **Docker Desktop** - Required for local Supabase
2. **Node.js 18+** - For Next.js development
3. **pnpm** - Package manager

### Setup Steps
1. **Clone and install dependencies:**
   ```bash
   git clone [repository]
   cd lesson-solver
   pnpm install
   ```

2. **Start local Supabase:**
   ```bash
   supabase start
   ```

3. **Environment setup:**
   Create `.env.local` with local Supabase credentials from `supabase start` output

4. **Start development server:**
   ```bash
   pnpm dev
   ```

### Development URLs
- **Next.js App**: http://localhost:3000
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

## Current Development Status (January 2025)

### ✅ COMPLETED MAJOR MILESTONES
1. **Next.js 15 Migration** - Successfully upgraded from Pages Router to App Router
2. **TimeBlock System** - Complete CSP solver with minute precision implemented
3. **AdaptiveCalendar** - Advanced UI component with drag/drop and direct time entry
4. **Test Infrastructure** - Comprehensive test suite with generators and difficulty analysis
5. **Performance Optimizations** - Advanced caching, incremental solving, parallel search

### 🔄 CURRENT STATE
- **Production System**: Using unified TimeBlock CSP solver (stable, battle-tested)
- **UI**: Both advanced AdaptiveCalendar and standard grid components available
- **Database**: Current schema active, enhanced schema available for advanced features

### 🎯 IMMEDIATE PRIORITIES
1. **Algorithm Bug Fixes** - Address 3 identified real bugs in solver:
   - Mixed lesson length handling (30min + 60min)
   - Multi-day break requirements distribution
   - Constraint violation in tight scheduling scenarios

2. **Test Suite Maintenance** - Comprehensive test suite active with 174 tests across all layers

3. **Performance Monitoring** - Track solver performance in production scenarios

### 📁 Key Implementation Files
- `lib/scheduling/` - Complete TimeBlock system implementation
- `lib/scheduling/solver.ts` - Advanced CSP solver with optimizations
- `lib/scheduling/test-generator/` - Sophisticated test case generation
- `src/components/scheduling/AdaptiveCalendar.tsx` - Advanced calendar UI
- `lib/scheduling-adapter.ts` - Main adapter for data conversion
- `lib/types.ts` - Unified type definitions

### 🚀 ARCHITECTURE NOTES
The application uses a unified scheduling system based on TimeBlock CSP solving with:
- Minute-precision time representation
- Flexible constraint satisfaction
- Advanced UI components
- Database format compatibility layer
- Comprehensive test generation system

Check the remote database with psql whenever you are unsure about the schema.