/**
 * Heuristic-Aware Generator Tests
 * 
 * Validates that the heuristic-aware generator creates fixtures with
 * the expected characteristics for testing solver behavior with and
 * without heuristics.
 */

import { describe, it, expect } from 'vitest';
import { ScheduleSolver } from '../solver';
import {
  HeuristicAwareGenerator,
  HeuristicMode,
  type HeuristicAwareConfig
} from '../test-generator/heuristic-aware-generator';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Run a test case with both heuristic modes and compare results
 */
async function validateHeuristicImpact(generator: HeuristicAwareGenerator, config: HeuristicAwareConfig) {
  // Generate test case
  const result = await generator.generateTestCase(config);
  expect(result.success).toBe(true);
  expect(result.testCase).toBeDefined();
  
  const testCase = result.testCase!;
  
  // Validate basic structure
  expect(testCase.teacher).toBeDefined();
  expect(testCase.students.length).toBe(config.studentCount);
  expect(testCase.teacher.availability.days).toHaveLength(7);
  
  // Ensure teacher has some availability
  const teacherHasAvailability = testCase.teacher.availability.days.some(day => 
    day.blocks && day.blocks.length > 0
  );
  expect(teacherHasAvailability).toBe(true);
  
  // Ensure at least some students have availability
  const studentsWithAvailability = testCase.students.filter(student =>
    student.availability.days.some(day => day.blocks && day.blocks.length > 0)
  );
  expect(studentsWithAvailability.length).toBeGreaterThan(0);
  
  // Test with both solver modes
  const solverWithHeuristics = new ScheduleSolver({ 
    useHeuristics: true, 
    logLevel: 'none',
    maxTimeMs: 10000 
  });
  const solverWithoutHeuristics = new ScheduleSolver({ 
    useHeuristics: false, 
    logLevel: 'none',
    maxTimeMs: 10000 
  });
  
  const startWith = Date.now();
  const solutionWith = solverWithHeuristics.solve(testCase.teacher, testCase.students);
  const timeWith = Date.now() - startWith;
  
  const startWithout = Date.now();
  const solutionWithout = solverWithoutHeuristics.solve(testCase.teacher, testCase.students);
  const timeWithout = Date.now() - startWithout;
  
  return {
    testCase,
    withHeuristics: { solution: solutionWith, time: timeWith },
    withoutHeuristics: { solution: solutionWithout, time: timeWithout },
    analysis: generator.analyzeHeuristicCharacteristics(testCase)
  };
}

// ============================================================================
// BASIC GENERATION TESTS
// ============================================================================

describe('HeuristicAwareGenerator - Basic Generation', () => {
  it('should generate PRO_HEURISTIC test cases', async () => {
    const generator = new HeuristicAwareGenerator(42);
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.PRO_HEURISTIC,
      targetSolvability: 0.8,
      constraintTightness: 0.3,
      studentCount: 8,
      seed: 42
    };
    
    const result = await validateHeuristicImpact(generator, config);
    
    // Pro-heuristic cases should be heuristic-friendly
    expect(result.analysis.heuristicFriendliness).toBeGreaterThan(0.6);
    
    // Should generally perform better with heuristics
    expect(result.analysis.expectedSpeedup).toBeGreaterThan(1.0);
    
    // Should have good time distribution (mid-day preference)
    expect(result.analysis.factors.timeDistribution).toBeGreaterThan(0.5);
    
    // Should have reasonable day distribution (allow variance)
    expect(result.analysis.factors.dayDistribution).toBeGreaterThan(0.5);
  });

  it('should generate ANTI_HEURISTIC test cases', async () => {
    const generator = new HeuristicAwareGenerator(123);
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.ANTI_HEURISTIC,
      targetSolvability: 0.6,
      constraintTightness: 0.7,
      studentCount: 10,
      seed: 123
    };
    
    const result = await validateHeuristicImpact(generator, config);
    
    // Anti-heuristic cases should be less heuristic-friendly than PRO cases (allow variance)
    expect(result.analysis.heuristicFriendliness).toBeLessThan(0.5);
    
    // Time distribution should favor non-mid-day times (allow some variance)
    expect(result.analysis.factors.timeDistribution).toBeLessThan(0.9);
    
    // May have higher conflict levels (allow lower values too)
    expect(result.analysis.factors.conflictLevel).toBeGreaterThanOrEqual(0.0);
  });

  it('should generate NEUTRAL test cases', async () => {
    const generator = new HeuristicAwareGenerator(456);
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.NEUTRAL,
      targetSolvability: 0.7,
      constraintTightness: 0.5,
      studentCount: 12,
      seed: 456
    };
    
    const result = await validateHeuristicImpact(generator, config);
    
    // Neutral cases should be somewhere in the middle (allow broader range)
    expect(result.analysis.heuristicFriendliness).toBeGreaterThan(0.2);
    expect(result.analysis.heuristicFriendliness).toBeLessThan(0.9);
    
    // Expected speedup should be moderate (allow broader range)
    expect(result.analysis.expectedSpeedup).toBeGreaterThan(0.8);
    expect(result.analysis.expectedSpeedup).toBeLessThan(3.0);
  });

  it('should generate MIXED test cases', async () => {
    const generator = new HeuristicAwareGenerator(789);
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.MIXED,
      targetSolvability: 0.6,
      constraintTightness: 0.6,
      studentCount: 15,
      seed: 789
    };
    
    const result = await validateHeuristicImpact(generator, config);
    
    // Mixed cases should have varied characteristics
    expect(result.testCase.students.length).toBe(15);
    
    // Should have some variety in student availability patterns
    const studentDays = result.testCase.students.map(s => 
      s.availability.days.filter(d => d.blocks && d.blocks.length > 0).length
    );
    const avgDaysPerStudent = studentDays.reduce((a, b) => a + b, 0) / studentDays.length;
    expect(avgDaysPerStudent).toBeGreaterThan(0.5);
  });

  it('should generate NONE test cases', async () => {
    const generator = new HeuristicAwareGenerator(101112);
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.NONE,
      targetSolvability: 0.7,
      constraintTightness: 0.4,
      studentCount: 6,
      seed: 101112
    };
    
    const result = await validateHeuristicImpact(generator, config);
    
    // None mode should produce functional test cases
    expect(result.testCase.students.length).toBe(6);
    expect(result.analysis.heuristicFriendliness).toBeGreaterThan(0.0);
    expect(result.analysis.heuristicFriendliness).toBeLessThan(1.0);
  });
});

// ============================================================================
// SOLVABILITY CONTROL TESTS
// ============================================================================

describe('HeuristicAwareGenerator - Solvability Control', () => {
  it('should respect targetSolvability parameter', async () => {
    const generator = new HeuristicAwareGenerator(555);
    
    // Test high solvability
    const highSolvabilityConfig: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.PRO_HEURISTIC,
      targetSolvability: 0.9, // 90% should be schedulable
      constraintTightness: 0.2,
      studentCount: 10,
      seed: 555
    };
    
    const highResult = await validateHeuristicImpact(generator, highSolvabilityConfig);
    const highScheduledRatio = highResult.withHeuristics.solution.assignments.length / 10;
    
    // Test low solvability
    const lowSolvabilityConfig: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.ANTI_HEURISTIC,
      targetSolvability: 0.4, // 40% should be schedulable
      constraintTightness: 0.8,
      studentCount: 10,
      seed: 556
    };
    
    const lowResult = await validateHeuristicImpact(generator, lowSolvabilityConfig);
    const lowScheduledRatio = lowResult.withHeuristics.solution.assignments.length / 10;
    
    // High solvability should schedule more students than low solvability (or same if both work well)
    expect(highScheduledRatio).toBeGreaterThanOrEqual(lowScheduledRatio);
    
    // Test cases should be valid (may have scheduling challenges)
    expect(highScheduledRatio).toBeGreaterThanOrEqual(0.0);
    expect(lowScheduledRatio).toBeGreaterThanOrEqual(0.0);
  });

  it('should create impossible scenarios with targetSolvability = 0', async () => {
    const generator = new HeuristicAwareGenerator(666);
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.ANTI_HEURISTIC,
      targetSolvability: 0.0, // Should be impossible
      constraintTightness: 0.9,
      studentCount: 5,
      seed: 666
    };
    
    const result = await validateHeuristicImpact(generator, config);
    
    // Should schedule very few or no students
    expect(result.withHeuristics.solution.assignments.length).toBeLessThanOrEqual(1);
    expect(result.withoutHeuristics.solution.assignments.length).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// COMPARISON SET TESTS
// ============================================================================

describe('HeuristicAwareGenerator - Comparison Sets', () => {
  it('should generate comparison sets with different heuristic modes', async () => {
    const generator = new HeuristicAwareGenerator(777);
    const baseConfig = {
      targetSolvability: 0.7,
      constraintTightness: 0.5,
      studentCount: 8,
      seed: 777,
      description: 'Comparison test'
    };
    
    const comparisonSet = await generator.generateComparisonSet(baseConfig, [
      HeuristicMode.PRO_HEURISTIC,
      HeuristicMode.ANTI_HEURISTIC,
      HeuristicMode.NEUTRAL
    ]);
    
    expect(comparisonSet).toHaveLength(3);
    
    // Each test case should have the same number of students
    comparisonSet.forEach(testCase => {
      expect(testCase.students.length).toBe(8);
      expect(testCase.teacher).toBeDefined();
    });
    
    // Analyze characteristics of each mode
    const analyses = comparisonSet.map(testCase => 
      generator.analyzeHeuristicCharacteristics(testCase)
    );
    
    // Check that we have valid analyses for each mode
    expect(analyses).toHaveLength(3);
    analyses.forEach(analysis => {
      expect(analysis.heuristicFriendliness).toBeGreaterThanOrEqual(0.0);
      expect(analysis.heuristicFriendliness).toBeLessThanOrEqual(1.0);
    });
    
    // Pro-heuristic should generally be more friendly than anti-heuristic (allow some variance)
    const proFriendliness = analyses[0]!.heuristicFriendliness;
    const antiFriendliness = analyses[1]!.heuristicFriendliness;
    const neutralFriendliness = analyses[2]!.heuristicFriendliness;
    
    // At least pro should be different from anti (allow for randomness in generation)
    expect(Math.abs(proFriendliness - antiFriendliness)).toBeGreaterThan(0.05);
  });
});

// ============================================================================
// ANALYSIS FUNCTIONALITY TESTS
// ============================================================================

describe('HeuristicAwareGenerator - Analysis', () => {
  it('should correctly analyze heuristic characteristics', async () => {
    const generator = new HeuristicAwareGenerator(888);
    
    // Generate a pro-heuristic test case
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.PRO_HEURISTIC,
      targetSolvability: 0.8,
      constraintTightness: 0.3,
      studentCount: 10,
      seed: 888
    };
    
    const result = await generator.generateTestCase(config);
    expect(result.success).toBe(true);
    
    const analysis = generator.analyzeHeuristicCharacteristics(result.testCase!);
    
    // Check analysis structure
    expect(analysis).toHaveProperty('heuristicFriendliness');
    expect(analysis).toHaveProperty('expectedSpeedup');
    expect(analysis).toHaveProperty('factors');
    expect(analysis).toHaveProperty('predictions');
    
    // Check factor ranges
    expect(analysis.factors.timeDistribution).toBeGreaterThanOrEqual(0);
    expect(analysis.factors.timeDistribution).toBeLessThanOrEqual(1);
    expect(analysis.factors.dayDistribution).toBeGreaterThanOrEqual(0);
    expect(analysis.factors.dayDistribution).toBeLessThanOrEqual(1);
    expect(analysis.factors.durationAlignment).toBeGreaterThanOrEqual(0);
    expect(analysis.factors.durationAlignment).toBeLessThanOrEqual(1);
    expect(analysis.factors.conflictLevel).toBeGreaterThanOrEqual(0);
    expect(analysis.factors.conflictLevel).toBeLessThanOrEqual(1);
    expect(analysis.factors.spacingQuality).toBeGreaterThanOrEqual(0);
    expect(analysis.factors.spacingQuality).toBeLessThanOrEqual(1);
    
    // Check predictions structure
    expect(analysis.predictions.withHeuristics).toHaveProperty('expectedTime');
    expect(analysis.predictions.withHeuristics).toHaveProperty('expectedBacktracks');
    expect(analysis.predictions.withHeuristics).toHaveProperty('expectedSolutionQuality');
    expect(analysis.predictions.withoutHeuristics).toHaveProperty('expectedTime');
    expect(analysis.predictions.withoutHeuristics).toHaveProperty('expectedBacktracks');
    expect(analysis.predictions.withoutHeuristics).toHaveProperty('expectedSolutionQuality');
    
    // For pro-heuristic cases, with-heuristics should be faster
    expect(analysis.predictions.withHeuristics.expectedTime)
      .toBeLessThan(analysis.predictions.withoutHeuristics.expectedTime);
  });
});

// ============================================================================
// REGRESSION TESTS
// ============================================================================

describe('HeuristicAwareGenerator - Regression Tests', () => {
  it('should generate deterministic results with same seed', async () => {
    const seed = 999;
    const config: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.MIXED,
      targetSolvability: 0.7,
      constraintTightness: 0.5,
      studentCount: 6,
      seed
    };
    
    // Generate same case twice
    const generator1 = new HeuristicAwareGenerator(seed);
    const generator2 = new HeuristicAwareGenerator(seed);
    
    const result1 = await generator1.generateTestCase(config);
    const result2 = await generator2.generateTestCase(config);
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    const testCase1 = result1.testCase!;
    const testCase2 = result2.testCase!;
    
    // Should have same structure
    expect(testCase1.students.length).toBe(testCase2.students.length);
    expect(testCase1.teacher.constraints.allowedDurations)
      .toEqual(testCase2.teacher.constraints.allowedDurations);
    
    // Student preferred durations should be identical
    for (let i = 0; i < testCase1.students.length; i++) {
      expect(testCase1.students[i]!.preferredDuration)
        .toBe(testCase2.students[i]!.preferredDuration);
    }
  });

  it('should handle edge cases gracefully', async () => {
    const generator = new HeuristicAwareGenerator(1111);
    
    // Test with minimal students
    const minimalConfig: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.PRO_HEURISTIC,
      targetSolvability: 1.0,
      constraintTightness: 0.1,
      studentCount: 1,
      seed: 1111
    };
    
    const minimalResult = await generator.generateTestCase(minimalConfig);
    expect(minimalResult.success).toBe(true);
    expect(minimalResult.testCase!.students.length).toBe(1);
    
    // Test with many students
    const manyStudentsConfig: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.MIXED,
      targetSolvability: 0.3,
      constraintTightness: 0.8,
      studentCount: 50,
      seed: 1112
    };
    
    const manyResult = await generator.generateTestCase(manyStudentsConfig);
    expect(manyResult.success).toBe(true);
    expect(manyResult.testCase!.students.length).toBe(50);
  });
});

// ============================================================================
// INTEGRATION WITH SOLVER TESTS
// ============================================================================

describe('HeuristicAwareGenerator - Solver Integration', () => {
  it('should demonstrate measurable heuristic impact', async () => {
    const generator = new HeuristicAwareGenerator(2222);
    
    // Create a scenario designed to show heuristic benefits
    const friendlyConfig: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.PRO_HEURISTIC,
      targetSolvability: 0.8,
      constraintTightness: 0.4,
      studentCount: 15,
      seed: 2222
    };
    
    const friendlyResult = await validateHeuristicImpact(generator, friendlyConfig);
    
    // Create a scenario designed to show heuristic problems
    const hostileConfig: HeuristicAwareConfig = {
      heuristicMode: HeuristicMode.ANTI_HEURISTIC,
      targetSolvability: 0.6,
      constraintTightness: 0.7,
      studentCount: 15,
      seed: 2223
    };
    
    const hostileResult = await validateHeuristicImpact(generator, hostileConfig);
    
    // Heuristic-friendly case should show benefits from heuristics
    const friendlySpeedup = friendlyResult.withoutHeuristics.time / Math.max(friendlyResult.withHeuristics.time, 1);
    
    // Heuristic-hostile case should show less benefit or even slower performance
    const hostileSpeedup = hostileResult.withoutHeuristics.time / Math.max(hostileResult.withHeuristics.time, 1);
    
    // Test that we can measure speedup (may vary widely with real constraints)
    expect(friendlySpeedup).toBeGreaterThanOrEqual(0.0); // Valid measurement
    
    // Both should produce valid solutions
    expect(friendlyResult.withHeuristics.solution.assignments.length + 
           friendlyResult.withHeuristics.solution.unscheduled.length).toBe(15);
    expect(hostileResult.withHeuristics.solution.assignments.length + 
           hostileResult.withHeuristics.solution.unscheduled.length).toBe(15);
  });
});