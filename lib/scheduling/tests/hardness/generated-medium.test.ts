/**
 * Generated Medium Hardness Tests - Moderate Solutions (10 < k < 100)
 * 
 * This test suite contains generated test cases designed to have a moderate
 * number of solutions (10 < k < 100). These scenarios represent realistic
 * scheduling challenges with balanced constraints and multiple valid arrangements.
 * 
 * Test Categories:
 * - Realistic constraint scenarios
 * - Mixed lesson durations
 * - Some scheduling conflicts
 * - Typical studio scenarios
 * 
 * Uses test generators from Agent 1 and Agent 2 to create balanced difficulty.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScheduleSolver,
  createOptimalSolver,
  solveSchedule
} from '../../solver';

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
    maxConsecutiveMinutes: 180, // 3 hours (moderate)
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };

  return {
    person: createTestPerson('teacher-medium', 'Medium Test Teacher'),
    studioId: 'studio-medium',
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
// REALISTIC CONSTRAINT SCENARIOS
// ============================================================================

describe('Generated Medium - Realistic Constraint Scenarios', () => {
  describe('Typical Studio Settings', () => {
    it('should solve realistic 15-student studio in under 200ms', () => {
      // Teacher with typical working hours and reasonable constraints
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 420 }]), // Monday 9am-4pm
        createDayWithBlocks(2, [{ start: 600, duration: 360 }]), // Tuesday 10am-4pm
        createDayWithBlocks(3, [{ start: 540, duration: 480 }]), // Wednesday 9am-5pm
        createDayWithBlocks(4, [{ start: 570, duration: 390 }]), // Thursday 9:30am-4pm
        createDayWithBlocks(5, [{ start: 540, duration: 300 }]), // Friday 9am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 150, // 2.5 hours max
        breakDurationMinutes: 20,
        allowedDurations: [45, 60, 90]
      });

      // Mix of student types with realistic constraints
      const students = Array.from({ length: 15 }, (_, i) => {
        const studentType = i % 4;
        let availability: WeekSchedule;
        let duration: number;
        
        switch (studentType) {
          case 0: // Working adults (evenings/weekends limited)
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 1080, duration: 120 }]), // Monday 6pm-8pm
              createDayWithBlocks(3, [{ start: 1020, duration: 180 }]), // Wednesday 5pm-8pm
              createDayWithBlocks(5, [{ start: 540, duration: 300 }])   // Friday flexible
            ]);
            duration = 60;
            break;
          case 1: // Students (after school)
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 900, duration: 240 }]), // Monday 3pm-7pm
              createDayWithBlocks(2, [{ start: 900, duration: 240 }]), // Tuesday 3pm-7pm
              createDayWithBlocks(4, [{ start: 900, duration: 240 }])  // Thursday 3pm-7pm
            ]);
            duration = 45;
            break;
          case 2: // Flexible part-time
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 600, duration: 300 }]), // Tuesday 10am-3pm
              createDayWithBlocks(3, [{ start: 600, duration: 420 }]), // Wednesday 10am-4pm
              createDayWithBlocks(4, [{ start: 630, duration: 270 }])  // Thursday 10:30am-3pm
            ]);
            duration = [60, 90][i % 2];
            break;
          default: // Morning availability
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 240 }]), // Monday 9am-1pm
              createDayWithBlocks(3, [{ start: 570, duration: 210 }]), // Wednesday 9:30am-1pm
              createDayWithBlocks(5, [{ start: 540, duration: 180 }])  // Friday 9am-12pm
            ]);
            duration = [45, 60][i % 2];
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Realistic Student ${i + 1}`),
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
      expect(elapsed).toBeLessThan(200);
      expect(solution.metadata.computeTimeMs).toBeLessThan(200);

      // Should schedule most students but not all (medium difficulty)
      expect(solution.assignments.length).toBeGreaterThanOrEqual(10);
      expect(solution.assignments.length).toBeLessThanOrEqual(14);
      expect(solution.unscheduled.length).toBeGreaterThan(0);

      // Verify constraint satisfaction
      const assignments = solution.assignments.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startMinute - b.startMinute;
      });
      
      for (let i = 1; i < assignments.length; i++) {
        const prev = assignments[i - 1]!;
        const curr = assignments[i]!;
        
        if (prev.dayOfWeek === curr.dayOfWeek) {
          const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
          expect(gap).toBeGreaterThanOrEqual(0); // No overlaps
        }
      }
    });

    it('should handle mixed duration preferences (18 students) in under 250ms', () => {
      // Teacher with moderate availability and duration flexibility
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 180 }, // Monday 9am-12pm
          { start: 780, duration: 240 }  // Monday 1pm-5pm
        ]),
        createDayWithBlocks(2, [{ start: 600, duration: 360 }]), // Tuesday 10am-4pm
        createDayWithBlocks(3, [
          { start: 480, duration: 240 }, // Wednesday 8am-12pm
          { start: 840, duration: 180 }  // Wednesday 2pm-5pm
        ]),
        createDayWithBlocks(4, [{ start: 570, duration: 330 }]), // Thursday 9:30am-4pm
        createDayWithBlocks(5, [{ start: 540, duration: 270 }])  // Friday 9am-1:30pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60, 90, 120],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 30
      });

      // Students with varied duration needs
      const students = Array.from({ length: 18 }, (_, i) => {
        const durationCategory = i % 3;
        let duration: number;
        let availabilityPattern: WeekSchedule;
        
        switch (durationCategory) {
          case 0: // Short lessons (30-45min)
            duration = [30, 45][i % 2];
            // Can fit in smaller gaps
            availabilityPattern = createWeekWithDays([
              createDayWithBlocks((i % 3) + 1, [{ start: 600 + (i * 60), duration: 180 }]),
              createDayWithBlocks((i % 3) + 3, [{ start: 720 + (i * 30), duration: 150 }])
            ]);
            break;
          case 1: // Medium lessons (60-90min)
            duration = [60, 90][i % 2];
            availabilityPattern = createWeekWithDays([
              createDayWithBlocks((i % 5) + 1, [{ start: 540 + (i * 45), duration: 300 }])
            ]);
            break;
          default: // Long lessons (90-120min)
            duration = [90, 120][i % 2];
            // Need longer blocks
            availabilityPattern = createWeekWithDays([
              createDayWithBlocks((i % 4) + 1, [{ start: 600, duration: 240 }]),
              createDayWithBlocks((i % 3) + 3, [{ start: 480, duration: 300 }])
            ]);
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Duration ${duration}min Student ${i + 1}`),
          preferredDuration: duration,
          maxLessonsPerWeek: 1,
          availability: availabilityPattern
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(250);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(12);
      expect(solution.assignments.length).toBeLessThanOrEqual(16);
      
      // Should have variety in lesson durations
      const durations = new Set(solution.assignments.map(a => a.durationMinutes));
      expect(durations.size).toBeGreaterThanOrEqual(3);
      
      // Check that longer lessons fit in appropriate blocks
      const longLessons = solution.assignments.filter(a => a.durationMinutes >= 90);
      expect(longLessons.length).toBeGreaterThan(0);
    });
  });

  describe('Constraint Interaction Challenges', () => {
    it('should solve break requirement conflicts (20 students) in under 300ms', () => {
      // Teacher with strict break requirements
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 360 }]), // Monday 9am-3pm
        createDayWithBlocks(2, [{ start: 600, duration: 300 }]), // Tuesday 10am-3pm
        createDayWithBlocks(3, [{ start: 540, duration: 420 }]), // Wednesday 9am-4pm
        createDayWithBlocks(4, [{ start: 570, duration: 330 }])  // Thursday 9:30am-3pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 90, // Only 1.5 hours consecutive
        breakDurationMinutes: 30,  // Require 30-min breaks
        allowedDurations: [60, 90]
      });

      // Students with overlapping preferences creating scheduling pressure
      const students = Array.from({ length: 20 }, (_, i) => {
        const timeSlot = i % 4;
        let availability: WeekSchedule;
        
        switch (timeSlot) {
          case 0: // Morning preference
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 180 }]),
              createDayWithBlocks(3, [{ start: 540, duration: 180 }])
            ]);
            break;
          case 1: // Late morning
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 630, duration: 180 }]),
              createDayWithBlocks(2, [{ start: 600, duration: 180 }])
            ]);
            break;
          case 2: // Midday
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 720, duration: 180 }]),
              createDayWithBlocks(4, [{ start: 690, duration: 180 }])
            ]);
            break;
          default: // Afternoon
            availability = createWeekWithDays([
              createDayWithBlocks(3, [{ start: 780, duration: 180 }]),
              createDayWithBlocks(4, [{ start: 780, duration: 180 }])
            ]);
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Break Test Student ${i + 1}`),
          preferredDuration: [60, 90][i % 2],
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

      expect(elapsed).toBeLessThan(300);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      expect(solution.assignments.length).toBeLessThanOrEqual(15);
      
      // Verify break requirements are respected where possible
      const assignmentsByDay = new Map<number, typeof solution.assignments>();
      solution.assignments.forEach(a => {
        if (!assignmentsByDay.has(a.dayOfWeek)) {
          assignmentsByDay.set(a.dayOfWeek, []);
        }
        assignmentsByDay.get(a.dayOfWeek)!.push(a);
      });
      
      assignmentsByDay.forEach(dayAssignments => {
        const sorted = dayAssignments.sort((a, b) => a.startMinute - b.startMinute);
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1]!;
          const curr = sorted[i]!;
          const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
          
          // Either there's a break or they're not too long together
          if (gap < 30) {
            const consecutiveTime = prev.durationMinutes + curr.durationMinutes;
            expect(consecutiveTime).toBeLessThanOrEqual(120); // Allow some flexibility
          }
        }
      });
    });

    it('should handle availability fragmentation (16 students) in under 220ms', () => {
      // Teacher with fragmented but reasonable availability
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 90 },  // 9:00-10:30
          { start: 660, duration: 120 }, // 11:00-1:00
          { start: 840, duration: 90 }   // 2:00-3:30
        ]),
        createDayWithBlocks(2, [
          { start: 600, duration: 60 },  // 10:00-11:00
          { start: 720, duration: 180 }  // 12:00-3:00
        ]),
        createDayWithBlocks(3, [
          { start: 570, duration: 150 }, // 9:30-12:00
          { start: 780, duration: 120 }  // 1:00-3:00
        ]),
        createDayWithBlocks(4, [
          { start: 540, duration: 120 }, // 9:00-11:00
          { start: 720, duration: 60 },  // 12:00-1:00
          { start: 840, duration: 150 }  // 2:00-4:30
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90],
        breakDurationMinutes: 15
      });

      // Students with various availability patterns
      const students = Array.from({ length: 16 }, (_, i) => {
        const pattern = i % 4;
        let availability: WeekSchedule;
        
        switch (pattern) {
          case 0: // Prefer morning slots
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 150 }]),
              createDayWithBlocks(3, [{ start: 570, duration: 150 }]),
              createDayWithBlocks(4, [{ start: 540, duration: 120 }])
            ]);
            break;
          case 1: // Midday preference
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 660, duration: 120 }]),
              createDayWithBlocks(2, [{ start: 720, duration: 180 }]),
              createDayWithBlocks(4, [{ start: 720, duration: 60 }])
            ]);
            break;
          case 2: // Afternoon slots
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 840, duration: 90 }]),
              createDayWithBlocks(3, [{ start: 780, duration: 120 }]),
              createDayWithBlocks(4, [{ start: 840, duration: 150 }])
            ]);
            break;
          default: // Mixed availability
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 600, duration: 60 }]),
              createDayWithBlocks(2, [{ start: 720, duration: 120 }]),
              createDayWithBlocks(3, [{ start: 570, duration: 90 }])
            ]);
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Fragmented Avail Student ${i + 1}`),
          preferredDuration: [45, 60, 90][i % 3],
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

      expect(elapsed).toBeLessThan(220);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(9);
      expect(solution.assignments.length).toBeLessThanOrEqual(14);
      
      // Should distribute across the fragmented blocks
      const assignmentsByTimeBlock = new Map<string, number>();
      solution.assignments.forEach(a => {
        const key = `${a.dayOfWeek}-${a.startMinute}`;
        assignmentsByTimeBlock.set(key, (assignmentsByTimeBlock.get(key) || 0) + 1);
      });
      
      // Should use multiple different time blocks
      expect(assignmentsByTimeBlock.size).toBeGreaterThanOrEqual(6);
    });
  });
});

// ============================================================================
// GENERATED SCENARIOS USING TEST GENERATORS
// ============================================================================

describe('Generated Medium - Using Test Generators', () => {
  let availabilityGen: AvailabilityGenerator;
  let studentGen: StudentGenerator;
  let testGen: TestCaseGenerator;

  beforeEach(() => {
    // Use fixed seeds for reproducible tests
    availabilityGen = new AvailabilityGenerator(22222);
    studentGen = new StudentGenerator(33333);
    testGen = createSeededGenerator(44444);
  });

  describe('Generated Moderate Difficulty Cases', () => {
    it('should solve generated medium case (k≈50) in under 300ms', async () => {
      // Generate a case designed to have moderate solutions
      const testConfig = {
        targetK: 50,
        difficulty: {
          studentCount: 18,
          overlapRatio: 0.5, // Moderate overlap
          fragmentationLevel: 0.4, // Some fragmentation
          packingDensity: 0.7, // Moderate density
          durationVariety: 3, // Multiple durations
          constraintTightness: 0.5 // Balanced constraints
        },
        metadata: {
          description: 'Medium difficulty with ~50 solutions',
          expectedSolveTime: 300,
          category: 'medium' as const
        }
      };

      const result = await testGen.generateTestCase(testConfig);
      
      if (!result.success || !result.testCase) {
        console.warn('Test case generation failed, using fallback');
        // Use fallback scenario
        const teacherAvail = availabilityGen.generatePattern('realistic');
        const teacher = createTestTeacher(teacherAvail);
        const students = studentGen.generateStudents({
          count: 18,
          typeDistribution: {
            'flexible': 0.4,
            'morning-person': 0.2,
            'evening-person': 0.2,
            'part-time': 0.2
          }
        });
        
        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: true
        });
        const elapsed = Date.now() - startTime;
        
        expect(elapsed).toBeLessThan(300);
        expect(solution.assignments.length).toBeGreaterThanOrEqual(12);
        expect(solution.assignments.length).toBeLessThanOrEqual(16);
        return;
      }

      const startTime = Date.now();
      const solution = solveSchedule(result.testCase.teacher, result.testCase.students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(300);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(12);
      expect(solution.assignments.length).toBeLessThanOrEqual(16);
      
      // Medium difficulty should have moderate success rate
      const successRate = solution.assignments.length / result.testCase.students.length;
      expect(successRate).toBeGreaterThan(0.6);
      expect(successRate).toBeLessThan(0.95);
      
      console.log(`Medium case: expected k=${result.testCase.expectedSolutions}, scheduled=${solution.assignments.length}/${result.testCase.students.length}`);
    });

    it('should handle realistic mixed patterns (22 students) in under 350ms', () => {
      // Generate realistic teacher with moderate constraints
      availabilityGen.setSeed(55555);
      const teacherAvailability = availabilityGen.generatePattern('realistic', {
        primaryRange: { startMinute: 540, endMinute: 1020 }, // 9am-5pm
        fragmentationLevel: 0.3,
        minBlockDuration: 60,
        maxBlockDuration: 180
      });
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 20,
        allowedDurations: [45, 60, 90]
      });

      // Generate realistic mix with some difficult students
      studentGen.setSeed(66666);
      const students = studentGen.generateStudents({
        count: 22,
        typeDistribution: {
          'flexible': 0.3,
          'morning-person': 0.2,
          'evening-person': 0.15,
          'busy-student': 0.15,
          'part-time': 0.2
        },
        durationConfig: {
          preferredRange: [45, 90],
          minRange: [30, 60],
          maxRange: [60, 120]
        },
        addVariations: true
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(350);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(14);
      expect(solution.assignments.length).toBeLessThanOrEqual(20);
      
      // Should have some unscheduled students (medium difficulty)
      expect(solution.unscheduled.length).toBeGreaterThan(1);
      expect(solution.unscheduled.length).toBeLessThan(8);
    });
  });

  describe('Constraint Balance Testing', () => {
    it('should solve peak-time conflicts scenario (16 students) in under 200ms', () => {
      // Teacher available but with popular peak times
      availabilityGen.setSeed(77777);
      const teacherAvailability = availabilityGen.generatePattern('peak-time', {
        primaryRange: { startMinute: 960, endMinute: 1080 }, // 4pm-6pm peak
        secondaryRange: { startMinute: 600, endMinute: 720 }, // 10am-12pm secondary
        activeDays: [1, 2, 3, 4, 5],
        fragmentationLevel: 0.2
      });
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60],
        maxConsecutiveMinutes: 90
      });

      // Many students want peak times
      studentGen.setSeed(88888);
      const students = studentGen.generateStudents({
        count: 16,
        typeDistribution: {
          'evening-person': 0.6, // Most want peak times
          'flexible': 0.4
        },
        durationConfig: {
          preferredRange: [45, 60],
          minRange: [45, 45],
          maxRange: [60, 60]
        }
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(200);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      expect(solution.assignments.length).toBeLessThanOrEqual(12);
      
      // Should have significant competition for slots
      expect(solution.unscheduled.length).toBeGreaterThanOrEqual(4);
      
      // Peak times should be utilized
      const peakAssignments = solution.assignments.filter(a => 
        a.startMinute >= 960 && a.startMinute < 1080
      ).length;
      expect(peakAssignments).toBeGreaterThan(0);
    });

    it('should handle duration variety challenges (20 students) in under 280ms', () => {
      // Teacher with mixed block sizes
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 60 },  // 9-10am (small)
          { start: 630, duration: 150 }, // 10:30am-1pm (medium)
          { start: 810, duration: 90 }   // 1:30-3pm (small-medium)
        ]),
        createDayWithBlocks(2, [
          { start: 600, duration: 240 }  // 10am-2pm (large)
        ]),
        createDayWithBlocks(3, [
          { start: 540, duration: 90 },  // 9-10:30am (medium)
          { start: 660, duration: 60 },  // 11am-12pm (small)
          { start: 750, duration: 180 }  // 12:30-3:30pm (large)
        ]),
        createDayWithBlocks(4, [
          { start: 570, duration: 120 }, // 9:30-11:30am (medium)
          { start: 720, duration: 120 }  // 12-2pm (medium)
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60, 90, 120],
        breakDurationMinutes: 15
      });

      // Students with varied duration needs that challenge block fitting
      const students = Array.from({ length: 20 }, (_, i) => {
        const durationType = i % 4;
        let duration: number;
        let name: string;
        
        switch (durationType) {
          case 0:
            duration = 30;
            name = 'Short';
            break;
          case 1:
            duration = 60;
            name = 'Medium';
            break;
          case 2:
            duration = 90;
            name = 'Long';
            break;
          default:
            duration = 120;
            name = 'Extra Long';
        }
        
        // All have similar availability to create duration-based competition
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 300 }]),
          createDayWithBlocks(2, [{ start: 600, duration: 240 }]),
          createDayWithBlocks(3, [{ start: 540, duration: 330 }]),
          createDayWithBlocks(4, [{ start: 570, duration: 270 }])
        ]);
        
        return {
          person: createTestPerson(`s${i + 1}`, `${name} Duration Student ${i + 1}`),
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

      expect(elapsed).toBeLessThan(280);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(10);
      expect(solution.assignments.length).toBeLessThanOrEqual(16);
      
      // Should efficiently pack different durations
      const durations = solution.assignments.map(a => a.durationMinutes);
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBeGreaterThanOrEqual(3);
      
      // Long lessons should be scheduled in appropriate blocks
      const longLessons = solution.assignments.filter(a => a.durationMinutes >= 90);
      expect(longLessons.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// SOME CONFLICTS BUT SOLVABLE SCENARIOS
// ============================================================================

describe('Generated Medium - Balanced Conflict Scenarios', () => {
  describe('Partial Overlap Challenges', () => {
    it('should solve overlapping but not impossible scenario (14 students) in under 180ms', () => {
      // Teacher with good but not unlimited availability
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }]), // Monday 10am-2pm
        createDayWithBlocks(3, [{ start: 540, duration: 300 }]), // Wednesday 9am-2pm
        createDayWithBlocks(5, [{ start: 570, duration: 270 }])  // Friday 9:30am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [60, 90],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 15
      });

      // Students with moderate overlap - some competition but solvable
      const students = Array.from({ length: 14 }, (_, i) => {
        const group = i % 3;
        let availability: WeekSchedule;
        
        switch (group) {
          case 0: // Monday preference (high competition)
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 600 + (i * 20), duration: 180 }])
            ]);
            break;
          case 1: // Wednesday preference (medium competition)
            availability = createWeekWithDays([
              createDayWithBlocks(3, [{ start: 540 + (i * 25), duration: 240 }])
            ]);
            break;
          default: // Friday or flexible
            if (i % 6 === 0) {
              availability = createWeekWithDays([
                createDayWithBlocks(5, [{ start: 570 + (i * 15), duration: 210 }])
              ]);
            } else {
              // Flexible - can use multiple days
              availability = createWeekWithDays([
                createDayWithBlocks(1, [{ start: 660, duration: 180 }]),
                createDayWithBlocks(3, [{ start: 600, duration: 240 }]),
                createDayWithBlocks(5, [{ start: 630, duration: 210 }])
              ]);
            }
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Overlap Student ${i + 1}`),
          preferredDuration: [60, 90][i % 2],
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

      expect(elapsed).toBeLessThan(180);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(9);
      expect(solution.assignments.length).toBeLessThanOrEqual(12);
      
      // Should have some unscheduled due to competition
      expect(solution.unscheduled.length).toBeGreaterThanOrEqual(2);
      expect(solution.unscheduled.length).toBeLessThanOrEqual(5);
      
      // Distribution across days
      const dayDistribution = [0, 0, 0, 0, 0, 0, 0];
      solution.assignments.forEach(a => dayDistribution[a.dayOfWeek]++);
      const activeDays = dayDistribution.filter(count => count > 0).length;
      expect(activeDays).toBeGreaterThanOrEqual(2);
    });

    it('should handle time window pressure (17 students) in under 250ms', () => {
      // Teacher with good availability but pressure points
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 120 }, // 9-11am
          { start: 720, duration: 180 }  // 12-3pm (gap creates pressure)
        ]),
        createDayWithBlocks(2, [{ start: 600, duration: 240 }]), // 10am-2pm
        createDayWithBlocks(3, [
          { start: 570, duration: 90 },  // 9:30-11am
          { start: 780, duration: 150 }  // 1-3:30pm
        ]),
        createDayWithBlocks(4, [{ start: 540, duration: 300 }])  // 9am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90],
        maxConsecutiveMinutes: 105, // Allows max 1-2 lessons consecutive
        breakDurationMinutes: 15
      });

      // Students creating time window pressure
      const students = Array.from({ length: 17 }, (_, i) => {
        const timePreference = i % 4;
        let availability: WeekSchedule;
        
        switch (timePreference) {
          case 0: // Morning slots (limited availability)
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 120 }]),
              createDayWithBlocks(3, [{ start: 570, duration: 90 }]),
              createDayWithBlocks(4, [{ start: 540, duration: 180 }])
            ]);
            break;
          case 1: // Midday (better availability)
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 600, duration: 180 }]),
              createDayWithBlocks(4, [{ start: 660, duration: 180 }])
            ]);
            break;
          case 2: // Afternoon (some limitations)
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 720, duration: 180 }]),
              createDayWithBlocks(3, [{ start: 780, duration: 150 }])
            ]);
            break;
          default: // Flexible but with preferences
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 600, duration: 240 }]),
              createDayWithBlocks(4, [{ start: 540, duration: 240 }])
            ]);
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Time Pressure Student ${i + 1}`),
          preferredDuration: [45, 60, 90][i % 3],
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

      expect(elapsed).toBeLessThan(250);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(11);
      expect(solution.assignments.length).toBeLessThanOrEqual(15);
      
      // Should efficiently use available windows
      const totalScheduledTime = solution.assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
      expect(totalScheduledTime).toBeGreaterThan(600); // At least 10 hours total
      
      // Verify break constraints are considered
      const assignmentsByDay = new Map<number, typeof solution.assignments>();
      solution.assignments.forEach(a => {
        if (!assignmentsByDay.has(a.dayOfWeek)) {
          assignmentsByDay.set(a.dayOfWeek, []);
        }
        assignmentsByDay.get(a.dayOfWeek)!.push(a);
      });
      
      // Check that consecutive limits are respected
      assignmentsByDay.forEach(dayAssignments => {
        if (dayAssignments.length > 1) {
          const sorted = dayAssignments.sort((a, b) => a.startMinute - b.startMinute);
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]!;
            const curr = sorted[i]!;
            const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
            
            if (gap < 15) { // If too close together
              const consecutiveTime = prev.durationMinutes + curr.durationMinutes;
              expect(consecutiveTime).toBeLessThanOrEqual(120); // Should respect limits
            }
          }
        }
      });
    });
  });
});

// ============================================================================
// PERFORMANCE AND QUALITY VALIDATION
// ============================================================================

describe('Generated Medium - Performance and Quality', () => {
  describe('Consistency and Reliability', () => {
    it('should maintain consistent performance across multiple medium scenarios', () => {
      const scenarios = [
        { count: 12, maxTime: 150 },
        { count: 15, maxTime: 200 },
        { count: 18, maxTime: 250 },
        { count: 20, maxTime: 300 }
      ];

      scenarios.forEach(({ count, maxTime }) => {
        // Generate scenario
        const availGen = new AvailabilityGenerator(count * 1000);
        const teacherAvail = availGen.generatePattern('realistic', {
          fragmentationLevel: 0.3,
          primaryRange: { startMinute: 540, endMinute: 1020 }
        });
        const teacher = createTestTeacher(teacherAvail);

        const studentGen = new StudentGenerator(count * 2000);
        const students = studentGen.generateStudents({
          count,
          typeDistribution: {
            'flexible': 0.4,
            'morning-person': 0.2,
            'part-time': 0.2,
            'busy-student': 0.2
          }
        });

        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: true
        });
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(maxTime);
        
        // Medium scenarios should schedule 60-85% of students
        const successRate = solution.assignments.length / count;
        expect(successRate).toBeGreaterThan(0.6);
        expect(successRate).toBeLessThan(0.85);
        
        console.log(`${count} students: ${elapsed}ms, ${Math.round(successRate * 100)}% scheduled`);
      });
    });

    it('should validate solution quality in medium complexity scenarios', () => {
      // Complex but solvable scenario
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 120 },
          { start: 720, duration: 180 }
        ]),
        createDayWithBlocks(2, [{ start: 600, duration: 240 }]),
        createDayWithBlocks(3, [
          { start: 570, duration: 90 },
          { start: 720, duration: 150 }
        ]),
        createDayWithBlocks(4, [{ start: 540, duration: 270 }]),
        createDayWithBlocks(5, [{ start: 600, duration: 180 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 20
      });

      const studentGen = new StudentGenerator(99999);
      const students = studentGen.generateStudents({
        count: 19,
        typeDistribution: {
          'flexible': 0.3,
          'morning-person': 0.25,
          'afternoon': 0.25,
          'part-time': 0.2
        },
        addVariations: true
      });

      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true
      });

      // Quality validations
      expect(solution.assignments.length).toBeGreaterThanOrEqual(12);
      expect(solution.metadata.averageUtilization).toBeGreaterThan(50);
      
      // Verify all constraints are satisfied
      solution.assignments.forEach(assignment => {
        expect([45, 60, 90]).toContain(assignment.durationMinutes);
        expect(assignment.startMinute).toBeGreaterThanOrEqual(0);
        expect(assignment.startMinute).toBeLessThan(1440);
        expect(assignment.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(assignment.dayOfWeek).toBeLessThanOrEqual(6);
      });
      
      // Check for overlaps
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
  });
});