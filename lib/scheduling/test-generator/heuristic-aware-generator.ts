/**
 * Heuristic-Aware Test Generator
 * 
 * Generates test fixtures that can work with or against solver heuristics.
 * This allows testing solver behavior under various conditions and validating
 * when heuristics help vs hurt performance.
 */

import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  Person
} from '../types';

import type {
  TestCase,
  TestCaseConfig,
  DifficultyParams,
  GenerationResult
} from './core';

import { AvailabilityGenerator, type AvailabilityPattern } from './generators/availability-generator';
import { StudentGenerator, type StudentType } from './generators/student-generator';
import { ConstraintGenerator } from './generators/constraint-generator';

// ============================================================================
// HEURISTIC MODE TYPES
// ============================================================================

/**
 * Modes for how generated fixtures interact with solver heuristics
 */
export enum HeuristicMode {
  /** Pure random generation, no heuristic consideration */
  NONE = 'none',
  
  /** Actively works against heuristics (tests worst-case scenarios) */
  ANTI_HEURISTIC = 'anti',
  
  /** Random but balanced, no specific preference */
  NEUTRAL = 'neutral',
  
  /** Aligns with heuristic preferences (tests best-case scenarios) */
  PRO_HEURISTIC = 'pro',
  
  /** Mix of pro and anti heuristic patterns (realistic complexity) */
  MIXED = 'mixed'
}

/**
 * Configuration for heuristic-aware generation
 */
export interface HeuristicAwareConfig {
  /** How the fixture should interact with heuristics */
  heuristicMode: HeuristicMode;
  
  /** Target solvability ratio (0.0 = impossible, 1.0 = all students schedulable) */
  targetSolvability: number;
  
  /** Target number of solutions (k-value) */
  solutionCount?: number;
  
  /** How tight constraints should be (0.0 = loose, 1.0 = very tight) */
  constraintTightness: number;
  
  /** Number of students to generate */
  studentCount: number;
  
  /** Random seed for reproducible generation */
  seed?: number;
  
  /** Optional description for the generated fixture */
  description?: string;
}

/**
 * Analysis of a generated fixture's heuristic characteristics
 */
export interface HeuristicAnalysis {
  /** How well this fixture should work with heuristics */
  heuristicFriendliness: number; // 0.0 = hostile, 1.0 = friendly
  
  /** Expected performance impact of heuristics */
  expectedSpeedup: number; // Ratio: time_without_heuristics / time_with_heuristics
  
  /** Breakdown of heuristic impact factors */
  factors: {
    timeDistribution: number; // How well times align with mid-day preference
    dayDistribution: number;  // How well distributed across weekdays
    durationAlignment: number; // How well durations align with standard sizes
    conflictLevel: number;    // How much conflict there is
    spacingQuality: number;   // How good natural spacing opportunities are
  };
  
  /** Predicted solver behavior */
  predictions: {
    withHeuristics: {
      expectedTime: number;
      expectedBacktracks: number;
      expectedSolutionQuality: number;
    };
    withoutHeuristics: {
      expectedTime: number;
      expectedBacktracks: number;
      expectedSolutionQuality: number;
    };
  };
}

// ============================================================================
// HEURISTIC-AWARE GENERATOR CLASS
// ============================================================================

/**
 * Main class for generating heuristic-aware test fixtures
 */
export class HeuristicAwareGenerator {
  private availabilityGenerator: AvailabilityGenerator;
  private studentGenerator: StudentGenerator;
  private constraintGenerator: ConstraintGenerator;
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
    this.availabilityGenerator = new AvailabilityGenerator(this.seed);
    this.studentGenerator = new StudentGenerator(this.seed);
    this.constraintGenerator = new ConstraintGenerator(this.seed);
  }

  /**
   * Generate a test case with specified heuristic characteristics
   */
  async generateTestCase(config: HeuristicAwareConfig): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Generate teacher configuration
      const teacher = this.generateTeacher(config);

      // Generate students based on heuristic mode
      const students = this.generateStudents(config, teacher);

      // Create test case
      const testCase: TestCase = {
        id: this.generateId(),
        description: config.description ?? this.generateDescription(config),
        teacher,
        students,
        expectedSolutions: config.solutionCount ?? this.estimateSolutionCount(config),
        difficulty: this.createDifficultyParams(config),
        metadata: {
          description: config.description ?? this.generateDescription(config),
          expectedSolveTime: this.estimateSolveTime(config),
          category: this.categorizeByMode(config.heuristicMode),
          tags: this.generateTags(config),
          generatorVersion: '2.0.0-heuristic-aware',
          seed: this.seed
        },
        createdAt: new Date()
      };

      const generationTime = Date.now() - startTime;

      return {
        success: true,
        testCase,
        actualSolutions: config.solutionCount,
        generationTimeMs: generationTime,
        attempts: 1
      };

    } catch (error) {
      return {
        success: false,
        generationTimeMs: Date.now() - startTime,
        attempts: 1,
        error: error instanceof Error ? error.message : 'Unknown error in heuristic-aware generation'
      };
    }
  }

  /**
   * Generate multiple test cases with different heuristic modes for comparison
   */
  async generateComparisonSet(
    baseConfig: Omit<HeuristicAwareConfig, 'heuristicMode'>,
    modes: HeuristicMode[] = [HeuristicMode.NONE, HeuristicMode.ANTI_HEURISTIC, HeuristicMode.PRO_HEURISTIC]
  ): Promise<TestCase[]> {
    const results: TestCase[] = [];

    for (const mode of modes) {
      const config = { ...baseConfig, heuristicMode: mode };
      const result = await this.generateTestCase(config);
      
      if (result.success && result.testCase) {
        results.push(result.testCase);
      }
    }

    return results;
  }

  /**
   * Analyze how a fixture will interact with heuristics
   */
  analyzeHeuristicCharacteristics(testCase: TestCase): HeuristicAnalysis {
    const factors = this.calculateHeuristicFactors(testCase);
    const heuristicFriendliness = this.calculateHeuristicFriendliness(factors);
    const expectedSpeedup = this.calculateExpectedSpeedup(factors);
    const predictions = this.generatePerformancePredictions(factors, testCase);

    return {
      heuristicFriendliness,
      expectedSpeedup,
      factors,
      predictions
    };
  }

  // ============================================================================
  // TEACHER GENERATION
  // ============================================================================

  private generateTeacher(config: HeuristicAwareConfig): TeacherConfig {
    const availability = this.generateTeacherAvailability(config);
    const constraints = this.generateTeacherConstraints(config);

    return {
      person: {
        id: 'teacher-ha-1',
        name: 'Heuristic Test Teacher',
        email: 'teacher@heuristictest.com'
      },
      studioId: 'studio-heuristic-test',
      availability,
      constraints
    };
  }

  private generateTeacherAvailability(config: HeuristicAwareConfig): WeekSchedule {
    const { heuristicMode, targetSolvability } = config;

    switch (heuristicMode) {
      case HeuristicMode.PRO_HEURISTIC:
        // Heuristic-friendly: Lots of weekday mid-day availability
        return this.availabilityGenerator.generatePattern('working-hours', {
          activeDays: [1, 2, 3, 4, 5], // Monday-Friday
          primaryRange: {
            startMinute: 9 * 60,  // 9 AM
            endMinute: 17 * 60    // 5 PM
          },
          fragmentationLevel: 0.1 // Low fragmentation
        });

      case HeuristicMode.ANTI_HEURISTIC:
        // Heuristic-hostile: Weekend and early/late hours
        return this.availabilityGenerator.generatePattern('fragmented', {
          activeDays: [0, 6, 1, 2], // Weekends + some weekdays
          primaryRange: {
            startMinute: 7 * 60,  // 7 AM
            endMinute: 10 * 60    // 10 AM
          },
          secondaryRange: {
            startMinute: 19 * 60, // 7 PM
            endMinute: 22 * 60    // 10 PM
          },
          fragmentationLevel: 0.7 // High fragmentation
        });

      case HeuristicMode.NONE:
        // Pure random across all times
        return this.availabilityGenerator.generatePattern('realistic', {
          activeDays: [0, 1, 2, 3, 4, 5, 6], // All days
          primaryRange: {
            startMinute: 6 * 60,  // 6 AM
            endMinute: 23 * 60    // 11 PM
          },
          fragmentationLevel: 0.5
        });

      case HeuristicMode.NEUTRAL:
        // Balanced availability
        return this.availabilityGenerator.generatePattern('part-time', {
          activeDays: [1, 2, 3, 4, 5, 6], // Weekdays + Saturday
          primaryRange: {
            startMinute: 10 * 60, // 10 AM
            endMinute: 18 * 60    // 6 PM
          },
          fragmentationLevel: 0.3
        });

      case HeuristicMode.MIXED:
        // Some good days, some challenging days
        const days: DaySchedule[] = [];
        
        // Monday-Wednesday: Good times
        for (let day = 1; day <= 3; day++) {
          days.push({
            dayOfWeek: day,
            blocks: [{ start: 10 * 60, duration: 6 * 60 }] // 10am-4pm
          });
        }
        
        // Thursday-Friday: Challenging times
        for (let day = 4; day <= 5; day++) {
          days.push({
            dayOfWeek: day,
            blocks: [
              { start: 7 * 60, duration: 2 * 60 },   // 7-9am
              { start: 19 * 60, duration: 2 * 60 }   // 7-9pm
            ]
          });
        }

        return {
          days: Array.from({ length: 7 }, (_, i) => 
            days.find(d => d.dayOfWeek === i) ?? { dayOfWeek: i, blocks: [] }
          ),
          timezone: 'UTC'
        };

      default:
        throw new Error(`Unknown heuristic mode: ${heuristicMode}`);
    }
  }

  private generateTeacherConstraints(config: HeuristicAwareConfig): SchedulingConstraints {
    const { heuristicMode, constraintTightness } = config;

    const baseConstraints: SchedulingConstraints = {
      maxConsecutiveMinutes: 240, // 4 hours base
      breakDurationMinutes: 15,
      minLessonDuration: 30,
      maxLessonDuration: 120,
      allowedDurations: [30, 45, 60, 90] // Standard durations
    };

    // Adjust based on heuristic mode
    switch (heuristicMode) {
      case HeuristicMode.PRO_HEURISTIC:
        // Keep standard durations, reasonable constraints
        return {
          ...baseConstraints,
          maxConsecutiveMinutes: Math.floor(240 * (1 - constraintTightness * 0.5)),
          breakDurationMinutes: Math.floor(15 + constraintTightness * 20)
        };

      case HeuristicMode.ANTI_HEURISTIC:
        // Non-standard durations, tight constraints
        return {
          ...baseConstraints,
          allowedDurations: [35, 50, 75, 100], // Non-standard durations
          maxConsecutiveMinutes: Math.floor(180 * (1 - constraintTightness * 0.7)),
          breakDurationMinutes: Math.floor(25 + constraintTightness * 35)
        };

      case HeuristicMode.MIXED:
        // Mix of standard and non-standard
        return {
          ...baseConstraints,
          allowedDurations: [30, 45, 55, 60, 75, 90], // Mixed durations
          maxConsecutiveMinutes: Math.floor(210 * (1 - constraintTightness * 0.6)),
          breakDurationMinutes: Math.floor(20 + constraintTightness * 25)
        };

      default:
        // NONE and NEUTRAL use base constraints with tightness adjustment
        return {
          ...baseConstraints,
          maxConsecutiveMinutes: Math.floor(240 * (1 - constraintTightness * 0.6)),
          breakDurationMinutes: Math.floor(15 + constraintTightness * 30)
        };
    }
  }

  // ============================================================================
  // STUDENT GENERATION
  // ============================================================================

  private generateStudents(config: HeuristicAwareConfig, teacher: TeacherConfig): StudentConfig[] {
    const students: StudentConfig[] = [];
    const { heuristicMode, studentCount, targetSolvability } = config;

    for (let i = 0; i < studentCount; i++) {
      const student = this.generateSingleStudent(i, config, teacher, targetSolvability);
      students.push(student);
    }

    return students;
  }

  private generateSingleStudent(
    index: number,
    config: HeuristicAwareConfig,
    teacher: TeacherConfig,
    targetSolvability: number
  ): StudentConfig {
    const { heuristicMode } = config;
    
    // Determine if this student should be schedulable based on target solvability
    const shouldBeSchedulable = Math.random() < targetSolvability;
    
    const studentId = `student_${index + 1}`;
    const studentName = `Student ${index + 1}`;

    const person: Person = {
      id: studentId,
      name: studentName,
      email: `student${index + 1}@test.com`
    };

    const availability = this.generateStudentAvailability(
      index, 
      heuristicMode, 
      teacher, 
      shouldBeSchedulable
    );

    const preferredDuration = this.generateStudentDuration(
      index,
      heuristicMode,
      teacher.constraints.allowedDurations || [60]
    );

    return {
      person,
      preferredDuration,
      maxLessonsPerWeek: 1,
      availability
    };
  }

  private generateStudentAvailability(
    index: number,
    mode: HeuristicMode,
    teacher: TeacherConfig,
    shouldBeSchedulable: boolean
  ): WeekSchedule {
    if (!shouldBeSchedulable) {
      // Generate availability that doesn't overlap with teacher
      return this.generateNonOverlappingAvailability(teacher);
    }

    switch (mode) {
      case HeuristicMode.PRO_HEURISTIC:
        return this.generateHeuristicFriendlyAvailability(index, teacher);

      case HeuristicMode.ANTI_HEURISTIC:
        return this.generateHeuristicHostileAvailability(index, teacher);

      case HeuristicMode.MIXED:
        // 60% friendly, 40% hostile
        return Math.random() < 0.6 
          ? this.generateHeuristicFriendlyAvailability(index, teacher)
          : this.generateHeuristicHostileAvailability(index, teacher);

      default: // NONE and NEUTRAL
        return this.generateRandomAvailability(index, teacher);
    }
  }

  private generateHeuristicFriendlyAvailability(index: number, teacher: TeacherConfig): WeekSchedule {
    // Students prefer mid-day weekday slots with good spacing
    const preferredDays = [1, 2, 3, 4, 5]; // Weekdays
    const dayIndex = index % preferredDays.length;
    const selectedDay = preferredDays[dayIndex]!;

    // Find teacher's availability for this day
    const teacherDay = teacher.availability.days[selectedDay];
    if (!teacherDay || teacherDay.blocks.length === 0) {
      // Fallback to any available day
      const availableDays = teacher.availability.days.filter(d => d.blocks.length > 0);
      if (availableDays.length === 0) {
        return { days: Array(7).fill(null).map((_, i) => ({ dayOfWeek: i, blocks: [] })), timezone: 'UTC' };
      }
      const fallbackDay = availableDays[index % availableDays.length]!;
      return this.createStudentAvailabilityFromTeacherDay(fallbackDay);
    }

    return this.createStudentAvailabilityFromTeacherDay(teacherDay);
  }

  private generateHeuristicHostileAvailability(index: number, teacher: TeacherConfig): WeekSchedule {
    // Students prefer times that work against heuristics
    // - Early morning or late evening
    // - Weekends
    // - All want the same time slots (high conflict)

    const hostileTimes = [
      { start: 7 * 60, duration: 2 * 60 },   // 7-9 AM
      { start: 19 * 60, duration: 3 * 60 },  // 7-10 PM
      { start: 22 * 60, duration: 2 * 60 }   // 10 PM-12 AM
    ];

    // Most students want the same conflicting time
    const conflictTimeIndex = Math.floor(index / 3) % hostileTimes.length;
    const conflictTime = hostileTimes[conflictTimeIndex]!;

    // Try to find overlap with teacher's hostile times
    const days: DaySchedule[] = Array(7).fill(null).map((_, i) => ({ dayOfWeek: i, blocks: [] }));

    for (const teacherDay of teacher.availability.days) {
      if (teacherDay.blocks.length === 0) continue;

      for (const teacherBlock of teacherDay.blocks) {
        // Check if our hostile time overlaps with teacher availability
        const overlapStart = Math.max(conflictTime.start, teacherBlock.start);
        const overlapEnd = Math.min(
          conflictTime.start + conflictTime.duration,
          teacherBlock.start + teacherBlock.duration
        );

        if (overlapEnd > overlapStart && (overlapEnd - overlapStart) >= 60) {
          // We have at least 1 hour overlap - use it
          days[teacherDay.dayOfWeek] = {
            dayOfWeek: teacherDay.dayOfWeek,
            blocks: [{
              start: overlapStart,
              duration: overlapEnd - overlapStart
            }]
          };
        }
      }
    }

    return { days, timezone: 'UTC' };
  }

  private generateRandomAvailability(index: number, teacher: TeacherConfig): WeekSchedule {
    // Completely random availability that overlaps with teacher
    const availableTeacherDays = teacher.availability.days.filter(d => d.blocks.length > 0);
    if (availableTeacherDays.length === 0) {
      return { days: Array(7).fill(null).map((_, i) => ({ dayOfWeek: i, blocks: [] })), timezone: 'UTC' };
    }

    // Pick 1-3 random days
    const numDays = Math.min(1 + (index % 3), availableTeacherDays.length);
    const shuffledDays = [...availableTeacherDays].sort(() => Math.random() - 0.5);
    const selectedDays = shuffledDays.slice(0, numDays);

    const days: DaySchedule[] = Array(7).fill(null).map((_, i) => ({ dayOfWeek: i, blocks: [] }));

    for (const teacherDay of selectedDays) {
      if (teacherDay.blocks.length === 0) continue;

      // Pick a random block and create availability within it
      const teacherBlock = teacherDay.blocks[Math.floor(Math.random() * teacherDay.blocks.length)]!;
      const maxDuration = Math.min(teacherBlock.duration, 4 * 60); // Max 4 hours
      const minDuration = Math.min(60, maxDuration); // At least 1 hour

      const duration = minDuration + Math.floor(Math.random() * (maxDuration - minDuration));
      const maxStart = teacherBlock.start + teacherBlock.duration - duration;
      const start = teacherBlock.start + Math.floor(Math.random() * Math.max(1, maxStart - teacherBlock.start));

      days[teacherDay.dayOfWeek] = {
        dayOfWeek: teacherDay.dayOfWeek,
        blocks: [{ start, duration }]
      };
    }

    return { days, timezone: 'UTC' };
  }

  private generateNonOverlappingAvailability(teacher: TeacherConfig): WeekSchedule {
    // Generate availability that doesn't overlap with teacher (impossible case)
    const days: DaySchedule[] = Array(7).fill(null).map((_, i) => ({ dayOfWeek: i, blocks: [] }));
    
    // Find a day where teacher is not available, or times where teacher is not available
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const teacherDay = teacher.availability.days[dayOfWeek];
      
      if (!teacherDay || teacherDay.blocks.length === 0) {
        // Teacher not available this day - student can be available
        days[dayOfWeek] = {
          dayOfWeek,
          blocks: [{ start: 10 * 60, duration: 4 * 60 }] // 10am-2pm
        };
        break;
      } else {
        // Find gaps in teacher's schedule
        const teacherBlocks = [...teacherDay.blocks].sort((a, b) => a.start - b.start);
        
        if (teacherBlocks[0]!.start > 8 * 60) {
          // Gap before first block
          days[dayOfWeek] = {
            dayOfWeek,
            blocks: [{ start: 7 * 60, duration: teacherBlocks[0]!.start - 7 * 60 }]
          };
          break;
        }
        
        const lastBlock = teacherBlocks[teacherBlocks.length - 1]!;
        if (lastBlock.start + lastBlock.duration < 20 * 60) {
          // Gap after last block
          days[dayOfWeek] = {
            dayOfWeek,
            blocks: [{ start: lastBlock.start + lastBlock.duration + 60, duration: 2 * 60 }]
          };
          break;
        }
      }
    }

    return { days, timezone: 'UTC' };
  }

  private createStudentAvailabilityFromTeacherDay(teacherDay: DaySchedule): WeekSchedule {
    const days: DaySchedule[] = Array(7).fill(null).map((_, i) => ({ dayOfWeek: i, blocks: [] }));
    
    if (teacherDay.blocks.length === 0) {
      return { days, timezone: 'UTC' };
    }

    // Use the largest teacher block for student availability
    const largestBlock = teacherDay.blocks.reduce((largest, block) => 
      block.duration > largest.duration ? block : largest
    );

    // Student available for a portion of the teacher's block
    const maxStudentDuration = Math.min(largestBlock.duration, 4 * 60); // Max 4 hours
    const duration = Math.max(60, Math.floor(maxStudentDuration * (0.5 + Math.random() * 0.5)));
    const maxStart = largestBlock.start + largestBlock.duration - duration;
    const start = largestBlock.start + Math.floor(Math.random() * Math.max(1, maxStart - largestBlock.start));

    days[teacherDay.dayOfWeek] = {
      dayOfWeek: teacherDay.dayOfWeek,
      blocks: [{ start, duration }]
    };

    return { days, timezone: 'UTC' };
  }

  private generateStudentDuration(
    index: number,
    mode: HeuristicMode,
    allowedDurations: number[]
  ): number {
    switch (mode) {
      case HeuristicMode.PRO_HEURISTIC:
        // Use standard durations preferred by heuristics
        const standardDurations = allowedDurations.filter(d => [30, 45, 60, 90].includes(d));
        return standardDurations.length > 0
          ? standardDurations[index % standardDurations.length]!
          : allowedDurations[0] || 60;

      case HeuristicMode.ANTI_HEURISTIC:
        // Prefer non-standard durations if available
        const nonStandardDurations = allowedDurations.filter(d => ![30, 45, 60, 90].includes(d));
        return nonStandardDurations.length > 0
          ? nonStandardDurations[index % nonStandardDurations.length]!
          : allowedDurations[allowedDurations.length - 1] || 60;

      default:
        // Random selection from allowed durations
        return allowedDurations[index % allowedDurations.length] || 60;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `tc_${timestamp}_${random}`;
  }

  private generateDescription(config: HeuristicAwareConfig): string {
    const modeDescriptions = {
      [HeuristicMode.NONE]: 'Random generation with no heuristic consideration',
      [HeuristicMode.ANTI_HEURISTIC]: 'Anti-heuristic test case (worst-case for heuristics)',
      [HeuristicMode.NEUTRAL]: 'Neutral test case (balanced for heuristics)',
      [HeuristicMode.PRO_HEURISTIC]: 'Pro-heuristic test case (best-case for heuristics)',
      [HeuristicMode.MIXED]: 'Mixed test case (realistic heuristic complexity)'
    };

    return `${modeDescriptions[config.heuristicMode]} - ${config.studentCount} students, ${Math.round(config.targetSolvability * 100)}% solvability`;
  }

  private categorizeByMode(mode: HeuristicMode): 'basic' | 'easy' | 'medium' | 'hard' | 'impossible' {
    switch (mode) {
      case HeuristicMode.PRO_HEURISTIC:
        return 'easy';
      case HeuristicMode.ANTI_HEURISTIC:
        return 'hard';
      case HeuristicMode.MIXED:
        return 'medium';
      default:
        return 'medium';
    }
  }

  private generateTags(config: HeuristicAwareConfig): string[] {
    const tags = [
      `heuristic-${config.heuristicMode}`,
      `students-${config.studentCount}`,
      `solvability-${Math.round(config.targetSolvability * 100)}pct`
    ];

    if (config.solutionCount !== undefined) {
      tags.push(`k-${config.solutionCount}`);
    }

    return tags;
  }

  private createDifficultyParams(config: HeuristicAwareConfig): DifficultyParams {
    // If original difficulty params were passed in, preserve them
    if ('originalDifficulty' in config && (config as any).originalDifficulty) {
      return (config as any).originalDifficulty;
    }
    
    return {
      studentCount: config.studentCount,
      overlapRatio: config.targetSolvability,
      fragmentationLevel: config.constraintTightness,
      packingDensity: 1.0 - config.targetSolvability,
      durationVariety: config.heuristicMode === HeuristicMode.ANTI_HEURISTIC ? 4 : 2,
      constraintTightness: config.constraintTightness
    };
  }

  private estimateSolutionCount(config: HeuristicAwareConfig): number {
    if (config.solutionCount !== undefined) {
      return config.solutionCount;
    }

    // Rough estimation based on solvability and mode
    const baseSolutions = config.targetSolvability * 10;
    
    switch (config.heuristicMode) {
      case HeuristicMode.PRO_HEURISTIC:
        return Math.floor(baseSolutions * 2); // More solutions possible
      case HeuristicMode.ANTI_HEURISTIC:
        return Math.max(1, Math.floor(baseSolutions * 0.5)); // Fewer solutions
      default:
        return Math.floor(baseSolutions);
    }
  }

  private estimateSolveTime(config: HeuristicAwareConfig): number {
    const baseTime = config.studentCount * 50; // Base time per student

    switch (config.heuristicMode) {
      case HeuristicMode.PRO_HEURISTIC:
        return Math.floor(baseTime * 0.5); // Faster with heuristics
      case HeuristicMode.ANTI_HEURISTIC:
        return Math.floor(baseTime * 2); // Slower with heuristics
      default:
        return baseTime;
    }
  }

  // ============================================================================
  // HEURISTIC ANALYSIS METHODS
  // ============================================================================

  private calculateHeuristicFactors(testCase: TestCase): HeuristicAnalysis['factors'] {
    // Analyze time distribution (mid-day preference)
    const timeDistribution = this.analyzeTimeDistribution(testCase);
    
    // Analyze day distribution (weekday preference)
    const dayDistribution = this.analyzeDayDistribution(testCase);
    
    // Analyze duration alignment (standard duration preference)
    const durationAlignment = this.analyzeDurationAlignment(testCase);
    
    // Analyze conflict level
    const conflictLevel = this.analyzeConflictLevel(testCase);
    
    // Analyze spacing quality
    const spacingQuality = this.analyzeSpacingQuality(testCase);

    return {
      timeDistribution,
      dayDistribution,
      durationAlignment,
      conflictLevel,
      spacingQuality
    };
  }

  private analyzeTimeDistribution(testCase: TestCase): number {
    // Calculate how much student availability aligns with mid-day preference (10am-4pm)
    let totalStudentHours = 0;
    let midDayHours = 0;

    for (const student of testCase.students) {
      for (const day of student.availability.days) {
        for (const block of day.blocks) {
          const blockHours = block.duration / 60;
          totalStudentHours += blockHours;

          // Calculate overlap with mid-day period (10am-4pm = 600-960 minutes)
          const overlapStart = Math.max(block.start, 10 * 60);
          const overlapEnd = Math.min(block.start + block.duration, 16 * 60);
          const overlapMinutes = Math.max(0, overlapEnd - overlapStart);
          midDayHours += overlapMinutes / 60;
        }
      }
    }

    return totalStudentHours > 0 ? midDayHours / totalStudentHours : 0;
  }

  private analyzeDayDistribution(testCase: TestCase): number {
    // Calculate weekday vs weekend preference
    let weekdayHours = 0;
    let totalHours = 0;

    for (const student of testCase.students) {
      for (const day of student.availability.days) {
        const isWeekday = day.dayOfWeek >= 1 && day.dayOfWeek <= 5;
        
        for (const block of day.blocks) {
          const blockHours = block.duration / 60;
          totalHours += blockHours;
          
          if (isWeekday) {
            weekdayHours += blockHours;
          }
        }
      }
    }

    return totalHours > 0 ? weekdayHours / totalHours : 0;
  }

  private analyzeDurationAlignment(testCase: TestCase): number {
    const standardDurations = [30, 45, 60, 90];
    let standardCount = 0;
    let totalCount = testCase.students.length;

    for (const student of testCase.students) {
      if (standardDurations.includes(student.preferredDuration)) {
        standardCount++;
      }
    }

    return totalCount > 0 ? standardCount / totalCount : 0;
  }

  private analyzeConflictLevel(testCase: TestCase): number {
    // Simplified conflict analysis - percentage of students with overlapping availability
    const conflicts = new Set<string>();
    
    for (let i = 0; i < testCase.students.length; i++) {
      for (let j = i + 1; j < testCase.students.length; j++) {
        const student1 = testCase.students[i]!;
        const student2 = testCase.students[j]!;
        
        if (this.hasOverlappingAvailability(student1, student2)) {
          conflicts.add(`${i}-${j}`);
        }
      }
    }

    const maxPossibleConflicts = (testCase.students.length * (testCase.students.length - 1)) / 2;
    return maxPossibleConflicts > 0 ? conflicts.size / maxPossibleConflicts : 0;
  }

  private hasOverlappingAvailability(student1: StudentConfig, student2: StudentConfig): boolean {
    for (let day = 0; day < 7; day++) {
      const day1 = student1.availability.days[day];
      const day2 = student2.availability.days[day];
      
      if (!day1 || !day2) continue;
      
      for (const block1 of day1.blocks) {
        for (const block2 of day2.blocks) {
          const overlapStart = Math.max(block1.start, block2.start);
          const overlapEnd = Math.min(
            block1.start + block1.duration,
            block2.start + block2.duration
          );
          
          if (overlapEnd > overlapStart) {
            return true; // Found overlap
          }
        }
      }
    }
    
    return false;
  }

  private analyzeSpacingQuality(testCase: TestCase): number {
    // Analyze how well spaced the student availability is
    // Higher score = better natural spacing opportunities
    
    let totalSpacing = 0;
    let spacingCount = 0;

    for (let day = 0; day < 7; day++) {
      const dayStudents = testCase.students.filter(s => 
        s.availability.days[day] && s.availability.days[day]!.blocks.length > 0
      );

      if (dayStudents.length < 2) continue;

      // Calculate spacing between student availability windows
      const timeWindows = dayStudents.flatMap(s => 
        s.availability.days[day]!.blocks.map(b => ({
          start: b.start,
          end: b.start + b.duration
        }))
      ).sort((a, b) => a.start - b.start);

      for (let i = 1; i < timeWindows.length; i++) {
        const gap = timeWindows[i]!.start - timeWindows[i-1]!.end;
        totalSpacing += Math.max(0, gap);
        spacingCount++;
      }
    }

    return spacingCount > 0 ? Math.min(1, totalSpacing / (spacingCount * 60)) : 1;
  }

  private calculateHeuristicFriendliness(factors: HeuristicAnalysis['factors']): number {
    // Weighted average of factors (higher = more heuristic-friendly)
    return (
      factors.timeDistribution * 0.25 +
      factors.dayDistribution * 0.20 +
      factors.durationAlignment * 0.20 +
      (1 - factors.conflictLevel) * 0.20 +
      factors.spacingQuality * 0.15
    );
  }

  private calculateExpectedSpeedup(factors: HeuristicAnalysis['factors']): number {
    // Estimate performance improvement ratio from heuristics
    const friendliness = this.calculateHeuristicFriendliness(factors);
    
    // Linear mapping: 0.5 friendliness = 1.0x speedup, 1.0 friendliness = 3.0x speedup
    return 0.5 + friendliness * 2.5;
  }

  private generatePerformancePredictions(
    factors: HeuristicAnalysis['factors'],
    testCase: TestCase
  ): HeuristicAnalysis['predictions'] {
    const baseTime = testCase.students.length * 100; // Base time estimate
    const friendliness = this.calculateHeuristicFriendliness(factors);
    const expectedSpeedup = this.calculateExpectedSpeedup(factors);

    return {
      withHeuristics: {
        expectedTime: Math.floor(baseTime / expectedSpeedup),
        expectedBacktracks: Math.floor(testCase.students.length * 10 * (1 - friendliness)),
        expectedSolutionQuality: 0.7 + friendliness * 0.3
      },
      withoutHeuristics: {
        expectedTime: baseTime,
        expectedBacktracks: Math.floor(testCase.students.length * 20),
        expectedSolutionQuality: 0.6
      }
    };
  }
}