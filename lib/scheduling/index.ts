/**
 * New TimeBlock-Based Scheduling System
 * 
 * A comprehensive CSP (Constraint Satisfaction Problem) solver for lesson scheduling
 * that operates on minute-precision TimeBlocks instead of boolean grids.
 * 
 * Key Features:
 * - Minute-level scheduling precision (0-1439 minutes from day start)
 * - Flexible constraint system (hard + soft constraints)
 * - Multiple search strategies (backtracking, local search, hybrid)
 * - Advanced heuristics (MRV, LCV, degree heuristics)
 * - Multi-objective optimization (utilization, balance, preferences)
 * - Performance target: 50 students scheduled in < 2 seconds
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-08-08
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

export type {
  // Time representation
  TimeBlock,
  ScheduleMetadata,
  DaySchedule,
  WeekSchedule,
  
  // Person and configuration types
  Person,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  
  // Solution types
  LessonAssignment,
  ScheduleSolution,
  
  // CSP solver types
  Variable,
  TimeSlot,
  Domain,
  
  // UI-specific types
  CalendarGranularity,
  CalendarProps,
  TimeSelection,
  CalendarInteraction,
  ValidationError,
  CalendarError
} from './types';

// Export aliased solver types for backwards compatibility
export type { Variable as SolverVariable } from './types';

// ============================================================================
// TIME CONVERSION UTILITIES
// ============================================================================

export {
  /**
   * Convert time string "HH:MM" to minutes from day start
   * @example timeStringToMinutes("09:30") // returns 570
   */
  timeStringToMinutes,
  
  /**
   * Convert minutes from day start to "HH:MM" time string
   * @example minutesToTimeString(570) // returns "09:30"
   */
  minutesToTimeString,
  
  /**
   * Convert TimeBlock to readable time range
   * @example blockToTimeRange({start: 570, duration: 90}) // returns ["09:30", "11:00"]
   */
  blockToTimeRange
} from './utils';

// ============================================================================
// SCHEDULE OPERATIONS
// ============================================================================

export {
  /**
   * Merge overlapping or adjacent TimeBlocks into consolidated blocks
   */
  mergeTimeBlocks,
  
  /**
   * Find all available time slots of specific duration within a day schedule
   */
  findAvailableSlots,
  
  /**
   * Check if a specific time slot is available in a day schedule
   */
  isTimeAvailable,
  
  /**
   * Compute metadata for a day schedule (utilization, fragmentation, etc.)
   */
  computeScheduleMetadata
} from './utils';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export {
  /**
   * Validate that a TimeBlock has valid values
   */
  validateTimeBlock,
  
  /**
   * Validate that a WeekSchedule has valid structure and data
   */
  validateWeekSchedule,
  
  /**
   * Detect overlapping TimeBlocks in an array
   */
  detectOverlaps
} from './utils';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export {
  /**
   * Create an empty week schedule with proper structure
   */
  createEmptyWeekSchedule,
  
  /**
   * Clone a week schedule (deep copy)
   */
  cloneWeekSchedule,
  
  /**
   * Get total available minutes across all days in a week schedule
   */
  getTotalAvailableMinutes,
  
  /**
   * Convert minutes to human-readable duration string
   * @example formatDuration(150) // returns "2h 30m"
   */
  formatDuration,
  
  /**
   * Get weekday names for display
   */
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  getDayName,
  
  /**
   * Display formatting utilities
   */
  minutesToDisplayTime,
  generateTimeSlots,
  validateWeekScheduleDetailed
} from './utils';

// ============================================================================
// DATABASE OPERATIONS (Phase 1.2 Integration)
// ============================================================================

export {
  /**
   * Save a week schedule to the database
   * @note Currently placeholder - will be implemented with Drizzle ORM integration
   */
  saveSchedule,
  
  /**
   * Load a week schedule from the database
   * @note Currently placeholder - will be implemented with Drizzle ORM integration
   */
  loadSchedule,
  
  /**
   * Save lesson assignments to the database
   * @note Currently placeholder - will be implemented with Drizzle ORM integration
   */
  saveAssignments
} from './utils';

// ============================================================================
// CSP SOLVER SYSTEM
// ============================================================================

export {
  /**
   * Main CSP solver class for lesson scheduling
   * Supports multiple search strategies and constraint configurations
   */
  ScheduleSolver,
  
  // Solver configuration types
  type SolverOptions,
  type SolverStats,
  type Assignment as SolverAssignment,
  type SearchStrategy as SolverSearchStrategy,
  
  /**
   * Create a solver with optimal settings based on problem size
   * @param studentCount Number of students to schedule
   * @returns Pre-configured ScheduleSolver optimized for the given size
   */
  createOptimalSolver,
  
  /**
   * Quick solve function with sensible defaults
   * @param teacher Teacher configuration and availability
   * @param students Array of student configurations
   * @param options Optional solver configuration
   * @returns Complete schedule solution
   */
  solveSchedule,
  
  /**
   * Validate that teacher and students have compatible availability
   * @returns Array of validation errors (empty if valid)
   */
  validateInputs
} from './solver';

// ============================================================================
// CONSTRAINT SYSTEM
// ============================================================================

export {
  // Core constraint interfaces and types
  type Constraint,
  type ConstraintViolation,
  type SolverContext,
  
  /**
   * Main constraint manager for orchestrating constraint checking
   */
  ConstraintManager,
  
  // Built-in hard constraints (must be satisfied)
  AvailabilityConstraint,
  NonOverlappingConstraint,
  DurationConstraint,
  
  // Built-in soft constraints (preferences with violation costs)
  PreferredTimeConstraint,
  ConsecutiveLimitConstraint,
  BreakRequirementConstraint,
  WorkloadBalanceConstraint,
  
  /**
   * Create a constraint manager with custom configuration
   * @param enabledConstraints Optional array of constraint IDs to enable
   * @param customConstraints Optional array of custom constraints to add
   * @returns Configured ConstraintManager
   */
  createConstraintManager,
  
  /**
   * Validate constraint configuration for correctness
   * @param constraints Array of constraints to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateConstraints
} from './constraints';

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

export {
  // Optimization configuration types
  type OptimizationConfig,
  type PerformanceReport,
  DEFAULT_OPTIMIZATION_CONFIG,
  
  // Core optimizers
  PreprocessingOptimizer,
  CacheManager,
  IncrementalSolver,
  ParallelSearchManager,
  EarlyTerminationManager,
  PerformanceMonitor,
  Benchmarker,
  
  /**
   * Create optimal optimization configuration for given student count
   * @param studentCount Number of students to schedule
   * @returns OptimizationConfig tuned for the given problem size
   */
  createOptimalConfig,
  
  /**
   * Create optimization suite with all optimizers initialized
   * @param config Optional custom optimization configuration
   * @returns Object with all optimizers and monitoring tools
   */
  createOptimizationSuite
} from './optimizations';

// ============================================================================
// SEARCH STRATEGIES
// ============================================================================

export {
  // Core search strategy interfaces
  type SearchStrategy as StrategyInterface,
  type SearchOptions,
  type SearchState,
  type CSPVariable,
  type CSPValue,
  
  // Variable ordering heuristics
  type VariableHeuristic,
  MRVHeuristic,      // Most Constrained Variable
  DegreeHeuristic,   // Most Constraining Variable
  
  // Value ordering heuristics  
  type ValueHeuristic,
  LCVHeuristic,      // Least Constraining Value
  
  // Search strategy implementations
  BacktrackingSearch,  // Systematic search with constraint propagation
  LocalSearch,         // Hill climbing and simulated annealing
  HybridSearch,        // Combined backtracking + local search
  
  // Optimization objectives
  type OptimizationObjective,
  UtilizationObjective,  // Maximize schedule utilization
  BalanceObjective,      // Balance lessons across the week
  PreferenceObjective    // Satisfy student preferences
} from './search-strategies';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export {
  // Database tables
  teachers,
  students, 
  assignments,
  
  // Type inference
  type Teacher,
  type TeacherInsert,
  type Student,
  type StudentInsert,
  type Assignment as DatabaseAssignment,
  type AssignmentInsert
} from './schema';

// ============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a basic solver with default configuration
 * @returns ScheduleSolver with basic settings suitable for small studios (< 20 students)
 */
export function createBasicSolver(): ScheduleSolver {
  return new ScheduleSolver({
    maxTimeMs: 5000,
    maxBacktracks: 500,
    useConstraintPropagation: true,
    useHeuristics: true,
    searchStrategy: 'backtracking',
    optimizeForQuality: false,
    logLevel: 'none'
  });
}

/**
 * Create a high-performance solver for large studios
 * @returns ScheduleSolver optimized for studios with 50+ students
 */
export function createHighPerformanceSolver(): ScheduleSolver {
  return new ScheduleSolver({
    maxTimeMs: 30000,
    maxBacktracks: 5000,
    useConstraintPropagation: true,
    useHeuristics: true,
    searchStrategy: 'hybrid',
    optimizeForQuality: true,
    logLevel: 'basic'
  });
}

/**
 * Create a quality-focused solver that prioritizes solution optimality over speed
 * @returns ScheduleSolver configured for maximum solution quality
 */
export function createQualitySolver(): ScheduleSolver {
  return new ScheduleSolver({
    maxTimeMs: 60000,
    maxBacktracks: 10000,
    useConstraintPropagation: true,
    useHeuristics: true,
    searchStrategy: 'hybrid',
    optimizeForQuality: true,
    logLevel: 'detailed'
  });
}

/**
 * One-line scheduling function for simple use cases
 * Automatically detects problem size and uses appropriate solver configuration
 * @param teacher Teacher with availability and constraints
 * @param students Array of students with availability and preferences
 * @returns ScheduleSolution with assignments and metadata
 * 
 * @example
 * ```typescript
 * const solution = scheduleStudents(teacher, students);
 * console.log(`Scheduled ${solution.assignments.length}/${solution.metadata.totalStudents} students`);
 * ```
 */
export function scheduleStudents(
  teacher: TeacherConfig,
  students: StudentConfig[]
): ScheduleSolution {
  // Validate inputs first
  const validationErrors = validateInputs(teacher, students);
  if (validationErrors.length > 0) {
    return {
      assignments: [],
      unscheduled: students.map(s => s.person.id),
      metadata: {
        totalStudents: students.length,
        scheduledStudents: 0,
        averageUtilization: 0,
        computeTimeMs: 0
      }
    };
  }
  
  // Choose solver based on problem size
  const solver = createOptimalSolver(students.length);
  return solver.solve(teacher, students);
}

/**
 * Quick schedule validation without solving
 * Checks if teacher and students have compatible schedules before attempting to solve
 * @param teacher Teacher configuration
 * @param students Array of student configurations
 * @returns Object with validation results and recommendations
 * 
 * @example
 * ```typescript
 * const validation = validateScheduleInputs(teacher, students);
 * if (!validation.isValid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * ```
 */
export function validateScheduleInputs(
  teacher: TeacherConfig,
  students: StudentConfig[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Basic validation from validateInputs
  errors.push(...validateInputs(teacher, students));

  // Additional checks for better scheduling
  const teacherTotalMinutes = teacher.availability.days.reduce(
    (sum, day) => sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0), 0
  );
  const studentTotalMinutes = students.map(s => 
    s.availability.days.reduce(
      (sum, day) => sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0), 0
    )
  );
  const avgStudentMinutes = studentTotalMinutes.reduce((sum, m) => sum + m, 0) / students.length;

  if (teacherTotalMinutes < avgStudentMinutes) {
    warnings.push('Teacher has less available time than average student - some students may not be schedulable');
  }

  if (students.length > 50) {
    warnings.push('Large number of students may result in longer solve times');
    recommendations.push('Consider using optimizations for better performance');
  }

  // Check for reasonable lesson durations
  const unreasonableDurations = students.filter(s => 
    s.preferredDuration < 15 || s.preferredDuration > 180
  );
  if (unreasonableDurations.length > 0) {
    warnings.push(`${unreasonableDurations.length} students have unusual lesson durations (< 15min or > 3hrs)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export all types for easy access
export * from './types';

// Re-export key functions (avoid namespace conflicts)
export * from './utils';

// Import statements for internal use
import { 
  ScheduleSolver,
  validateInputs,
  createOptimalSolver 
} from './solver';
import type { TeacherConfig, StudentConfig, ScheduleSolution } from './types';