/**
 * Constraint Satisfaction Problem (CSP) Solver for Lesson Scheduling
 * 
 * This module implements an efficient CSP solver that works with minute-precision
 * TimeBlocks instead of boolean grids. It uses backtracking search with constraint
 * propagation, MRV and LCV heuristics for optimal performance.
 * 
 * Performance target: 50 students scheduled in < 2 seconds
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import type {
  TimeBlock,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  LessonAssignment,
  ScheduleSolution
} from './types';

import type {
  ConstraintManager,
  SolverContext
} from './constraints';
import {
  createConstraintManager
} from './constraints';

import {
  findAvailableSlots,
  isTimeAvailable
} from './utils';

import type {
  OptimizationConfig
} from './optimizations';
import {
  PreprocessingOptimizer,
  CacheManager,
  IncrementalSolver,
  ParallelSearchManager,
  EarlyTerminationManager,
  PerformanceMonitor,
  createOptimalConfig
} from './optimizations';

// ============================================================================
// CSP-SPECIFIC TYPES
// ============================================================================

/**
 * Represents a CSP variable (a student that needs scheduling)
 */
export type Variable = {
  studentId: string;
  studentConfig: StudentConfig;
  domain: TimeSlot[]; // Available time slots for this student
  constraints: string[]; // IDs of constraints affecting this variable
}

/**
 * A possible time slot assignment for a student
 */
export type TimeSlot = {
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
  score?: number; // Heuristic score for ordering
}

/**
 * An assignment of a variable to a value
 */
export type Assignment = {
  variable: Variable;
  timeSlot: TimeSlot;
  violationCost: number;
}

/**
 * Domain for a variable (all possible time slot assignments)
 */
export type Domain = {
  variableId: string;
  timeSlots: TimeSlot[];
  isReduced: boolean; // Whether constraint propagation has been applied
}

/**
 * Search strategy interface for different solving approaches
 */
export interface SearchStrategy {
  readonly name: string;
  
  /**
   * Search for a solution using this strategy
   */
  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null;
}

/**
 * Configuration options for the solver
 */
export type SolverOptions = {
  /** Maximum time to spend searching (milliseconds) */
  maxTimeMs?: number;
  
  /** Maximum number of backtracks before giving up */
  maxBacktracks?: number;
  
  /** Whether to use constraint propagation */
  useConstraintPropagation?: boolean;
  
  /** Whether to use heuristic ordering */
  useHeuristics?: boolean;
  
  /** Search strategy to use */
  searchStrategy?: 'backtracking' | 'local-search' | 'hybrid';
  
  /** Whether to find optimal solution or just any valid solution */
  optimizeForQuality?: boolean;
  
  /** Custom constraints to enable/disable */
  enabledConstraints?: string[];
  
  /** Logging level for debugging */
  logLevel?: 'none' | 'basic' | 'detailed';
  
  /** Performance optimization configuration */
  optimizationConfig?: OptimizationConfig;
  
  /** Whether to enable performance optimizations */
  enableOptimizations?: boolean;
}

/**
 * Statistics about the solving process
 */
export type SolverStats = {
  totalVariables: number;
  totalDomainSize: number;
  backtracks: number;
  constraintChecks: number;
  timeMs: number;
  strategy: string;
  solutionQuality: number; // 0-100, higher is better
}

// ============================================================================
// MAIN SOLVER CLASS
// ============================================================================

/**
 * Main CSP solver for lesson scheduling
 */
export class ScheduleSolver {
  private constraints: ConstraintManager;
  private searchStrategy: SearchStrategy;
  private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { 
    optimizationConfig?: OptimizationConfig;
    enabledConstraints: string[];
  };
  private stats: SolverStats;
  private startTime = 0;
  
  // Performance optimization components
  private preprocessing?: PreprocessingOptimizer;
  private caching?: CacheManager;
  private incrementalSolver?: IncrementalSolver;
  private parallelSearch?: ParallelSearchManager;
  private earlyTermination?: EarlyTerminationManager;
  private performanceMonitor?: PerformanceMonitor;

  constructor(options: SolverOptions = {}) {
    this.options = {
      maxTimeMs: options.maxTimeMs ?? 10000, // 10 seconds default
      maxBacktracks: options.maxBacktracks ?? 1000,
      useConstraintPropagation: options.useConstraintPropagation ?? true,
      useHeuristics: options.useHeuristics ?? true,
      searchStrategy: options.searchStrategy ?? 'backtracking',
      optimizeForQuality: options.optimizeForQuality ?? false,
      enabledConstraints: options.enabledConstraints ?? [],
      logLevel: options.logLevel ?? 'none',
      optimizationConfig: options.optimizationConfig ?? undefined,
      enableOptimizations: options.enableOptimizations ?? true
    };

    this.constraints = createConstraintManager(this.options.enabledConstraints);
    this.searchStrategy = this.createSearchStrategy(this.options.searchStrategy);
    
    // Initialize optimization components if enabled
    if (this.options.enableOptimizations) {
      this.initializeOptimizations();
    }
    
    this.stats = {
      totalVariables: 0,
      totalDomainSize: 0,
      backtracks: 0,
      constraintChecks: 0,
      timeMs: 0,
      strategy: this.options.searchStrategy,
      solutionQuality: 0
    };
  }

  /**
   * Main solve method - converts problem to CSP and finds solution
   */
  solve(
    teacher: TeacherConfig,
    students: StudentConfig[]
  ): ScheduleSolution {
    this.startTime = Date.now();
    this.log('basic', `Starting solver with ${students.length} students`);

    // Start performance monitoring if enabled
    if (this.performanceMonitor) {
      this.performanceMonitor.startMonitoring();
    }

    // Check for early termination setup
    if (this.earlyTermination) {
      this.earlyTermination.startTracking();
    }

    try {
      // Check if we can use incremental solving
      let reusableAssignments: LessonAssignment[] = [];
      if (this.incrementalSolver) {
        const incrementalResult = this.incrementalSolver.canUseIncrementalSolving(teacher, students);
        if (incrementalResult.canUse) {
          reusableAssignments = incrementalResult.reusableAssignments;
          this.log('basic', `Using incremental solving: ${reusableAssignments.length} assignments reused`);
        }
      }

      // Convert to CSP representation
      let variables = this.createVariables(students);
      let domains = this.createDomains(teacher, students);
      const context = this.createSolverContext(teacher, students, reusableAssignments);

      this.stats.totalVariables = variables.length;
      this.stats.totalDomainSize = domains.reduce((sum, d) => sum + d.timeSlots.length, 0);

      this.log('detailed', `Created ${variables.length} variables, total domain size: ${this.stats.totalDomainSize}`);

      // Apply preprocessing optimizations
      if (this.preprocessing) {
        const preprocessed = this.preprocessing.preprocess(variables, domains, teacher, context);
        variables = preprocessed.variables;
        domains = preprocessed.domains;
        this.log('detailed', `Preprocessing reduced domain size to: ${domains.reduce((sum, d) => sum + d.timeSlots.length, 0)}`);
      }

      // Apply incremental solving if applicable
      let fixedAssignments: LessonAssignment[] = [];
      if (this.incrementalSolver && reusableAssignments.length > 0) {
        const incrementalResult = this.incrementalSolver.applyIncrementalSolving(variables, domains, reusableAssignments);
        variables = incrementalResult.variables;
        domains = incrementalResult.domains;
        fixedAssignments = incrementalResult.fixedAssignments;
      }
      
      // Debug domain sizes
      for (const domain of domains) {
        this.log('detailed', `Student ${domain.variableId}: ${domain.timeSlots.length} time slots available`);
      }

      // Apply constraint propagation to reduce search space
      if (this.options.useConstraintPropagation) {
        this.propagateConstraints(variables, domains, context);
      }

      // Search for solution using parallel search if available
      let assignments: Assignment[] | null = null;
      if (this.parallelSearch && this.options.searchStrategy === 'backtracking') {
        // TODO: Implement proper parallel search integration
        assignments = this.searchStrategy.search(variables, domains, context, this.constraints);
      } else {
        assignments = this.searchStrategy.search(variables, domains, context, this.constraints);
      }

      // Build and return solution
      const solution = this.buildSolution(assignments, students, fixedAssignments);
      
      this.stats.timeMs = Date.now() - this.startTime;
      this.stats.solutionQuality = this.calculateSolutionQuality(solution);

      // Store solution for future incremental solving
      if (this.incrementalSolver && solution.assignments.length > 0) {
        this.incrementalSolver.storeSolution(solution, teacher, students);
      }

      // Record performance metrics
      if (this.performanceMonitor) {
        this.performanceMonitor.recordSolution(solution, this.stats.timeMs);
        this.performanceMonitor.updateOptimizationStats(
          this.preprocessing,
          this.caching,
          this.incrementalSolver,
          this.parallelSearch,
          this.earlyTermination
        );
      }
      
      this.log('basic', `Solution found: ${solution.assignments.length}/${students.length} students scheduled`);
      
      return solution;

    } catch (error) {
      this.log('basic', `Solver error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return empty solution on error
      return this.buildSolution(null, students, []);
    }
  }

  /**
   * Convert students to CSP variables
   */
  private createVariables(students: StudentConfig[]): Variable[] {
    return students.map(student => ({
      studentId: student.person.id,
      studentConfig: student,
      domain: [], // Will be populated in createDomains
      constraints: this.getRelevantConstraints(student)
    }));
  }

  /**
   * Create domains (possible time slots) for each variable
   */
  private createDomains(teacher: TeacherConfig, students: StudentConfig[]): Domain[] {
    const domains: Domain[] = [];

    for (const student of students) {
      const timeSlots: TimeSlot[] = [];
      
      // Get preferred duration, fallback to constraints if not specified
      const duration = student.preferredDuration ?? teacher.constraints.allowedDurations[0] ?? 60;
      
      // For each day of the week
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const teacherDay = teacher.availability.days[dayOfWeek];
        const studentDay = student.availability.days[dayOfWeek];
        
        if (!teacherDay || !studentDay) continue;

        // Find available slots for both teacher and student
        const teacherSlots = findAvailableSlots(teacherDay, duration);
        
        for (const slot of teacherSlots) {
          // Check if student is also available at this time
          if (isTimeAvailable(studentDay, slot.start, duration)) {
            timeSlots.push({
              dayOfWeek,
              startMinute: slot.start,
              durationMinutes: duration
            });
          }
        }
      }

      domains.push({
        variableId: student.person.id,
        timeSlots,
        isReduced: false
      });
    }

    return domains;
  }

  /**
   * Create solver context with all necessary information
   */
  private createSolverContext(
    teacher: TeacherConfig,
    students: StudentConfig[],
    existingAssignments: LessonAssignment[]
  ): SolverContext {
    const studentAvailability = new Map<string, WeekSchedule>();
    const studentPreferences = new Map<string, { 
      preferredDuration: number;
      preferredTimes?: TimeBlock[];
      maxLessonsPerWeek: number;
    }>();

    for (const student of students) {
      studentAvailability.set(student.person.id, student.availability);
      studentPreferences.set(student.person.id, {
        preferredDuration: student.preferredDuration,
        maxLessonsPerWeek: student.maxLessonsPerWeek
      });
    }

    return {
      teacherAvailability: teacher.availability,
      studentAvailability,
      existingAssignments,
      constraints: teacher.constraints,
      studentPreferences
    };
  }

  /**
   * Apply constraint propagation to reduce domain sizes
   */
  private propagateConstraints(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext
  ): void {
    this.log('detailed', 'Applying constraint propagation');

    let changed = true;
    while (changed) {
      changed = false;

      for (const domain of domains) {
        if (domain.isReduced) continue;

        const originalSize = domain.timeSlots.length;
        
        // Filter out time slots that violate hard constraints
        domain.timeSlots = domain.timeSlots.filter(slot => {
          const assignment: LessonAssignment = {
            studentId: domain.variableId,
            dayOfWeek: slot.dayOfWeek,
            startMinute: slot.startMinute,
            durationMinutes: slot.durationMinutes
          };

          return this.constraints.isValidAssignment(assignment, context);
        });

        if (domain.timeSlots.length !== originalSize) {
          changed = true;
        }

        domain.isReduced = true;
      }
    }

    this.log('detailed', 'Constraint propagation complete');
  }

  /**
   * Initialize optimization components based on configuration
   */
  private initializeOptimizations(): void {
    const config = this.options.optimizationConfig ?? createOptimalConfig(0); // Will be updated with actual student count

    this.preprocessing = new PreprocessingOptimizer(config);
    this.caching = new CacheManager(config);
    this.incrementalSolver = new IncrementalSolver(config);
    this.parallelSearch = new ParallelSearchManager(config);
    this.earlyTermination = new EarlyTerminationManager(config);
    this.performanceMonitor = new PerformanceMonitor();

    this.log('detailed', 'Optimization components initialized');
  }

  /**
   * Perform a search branch for parallel execution
   */
  private performSearchBranch(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    branchId: number
  ): Assignment[] | null {
    // Create a copy of the search strategy for this branch
    const branchStrategy = this.createSearchStrategy(this.options.searchStrategy);
    
    // Add some randomization for different branches
    if (branchId > 0) {
      // Shuffle domain values slightly for different branches
      domains.forEach(domain => {
        if (domain.timeSlots.length > 1 && Math.random() < 0.3) {
          const shuffledSlots = [...domain.timeSlots];
          for (let i = shuffledSlots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledSlots[i], shuffledSlots[j]] = [shuffledSlots[j]!, shuffledSlots[i]!];
          }
          domain.timeSlots = shuffledSlots;
        }
      });
    }

    return branchStrategy.search(variables, domains, context, this.constraints);
  }

  /**
   * Build final solution from assignments
   */
  private buildSolution(
    assignments: Assignment[] | null,
    students: StudentConfig[],
    fixedAssignments: LessonAssignment[] = []
  ): ScheduleSolution {
    const solution: ScheduleSolution = {
      assignments: [],
      unscheduled: [],
      metadata: {
        totalStudents: students.length,
        scheduledStudents: 0,
        averageUtilization: 0,
        computeTimeMs: Date.now() - this.startTime
      }
    };

    // Add fixed assignments from incremental solving
    solution.assignments.push(...fixedAssignments);
    const scheduled = new Set<string>(fixedAssignments.map(a => a.studentId));

    if (!assignments) {
      // No new solution found - only use fixed assignments if any
      for (const student of students) {
        if (!scheduled.has(student.person.id)) {
          solution.unscheduled.push(student.person.id);
        }
      }
      solution.metadata.scheduledStudents = solution.assignments.length;
      return solution;
    }

    // Convert new assignments to lesson assignments
    for (const assignment of assignments) {
      solution.assignments.push({
        studentId: assignment.variable.studentId,
        dayOfWeek: assignment.timeSlot.dayOfWeek,
        startMinute: assignment.timeSlot.startMinute,
        durationMinutes: assignment.timeSlot.durationMinutes,
        timestamp: new Date()
      });
      
      scheduled.add(assignment.variable.studentId);
    }

    // Find unscheduled students
    for (const student of students) {
      if (!scheduled.has(student.person.id)) {
        solution.unscheduled.push(student.person.id);
      }
    }

    solution.metadata.scheduledStudents = solution.assignments.length;
    
    // Calculate utilization (basic implementation)
    if (solution.assignments.length > 0) {
      const totalMinutes = solution.assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
      const averageLesson = totalMinutes / solution.assignments.length;
      solution.metadata.averageUtilization = Math.min(100, (averageLesson / 60) * 100);
    }

    return solution;
  }

  /**
   * Create appropriate search strategy based on configuration
   */
  private createSearchStrategy(strategy: string): SearchStrategy {
    switch (strategy) {
      case 'backtracking':
        return new BacktrackingSearchStrategy(this.options, () => this.stats);
      case 'local-search':
        return new LocalSearchStrategy(this.options, () => this.stats);
      case 'hybrid':
        return new HybridSearchStrategy(this.options, () => this.stats);
      default:
        return new BacktrackingSearchStrategy(this.options, () => this.stats);
    }
  }

  /**
   * Get constraint IDs that are relevant for a specific student
   */
  private getRelevantConstraints(_student: StudentConfig): string[] {
    // All constraints are potentially relevant
    return this.constraints.getAllConstraints().map(c => c.id);
  }

  /**
   * Calculate solution quality score (0-100)
   */
  private calculateSolutionQuality(solution: ScheduleSolution): number {
    if (solution.assignments.length === 0) {
      return 0;
    }

    const scheduledRatio = solution.metadata.scheduledStudents / solution.metadata.totalStudents;
    const utilizationBonus = solution.metadata.averageUtilization / 100;
    
    return Math.round((scheduledRatio * 80 + utilizationBonus * 20) * 100) / 100;
  }

  /**
   * Logging utility
   */
  private log(level: 'basic' | 'detailed', message: string): void {
    if (this.options.logLevel === 'none') return;
    if (level === 'detailed' && this.options.logLevel !== 'detailed') return;
    
    const timestamp = Date.now() - this.startTime;
    console.log(`[Solver +${timestamp}ms] ${message}`);
  }

  /**
   * Get solver statistics
   */
  getStats(): SolverStats {
    return { ...this.stats };
  }

  /**
   * Get performance report if optimizations are enabled
   */
  getPerformanceReport() {
    if (!this.performanceMonitor) {
      throw new Error('Performance monitoring is not enabled. Set enableOptimizations: true in SolverOptions.');
    }
    return this.performanceMonitor.generateReport();
  }
}

// ============================================================================
// SEARCH STRATEGIES
// ============================================================================

/**
 * Backtracking search with MRV and LCV heuristics
 */
class BacktrackingSearchStrategy implements SearchStrategy {
  readonly name = 'backtracking';
  
  private startTime = 0;
  
  constructor(
    private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { optimizationConfig?: OptimizationConfig; enabledConstraints: string[] },
    private getStats: () => SolverStats
  ) {}

  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    this.startTime = Date.now();
    const assignments: Assignment[] = [];
    const domainMap = new Map<string, Domain>();
    
    // Create domain lookup
    for (const domain of domains) {
      domainMap.set(domain.variableId, domain);
    }

    // Start backtracking search
    if (this.backtrack(variables, domainMap, assignments, context, constraints)) {
      return assignments;
    }

    return null;
  }

  private backtrack(
    variables: Variable[],
    domains: Map<string, Domain>,
    assignments: Assignment[],
    context: SolverContext,
    constraints: ConstraintManager
  ): boolean {
    // Check timeout
    if (Date.now() - this.startTime > this.options.maxTimeMs) {
      return false;
    }

    // Check backtrack limit
    let stats = this.getStats();
    if (stats.backtracks >= this.options.maxBacktracks) {
      return false;
    }

    // Base case: all variables assigned
    if (assignments.length === variables.length) {
      return true;
    }

    // Select next variable using MRV heuristic
    const variable = this.selectVariable(variables, assignments, domains);
    if (!variable) return false;

    const domain = domains.get(variable.studentId);
    if (!domain) return false;

    // Order values using LCV heuristic
    const orderedSlots = this.options.useHeuristics 
      ? this.orderValues(domain.timeSlots, context, constraints)
      : domain.timeSlots;

    // Try each value
    for (const timeSlot of orderedSlots) {
      const assignment: Assignment = {
        variable,
        timeSlot,
        violationCost: 0
      };

      // Create lesson assignment for constraint checking
      const lessonAssignment: LessonAssignment = {
        studentId: variable.studentId,
        dayOfWeek: timeSlot.dayOfWeek,
        startMinute: timeSlot.startMinute,
        durationMinutes: timeSlot.durationMinutes
      };

      // Update context with current assignment
      const newContext = this.updateContext(context, assignments.concat([assignment]));

      // Check constraints
      stats = this.getStats();
      stats.constraintChecks++;
      const violations = constraints.checkConstraints(lessonAssignment, newContext);
      
      // Skip if hard constraints violated
      if (violations.some(v => v.constraintType === 'hard')) {
        continue;
      }

      // Add assignment and recurse
      assignment.violationCost = constraints.getViolationCost(violations);
      assignments.push(assignment);

      if (this.backtrack(variables, domains, assignments, newContext, constraints)) {
        return true;
      }

      // Backtrack
      assignments.pop();
      stats = this.getStats();
      stats.backtracks++;
    }

    return false;
  }

  /**
   * Select next variable using Most Constrained Variable (MRV) heuristic
   */
  private selectVariable(
    variables: Variable[],
    assignments: Assignment[],
    domains: Map<string, Domain>
  ): Variable | null {
    const assigned = new Set(assignments.map(a => a.variable.studentId));
    const unassigned = variables.filter(v => !assigned.has(v.studentId));
    
    if (unassigned.length === 0) return null;

    if (!this.options.useHeuristics) {
      return unassigned[0] ?? null;
    }

    // MRV: choose variable with smallest domain
    let minDomainSize = Infinity;
    let selectedVariable: Variable | null = null;

    for (const variable of unassigned) {
      const domain = domains.get(variable.studentId);
      if (domain && domain.timeSlots.length < minDomainSize) {
        minDomainSize = domain.timeSlots.length;
        selectedVariable = variable;
      }
    }

    return selectedVariable ?? null;
  }

  /**
   * Order values using Least Constraining Value (LCV) heuristic
   */
  private orderValues(
    timeSlots: TimeSlot[],
    _context: SolverContext,
    _constraints: ConstraintManager
  ): TimeSlot[] {
    if (!this.options.useHeuristics) {
      return timeSlots;
    }

    // LCV: prefer values that constrain other variables the least
    // For now, use a simple scoring based on time of day preference
    return timeSlots.map(slot => ({
      ...slot,
      score: this.calculateSlotScore(slot)
    })).sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  /**
   * Calculate a heuristic score for a time slot
   */
  private calculateSlotScore(slot: TimeSlot): number {
    let score = 0;
    
    // Prefer mid-day slots (10am-4pm)
    const hour = Math.floor(slot.startMinute / 60);
    if (hour >= 10 && hour <= 16) {
      score += 10;
    }
    
    // Prefer weekdays over weekends
    if (slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5) {
      score += 5;
    }
    
    // Prefer standard lesson durations
    if ([30, 45, 60, 90].includes(slot.durationMinutes)) {
      score += 5;
    }
    
    return score;
  }

  /**
   * Update solver context with new assignments
   */
  private updateContext(context: SolverContext, assignments: Assignment[]): SolverContext {
    const existingAssignments = assignments.map(a => ({
      studentId: a.variable.studentId,
      dayOfWeek: a.timeSlot.dayOfWeek,
      startMinute: a.timeSlot.startMinute,
      durationMinutes: a.timeSlot.durationMinutes
    }));

    return {
      ...context,
      existingAssignments: context.existingAssignments.concat(existingAssignments)
    };
  }
}

/**
 * Local search strategy (placeholder for future implementation)
 */
class LocalSearchStrategy implements SearchStrategy {
  readonly name = 'local-search';
  
  constructor(
    private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { optimizationConfig?: OptimizationConfig; enabledConstraints: string[] },
    private getStats: () => SolverStats
  ) {}

  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    // TODO: Implement local search strategy
    // For now, fallback to backtracking
    const backtracking = new BacktrackingSearchStrategy(this.options, this.getStats);
    return backtracking.search(variables, domains, context, constraints);
  }
}

/**
 * Hybrid search strategy (placeholder for future implementation)
 */
class HybridSearchStrategy implements SearchStrategy {
  readonly name = 'hybrid';
  
  constructor(
    private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { optimizationConfig?: OptimizationConfig; enabledConstraints: string[] },
    private getStats: () => SolverStats
  ) {}

  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    // TODO: Implement hybrid strategy (backtracking + local search)
    // For now, fallback to backtracking
    const backtracking = new BacktrackingSearchStrategy(this.options, this.getStats);
    return backtracking.search(variables, domains, context, constraints);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a solver with optimal settings for typical studio sizes
 */
export function createOptimalSolver(studentCount: number): ScheduleSolver {
  const options: SolverOptions = {
    maxTimeMs: studentCount <= 20 ? 5000 : studentCount <= 50 ? 10000 : 30000,
    maxBacktracks: studentCount * 50,
    useConstraintPropagation: true,
    useHeuristics: true,
    searchStrategy: 'backtracking',
    optimizeForQuality: studentCount <= 30,
    logLevel: 'basic',
    enableOptimizations: true,
    optimizationConfig: createOptimalConfig(studentCount)
  };

  return new ScheduleSolver(options);
}

/**
 * Quick solve function with sensible defaults
 */
export function solveSchedule(
  teacher: TeacherConfig,
  students: StudentConfig[],
  options?: SolverOptions
): ScheduleSolution {
  const solver = options ? new ScheduleSolver(options) : createOptimalSolver(students.length);
  return solver.solve(teacher, students);
}

/**
 * Validate that teacher and students have compatible availability
 */
export function validateInputs(teacher: TeacherConfig, students: StudentConfig[]): string[] {
  const errors: string[] = [];
  
  // Check if teacher has any available time blocks
  const teacherHasAvailability = teacher.availability?.days?.some(day => day.blocks?.length > 0);
  if (!teacherHasAvailability) {
    errors.push('Teacher has no availability set');
  }
  
  if (students.length === 0) {
    errors.push('No students to schedule');
  }
  
  let studentsWithoutAvailability = 0;
  for (const student of students) {
    const studentHasAvailability = student.availability?.days?.some(day => day.blocks?.length > 0);
    if (!studentHasAvailability) {
      studentsWithoutAvailability++;
    }
  }
  
  if (studentsWithoutAvailability > 0) {
    errors.push(`${studentsWithoutAvailability} students have no availability set`);
  }
  
  return errors;
}