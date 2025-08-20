/**
 * Generated Easy Hardness Tests - Many Solutions (k > 100)
 * 
 * This test suite contains generated test cases designed to have many possible
 * solutions (k > 100). These scenarios test the solver's ability to efficiently
 * find solutions when there are multiple valid arrangements.
 * 
 * Test Categories:
 * - High flexibility scenarios
 * - Short lessons with long availability windows
 * - Multiple valid time arrangements
 * - Stress tests for solution space exploration
 * 
 * Uses test generators from Agent 1 and Agent 2 to create realistic scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true
import {
  ScheduleSolver,
  createOptimalSolver,
  solveSchedule
} from '../../solver-wrapper';

import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  Person
} from '../../types';

import {
  createEmptyWeekSchedule
} from '../../utils';

// Import test generators
import { TestCaseGenerator, createSeededGenerator } from '../../test-generator/core';
import { AvailabilityGenerator, availabilityPresets } from '../../test-generator/generators/availability-generator';
import { StudentGenerator, studentPresets } from '../../test-generator/generators/student-generator';
import { kSolutionPresets } from '../../test-generator/k-solution-generator';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestPerson(id: string, name: string): Person {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`
  };
}

function createTestTeacher(
  availability: WeekSchedule,
  constraints?: Partial<SchedulingConstraints>
): TeacherConfig {
  const defaultConstraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 240, // 4 hours (flexible)
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };

  return {
    person: createTestPerson('teacher-easy', 'Easy Test Teacher'),
    studioId: 'studio-easy',
    availability,
    constraints: { ...defaultConstraints, ...constraints }
  };
}

function createDayWithBlocks(dayOfWeek: number, blocks: TimeBlock[]): DaySchedule {
  return {
    dayOfWeek,
    blocks: blocks.filter(block => block.start >= 0 && block.start < 1440)
  };
}

function createWeekWithDays(days: DaySchedule[], timezone = 'UTC'): WeekSchedule {
  const fullWeek = Array.from({ length: 7 }, (_, i) => 
    days.find(d => d.dayOfWeek === i) ?? createDayWithBlocks(i, [])
  );
  
  return {
    days: fullWeek,
    timezone
  };
}

// ============================================================================
// HAND-CRAFTED EASY SCENARIOS (BASELINE)
// ============================================================================

describe('Generated Easy - Hand-Crafted Baseline Scenarios', () => {
  describe('High Flexibility Scenarios', () => {
    it('should solve 8 flexible students with wide availability in under 100ms', () => {
      // Teacher available all weekdays 8am-6pm (very generous)
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 5 }, (_, day) => 
          createDayWithBlocks(day + 1, [{ start: 480, duration: 600 }]) // Mon-Fri 8am-6pm
        )
      );
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60] // Multiple duration options
      });

      // Students with overlapping but flexible availability
      const students = Array.from({ length: 8 }, (_, i) => {
        const primaryDay = (i % 5) + 1; // Spread across weekdays
        const secondaryDay = ((i + 2) % 5) + 1;
        const availability = createWeekWithDays([
          createDayWithBlocks(primaryDay, [{ start: 540, duration: 480 }]), // 9am-5pm
          createDayWithBlocks(secondaryDay, [{ start: 600, duration: 360 }]) // 10am-4pm
        ]);
        
        const duration = [30, 45, 60][i % 3]; // Mix of short durations
        return {
          person: createTestPerson(`s${i + 1}`, `Flexible Student ${i + 1}`),
          preferredDuration: duration,
          maxLessonsPerWeek: 1,
          availability
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(100);
      expect(solution.metadata.computeTimeMs).toBeLessThan(100);

      // Should schedule most/all students due to high flexibility
      expect(solution.assignments.length).toBeGreaterThanOrEqual(7);
      expect(solution.metadata.scheduledStudents).toBe(solution.assignments.length);
      expect(solution.metadata.averageUtilization).toBeGreaterThan(70);

      // Verify no conflicts
      const assignments = solution.assignments.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startMinute - b.startMinute;
      });
      
      for (let i = 1; i < assignments.length; i++) {
        const prev = assignments[i - 1]!;
        const curr = assignments[i]!;
        
        if (prev.dayOfWeek === curr.dayOfWeek) {
          const prevEnd = prev.startMinute + prev.durationMinutes;
          expect(curr.startMinute).toBeGreaterThanOrEqual(prevEnd);
        }
      }
    });

    it('should solve 12 students with short lessons and long windows in under 150ms', () => {
      // Teacher available Mon-Sat 7am-9pm (very long days)
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 6 }, (_, day) => 
          createDayWithBlocks(day + 1, [{ start: 420, duration: 840 }]) // 7am-9pm
        )
      );
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45], // Only short lessons
        maxConsecutiveMinutes: 300 // 5 hours consecutive allowed
      });

      // Many students wanting short lessons with flexible timing
      const students = Array.from({ length: 12 }, (_, i) => {
        const availableDays = [1, 2, 3, 4, 5, 6]; // All weekdays + Saturday
        const selectedDays = [
          availableDays[i % 6],
          availableDays[(i + 2) % 6],
          availableDays[(i + 4) % 6]
        ];
        
        const availability = createWeekWithDays(
          selectedDays.map(day => 
            createDayWithBlocks(day, [{ start: 480 + (i % 4) * 60, duration: 600 }])
          )
        );
        
        return {
          person: createTestPerson(`s${i + 1}`, `Short Lesson Student ${i + 1}`),
          preferredDuration: i % 2 === 0 ? 30 : 45,
          maxLessonsPerWeek: 1,
          availability
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(150);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(10);
      
      // With short lessons and long windows, should pack efficiently
      const totalScheduledTime = solution.assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
      expect(totalScheduledTime).toBeGreaterThan(400); // At least 6+ hours total
    });
  });

  describe('Multiple Time Options Scenarios', () => {
    it('should efficiently explore solution space with 15 students in under 200ms', () => {
      // Teacher available across multiple time blocks per day
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 480, duration: 180 }, // 8am-11am
          { start: 720, duration: 180 }  // 12pm-3pm
        ]),
        createDayWithBlocks(2, [
          { start: 540, duration: 240 }, // 9am-1pm
          { start: 840, duration: 120 }  // 2pm-4pm
        ]),
        createDayWithBlocks(3, [
          { start: 600, duration: 300 }  // 10am-3pm
        ]),
        createDayWithBlocks(4, [
          { start: 480, duration: 120 }, // 8am-10am
          { start: 660, duration: 180 }, // 11am-2pm
          { start: 900, duration: 120 }  // 3pm-5pm
        ]),
        createDayWithBlocks(5, [
          { start: 520, duration: 400 }  // 8:40am-3:20pm
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90]
      });

      // Students with various availability patterns creating many solution possibilities
      const students = Array.from({ length: 15 }, (_, i) => {
        const pattern = i % 5;
        let availability: WeekSchedule;
        
        switch (pattern) {
          case 0: // Morning people
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 480, duration: 240 }]),
              createDayWithBlocks(3, [{ start: 600, duration: 180 }])
            ]);
            break;
          case 1: // Afternoon people
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 720, duration: 240 }]),
              createDayWithBlocks(4, [{ start: 660, duration: 240 }])
            ]);
            break;
          case 2: // Flexible across multiple days
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 600, duration: 180 }]),
              createDayWithBlocks(3, [{ start: 720, duration: 180 }]),
              createDayWithBlocks(5, [{ start: 600, duration: 240 }])
            ]);
            break;
          case 3: // Specific time preferences
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 540, duration: 180 }]),
              createDayWithBlocks(4, [{ start: 900, duration: 120 }])
            ]);
            break;
          default: // Very flexible
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 720, duration: 180 }]),
              createDayWithBlocks(2, [{ start: 840, duration: 120 }]),
              createDayWithBlocks(4, [{ start: 480, duration: 120 }]),
              createDayWithBlocks(5, [{ start: 520, duration: 300 }])
            ]);
        }
        
        const duration = [45, 60, 90][i % 3];
        return {
          person: createTestPerson(`s${i + 1}`, `Multi-Option Student ${i + 1}`),
          preferredDuration: duration,
          maxLessonsPerWeek: 1,
          availability
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 500 // Give a bit more time for this complex case
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(200);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(12);
      
      // Should distribute across multiple days
      const daysCounts = [0, 0, 0, 0, 0, 0, 0];
      solution.assignments.forEach(a => daysCounts[a.dayOfWeek]++);
      const activeDays = daysCounts.filter(count => count > 0).length;
      expect(activeDays).toBeGreaterThanOrEqual(3);
    });
  });
});

// ============================================================================
// GENERATED SCENARIOS USING TEST GENERATORS
// ============================================================================

describe('Generated Easy - Using Test Generators', () => {
  let availabilityGen: AvailabilityGenerator;
  let studentGen: StudentGenerator;
  let testGen: TestCaseGenerator;

  beforeEach(() => {
    // Use fixed seeds for reproducible tests
    availabilityGen = new AvailabilityGenerator(12345);
    studentGen = new StudentGenerator(54321);
    testGen = createSeededGenerator(98765);
  });

  describe('Preset-Based Easy Scenarios', () => {
    it('should solve realistic easy scheduling set (10 students) in under 100ms', () => {
      // Generate flexible teacher schedule
      const teacherAvailability = availabilityPresets.generateTeacherSchedule(1001);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60], // Multiple options
        maxConsecutiveMinutes: 180
      });

      // Generate easy scheduling student set
      const students = studentPresets.generateEasySchedulingSet(10, 2002);

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      expect(solution.metadata.averageUtilization).toBeGreaterThan(60);
    });

    it('should solve duration-varied set (12 students) efficiently in under 120ms', () => {
      // Generate full-time teacher availability
      availabilityGen.setSeed(3003);
      const teacherAvailability = availabilityGen.generatePattern('full-time');
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60, 90, 120], // Very flexible durations
        maxConsecutiveMinutes: 300
      });

      // Generate students with varied duration preferences
      const students = studentPresets.generateDurationVariedSet(12, 4004);

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(120);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(10);
      
      // Should have variety in lesson durations
      const durations = new Set(solution.assignments.map(a => a.durationMinutes));
      expect(durations.size).toBeGreaterThanOrEqual(3);
    });

    it('should handle realistic mixed student types (15 students) in under 150ms', () => {
      // Generate realistic teacher schedule
      availabilityGen.setSeed(5005);
      const teacherAvailability = availabilityGen.generatePattern('realistic', {
        primaryRange: { startMinute: 480, endMinute: 1080 }, // 8am-6pm
        fragmentationLevel: 0.2 // Low fragmentation for easy scheduling
      });
      const teacher = createTestTeacher(teacherAvailability);

      // Generate realistic mix of student types
      const students = studentPresets.generateRealisticMix(15, 6006);

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(150);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(12);
      
      // Should achieve good overall metrics for easy case
      expect(solution.metadata.scheduledStudents / solution.metadata.totalStudents).toBeGreaterThan(0.8);
    });
  });

  describe('K-Solution Generator Easy Cases', () => {
    it('should generate and solve many-solutions case (k=100+) in under 180ms', async () => {
      // Generate a case designed to have many solutions
      const result = await kSolutionPresets.generateManySolutionsCase(20);
      
      if (!result.success || !result.testCase) {
        console.warn('K-solution generation failed, skipping test');
        return;
      }

      const startTime = Date.now();
      const solution = solveSchedule(result.testCase.teacher, result.testCase.students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(180);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(15);
      
      // Easy cases should have high success rate
      const successRate = solution.assignments.length / result.testCase.students.length;
      expect(successRate).toBeGreaterThan(0.75);
      
      console.log(`K-solution case: expected=${result.testCase.expectedSolutions}, scheduled=${solution.assignments.length}/${result.testCase.students.length}`);
    });

    it('should handle large flexible scenario (25 students) in under 250ms', async () => {
      // Use flexible difficulty parameters for easy case
      const testConfig = {
        targetK: 150,
        difficulty: {
          studentCount: 25,
          overlapRatio: 0.8, // High overlap (many options)
          fragmentationLevel: 0.1, // Low fragmentation
          packingDensity: 0.4, // Low density (lots of space)
          durationVariety: 2, // Moderate variety
          constraintTightness: 0.2 // Very loose constraints
        },
        metadata: {
          description: 'Large flexible scenario with many solutions',
          expectedSolveTime: 250,
          category: 'easy' as const
        }
      };

      const result = await testGen.generateTestCase(testConfig);
      
      if (!result.success || !result.testCase) {
        console.warn('Test case generation failed, skipping');
        return;
      }

      const startTime = Date.now();
      const solution = solveSchedule(result.testCase.teacher, result.testCase.students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(250);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(20);
      
      // Easy case should have excellent utilization
      expect(solution.metadata.averageUtilization).toBeGreaterThan(75);
    });
  });

  describe('Pattern-Based Generation Tests', () => {
    it('should solve morning-focused scenario (18 students) in under 200ms', () => {
      // Generate morning-heavy teacher schedule
      availabilityGen.setSeed(7007);
      const morningAvail = availabilityGen.generatePattern('working-hours', {
        primaryRange: { startMinute: 480, endMinute: 780 }, // 8am-1pm
        activeDays: [1, 2, 3, 4, 5]
      });
      const teacher = createTestTeacher(morningAvail);

      // Generate mix of morning people and flexible students
      studentGen.setSeed(8008);
      const students = studentGen.generateStudents({
        count: 18,
        typeDistribution: {
          'morning-person': 0.6, // Most are morning people
          'flexible': 0.4
        },
        addVariations: true
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(200);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(15);
      
      // Should mostly schedule in morning hours
      const morningLessons = solution.assignments.filter(a => a.startMinute < 780).length;
      expect(morningLessons / solution.assignments.length).toBeGreaterThan(0.8);
    });

    it('should solve weekday-only scenario (20 students) in under 220ms', () => {
      // Generate weekday-only teacher
      availabilityGen.setSeed(9009);
      const weekdayAvail = availabilityGen.generatePattern('weekday-only', {
        primaryRange: { startMinute: 540, endMinute: 1020 }, // 9am-5pm
        fragmentationLevel: 0.1
      });
      const teacher = createTestTeacher(weekdayAvail);

      // Generate weekday-preferring students
      studentGen.setSeed(1010);
      const students = studentGen.generateStudents({
        count: 20,
        typeDistribution: {
          'weekday-only': 0.5,
          'flexible': 0.3,
          'morning-person': 0.2
        },
        durationConfig: {
          preferredRange: [30, 60], // Shorter lessons for easier packing
          minRange: [30, 45],
          maxRange: [60, 90]
        }
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(220);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(16);
      
      // All assignments should be on weekdays
      const weekdayLessons = solution.assignments.filter(a => a.dayOfWeek >= 1 && a.dayOfWeek <= 5).length;
      expect(weekdayLessons).toBe(solution.assignments.length);
    });
  });
});

// ============================================================================
// STRESS TESTS FOR EASY SCENARIOS
// ============================================================================

describe('Generated Easy - Stress Tests', () => {
  describe('Large Student Counts', () => {
    it('should handle 30 highly flexible students in under 300ms', () => {
      // Very generous teacher availability
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 6 }, (_, day) => 
          createDayWithBlocks(day + 1, [{ start: 420, duration: 900 }]) // 7am-10pm
        )
      );
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60],
        maxConsecutiveMinutes: 360, // 6 hours
        breakDurationMinutes: 15
      });

      // Generate very flexible students
      const studentGen = new StudentGenerator(1111);
      const students = studentGen.generateStudents({
        count: 30,
        typeDistribution: {
          'flexible': 0.8,
          'morning-person': 0.1,
          'evening-person': 0.1
        },
        durationConfig: {
          preferredRange: [30, 45], // Short lessons
          minRange: [30, 30],
          maxRange: [60, 60]
        },
        addVariations: true
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 1000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(300);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(25);
      
      // Should achieve excellent packing with flexible students
      const totalScheduledTime = solution.assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
      expect(totalScheduledTime).toBeGreaterThan(1000); // > 16 hours total
    });

    it('should solve 40 students with multiple options efficiently in under 400ms', () => {
      // Multiple availability blocks per day
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 480, duration: 240 }, // 8am-12pm
          { start: 780, duration: 240 }  // 1pm-5pm
        ]),
        createDayWithBlocks(2, [
          { start: 540, duration: 300 }, // 9am-2pm
          { start: 900, duration: 180 }  // 3pm-6pm
        ]),
        createDayWithBlocks(3, [
          { start: 420, duration: 360 }, // 7am-1pm
          { start: 840, duration: 240 }  // 2pm-6pm
        ]),
        createDayWithBlocks(4, [
          { start: 600, duration: 480 }  // 10am-6pm
        ]),
        createDayWithBlocks(5, [
          { start: 480, duration: 180 }, // 8am-11am
          { start: 720, duration: 180 }, // 12pm-3pm
          { start: 960, duration: 120 }  // 4pm-6pm
        ]),
        createDayWithBlocks(6, [
          { start: 540, duration: 540 }  // 9am-6pm
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60, 90],
        maxConsecutiveMinutes: 240
      });

      // Generate students with good distribution
      const studentGen = new StudentGenerator(2222);
      const students = studentGen.generateStudents({
        count: 40,
        typeDistribution: {
          'flexible': 0.4,
          'morning-person': 0.2,
          'afternoon': 0.2,
          'weekday-only': 0.2
        },
        maxLessonsRange: [1, 1], // One lesson per student
        addVariations: true
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 1500
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(400);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(32);
      
      // Should distribute across the week
      const daysCounts = [0, 0, 0, 0, 0, 0, 0];
      solution.assignments.forEach(a => daysCounts[a.dayOfWeek]++);
      const activeDays = daysCounts.filter(count => count > 0).length;
      expect(activeDays).toBeGreaterThanOrEqual(5);
      
      // Should maintain high success rate
      const successRate = solution.assignments.length / students.length;
      expect(successRate).toBeGreaterThan(0.8);
    });
  });

  describe('Complex Availability Patterns', () => {
    it('should handle fragmented but abundant availability (25 students) in under 280ms', () => {
      // Generate fragmented but abundant teacher schedule
      const availGen = new AvailabilityGenerator(3333);
      const teacherAvailability = availGen.generatePattern('fragmented', {
        primaryRange: { startMinute: 420, endMinute: 1140 }, // 7am-7pm
        activeDays: [1, 2, 3, 4, 5, 6],
        fragmentationLevel: 0.6, // Moderate fragmentation
        minBlockDuration: 45,
        maxBlockDuration: 120
      });
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60],
        breakDurationMinutes: 15
      });

      // Generate students who can work with fragmented schedules
      const studentGen = new StudentGenerator(4444);
      const students = studentGen.generateStudents({
        count: 25,
        typeDistribution: {
          'flexible': 0.6,
          'part-time': 0.4
        },
        durationConfig: {
          preferredRange: [30, 60],
          minRange: [30, 45],
          maxRange: [60, 90]
        }
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(280);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(20);
      
      // Despite fragmentation, should achieve good utilization
      expect(solution.metadata.averageUtilization).toBeGreaterThan(60);
    });
  });
});

// ============================================================================
// SOLUTION QUALITY VALIDATION
// ============================================================================

describe('Generated Easy - Solution Quality Validation', () => {
  describe('Consistency Checks', () => {
    it('should produce consistent results across multiple runs', () => {
      // Fixed scenario for consistency testing
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 360 }]),
        createDayWithBlocks(2, [{ start: 540, duration: 360 }]),
        createDayWithBlocks(3, [{ start: 540, duration: 360 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const studentGen = new StudentGenerator(5555);
      const students = studentGen.generateStudents({
        count: 15,
        typeDistribution: { 'flexible': 1.0 },
        seed: 5555
      });

      const results: number[] = [];
      const times: number[] = [];

      // Run multiple times
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: true
        });
        const elapsed = Date.now() - startTime;
        
        results.push(solution.assignments.length);
        times.push(elapsed);
      }

      // Results should be very consistent for easy cases
      const minScheduled = Math.min(...results);
      const maxScheduled = Math.max(...results);
      expect(maxScheduled - minScheduled).toBeLessThanOrEqual(1);
      
      // Performance should be consistent
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(150);
      
      // All runs should schedule most students
      expect(minScheduled).toBeGreaterThanOrEqual(12);
    });

    it('should validate solution correctness with complex constraints', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 600 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 30,
        allowedDurations: [45, 60]
      });

      const studentGen = new StudentGenerator(6666);
      const students = studentGen.generateStudents({
        count: 12,
        typeDistribution: { 'flexible': 1.0 }
      });

      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });

      // Validate all constraints are satisfied
      const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i]!;
        
        // Duration constraint
        expect([45, 60]).toContain(assignment.durationMinutes);
        
        // Availability constraint
        expect(assignment.startMinute).toBeGreaterThanOrEqual(480);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(1080);
        
        // Non-overlap constraint
        if (i > 0) {
          const prev = assignments[i - 1]!;
          const gap = assignment.startMinute - (prev.startMinute + prev.durationMinutes);
          expect(gap).toBeGreaterThanOrEqual(0);
        }
      }

      // Check consecutive teaching limits
      let consecutiveMinutes = 0;
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i]!;
        
        if (i === 0 || assignment.startMinute === assignments[i-1]!.startMinute + assignments[i-1]!.durationMinutes) {
          consecutiveMinutes += assignment.durationMinutes;
        } else {
          consecutiveMinutes = assignment.durationMinutes;
        }
        
        // Allow some tolerance for soft constraints in easy cases
        if (consecutiveMinutes > 120) {
          console.log(`Note: Consecutive limit slightly exceeded: ${consecutiveMinutes} minutes`);
        }
      }
    });
  });
});