/**
 * K-Solution Generator
 * 
 * Implements binary search and constraint adjustment algorithms to generate
 * test cases with exactly k solutions. Uses constraint tightness as the
 * primary parameter for fine-tuning solution count.
 */

import type { TestCase, TestCaseConfig, DifficultyParams, GenerationResult } from './core';
import type { StudentConfig, TeacherConfig } from '../types';

// Import solution counting components
import { SolutionCounter, createOptimalSolutionCounter } from './k-solver/solution-counter';
import { MonteCarloEstimator, createOptimalMonteCarloEstimator } from './k-solver/monte-carlo-estimator';
import { ConstraintGraphAnalyzer, createOptimalConstraintAnalyzer } from './k-solver/constraint-graph-analyzer';

/**
 * Configuration for k-solution generation process
 */
export interface KSolutionConfig {
  /** Target number of solutions */
  targetK: number;
  
  /** Tolerance for solution count (e.g., ±2 for k=10) */
  tolerance: number;
  
  /** Maximum number of binary search iterations */
  maxIterations: number;
  
  /** Maximum time to spend on generation (ms) */
  maxGenerationTime: number;
  
  /** Whether to use exact counting or estimation */
  useExactCounting: boolean;
  
  /** Number of samples for estimation (if not exact) */
  estimationSamples?: number;
}

/**
 * Result of a solution counting operation
 */
export interface SolutionCountResult {
  /** Number of solutions found */
  count: number;
  
  /** Whether this is an exact count or estimate */
  isExact: boolean;
  
  /** Time taken to count solutions (ms) */
  timeMs: number;
  
  /** Confidence interval for estimates */
  confidenceInterval?: [number, number];
  
  /** Error message if counting failed */
  error?: string;
}

/**
 * Parameters for binary search on constraint tightness
 */
interface SearchState {
  /** Current constraint tightness value */
  tightness: number;
  
  /** Lower bound for search */
  lowerBound: number;
  
  /** Upper bound for search */
  upperBound: number;
  
  /** Current iteration */
  iteration: number;
  
  /** Best result found so far */
  bestResult?: {
    tightness: number;
    solutionCount: number;
    testCase: TestCase;
  };
}

/**
 * K-Solution targeting generator using binary search
 */
export class KSolutionGenerator {
  private defaultConfig: KSolutionConfig = {
    targetK: 1,
    tolerance: 0,
    maxIterations: 10,
    maxGenerationTime: 30000, // 30 seconds
    useExactCounting: true,
    estimationSamples: 1000
  };

  // Solution counting components
  private solutionCounter: SolutionCounter;
  private monteCarloEstimator: MonteCarloEstimator;
  private constraintAnalyzer: ConstraintGraphAnalyzer;

  constructor(config: Partial<KSolutionConfig> = {}) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    
    // Initialize with default components - will be updated with optimal settings per problem
    this.solutionCounter = new SolutionCounter();
    this.monteCarloEstimator = new MonteCarloEstimator();
    this.constraintAnalyzer = new ConstraintGraphAnalyzer();
  }
  
  /**
   * Generate a test case with exactly k solutions using binary search
   */
  async generateKSolutionCase(
    baseConfig: TestCaseConfig,
    kConfig?: Partial<KSolutionConfig>
  ): Promise<GenerationResult> {
    const config = { ...this.defaultConfig, ...kConfig };
    const startTime = Date.now();
    
    // Optimize solution counting components for this problem size
    this.optimizeCountingComponents(baseConfig.difficulty.studentCount);
    
    try {
      const result = await this.binarySearchForK(baseConfig, config);
      const totalTime = Date.now() - startTime;
      
      if (result.success && result.testCase) {
        return {
          success: true,
          testCase: result.testCase,
          actualSolutions: result.actualSolutions ?? 0,
          generationTimeMs: totalTime,
          attempts: result.attempts ?? 1
        };
      } else {
        return {
          success: false,
          generationTimeMs: totalTime,
          attempts: result.attempts ?? 1,
          error: result.error ?? 'Failed to generate k-solution case'
        };
      }
    } catch (error) {
      return {
        success: false,
        generationTimeMs: Date.now() - startTime,
        attempts: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Binary search to find constraint tightness that yields target k solutions
   */
  private async binarySearchForK(
    baseConfig: TestCaseConfig,
    kConfig: KSolutionConfig
  ): Promise<GenerationResult> {
    const searchState: SearchState = {
      tightness: 0.5,
      lowerBound: 0.0,
      upperBound: 1.0,
      iteration: 0
    };
    
    const startTime = Date.now();
    
    while (searchState.iteration < kConfig.maxIterations) {
      // Check timeout
      if (Date.now() - startTime > kConfig.maxGenerationTime) {
        break;
      }
      
      // Create test case with current tightness
      const modifiedConfig = this.adjustConstraintTightness(
        baseConfig,
        searchState.tightness
      );
      
      const testCase = this.createTestCaseFromConfig(modifiedConfig);
      const solutionCount = await this.countSolutions(testCase, kConfig);
      
      // Check if we found the target
      if (this.isWithinTolerance(solutionCount.count, kConfig.targetK, kConfig.tolerance)) {
        return {
          success: true,
          testCase,
          actualSolutions: solutionCount.count,
          generationTimeMs: Date.now() - startTime,
          attempts: searchState.iteration + 1
        };
      }
      
      // Update best result if this is closer
      if (!searchState.bestResult || 
          Math.abs(solutionCount.count - kConfig.targetK) < 
          Math.abs(searchState.bestResult.solutionCount - kConfig.targetK)) {
        searchState.bestResult = {
          tightness: searchState.tightness,
          solutionCount: solutionCount.count,
          testCase
        };
      }
      
      // Adjust search bounds based on result
      this.updateSearchBounds(searchState, solutionCount.count, kConfig.targetK);
      
      searchState.iteration++;
    }
    
    // Return best result if we didn't find exact match
    if (searchState.bestResult) {
      return {
        success: true,
        testCase: searchState.bestResult.testCase,
        actualSolutions: searchState.bestResult.solutionCount,
        generationTimeMs: Date.now() - startTime,
        attempts: searchState.iteration
      };
    }
    
    return {
      success: false,
      generationTimeMs: Date.now() - startTime,
      attempts: searchState.iteration,
      error: 'Failed to find suitable constraint tightness'
    };
  }
  
  /**
   * Adjust constraint tightness in the difficulty parameters
   */
  private adjustConstraintTightness(
    config: TestCaseConfig,
    tightness: number
  ): TestCaseConfig {
    const adjustedDifficulty: DifficultyParams = {
      ...config.difficulty,
      constraintTightness: tightness,
      // Also adjust related parameters for better control
      packingDensity: Math.min(config.difficulty.packingDensity + (tightness * 0.1), 1.0),
      overlapRatio: Math.max(config.difficulty.overlapRatio - (tightness * 0.2), 0.0)
    };
    
    return {
      ...config,
      difficulty: adjustedDifficulty
    };
  }
  
  /**
   * Count the number of solutions for a given test case
   */
  private async countSolutions(
    testCase: TestCase,
    config: KSolutionConfig
  ): Promise<SolutionCountResult> {
    const startTime = Date.now();
    
    try {
      if (config.useExactCounting && testCase.students.length <= 10) {
        // Use exact counting for smaller cases
        const result = await this.solutionCounter.countExact(
          testCase.teacher,
          testCase.students,
          config.maxGenerationTime
        );
        return result;
      } else {
        // Use Monte Carlo estimation for larger cases
        const result = await this.monteCarloEstimator.estimate(
          testCase.teacher,
          testCase.students,
          config.estimationSamples
        );
        return result;
      }
    } catch (error) {
      return {
        count: 0,
        isExact: false,
        timeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Counting failed'
      };
    }
  }
  
  /**
   * Exact solution counting using exhaustive search
   * Only feasible for small numbers of students
   */
  private countSolutionsExact(testCase: TestCase): number {
    // TODO: Implement exact solution counting
    // This would involve:
    // 1. Generate all possible assignments
    // 2. Check each against constraints
    // 3. Count valid solutions
    
    // For now, return a placeholder based on difficulty
    const difficulty = testCase.difficulty;
    const baseCount = Math.max(1, Math.floor(50 / difficulty.constraintTightness));
    
    // Adjust based on other factors
    let count = baseCount;
    
    if (difficulty.packingDensity > 0.9) count = Math.floor(count * 0.1);
    else if (difficulty.packingDensity > 0.8) count = Math.floor(count * 0.3);
    else if (difficulty.packingDensity > 0.6) count = Math.floor(count * 0.7);
    
    if (difficulty.overlapRatio < 0.3) count = Math.floor(count * 0.2);
    else if (difficulty.overlapRatio < 0.5) count = Math.floor(count * 0.5);
    
    if (difficulty.fragmentationLevel > 0.7) count = Math.floor(count * 0.3);
    
    return Math.max(0, count);
  }
  
  /**
   * Estimate solution count using Monte Carlo sampling
   */
  private estimateSolutionsViaSampling(
    testCase: TestCase,
    _samples: number
  ): { estimate: number; confidenceInterval: [number, number] } {
    // TODO: Implement Monte Carlo estimation
    // This would involve:
    // 1. Generate random assignments
    // 2. Check validity
    // 3. Estimate total solutions from sample success rate
    
    // For now, return a placeholder estimate
    const successRate = Math.max(0.01, 1.0 - testCase.difficulty.constraintTightness);
    const estimate = Math.floor(successRate * 1000);
    
    // Simple confidence interval (±20%)
    const margin = estimate * 0.2;
    
    return {
      estimate,
      confidenceInterval: [
        Math.max(0, estimate - margin),
        estimate + margin
      ]
    };
  }
  
  /**
   * Update binary search bounds based on current result
   */
  private updateSearchBounds(
    state: SearchState,
    actualCount: number,
    targetCount: number
  ): void {
    if (actualCount > targetCount) {
      // Too many solutions, increase constraint tightness
      state.lowerBound = state.tightness;
    } else if (actualCount < targetCount) {
      // Too few solutions, decrease constraint tightness
      state.upperBound = state.tightness;
    }
    
    // Set next tightness to midpoint
    state.tightness = (state.lowerBound + state.upperBound) / 2;
  }
  
  /**
   * Check if a solution count is within acceptable tolerance
   */
  private isWithinTolerance(actual: number, target: number, tolerance: number): boolean {
    return Math.abs(actual - target) <= tolerance;
  }
  
  /**
   * Create a test case from configuration
   * TODO: This should integrate with availability and constraint generators
   */
  private createTestCaseFromConfig(config: TestCaseConfig): TestCase {
    // Placeholder implementation
    // In the real implementation, this would:
    // 1. Use availability generator to create schedules
    // 2. Use constraint generator to set up teacher constraints
    // 3. Use student generator to create student configurations
    
    const id = `tc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    return {
      id,
      description: config.metadata.description,
      teacher: this.createPlaceholderTeacher(),
      students: this.createPlaceholderStudents(config.difficulty.studentCount),
      expectedSolutions: config.targetK,
      difficulty: config.difficulty,
      metadata: config.metadata,
      createdAt: new Date()
    };
  }
  
  /**
   * Create placeholder teacher for testing
   */
  private createPlaceholderTeacher(): TeacherConfig {
    return {
      person: {
        id: 'teacher_k_test',
        name: 'K-Test Teacher',
        email: 'ktest@example.com'
      },
      studioId: 'studio_k_test',
      availability: {
        days: [],
        timezone: 'UTC'
      },
      constraints: {
        maxConsecutiveMinutes: 180,
        breakDurationMinutes: 15,
        minLessonDuration: 30,
        maxLessonDuration: 90,
        allowedDurations: [30, 45, 60, 90],
        backToBackPreference: 'agnostic'
      }
    };
  }
  
  /**
   * Create placeholder students for testing
   */
  private createPlaceholderStudents(count: number): StudentConfig[] {
    const students: StudentConfig[] = [];
    
    for (let i = 0; i < count; i++) {
      students.push({
        person: {
          id: `student_k_${i + 1}`,
          name: `K-Test Student ${i + 1}`,
          email: `ktest${i + 1}@example.com`
        },
        preferredDuration: 60,
        minDuration: 30,
        maxDuration: 90,
        maxLessonsPerWeek: 1,
        availability: {
          days: [],
          timezone: 'UTC'
        }
      });
    }
    
    return students;
  }
  
  /**
   * Optimize solution counting components for the given problem size
   */
  private optimizeCountingComponents(studentCount: number): void {
    this.solutionCounter = createOptimalSolutionCounter(studentCount);
    this.monteCarloEstimator = createOptimalMonteCarloEstimator(studentCount);
    this.constraintAnalyzer = createOptimalConstraintAnalyzer(studentCount);
  }
  
  /**
   * Get theoretical bounds for a test case using constraint analysis
   */
  async getBoundsAnalysis(testCase: TestCase): Promise<any> {
    return this.constraintAnalyzer.calculateBounds(testCase.teacher, testCase.students);
  }
}

/**
 * Convenience functions for common k-solution scenarios
 */
export class KSolutionPresets {
  private generator = new KSolutionGenerator();
  private solutionCounter: SolutionCounter;
  private monteCarloEstimator: MonteCarloEstimator;
  private constraintAnalyzer: ConstraintGraphAnalyzer;
  
  constructor() {
    // Initialize with default components
    this.solutionCounter = new SolutionCounter();
    this.monteCarloEstimator = new MonteCarloEstimator();
    this.constraintAnalyzer = new ConstraintGraphAnalyzer();
  }
  
  /**
   * Generate impossible case (k=0)
   */
  async generateImpossibleCase(studentCount = 10): Promise<GenerationResult> {
    const config: TestCaseConfig = {
      targetK: 0,
      difficulty: {
        studentCount,
        overlapRatio: 0.1,
        fragmentationLevel: 0.8,
        packingDensity: 1.2, // Over-constrained
        durationVariety: 4,
        constraintTightness: 0.95
      },
      metadata: {
        description: `Impossible case with ${studentCount} students`,
        expectedSolveTime: 100,
        category: 'impossible'
      }
    };
    
    return this.generator.generateKSolutionCase(config, {
      targetK: 0,
      tolerance: 0,
      useExactCounting: true
    });
  }
  
  /**
   * Generate unique solution case (k=1)
   */
  async generateUniqueSolutionCase(studentCount = 15): Promise<GenerationResult> {
    const config: TestCaseConfig = {
      targetK: 1,
      difficulty: {
        studentCount,
        overlapRatio: 0.3,
        fragmentationLevel: 0.6,
        packingDensity: 0.9,
        durationVariety: 3,
        constraintTightness: 0.8
      },
      metadata: {
        description: `Unique solution puzzle with ${studentCount} students`,
        expectedSolveTime: 500,
        category: 'hard'
      }
    };
    
    return this.generator.generateKSolutionCase(config, {
      targetK: 1,
      tolerance: 0,
      useExactCounting: studentCount <= 15
    });
  }
  
  /**
   * Generate few solutions case (k=5)
   */
  async generateFewSolutionsCase(studentCount = 20): Promise<GenerationResult> {
    const config: TestCaseConfig = {
      targetK: 5,
      difficulty: {
        studentCount,
        overlapRatio: 0.4,
        fragmentationLevel: 0.5,
        packingDensity: 0.75,
        durationVariety: 3,
        constraintTightness: 0.6
      },
      metadata: {
        description: `Few solutions case with ${studentCount} students`,
        expectedSolveTime: 300,
        category: 'hard'
      }
    };
    
    return this.generator.generateKSolutionCase(config, {
      targetK: 5,
      tolerance: 2,
      useExactCounting: studentCount <= 15
    });
  }
  
  /**
   * Generate many solutions case (k=100+)
   */
  async generateManySolutionsCase(studentCount = 25): Promise<GenerationResult> {
    const config: TestCaseConfig = {
      targetK: 100,
      difficulty: {
        studentCount,
        overlapRatio: 0.7,
        fragmentationLevel: 0.2,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.3
      },
      metadata: {
        description: `Many solutions case with ${studentCount} students`,
        expectedSolveTime: 150,
        category: 'easy'
      }
    };
    
    return this.generator.generateKSolutionCase(config, {
      targetK: 100,
      tolerance: 20,
      useExactCounting: false,
      estimationSamples: 2000
    });
  }
  
}

/**
 * Default k-solution generator instance
 */
export const defaultKSolutionGenerator = new KSolutionGenerator();

/**
 * Default presets instance
 */
export const kSolutionPresets = new KSolutionPresets();