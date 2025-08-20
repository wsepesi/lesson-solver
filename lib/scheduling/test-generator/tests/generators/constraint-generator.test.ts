/**
 * Tests for ConstraintGenerator
 * 
 * Comprehensive tests for constraint generation with various strictness levels
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ConstraintGenerator,
  ConstraintPresets
} from '../../generators/constraint-generator';
import type { 
  ConstraintStrictness
} from '../../generators/constraint-generator';
// import type { SchedulingConstraints } from '../../../types';

describe('ConstraintGenerator', () => {
  let generator: ConstraintGenerator;
  const testSeed = 12345;
  
  beforeEach(() => {
    generator = new ConstraintGenerator(testSeed);
  });
  
  describe('Basic functionality', () => {
    it('should initialize with a seed', () => {
      expect(generator.getSeed()).toBe(testSeed);
    });
    
    it('should generate deterministic results with same seed', () => {
      const generator1 = new ConstraintGenerator(42);
      const generator2 = new ConstraintGenerator(42);
      
      const constraints1 = generator1.generateByStrictness('moderate');
      const constraints2 = generator2.generateByStrictness('moderate');
      
      expect(constraints1).toEqual(constraints2);
    });
    
    it('should generate different results with different seeds', () => {
      const generator1 = new ConstraintGenerator(1);
      const generator2 = new ConstraintGenerator(2);
      
      const constraints1 = generator1.generateByStrictness('moderate', 1);
      const constraints2 = generator2.generateByStrictness('moderate', 2);
      
      expect(constraints1).not.toEqual(constraints2);
    });
  });
  
  describe('Strictness levels', () => {
    it('should generate very loose constraints', () => {
      const constraints = generator.generateByStrictness('very-loose');
      
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(300); // At least 5 hours
      expect(constraints.breakDurationMinutes).toBeLessThanOrEqual(10); // Short breaks
      expect(constraints.minLessonDuration).toBeLessThanOrEqual(20); // Flexible minimums
      expect(constraints.maxLessonDuration).toBeGreaterThanOrEqual(150); // Long lessons allowed
      expect(constraints.allowedDurations.length).toBeGreaterThan(5); // Many options
    });
    
    it('should generate loose constraints', () => {
      const constraints = generator.generateByStrictness('loose');
      
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(240);
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(360);
      expect(constraints.breakDurationMinutes).toBeGreaterThanOrEqual(5);
      expect(constraints.breakDurationMinutes).toBeLessThanOrEqual(15);
      expect(constraints.allowedDurations.length).toBeGreaterThan(4);
    });
    
    it('should generate moderate constraints', () => {
      const constraints = generator.generateByStrictness('moderate');
      
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(180);
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(300);
      expect(constraints.breakDurationMinutes).toBeGreaterThanOrEqual(10);
      expect(constraints.breakDurationMinutes).toBeLessThanOrEqual(25);
      expect(constraints.minLessonDuration).toBeGreaterThanOrEqual(30);
      expect(constraints.maxLessonDuration).toBeLessThanOrEqual(120);
    });
    
    it('should generate strict constraints', () => {
      const constraints = generator.generateByStrictness('strict');
      
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(120);
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(240);
      expect(constraints.breakDurationMinutes).toBeGreaterThanOrEqual(15);
      expect(constraints.maxLessonDuration).toBeLessThanOrEqual(90);
      expect(constraints.allowedDurations.length).toBeLessThanOrEqual(6);
    });
    
    it('should generate very strict constraints', () => {
      const constraints = generator.generateByStrictness('very-strict');
      
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(90);
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(180);
      expect(constraints.breakDurationMinutes).toBeGreaterThan(20);
      expect(constraints.minLessonDuration).toBeGreaterThanOrEqual(45);
      expect(constraints.maxLessonDuration).toBeLessThanOrEqual(60);
      expect(constraints.allowedDurations.length).toBeLessThanOrEqual(3);
    });
    
    it('should generate extreme constraints', () => {
      const constraints = generator.generateByStrictness('extreme');
      
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(120); // Very limited
      expect(constraints.breakDurationMinutes).toBeGreaterThan(30); // Long breaks required
      expect(constraints.minLessonDuration).toBe(60); // Fixed duration
      expect(constraints.maxLessonDuration).toBe(60); // Fixed duration
      expect(constraints.allowedDurations).toEqual([60]); // Only one option
    });
    
    it('should have increasing strictness order', () => {
      const levels: ConstraintStrictness[] = ['very-loose', 'loose', 'moderate', 'strict', 'very-strict', 'extreme'];
      const constraints = levels.map(level => generator.generateByStrictness(level));
      
      // Consecutive minutes should generally decrease
      for (let i = 1; i < constraints.length; i++) {
        expect(constraints[i].maxConsecutiveMinutes).toBeLessThanOrEqual(
          constraints[i - 1].maxConsecutiveMinutes
        );
      }
      
      // Break duration should generally increase
      for (let i = 1; i < constraints.length; i++) {
        expect(constraints[i].breakDurationMinutes).toBeGreaterThanOrEqual(
          constraints[i - 1].breakDurationMinutes
        );
      }
      
      // Allowed durations should generally decrease
      for (let i = 1; i < constraints.length; i++) {
        expect(constraints[i].allowedDurations.length).toBeLessThanOrEqual(
          constraints[i - 1].allowedDurations.length
        );
      }
    });
  });
  
  describe('Focus areas', () => {
    it('should focus on consecutive limits', () => {
      const baseConstraints = generator.generateByStrictness('moderate');
      const focusedConstraints = generator.generateConstraints({
        strictness: 'moderate',
        focus: { consecutiveLimits: true }
      });
      
      expect(focusedConstraints.maxConsecutiveMinutes).toBeLessThan(
        baseConstraints.maxConsecutiveMinutes
      );
    });
    
    it('should focus on break requirements', () => {
      const baseConstraints = generator.generateByStrictness('moderate');
      const focusedConstraints = generator.generateConstraints({
        strictness: 'moderate',
        focus: { breakRequirements: true }
      });
      
      expect(focusedConstraints.breakDurationMinutes).toBeGreaterThan(
        baseConstraints.breakDurationMinutes
      );
    });
    
    it('should focus on duration flexibility', () => {
      const baseConstraints = generator.generateByStrictness('moderate');
      const focusedConstraints = generator.generateConstraints({
        strictness: 'moderate',
        focus: { durationFlexibility: true }
      });
      
      const baseRange = baseConstraints.maxLessonDuration - baseConstraints.minLessonDuration;
      const focusedRange = focusedConstraints.maxLessonDuration - focusedConstraints.minLessonDuration;
      
      expect(focusedRange).toBeLessThan(baseRange);
    });
    
    it('should focus on allowed durations', () => {
      const baseConstraints = generator.generateByStrictness('moderate');
      const focusedConstraints = generator.generateConstraints({
        strictness: 'moderate',
        focus: { allowedDurations: true }
      });
      
      expect(focusedConstraints.allowedDurations.length).toBeLessThan(
        baseConstraints.allowedDurations.length
      );
    });
    
    it('should apply multiple focus areas', () => {
      const baseConstraints = generator.generateByStrictness('moderate');
      const focusedConstraints = generator.generateConstraints({
        strictness: 'moderate',
        focus: {
          consecutiveLimits: true,
          breakRequirements: true,
          durationFlexibility: true,
          allowedDurations: true
        }
      });
      
      expect(focusedConstraints.maxConsecutiveMinutes).toBeLessThan(
        baseConstraints.maxConsecutiveMinutes
      );
      expect(focusedConstraints.breakDurationMinutes).toBeGreaterThan(
        baseConstraints.breakDurationMinutes
      );
      expect(focusedConstraints.allowedDurations.length).toBeLessThan(
        baseConstraints.allowedDurations.length
      );
    });
  });
  
  describe('Custom overrides', () => {
    it('should apply custom overrides', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          maxConsecutiveMinutes: 999,
          breakDurationMinutes: 123,
          minLessonDuration: 25,
          maxLessonDuration: 85
        }
      });
      
      expect(constraints.maxConsecutiveMinutes).toBe(999);
      expect(constraints.breakDurationMinutes).toBe(123);
      expect(constraints.minLessonDuration).toBe(25);
      expect(constraints.maxLessonDuration).toBe(85);
    });
    
    it('should validate overrides', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          minLessonDuration: 90,
          maxLessonDuration: 60 // Invalid: min > max
        }
      });
      
      // Should adjust max to match min
      expect(constraints.maxLessonDuration).toBeGreaterThanOrEqual(constraints.minLessonDuration);
    });
  });
  
  describe('K-solution targeting', () => {
    it('should generate constraints for impossible cases (k=0)', () => {
      const constraints = generator.generateForKSolutions(0, 'moderate', testSeed);
      
      // Should be very restrictive
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(120);
      expect(constraints.breakDurationMinutes).toBeGreaterThan(20);
      expect(constraints.allowedDurations.length).toBe(1);
    });
    
    it('should generate constraints for unique solutions (k=1)', () => {
      const constraints = generator.generateForKSolutions(1, 'moderate', testSeed);
      
      // Should be moderately restrictive
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(180);
      expect(constraints.allowedDurations.length).toBeLessThanOrEqual(3);
    });
    
    it('should generate constraints for few solutions (k=5)', () => {
      const constraints = generator.generateForKSolutions(5, 'moderate', testSeed);
      
      // Should be somewhat restrictive
      expect(constraints.maxConsecutiveMinutes).toBeLessThan(200);
    });
    
    it('should generate constraints for many solutions (k=100)', () => {
      const constraints = generator.generateForKSolutions(100, 'moderate', testSeed);
      
      // Should be relatively flexible
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThan(120);
      expect(constraints.allowedDurations.length).toBeGreaterThan(1);
    });
    
    it('should create increasing restrictions for lower k values', () => {
      const constraints100 = generator.generateForKSolutions(100, 'moderate', testSeed);
      const constraints10 = generator.generateForKSolutions(10, 'moderate', testSeed);
      const constraints1 = generator.generateForKSolutions(1, 'moderate', testSeed);
      const constraints0 = generator.generateForKSolutions(0, 'moderate', testSeed);
      
      // Consecutive minutes should decrease as k decreases
      expect(constraints0.maxConsecutiveMinutes).toBeLessThan(constraints1.maxConsecutiveMinutes);
      expect(constraints1.maxConsecutiveMinutes).toBeLessThan(constraints10.maxConsecutiveMinutes);
      expect(constraints10.maxConsecutiveMinutes).toBeLessThan(constraints100.maxConsecutiveMinutes);
      
      // Break duration should increase as k decreases
      expect(constraints0.breakDurationMinutes).toBeGreaterThan(constraints1.breakDurationMinutes);
      expect(constraints1.breakDurationMinutes).toBeGreaterThan(constraints10.breakDurationMinutes);
    });
  });
  
  describe('Constraint analysis', () => {
    it('should analyze constraint tightness', () => {
      const looseConstraints = generator.generateByStrictness('loose');
      const strictConstraints = generator.generateByStrictness('strict');
      
      const looseAnalysis = generator.analyzeConstraints(looseConstraints);
      const strictAnalysis = generator.analyzeConstraints(strictConstraints);
      
      expect(strictAnalysis.tightnessScore).toBeGreaterThan(looseAnalysis.tightnessScore);
      expect(['minimal', 'low'].includes(looseAnalysis.difficultyImpact)).toBe(true);
      expect(['moderate', 'high', 'severe'].includes(strictAnalysis.difficultyImpact)).toBe(true);
    });
    
    it('should provide detailed breakdown', () => {
      const constraints = generator.generateByStrictness('strict');
      const analysis = generator.analyzeConstraints(constraints);
      
      expect(analysis.breakdown).toBeDefined();
      expect(analysis.breakdown.consecutiveScore).toBeGreaterThanOrEqual(0);
      expect(analysis.breakdown.consecutiveScore).toBeLessThanOrEqual(1);
      expect(analysis.breakdown.breakScore).toBeGreaterThanOrEqual(0);
      expect(analysis.breakdown.breakScore).toBeLessThanOrEqual(1);
      expect(analysis.breakdown.durationScore).toBeGreaterThanOrEqual(0);
      expect(analysis.breakdown.durationScore).toBeLessThanOrEqual(1);
      expect(analysis.breakdown.flexibilityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.breakdown.flexibilityScore).toBeLessThanOrEqual(1);
    });
    
    it('should identify bottlenecks', () => {
      const extremeConstraints = generator.generateByStrictness('extreme');
      const analysis = generator.analyzeConstraints(extremeConstraints);
      
      expect(analysis.bottlenecks).toBeDefined();
      expect(analysis.bottlenecks.length).toBeGreaterThan(0);
      expect(analysis.bottlenecks).toContain('single-duration-only');
    });
    
    it('should identify consecutive vs lesson duration conflicts', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          maxConsecutiveMinutes: 45,
          maxLessonDuration: 60 // Conflict: can't fit max lesson in consecutive time
        }
      });
      
      const analysis = generator.analyzeConstraints(constraints);
      expect(analysis.bottlenecks).toContain('consecutive-less-than-max-lesson');
    });
  });
  
  describe('Constraint validation', () => {
    it('should validate min/max lesson durations', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          minLessonDuration: 90,
          maxLessonDuration: 60
        }
      });
      
      expect(constraints.maxLessonDuration).toBeGreaterThanOrEqual(constraints.minLessonDuration);
    });
    
    it('should filter allowed durations to valid range', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          minLessonDuration: 45,
          maxLessonDuration: 75,
          allowedDurations: [30, 45, 60, 75, 90, 120] // Some outside range
        }
      });
      
      constraints.allowedDurations.forEach(duration => {
        expect(duration).toBeGreaterThanOrEqual(constraints.minLessonDuration);
        expect(duration).toBeLessThanOrEqual(constraints.maxLessonDuration);
      });
    });
    
    it('should ensure at least one allowed duration exists', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          minLessonDuration: 60,
          maxLessonDuration: 75,
          allowedDurations: [30, 45, 90, 120] // None in range
        }
      });
      
      expect(constraints.allowedDurations.length).toBeGreaterThan(0);
      expect(constraints.allowedDurations).toContain(constraints.minLessonDuration);
    });
    
    it('should sort allowed durations', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          allowedDurations: [90, 30, 75, 45, 60]
        }
      });
      
      for (let i = 1; i < constraints.allowedDurations.length; i++) {
        expect(constraints.allowedDurations[i]).toBeGreaterThan(constraints.allowedDurations[i - 1]);
      }
    });
    
    it('should ensure reasonable consecutive minutes', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          maxConsecutiveMinutes: 10,
          minLessonDuration: 60
        }
      });
      
      expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(constraints.minLessonDuration);
    });
    
    it('should ensure reasonable break duration', () => {
      const constraints = generator.generateConstraints({
        strictness: 'moderate',
        overrides: {
          breakDurationMinutes: 0
        }
      });
      
      expect(constraints.breakDurationMinutes).toBeGreaterThanOrEqual(5);
    });
  });
  
  describe('Realistic variations', () => {
    it('should add variations when requested', () => {
      const baseConstraints = generator.generateConstraints({
        strictness: 'moderate',
        addVariations: false
      });
      
      const variedConstraints = generator.generateConstraints({
        strictness: 'moderate',
        addVariations: true
      });
      
      // With variations, at least some values should be different
      const hasVariations = 
        baseConstraints.maxConsecutiveMinutes !== variedConstraints.maxConsecutiveMinutes ||
        baseConstraints.breakDurationMinutes !== variedConstraints.breakDurationMinutes ||
        baseConstraints.allowedDurations.length !== variedConstraints.allowedDurations.length;
      
      expect(hasVariations).toBe(true);
    });
    
    it('should maintain validity with variations', () => {
      for (let i = 0; i < 10; i++) {
        const constraints = generator.generateConstraints({
          strictness: 'moderate',
          addVariations: true,
          seed: i
        });
        
        expect(constraints.minLessonDuration).toBeLessThanOrEqual(constraints.maxLessonDuration);
        expect(constraints.allowedDurations.length).toBeGreaterThan(0);
        expect(constraints.maxConsecutiveMinutes).toBeGreaterThanOrEqual(60);
        expect(constraints.breakDurationMinutes).toBeGreaterThanOrEqual(5);
      }
    });
  });
});

describe('ConstraintPresets', () => {
  let presets: ConstraintPresets;
  
  beforeEach(() => {
    presets = new ConstraintPresets();
  });
  
  it('should generate teacher constraints', () => {
    const constraints = presets.generateTeacherConstraints(12345);
    
    expect(constraints).toBeDefined();
    expect(constraints.maxConsecutiveMinutes).toBeGreaterThan(0);
    expect(constraints.breakDurationMinutes).toBeGreaterThan(0);
    expect(constraints.allowedDurations.length).toBeGreaterThan(0);
  });
  
  it('should generate flexible constraints', () => {
    const constraints = presets.generateFlexibleConstraints(12345);
    
    expect(constraints).toBeDefined();
    expect(constraints.maxConsecutiveMinutes).toBeGreaterThan(240);
    expect(constraints.allowedDurations.length).toBeGreaterThan(4);
  });
  
  it('should generate strict constraints', () => {
    const constraints = presets.generateStrictConstraints(12345);
    
    expect(constraints).toBeDefined();
    expect(constraints.maxConsecutiveMinutes).toBeLessThan(240);
    expect(constraints.breakDurationMinutes).toBeGreaterThanOrEqual(15);
  });
  
  it('should generate impossible constraints', () => {
    const constraints = presets.generateImpossibleConstraints(12345);
    
    expect(constraints).toBeDefined();
    expect(constraints.maxConsecutiveMinutes).toBeLessThan(120);
    expect(constraints.allowedDurations.length).toBe(1);
  });
  
  it('should generate consecutive focus constraints', () => {
    const constraints = presets.generateConsecutiveFocusConstraints(12345);
    
    expect(constraints).toBeDefined();
    expect(constraints.maxConsecutiveMinutes).toBeLessThan(180);
  });
  
  it('should generate break focus constraints', () => {
    const constraints = presets.generateBreakFocusConstraints(12345);
    
    expect(constraints).toBeDefined();
    expect(constraints.breakDurationMinutes).toBeGreaterThan(20);
  });
  
  it('should generate duration focus constraints', () => {
    const constraints = presets.generateDurationFocusConstraints(12345);
    
    expect(constraints).toBeDefined();
    
    const durationRange = constraints.maxLessonDuration - constraints.minLessonDuration;
    expect(durationRange).toBeLessThan(90); // Should be focused/narrow
    expect(constraints.allowedDurations.length).toBeLessThanOrEqual(4);
  });
  
  it('should be deterministic with same seed', () => {
    const constraints1 = presets.generateTeacherConstraints(42);
    const constraints2 = presets.generateTeacherConstraints(42);
    
    expect(constraints1).toEqual(constraints2);
  });
  
  it('should generate different results with different presets', () => {
    const flexible = presets.generateFlexibleConstraints(12345);
    const strict = presets.generateStrictConstraints(12345);
    const impossible = presets.generateImpossibleConstraints(12345);
    
    expect(flexible.maxConsecutiveMinutes).toBeGreaterThan(strict.maxConsecutiveMinutes);
    expect(strict.maxConsecutiveMinutes).toBeGreaterThan(impossible.maxConsecutiveMinutes);
    
    expect(flexible.allowedDurations.length).toBeGreaterThan(strict.allowedDurations.length);
    expect(strict.allowedDurations.length).toBeGreaterThan(impossible.allowedDurations.length);
  });
});