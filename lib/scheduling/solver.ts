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
  ScheduleSolution,
  Variable,
  TimeSlot,
  Domain
} from './types';

import type {
  ConstraintManager,
  SolverContext,
  ConstraintViolation
} from './constraints';
import {
  createConstraintManager,
  RelaxedDurationConstraint,
  EmergencyAvailabilityConstraint
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
 * An assignment of a variable to a value
 */
export type Assignment = {
  variable: Variable;
  timeSlot: TimeSlot;
  violationCost: number;
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
  
  /** Time granularity in minutes for slot generation (default: 5) */
  slotGranularityMinutes?: number;
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
  private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints' | 'slotGranularityMinutes'>> & { 
    optimizationConfig?: OptimizationConfig;
    enabledConstraints?: string[];
    slotGranularityMinutes: number;
  };
  private stats: SolverStats;
  private startTime = 0;
  
  // Slot score cache for heuristic optimization
  private slotScoreCache = new Map<string, number>();
  
  // Dynamic heuristic tracking
  private currentSearchDepth = 0;
  private backtrackCount = 0;
  
  // Performance optimization components
  private preprocessing?: PreprocessingOptimizer;
  private caching?: CacheManager;
  private incrementalSolver?: IncrementalSolver;
  private parallelSearch?: ParallelSearchManager;
  private earlyTermination?: EarlyTerminationManager;
  private performanceMonitor?: PerformanceMonitor;

  constructor(options: SolverOptions = {}) {
    this.options = {
      maxTimeMs: options.maxTimeMs ?? 20000, // 20 seconds for large problems (increased from 15)
      maxBacktracks: options.maxBacktracks ?? 100000, // 20x increase for complex scheduling
      useConstraintPropagation: options.useConstraintPropagation ?? true,
      useHeuristics: options.useHeuristics ?? true,
      searchStrategy: options.searchStrategy ?? 'backtracking',
      optimizeForQuality: options.optimizeForQuality ?? false,
      enabledConstraints: options.enabledConstraints ?? undefined,
      logLevel: options.logLevel ?? 'none',
      optimizationConfig: options.optimizationConfig ?? undefined,
      enableOptimizations: options.enableOptimizations ?? true,
      slotGranularityMinutes: options.slotGranularityMinutes ?? 1 // Single-minute precision for edge cases
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

    // Clear slot score cache for fresh solve and reset dynamic heuristic tracking
    this.slotScoreCache.clear();
    this.currentSearchDepth = 0;
    this.backtrackCount = 0;

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
      
      // Get all possible durations for this student
      // Priority: student preference (if allowed), then smart fallback, avoid domain explosion
      let durations: number[];
      if (teacher.constraints.allowedDurations.length > 0) {
        // Check if student preference is allowed
        if (student.preferredDuration && teacher.constraints.allowedDurations.includes(student.preferredDuration)) {
          durations = [student.preferredDuration];
        } else {
          // Student preference not allowed or missing - pick best default from allowed durations
          // Prefer 60min if available, otherwise pick middle duration to avoid extremes
          const allowedSorted = [...teacher.constraints.allowedDurations].sort((a, b) => a - b);
          const preferredFallback = allowedSorted.includes(60) ? 60 : (allowedSorted[Math.floor(allowedSorted.length / 2)] ?? 60);
          durations = [preferredFallback];
        }
      } else {
        // No specific allowed durations, but respect min/max constraints
        const minDuration = teacher.constraints.minLessonDuration || 30;
        const maxDuration = teacher.constraints.maxLessonDuration || 120;
        
        let candidateDuration = student.preferredDuration || 60;
        
        // Adjust candidate duration to fit within min/max bounds
        candidateDuration = Math.max(candidateDuration, minDuration);
        candidateDuration = Math.min(candidateDuration, maxDuration);
        
        durations = [candidateDuration];
      }
      
      // For each possible duration
      for (const duration of durations) {
        // For each day of the week
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          const teacherDay = teacher.availability.days[dayOfWeek];
          const studentDay = student.availability.days[dayOfWeek];
          
          if (!teacherDay || !studentDay) {
            this.log('detailed', `Student ${student.person.id}: Day ${dayOfWeek} - missing schedule (teacher: ${!!teacherDay}, student: ${!!studentDay})`);
            continue;
          }

          // Find available slots for both teacher and student
          const teacherSlots = findAvailableSlots(teacherDay, duration, this.options.slotGranularityMinutes);
          this.log('detailed', `Student ${student.person.id}: Day ${dayOfWeek} - teacher has ${teacherSlots.length} slots for ${duration}min duration`);
          
          for (const slot of teacherSlots) {
            // Check if student is also available at this time
            const studentAvailable = isTimeAvailable(studentDay, slot.start, duration);
            this.log('detailed', `Student ${student.person.id}: Day ${dayOfWeek} - slot ${slot.start}-${slot.start + duration} available: ${studentAvailable}`);
            
            if (studentAvailable) {
              timeSlots.push({
                dayOfWeek,
                startMinute: slot.start,
                durationMinutes: duration
              });
            }
          }
        }
      }

      domains.push({
        variableId: student.person.id,
        timeSlots,
        isReduced: false
      });
      
      this.log('detailed', `Student ${student.person.id} final domain: ${timeSlots.length} time slots`);
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
        return new BacktrackingSearchStrategy(this.options, () => this.stats, this.caching);
      case 'local-search':
        return new LocalSearchStrategy(this.options, () => this.stats, this.caching);
      case 'hybrid':
        return new HybridSearchStrategy(this.options, () => this.stats, this.caching);
      default:
        return new BacktrackingSearchStrategy(this.options, () => this.stats, this.caching);
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
  private currentSearchDepth = 0;
  private backtrackCount = 0;
  
  constructor(
    private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { optimizationConfig?: OptimizationConfig; enabledConstraints?: string[] },
    private getStats: () => SolverStats,
    private caching?: CacheManager
  ) {}

  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    this.startTime = Date.now();
    this.currentSearchDepth = 0;
    this.backtrackCount = 0;
    const domainMap = new Map<string, Domain>();
    
    // Create domain lookup
    for (const domain of domains) {
      domainMap.set(domain.variableId, domain);
    }

    // Implement iterative deepening with constraint relaxation
    return this.iterativeDeepening(variables, domainMap, context, constraints);
  }

  /**
   * Iterative deepening search with constraint relaxation stages
   */
  private iterativeDeepening(
    variables: Variable[],
    domains: Map<string, Domain>,
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    const targetStudents = variables.length;
    let globalBestSolution: Assignment[] = [];
    
    // Stage 1: Try for complete solution with all constraints
    const bestSolution: Assignment[] = [];
    const assignments: Assignment[] = [];
    
    this.backtrack(variables, domains, assignments, context, constraints, bestSolution);
    
    if (bestSolution.length >= targetStudents) {
      return bestSolution; // Perfect solution found
    }
    
    globalBestSolution = [...bestSolution];
    
    // Stage 2: Relax soft constraints if solution quality is too low
    const minAcceptableQuality = Math.floor(targetStudents * 0.5); // Accept 50% as minimum
    if (globalBestSolution.length < minAcceptableQuality) {
      const relaxedConstraints = this.createRelaxedConstraints(constraints, 1);
      const bestSolution2: Assignment[] = [];
      const assignments2: Assignment[] = [];
      
      this.backtrack(variables, domains, assignments2, context, relaxedConstraints, bestSolution2);
      
      if (bestSolution2.length > globalBestSolution.length) {
        globalBestSolution = [...bestSolution2];
      }
    }
    
    // Stage 3: Further relax constraints if still not good enough
    if (globalBestSolution.length < minAcceptableQuality) {
      const veryRelaxedConstraints = this.createRelaxedConstraints(constraints, 2);
      const bestSolution3: Assignment[] = [];
      const assignments3: Assignment[] = [];
      
      this.backtrack(variables, domains, assignments3, context, veryRelaxedConstraints, bestSolution3);
      
      if (bestSolution3.length > globalBestSolution.length) {
        globalBestSolution = [...bestSolution3];
      }
    }
    
    // Stage 4: Emergency fallback - relax almost everything except availability
    if (globalBestSolution.length < Math.max(1, Math.floor(targetStudents * 0.4))) {
      const emergencyConstraints = this.createEmergencyConstraints(constraints);
      const bestSolution4: Assignment[] = [];
      const assignments4: Assignment[] = [];
      
      this.backtrack(variables, domains, assignments4, context, emergencyConstraints, bestSolution4);
      
      if (bestSolution4.length > globalBestSolution.length) {
        globalBestSolution = [...bestSolution4];
      }
    }
    
    return globalBestSolution.length > 0 ? globalBestSolution : null;
  }

  /**
   * Create relaxed constraint manager with reduced requirements
   */
  private createRelaxedConstraints(original: ConstraintManager, level: number): ConstraintManager {
    const relaxedManager = createConstraintManager();
    
    // Clear default constraints and add relaxed versions
    const allConstraints = original.getAllConstraints();
    
    for (const constraint of allConstraints) {
      if (constraint.id === 'availability' || constraint.id === 'non-overlapping') {
        // Always keep hard constraints
        relaxedManager.addConstraint(constraint);
      } else if (constraint.id === 'duration') {
        // Relax duration constraints based on level
        relaxedManager.addConstraint(new RelaxedDurationConstraint(level));
      } else if (level === 1) {
        // Level 1: Keep most soft constraints but with reduced penalties
        if (['preferred-time', 'workload-balance'].includes(constraint.id)) {
          relaxedManager.addConstraint(constraint);
        }
      } else if (level === 2) {
        // Level 2: Only keep workload balance
        if (constraint.id === 'workload-balance') {
          relaxedManager.addConstraint(constraint);
        }
      }
      // Level 3+: Only hard constraints (handled above)
    }
    
    return relaxedManager;
  }

  /**
   * Create emergency constraint manager that only enforces critical constraints
   */
  private createEmergencyConstraints(original: ConstraintManager): ConstraintManager {
    const emergencyManager = createConstraintManager();
    
    // Only keep absolutely essential constraints
    const allConstraints = original.getAllConstraints();
    
    for (const constraint of allConstraints) {
      if (constraint.id === 'availability') {
        // Only availability constraint - even allow some overlaps in emergencies
        emergencyManager.addConstraint(new EmergencyAvailabilityConstraint());
      }
    }
    
    return emergencyManager;
  }

  private backtrack(
    variables: Variable[],
    domains: Map<string, Domain>,
    assignments: Assignment[],
    context: SolverContext,
    constraints: ConstraintManager,
    bestSolution: Assignment[]
  ): boolean {
    // Update best solution if current is better
    if (assignments.length > bestSolution.length) {
      bestSolution.length = 0;
      bestSolution.push(...assignments);
    }

    // Check timeout - but preserve best solution found
    if (Date.now() - this.startTime > this.options.maxTimeMs) {
      return false;
    }

    // Check backtrack limit - but preserve best solution found
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
      : this.basicValueOrdering(domain.timeSlots);

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

      // Check constraints with tentative assignment
      stats = this.getStats();
      stats.constraintChecks++;
      const newContext = this.updateContext(context, assignments); // Don't include the assignment being tested
      
      // Use cache if available
      let violations;
      if (this.caching) {
        const contextHash = this.caching.generateContextHash(newContext);
        violations = this.checkConstraintsWithCache(lessonAssignment, newContext, constraints, contextHash);
      } else {
        violations = constraints.checkConstraints(lessonAssignment, newContext);
      }
      
      
      // Skip if hard constraints violated
      if (violations.some(v => v.constraintType === 'hard')) {
        continue;
      }

      // Add assignment and recurse
      assignment.violationCost = constraints.getViolationCost(violations);
      assignments.push(assignment);
      this.currentSearchDepth = Math.max(this.currentSearchDepth, assignments.length);

      // Update context with the newly added assignment for recursion
      const contextForRecursion = this.updateContext(context, assignments);
      if (this.backtrack(variables, domains, assignments, contextForRecursion, constraints, bestSolution)) {
        return true;
      }

      // Backtrack
      assignments.pop();
      stats = this.getStats();
      stats.backtracks++;
      this.backtrackCount++;
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
      return this.basicVariableOrdering(unassigned, domains);
    }

    // Temporarily disable dynamic heuristic switching for debugging
    /*
    const shouldUseFallbackStrategy = this.shouldUseFallbackHeuristic();

    if (shouldUseFallbackStrategy) {
      return this.basicVariableOrdering(unassigned, domains);
    }
    */

    // MRV with degree heuristic tie-breaker: choose variable with smallest domain,
    // but break ties by choosing the variable that constrains the most other variables
    let minDomainSize = Infinity;
    let maxDegree = -1;
    let selectedVariable: Variable | null = null;

    for (const variable of unassigned) {
      const domain = domains.get(variable.studentId);
      if (!domain) continue;
      
      const domainSize = domain.timeSlots.length;
      const degree = 0; // Temporarily disable degree calculation
      
      // Select if domain is strictly smaller, or if equal domain size but higher degree
      if (domainSize < minDomainSize || 
          (domainSize === minDomainSize && degree > maxDegree)) {
        minDomainSize = domainSize;
        maxDegree = degree;
        selectedVariable = variable;
      }
    }

    return selectedVariable ?? null;
  }

  /**
   * Calculate the degree of a variable (how many other variables it constrains)
   */
  private calculateVariableDegree(
    variable: Variable, 
    unassigned: Variable[], 
    domains: Map<string, Domain>
  ): number {
    let degree = 0;
    const variableDomain = domains.get(variable.studentId);
    if (!variableDomain) return 0;

    // For each other unassigned variable, count how many of its domain values
    // would be eliminated if we assign this variable
    for (const otherVariable of unassigned) {
      if (otherVariable.studentId === variable.studentId) continue;
      
      const otherDomain = domains.get(otherVariable.studentId);
      if (!otherDomain) continue;

      // Count potential conflicts: slots that would be eliminated
      for (const slot of variableDomain.timeSlots) {
        for (const otherSlot of otherDomain.timeSlots) {
          // Check if these slots would conflict (overlap in time)
          if (this.slotsOverlap(slot, otherSlot)) {
            degree++;
            break; // Count this other variable once
          }
        }
      }
    }

    return degree;
  }

  /**
   * Check if two time slots overlap
   */
  private slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return false;
    
    const slot1End = slot1.startMinute + slot1.durationMinutes;
    const slot2End = slot2.startMinute + slot2.durationMinutes;
    
    return slot1.startMinute < slot2End && slot2.startMinute < slot1End;
  }

  /**
   * Order values using Least Constraining Value (LCV) heuristic
   */
  private orderValues(
    timeSlots: TimeSlot[],
    context: SolverContext,
    _constraints: ConstraintManager
  ): TimeSlot[] {
    if (!this.options.useHeuristics) {
      return timeSlots;
    }

    // Temporarily revert to simple scoring
    return timeSlots.map(slot => ({
      ...slot,
      score: this.calculateSlotScore(slot, context)
    })).sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  /**
   * Calculate lookahead score: how many future assignments this slot enables
   */
  private calculateLookaheadScore(slot: TimeSlot, context: SolverContext): number {
    // Simple lookahead: estimate remaining capacity after this assignment
    let score = 0;
    
    // Check remaining time capacity on this day
    const dayAssignments = context.existingAssignments.filter(a => a.dayOfWeek === slot.dayOfWeek);
    const totalAssignedTime = dayAssignments.reduce((sum, a) => sum + a.durationMinutes, 0);
    const daySchedule = context.teacherAvailability.days[slot.dayOfWeek - 1];
    const remainingCapacity = daySchedule?.blocks.reduce((sum, block) => sum + block.duration, 0) ?? 0;
    const futureCapacity = remainingCapacity - totalAssignedTime - slot.durationMinutes;
    
    // Bonus for leaving good capacity for future assignments
    if (futureCapacity >= 60) { // Room for at least one more hour lesson
      score += 5;
    }
    if (futureCapacity >= 120) { // Room for multiple lessons
      score += 10;
    }
    
    // Penalty for using up too much of the day's capacity
    const utilizationRatio = (totalAssignedTime + slot.durationMinutes) / remainingCapacity;
    if (utilizationRatio > 0.8) {
      score -= 5; // Penalty for high utilization
    }
    
    // Bonus for creating good spacing (allows for breaks)
    const slotEnd = slot.startMinute + slot.durationMinutes;
    const hasSpaceBefore = dayAssignments.every(a => 
      a.startMinute >= slotEnd || a.startMinute + a.durationMinutes <= slot.startMinute - 15
    );
    if (hasSpaceBefore) {
      score += 3; // Small bonus for good spacing
    }
    
    return score;
  }

  /**
   * Calculate a heuristic score for a time slot with caching
   */
  private calculateSlotScore(slot: TimeSlot, context?: SolverContext): number {
    // Temporarily disable caching to debug the issue
    // TODO: Re-enable once we fix the core problem
    /*
    const contextKey = context ? 
      `${context.existingAssignments.length}-${context.existingAssignments.map(a => `${a.dayOfWeek}:${a.startMinute}`).sort().join(',')}` : 
      'no-context';
    const cacheKey = `${slot.dayOfWeek}:${slot.startMinute}:${slot.durationMinutes}:${contextKey}`;
    
    const cached = this.slotScoreCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    */
    
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
    
    // Add workload distribution scoring if context is available
    if (context) {
      const sameDayAssignments = context.existingAssignments.filter(
        a => a.dayOfWeek === slot.dayOfWeek
      );
      
      // Penalize overcrowded days more heavily
      const dayPenalty = sameDayAssignments.length * 8;
      score -= dayPenalty;
      
      // Bonus for spreading across multiple days
      const occupiedDays = new Set(context.existingAssignments.map(a => a.dayOfWeek));
      if (!occupiedDays.has(slot.dayOfWeek)) {
        score += 15; // Significant bonus for using a new day
      }
      
      // Check for adequate spacing between lessons on same day
      const sameTimeSlots = sameDayAssignments.filter(a => 
        Math.abs(a.startMinute - slot.startMinute) < 180 // Within 3 hours
      );
      if (sameTimeSlots.length > 0) {
        score -= 12; // Penalty for close scheduling
      }

      // Apply back-to-back preference scoring
      const backToBackPreference = context.constraints.backToBackPreference;
      if (backToBackPreference !== 'agnostic') {
        const slotEnd = slot.startMinute + slot.durationMinutes;
        let hasAdjacentLesson = false;

        // Check for adjacent lessons (back-to-back)
        for (const existing of sameDayAssignments) {
          const existingEnd = existing.startMinute + existing.durationMinutes;
          
          // Check if lessons would be adjacent (no gap between them)
          if (existingEnd === slot.startMinute || // slot comes right after existing
              slotEnd === existing.startMinute) {  // slot comes right before existing
            hasAdjacentLesson = true;
            break;
          }
        }

        // Apply preference scoring - all four cases
        if (backToBackPreference === 'maximize') {
          if (hasAdjacentLesson) {
            score += 25; // Significant bonus for back-to-back scheduling
          } else {
            score -= 15; // Penalty for NOT being back-to-back when we want it
          }
        } else if (backToBackPreference === 'minimize') {
          if (hasAdjacentLesson) {
            score -= 25; // Significant penalty for back-to-back scheduling
          } else {
            score += 15; // Bonus for having gaps when we want them
          }
        }
      }
    }
    
    // Temporarily disable caching
    // this.slotScoreCache.set(cacheKey, score);
    
    return score;
  }

  /**
   * Determine if we should use fallback heuristic strategy
   */
  private shouldUseFallbackHeuristic(): boolean {
    // Switch to simpler heuristics if we're doing too much backtracking
    const backtrackRatio = this.backtrackCount / Math.max(this.currentSearchDepth, 1);
    
    // If backtracking heavily (>2 backtracks per assignment), try simpler approach
    if (backtrackRatio > 2.0) {
      return true;
    }
    
    // If we're very deep in search (>75% of students), use simpler heuristics
    const stats = this.getStats();
    if (stats.totalVariables > 0 && this.currentSearchDepth / stats.totalVariables > 0.75) {
      return true;
    }
    
    return false;
  }

  /**
   * Check constraints using cache when available
   */
  private checkConstraintsWithCache(
    assignment: LessonAssignment,
    context: SolverContext,
    constraints: ConstraintManager,
    contextHash: string
  ): ConstraintViolation[] {
    if (!this.caching) {
      throw new Error('Cache manager is required for checkConstraintsWithCache');
    }
    
    const violations: ConstraintViolation[] = [];
    
    // Get all constraint IDs from the constraint manager
    const constraintIds = constraints.getAllConstraintIds();
    
    for (const constraintId of constraintIds) {
      // Check cache first
      const cachedResult = this.caching.getCachedConstraintResult(assignment, constraintId, contextHash);
      
      if (cachedResult !== null && cachedResult !== undefined) {
        // Cache hit - use cached result
        if (!cachedResult) {
          // Constraint violation was cached - need to get the violation details
          const constraintViolations = constraints.checkSingleConstraint(constraintId, assignment, context);
          violations.push(...constraintViolations);
        }
      } else {
        // Cache miss - evaluate constraint and cache result
        const constraintViolations = constraints.checkSingleConstraint(constraintId, assignment, context);
        const hasViolation = constraintViolations.length > 0;
        
        // Cache the result
        this.caching.setCachedConstraintResult(assignment, constraintId, contextHash, !hasViolation);
        
        if (hasViolation) {
          violations.push(...constraintViolations);
        }
      }
    }
    
    return violations;
  }

  /**
   * Update solver context with new assignments
   */
  private updateContext(context: SolverContext, assignments: Assignment[]): SolverContext {
    const currentPathAssignments = assignments.map(a => ({
      studentId: a.variable.studentId,
      dayOfWeek: a.timeSlot.dayOfWeek,
      startMinute: a.timeSlot.startMinute,
      durationMinutes: a.timeSlot.durationMinutes
    }));

    // Only include current path assignments, not accumulated historical ones
    // The original context.existingAssignments should only contain fixed/pre-existing assignments
    const fixedAssignments = context.existingAssignments.filter(a => 
      !assignments.some(curr => curr.variable.studentId === a.studentId)
    );

    return {
      ...context,
      existingAssignments: fixedAssignments.concat(currentPathAssignments)
    };
  }

  /**
   * Basic variable ordering when heuristics are disabled
   * Uses Most Constrained Variable (MRV) heuristic for better performance
   */
  private basicVariableOrdering(variables: Variable[], domains: Map<string, Domain>): Variable | null {
    if (variables.length === 0) return null;
    
    // Use a balanced approach: prefer students with medium-sized domains
    // Pure MRV can get stuck on impossible students, pure round-robin is inefficient
    const variablesWithDomains = variables
      .map(variable => ({
        variable,
        domainSize: domains.get(variable.studentId)?.timeSlots.length ?? 0
      }))
      .filter(item => item.domainSize > 0) // Skip students with no options
      .sort((a, b) => {
        // Sort by domain size, but prefer medium-sized domains over very small ones
        // This prevents getting stuck on impossible students
        if (a.domainSize <= 3 && b.domainSize > 3) return 1; // Prefer b
        if (b.domainSize <= 3 && a.domainSize > 3) return -1; // Prefer a
        return a.domainSize - b.domainSize; // Otherwise, MRV
      });
    
    return variablesWithDomains.length > 0 ? (variablesWithDomains[0]?.variable ?? null) : null;
  }

  /**
   * Basic value ordering when heuristics are disabled
   * Still provides reasonable ordering to improve search performance
   */
  private basicValueOrdering(timeSlots: TimeSlot[]): TimeSlot[] {
    // Sort by: 1) day of week, 2) start time
    // This ensures we try to fill earlier days and times first
    return [...timeSlots].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startMinute - b.startMinute;
    });
  }
}

/**
 * Local search strategy (placeholder for future implementation)
 */
class LocalSearchStrategy implements SearchStrategy {
  readonly name = 'local-search';
  
  constructor(
    private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { optimizationConfig?: OptimizationConfig; enabledConstraints?: string[] },
    private getStats: () => SolverStats,
    private caching?: CacheManager
  ) {}

  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    // TODO: Implement local search strategy
    // For now, fallback to backtracking
    const backtracking = new BacktrackingSearchStrategy(this.options, this.getStats, this.caching);
    return backtracking.search(variables, domains, context, constraints);
  }
}

/**
 * Hybrid search strategy (placeholder for future implementation)
 */
class HybridSearchStrategy implements SearchStrategy {
  readonly name = 'hybrid';
  
  constructor(
    private options: Required<Omit<SolverOptions, 'optimizationConfig' | 'enabledConstraints'>> & { optimizationConfig?: OptimizationConfig; enabledConstraints?: string[] },
    private getStats: () => SolverStats,
    private caching?: CacheManager
  ) {}

  search(
    variables: Variable[],
    domains: Domain[],
    context: SolverContext,
    constraints: ConstraintManager
  ): Assignment[] | null {
    // TODO: Implement hybrid strategy (backtracking + local search)
    // For now, fallback to backtracking
    const backtracking = new BacktrackingSearchStrategy(this.options, this.getStats, this.caching);
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
    maxTimeMs: studentCount <= 20 ? 8000 : studentCount <= 50 ? 15000 : 45000, // More generous timeouts
    maxBacktracks: studentCount * 100, // Doubled from 50 to 100 per student
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