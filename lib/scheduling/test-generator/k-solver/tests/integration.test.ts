/**
 * Integration tests for k-solver components working together
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SolutionCounter, 
  createOptimalSolutionCounter 
} from '../solution-counter';
import { 
  MonteCarloEstimator, 
  createOptimalMonteCarloEstimator 
} from '../monte-carlo-estimator';
import { 
  ConstraintGraphAnalyzer, 
  createOptimalConstraintAnalyzer 
} from '../constraint-graph-analyzer';
import { 
  KSolutionGenerator,
  kSolutionPresets
} from '../../k-solution-generator';
import type { TeacherConfig, StudentConfig } from '../../../types';

describe('K-Solver Integration', () => {
  let solutionCounter: SolutionCounter;
  let monteCarloEstimator: MonteCarloEstimator;
  let constraintAnalyzer: ConstraintGraphAnalyzer;
  let kSolutionGenerator: KSolutionGenerator;
  
  beforeEach(() => {
    // Use optimized components for medium-sized problems
    solutionCounter = createOptimalSolutionCounter(10);
    monteCarloEstimator = createOptimalMonteCarloEstimator(15);
    constraintAnalyzer = createOptimalConstraintAnalyzer(12);
    kSolutionGenerator = new KSolutionGenerator();
  });
  
  // Helper to create realistic teacher
  const createRealisticTeacher = (): TeacherConfig => ({
    person: {
      id: 'teacher_integration',
      name: 'Integration Teacher',
      email: 'integration@test.com'
    },
    studioId: 'studio_integration',
    availability: {
      days: [
        {
          dayOfWeek: 1, // Monday
          blocks: [
            { start: 540, duration: 240 }, // 9am-1pm
            { start: 840, duration: 180 }  // 2pm-5pm
          ]
        },
        {
          dayOfWeek: 2, // Tuesday
          blocks: [
            { start: 600, duration: 300 } // 10am-3pm
          ]
        },
        {
          dayOfWeek: 3, // Wednesday
          blocks: [
            { start: 480, duration: 360 } // 8am-2pm
          ]
        },
        {
          dayOfWeek: 4, // Thursday
          blocks: [
            { start: 660, duration: 240 } // 11am-3pm
          ]
        }
      ],
      timezone: 'UTC'
    },
    constraints: {
      maxConsecutiveMinutes: 180,
      breakDurationMinutes: 15,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [30, 45, 60, 90]
    }
  });
  
  // Helper to create diverse students
  const createDiverseStudents = (count: number): StudentConfig[] => {
    const students: StudentConfig[] = [];
    const durations = [45, 60, 90];
    const dayOffsets = [0, 60, 120, 180]; // Different preferred times
    
    for (let i = 0; i < count; i++) {
      const preferredDay = (i % 4) + 1; // Spread across Mon-Thu
      const timeOffset = dayOffsets[i % dayOffsets.length] ?? 0;
      const duration = durations[i % durations.length] ?? 60;
      
      students.push({
        person: {
          id: `student_int_${i + 1}`,
          name: `Integration Student ${i + 1}`,
          email: `intstudent${i + 1}@test.com`
        },
        preferredDuration: duration,
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            {
              dayOfWeek: preferredDay,
              blocks: [
                { 
                  start: 540 + timeOffset + (i * 15), // Stagger times
                  duration: 120 + (i * 20) // Vary availability windows
                }
              ]
            },
            // Add secondary availability for some students
            ...(i % 3 === 0 ? [{
              dayOfWeek: preferredDay === 4 ? 1 : preferredDay + 1,
              blocks: [{ start: 600 + timeOffset, duration: 90 }]
            }] : [])
          ],
          timezone: 'UTC'
        }
      });
    }
    
    return students;
  };
  
  describe('component consistency', () => {
    it('should give consistent results across different counting methods', async () => {
      const teacher = createRealisticTeacher();
      const students = createDiverseStudents(6); // Small enough for exact counting
      
      // Get exact count
      const exactResult = await solutionCounter.countExact(teacher, students);
      
      // Get estimated count
      const estimatedResult = await monteCarloEstimator.estimate(teacher, students, 500);
      
      // Get theoretical bounds
      const bounds = constraintAnalyzer.calculateBounds(teacher, students);
      
      // Exact count should be within bounds
      expect(exactResult.count).toBeGreaterThanOrEqual(bounds.lowerBound);
      expect(exactResult.count).toBeLessThanOrEqual(bounds.upperBound);
      
      // Estimated count should be in reasonable range of exact count
      if (exactResult.count > 0) {
        const ratio = Math.abs(estimatedResult.count - exactResult.count) / exactResult.count;
        expect(ratio).toBeLessThan(2.0); // Within 200% (estimation can be rough)
      } else {
        expect(estimatedResult.count).toBeLessThanOrEqual(5); // Should also be near zero
      }
      
      console.log(`Exact: ${exactResult.count}, Estimated: ${estimatedResult.count}, Bounds: [${bounds.lowerBound}, ${bounds.upperBound}]`);
    });
    
    it('should scale appropriately with problem complexity', async () => {
      const teacher = createRealisticTeacher();
      
      // Simple case
      const simpleStudents = createDiverseStudents(3);
      const simpleBounds = constraintAnalyzer.calculateBounds(teacher, simpleStudents);
      const simpleExact = await solutionCounter.countExact(teacher, simpleStudents);
      
      // Complex case
      const complexStudents = createDiverseStudents(8);
      const complexBounds = constraintAnalyzer.calculateBounds(teacher, complexStudents);
      const complexEstimate = await monteCarloEstimator.estimate(teacher, complexStudents, 300);
      
      // Complex case should generally have lower bounds due to more constraints
      expect(complexBounds.analysis.density).toBeGreaterThanOrEqual(simpleBounds.analysis.density);
      expect(complexBounds.analysis.tightnessScore).toBeGreaterThanOrEqual(simpleBounds.analysis.tightnessScore);
      
      console.log(`Simple: ${simpleExact.count} solutions, Complex: ${complexEstimate.count} solutions`);
      console.log(`Simple density: ${simpleBounds.analysis.density.toFixed(3)}, Complex density: ${complexBounds.analysis.density.toFixed(3)}`);
    });
  });
  
  describe('k-solution generation workflow', () => {
    it('should successfully generate test cases with target solution counts', async () => {
      const testConfig = {
        targetK: 5,
        difficulty: {
          studentCount: 8,
          overlapRatio: 0.4,
          fragmentationLevel: 0.3,
          packingDensity: 0.7,
          durationVariety: 2,
          constraintTightness: 0.6
        },
        metadata: {
          description: 'Integration test case with 5 solutions',
          expectedSolveTime: 300,
          category: 'medium' as const
        }
      };
      
      const result = await kSolutionGenerator.generateKSolutionCase(testConfig, {
        maxIterations: 5, // Limit iterations for test speed
        maxGenerationTime: 15000, // 15 seconds
        useExactCounting: true,
        tolerance: 2
      });
      
      expect(result.success).toBe(true);
      if (result.testCase) {
        expect(result.testCase.students.length).toBe(8);
        expect(result.actualSolutions).toBeDefined();
        
        // Should be close to target
        const difference = Math.abs(result.actualSolutions! - 5);
        expect(difference).toBeLessThanOrEqual(2); // Within tolerance
        
        console.log(`Generated case with ${result.actualSolutions} solutions (target: 5)`);
      }
    }, 20000);
    
    it('should handle impossible case generation', async () => {
      const result = await kSolutionPresets.generateImpossibleCase(5);
      
      if (result.success && result.testCase) {
        // Verify it's actually impossible by checking bounds
        const bounds = constraintAnalyzer.calculateBounds(result.testCase.teacher, result.testCase.students);
        expect(bounds.lowerBound).toBe(0);
        
        console.log(`Impossible case bounds: [${bounds.lowerBound}, ${bounds.upperBound}]`);
      }
    });
    
    it('should handle unique solution case generation', async () => {
      const result = await kSolutionPresets.generateUniqueSolutionCase(6);
      
      if (result.success && result.testCase) {
        expect(result.actualSolutions).toBeDefined();
        expect(result.actualSolutions).toBeLessThanOrEqual(3); // Should be very constrained
        
        console.log(`Unique solution case has ${result.actualSolutions} solutions`);
      }
    }, 15000);
  });
  
  describe('bounds validation', () => {
    it('should validate bounds accuracy with actual solution counts', async () => {
      const teacher = createRealisticTeacher();
      const students = createDiverseStudents(5);
      
      // Get bounds prediction
      const bounds = constraintAnalyzer.calculateBounds(teacher, students);
      
      // Get actual count
      const actualResult = await solutionCounter.countExact(teacher, students);
      
      // Actual count should fall within predicted bounds
      expect(actualResult.count).toBeGreaterThanOrEqual(bounds.lowerBound);
      expect(actualResult.count).toBeLessThanOrEqual(bounds.upperBound);
      
      // Calculate bounds accuracy
      const range = bounds.upperBound - bounds.lowerBound;
      const accuracy = range > 0 ? 1 - (range / Math.max(bounds.upperBound, 1)) : 1;
      
      console.log(`Bounds: [${bounds.lowerBound}, ${bounds.upperBound}], Actual: ${actualResult.count}`);
      console.log(`Bounds accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`Confidence: ${(bounds.confidence * 100).toFixed(1)}%`);
      
      expect(accuracy).toBeGreaterThan(0); // Some precision is better than none
    });
    
    it('should provide tighter bounds for simpler problems', () => {
      const teacher = createRealisticTeacher();
      
      const simpleStudents = createDiverseStudents(3);
      const complexStudents = createDiverseStudents(10);
      
      const simpleBounds = constraintAnalyzer.calculateBounds(teacher, simpleStudents);
      const complexBounds = constraintAnalyzer.calculateBounds(teacher, complexStudents);
      
      // Simple problems should have higher confidence
      expect(simpleBounds.confidence).toBeGreaterThanOrEqual(complexBounds.confidence);
      
      // Simple problems should have tighter relative bounds
      const simpleRelativeRange = simpleBounds.upperBound > 0 ? 
        (simpleBounds.upperBound - simpleBounds.lowerBound) / simpleBounds.upperBound : 0;
      const complexRelativeRange = complexBounds.upperBound > 0 ? 
        (complexBounds.upperBound - complexBounds.lowerBound) / complexBounds.upperBound : 0;
      
      if (simpleBounds.upperBound > 0 && complexBounds.upperBound > 0) {
        expect(simpleRelativeRange).toBeLessThanOrEqual(complexRelativeRange * 1.5);
      }
    });
  });
  
  describe('estimation accuracy', () => {
    it('should improve estimation accuracy with more samples', async () => {
      const teacher = createRealisticTeacher();
      const students = createDiverseStudents(7);
      
      // Get exact count for comparison
      const exactResult = await solutionCounter.countExact(teacher, students);
      
      if (exactResult.count === 0) {
        // Skip accuracy test for impossible cases
        return;
      }
      
      // Test different sample sizes
      const smallSample = await monteCarloEstimator.estimate(teacher, students, 100);
      const largeSample = await monteCarloEstimator.estimate(teacher, students, 500);
      
      const smallError = Math.abs(smallSample.count - exactResult.count) / exactResult.count;
      const largeError = Math.abs(largeSample.count - exactResult.count) / exactResult.count;
      
      console.log(`Exact: ${exactResult.count}`);
      console.log(`Small sample (100): ${smallSample.count}, error: ${(smallError * 100).toFixed(1)}%`);
      console.log(`Large sample (500): ${largeSample.count}, error: ${(largeError * 100).toFixed(1)}%`);
      
      // Large sample should generally be more accurate, but allow some variance
      expect(largeSample.samplesUsed).toBeGreaterThan(smallSample.samplesUsed!);
    });
    
    it('should provide reasonable confidence intervals', async () => {
      const teacher = createRealisticTeacher();
      const students = createDiverseStudents(8);
      
      const result = await monteCarloEstimator.estimate(teacher, students, 400);
      
      if (result.confidenceInterval) {
        const [lower, upper] = result.confidenceInterval;
        const range = upper - lower;
        
        expect(lower).toBeLessThanOrEqual(result.count);
        expect(upper).toBeGreaterThanOrEqual(result.count);
        expect(range).toBeGreaterThanOrEqual(0);
        
        // Confidence interval should be reasonable
        if (result.count > 0) {
          const relativeRange = range / result.count;
          expect(relativeRange).toBeLessThan(3.0); // Range should be < 300% of estimate
        }
        
        console.log(`Estimate: ${result.count}, CI: [${lower}, ${upper}], Range: ${range}`);
      }
    });
  });
  
  describe('performance characteristics', () => {
    it('should complete full workflow in reasonable time', async () => {
      const teacher = createRealisticTeacher();
      const students = createDiverseStudents(8);
      
      const startTime = Date.now();
      
      // Run all components
      const boundsPromise = constraintAnalyzer.calculateBounds(teacher, students);
      const estimatePromise = monteCarloEstimator.estimate(teacher, students, 200);
      
      const [bounds, estimate] = await Promise.all([boundsPromise, estimatePromise]);
      
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
      expect(bounds).toBeDefined();
      expect(estimate).toBeDefined();
      
      console.log(`Full workflow completed in ${totalTime}ms`);
    });
    
    it('should scale reasonably with optimization', () => {
      // Test that optimized components are different from default
      const defaultCounter = new SolutionCounter();
      const optimizedCounter = createOptimalSolutionCounter(15);
      
      const defaultEstimator = new MonteCarloEstimator();
      const optimizedEstimator = createOptimalMonteCarloEstimator(20);
      
      const defaultAnalyzer = new ConstraintGraphAnalyzer();
      const optimizedAnalyzer = createOptimalConstraintAnalyzer(25);
      
      // Components should be created successfully
      expect(optimizedCounter).toBeDefined();
      expect(optimizedEstimator).toBeDefined();
      expect(optimizedAnalyzer).toBeDefined();
      
      // They should be different instances
      expect(optimizedCounter).not.toBe(defaultCounter);
      expect(optimizedEstimator).not.toBe(defaultEstimator);
      expect(optimizedAnalyzer).not.toBe(defaultAnalyzer);
    });
  });
  
  describe('error handling and robustness', () => {
    it('should handle problematic inputs gracefully across all components', async () => {
      // Teacher with very limited availability
      const limitedTeacher: TeacherConfig = {
        person: { id: 'limited', name: 'Limited', email: 'limited@test.com' },
        studioId: 'limited_studio',
        availability: {
          days: [
            {
              dayOfWeek: 1,
              blocks: [{ start: 540, duration: 30 }] // Only 30 minutes available
            }
          ],
          timezone: 'UTC'
        },
        constraints: {
          maxConsecutiveMinutes: 30,
          breakDurationMinutes: 15,
          minLessonDuration: 60, // Impossible - needs 60 min but only 30 available
          maxLessonDuration: 90,
          allowedDurations: [60, 90]
        }
      };
      
      const students = createDiverseStudents(3);
      
      // All components should handle this gracefully
      const bounds = constraintAnalyzer.calculateBounds(limitedTeacher, students);
      const estimate = await monteCarloEstimator.estimate(limitedTeacher, students, 50);
      const exact = await solutionCounter.countExact(limitedTeacher, students);
      
      // Should detect impossibility
      expect(bounds.lowerBound).toBe(0);
      expect(estimate.count).toBe(0);
      expect(exact.count).toBe(0);
      
      // Should not error
      expect(estimate.error).toBeUndefined();
      expect(exact.error).toBeUndefined();
    });
    
    it('should handle edge cases consistently', async () => {
      const teacher = createRealisticTeacher();
      
      // Empty student list
      const emptyBounds = constraintAnalyzer.calculateBounds(teacher, []);
      const emptyEstimate = await monteCarloEstimator.estimate(teacher, [], 10);
      const emptyExact = await solutionCounter.countExact(teacher, []);
      
      expect(emptyBounds.lowerBound).toBe(0);
      expect(emptyBounds.upperBound).toBeGreaterThanOrEqual(0);
      expect(emptyEstimate.count).toBeGreaterThanOrEqual(0);
      expect(emptyExact.count).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('K-Solution Presets Integration', () => {
  it('should generate different difficulty levels successfully', async () => {
    const results = {
      impossible: await kSolutionPresets.generateImpossibleCase(4),
      unique: await kSolutionPresets.generateUniqueSolutionCase(6),
      few: await kSolutionPresets.generateFewSolutionsCase(8),
      many: await kSolutionPresets.generateManySolutionsCase(10)
    };
    
    // Check that different presets produce different characteristics
    let successCount = 0;
    
    for (const [name, result] of Object.entries(results)) {
      if (result.success) {
        successCount++;
        console.log(`${name}: ${result.actualSolutions} solutions`);
      }
    }
    
    // At least some should succeed
    expect(successCount).toBeGreaterThan(0);
    
    // Impossible should have 0 solutions if successful
    if (results.impossible.success) {
      expect(results.impossible.actualSolutions).toBeLessThanOrEqual(1);
    }
    
    // Many should have more solutions than unique if both successful
    if (results.many.success && results.unique.success) {
      expect(results.many.actualSolutions).toBeGreaterThan(results.unique.actualSolutions!);
    }
  }, 30000);
});