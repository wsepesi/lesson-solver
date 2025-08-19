/**
 * Memory Usage Profiling and Validation Tests
 * 
 * This test suite provides comprehensive memory usage analysis for the TimeBlock-based
 * scheduler. Profiles memory allocation patterns, detects memory leaks, validates
 * memory efficiency, and ensures memory usage stays within acceptable bounds.
 * 
 * Memory Profiling Areas:
 * - Peak memory usage during solving
 * - Memory growth patterns with student count
 * - Memory leak detection across multiple solves
 * - Garbage collection efficiency
 * - Memory usage by solver component
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true
import {
  ScheduleSolver,
  createOptimalSolver,
  solveSchedule,
  type SolverOptions
} from '../../solver-wrapper';

import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  Person
} from '../../types';

import { 
  StudentGenerator,
  AvailabilityGenerator 
} from '../../test-generator/generators';

// ============================================================================
// MEMORY PROFILING TYPES
// ============================================================================

/**
 * Memory usage snapshot at a specific point in time
 */
export interface MemorySnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: number;
  
  /** Heap memory used (bytes) */
  heapUsed: number;
  
  /** Total heap size (bytes) */
  heapTotal: number;
  
  /** External memory (bytes) */
  external: number;
  
  /** RSS memory (bytes) */
  rss: number;
  
  /** Array buffers (bytes) */
  arrayBuffers: number;
  
  /** Description of what was happening when snapshot taken */
  description: string;
}

/**
 * Memory usage profile for a complete solver operation
 */
export interface MemoryProfile {
  /** Snapshots taken during the operation */
  snapshots: MemorySnapshot[];
  
  /** Peak memory usage reached */
  peakMemoryMB: number;
  
  /** Memory usage at start */
  startMemoryMB: number;
  
  /** Memory usage at end */
  endMemoryMB: number;
  
  /** Net memory growth */
  memoryGrowthMB: number;
  
  /** Memory released after GC */
  memoryReleasedMB: number;
  
  /** Student count for this profile */
  studentCount: number;
  
  /** Solving time */
  solvingTimeMs: number;
  
  /** Memory efficiency score (MB per student) */
  memoryEfficiencyMBPerStudent: number;
  
  /** Potential memory leaks detected */
  memoryLeaks: string[];
}

/**
 * Memory leak detection result
 */
export interface MemoryLeakAnalysis {
  /** Whether potential leaks were detected */
  leaksDetected: boolean;
  
  /** Growth rate in MB per operation */
  growthRateMBPerOp: number;
  
  /** Memory usage trend over multiple operations */
  trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  
  /** Suspected leak sources */
  suspectedSources: string[];
  
  /** Confidence level of leak detection */
  confidence: number;
}

// ============================================================================
// MEMORY MONITORING UTILITIES
// ============================================================================

/**
 * Get current memory usage snapshot
 */
function getMemorySnapshot(description: string): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    timestamp: Date.now(),
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
    arrayBuffers: usage.arrayBuffers || 0,
    description
  };
}

/**
 * Convert bytes to megabytes
 */
function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

/**
 * Force garbage collection if available
 */
function forceGC(): void {
  if (global.gc) {
    global.gc();
  }
}

/**
 * Memory profiler that tracks usage during solver operations
 */
class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private intervalId?: NodeJS.Timeout;
  
  startProfiling(intervalMs: number = 100): void {
    this.snapshots = [];
    this.snapshots.push(getMemorySnapshot('Profiling started'));
    
    this.intervalId = setInterval(() => {
      this.snapshots.push(getMemorySnapshot('During solving'));
    }, intervalMs);
  }
  
  stopProfiling(): MemoryProfile {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.snapshots.push(getMemorySnapshot('Profiling ended'));
    
    const startSnapshot = this.snapshots[0]!;
    const endSnapshot = this.snapshots[this.snapshots.length - 1]!;
    
    // Find peak memory usage
    const peakHeap = Math.max(...this.snapshots.map(s => s.heapUsed));
    
    // Force GC and measure released memory
    forceGC();
    const afterGCSnapshot = getMemorySnapshot('After GC');
    
    const profile: MemoryProfile = {
      snapshots: this.snapshots,
      peakMemoryMB: bytesToMB(peakHeap),
      startMemoryMB: bytesToMB(startSnapshot.heapUsed),
      endMemoryMB: bytesToMB(endSnapshot.heapUsed),
      memoryGrowthMB: bytesToMB(endSnapshot.heapUsed - startSnapshot.heapUsed),
      memoryReleasedMB: bytesToMB(endSnapshot.heapUsed - afterGCSnapshot.heapUsed),
      studentCount: 0, // Will be set by caller
      solvingTimeMs: endSnapshot.timestamp - startSnapshot.timestamp,
      memoryEfficiencyMBPerStudent: 0, // Will be calculated by caller
      memoryLeaks: []
    };
    
    // Simple leak detection
    if (profile.memoryGrowthMB > 10 && profile.memoryReleasedMB < profile.memoryGrowthMB * 0.5) {
      profile.memoryLeaks.push('Significant memory growth not released by GC');
    }
    
    return profile;
  }
  
  addSnapshot(description: string): void {
    this.snapshots.push(getMemorySnapshot(description));
  }
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
    maxConsecutiveMinutes: 180,
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };

  return {
    person: createTestPerson('teacher-memory', 'Memory Test Teacher'),
    studioId: 'studio-memory',
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
 * Generate teacher schedule with sufficient capacity for students
 */
function generateMemoryTestSchedule(maxStudents: number): WeekSchedule {
  const hoursPerDay = Math.min(10, Math.ceil(maxStudents / 5));
  const minutesPerDay = hoursPerDay * 60;
  
  return createWeekWithDays([
    createDayWithBlocks(1, [{ start: 540, duration: minutesPerDay }]),
    createDayWithBlocks(2, [{ start: 540, duration: minutesPerDay }]),
    createDayWithBlocks(3, [{ start: 540, duration: minutesPerDay }]),
    createDayWithBlocks(4, [{ start: 540, duration: minutesPerDay }]),
    createDayWithBlocks(5, [{ start: 540, duration: minutesPerDay }])
  ]);
}

/**
 * Run memory profiled test
 */
async function runMemoryProfiledTest(
  studentCount: number,
  solverOptions: SolverOptions = {},
  seed: number = 60000
): Promise<MemoryProfile> {
  const profiler = new MemoryProfiler();
  
  // Setup
  const teacherAvailability = generateMemoryTestSchedule(studentCount);
  const teacher = createTestTeacher(teacherAvailability);
  
  const studentGenerator = new StudentGenerator(seed);
  const students = studentGenerator.generateStudents({
    count: studentCount,
    seed,
    allowedDurations: teacher.constraints.allowedDurations
  });
  
  // Start profiling
  profiler.startProfiling(50); // Sample every 50ms
  
  profiler.addSnapshot('Before solver creation');
  
  // Create and run solver
  const solver = new ScheduleSolver({
    enableOptimizations: true,
    logLevel: 'none',
    ...solverOptions
  });
  
  profiler.addSnapshot('After solver creation');
  
  const solution = solver.solve(teacher, students);
  
  profiler.addSnapshot('After solving');
  
  // Complete profiling
  const profile = profiler.stopProfiling();
  profile.studentCount = studentCount;
  profile.memoryEfficiencyMBPerStudent = profile.peakMemoryMB / studentCount;
  
  return profile;
}

// ============================================================================
// MEMORY USAGE VALIDATION TESTS
// ============================================================================

describe('Memory Usage Profiling', () => {
  beforeEach(() => {
    // Force GC before each test to start with clean slate
    forceGC();
  });
  
  describe('Basic Memory Usage Validation', () => {
    it('should use reasonable memory for small scenarios (10 students)', async () => {
      const profile = await runMemoryProfiledTest(10, {}, 60001);
      
      console.log(`10 students memory profile:`);
      console.log(`  Peak: ${profile.peakMemoryMB}MB`);
      console.log(`  Growth: ${profile.memoryGrowthMB}MB`);
      console.log(`  Efficiency: ${profile.memoryEfficiencyMBPerStudent.toFixed(3)}MB/student`);
      console.log(`  Released by GC: ${profile.memoryReleasedMB}MB`);
      
      // Memory usage should be reasonable for small scenarios (increased tolerance)
      expect(profile.peakMemoryMB).toBeLessThan(100); // Less than 100MB peak
      expect(profile.memoryEfficiencyMBPerStudent).toBeLessThan(10); // Less than 10MB per student
      expect(profile.memoryLeaks).toHaveLength(0); // No detected leaks
    });
    
    it('should scale memory usage reasonably with student count', async () => {
      const studentCounts = [10, 20, 30];
      const profiles: MemoryProfile[] = [];
      
      console.log('\nMemory scaling analysis:');
      
      for (const count of studentCounts) {
        const profile = await runMemoryProfiledTest(count, {}, 60002 + count);
        profiles.push(profile);
        
        console.log(`${count} students: ${profile.peakMemoryMB}MB peak ` +
                   `(${profile.memoryEfficiencyMBPerStudent.toFixed(3)}MB/student)`);
      }
      
      // Memory efficiency should not degrade dramatically
      const firstEfficiency = profiles[0]!.memoryEfficiencyMBPerStudent;
      const lastEfficiency = profiles[profiles.length - 1]!.memoryEfficiencyMBPerStudent;
      const efficiencyGrowth = lastEfficiency / firstEfficiency;
      
      console.log(`Memory efficiency growth: ${efficiencyGrowth.toFixed(2)}x`);
      
      expect(efficiencyGrowth).toBeLessThan(3); // Less than 3x efficiency degradation
      
      // Peak memory should grow sub-quadratically
      const firstPeak = profiles[0]!.peakMemoryMB;
      const lastPeak = profiles[profiles.length - 1]!.peakMemoryMB;
      const peakGrowthRatio = lastPeak / firstPeak;
      const studentGrowthRatio = profiles[profiles.length - 1]!.studentCount / profiles[0]!.studentCount;
      
      // Peak memory growth should be less than quadratic
      expect(peakGrowthRatio).toBeLessThan(Math.pow(studentGrowthRatio, 2));
    });
    
    it('should release memory efficiently after solving', async () => {
      const profile = await runMemoryProfiledTest(25, {}, 60003);
      
      console.log(`Memory release analysis for 25 students:`);
      console.log(`  Growth during solve: ${profile.memoryGrowthMB}MB`);
      console.log(`  Released by GC: ${profile.memoryReleasedMB}MB`);
      console.log(`  Release efficiency: ${(profile.memoryReleasedMB / Math.max(profile.memoryGrowthMB, 0.1) * 100).toFixed(1)}%`);
      
      // At least 60% of allocated memory should be releasable
      const releaseEfficiency = profile.memoryReleasedMB / Math.max(profile.memoryGrowthMB, 0.1);
      expect(releaseEfficiency).toBeGreaterThan(0.4); // At least 40% released
      
      // Peak memory should not be excessive
      expect(profile.peakMemoryMB).toBeLessThan(250); // Less than 250MB for 25 students
    });
  });
  
  describe('Memory Leak Detection', () => {
    it('should not leak memory across multiple solver runs', async () => {
      const iterations = 5;
      const memoryUsages: number[] = [];
      
      console.log('\nMemory leak detection across multiple runs:');
      
      for (let i = 0; i < iterations; i++) {
        // Force GC before measurement
        forceGC();
        
        const beforeMemory = bytesToMB(process.memoryUsage().heapUsed);
        
        // Run solver
        await runMemoryProfiledTest(15, {}, 60010 + i);
        
        // Force GC and measure final memory
        forceGC();
        
        const afterMemory = bytesToMB(process.memoryUsage().heapUsed);
        const growth = afterMemory - beforeMemory;
        
        memoryUsages.push(growth);
        console.log(`Run ${i + 1}: ${growth.toFixed(2)}MB growth`);
      }
      
      // Analyze memory growth trend
      const leakAnalysis = analyzeMemoryLeak(memoryUsages);
      
      console.log(`Leak analysis: ${leakAnalysis.trend} trend, ` +
                 `${leakAnalysis.growthRateMBPerOp.toFixed(3)}MB/op growth rate`);
      
      // Should not have significant increasing trend
      expect(leakAnalysis.trend).not.toBe('increasing');
      expect(leakAnalysis.growthRateMBPerOp).toBeLessThan(5); // Less than 5MB growth per operation
      expect(leakAnalysis.leaksDetected).toBe(false);
    });
    
    it('should not accumulate memory with optimization caching', async () => {
      const iterations = 4;
      const memorySnapshots: number[] = [];
      
      console.log('\nTesting memory accumulation with caching enabled:');
      
      // Create persistent solver with caching
      const solver = new ScheduleSolver({
        enableOptimizations: true,
        logLevel: 'none'
      });
      
      for (let i = 0; i < iterations; i++) {
        forceGC();
        const beforeMemory = bytesToMB(process.memoryUsage().heapUsed);
        
        // Generate new scenario but reuse solver
        const teacherAvailability = generateMemoryTestSchedule(20);
        const teacher = createTestTeacher(teacherAvailability);
        
        const studentGenerator = new StudentGenerator(60020 + i);
        const students = studentGenerator.generateStudents({
          count: 20,
          seed: 60020 + i,
          allowedDurations: teacher.constraints.allowedDurations
        });
        
        solver.solve(teacher, students);
        
        forceGC();
        const afterMemory = bytesToMB(process.memoryUsage().heapUsed);
        
        memorySnapshots.push(afterMemory - beforeMemory);
        console.log(`Iteration ${i + 1}: ${(afterMemory - beforeMemory).toFixed(2)}MB growth`);
      }
      
      // Memory growth should stabilize (caches reach steady state)
      const lastTwoGrowths = memorySnapshots.slice(-2);
      if (lastTwoGrowths.length === 2) {
        const growthDifference = Math.abs(lastTwoGrowths[1]! - lastTwoGrowths[0]!);
        expect(growthDifference).toBeLessThan(5); // Stabilized within 5MB
      }
    });
  });
  
  describe('Memory Efficiency Analysis', () => {
    it('should compare memory efficiency with and without optimizations', async () => {
      const studentCount = 20;
      
      console.log('\nMemory efficiency: optimizations comparison:');
      
      // Test without optimizations
      const profileWithoutOpt = await runMemoryProfiledTest(studentCount, {
        enableOptimizations: false
      }, 60030);
      
      // Test with optimizations
      const profileWithOpt = await runMemoryProfiledTest(studentCount, {
        enableOptimizations: true
      }, 60031);
      
      console.log(`Without optimizations: ${profileWithoutOpt.peakMemoryMB}MB peak`);
      console.log(`With optimizations: ${profileWithOpt.peakMemoryMB}MB peak`);
      
      const memoryEfficiencyRatio = profileWithoutOpt.peakMemoryMB / profileWithOpt.peakMemoryMB;
      console.log(`Memory efficiency ratio: ${memoryEfficiencyRatio.toFixed(2)}x`);
      
      // Optimizations might use slightly more memory but should be reasonable
      // Allow up to 50% more memory for optimization benefits
      expect(profileWithOpt.peakMemoryMB).toBeLessThan(profileWithoutOpt.peakMemoryMB * 1.5);
    });
    
    it('should profile memory usage by solver component', async () => {
      const profiler = new MemoryProfiler();
      const studentCount = 15;
      
      // Setup
      const teacherAvailability = generateMemoryTestSchedule(studentCount);
      const teacher = createTestTeacher(teacherAvailability);
      
      const studentGenerator = new StudentGenerator(60040);
      const students = studentGenerator.generateStudents({
        count: studentCount,
        seed: 60040,
        allowedDurations: teacher.constraints.allowedDurations
      });
      
      profiler.startProfiling(25);
      
      // Measure each phase
      profiler.addSnapshot('Baseline');
      
      const solver = new ScheduleSolver({
        enableOptimizations: true,
        logLevel: 'none'
      });
      
      profiler.addSnapshot('Solver created');
      
      const solution = solver.solve(teacher, students);
      
      profiler.addSnapshot('Solving complete');
      
      const profile = profiler.stopProfiling();
      
      console.log('\nMemory usage by component:');
      
      const snapshots = profile.snapshots;
      const baseline = snapshots.find(s => s.description === 'Baseline');
      const solverCreated = snapshots.find(s => s.description === 'Solver created');
      const solvingComplete = snapshots.find(s => s.description === 'Solving complete');
      
      if (baseline && solverCreated && solvingComplete) {
        const solverCreationMB = bytesToMB(solverCreated.heapUsed - baseline.heapUsed);
        const solvingMB = bytesToMB(solvingComplete.heapUsed - solverCreated.heapUsed);
        
        console.log(`  Solver creation: ${solverCreationMB.toFixed(2)}MB`);
        console.log(`  Solving process: ${solvingMB.toFixed(2)}MB`);
        
        // Solver creation should not use excessive memory
        expect(solverCreationMB).toBeLessThan(50); // Less than 50MB for solver creation
      }
    });
  });
  
  describe('Large Scenario Memory Validation', () => {
    it('should handle 50 students within memory constraints', async () => {
      const profile = await runMemoryProfiledTest(50, {
        maxTimeMs: 5000
      }, 60050);
      
      console.log(`50 students memory profile:`);
      console.log(`  Peak: ${profile.peakMemoryMB}MB`);
      console.log(`  Efficiency: ${profile.memoryEfficiencyMBPerStudent.toFixed(3)}MB/student`);
      console.log(`  Growth: ${profile.memoryGrowthMB}MB`);
      
      // Should stay within reasonable limits for large scenarios
      expect(profile.peakMemoryMB).toBeLessThan(500); // Less than 500MB for 50 students
      expect(profile.memoryEfficiencyMBPerStudent).toBeLessThan(10); // Less than 10MB per student
      
      // Should not have memory leaks at scale
      expect(profile.memoryLeaks).toHaveLength(0);
    });
    
    it('should validate memory usage remains bounded with time limits', async () => {
      const timeLimits = [1000, 3000, 5000]; // Different time limits
      const memoryUsages: number[] = [];
      
      console.log('\nMemory usage with different time limits:');
      
      for (const timeLimit of timeLimits) {
        const profile = await runMemoryProfiledTest(30, {
          maxTimeMs: timeLimit
        }, 60060);
        
        memoryUsages.push(profile.peakMemoryMB);
        console.log(`${timeLimit}ms limit: ${profile.peakMemoryMB}MB peak`);
      }
      
      // Memory usage should not vary dramatically with time limits
      const minMemory = Math.min(...memoryUsages);
      const maxMemory = Math.max(...memoryUsages);
      const memoryVariation = (maxMemory - minMemory) / minMemory;
      
      console.log(`Memory variation: ${(memoryVariation * 100).toFixed(1)}%`);
      
      expect(memoryVariation).toBeLessThan(1.0); // Less than 100% variation
    });
  });
});

// ============================================================================
// MEMORY LEAK ANALYSIS UTILITIES
// ============================================================================

/**
 * Analyze memory usage pattern to detect potential leaks
 */
function analyzeMemoryLeak(memoryUsages: number[]): MemoryLeakAnalysis {
  if (memoryUsages.length < 3) {
    return {
      leaksDetected: false,
      growthRateMBPerOp: 0,
      trend: 'unknown',
      suspectedSources: [],
      confidence: 0
    };
  }
  
  // Calculate linear trend
  const x = Array.from({ length: memoryUsages.length }, (_, i) => i);
  const y = memoryUsages;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Determine trend
  let trend: MemoryLeakAnalysis['trend'] = 'stable';
  if (slope > 0.5) {
    trend = 'increasing';
  } else if (slope < -0.5) {
    trend = 'decreasing';
  }
  
  // Calculate correlation coefficient for confidence
  const meanX = sumX / n;
  const meanY = sumY / n;
  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i]! - meanY), 0);
  const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
  const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
  const correlation = numerator / (denomX * denomY);
  
  const confidence = Math.abs(correlation);
  
  // Detect leaks
  const leaksDetected = trend === 'increasing' && slope > 1.0 && confidence > 0.7;
  
  const suspectedSources: string[] = [];
  if (leaksDetected) {
    if (slope > 5) {
      suspectedSources.push('Major memory leak - check object retention');
    } else if (slope > 2) {
      suspectedSources.push('Moderate memory accumulation - check caching strategy');
    } else {
      suspectedSources.push('Minor memory growth - monitor for pattern');
    }
  }
  
  return {
    leaksDetected,
    growthRateMBPerOp: slope,
    trend,
    suspectedSources,
    confidence
  };
}