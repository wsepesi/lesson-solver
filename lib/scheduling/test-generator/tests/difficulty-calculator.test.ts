/**
 * Unit tests for difficulty calculator functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { 
  DifficultyParams,
  TestCase
} from '../core';
import type { TeacherConfig } from '../../types';
import { 
  DifficultyCalculator,
  DifficultyUtils,
  defaultDifficultyCalculator,
  difficultyUtils
} from '../difficulty-calculator';

describe('DifficultyCalculator', () => {
  let calculator: DifficultyCalculator;
  
  beforeEach(() => {
    calculator = new DifficultyCalculator();
  });
  
  describe('constructor', () => {
    it('should create calculator instance', () => {
      expect(calculator).toBeInstanceOf(DifficultyCalculator);
    });
  });
  
  describe('difficulty calculation', () => {
    it('should calculate basic difficulty breakdown', () => {
      const params: DifficultyParams = {
        studentCount: 10,
        overlapRatio: 0.6,
        fragmentationLevel: 0.3,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.4
      };
      
      const difficulty = calculator.calculateDifficulty(params);
      
      expect(difficulty).toHaveProperty('studentCountScore');
      expect(difficulty).toHaveProperty('overlapScore');
      expect(difficulty).toHaveProperty('fragmentationScore');
      expect(difficulty).toHaveProperty('packingScore');
      expect(difficulty).toHaveProperty('durationScore');
      expect(difficulty).toHaveProperty('constraintScore');
      expect(difficulty).toHaveProperty('compositeScore');
      expect(difficulty).toHaveProperty('level');
      
      // All scores should be between 0 and 1
      expect(difficulty.studentCountScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.studentCountScore).toBeLessThanOrEqual(1);
      expect(difficulty.overlapScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.overlapScore).toBeLessThanOrEqual(1);
      expect(difficulty.fragmentationScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.fragmentationScore).toBeLessThanOrEqual(1);
      expect(difficulty.packingScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.packingScore).toBeLessThanOrEqual(1);
      expect(difficulty.durationScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.durationScore).toBeLessThanOrEqual(1);
      expect(difficulty.constraintScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.constraintScore).toBeLessThanOrEqual(1);
      expect(difficulty.compositeScore).toBeGreaterThanOrEqual(0);
      expect(difficulty.compositeScore).toBeLessThanOrEqual(1);
      
      // Level should be valid
      expect(['trivial', 'easy', 'medium', 'hard', 'extreme', 'impossible']).toContain(difficulty.level);
    });
    
    it('should handle trivial case parameters', () => {
      const params: DifficultyParams = {
        studentCount: 2,
        overlapRatio: 0.9,
        fragmentationLevel: 0.1,
        packingDensity: 0.2,
        durationVariety: 1,
        constraintTightness: 0.1
      };
      
      const difficulty = calculator.calculateDifficulty(params);
      
      expect(difficulty.level).toBe('trivial');
      expect(difficulty.compositeScore).toBeLessThan(0.3);
    });
    
    it('should handle extreme case parameters', () => {
      const params: DifficultyParams = {
        studentCount: 50,
        overlapRatio: 0.1,
        fragmentationLevel: 0.9,
        packingDensity: 0.95,
        durationVariety: 4,
        constraintTightness: 0.9
      };
      
      const difficulty = calculator.calculateDifficulty(params);
      
      expect(['extreme', 'impossible']).toContain(difficulty.level);
      expect(difficulty.compositeScore).toBeGreaterThan(0.7);
    });
    
    it('should handle impossible case parameters', () => {
      const params: DifficultyParams = {
        studentCount: 40,
        overlapRatio: 0.05,
        fragmentationLevel: 0.95,
        packingDensity: 1.1, // Over-constrained
        durationVariety: 4,
        constraintTightness: 0.99
      };
      
      const difficulty = calculator.calculateDifficulty(params);
      
      expect(difficulty.level).toBe('impossible');
      expect(difficulty.compositeScore).toBeGreaterThan(0.9);
    });
    
    it('should respect custom weights', () => {
      const params: DifficultyParams = {
        studentCount: 20,
        overlapRatio: 0.5,
        fragmentationLevel: 0.5,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const defaultDifficulty = calculator.calculateDifficulty(params);
      
      const customWeights = {
        studentCount: 0.8, // Much higher weight
        overlap: 0.1,
        fragmentation: 0.1,
        packing: 0.0,
        duration: 0.0,
        constraint: 0.0
      };
      
      const customDifficulty = calculator.calculateDifficulty(params, customWeights);
      
      // Should be different due to different weights
      expect(customDifficulty.compositeScore).not.toBe(defaultDifficulty.compositeScore);
    });
  });
  
  describe('component score calculations', () => {
    it('should calculate student count score correctly', () => {
      const lowCount: DifficultyParams = {
        studentCount: 3,
        overlapRatio: 0.5,
        fragmentationLevel: 0.5,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const highCount: DifficultyParams = {
        studentCount: 40,
        overlapRatio: 0.5,
        fragmentationLevel: 0.5,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const lowDiff = calculator.calculateDifficulty(lowCount);
      const highDiff = calculator.calculateDifficulty(highCount);
      
      expect(highDiff.studentCountScore).toBeGreaterThan(lowDiff.studentCountScore);
    });
    
    it('should calculate overlap score correctly', () => {
      const highOverlap: DifficultyParams = {
        studentCount: 10,
        overlapRatio: 0.9, // Easy - lots of overlap
        fragmentationLevel: 0.5,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const lowOverlap: DifficultyParams = {
        studentCount: 10,
        overlapRatio: 0.1, // Hard - little overlap
        fragmentationLevel: 0.5,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const highDiff = calculator.calculateDifficulty(highOverlap);
      const lowDiff = calculator.calculateDifficulty(lowOverlap);
      
      expect(lowDiff.overlapScore).toBeGreaterThan(highDiff.overlapScore);
    });
    
    it('should calculate packing score with exponential growth', () => {
      const lowPacking: DifficultyParams = {
        studentCount: 10,
        overlapRatio: 0.5,
        fragmentationLevel: 0.5,
        packingDensity: 0.3,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const highPacking: DifficultyParams = {
        studentCount: 10,
        overlapRatio: 0.5,
        fragmentationLevel: 0.5,
        packingDensity: 0.9,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const lowDiff = calculator.calculateDifficulty(lowPacking);
      const highDiff = calculator.calculateDifficulty(highPacking);
      
      // Should show exponential growth at high packing densities
      expect(highDiff.packingScore).toBeGreaterThan(lowDiff.packingScore * 2);
    });
  });
  
  describe('solve time prediction', () => {
    it('should predict reasonable solve times', () => {
      const easyParams: DifficultyParams = {
        studentCount: 5,
        overlapRatio: 0.8,
        fragmentationLevel: 0.2,
        packingDensity: 0.4,
        durationVariety: 1,
        constraintTightness: 0.2
      };
      
      const hardParams: DifficultyParams = {
        studentCount: 30,
        overlapRatio: 0.2,
        fragmentationLevel: 0.8,
        packingDensity: 0.9,
        durationVariety: 4,
        constraintTightness: 0.8
      };
      
      const easyDiff = calculator.calculateDifficulty(easyParams);
      const hardDiff = calculator.calculateDifficulty(hardParams);
      
      const easyTime = calculator.predictSolveTime(easyDiff, easyParams.studentCount);
      const hardTime = calculator.predictSolveTime(hardDiff, hardParams.studentCount);
      
      expect(easyTime).toBeGreaterThan(0);
      expect(hardTime).toBeGreaterThan(easyTime);
      expect(easyTime).toBeLessThan(1000); // Should be reasonable for easy case
    });
    
    it('should scale with student count', () => {
      const params: DifficultyParams = {
        studentCount: 10,
        overlapRatio: 0.5,
        fragmentationLevel: 0.5,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.5
      };
      
      const difficulty = calculator.calculateDifficulty(params);
      
      const time10 = calculator.predictSolveTime(difficulty, 10);
      const time20 = calculator.predictSolveTime(difficulty, 20);
      
      expect(time20).toBeGreaterThan(time10);
    });
  });
  
  describe('parameter generation for levels', () => {
    it('should generate valid parameters for all levels', () => {
      const levels: Array<'trivial' | 'easy' | 'medium' | 'hard' | 'extreme'> = [
        'trivial', 'easy', 'medium', 'hard', 'extreme'
      ];
      
      levels.forEach(level => {
        const params = calculator.generateParamsForLevel(level);
        
        expect(params.studentCount).toBeGreaterThan(0);
        expect(params.studentCount).toBeLessThanOrEqual(50);
        expect(params.overlapRatio).toBeGreaterThanOrEqual(0);
        expect(params.overlapRatio).toBeLessThanOrEqual(1);
        expect(params.fragmentationLevel).toBeGreaterThanOrEqual(0);
        expect(params.fragmentationLevel).toBeLessThanOrEqual(1);
        expect(params.packingDensity).toBeGreaterThanOrEqual(0);
        expect(params.packingDensity).toBeLessThanOrEqual(1);
        expect(params.durationVariety).toBeGreaterThanOrEqual(1);
        expect(params.durationVariety).toBeLessThanOrEqual(4);
        expect(params.constraintTightness).toBeGreaterThanOrEqual(0);
        expect(params.constraintTightness).toBeLessThanOrEqual(1);
        
        // Verify the generated params actually result in the target level
        const difficulty = calculator.calculateDifficulty(params);
        
        // Allow some tolerance for boundary cases
        if (level === 'trivial') {
          expect(['trivial', 'easy']).toContain(difficulty.level);
        } else if (level === 'extreme') {
          expect(['extreme', 'hard']).toContain(difficulty.level);
        } else {
          expect(difficulty.level).toBe(level);
        }
      });
    });
    
    it('should respect custom student count', () => {
      const customCount = 25;
      const params = calculator.generateParamsForLevel('medium', customCount);
      
      expect(params.studentCount).toBe(customCount);
    });
    
    it('should cap student count for trivial/easy levels', () => {
      const params1 = calculator.generateParamsForLevel('trivial', 100);
      const params2 = calculator.generateParamsForLevel('easy', 100);
      
      expect(params1.studentCount).toBeLessThanOrEqual(5);
      expect(params2.studentCount).toBeLessThanOrEqual(12);
    });
  });
});

describe('DifficultyUtils', () => {
  let utils: DifficultyUtils;
  
  beforeEach(() => {
    utils = new DifficultyUtils();
  });
  
  describe('test case comparison', () => {
    it('should compare test cases by difficulty', () => {
      const easyCase: TestCase = {
        id: 'easy',
        description: 'Easy case',
        teacher: {} as TeacherConfig,
        students: [],
        expectedSolutions: 100,
        difficulty: {
          studentCount: 5,
          overlapRatio: 0.8,
          fragmentationLevel: 0.2,
          packingDensity: 0.3,
          durationVariety: 1,
          constraintTightness: 0.2
        },
        metadata: { description: 'Easy', expectedSolveTime: 100, category: 'easy' },
        createdAt: new Date()
      };
      
      const hardCase: TestCase = {
        id: 'hard',
        description: 'Hard case',
        teacher: {} as TeacherConfig,
        students: [],
        expectedSolutions: 1,
        difficulty: {
          studentCount: 25,
          overlapRatio: 0.3,
          fragmentationLevel: 0.7,
          packingDensity: 0.8,
          durationVariety: 4,
          constraintTightness: 0.8
        },
        metadata: { description: 'Hard', expectedSolveTime: 1000, category: 'hard' },
        createdAt: new Date()
      };
      
      const comparison = utils.compareDifficulty(easyCase, hardCase);
      
      expect(comparison).toBeLessThan(0); // Easy should be less difficult than hard
    });
  });
  
  describe('sorting', () => {
    it('should sort test cases by difficulty', () => {
      const testCases: TestCase[] = [
        {
          id: 'hard',
          description: 'Hard case',
          teacher: {} as TeacherConfig,
          students: [],
          expectedSolutions: 1,
          difficulty: {
            studentCount: 25,
            overlapRatio: 0.3,
            fragmentationLevel: 0.7,
            packingDensity: 0.8,
            durationVariety: 4,
            constraintTightness: 0.8
          },
          metadata: { description: 'Hard', expectedSolveTime: 1000, category: 'hard' },
          createdAt: new Date()
        },
        {
          id: 'easy',
          description: 'Easy case',
          teacher: {} as TeacherConfig,
          students: [],
          expectedSolutions: 100,
          difficulty: {
            studentCount: 5,
            overlapRatio: 0.8,
            fragmentationLevel: 0.2,
            packingDensity: 0.3,
            durationVariety: 1,
            constraintTightness: 0.2
          },
          metadata: { description: 'Easy', expectedSolveTime: 100, category: 'easy' },
          createdAt: new Date()
        }
      ];
      
      const sorted = utils.sortByDifficulty(testCases);
      
      expect(sorted).toHaveLength(2);
      expect(sorted[0].id).toBe('easy'); // Should be first (easier)
      expect(sorted[1].id).toBe('hard'); // Should be second (harder)
    });
  });
  
  describe('grouping', () => {
    it('should group test cases by difficulty level', () => {
      const testCases: TestCase[] = [
        {
          id: 'case1',
          description: 'Case 1',
          teacher: {} as TeacherConfig,
          students: [],
          expectedSolutions: 100,
          difficulty: {
            studentCount: 3,
            overlapRatio: 0.9,
            fragmentationLevel: 0.1,
            packingDensity: 0.2,
            durationVariety: 1,
            constraintTightness: 0.1
          },
          metadata: { description: 'Case 1', expectedSolveTime: 100, category: 'easy' },
          createdAt: new Date()
        },
        {
          id: 'case2',
          description: 'Case 2',
          teacher: {} as TeacherConfig,
          students: [],
          expectedSolutions: 1,
          difficulty: {
            studentCount: 30,
            overlapRatio: 0.2,
            fragmentationLevel: 0.8,
            packingDensity: 0.9,
            durationVariety: 4,
            constraintTightness: 0.9
          },
          metadata: { description: 'Case 2', expectedSolveTime: 1000, category: 'hard' },
          createdAt: new Date()
        }
      ];
      
      const groups = utils.groupByDifficulty(testCases);
      
      expect(groups).toHaveProperty('trivial');
      expect(groups).toHaveProperty('easy');
      expect(groups).toHaveProperty('medium');
      expect(groups).toHaveProperty('hard');
      expect(groups).toHaveProperty('extreme');
      expect(groups).toHaveProperty('impossible');
      
      // Check that cases are in appropriate groups
      const totalCases = Object.values(groups).reduce((sum, group) => sum + group.length, 0);
      expect(totalCases).toBe(testCases.length);
    });
  });
  
  describe('difficulty progression', () => {
    it('should generate difficulty progression', () => {
      const progression = utils.generateDifficultyProgression(5);
      
      expect(progression).toHaveLength(5);
      
      // Should progress from easy to hard
      expect(progression[0].constraintTightness).toBeLessThan(progression[4].constraintTightness);
      expect(progression[0].packingDensity).toBeLessThan(progression[4].packingDensity);
      expect(progression[0].studentCount).toBeLessThan(progression[4].studentCount);
      
      // All should be valid parameters
      progression.forEach(params => {
        expect(params.studentCount).toBeGreaterThanOrEqual(2);
        expect(params.studentCount).toBeLessThanOrEqual(50);
        expect(params.overlapRatio).toBeGreaterThanOrEqual(0);
        expect(params.overlapRatio).toBeLessThanOrEqual(1);
        expect(params.fragmentationLevel).toBeGreaterThanOrEqual(0);
        expect(params.fragmentationLevel).toBeLessThanOrEqual(1);
        expect(params.packingDensity).toBeGreaterThanOrEqual(0);
        expect(params.packingDensity).toBeLessThanOrEqual(1);
        expect(params.durationVariety).toBeGreaterThanOrEqual(1);
        expect(params.durationVariety).toBeLessThanOrEqual(4);
        expect(params.constraintTightness).toBeGreaterThanOrEqual(0);
        expect(params.constraintTightness).toBeLessThanOrEqual(1);
      });
    });
    
    it('should handle custom step count', () => {
      const progression3 = utils.generateDifficultyProgression(3);
      const progression10 = utils.generateDifficultyProgression(10);
      
      expect(progression3).toHaveLength(3);
      expect(progression10).toHaveLength(10);
    });
  });
});

describe('default instances', () => {
  it('should provide default difficulty calculator', () => {
    expect(defaultDifficultyCalculator).toBeInstanceOf(DifficultyCalculator);
  });
  
  it('should provide default difficulty utils', () => {
    expect(difficultyUtils).toBeInstanceOf(DifficultyUtils);
  });
});