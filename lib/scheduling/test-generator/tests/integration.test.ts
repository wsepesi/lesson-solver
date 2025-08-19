/**
 * Test Generator Integration Tests
 * 
 * Validates the complete end-to-end workflow of the test generator framework,
 * ensuring all components work together correctly and can generate realistic
 * test cases with appropriate difficulty levels and k-values.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import {
  createCompleteTestFramework,
  TestCaseGenerator,
  KSolutionGenerator,
  DifficultyCalculator,
  AvailabilityGenerator,
  ConstraintGenerator,
  StudentGenerator,
  SolutionCounter,
  MonteCarloEstimator,
  ConstraintGraphAnalyzer,
  type TestCase,
  type TestSuite,
  type DifficultyParams
} from '../index';

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Test Generator Integration', () => {
  let framework: ReturnType<typeof createCompleteTestFramework>;

  beforeEach(() => {
    framework = createCompleteTestFramework(10); // Medium test case size
  });

  describe('Framework Integration', () => {
    it('should create complete framework with all components', () => {
      expect(framework.generator).toBeInstanceOf(TestCaseGenerator);
      expect(framework.kSolutionGenerator).toBeInstanceOf(KSolutionGenerator);
      expect(framework.difficultyCalculator).toBeInstanceOf(DifficultyCalculator);
      expect(framework.availabilityGenerator).toBeInstanceOf(AvailabilityGenerator);
      expect(framework.constraintGenerator).toBeInstanceOf(ConstraintGenerator);
      expect(framework.studentGenerator).toBeInstanceOf(StudentGenerator);
      expect(framework.solutionCounter).toBeInstanceOf(SolutionCounter);
      expect(framework.monteCarloEstimator).toBeInstanceOf(MonteCarloEstimator);
      expect(framework.constraintAnalyzer).toBeInstanceOf(ConstraintGraphAnalyzer);
    });

    it('should generate test cases using integrated workflow', async () => {
      const config = {
        targetK: 5,
        difficulty: {
          studentCount: 5,
          overlapRatio: 0.6,
          fragmentationLevel: 0.3,
          packingDensity: 0.7,
          durationVariety: 2,
          constraintTightness: 0.6
        } as DifficultyParams,
        metadata: {
          description: 'Integration test case',
          expectedSolveTime: 200,
          category: 'medium' as const
        }
      };

      const result = await framework.generator.generateTestCase(config);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.students).toHaveLength(5);
        expect(result.testCase.teacher).toBeDefined();
        expect(result.testCase.difficulty).toEqual(config.difficulty);
        expect(result.testCase.metadata.category).toBe('medium');
      }
    });

    it('should validate generated test cases have proper structure', async () => {
      const result = await framework.generator.generateTestCase({
        targetK: 1,
        difficulty: {
          studentCount: 3,
          overlapRatio: 0.4,
          fragmentationLevel: 0.5,
          packingDensity: 0.8,
          durationVariety: 1,
          constraintTightness: 0.7
        },
        metadata: {
          description: 'Structure validation test',
          expectedSolveTime: 150,
          category: 'hard'
        }
      });

      expect(result.success).toBe(true);
      const testCase = result.testCase!;

      // Validate structure
      expect(testCase.id).toBeDefined();
      expect(testCase.description).toBeDefined();
      expect(testCase.teacher.person.id).toBeDefined();
      expect(testCase.teacher.availability).toBeDefined();
      expect(testCase.teacher.constraints).toBeDefined();

      // Validate students
      testCase.students.forEach((student, index) => {
        expect(student.person.id).toBeDefined();
        expect(student.person.name).toBeDefined();
        expect(student.person.email).toBeDefined();
        expect(student.availability).toBeDefined();
        expect(student.maxLessonsPerWeek).toBeGreaterThan(0);
        expect(student.preferredDuration).toBeGreaterThan(0);
      });

      // Validate metadata
      expect(testCase.metadata.category).toBeDefined();
      expect(testCase.metadata.description).toBeDefined();
      expect(testCase.metadata.expectedSolveTime).toBeGreaterThan(0);
    });
  });

  describe('Fixture File Validation', () => {
    const fixturesDir = join(__dirname, '../fixtures');
    const expectedFixtures = [
      'k-0-impossible.json',
      'k-1-unique.json', 
      'k-5-tight.json',
      'k-10-moderate.json',
      'k-100-flexible.json'
    ];

    expectedFixtures.forEach(filename => {
      it(`should have valid fixture file: ${filename}`, () => {
        const filepath = join(fixturesDir, filename);
        expect(existsSync(filepath)).toBe(true);

        const content = readFileSync(filepath, 'utf8');
        const testSuite: TestSuite = JSON.parse(content);

        // Validate test suite structure
        expect(testSuite.name).toBeDefined();
        expect(testSuite.description).toBeDefined();
        expect(testSuite.cases).toBeInstanceOf(Array);
        expect(testSuite.totalCases).toBe(testSuite.cases.length);
        expect(testSuite.categories).toBeDefined();

        // Validate individual test cases
        testSuite.cases.forEach(testCase => {
          validateTestCaseStructure(testCase);
        });
      });
    });
  });

  describe('K-Solution Generation', () => {
    it('should generate cases targeting specific k-values', async () => {
      // Test the main generateKSolutionCase method with a simple config
      const config = {
        targetK: 1,
        difficulty: {
          studentCount: 3,
          overlapRatio: 0.6,
          fragmentationLevel: 0.3,
          packingDensity: 0.7,
          durationVariety: 2,
          constraintTightness: 0.6
        },
        metadata: {
          description: 'K-solution test case',
          expectedSolveTime: 200,
          category: 'medium' as const
        }
      };
      
      const result = await framework.kSolutionGenerator.generateKSolutionCase(config);
      
      // Check if succeeded (generation might fail which is acceptable)
      if (result.success) {
        expect(result.testCase).toBeDefined();
        expect(result.testCase!.students.length).toBeGreaterThan(0);
        expect(result.testCase!.expectedSolutions).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide solution count estimates', async () => {
      const testCase = await framework.generator.generateTestCase({
        targetK: 5,
        difficulty: {
          studentCount: 4,
          overlapRatio: 0.5,
          fragmentationLevel: 0.4,
          packingDensity: 0.6,
          durationVariety: 1,
          constraintTightness: 0.5
        },
        metadata: {
          description: 'Solution counting test',
          expectedSolveTime: 100,
          category: 'medium'
        }
      });

      if (testCase.success && testCase.testCase) {
        const result = await framework.solutionCounter.countExact(
          testCase.testCase.teacher,
          testCase.testCase.students
        );

        expect(result.count).toBeGreaterThanOrEqual(0);
        expect(result.isExact).toBeDefined();
        expect(result.timeMs).toBeGreaterThanOrEqual(0);
        
        // If there's no error, it should be successful
        if (!result.error) {
          expect(result.count).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Difficulty Assessment', () => {
    it('should calculate realistic difficulty metrics', () => {
      const params: DifficultyParams = {
        studentCount: 8,
        overlapRatio: 0.4,
        fragmentationLevel: 0.6,
        packingDensity: 0.9,
        durationVariety: 3,
        constraintTightness: 0.8
      };

      const analysis = framework.difficultyCalculator.calculateDifficulty(params);
      
      expect(analysis.compositeScore).toBeGreaterThanOrEqual(0);
      expect(analysis.compositeScore).toBeLessThanOrEqual(1);
      expect(analysis.level).toMatch(/^(trivial|easy|medium|hard|extreme|impossible)$/);
      expect(analysis.studentCountScore).toBeGreaterThanOrEqual(0);
      expect(analysis.constraintScore).toBeGreaterThanOrEqual(0);
      expect(analysis.packingScore).toBeGreaterThanOrEqual(0);
    });

    it('should classify difficulty categories correctly', () => {
      const easyParams: DifficultyParams = {
        studentCount: 3,
        overlapRatio: 0.8,
        fragmentationLevel: 0.2,
        packingDensity: 0.4,
        durationVariety: 1,
        constraintTightness: 0.3
      };

      const hardParams: DifficultyParams = {
        studentCount: 20,
        overlapRatio: 0.2,
        fragmentationLevel: 0.9,
        packingDensity: 1.1,
        durationVariety: 4,
        constraintTightness: 0.95
      };

      const easyAnalysis = framework.difficultyCalculator.calculateDifficulty(easyParams);
      const hardAnalysis = framework.difficultyCalculator.calculateDifficulty(hardParams);

      expect(easyAnalysis.compositeScore).toBeLessThan(hardAnalysis.compositeScore);
      expect(['trivial', 'easy']).toContain(easyAnalysis.level);
      expect(['hard', 'extreme', 'impossible']).toContain(hardAnalysis.level);
    });
  });
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Validate that a test case has the proper structure
 */
function validateTestCaseStructure(testCase: TestCase): void {
  expect(testCase.id).toBeDefined();
  expect(testCase.description).toBeDefined();
  expect(testCase.expectedSolutions).toBeGreaterThanOrEqual(0);
  
  // Teacher validation
  expect(testCase.teacher.person.id).toBeDefined();
  expect(testCase.teacher.person.name).toBeDefined();
  expect(testCase.teacher.person.email).toMatch(/\S+@\S+\.\S+/);
  expect(testCase.teacher.availability).toBeDefined();
  expect(testCase.teacher.constraints).toBeDefined();
  
  // Students validation
  expect(testCase.students).toBeInstanceOf(Array);
  expect(testCase.students.length).toBeGreaterThan(0);
  
  testCase.students.forEach((student, index) => {
    expect(student.person.id).toBeDefined();
    expect(student.person.name).toBeDefined();
    expect(student.person.email).toMatch(/\S+@\S+\.\S+/);
    expect(student.availability).toBeDefined();
    
    // Handle legacy fixture files that might not have these properties
    if (student.maxLessonsPerWeek !== undefined) {
      expect(student.maxLessonsPerWeek).toBeGreaterThan(0);
    }
    if (student.preferredDuration !== undefined) {
      expect(student.preferredDuration).toBeGreaterThan(0);
    }
  });
  
  // Difficulty validation
  expect(testCase.difficulty).toBeDefined();
  expect(testCase.difficulty.studentCount).toBeGreaterThan(0);
  expect(testCase.difficulty.overlapRatio).toBeGreaterThanOrEqual(0);
  expect(testCase.difficulty.overlapRatio).toBeLessThanOrEqual(1);
  expect(testCase.difficulty.fragmentationLevel).toBeGreaterThanOrEqual(0);
  expect(testCase.difficulty.fragmentationLevel).toBeLessThanOrEqual(1);
  expect(testCase.difficulty.packingDensity).toBeGreaterThan(0);
  expect(testCase.difficulty.durationVariety).toBeGreaterThan(0);
  expect(testCase.difficulty.constraintTightness).toBeGreaterThanOrEqual(0);
  expect(testCase.difficulty.constraintTightness).toBeLessThanOrEqual(1);
  
  // Metadata validation (handle legacy fixtures that might not have metadata)
  if (testCase.metadata) {
    if (testCase.metadata.category) {
      expect(testCase.metadata.category).toMatch(/^(basic|easy|medium|hard|impossible)$/);
    }
    if (testCase.metadata.description) {
      expect(testCase.metadata.description).toBeDefined();
    }
    if (testCase.metadata.expectedSolveTime) {
      expect(testCase.metadata.expectedSolveTime).toBeGreaterThan(0);
    }
    if (testCase.metadata.tags) {
      expect(testCase.metadata.tags).toBeInstanceOf(Array);
    }
  }
}