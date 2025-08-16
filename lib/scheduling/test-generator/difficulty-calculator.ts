/**
 * Difficulty Calculator
 * 
 * Provides comprehensive difficulty scoring and parameter analysis
 * for scheduler test cases. Calculates composite difficulty metrics
 * based on multiple constraint and scheduling complexity factors.
 */

import type { DifficultyParams, TestCase } from './core';
import type { StudentConfig } from '../types';

/**
 * Individual difficulty component scores
 */
export interface DifficultyBreakdown {
  /** Student count complexity (0-1) */
  studentCountScore: number;
  
  /** Overlap ratio complexity (0-1) */
  overlapScore: number;
  
  /** Time fragmentation complexity (0-1) */
  fragmentationScore: number;
  
  /** Packing density complexity (0-1) */
  packingScore: number;
  
  /** Duration variety complexity (0-1) */
  durationScore: number;
  
  /** Constraint tightness complexity (0-1) */
  constraintScore: number;
  
  /** Overall composite score (0-1) */
  compositeScore: number;
  
  /** Human-readable difficulty level */
  level: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme' | 'impossible';
}

/**
 * Weights for different difficulty components in composite scoring
 */
export interface DifficultyWeights {
  studentCount: number;
  overlap: number;
  fragmentation: number;
  packing: number;
  duration: number;
  constraint: number;
}

/**
 * Analysis of a test case's scheduling characteristics
 */
export interface SchedulingAnalysis {
  /** Total available time slots across all students */
  totalAvailableSlots: number;
  
  /** Total required time for all students */
  totalRequiredTime: number;
  
  /** Average overlap between student schedules */
  averageOverlap: number;
  
  /** Number of potential conflict points */
  conflictPoints: number;
  
  /** Estimated search space size */
  searchSpaceSize: number;
  
  /** Critical path bottlenecks */
  bottlenecks: string[];
}

/**
 * Main difficulty calculator class
 */
export class DifficultyCalculator {
  private defaultWeights: DifficultyWeights = {
    studentCount: 0.25,
    overlap: 0.15,
    fragmentation: 0.15,
    packing: 0.25,
    duration: 0.1,
    constraint: 0.1
  };
  
  /**
   * Calculate comprehensive difficulty breakdown for given parameters
   */
  calculateDifficulty(
    params: DifficultyParams,
    weights?: Partial<DifficultyWeights>
  ): DifficultyBreakdown {
    const w = { ...this.defaultWeights, ...weights };
    
    // Calculate individual component scores
    const studentCountScore = this.calculateStudentCountScore(params.studentCount);
    const overlapScore = this.calculateOverlapScore(params.overlapRatio);
    const fragmentationScore = this.calculateFragmentationScore(params.fragmentationLevel);
    const packingScore = this.calculatePackingScore(params.packingDensity);
    const durationScore = this.calculateDurationScore(params.durationVariety);
    const constraintScore = this.calculateConstraintScore(params.constraintTightness);
    
    // Calculate weighted composite score
    const compositeScore = 
      (studentCountScore * w.studentCount) +
      (overlapScore * w.overlap) +
      (fragmentationScore * w.fragmentation) +
      (packingScore * w.packing) +
      (durationScore * w.duration) +
      (constraintScore * w.constraint);
    
    // Determine difficulty level
    const level = this.scoreToDifficultyLevel(compositeScore);
    
    return {
      studentCountScore,
      overlapScore,
      fragmentationScore,
      packingScore,
      durationScore,
      constraintScore,
      compositeScore,
      level
    };
  }
  
  /**
   * Analyze actual test case scheduling characteristics
   */
  analyzeTestCase(testCase: TestCase): SchedulingAnalysis {
    const analysis: SchedulingAnalysis = {
      totalAvailableSlots: 0,
      totalRequiredTime: 0,
      averageOverlap: 0,
      conflictPoints: 0,
      searchSpaceSize: 0,
      bottlenecks: []
    };
    
    // Calculate total available time
    analysis.totalAvailableSlots = this.calculateTotalAvailableTime(testCase.students);
    
    // Calculate total required time
    analysis.totalRequiredTime = testCase.students.reduce(
      (total, student) => total + student.preferredDuration,
      0
    );
    
    // Calculate average overlap
    analysis.averageOverlap = this.calculateAverageOverlap(testCase.students);
    
    // Estimate conflict points
    analysis.conflictPoints = this.estimateConflictPoints(testCase.students);
    
    // Estimate search space size
    analysis.searchSpaceSize = this.estimateSearchSpace(testCase);
    
    // Identify bottlenecks
    analysis.bottlenecks = this.identifyBottlenecks(testCase);
    
    return analysis;
  }
  
  /**
   * Predict expected solve time based on difficulty
   */
  predictSolveTime(difficulty: DifficultyBreakdown, studentCount: number): number {
    // Base time increases exponentially with student count
    const baseTime = Math.pow(studentCount, 1.5) * 10;
    
    // Apply difficulty multiplier
    const difficultyMultiplier = 1 + (difficulty.compositeScore * 5);
    
    // Factor in specific complexity elements
    let complexityMultiplier = 1;
    
    if (difficulty.packingScore > 0.8) complexityMultiplier *= 2;
    if (difficulty.fragmentationScore > 0.7) complexityMultiplier *= 1.5;
    if (difficulty.constraintScore > 0.9) complexityMultiplier *= 3;
    
    return Math.floor(baseTime * difficultyMultiplier * complexityMultiplier);
  }
  
  /**
   * Generate difficulty parameters for a target difficulty level
   */
  generateParamsForLevel(
    level: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme',
    studentCount?: number
  ): DifficultyParams {
    const count = studentCount ?? this.getDefaultStudentCount(level);
    
    switch (level) {
      case 'trivial':
        return {
          studentCount: Math.min(count, 5),
          overlapRatio: 0.8,
          fragmentationLevel: 0.1,
          packingDensity: 0.3,
          durationVariety: 1,
          constraintTightness: 0.2
        };
        
      case 'easy':
        return {
          studentCount: Math.min(count, 12),
          overlapRatio: 0.7,
          fragmentationLevel: 0.2,
          packingDensity: 0.5,
          durationVariety: 2,
          constraintTightness: 0.3
        };
        
      case 'medium':
        return {
          studentCount: count,
          overlapRatio: 0.5,
          fragmentationLevel: 0.4,
          packingDensity: 0.7,
          durationVariety: 3,
          constraintTightness: 0.5
        };
        
      case 'hard':
        return {
          studentCount: Math.min(count, 35),
          overlapRatio: 0.3,
          fragmentationLevel: 0.6,
          packingDensity: 0.85,
          durationVariety: 4,
          constraintTightness: 0.7
        };
        
      case 'extreme':
        return {
          studentCount: count,
          overlapRatio: 0.2,
          fragmentationLevel: 0.8,
          packingDensity: 0.95,
          durationVariety: 4,
          constraintTightness: 0.9
        };
        
      default:
        throw new Error(`Unknown difficulty level: ${String(level)}`);
    }
  }
  
  /**
   * Calculate student count complexity score
   */
  private calculateStudentCountScore(count: number): number {
    // Exponential growth in complexity
    const normalized = Math.min(count / 50, 1); // Cap at 50 students
    return Math.pow(normalized, 1.5); // Exponential curve
  }
  
  /**
   * Calculate overlap ratio complexity score
   */
  private calculateOverlapScore(ratio: number): number {
    // Low overlap is more difficult (fewer scheduling options)
    return 1 - ratio;
  }
  
  /**
   * Calculate fragmentation complexity score
   */
  private calculateFragmentationScore(level: number): number {
    // Higher fragmentation is more difficult
    return level;
  }
  
  /**
   * Calculate packing density complexity score
   */
  private calculatePackingScore(density: number): number {
    // Higher density is more difficult, exponential at high densities
    if (density > 1.0) return 1.0; // Impossible case
    return Math.pow(density, 2);
  }
  
  /**
   * Calculate duration variety complexity score
   */
  private calculateDurationScore(variety: number): number {
    // More variety is slightly more complex
    return Math.min(variety / 4, 1);
  }
  
  /**
   * Calculate constraint tightness complexity score
   */
  private calculateConstraintScore(tightness: number): number {
    // Tighter constraints are more difficult
    return tightness;
  }
  
  /**
   * Convert composite score to difficulty level
   */
  private scoreToDifficultyLevel(score: number): DifficultyBreakdown['level'] {
    if (score < 0.2) return 'trivial';
    if (score < 0.4) return 'easy';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'hard';
    if (score < 0.9) return 'extreme';
    return 'impossible';
  }
  
  /**
   * Get default student count for difficulty level
   */
  private getDefaultStudentCount(level: string): number {
    switch (level) {
      case 'trivial': return 3;
      case 'easy': return 8;
      case 'medium': return 15;
      case 'hard': return 25;
      case 'extreme': return 40;
      default: return 10;
    }
  }
  
  /**
   * Calculate total available time across all students
   */
  private calculateTotalAvailableTime(students: StudentConfig[]): number {
    return students.reduce((total, student) => {
      const studentTotal = student.availability.days.reduce((dayTotal, day) => {
        return dayTotal + day.blocks.reduce((blockTotal, block) => {
          return blockTotal + block.duration;
        }, 0);
      }, 0);
      return total + studentTotal;
    }, 0);
  }
  
  /**
   * Calculate average overlap between student schedules
   */
  private calculateAverageOverlap(students: StudentConfig[]): number {
    if (students.length < 2) return 1;
    
    let totalOverlap = 0;
    let comparisons = 0;
    
    for (let i = 0; i < students.length; i++) {
      for (let j = i + 1; j < students.length; j++) {
        totalOverlap += this.calculatePairwiseOverlap(students[i]!, students[j]!);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalOverlap / comparisons : 0;
  }
  
  /**
   * Calculate overlap between two student schedules
   */
  private calculatePairwiseOverlap(_student1: StudentConfig, _student2: StudentConfig): number {
    // Simplified overlap calculation
    // In practice, this would check actual time block overlaps
    return 0.5; // Placeholder
  }
  
  /**
   * Estimate number of conflict points in scheduling
   */
  private estimateConflictPoints(students: StudentConfig[]): number {
    // Simplified conflict estimation
    const studentPairs = (students.length * (students.length - 1)) / 2;
    return Math.floor(studentPairs * 0.3); // Assume 30% chance of conflict per pair
  }
  
  /**
   * Estimate search space size for the problem
   */
  private estimateSearchSpace(testCase: TestCase): number {
    const studentCount = testCase.students.length;
    const avgAvailableSlots = 20; // Simplified assumption
    
    // Rough estimate: (average slots per student) ^ student count
    return Math.pow(avgAvailableSlots, Math.min(studentCount, 10));
  }
  
  /**
   * Identify potential bottlenecks in the scheduling problem
   */
  private identifyBottlenecks(testCase: TestCase): string[] {
    const bottlenecks: string[] = [];
    
    // Check for high packing density
    if (testCase.difficulty.packingDensity > 0.8) {
      bottlenecks.push('high-packing-density');
    }
    
    // Check for low overlap
    if (testCase.difficulty.overlapRatio < 0.3) {
      bottlenecks.push('low-schedule-overlap');
    }
    
    // Check for high fragmentation
    if (testCase.difficulty.fragmentationLevel > 0.7) {
      bottlenecks.push('high-fragmentation');
    }
    
    // Check for tight constraints
    if (testCase.difficulty.constraintTightness > 0.8) {
      bottlenecks.push('tight-constraints');
    }
    
    // Check for large student count
    if (testCase.students.length > 30) {
      bottlenecks.push('large-student-count');
    }
    
    return bottlenecks;
  }
}

/**
 * Utility functions for difficulty analysis
 */
export class DifficultyUtils {
  private calculator = new DifficultyCalculator();
  
  /**
   * Compare two test cases by difficulty
   */
  compareDifficulty(case1: TestCase, case2: TestCase): number {
    const diff1 = this.calculator.calculateDifficulty(case1.difficulty);
    const diff2 = this.calculator.calculateDifficulty(case2.difficulty);
    
    return diff1.compositeScore - diff2.compositeScore;
  }
  
  /**
   * Sort test cases by difficulty (easiest first)
   */
  sortByDifficulty(testCases: TestCase[]): TestCase[] {
    return [...testCases].sort((a, b) => this.compareDifficulty(a, b));
  }
  
  /**
   * Group test cases by difficulty level
   */
  groupByDifficulty(testCases: TestCase[]): Record<string, TestCase[]> {
    const groups: Record<string, TestCase[]> = {
      trivial: [],
      easy: [],
      medium: [],
      hard: [],
      extreme: [],
      impossible: []
    };
    
    for (const testCase of testCases) {
      const difficulty = this.calculator.calculateDifficulty(testCase.difficulty);
      groups[difficulty.level]?.push(testCase);
    }
    
    return groups;
  }
  
  /**
   * Generate a difficulty progression for testing
   */
  generateDifficultyProgression(steps = 10): DifficultyParams[] {
    const progression: DifficultyParams[] = [];
    
    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1); // 0 to 1
      
      progression.push({
        studentCount: Math.floor(2 + (progress * 48)), // 2 to 50
        overlapRatio: 0.8 - (progress * 0.6), // 0.8 to 0.2
        fragmentationLevel: progress * 0.8, // 0 to 0.8
        packingDensity: 0.3 + (progress * 0.6), // 0.3 to 0.9
        durationVariety: Math.floor(1 + (progress * 3)), // 1 to 4
        constraintTightness: progress * 0.9 // 0 to 0.9
      });
    }
    
    return progression;
  }
}

/**
 * Default difficulty calculator instance
 */
export const defaultDifficultyCalculator = new DifficultyCalculator();

/**
 * Default difficulty utilities instance
 */
export const difficultyUtils = new DifficultyUtils();