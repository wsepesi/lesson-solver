/**
 * Constraint Generator
 * 
 * Generates teacher scheduling constraints with varying strictness levels.
 * Creates realistic constraint configurations that affect scheduling difficulty
 * and solution space size.
 */

import type { SchedulingConstraints } from '../../types';

/**
 * Constraint strictness levels
 */
export type ConstraintStrictness = 
  | 'very-loose'
  | 'loose'
  | 'moderate'
  | 'strict'
  | 'very-strict'
  | 'extreme';

/**
 * Configuration for constraint generation
 */
export interface ConstraintConfig {
  /** Base strictness level */
  strictness: ConstraintStrictness;
  
  /** Focus areas for constraint tightness */
  focus?: {
    consecutiveLimits?: boolean;
    breakRequirements?: boolean;
    durationFlexibility?: boolean;
    allowedDurations?: boolean;
  };
  
  /** Custom overrides for specific constraints */
  overrides?: Partial<SchedulingConstraints>;
  
  /** Random seed for reproducible generation */
  seed?: number;
  
  /** Enable realistic variations */
  addVariations?: boolean;
}

/**
 * Constraint difficulty analysis
 */
export interface ConstraintAnalysis {
  /** Overall constraint tightness score (0-1) */
  tightnessScore: number;
  
  /** Individual constraint scores */
  breakdown: {
    consecutiveScore: number;
    breakScore: number;
    durationScore: number;
    flexibilityScore: number;
  };
  
  /** Expected impact on scheduling difficulty */
  difficultyImpact: 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
  
  /** Potential bottlenecks */
  bottlenecks: string[];
}

/**
 * Main constraint generator class
 */
export class ConstraintGenerator {
  private seed: number;
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
  }
  
  /**
   * Generate constraints for a given strictness level
   */
  generateConstraints(config: ConstraintConfig): SchedulingConstraints {
    const baseConstraints = this.getBaseConstraintsForStrictness(config.strictness);
    
    // Apply focus areas
    if (config.focus) {
      this.applyFocusAreas(baseConstraints, config.focus, config.strictness);
    }
    
    // Apply custom overrides
    if (config.overrides) {
      Object.assign(baseConstraints, config.overrides);
    }
    
    // Add realistic variations if requested
    if (config.addVariations) {
      this.addRealisticVariations(baseConstraints);
    }
    
    // Validate and adjust constraints
    return this.validateAndAdjustConstraints(baseConstraints);
  }
  
  /**
   * Generate constraints by strictness level
   */
  generateByStrictness(
    strictness: ConstraintStrictness,
    seed?: number
  ): SchedulingConstraints {
    if (seed) this.setSeed(seed);
    
    return this.generateConstraints({
      strictness,
      addVariations: true
    });
  }
  
  /**
   * Generate constraints optimized for k-solution targeting
   */
  generateForKSolutions(
    targetK: number,
    baseStrictness: ConstraintStrictness = 'moderate',
    seed?: number
  ): SchedulingConstraints {
    if (seed) this.setSeed(seed);
    
    const config: ConstraintConfig = {
      strictness: baseStrictness,
      focus: this.getFocusForTargetK(targetK),
      addVariations: false // Disable for predictable k-targeting
    };
    
    const constraints = this.generateConstraints(config);
    
    // Fine-tune for specific k values
    return this.adjustForTargetK(constraints, targetK);
  }
  
  /**
   * Analyze constraint difficulty and impact
   */
  analyzeConstraints(constraints: SchedulingConstraints): ConstraintAnalysis {
    const breakdown = {
      consecutiveScore: this.calculateConsecutiveScore(constraints),
      breakScore: this.calculateBreakScore(constraints),
      durationScore: this.calculateDurationScore(constraints),
      flexibilityScore: this.calculateFlexibilityScore(constraints)
    };
    
    const tightnessScore = (
      breakdown.consecutiveScore * 0.3 +
      breakdown.breakScore * 0.2 +
      breakdown.durationScore * 0.25 +
      breakdown.flexibilityScore * 0.25
    );
    
    const difficultyImpact = this.scoreToDifficultyImpact(tightnessScore);
    const bottlenecks = this.identifyBottlenecks(constraints, breakdown);
    
    return {
      tightnessScore,
      breakdown,
      difficultyImpact,
      bottlenecks
    };
  }
  
  /**
   * Get base constraints for strictness level
   */
  private getBaseConstraintsForStrictness(strictness: ConstraintStrictness): SchedulingConstraints {
    switch (strictness) {
      case 'very-loose':
        return {
          maxConsecutiveMinutes: 360, // 6 hours
          breakDurationMinutes: 5,    // 5 minutes
          minLessonDuration: 15,      // 15 minutes
          maxLessonDuration: 180,     // 3 hours
          allowedDurations: [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 180],
          backToBackPreference: 'agnostic'
        };
        
      case 'loose':
        return {
          maxConsecutiveMinutes: 300, // 5 hours
          breakDurationMinutes: 10,   // 10 minutes
          minLessonDuration: 20,      // 20 minutes
          maxLessonDuration: 150,     // 2.5 hours
          allowedDurations: [20, 30, 45, 60, 75, 90, 120, 150],
          backToBackPreference: 'agnostic'
        };
        
      case 'moderate':
        return {
          maxConsecutiveMinutes: 240, // 4 hours
          breakDurationMinutes: 15,   // 15 minutes
          minLessonDuration: 30,      // 30 minutes
          maxLessonDuration: 120,     // 2 hours
          allowedDurations: [30, 45, 60, 75, 90, 120],
          backToBackPreference: 'agnostic'
        };
        
      case 'strict':
        return {
          maxConsecutiveMinutes: 180, // 3 hours
          breakDurationMinutes: 20,   // 20 minutes
          minLessonDuration: 30,      // 30 minutes
          maxLessonDuration: 90,      // 1.5 hours
          allowedDurations: [30, 45, 60, 90],
          backToBackPreference: 'agnostic'
        };
        
      case 'very-strict':
        return {
          maxConsecutiveMinutes: 120, // 2 hours
          breakDurationMinutes: 30,   // 30 minutes
          minLessonDuration: 45,      // 45 minutes
          maxLessonDuration: 60,      // 1 hour
          allowedDurations: [45, 60],
          backToBackPreference: 'agnostic'
        };
        
      case 'extreme':
        return {
          maxConsecutiveMinutes: 90,  // 1.5 hours
          breakDurationMinutes: 45,   // 45 minutes
          minLessonDuration: 60,      // 1 hour
          maxLessonDuration: 60,      // 1 hour
          allowedDurations: [60],
          backToBackPreference: 'agnostic'
        };
        
      default:
        throw new Error(`Unknown strictness level: ${String(strictness)}`);
    }
  }
  
  /**
   * Apply focus areas to tighten specific constraint types
   */
  private applyFocusAreas(
    constraints: SchedulingConstraints,
    focus: NonNullable<ConstraintConfig['focus']>,
    strictness: ConstraintStrictness
  ): void {
    const strictnessMultiplier = this.getStrictnessMultiplier(strictness);
    
    if (focus.consecutiveLimits) {
      // Reduce consecutive time allowed
      constraints.maxConsecutiveMinutes = Math.max(
        60,
        Math.floor(constraints.maxConsecutiveMinutes * (1 - strictnessMultiplier * 0.3))
      );
    }
    
    if (focus.breakRequirements) {
      // Increase break duration required
      constraints.breakDurationMinutes = Math.floor(
        constraints.breakDurationMinutes * (1 + strictnessMultiplier * 0.5)
      );
    }
    
    if (focus.durationFlexibility) {
      // Narrow the duration range
      const currentRange = constraints.maxLessonDuration - constraints.minLessonDuration;
      const narrowedRange = Math.max(15, Math.floor(currentRange * (1 - strictnessMultiplier * 0.4)));
      
      constraints.maxLessonDuration = constraints.minLessonDuration + narrowedRange;
    }
    
    if (focus.allowedDurations) {
      // Reduce number of allowed durations
      const reductionFactor = Math.floor(strictnessMultiplier * constraints.allowedDurations.length * 0.5);
      const newCount = Math.max(1, constraints.allowedDurations.length - reductionFactor);
      
      // Keep durations near the middle of the range
      const midpoint = Math.floor(constraints.allowedDurations.length / 2);
      const startIndex = Math.max(0, midpoint - Math.floor(newCount / 2));
      
      constraints.allowedDurations = constraints.allowedDurations.slice(startIndex, startIndex + newCount);
    }
  }
  
  /**
   * Get strictness multiplier (0-1) for scaling adjustments
   */
  private getStrictnessMultiplier(strictness: ConstraintStrictness): number {
    switch (strictness) {
      case 'very-loose': return 0.1;
      case 'loose': return 0.25;
      case 'moderate': return 0.5;
      case 'strict': return 0.75;
      case 'very-strict': return 0.9;
      case 'extreme': return 1.0;
      default: return 0.5;
    }
  }
  
  /**
   * Add realistic variations to constraints
   */
  private addRealisticVariations(constraints: SchedulingConstraints): void {
    // Add small random variations to make constraints more realistic
    
    // Vary consecutive minutes by ±15 minutes
    const consecutiveVariation = this.randomInt(-15, 15);
    constraints.maxConsecutiveMinutes = Math.max(
      60,
      constraints.maxConsecutiveMinutes + consecutiveVariation
    );
    
    // Vary break duration by ±5 minutes
    const breakVariation = this.randomInt(-5, 5);
    constraints.breakDurationMinutes = Math.max(
      5,
      constraints.breakDurationMinutes + breakVariation
    );
    
    // Possibly adjust allowed durations slightly
    if (this.random() < 0.3) {
      // 30% chance to remove one allowed duration
      if (constraints.allowedDurations.length > 2) {
        const indexToRemove = this.randomInt(0, constraints.allowedDurations.length - 1);
        constraints.allowedDurations.splice(indexToRemove, 1);
      }
    }
    
    if (this.random() < 0.2) {
      // 20% chance to add a new allowed duration
      const newDuration = this.randomInt(
        constraints.minLessonDuration,
        constraints.maxLessonDuration
      );
      
      // Round to nearest 15 minutes
      const roundedDuration = Math.round(newDuration / 15) * 15;
      
      if (!constraints.allowedDurations.includes(roundedDuration)) {
        constraints.allowedDurations.push(roundedDuration);
        constraints.allowedDurations.sort((a, b) => a - b);
      }
    }
  }
  
  /**
   * Validate and adjust constraints for consistency
   */
  private validateAndAdjustConstraints(constraints: SchedulingConstraints): SchedulingConstraints {
    // Ensure min <= max for lesson durations
    if (constraints.minLessonDuration > constraints.maxLessonDuration) {
      constraints.maxLessonDuration = constraints.minLessonDuration;
    }
    
    // Ensure allowed durations are within min/max range
    constraints.allowedDurations = constraints.allowedDurations.filter(
      duration => duration >= constraints.minLessonDuration && 
                  duration <= constraints.maxLessonDuration
    );
    
    // Ensure at least one allowed duration exists
    if (constraints.allowedDurations.length === 0) {
      constraints.allowedDurations = [constraints.minLessonDuration];
    }
    
    // Sort allowed durations
    constraints.allowedDurations.sort((a, b) => a - b);
    
    // Ensure consecutive minutes is reasonable
    constraints.maxConsecutiveMinutes = Math.max(
      constraints.minLessonDuration,
      constraints.maxConsecutiveMinutes
    );
    
    // Ensure break duration is reasonable
    constraints.breakDurationMinutes = Math.max(5, constraints.breakDurationMinutes);
    
    return constraints;
  }
  
  /**
   * Get focus areas for targeting specific k values
   */
  private getFocusForTargetK(targetK: number): NonNullable<ConstraintConfig['focus']> {
    if (targetK === 0) {
      // For impossible cases, focus on all constraint types
      return {
        consecutiveLimits: true,
        breakRequirements: true,
        durationFlexibility: true,
        allowedDurations: true
      };
    } else if (targetK === 1) {
      // For unique solutions, focus on duration and consecutive limits
      return {
        consecutiveLimits: true,
        durationFlexibility: true,
        allowedDurations: true
      };
    } else if (targetK <= 10) {
      // For few solutions, focus on break requirements and duration
      return {
        breakRequirements: true,
        durationFlexibility: true
      };
    } else {
      // For many solutions, minimal constraint focus
      return {
        consecutiveLimits: false,
        breakRequirements: false,
        durationFlexibility: false,
        allowedDurations: false
      };
    }
  }
  
  /**
   * Adjust constraints for specific k targeting
   */
  private adjustForTargetK(
    constraints: SchedulingConstraints,
    targetK: number
  ): SchedulingConstraints {
    if (targetK === 0) {
      // Make constraints very restrictive for impossible cases
      constraints.maxConsecutiveMinutes = Math.floor(constraints.maxConsecutiveMinutes * 0.5);
      constraints.breakDurationMinutes = Math.floor(constraints.breakDurationMinutes * 2);
      constraints.allowedDurations = constraints.allowedDurations.slice(0, 1); // Only one duration
    } else if (targetK === 1) {
      // Tighten constraints moderately for unique solutions
      constraints.maxConsecutiveMinutes = Math.floor(constraints.maxConsecutiveMinutes * 0.7);
      constraints.breakDurationMinutes = Math.floor(constraints.breakDurationMinutes * 1.5);
      
      // Limit to 2-3 allowed durations
      if (constraints.allowedDurations.length > 3) {
        constraints.allowedDurations = constraints.allowedDurations.slice(0, 3);
      }
    } else if (targetK <= 10) {
      // Moderate constraints for few solutions
      constraints.maxConsecutiveMinutes = Math.floor(constraints.maxConsecutiveMinutes * 0.8);
      constraints.breakDurationMinutes = Math.floor(constraints.breakDurationMinutes * 1.2);
    }
    
    // Re-validate after adjustments
    return this.validateAndAdjustConstraints(constraints);
  }
  
  /**
   * Calculate consecutive time constraint score
   */
  private calculateConsecutiveScore(constraints: SchedulingConstraints): number {
    // Lower consecutive time = higher constraint score
    const maxReasonable = 480; // 8 hours
    return 1 - (constraints.maxConsecutiveMinutes / maxReasonable);
  }
  
  /**
   * Calculate break requirement constraint score
   */
  private calculateBreakScore(constraints: SchedulingConstraints): number {
    // Higher break requirement = higher constraint score
    const maxReasonable = 60; // 1 hour
    return Math.min(1, constraints.breakDurationMinutes / maxReasonable);
  }
  
  /**
   * Calculate duration constraint score
   */
  private calculateDurationScore(constraints: SchedulingConstraints): number {
    // Smaller duration range = higher constraint score
    const durationRange = constraints.maxLessonDuration - constraints.minLessonDuration;
    const maxReasonable = 165; // 3 hour range (15 min to 3 hours)
    return 1 - (durationRange / maxReasonable);
  }
  
  /**
   * Calculate flexibility constraint score
   */
  private calculateFlexibilityScore(constraints: SchedulingConstraints): number {
    // Fewer allowed durations = higher constraint score
    const maxReasonable = 10; // 10 different durations
    return 1 - (constraints.allowedDurations.length / maxReasonable);
  }
  
  /**
   * Convert tightness score to difficulty impact
   */
  private scoreToDifficultyImpact(score: number): ConstraintAnalysis['difficultyImpact'] {
    if (score < 0.2) return 'minimal';
    if (score < 0.4) return 'low';
    if (score < 0.6) return 'moderate';
    if (score < 0.8) return 'high';
    return 'severe';
  }
  
  /**
   * Identify potential constraint bottlenecks
   */
  private identifyBottlenecks(
    constraints: SchedulingConstraints,
    breakdown: ConstraintAnalysis['breakdown']
  ): string[] {
    const bottlenecks: string[] = [];
    
    if (breakdown.consecutiveScore > 0.7) {
      bottlenecks.push('very-limited-consecutive-time');
    }
    
    if (breakdown.breakScore > 0.6) {
      bottlenecks.push('long-break-requirements');
    }
    
    if (breakdown.durationScore > 0.8) {
      bottlenecks.push('very-narrow-duration-range');
    }
    
    if (breakdown.flexibilityScore > 0.7) {
      bottlenecks.push('very-few-allowed-durations');
    }
    
    if (constraints.allowedDurations.length === 1) {
      bottlenecks.push('single-duration-only');
    }
    
    if (constraints.maxConsecutiveMinutes < constraints.maxLessonDuration) {
      bottlenecks.push('consecutive-less-than-max-lesson');
    }
    
    return bottlenecks;
  }
  
  /**
   * Generate random number with current seed
   */
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  /**
   * Generate random integer in range [min, max]
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Set random seed for reproducible generation
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
  
  /**
   * Get current random seed
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Constraint preset configurations for common scenarios
 */
export class ConstraintPresets {
  private generator = new ConstraintGenerator();
  
  /**
   * Generate teacher constraints (moderate strictness)
   */
  generateTeacherConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateByStrictness('moderate');
  }
  
  /**
   * Generate flexible constraints for easy scheduling
   */
  generateFlexibleConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateByStrictness('loose');
  }
  
  /**
   * Generate strict constraints for difficulty testing
   */
  generateStrictConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateByStrictness('strict');
  }
  
  /**
   * Generate constraints for impossible scheduling scenarios
   */
  generateImpossibleConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateByStrictness('extreme');
  }
  
  /**
   * Generate constraints focused on consecutive time limits
   */
  generateConsecutiveFocusConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateConstraints({
      strictness: 'strict',
      focus: { consecutiveLimits: true },
      addVariations: true
    });
  }
  
  /**
   * Generate constraints focused on break requirements
   */
  generateBreakFocusConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateConstraints({
      strictness: 'strict',
      focus: { breakRequirements: true },
      addVariations: true
    });
  }
  
  /**
   * Generate constraints focused on duration flexibility
   */
  generateDurationFocusConstraints(seed?: number): SchedulingConstraints {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generateConstraints({
      strictness: 'strict',
      focus: { durationFlexibility: true, allowedDurations: true },
      addVariations: true
    });
  }
}

/**
 * Default constraint generator instance
 */
export const defaultConstraintGenerator = new ConstraintGenerator();

/**
 * Default constraint presets instance
 */
export const constraintPresets = new ConstraintPresets();