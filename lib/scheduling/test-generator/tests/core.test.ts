/**
 * Unit tests for core test generator functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TestCaseConfig } from '../core';
import { 
  TestCaseGenerator, 
  createSeededGenerator,
  defaultGenerator
} from '../core';

describe('TestCaseGenerator', () => {
  let generator: TestCaseGenerator;
  
  beforeEach(() => {
    generator = createSeededGenerator(12345); // Use fixed seed for reproducible tests
  });
  
  describe('constructor and seeding', () => {
    it('should create generator with default random seed', () => {
      const gen = new TestCaseGenerator();
      expect(gen.getSeed()).toBeTypeOf('number');
    });
    
    it('should create generator with specific seed', () => {
      const seed = 54321;
      const gen = createSeededGenerator(seed);
      expect(gen.getSeed()).toBe(seed);
    });
    
    it('should allow seed changes', () => {
      const newSeed = 99999;
      generator.setSeed(newSeed);
      expect(generator.getSeed()).toBe(newSeed);
    });
  });
  
  describe('difficulty presets', () => {
    it('should create valid difficulty presets', () => {
      const presets = generator.createDifficultyPresets();
      
      expect(presets).toHaveProperty('trivial');
      expect(presets).toHaveProperty('easy');
      expect(presets).toHaveProperty('medium');
      expect(presets).toHaveProperty('hard');
      expect(presets).toHaveProperty('extreme');
      
      // Check that all presets have valid parameters
      Object.values(presets).forEach(preset => {
        expect(preset.studentCount).toBeGreaterThan(0);
        expect(preset.studentCount).toBeLessThanOrEqual(50);
        expect(preset.overlapRatio).toBeGreaterThanOrEqual(0);
        expect(preset.overlapRatio).toBeLessThanOrEqual(1);
        expect(preset.fragmentationLevel).toBeGreaterThanOrEqual(0);
        expect(preset.fragmentationLevel).toBeLessThanOrEqual(1);
        expect(preset.packingDensity).toBeGreaterThanOrEqual(0);
        expect(preset.packingDensity).toBeLessThanOrEqual(1);
        expect(preset.durationVariety).toBeGreaterThanOrEqual(1);
        expect(preset.durationVariety).toBeLessThanOrEqual(4);
        expect(preset.constraintTightness).toBeGreaterThanOrEqual(0);
        expect(preset.constraintTightness).toBeLessThanOrEqual(1);
      });
    });
    
    it('should have increasing difficulty across presets', () => {
      const presets = generator.createDifficultyPresets();
      
      // Student count should generally increase
      expect(presets.trivial.studentCount).toBeLessThan(presets.extreme.studentCount);
      
      // Constraint tightness should increase
      expect(presets.trivial.constraintTightness).toBeLessThan(presets.extreme.constraintTightness);
      
      // Packing density should increase
      expect(presets.trivial.packingDensity).toBeLessThan(presets.extreme.packingDensity);
    });
  });
  
  describe('k-solvability configurations', () => {
    it('should create k-solvability configurations', () => {
      const configs = generator.createKSolvabilityConfigs();
      
      expect(configs).toBeInstanceOf(Array);
      expect(configs.length).toBeGreaterThan(0);
      
      // Should have configurations for different k values
      const kValues = configs.map(config => config.targetK);
      expect(kValues).toContain(0); // Impossible
      expect(kValues).toContain(1); // Unique solution
      expect(kValues.some(k => k > 1 && k < 10)).toBe(true); // Few solutions
      expect(kValues.some(k => k >= 100)).toBe(true); // Many solutions
    });
    
    it('should have valid metadata for all configurations', () => {
      const configs = generator.createKSolvabilityConfigs();
      
      configs.forEach(config => {
        expect(config.metadata).toBeDefined();
        expect(config.metadata.description).toBeTypeOf('string');
        expect(config.metadata.description.length).toBeGreaterThan(0);
        expect(config.metadata.expectedSolveTime).toBeTypeOf('number');
        expect(config.metadata.expectedSolveTime).toBeGreaterThan(0);
        expect(['basic', 'easy', 'medium', 'hard', 'impossible']).toContain(config.metadata.category);
      });
    });
  });
  
  describe('test case generation', () => {
    it('should generate basic test case', async () => {
      const config: TestCaseConfig = {
        targetK: 1,
        difficulty: {
          studentCount: 5,
          overlapRatio: 0.7,
          fragmentationLevel: 0.2,
          packingDensity: 0.5,
          durationVariety: 2,
          constraintTightness: 0.3
        },
        metadata: {
          description: 'Basic test case',
          expectedSolveTime: 100,
          category: 'easy'
        }
      };
      
      const result = await generator.generateTestCase(config);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      expect(result.generationTimeMs).toBeTypeOf('number');
      expect(result.attempts).toBeGreaterThan(0);
      
      if (result.testCase) {
        expect(result.testCase.id).toBeTypeOf('string');
        expect(result.testCase.description).toBe(config.metadata.description);
        expect(result.testCase.students).toHaveLength(config.difficulty.studentCount);
        expect(result.testCase.expectedSolutions).toBe(config.targetK);
        expect(result.testCase.difficulty).toEqual(config.difficulty);
        expect(result.testCase.createdAt).toBeInstanceOf(Date);
      }
    });
    
    it('should generate test suite', async () => {
      const configs = generator.createKSolvabilityConfigs().slice(0, 3); // Take first 3 for speed
      
      const suite = await generator.generateTestSuite(
        'Test Suite',
        'Test suite description',
        configs
      );
      
      expect(suite.name).toBe('Test Suite');
      expect(suite.description).toBe('Test suite description');
      expect(suite.cases).toBeInstanceOf(Array);
      expect(suite.totalCases).toBe(suite.cases.length);
      expect(suite.categories).toBeTypeOf('object');
      expect(suite.createdAt).toBeInstanceOf(Date);
      
      // Check that categories are correctly counted
      const categoryCounts: Record<string, number> = {};
      suite.cases.forEach(testCase => {
        const category = testCase.metadata.category;
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      });
      
      expect(suite.categories).toEqual(categoryCounts);
    });
  });
  
  describe('placeholder implementations', () => {
    it('should create valid placeholder teacher', async () => {
      const config: TestCaseConfig = {
        targetK: 1,
        difficulty: {
          studentCount: 3,
          overlapRatio: 0.5,
          fragmentationLevel: 0.3,
          packingDensity: 0.4,
          durationVariety: 2,
          constraintTightness: 0.3
        },
        metadata: {
          description: 'Test',
          expectedSolveTime: 100,
          category: 'easy'
        }
      };
      
      const result = await generator.generateTestCase(config);
      
      expect(result.testCase?.teacher).toBeDefined();
      const teacher = result.testCase!.teacher;
      
      expect(teacher.person.id).toBeTypeOf('string');
      expect(teacher.person.name).toBeTypeOf('string');
      expect(teacher.person.email).toBeTypeOf('string');
      expect(teacher.studioId).toBeTypeOf('string');
      expect(teacher.availability).toBeDefined();
      expect(teacher.constraints).toBeDefined();
      expect(teacher.constraints.allowedDurations).toBeInstanceOf(Array);
      expect(teacher.constraints.allowedDurations.length).toBeGreaterThan(0);
    });
    
    it('should create valid placeholder students', async () => {
      const studentCount = 7;
      const config: TestCaseConfig = {
        targetK: 1,
        difficulty: {
          studentCount,
          overlapRatio: 0.5,
          fragmentationLevel: 0.3,
          packingDensity: 0.4,
          durationVariety: 2,
          constraintTightness: 0.3
        },
        metadata: {
          description: 'Test',
          expectedSolveTime: 100,
          category: 'easy'
        }
      };
      
      const result = await generator.generateTestCase(config);
      
      expect(result.testCase?.students).toHaveLength(studentCount);
      
      result.testCase!.students.forEach((student, index) => {
        expect(student.person.id).toBe(`student_${index + 1}`);
        expect(student.person.name).toBeTypeOf('string');
        expect(student.person.email).toBeTypeOf('string');
        expect(student.preferredDuration).toBeTypeOf('number');
        expect(student.preferredDuration).toBeGreaterThan(0);
        expect(student.maxLessonsPerWeek).toBeTypeOf('number');
        expect(student.maxLessonsPerWeek).toBeGreaterThan(0);
        expect(student.availability).toBeDefined();
      });
    });
  });
  
  describe('ID generation', () => {
    it('should generate unique IDs', async () => {
      const config: TestCaseConfig = {
        targetK: 1,
        difficulty: {
          studentCount: 3,
          overlapRatio: 0.5,
          fragmentationLevel: 0.3,
          packingDensity: 0.4,
          durationVariety: 2,
          constraintTightness: 0.3
        },
        metadata: {
          description: 'Test',
          expectedSolveTime: 100,
          category: 'easy'
        }
      };
      
      const result1 = await generator.generateTestCase(config);
      const result2 = await generator.generateTestCase(config);
      
      expect(result1.testCase?.id).toBeDefined();
      expect(result2.testCase?.id).toBeDefined();
      expect(result1.testCase?.id).not.toBe(result2.testCase?.id);
    });
    
    it('should generate IDs with correct format', async () => {
      const config: TestCaseConfig = {
        targetK: 1,
        difficulty: {
          studentCount: 3,
          overlapRatio: 0.5,
          fragmentationLevel: 0.3,
          packingDensity: 0.4,
          durationVariety: 2,
          constraintTightness: 0.3
        },
        metadata: {
          description: 'Test',
          expectedSolveTime: 100,
          category: 'easy'
        }
      };
      
      const result = await generator.generateTestCase(config);
      const id = result.testCase?.id;
      
      expect(id).toMatch(/^tc_[a-z0-9]+_[a-z0-9]+$/);
    });
  });
});

describe('defaultGenerator', () => {
  it('should be a TestCaseGenerator instance', () => {
    expect(defaultGenerator).toBeInstanceOf(TestCaseGenerator);
  });
  
  it('should have a numeric seed', () => {
    expect(defaultGenerator.getSeed()).toBeTypeOf('number');
  });
});

describe('createSeededGenerator', () => {
  it('should create generator with specified seed', () => {
    const seed = 42;
    const generator = createSeededGenerator(seed);
    
    expect(generator).toBeInstanceOf(TestCaseGenerator);
    expect(generator.getSeed()).toBe(seed);
  });
  
  it('should create reproducible results with same seed', async () => {
    const seed = 999;
    const gen1 = createSeededGenerator(seed);
    const gen2 = createSeededGenerator(seed);
    
    const config: TestCaseConfig = {
      targetK: 1,
      difficulty: {
        studentCount: 3,
        overlapRatio: 0.5,
        fragmentationLevel: 0.3,
        packingDensity: 0.4,
        durationVariety: 2,
        constraintTightness: 0.3
      },
      metadata: {
        description: 'Reproducibility test',
        expectedSolveTime: 100,
        category: 'easy'
      }
    };
    
    const result1 = await gen1.generateTestCase(config);
    const result2 = await gen2.generateTestCase(config);
    
    // Should have same structure (though IDs will differ due to timestamps)
    expect(result1.success).toBe(result2.success);
    expect(result1.testCase?.students.length).toBe(result2.testCase?.students.length);
    expect(result1.testCase?.expectedSolutions).toBe(result2.testCase?.expectedSolutions);
  });
});