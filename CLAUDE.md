# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint

# Database
pnpx drizzle-kit generate    # Generate database migrations
pnpx drizzle-kit push        # Push schema changes to database
```

## Core Architecture

This is a lesson scheduling application that solves the "many-to-one" scheduling problem using a sophisticated constraint satisfaction approach.

### Scheduling Algorithm Architecture

The core scheduling logic is split between two main solvers:

- **`lib/solver.ts`**: Contains basic solver types and heuristics configuration
- **`lib/heur_solver.ts`**: Main scheduling algorithm using backtracking with constraint satisfaction

The heuristic solver (`heur_solver.ts:112`) converts schedule objects to boolean grids representing 30-minute time slots from 9am-9pm across 7 days. It uses:
- Backtracking search with constraint propagation
- Heuristic ordering (most constrained variable, least constraining value)
- Support for both 30 and 60-minute lesson lengths
- Consecutive lesson grouping based on configurable heuristics

### Data Models and Database

Database schema (`lib/schema.ts`) uses Drizzle ORM with PostgreSQL:
- **Studios**: Teacher-owned lesson groups with unique 5-character codes
- **Students**: Enrolled in studios with individual schedules and lesson length preferences
- **Schedule objects**: JSON stored as `{ [Day]: BlockOfTime[] }` format

Key types in `lib/types.ts`:
- `Time`: Custom time class with comparison methods
- `BlockOfTime`: Start/end time intervals
- `Schedule`: Day-to-timeslots mapping
- `StudentSchedule`: Student + their availability schedule

### Authentication & Routing

- **Supabase** for authentication and database
- **Next.js middleware** (`src/middleware.ts`) protects `/studios/*` routes
- **Session management** via Supabase auth helpers in `_app.tsx`

### Component Architecture

The UI follows a page-based structure:
- **Teacher workflow**: Studios dashboard → Create/manage studios → Set availability → Review schedules
- **Student workflow**: Enrollment page → Set availability → View assigned times
- **Shared components**: Calendar interfaces, form dialogs, schedule displays

Key patterns:
- Calendar components use boolean grid representations matching the solver
- Form validation with React Hook Form + Zod schemas
- Radix UI primitives with Tailwind styling
- Event-driven state updates for real-time schedule changes

### Time Slot Grid System

The application uses a standardized grid system:
- 7 days × 24 half-hour slots (9am-9pm)
- Index calculation: `(hour - 9) * 2 + (minute / 30)`
- Boolean arrays represent availability/assignments
- Conversion utilities between `Schedule` objects and boolean grids

### Solver Heuristics

The `Heuristics` type controls scheduling behavior:
- `numConsecHalfHours`: Maximum consecutive lesson slots before requiring a break
- `breakLenInHalfHours`: Minimum break length between lesson groups

The solver prioritizes:
1. Students with fewer available slots
2. Time slots with fewer student conflicts
3. Maintaining consecutive lesson groupings when beneficial

## Project Management

- Use pnpm