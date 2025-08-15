# Flexible Scheduling System Implementation Plan

## Overview
Complete rewrite of the scheduling system to support minute-level precision scheduling using TimeBlock tuples instead of boolean grids. This eliminates the 30-minute slot constraints and enables truly flexible scheduling.

## Architecture Principles
- **No backward compatibility** - clean slate implementation
- **TimeBlock-based** - (start, duration) tuples represent all time intervals
- **Minute precision** - support any duration and start time
- **CSP solver** - constraint satisfaction problem approach without grids
- **Efficient operations** - optimized for typical studio sizes (20-50 students)

---

# PHASE 1: Data Model & Database
**Goal**: Create the core data structures that all components will use

## 1.1 Core Data Types (2 hours)
Create `lib/scheduling/types.ts`:
```typescript
// Core time representation
type TimeBlock = {
  start: number;    // minutes from day start (0-1439)
  duration: number; // minutes
}

type DaySchedule = {
  dayOfWeek: number; // 0-6, Sunday = 0
  blocks: TimeBlock[]; // sorted by start time
  metadata?: {
    totalAvailable: number;
    largestBlock: number;
    fragmentationScore: number;
  }
}

type WeekSchedule = {
  days: DaySchedule[];
  timezone: string;
}

// Student/Teacher types
type Person = {
  id: string;
  name: string;
  email: string;
}

type StudentConfig = {
  person: Person;
  preferredDuration: number; // minutes
  minDuration?: number;
  maxDuration?: number;
  maxLessonsPerWeek: number;
  availability: WeekSchedule;
}

type TeacherConfig = {
  person: Person;
  studioId: string;
  availability: WeekSchedule;
  constraints: SchedulingConstraints;
}

type SchedulingConstraints = {
  maxConsecutiveMinutes: number;
  breakDurationMinutes: number;
  minLessonDuration: number;
  maxLessonDuration: number;
  allowedDurations: number[]; // e.g., [30, 45, 60, 90]
}

// Assignment result
type LessonAssignment = {
  studentId: string;
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
  timestamp?: Date;
}

type ScheduleSolution = {
  assignments: LessonAssignment[];
  unscheduled: string[]; // student IDs that couldn't be scheduled
  metadata: {
    totalStudents: number;
    scheduledStudents: number;
    averageUtilization: number;
    computeTimeMs: number;
  }
}
```

## 1.2 Database Schema (2 hours)
Create `lib/scheduling/schema.ts`:
```typescript
// New simplified schema without backward compatibility
export const teachers = pgTable('teachers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  studioName: text('studio_name'),
  studioCode: varchar('studio_code', { length: 5 }).unique(),
  availability: jsonb('availability').$type<WeekSchedule>(),
  constraints: jsonb('constraints').$type<SchedulingConstraints>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey(),
  teacherId: uuid('teacher_id').references(() => teachers.id),
  email: text('email').notNull(),
  name: text('name'),
  availability: jsonb('availability').$type<WeekSchedule>(),
  preferredDuration: integer('preferred_duration').default(60),
  maxLessonsPerWeek: integer('max_lessons_per_week').default(1),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').references(() => students.id),
  teacherId: uuid('teacher_id').references(() => teachers.id),
  dayOfWeek: integer('day_of_week').notNull(),
  startMinute: integer('start_minute').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow()
});
```

## 1.3 Utility Functions (3 hours)
Create `lib/scheduling/utils.ts`:
```typescript
// Time conversion utilities
function timeStringToMinutes(time: string): number // "14:30" -> 870
function minutesToTimeString(minutes: number): string // 870 -> "14:30"
function blockToTimeRange(block: TimeBlock): [string, string]

// Schedule operations
function mergeTimeBlocks(blocks: TimeBlock[]): TimeBlock[]
function findAvailableSlots(schedule: DaySchedule, duration: number): TimeBlock[]
function isTimeAvailable(schedule: DaySchedule, start: number, duration: number): boolean
function computeScheduleMetadata(schedule: DaySchedule): ScheduleMetadata

// Validation
function validateTimeBlock(block: TimeBlock): boolean
function validateWeekSchedule(schedule: WeekSchedule): boolean
function detectOverlaps(blocks: TimeBlock[]): TimeBlock[]

// Database operations
async function saveSchedule(schedule: WeekSchedule, ownerId: string): Promise<void>
async function loadSchedule(ownerId: string): Promise<WeekSchedule>
async function saveAssignments(solution: ScheduleSolution): Promise<void>
```

## 1.4 Testing (2 hours)
Create `lib/scheduling/tests/data-model.test.ts`:
- Test all time conversion functions
- Test schedule operations (merge, find slots, etc.)
- Test database save/load operations
- Test validation functions
- Performance benchmarks for typical operations

---

# PHASE 2: Frontend Components
**Goal**: Build UI that allows minute-level schedule input and visualization

## 2.1 Adaptive Calendar Input (4 hours)
Create `src/components/scheduling/AdaptiveCalendar.tsx`:
- **Visual time grid** with customizable granularity (5, 10, 15, 30, 60 min)
- **Click and drag** to create time blocks
- **Direct time input** with text fields "9:00 AM - 10:30 AM"
- **Multi-day selection** for repeating patterns
- **Visual feedback** for constraints (min/max duration)
- **Keyboard shortcuts** for quick entry

Key features:
```typescript
interface AdaptiveCalendarProps {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  constraints?: SchedulingConstraints;
  granularity?: 5 | 10 | 15 | 30 | 60;
  minTime?: string; // "07:00"
  maxTime?: string; // "22:00"
  readOnly?: boolean;
}
```

## 2.2 Schedule Persistence (2 hours)
Create `src/hooks/useSchedule.ts`:
```typescript
// React hook for schedule management
function useSchedule(ownerId: string) {
  const [schedule, setSchedule] = useState<WeekSchedule>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()
  
  // Auto-save with debounce
  const saveSchedule = useDebounce(async (newSchedule: WeekSchedule) => {
    await api.saveSchedule(ownerId, newSchedule)
  }, 1000)
  
  // Load on mount
  useEffect(() => {
    loadSchedule(ownerId)
  }, [ownerId])
  
  return { schedule, updateSchedule, loading, error }
}
```

## 2.3 Schedule Visualization (3 hours)
Create `src/components/scheduling/ScheduleDisplay.tsx`:
- **Week view** with all assignments
- **Day view** with detailed times
- **List view** for mobile
- **Conflict highlighting**
- **Utilization metrics**
- **Export to calendar** (ICS format)

## 2.4 Teacher Dashboard (2 hours)
Update `src/components/teacher-dashboard.tsx`:
- Integrate new AdaptiveCalendar
- Show schedule utilization metrics
- Quick actions (clear day, copy week, etc.)
- Import/export schedule templates

## 2.5 Student Interface (2 hours)
Update `src/components/enrollment.tsx`:
- Student availability input with AdaptiveCalendar
- Preferred lesson duration selector
- Visual confirmation of submitted availability
- View assigned lesson time

## 2.6 Testing (2 hours)
- Component testing with user interactions
- Visual regression testing
- Accessibility testing
- Mobile responsiveness testing

---

# PHASE 3: Constraint Satisfaction Solver
**Goal**: Implement efficient CSP solver without boolean grids

## 3.1 Constraint System (3 hours)
Create `lib/scheduling/constraints.ts`:
```typescript
// Constraint types
interface Constraint {
  id: string;
  type: 'hard' | 'soft';
  priority: number;
  evaluate: (assignment: LessonAssignment, context: SolverContext) => boolean;
  getMessage: () => string;
}

// Hard constraints (must be satisfied)
class AvailabilityConstraint implements Constraint
class NonOverlappingConstraint implements Constraint  
class DurationConstraint implements Constraint

// Soft constraints (preferences)
class PreferredTimeConstraint implements Constraint
class ConsecutiveLimitConstraint implements Constraint
class BreakRequirementConstraint implements Constraint
class WorkloadBalanceConstraint implements Constraint

// Constraint manager
class ConstraintManager {
  addConstraint(constraint: Constraint): void
  checkConstraints(assignment: LessonAssignment): ConstraintViolation[]
  getViolationCost(violations: ConstraintViolation[]): number
}
```

## 3.2 CSP Solver Core (4 hours)
Create `lib/scheduling/solver.ts`:
```typescript
class ScheduleSolver {
  private constraints: ConstraintManager
  private searchStrategy: SearchStrategy
  
  solve(
    teacher: TeacherConfig,
    students: StudentConfig[],
    options?: SolverOptions
  ): ScheduleSolution {
    // Convert to CSP variables and domains
    const variables = this.createVariables(students)
    const domains = this.createDomains(teacher, students)
    
    // Apply constraint propagation
    this.propagateConstraints(variables, domains)
    
    // Search for solution
    const assignments = this.search(variables, domains)
    
    // Build solution object
    return this.buildSolution(assignments)
  }
  
  private search(variables: Variable[], domains: Domain[]): Assignment[] {
    // Backtracking with MRV (Minimum Remaining Values) heuristic
    // and LCV (Least Constraining Value) for value ordering
  }
  
  private propagateConstraints(variables: Variable[], domains: Domain[]): void {
    // Arc consistency (AC-3) algorithm
    // Forward checking for efficiency
  }
}
```

## 3.3 Search Strategies (3 hours)
Create `lib/scheduling/search-strategies.ts`:
```typescript
// Different search strategies for various scenarios
class BacktrackingSearch implements SearchStrategy
class LocalSearch implements SearchStrategy  // For optimization
class HybridSearch implements SearchStrategy    // Combines multiple approaches

// Heuristics
class MRVHeuristic  // Most constrained variable first
class LCVHeuristic  // Least constraining value first
class DegreeHeuristic // Variable involved in most constraints

// Optimization objectives
class UtilizationObjective  // Maximize teacher time usage
class BalanceObjective      // Balance lesson distribution
class PreferenceObjective   // Maximize preference satisfaction
```

## 3.4 Performance Optimizations (2 hours)
Create `lib/scheduling/optimizations.ts`:
- **Preprocessing**: Remove impossible values early
- **Caching**: Memoize constraint evaluations
- **Incremental solving**: Reuse previous solutions
- **Parallel search**: Explore multiple branches simultaneously
- **Early termination**: Stop when "good enough" solution found

## 3.5 Testing & Benchmarking (3 hours)
Create `lib/scheduling/tests/solver.test.ts`:
- Unit tests for each constraint type
- Integration tests with real-world scenarios
- Performance benchmarks:
  - 10 students: < 100ms
  - 30 students: < 500ms
  - 50 students: < 2s
  - 100 students: < 10s
- Stress tests with edge cases
- Solution quality metrics

---

# Implementation Timeline

## Week 1: Phase 1 - Data Model
- Day 1-2: Core data types and database schema
- Day 3: Utility functions
- Day 4: Database operations
- Day 5: Testing and validation

## Week 2: Phase 2 - Frontend
- Day 1-2: Adaptive calendar component
- Day 3: Schedule persistence and hooks
- Day 4: Visualization components
- Day 5: Integration and testing

## Week 3: Phase 3 - Solver
- Day 1: Constraint system
- Day 2-3: CSP solver core
- Day 4: Search strategies and heuristics
- Day 5: Testing and optimization

## Week 4: Integration & Polish
- Day 1-2: Full system integration
- Day 3: Performance optimization
- Day 4: Bug fixes and edge cases
- Day 5: Documentation and deployment

---

# Success Metrics

## Functional Requirements
- ✅ Support any lesson duration (5-minute increments)
- ✅ Support any time range (not limited to 9am-9pm)
- ✅ Minute-level precision in scheduling
- ✅ Real-time schedule updates
- ✅ Cross-session persistence

## Performance Requirements
- ✅ Calendar input responds in < 50ms
- ✅ Schedule saves in < 200ms
- ✅ Solver completes in < 2s for 50 students
- ✅ Page load time < 1s with cached data

## Quality Requirements
- ✅ 95% of students successfully scheduled
- ✅ Zero scheduling conflicts
- ✅ Constraint satisfaction rate > 90%
- ✅ User satisfaction score > 4.5/5

---

# Next Steps

1. **Immediate**: Start with Phase 1.1 - Core Data Types
2. **Validation**: Review types with stakeholders
3. **Prototyping**: Build minimal calendar UI for testing
4. **Iteration**: Refine based on user feedback
5. **Deployment**: Gradual rollout with monitoring