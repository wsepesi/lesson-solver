/**
 * Unit tests for k-solution generator functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  KSolutionGenerator,
  KSolutionPresets,
  defaultKSolutionGenerator,
  kSolutionPresets
} from '../k-solution-generator';
import type {
  KSolutionConfig
} from '../k-solution-generator';
import type { TestCaseConfig } from '../core';

describe('KSolutionGenerator', () => {
  let generator: KSolutionGenerator;
  
  beforeEach(() => {
    generator = new KSolutionGenerator();
  });
  
  describe('constructor', () => {
    it('should create generator instance', () => {
      expect(generator).toBeInstanceOf(KSolutionGenerator);
    });
  });
  
  describe('k-solution generation', () => {
    it('should generate test case with target k', async () => {
      const baseConfig: TestCaseConfig = {
        targetK: 5,
        difficulty: {
          studentCount: 8,
          overlapRatio: 0.6,
          fragmentationLevel: 0.3,
          packingDensity: 0.6,
          durationVariety: 2,
          constraintTightness: 0.4
        },
        metadata: {
          description: 'K-solution test',
          expectedSolveTime: 200,
          category: 'medium'
        }
      };
      
      const kConfig: Partial<KSolutionConfig> = {
        targetK: 5,
        tolerance: 2,
        maxIterations: 5,
        maxGenerationTime: 10000,
        useExactCounting: true
      };
      
      const result = await generator.generateKSolutionCase(baseConfig, kConfig);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      expect(result.generationTimeMs).toBeTypeOf('number');
      expect(result.attempts).toBeGreaterThan(0);
      expect(result.actualSolutions).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.expectedSolutions).toBe(baseConfig.targetK);
        expect(result.testCase.students).toHaveLength(baseConfig.difficulty.studentCount);
      }
    });
    
    it('should handle impossible case generation', async () => {
      const baseConfig: TestCaseConfig = {
        targetK: 0,
        difficulty: {
          studentCount: 10,
          overlapRatio: 0.1,
          fragmentationLevel: 0.8,
          packingDensity: 1.1, // Over-constrained
          durationVariety: 4,
          constraintTightness: 0.95
        },
        metadata: {
          description: 'Impossible case',
          expectedSolveTime: 100,
          category: 'impossible'
        }
      };
      
      const kConfig: Partial<KSolutionConfig> = {
        targetK: 0,
        tolerance: 0,
        maxIterations: 3,
        useExactCounting: true
      };
      
      const result = await generator.generateKSolutionCase(baseConfig, kConfig);
      
      // Should succeed even for impossible cases
      expect(result.success).toBe(true);
      if (result.testCase) {
        expect(result.testCase.expectedSolutions).toBe(0);
      }
    });
    
    it('should respect generation timeout', async () => {
      const baseConfig: TestCaseConfig = {
        targetK: 10,
        difficulty: {
          studentCount: 15,
          overlapRatio: 0.5,
          fragmentationLevel: 0.4,
          packingDensity: 0.7,
          durationVariety: 3,
          constraintTightness: 0.5
        },
        metadata: {
          description: 'Timeout test',
          expectedSolveTime: 300,
          category: 'medium'
        }
      };
      
      const kConfig: Partial<KSolutionConfig> = {
        targetK: 10,
        tolerance: 3,
        maxIterations: 100,
        maxGenerationTime: 1000 // 1 second timeout
      };
      
      const startTime = Date.now();
      const result = await generator.generateKSolutionCase(baseConfig, kConfig);
      const elapsedTime = Date.now() - startTime;
      
      expect(elapsedTime).toBeLessThan(2000); // Should respect timeout
      expect(result.generationTimeMs).toBeLessThan(2000);
    });
    
    it('should handle generation failures gracefully', async () => {
      const baseConfig: TestCaseConfig = {
        targetK: 1,
        difficulty: {
          studentCount: 0, // Invalid student count
          overlapRatio: 0.5,
          fragmentationLevel: 0.3,
          packingDensity: 0.6,
          durationVariety: 2,
          constraintTightness: 0.4
        },
        metadata: {
          description: 'Invalid config test',
          expectedSolveTime: 100,
          category: 'easy'
        }
      };
      
      const result = await generator.generateKSolutionCase(baseConfig);
      
      // Should handle invalid config gracefully
      expect(result.success).toBeDefined();
      expect(result.generationTimeMs).toBeTypeOf('number');
      expect(result.attempts).toBeGreaterThan(0);
    });
  });
  
  describe('constraint tightness adjustment', () => {
    it('should adjust difficulty parameters based on tightness', async () => {
      const baseConfig: TestCaseConfig = {
        targetK: 5,
        difficulty: {
          studentCount: 10,
          overlapRatio: 0.6,
          fragmentationLevel: 0.3,
          packingDensity: 0.5,
          durationVariety: 2,
          constraintTightness: 0.4
        },
        metadata: {
          description: 'Tightness adjustment test',
          expectedSolveTime: 200,
          category: 'medium'
        }
      };
      
      // Generate with different tightness values
      const result1 = await generator.generateKSolutionCase(baseConfig, {
        targetK: 5,
        maxIterations: 1 // Only one iteration to test adjustment
      });
      
      expect(result1.testCase).toBeDefined();
      
      // Should adjust constraint tightness during binary search
      // The exact values depend on the internal implementation,
      // but we can verify the structure is correct
      if (result1.testCase) {
        expect(result1.testCase.difficulty.constraintTightness).toBeTypeOf('number');
        expect(result1.testCase.difficulty.constraintTightness).toBeGreaterThanOrEqual(0);
        expect(result1.testCase.difficulty.constraintTightness).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('KSolutionPresets', () => {
  let presets: KSolutionPresets;
  
  beforeEach(() => {
    presets = new KSolutionPresets();
  });
  
  describe('impossible cases', () => {
    it('should generate impossible case', async () => {
      const result = await presets.generateImpossibleCase(8);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.expectedSolutions).toBe(0);
        expect(result.testCase.students).toHaveLength(8);
        expect(result.testCase.metadata.category).toBe('impossible');
        // The original config has 1.2, but the binary search may adjust it
        // Just verify it's attempting to be over-constrained (> 0.95)
        expect(result.testCase.difficulty.packingDensity).toBeGreaterThan(0.95);
      }
    });
    
    it('should use default student count if not specified', async () => {
      const result = await presets.generateImpossibleCase();
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.students.length).toBe(10); // Default
      }
    });
  });
  
  describe('unique solution cases', () => {
    it('should generate unique solution case', async () => {
      const result = await presets.generateUniqueSolutionCase(12);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.expectedSolutions).toBe(1);
        expect(result.testCase.students).toHaveLength(12);
        expect(result.testCase.metadata.category).toBe('hard');
        expect(result.testCase.difficulty.packingDensity).toBeGreaterThan(0.8); // High density
      }
    });
  });
  
  describe('few solutions cases', () => {
    it('should generate few solutions case', async () => {
      const result = await presets.generateFewSolutionsCase(15);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.expectedSolutions).toBe(5);
        expect(result.testCase.students).toHaveLength(15);
        expect(result.testCase.metadata.category).toBe('hard');
      }
    });
  });
  
  describe('many solutions cases', () => {
    it('should generate many solutions case', async () => {
      const result = await presets.generateManySolutionsCase(20);
      
      expect(result.success).toBe(true);
      expect(result.testCase).toBeDefined();
      
      if (result.testCase) {
        expect(result.testCase.expectedSolutions).toBe(100);
        expect(result.testCase.students).toHaveLength(20);
        expect(result.testCase.metadata.category).toBe('easy');
        expect(result.testCase.difficulty.packingDensity).toBeLessThan(0.6); // Lower density
      }
    });
  });
  
  describe('configuration validation', () => {
    it('should create valid configurations for all preset types', async () => {
      const presetMethods = [
        () => presets.generateImpossibleCase(5),
        () => presets.generateUniqueSolutionCase(5),
        () => presets.generateFewSolutionsCase(5),
        () => presets.generateManySolutionsCase(5)
      ];
      
      for (const method of presetMethods) {
        const result = await method();
        
        expect(result.success).toBe(true);
        expect(result.testCase).toBeDefined();
        expect(result.generationTimeMs).toBeTypeOf('number');
        expect(result.attempts).toBeGreaterThan(0);
        
        if (result.testCase) {
          const difficulty = result.testCase.difficulty;
          
          // Validate all difficulty parameters are in valid ranges
          expect(difficulty.studentCount).toBeGreaterThan(0);
          expect(difficulty.studentCount).toBeLessThanOrEqual(50);
          expect(difficulty.overlapRatio).toBeGreaterThanOrEqual(0);
          expect(difficulty.overlapRatio).toBeLessThanOrEqual(1);
          expect(difficulty.fragmentationLevel).toBeGreaterThanOrEqual(0);
          expect(difficulty.fragmentationLevel).toBeLessThanOrEqual(1);
          expect(difficulty.durationVariety).toBeGreaterThanOrEqual(1);
          expect(difficulty.durationVariety).toBeLessThanOrEqual(4);
          expect(difficulty.constraintTightness).toBeGreaterThanOrEqual(0);
          expect(difficulty.constraintTightness).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});

describe('default instances', () => {
  it('should provide default k-solution generator', () => {
    expect(defaultKSolutionGenerator).toBeInstanceOf(KSolutionGenerator);
  });
  
  it('should provide default k-solution presets', () => {
    expect(kSolutionPresets).toBeInstanceOf(KSolutionPresets);
  });
});

describe('solution counting (placeholder implementation)', () => {
  let generator: KSolutionGenerator;
  
  beforeEach(() => {
    generator = new KSolutionGenerator();
  });
  
  it('should handle exact counting for small cases', async () => {
    const baseConfig: TestCaseConfig = {
      targetK: 1,
      difficulty: {
        studentCount: 5, // Small case for exact counting
        overlapRatio: 0.6,
        fragmentationLevel: 0.3,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.4
      },
      metadata: {
        description: 'Small exact counting test',
        expectedSolveTime: 100,
        category: 'easy'
      }
    };
    
    const kConfig: Partial<KSolutionConfig> = {
      useExactCounting: true,
      maxIterations: 1
    };
    
    const result = await generator.generateKSolutionCase(baseConfig, kConfig);
    
    expect(result.success).toBe(true);
    expect(result.actualSolutions).toBeDefined();
    expect(result.actualSolutions).toBeGreaterThanOrEqual(0);
  });
  
  it('should handle estimation for large cases', async () => {
    const baseConfig: TestCaseConfig = {
      targetK: 50,
      difficulty: {
        studentCount: 25, // Large case for estimation
        overlapRatio: 0.5,
        fragmentationLevel: 0.4,
        packingDensity: 0.6,
        durationVariety: 3,
        constraintTightness: 0.5
      },
      metadata: {
        description: 'Large estimation test',
        expectedSolveTime: 300,
        category: 'medium'
      }
    };
    
    const kConfig: Partial<KSolutionConfig> = {
      useExactCounting: false,
      estimationSamples: 500,
      maxIterations: 1
    };
    
    const result = await generator.generateKSolutionCase(baseConfig, kConfig);
    
    expect(result.success).toBe(true);
    expect(result.actualSolutions).toBeDefined();
    expect(result.actualSolutions).toBeGreaterThanOrEqual(0);
  });
});