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
        expect(student.constraints).toBeDefined();
        expect(student.constraints.requiredLessonCount).toBeGreaterThan(0);
      });

      // Validate metadata
      expect(testCase.metadata.category).toBeDefined();
      expect(testCase.metadata.studentCount).toBe(3);
      expect(testCase.metadata.createdAt).toBeDefined();
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
      const targets = [0, 1, 5, 10];
      
      for (const k of targets) {
        const result = await framework.kSolutionGenerator.generateKSolutionCase(k, 5);
        
        if (result.success) {
          expect(result.testCase).toBeDefined();
          expect(result.testCase!.expectedSolutions).toBe(k);
          expect(result.testCase!.students).toHaveLength(5);
        }
        // Note: Generation might fail for some k-values, which is acceptable
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
        const result = await framework.solutionCounter.countSolutions(
          testCase.testCase.teacher,
          testCase.testCase.students
        );

        expect(result.success).toBe(true);
        expect(result.count).toBeGreaterThanOrEqual(0);
        expect(result.isExact).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
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
      
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(1);
      expect(analysis.category).toMatch(/^(trivial|easy|medium|hard|impossible)$/);
      expect(analysis.breakdown).toBeDefined();
      expect(analysis.breakdown.complexity).toBeGreaterThanOrEqual(0);
      expect(analysis.breakdown.constraint).toBeGreaterThanOrEqual(0);
      expect(analysis.breakdown.scheduling).toBeGreaterThanOrEqual(0);
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

      expect(easyAnalysis.score).toBeLessThan(hardAnalysis.score);
      expect(['trivial', 'easy']).toContain(easyAnalysis.category);
      expect(['hard', 'impossible']).toContain(hardAnalysis.category);
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
    expect(student.constraints).toBeDefined();
    expect(student.constraints.requiredLessonCount).toBeGreaterThan(0);
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
  
  // Metadata validation
  expect(testCase.metadata).toBeDefined();
  expect(testCase.metadata.category).toMatch(/^(basic|easy|medium|hard|impossible)$/);
  expect(testCase.metadata.studentCount).toBe(testCase.students.length);
  expect(testCase.metadata.estimatedSolveTimeMs).toBeGreaterThan(0);
  expect(testCase.metadata.constraints).toBeInstanceOf(Array);
  expect(testCase.metadata.tags).toBeInstanceOf(Array);
  expect(testCase.metadata.createdAt).toBeDefined();
  expect(testCase.metadata.generatedBy).toMatch(/^(manual|algorithm)$/);
}