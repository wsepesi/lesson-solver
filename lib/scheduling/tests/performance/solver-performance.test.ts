/**
 * Solver Performance Tests - Comprehensive Performance Metrics and Monitoring
 * 
 * This test suite provides comprehensive performance testing for the TimeBlock-based
 * scheduler, tracking key metrics like solving time, backtrack count, constraint
 * checks, memory usage, and solution quality. Validates performance targets.
 * 
 * Performance Targets:
 * - 10 students: < 50ms
 * - 20 students: < 200ms  
 * - 30 students: < 500ms
 * - 50 students: < 2000ms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true
import {
  ScheduleSolver,
  createOptimalSolver,
  solveSchedule,
  validateInputs,
  type SolverOptions,
  type SolverStats
} from '../../solver-wrapper';

import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  ScheduleSolution,
  Person
} from '../../types';

import {
  createEmptyWeekSchedule
} from '../../utils';

import { 
  TestCaseGenerator,
  createSeededGenerator,
  type TestCase
} from '../../test-generator/core';

import { 
  StudentGenerator,
  AvailabilityGenerator 
} from '../../test-generator/generators';

import type { PerformanceReport } from '../../optimizations';

// ============================================================================
// PERFORMANCE METRICS INTERFACE
// ============================================================================

/**
 * Extended performance metrics for detailed analysis
 */
export interface PerformanceMetrics {
  /** Total solving time in milliseconds */
  solvingTimeMs: number;
  
  /** Number of backtracks performed */
  backtrackCount: number;
  
  /** Number of constraint checks performed */
  constraintChecks: number;
  
  /** Memory usage in MB (estimated) */
  memoryUsageMB: number;
  
  /** Solution quality score (0-100) */
  solutionQuality: number;
  
  /** Cache hit rate if caching enabled */
  cacheHitRate?: number;
  
  /** Number of students successfully scheduled */
  scheduledStudents: number;
  
  /** Total number of students */
  totalStudents: number;
  
  /** Optimization overhead in milliseconds */
  optimizationOverheadMs?: number;
  
  /** Preprocessing effectiveness (domain reduction ratio) */
  domainReductionRatio?: number;
  
  /** Average time per student scheduled */
  timePerStudentMs: number;
}

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  /** Scenario description */
  description: string;
  
  /** Number of students in scenario */
  studentCount: number;
  
  /** Performance metrics */
  metrics: PerformanceMetrics;
  
  /** Whether performance target was met */
  targetMet: boolean;
  
  /** Target time for this scenario */
  targetTimeMs: number;
  
  /** Solver configuration used */
  solverConfig: SolverOptions;
  
  /** Solution found */
  solution: ScheduleSolution;
  
  /** Detailed optimization report */
  optimizationReport?: PerformanceReport;
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestPerson(id: string, name: string): Person {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`
  };
}

function createTestTeacher(
  availability: WeekSchedule,
  constraints?: Partial<SchedulingConstraints>
): TeacherConfig {
  const defaultConstraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 180, // 3 hours
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };

  return {
    person: createTestPerson('teacher-perf', 'Performance Test Teacher'),
    studioId: 'studio-perf',
    availability,
    constraints: { ...defaultConstraints, ...constraints }
  };
}

function createDayWithBlocks(dayOfWeek: number, blocks: TimeBlock[]): DaySchedule {
  return {
    dayOfWeek,
    blocks: blocks.filter(block => block.start >= 0 && block.start < 1440)
  };
}

function createWeekWithDays(days: DaySchedule[], timezone = 'UTC'): WeekSchedule {
  const fullWeek = Array.from({ length: 7 }, (_, i) => 
    days.find(d => d.dayOfWeek === i) ?? createDayWithBlocks(i, [])
  );
  
  return {
    days: fullWeek,
    timezone
  };
}

/**
 * Memory usage estimator (approximation for Node.js)
 */
function estimateMemoryUsageMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
  }
  return 0; // Fallback if not available
}

/**
 * Performance test runner that collects comprehensive metrics
 */
function runPerformanceTest(
  teacher: TeacherConfig,
  students: StudentConfig[],
  solverOptions: SolverOptions = {},
  targetTimeMs: number
): BenchmarkResult {
  const memoryBefore = estimateMemoryUsageMB();
  const startTime = Date.now();
  
  // Create solver with performance monitoring enabled
  const solver = new ScheduleSolver({
    ...solverOptions,
    enableOptimizations: true,
    logLevel: 'none'
  });
  
  // Solve the scheduling problem
  const solution = solver.solve(teacher, students);
  const stats = solver.getStats();
  
  const endTime = Date.now();
  const memoryAfter = estimateMemoryUsageMB();
  const solvingTime = endTime - startTime;
  
  // Get optimization report if available
  let optimizationReport: PerformanceReport | undefined;
  try {
    optimizationReport = solver.getPerformanceReport();
  } catch {
    // Performance monitoring may not be available
  }
  
  // Calculate metrics
  const metrics: PerformanceMetrics = {
    solvingTimeMs: solvingTime,
    backtrackCount: stats.backtracks,
    constraintChecks: stats.constraintChecks,
    memoryUsageMB: Math.max(0, memoryAfter - memoryBefore),
    solutionQuality: stats.solutionQuality,
    scheduledStudents: solution.metadata.scheduledStudents,
    totalStudents: solution.metadata.totalStudents,
    timePerStudentMs: solution.metadata.scheduledStudents > 0 ? 
      solvingTime / solution.metadata.scheduledStudents : solvingTime,
    cacheHitRate: optimizationReport?.optimizations.caching.hitRate,
    optimizationOverheadMs: optimizationReport?.metrics.optimizationOverheadMs,
    domainReductionRatio: optimizationReport?.optimizations.preprocessing.enabled ? 
      optimizationReport.optimizations.preprocessing.valuesEliminated / (students.length * 50) : undefined
  };
  
  return {
    description: `${students.length} students performance test`,
    studentCount: students.length,
    metrics,
    targetMet: solvingTime <= targetTimeMs,
    targetTimeMs,
    solverConfig: solverOptions,
    solution,
    optimizationReport
  };
}

/**
 * Generate realistic test scenario with varied availability
 */
function generateRealisticScenario(studentCount: number, seed: number = 12345): {
  teacher: TeacherConfig,
  students: StudentConfig[]
} {
  // Teacher available Monday-Friday 9am-6pm with some breaks
  const teacherAvailability = createWeekWithDays([
    createDayWithBlocks(1, [
      { start: 540, duration: 240 }, // 9am-1pm
      { start: 840, duration: 180 }  // 2pm-5pm
    ]),
    createDayWithBlocks(2, [
      { start: 540, duration: 270 }, // 9am-1:30pm
      { start: 870, duration: 150 }  // 2:30pm-5pm
    ]),
    createDayWithBlocks(3, [
      { start: 540, duration: 240 }, // 9am-1pm
      { start: 840, duration: 180 }  // 2pm-5pm
    ]),
    createDayWithBlocks(4, [
      { start: 540, duration: 540 }  // 9am-6pm (longer day)
    ]),
    createDayWithBlocks(5, [
      { start: 540, duration: 300 }  // 9am-2pm (short Friday)
    ])
  ]);
  
  const teacher = createTestTeacher(teacherAvailability, {
    maxConsecutiveMinutes: 180,
    breakDurationMinutes: 30,
    allowedDurations: [45, 60, 90]
  });
  
  // Use StudentGenerator to create realistic students that respect teacher's allowed durations
  const studentGenerator = new StudentGenerator(seed);
  const students = studentGenerator.generateStudents({
    count: studentCount,
    seed,
    allowedDurations: teacher.constraints.allowedDurations, // Pass teacher's allowed durations
    typeDistribution: {
      'flexible': 0.4,
      'morning-person': 0.2,
      'evening-person': 0.2,
      'part-time': 0.2
    },
    // Use teacher availability as base for generating realistic overlapping student schedules
    baseConfig: {
      availability: teacherAvailability
    }
  });
  
  return { teacher, students };
}

// ============================================================================
// PERFORMANCE TARGET TESTS
// ============================================================================

describe('Solver Performance - Target Validation', () => {
  describe('Performance Target Compliance', () => {
    it('should solve 10 students in under 50ms', async () => {
      const { teacher, students } = generateRealisticScenario(10, 42001);
      
      const result = runPerformanceTest(teacher, students, {
        maxTimeMs: 5000,
        useHeuristics: true,
        enableOptimizations: true
      }, 50);
      
      console.log(`10 students: ${result.metrics.solvingTimeMs}ms (target: 50ms)`);
      console.log(`  Scheduled: ${result.metrics.scheduledStudents}/${result.metrics.totalStudents}`);
      console.log(`  Quality: ${result.metrics.solutionQuality}%`);
      console.log(`  Backtracks: ${result.metrics.backtrackCount}`);
      
      expect(result.targetMet).toBe(true);
      expect(result.metrics.solvingTimeMs).toBeLessThan(50);
      expect(result.metrics.scheduledStudents).toBeGreaterThan(7); // At least 70% scheduled
    });
    
    it('should solve 20 students in under 200ms', async () => {
      const { teacher, students } = generateRealisticScenario(20, 42002);
      
      const result = runPerformanceTest(teacher, students, {
        maxTimeMs: 10000,
        useHeuristics: true,
        enableOptimizations: true
      }, 200);
      
      console.log(`20 students: ${result.metrics.solvingTimeMs}ms (target: 200ms)`);
      console.log(`  Scheduled: ${result.metrics.scheduledStudents}/${result.metrics.totalStudents}`);
      console.log(`  Quality: ${result.metrics.solutionQuality}%`);
      console.log(`  Backtracks: ${result.metrics.backtrackCount}`);
      
      expect(result.targetMet).toBe(true);
      expect(result.metrics.solvingTimeMs).toBeLessThan(200);
      expect(result.metrics.scheduledStudents).toBeGreaterThan(15); // At least 75% scheduled
    });
    
    it('should solve 30 students in under 500ms', async () => {
      const { teacher, students } = generateRealisticScenario(30, 42003);
      
      const result = runPerformanceTest(teacher, students, {
        maxTimeMs: 15000,
        useHeuristics: true,
        enableOptimizations: true
      }, 500);
      
      console.log(`30 students: ${result.metrics.solvingTimeMs}ms (target: 500ms)`);
      console.log(`  Scheduled: ${result.metrics.scheduledStudents}/${result.metrics.totalStudents}`);
      console.log(`  Quality: ${result.metrics.solutionQuality}%`);
      console.log(`  Backtracks: ${result.metrics.backtrackCount}`);
      
      expect(result.targetMet).toBe(true);
      expect(result.metrics.solvingTimeMs).toBeLessThan(500);
      expect(result.metrics.scheduledStudents).toBeGreaterThan(22); // At least 75% scheduled
    });
    
    it('should solve 50 students in under 2000ms', async () => {
      const { teacher, students } = generateRealisticScenario(50, 42004);
      
      const result = runPerformanceTest(teacher, students, {
        maxTimeMs: 30000,
        useHeuristics: true,
        enableOptimizations: true
      }, 2000);
      
      console.log(`50 students: ${result.metrics.solvingTimeMs}ms (target: 2000ms)`);
      console.log(`  Scheduled: ${result.metrics.scheduledStudents}/${result.metrics.totalStudents}`);
      console.log(`  Quality: ${result.metrics.solutionQuality}%`);
      console.log(`  Backtracks: ${result.metrics.backtrackCount}`);
      
      expect(result.targetMet).toBe(true);
      expect(result.metrics.solvingTimeMs).toBeLessThan(2000);
      expect(result.metrics.scheduledStudents).toBeGreaterThan(35); // At least 70% scheduled
    });
  });
  
  describe('Optimization Impact Analysis', () => {
    it('should demonstrate optimization effectiveness for 30 students', async () => {
      const { teacher, students } = generateRealisticScenario(30, 42010);
      
      // Test without optimizations
      const resultWithoutOpt = runPerformanceTest(teacher, students, {
        maxTimeMs: 10000,
        enableOptimizations: false,
        useHeuristics: true
      }, 5000);
      
      // Test with optimizations
      const resultWithOpt = runPerformanceTest(teacher, students, {
        maxTimeMs: 10000,
        enableOptimizations: true,
        useHeuristics: true
      }, 1000);
      
      console.log(`Without optimizations: ${resultWithoutOpt.metrics.solvingTimeMs}ms`);
      console.log(`With optimizations: ${resultWithOpt.metrics.solvingTimeMs}ms`);
      
      const speedup = resultWithoutOpt.metrics.solvingTimeMs / resultWithOpt.metrics.solvingTimeMs;
      console.log(`Speedup: ${speedup.toFixed(2)}x`);
      
      // Optimizations should provide significant speedup
      expect(speedup).toBeGreaterThan(1.5);
      expect(resultWithOpt.metrics.solvingTimeMs).toBeLessThan(resultWithoutOpt.metrics.solvingTimeMs);
    });
    
    it('should track cache effectiveness', async () => {
      const { teacher, students } = generateRealisticScenario(25, 42011);
      
      const result = runPerformanceTest(teacher, students, {
        enableOptimizations: true,
        useHeuristics: true
      }, 1000);
      
      if (result.metrics.cacheHitRate !== undefined) {
        console.log(`Cache hit rate: ${(result.metrics.cacheHitRate * 100).toFixed(1)}%`);
        
        // Cache should be reasonably effective for repeated operations
        expect(result.metrics.cacheHitRate).toBeGreaterThan(0.1); // At least 10% hit rate
      }
      
      if (result.optimizationReport) {
        console.log('Optimization report:', result.optimizationReport.summary);
        expect(result.optimizationReport.summary.optimizationEfficiency).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// CONSTRAINT COMPLEXITY ANALYSIS
// ============================================================================

describe('Solver Performance - Constraint Impact', () => {
  describe('Constraint Tightness Impact', () => {
    it('should measure performance with relaxed constraints', async () => {
      const { teacher, students } = generateRealisticScenario(20, 42020);
      
      // Relaxed constraints
      teacher.constraints = {
        maxConsecutiveMinutes: 360, // 6 hours (very relaxed)
        breakDurationMinutes: 5,    // Short breaks
        minLessonDuration: 15,      // Very short min
        maxLessonDuration: 180,     // Long max
        allowedDurations: [15, 30, 45, 60, 90, 120, 180] // Many options
      };
      
      const result = runPerformanceTest(teacher, students, {
        enableOptimizations: true
      }, 100);
      
      console.log(`Relaxed constraints: ${result.metrics.solvingTimeMs}ms`);
      console.log(`  Scheduled: ${result.metrics.scheduledStudents}/${result.metrics.totalStudents}`);
      console.log(`  Backtracks: ${result.metrics.backtrackCount}`);
      
      expect(result.metrics.solutionQuality).toBeGreaterThan(80); // Should schedule most students
      expect(result.metrics.backtrackCount).toBeLessThan(100); // Should require minimal backtracking
    });
    
    it('should measure performance with tight constraints', async () => {
      const { teacher, students } = generateRealisticScenario(20, 42021);
      
      // Tight constraints
      teacher.constraints = {
        maxConsecutiveMinutes: 60,  // Only 1 hour consecutive
        breakDurationMinutes: 45,   // Long breaks required
        minLessonDuration: 45,      // High minimum
        maxLessonDuration: 60,      // Low maximum
        allowedDurations: [45, 60]  // Limited options
      };
      
      const result = runPerformanceTest(teacher, students, {
        enableOptimizations: true,
        maxTimeMs: 5000
      }, 1000);
      
      console.log(`Tight constraints: ${result.metrics.solvingTimeMs}ms`);
      console.log(`  Scheduled: ${result.metrics.scheduledStudents}/${result.metrics.totalStudents}`);
      console.log(`  Backtracks: ${result.metrics.backtrackCount}`);
      
      // Tight constraints should require more work
      expect(result.metrics.backtrackCount).toBeGreaterThan(10);
    });
  });
  
  describe('Search Strategy Comparison', () => {
    it('should compare different heuristic settings', async () => {
      const { teacher, students } = generateRealisticScenario(15, 42030);
      
      const withHeuristics = runPerformanceTest(teacher, students, {
        useHeuristics: true,
        enableOptimizations: false
      }, 500);
      
      const withoutHeuristics = runPerformanceTest(teacher, students, {
        useHeuristics: false,
        enableOptimizations: false
      }, 1000);
      
      console.log(`With heuristics: ${withHeuristics.metrics.solvingTimeMs}ms, backtracks: ${withHeuristics.metrics.backtrackCount}`);
      console.log(`Without heuristics: ${withoutHeuristics.metrics.solvingTimeMs}ms, backtracks: ${withoutHeuristics.metrics.backtrackCount}`);
      
      // Heuristics should generally improve performance
      const timeRatio = withoutHeuristics.metrics.solvingTimeMs / withHeuristics.metrics.solvingTimeMs;
      console.log(`Heuristics speedup: ${timeRatio.toFixed(2)}x`);
      
      // At minimum, heuristics shouldn't significantly hurt performance
      expect(timeRatio).toBeGreaterThan(0.8); // At most 20% slower
    });
  });
});

// ============================================================================
// PERFORMANCE REGRESSION DETECTION
// ============================================================================

describe('Solver Performance - Regression Detection', () => {
  const BASELINE_TIMES = {
    10: 50,   // 10 students should solve in 50ms
    15: 100,  // 15 students should solve in 100ms
    20: 200,  // 20 students should solve in 200ms
    25: 300   // 25 students should solve in 300ms
  };
  
  Object.entries(BASELINE_TIMES).forEach(([studentCount, targetMs]) => {
    it(`should not regress from baseline for ${studentCount} students (${targetMs}ms)`, async () => {
      const count = parseInt(studentCount);
      const { teacher, students } = generateRealisticScenario(count, 42040 + count);
      
      const result = runPerformanceTest(teacher, students, {
        enableOptimizations: true,
        useHeuristics: true
      }, targetMs);
      
      console.log(`${count} students baseline check: ${result.metrics.solvingTimeMs}ms (target: ${targetMs}ms)`);
      
      // Performance regression check with 50% tolerance
      const toleranceMs = targetMs * 1.5;
      expect(result.metrics.solvingTimeMs).toBeLessThan(toleranceMs);
      
      // Quality regression check - should schedule at least 70% of students
      const expectedScheduled = Math.floor(count * 0.7);
      expect(result.metrics.scheduledStudents).toBeGreaterThanOrEqual(expectedScheduled);
    });
  });
  
  it('should detect performance anomalies in repeated runs', async () => {
    const { teacher, students } = generateRealisticScenario(15, 42050);
    const times: number[] = [];
    const backtracks: number[] = [];
    
    // Run multiple times to check consistency
    for (let i = 0; i < 5; i++) {
      const result = runPerformanceTest(teacher, students, {
        enableOptimizations: true
      }, 200);
      
      times.push(result.metrics.solvingTimeMs);
      backtracks.push(result.metrics.backtrackCount);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    console.log(`Performance consistency: avg=${avgTime.toFixed(1)}ms, range=${minTime}-${maxTime}ms`);
    
    // Performance should be reasonably consistent
    const variance = (maxTime - minTime) / avgTime;
    expect(variance).toBeLessThan(2.0); // Max 200% variance
    
    // All runs should meet basic targets
    times.forEach(time => {
      expect(time).toBeLessThan(500); // Conservative upper bound
    });
  });
});

// ============================================================================
// MEMORY USAGE VALIDATION
// ============================================================================

describe('Solver Performance - Memory Usage', () => {
  it('should not exceed memory limits for large scenarios', async () => {
    const { teacher, students } = generateRealisticScenario(40, 42060);
    
    const memoryBefore = estimateMemoryUsageMB();
    const result = runPerformanceTest(teacher, students, {
      enableOptimizations: true,
      maxTimeMs: 5000
    }, 3000);
    const memoryAfter = estimateMemoryUsageMB();
    
    const memoryGrowth = memoryAfter - memoryBefore;
    
    console.log(`Memory usage for 40 students: ${memoryGrowth.toFixed(2)}MB`);
    console.log(`Memory per student: ${(memoryGrowth / 40).toFixed(3)}MB`);
    
    // Memory usage should be reasonable (increased tolerance for different Node.js versions/GC)
    expect(memoryGrowth).toBeLessThan(200); // Less than 200MB for 40 students
    expect(memoryGrowth / 40).toBeLessThan(10); // Less than 10MB per student
  });
  
  it('should track memory efficiency improvements', async () => {
    const scenarios = [10, 20, 30];
    const memoryPerStudent: number[] = [];
    
    for (const count of scenarios) {
      const { teacher, students } = generateRealisticScenario(count, 42070 + count);
      const result = runPerformanceTest(teacher, students, {
        enableOptimizations: true
      }, count * 50);
      
      if (result.metrics.memoryUsageMB > 0) {
        const perStudent = result.metrics.memoryUsageMB / count;
        memoryPerStudent.push(perStudent);
        console.log(`${count} students: ${result.metrics.memoryUsageMB.toFixed(2)}MB (${perStudent.toFixed(3)}MB/student)`);
      }
    }
    
    // Memory per student should not grow dramatically with scale
    if (memoryPerStudent.length > 1) {
      const growth = memoryPerStudent[memoryPerStudent.length - 1]! / memoryPerStudent[0]!;
      expect(growth).toBeLessThan(3); // Less than 3x growth in memory per student
    }
  });
});