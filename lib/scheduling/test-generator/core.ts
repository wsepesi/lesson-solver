/**
 * Core Test Generator Framework
 * 
 * Main interfaces and classes for generating scheduler hardness tests
 * with the new TimeBlock-based system using minute precision.
 */

import type { StudentConfig, TeacherConfig } from '../types';

/**
 * Difficulty parameters that control test case generation complexity
 */
export interface DifficultyParams {
  /** Number of students in the test case (2-50) */
  studentCount: number;
  
  /** How much student availability overlaps (0.0-1.0) */
  overlapRatio: number;
  
  /** How fragmented time blocks are (0.0-1.0, higher = more fragments) */
  fragmentationLevel: number;
  
  /** Ratio of required time to available time (0.0-1.0) */
  packingDensity: number;
  
  /** Number of different lesson durations used (1-4) */
  durationVariety: number;
  
  /** How strict constraints are (0.0-1.0, higher = tighter) */
  constraintTightness: number;
}

/**
 * Configuration for generating a specific test case
 */
export interface TestCaseConfig {
  /** Target number of solutions (k-solvability) */
  targetK: number;
  
  /** Difficulty parameters */
  difficulty: DifficultyParams;
  
  /** Test case metadata */
  metadata: TestCaseMetadata;
}

/**
 * Metadata about a test case
 */
export interface TestCaseMetadata {
  /** Human-readable description */
  description: string;
  
  /** Expected solve time in milliseconds */
  expectedSolveTime: number;
  
  /** Difficulty category */
  category: 'basic' | 'easy' | 'medium' | 'hard' | 'impossible';
  
  /** Additional tags for categorization */
  tags?: string[];
  
  /** Generator version for reproducibility */
  generatorVersion?: string;
  
  /** Scenario name for extreme test cases */
  scenario?: string;
  
  /** Expected behavior description */
  expectedBehavior?: string;
  
  /** Extreme category for stress testing */
  extremeCategory?: string;
  
  /** Random seed used for generation */
  seed?: number;
}

/**
 * Complete test case with teacher, students, and expected results
 */
export interface TestCase {
  /** Unique identifier */
  id: string;
  
  /** Human-readable description */
  description: string;
  
  /** Teacher configuration */
  teacher: TeacherConfig;
  
  /** Student configurations */
  students: StudentConfig[];
  
  /** Expected number of solutions */
  expectedSolutions: number;
  
  /** Difficulty parameters used to generate this case */
  difficulty: DifficultyParams;
  
  /** Test case metadata */
  metadata: TestCaseMetadata;
  
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Collection of test cases for a specific category or purpose
 */
export interface TestSuite {
  /** Suite name */
  name: string;
  
  /** Suite description */
  description: string;
  
  /** Test cases in this suite */
  cases: TestCase[];
  
  /** Total number of cases */
  totalCases: number;
  
  /** Breakdown by category */
  categories: Record<string, number>;
  
  /** Suite creation timestamp */
  createdAt: Date;
}

/**
 * Result of attempting to generate a test case with specific k-solvability
 */
export interface GenerationResult {
  /** Whether generation was successful */
  success: boolean;
  
  /** Generated test case (if successful) */
  testCase?: TestCase;
  
  /** Actual number of solutions found */
  actualSolutions?: number;
  
  /** Generation time in milliseconds */
  generationTimeMs: number;
  
  /** Number of attempts made */
  attempts: number;
  
  /** Error message (if failed) */
  error?: string;
}

/**
 * Main test case generator class
 */
export class TestCaseGenerator {
  private seed: number;
  private generatorVersion = '1.0.0';
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
  }
  
  /**
   * Generate a test case with specific difficulty parameters
   */
  async generateTestCase(config: TestCaseConfig): Promise<GenerationResult> {
    const startTime = Date.now();
    const attempts = 0;
    
    try {
      const testCase = await this.createTestCase(config);
      const generationTime = Date.now() - startTime;
      
      return {
        success: true,
        testCase,
        actualSolutions: testCase.expectedSolutions,
        generationTimeMs: generationTime,
        attempts: attempts + 1
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      
      return {
        success: false,
        generationTimeMs: generationTime,
        attempts: attempts + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate a complete test suite with multiple difficulty levels
   */
  async generateTestSuite(
    name: string,
    description: string,
    configs: TestCaseConfig[]
  ): Promise<TestSuite> {
    const cases: TestCase[] = [];
    const categories: Record<string, number> = {};
    
    for (const config of configs) {
      const result = await this.generateTestCase(config);
      
      if (result.success && result.testCase) {
        cases.push(result.testCase);
        
        const category = result.testCase.metadata.category;
        categories[category] = (categories[category] ?? 0) + 1;
      }
    }
    
    return {
      name,
      description,
      cases,
      totalCases: cases.length,
      categories,
      createdAt: new Date()
    };
  }
  
  /**
   * Create predefined difficulty configurations
   */
  createDifficultyPresets(): {
    trivial: DifficultyParams;
    easy: DifficultyParams;
    medium: DifficultyParams;
    hard: DifficultyParams;
    extreme: DifficultyParams;
  } {
    return {
      trivial: {
        studentCount: 3,
        overlapRatio: 0.8,
        fragmentationLevel: 0.1,
        packingDensity: 0.3,
        durationVariety: 1,
        constraintTightness: 0.2
      },
      
      easy: {
        studentCount: 8,
        overlapRatio: 0.7,
        fragmentationLevel: 0.2,
        packingDensity: 0.5,
        durationVariety: 2,
        constraintTightness: 0.3
      },
      
      medium: {
        studentCount: 15,
        overlapRatio: 0.5,
        fragmentationLevel: 0.4,
        packingDensity: 0.7,
        durationVariety: 3,
        constraintTightness: 0.5
      },
      
      hard: {
        studentCount: 25,
        overlapRatio: 0.3,
        fragmentationLevel: 0.6,
        packingDensity: 0.85,
        durationVariety: 4,
        constraintTightness: 0.7
      },
      
      extreme: {
        studentCount: 40,
        overlapRatio: 0.2,
        fragmentationLevel: 0.8,
        packingDensity: 0.95,
        durationVariety: 4,
        constraintTightness: 0.9
      }
    };
  }
  
  /**
   * Create test case configurations for k-solvability testing
   */
  createKSolvabilityConfigs(): TestCaseConfig[] {
    const presets = this.createDifficultyPresets();
    const configs: TestCaseConfig[] = [];
    
    // Impossible cases (k=0)
    configs.push({
      targetK: 0,
      difficulty: {
        studentCount: presets.hard.studentCount,
        overlapRatio: presets.hard.overlapRatio,
        fragmentationLevel: presets.hard.fragmentationLevel,
        packingDensity: 1.1, // Over-constrained
        durationVariety: presets.hard.durationVariety,
        constraintTightness: 0.95
      },
      metadata: {
        description: 'Impossible scheduling scenario - over-constrained',
        expectedSolveTime: 100,
        category: 'impossible',
        tags: ['over-constrained', 'k-0']
      }
    });
    
    // Unique solution cases (k=1)
    configs.push({
      targetK: 1,
      difficulty: {
        studentCount: presets.medium.studentCount,
        overlapRatio: presets.medium.overlapRatio,
        fragmentationLevel: presets.medium.fragmentationLevel,
        packingDensity: 0.9,
        durationVariety: presets.medium.durationVariety,
        constraintTightness: 0.8
      },
      metadata: {
        description: 'Unique solution puzzle',
        expectedSolveTime: 500,
        category: 'hard',
        tags: ['unique-solution', 'k-1']
      }
    });
    
    // Few solutions (k=5)
    configs.push({
      targetK: 5,
      difficulty: {
        studentCount: presets.medium.studentCount,
        overlapRatio: presets.medium.overlapRatio,
        fragmentationLevel: presets.medium.fragmentationLevel,
        packingDensity: 0.75,
        durationVariety: presets.medium.durationVariety,
        constraintTightness: 0.6
      },
      metadata: {
        description: 'Tightly constrained with few solutions',
        expectedSolveTime: 300,
        category: 'hard',
        tags: ['tight-constraints', 'k-5']
      }
    });
    
    // Moderate solutions (k=10)
    configs.push({
      targetK: 10,
      difficulty: presets.medium,
      metadata: {
        description: 'Moderately constrained scheduling',
        expectedSolveTime: 200,
        category: 'medium',
        tags: ['moderate-constraints', 'k-10']
      }
    });
    
    // Many solutions (k=100+)
    configs.push({
      targetK: 100,
      difficulty: presets.easy,
      metadata: {
        description: 'Flexible scheduling with many solutions',
        expectedSolveTime: 100,
        category: 'easy',
        tags: ['flexible', 'k-100']
      }
    });
    
    return configs;
  }
  
  /**
   * Set the random seed for reproducible generation
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
  
  /**
   * Get the current random seed
   */
  getSeed(): number {
    return this.seed;
  }
  
  /**
   * Internal method to create a test case from configuration
   * This will be implemented to coordinate with other generators
   */
  private createTestCase(config: TestCaseConfig): Promise<TestCase> {
    // This is a placeholder - actual implementation will use
    // availability generators, constraint generators, and k-solution targeting
    
    const id = this.generateId();
    
    // For now, create a basic structure
    // TODO: Integrate with availability generator and k-solution generator
    const testCase: TestCase = {
      id,
      description: config.metadata.description,
      teacher: this.createPlaceholderTeacher(),
      students: this.createPlaceholderStudents(config.difficulty.studentCount),
      expectedSolutions: config.targetK,
      difficulty: config.difficulty,
      metadata: {
        ...config.metadata,
        generatorVersion: this.generatorVersion,
        seed: this.seed
      },
      createdAt: new Date()
    };
    
    return Promise.resolve(testCase);
  }
  
  /**
   * Generate a unique test case ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `tc_${timestamp}_${random}`;
  }
  
  /**
   * Create a placeholder teacher configuration
   * TODO: Replace with actual teacher generator
   */
  private createPlaceholderTeacher(): TeacherConfig {
    return {
      person: {
        id: 'teacher_1',
        name: 'Test Teacher',
        email: 'teacher@test.com'
      },
      studioId: 'studio_test',
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
   * Create placeholder student configurations
   * TODO: Replace with actual student generator
   */
  private createPlaceholderStudents(count: number): StudentConfig[] {
    const students: StudentConfig[] = [];
    
    for (let i = 0; i < count; i++) {
      students.push({
        person: {
          id: `student_${i + 1}`,
          name: `Test Student ${i + 1}`,
          email: `student${i + 1}@test.com`
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
}

/**
 * Default generator instance with random seed
 */
export const defaultGenerator = new TestCaseGenerator();

/**
 * Create a generator with a specific seed for reproducible tests
 */
export function createSeededGenerator(seed: number): TestCaseGenerator {
  return new TestCaseGenerator(seed);
}