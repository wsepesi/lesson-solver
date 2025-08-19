/**
 * Scaling Performance Tests - Student Count Scaling Analysis
 * 
 * This test suite analyzes how the TimeBlock-based scheduler scales with
 * increasing student counts. Tests for linear vs exponential growth patterns,
 * identifies scaling bottlenecks, and validates performance targets across
 * different student count ranges.
 * 
 * Scaling Analysis:
 * - Linear scaling: O(n) - time grows proportionally with student count
 * - Quadratic scaling: O(n²) - time grows with square of student count  
 * - Exponential scaling: O(2^n) - time doubles with each additional student
 * 
 * Target Scaling: Linear to sub-quadratic (O(n log n) acceptable)
 */

import { describe, it, expect } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true
import {
  ScheduleSolver,
  createOptimalSolver,
  solveSchedule,
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
  StudentGenerator,
  AvailabilityGenerator 
} from '../../test-generator/generators';

// ============================================================================
// SCALING ANALYSIS TYPES
// ============================================================================

/**
 * Scaling data point for a specific student count
 */
export interface ScalingDataPoint {
  /** Number of students */
  studentCount: number;
  
  /** Average solving time across multiple runs */
  avgSolvingTimeMs: number;
  
  /** Standard deviation of solving times */
  stdDevTimeMs: number;
  
  /** Minimum solving time observed */
  minTimeMs: number;
  
  /** Maximum solving time observed */
  maxTimeMs: number;
  
  /** Average number of backtracks */
  avgBacktracks: number;
  
  /** Average constraint checks */
  avgConstraintChecks: number;
  
  /** Average solution quality */
  avgSolutionQuality: number;
  
  /** Average scheduling success rate */
  avgSchedulingRate: number;
  
  /** Number of test runs */
  runs: number;
  
  /** Time per student ratio */
  timePerStudentMs: number;
}

/**
 * Complete scaling analysis result
 */
export interface ScalingAnalysis {
  /** Data points for each student count tested */
  dataPoints: ScalingDataPoint[];
  
  /** Detected scaling pattern */
  scalingPattern: 'linear' | 'quadratic' | 'exponential' | 'sub-linear' | 'unknown';
  
  /** R-squared correlation for best-fit scaling model */
  correlationCoefficient: number;
  
  /** Scaling coefficient (slope of best-fit line) */
  scalingCoefficient: number;
  
  /** Performance bottleneck analysis */
  bottlenecks: string[];
  
  /** Scaling efficiency score (0-100) */
  efficiencyScore: number;
  
  /** Extrapolated performance for larger scales */
  extrapolations: {
    studentCount: number;
    estimatedTimeMs: number;
    confidence: number;
  }[];
}

// ============================================================================
// SCALING TEST UTILITIES
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
    person: createTestPerson('teacher-scaling', 'Scaling Test Teacher'),
    studioId: 'studio-scaling',
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
 * Generate scalable teacher schedule that grows with student count
 */
function generateScalableTeacherSchedule(maxStudents: number): WeekSchedule {
  // Calculate required availability based on max students
  // Assume 60-minute lessons, 30-minute breaks, ~8 hours per day capacity
  const hoursPerDay = Math.min(12, Math.ceil(maxStudents * 1.5 / 5)); // Spread across 5 days
  const minutesPerDay = hoursPerDay * 60;
  
  return createWeekWithDays([
    // Monday through Friday with sufficient capacity
    createDayWithBlocks(1, [
      { start: 540, duration: minutesPerDay } // 9am + calculated hours
    ]),
    createDayWithBlocks(2, [
      { start: 540, duration: minutesPerDay }
    ]),
    createDayWithBlocks(3, [
      { start: 540, duration: minutesPerDay }
    ]),
    createDayWithBlocks(4, [
      { start: 540, duration: minutesPerDay }
    ]),
    createDayWithBlocks(5, [
      { start: 540, duration: minutesPerDay }
    ])
  ]);
}

/**
 * Run scaling test for a specific student count
 */
async function runScalingTest(
  studentCount: number,
  runs: number = 3,
  seed: number = 50000
): Promise<ScalingDataPoint> {
  const times: number[] = [];
  const backtracks: number[] = [];
  const constraintChecks: number[] = [];
  const qualities: number[] = [];
  const schedulingRates: number[] = [];
  
  for (let run = 0; run < runs; run++) {
    const runSeed = seed + studentCount * 100 + run;
    
    // Generate scenario
    const teacherAvailability = generateScalableTeacherSchedule(studentCount);
    const teacher = createTestTeacher(teacherAvailability);
    
    const studentGenerator = new StudentGenerator(runSeed);
    const students = studentGenerator.generateStudents({
      count: studentCount,
      seed: runSeed,
      allowedDurations: teacher.constraints.allowedDurations, // Respect teacher's allowed durations
      typeDistribution: {
        'flexible': 0.4,
        'morning-person': 0.2,
        'evening-person': 0.2,
        'part-time': 0.2
      }
    });
    
    // Run solver with optimizations
    const startTime = Date.now();
    const solver = new ScheduleSolver({
      maxTimeMs: Math.max(5000, studentCount * 100), // Scale timeout
      enableOptimizations: true,
      useHeuristics: true,
      logLevel: 'none'
    });
    
    const solution = solver.solve(teacher, students);
    const stats = solver.getStats();
    const solvingTime = Date.now() - startTime;
    
    // Collect metrics
    times.push(solvingTime);
    backtracks.push(stats.backtracks);
    constraintChecks.push(stats.constraintChecks);
    qualities.push(stats.solutionQuality);
    schedulingRates.push(solution.metadata.scheduledStudents / solution.metadata.totalStudents);
  }
  
  // Calculate statistics
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    studentCount,
    avgSolvingTimeMs: avgTime,
    stdDevTimeMs: stdDev,
    minTimeMs: Math.min(...times),
    maxTimeMs: Math.max(...times),
    avgBacktracks: backtracks.reduce((a, b) => a + b, 0) / backtracks.length,
    avgConstraintChecks: constraintChecks.reduce((a, b) => a + b, 0) / constraintChecks.length,
    avgSolutionQuality: qualities.reduce((a, b) => a + b, 0) / qualities.length,
    avgSchedulingRate: schedulingRates.reduce((a, b) => a + b, 0) / schedulingRates.length,
    runs,
    timePerStudentMs: avgTime / studentCount
  };
}

/**
 * Analyze scaling pattern from data points
 */
function analyzeScalingPattern(dataPoints: ScalingDataPoint[]): ScalingAnalysis {
  if (dataPoints.length < 3) {
    return {
      dataPoints,
      scalingPattern: 'unknown',
      correlationCoefficient: 0,
      scalingCoefficient: 0,
      bottlenecks: ['Insufficient data points for analysis'],
      efficiencyScore: 0,
      extrapolations: []
    };
  }
  
  const x = dataPoints.map(p => p.studentCount);
  const y = dataPoints.map(p => p.avgSolvingTimeMs);
  
  // Test different scaling patterns
  const linearCorr = calculateCorrelation(x, y);
  const quadraticCorr = calculateCorrelation(x, y.map((_, i) => x[i] * x[i]));
  const logCorr = calculateCorrelation(x.map(Math.log), y.map(Math.log));
  
  // Determine best-fit pattern
  let scalingPattern: ScalingAnalysis['scalingPattern'] = 'linear';
  let bestCorr = Math.abs(linearCorr);
  
  if (Math.abs(quadraticCorr) > bestCorr) {
    scalingPattern = 'quadratic';
    bestCorr = Math.abs(quadraticCorr);
  }
  
  if (Math.abs(logCorr) > bestCorr && logCorr > 0.8) {
    scalingPattern = 'sub-linear';
    bestCorr = Math.abs(logCorr);
  }
  
  // Check for exponential growth (bad!)
  const growthRates = [];
  for (let i = 1; i < dataPoints.length; i++) {
    const rate = dataPoints[i]!.avgSolvingTimeMs / dataPoints[i-1]!.avgSolvingTimeMs;
    growthRates.push(rate);
  }
  const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  
  if (avgGrowthRate > 1.8) {
    scalingPattern = 'exponential';
  }
  
  // Calculate scaling coefficient (slope)
  const scalingCoefficient = calculateSlope(x, y);
  
  // Identify bottlenecks
  const bottlenecks = identifyBottlenecks(dataPoints);
  
  // Calculate efficiency score
  const efficiencyScore = calculateEfficiencyScore(dataPoints, scalingPattern);
  
  // Generate extrapolations
  const extrapolations = generateExtrapolations(dataPoints, scalingPattern, scalingCoefficient);
  
  return {
    dataPoints,
    scalingPattern,
    correlationCoefficient: bestCorr,
    scalingCoefficient,
    bottlenecks,
    efficiencyScore,
    extrapolations
  };
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateSlope(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumXX - sumX * sumX;
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function identifyBottlenecks(dataPoints: ScalingDataPoint[]): string[] {
  const bottlenecks: string[] = [];
  
  // Check for excessive backtracking
  const lastPoint = dataPoints[dataPoints.length - 1];
  if (lastPoint && lastPoint.avgBacktracks > lastPoint.studentCount * 5) {
    bottlenecks.push('Excessive backtracking - may indicate poor heuristics');
  }
  
  // Check for declining solution quality
  if (dataPoints.length >= 2) {
    const qualityTrend = dataPoints[dataPoints.length - 1]!.avgSolutionQuality - 
                        dataPoints[0]!.avgSolutionQuality;
    if (qualityTrend < -10) {
      bottlenecks.push('Declining solution quality with scale');
    }
  }
  
  // Check for constraint check explosion
  const lastCCPerStudent = lastPoint ? lastPoint.avgConstraintChecks / lastPoint.studentCount : 0;
  if (lastCCPerStudent > 1000) {
    bottlenecks.push('High constraint check overhead - consider optimization');
  }
  
  return bottlenecks;
}

function calculateEfficiencyScore(
  dataPoints: ScalingDataPoint[], 
  pattern: ScalingAnalysis['scalingPattern']
): number {
  // Base score on scaling pattern
  let baseScore = 0;
  switch (pattern) {
    case 'sub-linear': baseScore = 95; break;
    case 'linear': baseScore = 85; break;
    case 'quadratic': baseScore = 60; break;
    case 'exponential': baseScore = 20; break;
    default: baseScore = 50;
  }
  
  // Adjust for solution quality maintenance
  const lastPoint = dataPoints[dataPoints.length - 1];
  if (lastPoint && lastPoint.avgSolutionQuality > 80) {
    baseScore += 10;
  } else if (lastPoint && lastPoint.avgSolutionQuality < 60) {
    baseScore -= 20;
  }
  
  return Math.max(0, Math.min(100, baseScore));
}

function generateExtrapolations(
  dataPoints: ScalingDataPoint[],
  pattern: ScalingAnalysis['scalingPattern'],
  coefficient: number
): ScalingAnalysis['extrapolations'] {
  const extrapolations: ScalingAnalysis['extrapolations'] = [];
  const lastPoint = dataPoints[dataPoints.length - 1];
  
  if (!lastPoint) return extrapolations;
  
  const targetCounts = [75, 100, 150, 200];
  
  for (const count of targetCounts) {
    if (count <= lastPoint.studentCount) continue;
    
    let estimatedTime = 0;
    let confidence = 0.8;
    
    switch (pattern) {
      case 'linear':
        estimatedTime = coefficient * count;
        confidence = 0.85;
        break;
      case 'quadratic':
        estimatedTime = coefficient * count * count;
        confidence = 0.7;
        break;
      case 'exponential':
        estimatedTime = Math.pow(2, count / 10) * 100; // Rough exponential
        confidence = 0.3;
        break;
      default:
        estimatedTime = lastPoint.avgSolvingTimeMs * (count / lastPoint.studentCount);
        confidence = 0.6;
    }
    
    extrapolations.push({
      studentCount: count,
      estimatedTimeMs: Math.round(estimatedTime),
      confidence
    });
  }
  
  return extrapolations;
}

// ============================================================================
// SCALING ANALYSIS TESTS
// ============================================================================

describe('Scaling Performance Analysis', () => {
  describe('Linear Scaling Validation', () => {
    it('should demonstrate linear scaling up to 30 students', async () => {
      const studentCounts = [5, 10, 15, 20, 25, 30];
      const dataPoints: ScalingDataPoint[] = [];
      
      console.log('Running linear scaling analysis...');
      
      for (const count of studentCounts) {
        console.log(`Testing ${count} students...`);
        const dataPoint = await runScalingTest(count, 3, 50100);
        dataPoints.push(dataPoint);
        
        console.log(`  ${count} students: ${dataPoint.avgSolvingTimeMs.toFixed(1)}ms ` +
                   `(${dataPoint.timePerStudentMs.toFixed(1)}ms/student)`);
      }
      
      const analysis = analyzeScalingPattern(dataPoints);
      
      console.log(`\nScaling Analysis:`);
      console.log(`Pattern: ${analysis.scalingPattern}`);
      console.log(`Correlation: ${analysis.correlationCoefficient.toFixed(3)}`);
      console.log(`Efficiency Score: ${analysis.efficiencyScore}/100`);
      
      if (analysis.bottlenecks.length > 0) {
        console.log(`Bottlenecks: ${analysis.bottlenecks.join(', ')}`);
      }
      
      // Performance should scale linearly or better
      expect(['linear', 'sub-linear']).toContain(analysis.scalingPattern);
      expect(analysis.correlationCoefficient).toBeGreaterThan(0.7);
      expect(analysis.efficiencyScore).toBeGreaterThan(75);
      
      // Time per student should not increase dramatically
      const firstPoint = dataPoints[0]!;
      const lastPoint = dataPoints[dataPoints.length - 1]!;
      const timePerStudentGrowth = lastPoint.timePerStudentMs / firstPoint.timePerStudentMs;
      
      expect(timePerStudentGrowth).toBeLessThan(3); // Less than 3x growth
    });
    
    it('should maintain solution quality across scales', async () => {
      const studentCounts = [10, 20, 30];
      const qualityData: { count: number; quality: number; rate: number }[] = [];
      
      for (const count of studentCounts) {
        const dataPoint = await runScalingTest(count, 2, 50200);
        qualityData.push({
          count,
          quality: dataPoint.avgSolutionQuality,
          rate: dataPoint.avgSchedulingRate
        });
        
        console.log(`${count} students: quality=${dataPoint.avgSolutionQuality.toFixed(1)}%, ` +
                   `scheduled=${(dataPoint.avgSchedulingRate * 100).toFixed(1)}%`);
      }
      
      // Quality should not degrade significantly
      const qualityVariation = Math.max(...qualityData.map(d => d.quality)) - 
                              Math.min(...qualityData.map(d => d.quality));
      
      expect(qualityVariation).toBeLessThan(30); // Less than 30% quality variation
      
      // Should maintain reasonable scheduling rates
      qualityData.forEach(({ count, rate }) => {
        expect(rate).toBeGreaterThan(0.6); // At least 60% scheduled
      });
    });
  });
  
  describe('Scaling Bottleneck Detection', () => {
    it('should identify backtracking bottlenecks', async () => {
      // Test with increasingly constrained scenarios
      const constraintLevels = [
        { name: 'relaxed', maxConsecutive: 240, breakDuration: 15 },
        { name: 'moderate', maxConsecutive: 120, breakDuration: 30 },
        { name: 'tight', maxConsecutive: 90, breakDuration: 45 }
      ];
      
      for (const constraintLevel of constraintLevels) {
        console.log(`\nTesting ${constraintLevel.name} constraints...`);
        
        const teacherAvailability = generateScalableTeacherSchedule(20);
        const teacher = createTestTeacher(teacherAvailability, {
          maxConsecutiveMinutes: constraintLevel.maxConsecutive,
          breakDurationMinutes: constraintLevel.breakDuration
        });
        
        const studentGenerator = new StudentGenerator(50300);
        const students = studentGenerator.generateStudents({
          count: 20,
          seed: 50300,
          allowedDurations: teacher.constraints.allowedDurations
        });
        
        const solver = new ScheduleSolver({
          enableOptimizations: true,
          useHeuristics: true,
          logLevel: 'none'
        });
        
        const startTime = Date.now();
        const solution = solver.solve(teacher, students);
        const stats = solver.getStats();
        const solvingTime = Date.now() - startTime;
        
        console.log(`  Time: ${solvingTime}ms, Backtracks: ${stats.backtracks}, ` +
                   `Quality: ${stats.solutionQuality.toFixed(1)}%`);
        
        // Tight constraints should not cause excessive backtracking
        expect(stats.backtracks).toBeLessThan(1000);
        expect(solvingTime).toBeLessThan(2000);
      }
    });
    
    it('should analyze constraint check scaling', async () => {
      const studentCounts = [10, 20, 30];
      const constraintCheckData: { count: number; checks: number; checksPerStudent: number }[] = [];
      
      for (const count of studentCounts) {
        const dataPoint = await runScalingTest(count, 2, 50400);
        const checksPerStudent = dataPoint.avgConstraintChecks / count;
        
        constraintCheckData.push({
          count,
          checks: dataPoint.avgConstraintChecks,
          checksPerStudent
        });
        
        console.log(`${count} students: ${dataPoint.avgConstraintChecks.toFixed(0)} checks ` +
                   `(${checksPerStudent.toFixed(1)} per student)`);
      }
      
      // Constraint checks per student should not grow exponentially
      const firstCPS = constraintCheckData[0]!.checksPerStudent;
      const lastCPS = constraintCheckData[constraintCheckData.length - 1]!.checksPerStudent;
      const cpsGrowth = lastCPS / firstCPS;
      
      console.log(`Constraint checks per student growth: ${cpsGrowth.toFixed(2)}x`);
      
      expect(cpsGrowth).toBeLessThan(5); // Less than 5x growth per student
    });
  });
  
  describe('Performance Target Scaling', () => {
    it('should meet progressive performance targets', async () => {
      const targets = [
        { count: 10, targetMs: 50 },
        { count: 20, targetMs: 200 },
        { count: 30, targetMs: 500 },
        { count: 40, targetMs: 1200 },
        { count: 50, targetMs: 2000 }
      ];
      
      console.log('\nProgressive performance target validation:');
      
      for (const { count, targetMs } of targets) {
        const dataPoint = await runScalingTest(count, 2, 50500);
        
        console.log(`${count} students: ${dataPoint.avgSolvingTimeMs.toFixed(1)}ms ` +
                   `(target: ${targetMs}ms) ${dataPoint.avgSolvingTimeMs <= targetMs ? '✓' : '✗'}`);
        
        expect(dataPoint.avgSolvingTimeMs).toBeLessThan(targetMs);
      }
    });
    
    it('should demonstrate sub-quadratic scaling to 50 students', async () => {
      const studentCounts = [10, 20, 30, 40, 50];
      const dataPoints: ScalingDataPoint[] = [];
      
      console.log('\nSub-quadratic scaling validation:');
      
      for (const count of studentCounts) {
        const dataPoint = await runScalingTest(count, 2, 50600);
        dataPoints.push(dataPoint);
        
        console.log(`${count} students: ${dataPoint.avgSolvingTimeMs.toFixed(1)}ms`);
      }
      
      const analysis = analyzeScalingPattern(dataPoints);
      
      console.log(`\nScaling pattern: ${analysis.scalingPattern}`);
      console.log(`Efficiency score: ${analysis.efficiencyScore}/100`);
      
      // Should not exhibit exponential scaling
      expect(analysis.scalingPattern).not.toBe('exponential');
      expect(analysis.efficiencyScore).toBeGreaterThan(60);
      
      // Extrapolations should be reasonable
      const extrap100 = analysis.extrapolations.find(e => e.studentCount === 100);
      if (extrap100) {
        console.log(`Extrapolated 100 students: ${extrap100.estimatedTimeMs}ms ` +
                   `(confidence: ${(extrap100.confidence * 100).toFixed(0)}%)`);
        
        // Should not predict unreasonable times
        expect(extrap100.estimatedTimeMs).toBeLessThan(30000); // Less than 30 seconds
      }
    });
  });
  
  describe('Memory Scaling Analysis', () => {
    it('should validate memory usage scales reasonably', async () => {
      const studentCounts = [15, 25, 35];
      const memoryData: { count: number; memoryMB: number; memoryPerStudent: number }[] = [];
      
      console.log('\nMemory scaling analysis:');
      
      for (const count of studentCounts) {
        // Simple memory measurement
        const memoryBefore = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
        
        const teacherAvailability = generateScalableTeacherSchedule(count);
        const teacher = createTestTeacher(teacherAvailability);
        
        const studentGenerator = new StudentGenerator(50700);
        const students = studentGenerator.generateStudents({ 
          count, 
          seed: 50700,
          allowedDurations: teacher.constraints.allowedDurations
        });
        
        const solver = new ScheduleSolver({
          enableOptimizations: true,
          logLevel: 'none'
        });
        
        solver.solve(teacher, students);
        
        const memoryAfter = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
        const memoryUsedMB = (memoryAfter - memoryBefore) / 1024 / 1024;
        const memoryPerStudent = memoryUsedMB / count;
        
        memoryData.push({
          count,
          memoryMB: memoryUsedMB,
          memoryPerStudent
        });
        
        console.log(`${count} students: ${memoryUsedMB.toFixed(2)}MB ` +
                   `(${memoryPerStudent.toFixed(3)}MB/student)`);
      }
      
      // Memory per student should not grow exponentially
      if (memoryData.length >= 2) {
        const firstMPS = memoryData[0]!.memoryPerStudent;
        const lastMPS = memoryData[memoryData.length - 1]!.memoryPerStudent;
        const memoryGrowth = lastMPS / Math.max(firstMPS, 0.001); // Avoid division by zero
        
        console.log(`Memory per student growth: ${memoryGrowth.toFixed(2)}x`);
        
        if (firstMPS > 0) {
          expect(memoryGrowth).toBeLessThan(4); // Less than 4x growth
        }
      }
    });
  });
});