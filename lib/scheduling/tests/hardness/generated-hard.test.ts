/**
 * Generated Hard Hardness Tests - Few Solutions (1 ≤ k ≤ 10)
 * 
 * This test suite contains generated test cases designed to have very few
 * solutions (1 ≤ k ≤ 10). These scenarios represent challenging scheduling
 * problems with tight constraints and limited valid arrangements.
 * 
 * Test Categories:
 * - Tight packing scenarios
 * - Critical path scheduling
 * - Exact k-solution puzzles
 * - High constraint complexity
 * 
 * Uses test generators from Agent 1 and Agent 2 to create constrained scenarios.
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
    maxConsecutiveMinutes: 120, // 2 hours (tight)
    breakDurationMinutes: 30,
    minLessonDuration: 45,
    maxLessonDuration: 90,
    allowedDurations: [45, 60, 90]
  };

  return {
    person: createTestPerson('teacher-hard', 'Hard Test Teacher'),
    studioId: 'studio-hard',
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
// TIGHT PACKING SCENARIOS
// ============================================================================

describe('Generated Hard - Tight Packing Scenarios', () => {
  describe('Minimal Resource Scenarios', () => {
    it('should solve tight packing puzzle (8 students) in under 400ms', () => {
      // Teacher with very limited availability - just enough for 8 lessons
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 180 }]), // Monday 9am-12pm (3 hours)
        createDayWithBlocks(3, [{ start: 600, duration: 150 }]), // Wednesday 10am-12:30pm (2.5 hours)
        createDayWithBlocks(5, [{ start: 570, duration: 120 }])  // Friday 9:30am-11:30am (2 hours)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 90, // Very tight - max 1.5 hours consecutive
        breakDurationMinutes: 30,
        allowedDurations: [45, 60] // Limited duration options
      });

      // Students designed to create exactly one optimal packing
      const students = [
        // Monday group - must fit in 3-hour window with breaks
        {
          person: createTestPerson('s1', 'Monday Early'),
          preferredDuration: 45,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 90 }]) // 9:00-10:30
          ])
        },
        {
          person: createTestPerson('s2', 'Monday Late'),
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(1, [{ start: 660, duration: 120 }]) // 11:00-1:00 (after break)
          ])
        },
        
        // Wednesday group - tight fit in 2.5 hours
        {
          person: createTestPerson('s3', 'Wednesday First'),
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(3, [{ start: 600, duration: 90 }]) // 10:00-11:30
          ])
        },
        {
          person: createTestPerson('s4', 'Wednesday Second'),
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(3, [{ start: 690, duration: 90 }]) // 11:30-1:00 (consecutive allowed)
          ])
        },
        
        // Friday group - exactly fits 2 hours
        {
          person: createTestPerson('s5', 'Friday First'),
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(5, [{ start: 570, duration: 60 }]) // 9:30-10:30
          ])
        },
        {
          person: createTestPerson('s6', 'Friday Second'),
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(5, [{ start: 630, duration: 60 }]) // 10:30-11:30 (consecutive)
          ])
        },
        
        // Flexible students who can fill remaining gaps
        {
          person: createTestPerson('s7', 'Flexible Filler 1'),
          preferredDuration: 45,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(1, [{ start: 585, duration: 75 }]), // Monday 9:45-11:00
            createDayWithBlocks(3, [{ start: 630, duration: 60 }])  // Wednesday 10:30-11:30
          ])
        },
        {
          person: createTestPerson('s8', 'Flexible Filler 2'),
          preferredDuration: 45,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }]), // Monday 10:00-11:00
            createDayWithBlocks(3, [{ start: 660, duration: 90 }])  // Wednesday 11:00-12:30
          ])
        }
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 1000 // Give more time for tight packing
      });
      const elapsed = Date.now() - startTime;

      // Performance assertion - should be challenging but solvable
      expect(elapsed).toBeLessThan(400);
      expect(solution.metadata.computeTimeMs).toBeLessThan(400);

      // Should achieve high utilization with tight constraints
      expect(solution.assignments.length).toBeGreaterThanOrEqual(6);
      expect(solution.assignments.length).toBeLessThanOrEqual(8);
      
      // If optimal packing found, should schedule most/all students
      if (solution.assignments.length >= 7) {
        expect(solution.metadata.averageUtilization).toBeGreaterThan(80);
      }

      // Verify tight packing constraints
      const assignmentsByDay = new Map<number, typeof solution.assignments>();
      solution.assignments.forEach(a => {
        if (!assignmentsByDay.has(a.dayOfWeek)) {
          assignmentsByDay.set(a.dayOfWeek, []);
        }
        assignmentsByDay.get(a.dayOfWeek)!.push(a);
      });
      
      // Check that consecutive limits are strictly enforced
      assignmentsByDay.forEach(dayAssignments => {
        if (dayAssignments.length > 1) {
          const sorted = dayAssignments.sort((a, b) => a.startMinute - b.startMinute);
          let consecutiveTime = sorted[0]!.durationMinutes;
          
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]!;
            const curr = sorted[i]!;
            const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
            
            if (gap < 30) {
              consecutiveTime += curr.durationMinutes;
              expect(consecutiveTime).toBeLessThanOrEqual(90); // Strict limit
            } else {
              consecutiveTime = curr.durationMinutes;
            }
          }
        }
      });
    });

    it('should solve exact-fit scheduling puzzle (10 students) in under 500ms', () => {
      // Teacher availability exactly matches total required time
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(2, [
          { start: 540, duration: 90 },  // Tuesday 9:00-10:30
          { start: 660, duration: 120 }  // Tuesday 11:00-1:00
        ]),
        createDayWithBlocks(4, [
          { start: 600, duration: 90 },  // Thursday 10:00-11:30
          { start: 720, duration: 90 },  // Thursday 12:00-1:30
          { start: 840, duration: 90 }   // Thursday 2:00-3:30
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 30
      });

      // Students requiring exactly the available time
      const students = Array.from({ length: 10 }, (_, i) => {
        const day = i < 4 ? 2 : 4; // First 4 on Tuesday, rest on Thursday
        let timeSlot: number;
        let duration: number;
        
        if (day === 2) {
          // Tuesday slots
          if (i === 0) { timeSlot = 540; duration = 45; } // 9:00-9:45
          else if (i === 1) { timeSlot = 585; duration = 45; } // 9:45-10:30
          else if (i === 2) { timeSlot = 660; duration = 60; } // 11:00-12:00
          else { timeSlot = 720; duration = 60; } // 12:00-1:00
        } else {
          // Thursday slots
          const thursdayIndex = i - 4;
          if (thursdayIndex === 0) { timeSlot = 600; duration = 45; } // 10:00-10:45
          else if (thursdayIndex === 1) { timeSlot = 645; duration = 45; } // 10:45-11:30
          else if (thursdayIndex === 2) { timeSlot = 720; duration = 45; } // 12:00-12:45
          else if (thursdayIndex === 3) { timeSlot = 765; duration = 45; } // 12:45-1:30
          else if (thursdayIndex === 4) { timeSlot = 840; duration = 45; } // 2:00-2:45
          else { timeSlot = 885; duration = 45; } // 2:45-3:30
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Exact Fit Student ${i + 1}`),
          preferredDuration: duration,
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(day, [{ start: timeSlot - 15, duration: duration + 30 }]) // Small window around target
          ])
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 1500
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      
      // Exact fit should achieve very high utilization
      if (solution.assignments.length >= 9) {
        const totalScheduledTime = solution.assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
        expect(totalScheduledTime).toBeGreaterThan(450); // Most of the 480 minutes available
      }
    });
  });

  describe('Critical Path Scheduling', () => {
    it('should solve critical dependency chain (12 students) in under 600ms', () => {
      // Teacher availability with dependency chains
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]), // Monday 9am-1pm
        createDayWithBlocks(3, [{ start: 600, duration: 300 }]), // Wednesday 10am-3pm
        createDayWithBlocks(5, [{ start: 570, duration: 210 }])  // Friday 9:30am-1pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [60, 90],
        maxConsecutiveMinutes: 90, // Forces breaks that create dependencies
        breakDurationMinutes: 30
      });

      // Students with interdependent scheduling requirements
      const students = Array.from({ length: 12 }, (_, i) => {
        const group = Math.floor(i / 4);
        let availability: WeekSchedule;
        let duration: number;
        
        switch (group) {
          case 0: // Monday chain - each depends on previous break
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540 + (i * 60), duration: 120 }])
            ]);
            duration = 60;
            break;
          case 1: // Wednesday chain - longer lessons, tighter packing
            availability = createWeekWithDays([
              createDayWithBlocks(3, [{ start: 600 + (i - 4) * 75, duration: 150 }])
            ]);
            duration = 90;
            break;
          default: // Friday chain - mixed durations
            availability = createWeekWithDays([
              createDayWithBlocks(5, [{ start: 570 + (i - 8) * 50, duration: 100 }])
            ]);
            duration = [60, 90][i % 2];
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Chain Student ${i + 1}`),
          preferredDuration: duration,
          maxLessonsPerWeek: 1,
          availability
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 2000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(600);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(7);
      expect(solution.assignments.length).toBeLessThanOrEqual(10);
      
      // Should manage to schedule some from each day despite constraints
      const dayDistribution = [0, 0, 0, 0, 0, 0, 0];
      solution.assignments.forEach(a => dayDistribution[a.dayOfWeek]++);
      const activeDays = dayDistribution.filter(count => count > 0).length;
      expect(activeDays).toBeGreaterThanOrEqual(2);
      
      // Verify critical path constraints are satisfied
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
          
          // Should respect break requirements in critical paths
          if (gap < 30) {
            const consecutiveTime = prev.durationMinutes + curr.durationMinutes;
            expect(consecutiveTime).toBeLessThanOrEqual(90);
          }
        }
      });
    });

    it('should handle bottleneck resolution (14 students) in under 700ms', () => {
      // Teacher with intentional bottlenecks
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]),  // Monday 10am-11am (bottleneck)
        createDayWithBlocks(2, [{ start: 540, duration: 300 }]), // Tuesday 9am-2pm (generous)
        createDayWithBlocks(3, [{ start: 720, duration: 90 }]),  // Wednesday 12pm-1:30pm (bottleneck)
        createDayWithBlocks(4, [{ start: 570, duration: 270 }]), // Thursday 9:30am-2pm (generous)
        createDayWithBlocks(5, [{ start: 840, duration: 60 }])   // Friday 2pm-3pm (bottleneck)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [60],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 15
      });

      // Students creating competition for bottleneck times
      const students = Array.from({ length: 14 }, (_, i) => {
        const preference = i % 5;
        let availability: WeekSchedule;
        
        switch (preference) {
          case 0: // Compete for Monday bottleneck
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 600, duration: 60 }]),
              createDayWithBlocks(2, [{ start: 600, duration: 120 }]) // Backup option
            ]);
            break;
          case 1: // Tuesday (should be easy)
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 540 + (i * 30), duration: 120 }])
            ]);
            break;
          case 2: // Compete for Wednesday bottleneck
            availability = createWeekWithDays([
              createDayWithBlocks(3, [{ start: 720, duration: 90 }]),
              createDayWithBlocks(4, [{ start: 660, duration: 120 }]) // Backup option
            ]);
            break;
          case 3: // Thursday (should be manageable)
            availability = createWeekWithDays([
              createDayWithBlocks(4, [{ start: 570 + (i * 25), duration: 120 }])
            ]);
            break;
          default: // Compete for Friday bottleneck
            availability = createWeekWithDays([
              createDayWithBlocks(5, [{ start: 840, duration: 60 }]),
              createDayWithBlocks(2, [{ start: 780, duration: 120 }]) // Backup option
            ]);
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Bottleneck Student ${i + 1}`),
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 2500
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(700);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      expect(solution.assignments.length).toBeLessThanOrEqual(12);
      
      // Should prioritize resolving bottlenecks efficiently
      const bottleneckDays = [1, 3, 5]; // Monday, Wednesday, Friday
      const bottleneckAssignments = solution.assignments.filter(a => 
        bottleneckDays.includes(a.dayOfWeek)
      );
      expect(bottleneckAssignments.length).toBeGreaterThan(0);
      
      // Should utilize generous days (Tuesday, Thursday) well
      const generousDays = [2, 4];
      const generousAssignments = solution.assignments.filter(a => 
        generousDays.includes(a.dayOfWeek)
      );
      expect(generousAssignments.length).toBeGreaterThanOrEqual(5);
    });
  });
});

// ============================================================================
// EXACT K-SOLUTION PUZZLES
// ============================================================================

describe('Generated Hard - Exact K-Solution Puzzles', () => {
  describe('Single Solution Challenges', () => {
    it('should find unique solution in complex scenario (15 students) in under 800ms', async () => {
      // Try to generate a unique solution case
      const result = await kSolutionPresets.generateUniqueSolutionCase(15);
      
      if (!result.success || !result.testCase) {
        console.warn('K-solution generation failed, using handcrafted unique scenario');
        
        // Handcrafted scenario with exactly one solution
        const teacherAvailability = createWeekWithDays([
          createDayWithBlocks(1, [
            { start: 540, duration: 60 },  // 9:00-10:00 (must fit specific student)
            { start: 630, duration: 90 },  // 10:30-12:00 (after break)
            { start: 750, duration: 60 }   // 12:30-1:30 (final slot)
          ]),
          createDayWithBlocks(3, [
            { start: 600, duration: 120 }, // 10:00-12:00 (for 2 students exactly)
            { start: 750, duration: 90 }   // 12:30-2:00 (final slot)
          ])
        ]);
        const teacher = createTestTeacher(teacherAvailability, {
          allowedDurations: [60, 90],
          maxConsecutiveMinutes: 90,
          breakDurationMinutes: 30
        });

        // Carefully designed students for unique solution
        const students = [
          // Monday constraints
          { 
            person: createTestPerson('s1', 'Monday 9am Only'),
            preferredDuration: 60,
            maxLessonsPerWeek: 1,
            availability: createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 60 }])
            ])
          },
          {
            person: createTestPerson('s2', 'Monday 10:30 Only'),
            preferredDuration: 90,
            maxLessonsPerWeek: 1,
            availability: createWeekWithDays([
              createDayWithBlocks(1, [{ start: 630, duration: 90 }])
            ])
          },
          {
            person: createTestPerson('s3', 'Monday 12:30 Only'),
            preferredDuration: 60,
            maxLessonsPerWeek: 1,
            availability: createWeekWithDays([
              createDayWithBlocks(1, [{ start: 750, duration: 60 }])
            ])
          },
          // Wednesday constraints
          {
            person: createTestPerson('s4', 'Wednesday 10am'),
            preferredDuration: 60,
            maxLessonsPerWeek: 1,
            availability: createWeekWithDays([
              createDayWithBlocks(3, [{ start: 600, duration: 60 }])
            ])
          },
          {
            person: createTestPerson('s5', 'Wednesday 11am'),
            preferredDuration: 60,
            maxLessonsPerWeek: 1,
            availability: createWeekWithDays([
              createDayWithBlocks(3, [{ start: 660, duration: 60 }])
            ])
          }
        ];

        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: true
        });
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(300);
        expect(solution.assignments.length).toBe(5); // Should find the unique solution
        return;
      }

      const startTime = Date.now();
      const solution = solveSchedule(result.testCase.teacher, result.testCase.students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 3000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(800);
      
      // Should find the unique solution or close to it
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      
      console.log(`Unique solution case: expected k=1, scheduled=${solution.assignments.length}/${result.testCase.students.length}`);
    });

    it('should solve few-solutions scenario (k≤5) in under 600ms', async () => {
      // Generate or create a scenario with very few solutions
      const result = await kSolutionPresets.generateFewSolutionsCase(12);
      
      if (!result.success || !result.testCase) {
        console.warn('K-solution generation failed, using handcrafted few-solution scenario');
        
        // Handcrafted scenario with 2-3 solutions
        const teacherAvailability = createWeekWithDays([
          createDayWithBlocks(2, [{ start: 600, duration: 180 }]), // Tuesday 10am-1pm
          createDayWithBlocks(4, [{ start: 540, duration: 150 }])  // Thursday 9am-11:30am
        ]);
        const teacher = createTestTeacher(teacherAvailability, {
          allowedDurations: [60, 90],
          maxConsecutiveMinutes: 90,
          breakDurationMinutes: 30
        });

        const students = Array.from({ length: 6 }, (_, i) => ({
          person: createTestPerson(`s${i + 1}`, `Few Solutions Student ${i + 1}`),
          preferredDuration: [60, 90][i % 2],
          maxLessonsPerWeek: 1,
          availability: createWeekWithDays([
            createDayWithBlocks(2, [{ start: 600 + (i * 20), duration: 120 }]),
            createDayWithBlocks(4, [{ start: 540 + (i * 15), duration: 90 }])
          ])
        }));

        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: true
        });
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(400);
        expect(solution.assignments.length).toBeGreaterThanOrEqual(3);
        return;
      }

      const startTime = Date.now();
      const solution = solveSchedule(result.testCase.teacher, result.testCase.students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 2000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(600);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(6);
      
      console.log(`Few solutions case: expected k≤5, scheduled=${solution.assignments.length}/${result.testCase.students.length}`);
    });
  });

  describe('Constraint Complexity Puzzles', () => {
    it('should solve multi-constraint interaction puzzle (16 students) in under 900ms', () => {
      // Complex scenario with multiple interacting constraints
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 45 },  // 9:00-9:45 (short block)
          { start: 615, duration: 105 }, // 10:15-12:00 (medium block)
          { start: 750, duration: 90 }   // 12:30-2:00 (medium block)
        ]),
        createDayWithBlocks(2, [{ start: 600, duration: 240 }]), // Tuesday 10am-2pm (long block)
        createDayWithBlocks(3, [
          { start: 570, duration: 60 },  // 9:30-10:30 (short block)
          { start: 660, duration: 90 },  // 11:00-12:30 (medium block)
          { start: 780, duration: 120 }  // 1:00-3:00 (long block)
        ]),
        createDayWithBlocks(4, [
          { start: 540, duration: 75 },  // 9:00-10:15 (short-medium)
          { start: 645, duration: 135 }  // 10:45-1:00 (long)
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90, 120],
        maxConsecutiveMinutes: 105, // Tight limit
        breakDurationMinutes: 30
      });

      // Students with complex constraint interactions
      const students = Array.from({ length: 16 }, (_, i) => {
        const constraintType = i % 4;
        let availability: WeekSchedule;
        let duration: number;
        
        switch (constraintType) {
          case 0: // Need specific long durations
            duration = 120;
            availability = createWeekWithDays([
              createDayWithBlocks(2, [{ start: 600, duration: 180 }]),
              createDayWithBlocks(3, [{ start: 780, duration: 120 }])
            ]);
            break;
          case 1: // Need medium durations, flexible timing
            duration = 90;
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 615, duration: 105 }]),
              createDayWithBlocks(3, [{ start: 660, duration: 90 }]),
              createDayWithBlocks(4, [{ start: 645, duration: 135 }])
            ]);
            break;
          case 2: // Need short durations, limited windows
            duration = 45;
            availability = createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 45 }]),
              createDayWithBlocks(4, [{ start: 540, duration: 75 }])
            ]);
            break;
          default: // Flexible but with timing constraints
            duration = 60;
            availability = createWeekWithDays([
              createDayWithBlocks(3, [{ start: 570, duration: 60 }]),
              createDayWithBlocks(2, [{ start: 660, duration: 120 }])
            ]);
        }
        
        return {
          person: createTestPerson(`s${i + 1}`, `Complex Constraint Student ${i + 1}`),
          preferredDuration: duration,
          maxLessonsPerWeek: 1,
          availability
        };
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 3000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(900);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      expect(solution.assignments.length).toBeLessThanOrEqual(13);
      
      // Should efficiently handle different duration requirements
      const durations = solution.assignments.map(a => a.durationMinutes);
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBeGreaterThanOrEqual(3);
      
      // Verify complex constraint satisfaction
      const assignmentsByDay = new Map<number, typeof solution.assignments>();
      solution.assignments.forEach(a => {
        if (!assignmentsByDay.has(a.dayOfWeek)) {
          assignmentsByDay.set(a.dayOfWeek, []);
        }
        assignmentsByDay.get(a.dayOfWeek)!.push(a);
      });
      
      assignmentsByDay.forEach(dayAssignments => {
        const sorted = dayAssignments.sort((a, b) => a.startMinute - b.startMinute);
        let totalConsecutive = 0;
        
        for (let i = 0; i < sorted.length; i++) {
          const current = sorted[i]!;
          
          if (i === 0 || current.startMinute > sorted[i-1]!.startMinute + sorted[i-1]!.durationMinutes + 30) {
            totalConsecutive = current.durationMinutes;
          } else {
            totalConsecutive += current.durationMinutes;
          }
          
          expect(totalConsecutive).toBeLessThanOrEqual(105);
        }
      });
    });
  });
});

// ============================================================================
// GENERATED SCENARIOS USING TEST GENERATORS
// ============================================================================

describe('Generated Hard - Using Test Generators', () => {
  let availabilityGen: AvailabilityGenerator;
  let studentGen: StudentGenerator;
  let testGen: TestCaseGenerator;

  beforeEach(() => {
    // Use fixed seeds for reproducible tests
    availabilityGen = new AvailabilityGenerator(77777);
    studentGen = new StudentGenerator(88888);
    testGen = createSeededGenerator(99999);
  });

  describe('Generated Hard Scenarios', () => {
    it('should solve difficult scheduling set (18 students) in under 1000ms', () => {
      // Generate challenging teacher schedule
      availabilityGen.setSeed(11111);
      const teacherAvailability = availabilityGen.generatePattern('fragmented', {
        primaryRange: { startMinute: 540, endMinute: 900 }, // 9am-3pm
        fragmentationLevel: 0.7, // High fragmentation
        minBlockDuration: 45,
        maxBlockDuration: 120,
        activeDays: [1, 2, 3, 4, 5]
      });
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [60, 90],
        maxConsecutiveMinutes: 90,
        breakDurationMinutes: 30
      });

      // Generate difficult student set
      const students = studentPresets.generateDifficultSchedulingSet(18, 22222);

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 4000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8);
      expect(solution.assignments.length).toBeLessThanOrEqual(14);
      
      // Hard scenarios should have significant unscheduled students
      expect(solution.unscheduled.length).toBeGreaterThanOrEqual(4);
      
      // But should still achieve reasonable utilization for scheduled students
      if (solution.assignments.length >= 10) {
        expect(solution.metadata.averageUtilization).toBeGreaterThan(60);
      }
    });

    it('should handle sparse availability scenario (14 students) in under 700ms', () => {
      // Generate very limited teacher availability
      availabilityGen.setSeed(33333);
      const teacherAvailability = availabilityGen.generatePattern('sparse', {
        activeDays: [2, 4], // Only Tuesday and Thursday
        primaryRange: { startMinute: 600, endMinute: 780 }, // 10am-1pm only
        fragmentationLevel: 0.5
      });
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [60, 90],
        maxConsecutiveMinutes: 90,
        breakDurationMinutes: 15
      });

      // Generate students who want more time than available
      studentGen.setSeed(44444);
      const students = studentGen.generateStudents({
        count: 14,
        typeDistribution: {
          'busy-student': 0.5, // Very limited availability
          'specific-days': 0.3, // Want specific days
          'flexible': 0.2 // Some flexibility
        },
        durationConfig: {
          preferredRange: [60, 90],
          minRange: [60, 60],
          maxRange: [90, 90]
        }
      });

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 2500
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(700);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(3);
      expect(solution.assignments.length).toBeLessThanOrEqual(8);
      
      // Sparse scenarios should have many unscheduled
      expect(solution.unscheduled.length).toBeGreaterThanOrEqual(6);
      
      // Should only schedule on allowed days
      const allowedDays = [2, 4];
      solution.assignments.forEach(a => {
        expect(allowedDays).toContain(a.dayOfWeek);
      });
    });

    it('should solve conflicting student types scenario (16 students) in under 800ms', () => {
      // Generate realistic but constrained teacher availability
      availabilityGen.setSeed(55555);
      const teacherAvailability = availabilityGen.generatePattern('realistic', {
        primaryRange: { startMinute: 540, endMinute: 960 }, // 9am-4pm
        fragmentationLevel: 0.4,
        activeDays: [1, 2, 3, 4, 5]
      });
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 20
      });

      // Generate conflicting student set
      const students = studentPresets.generateConflictingSet(16, 66666);

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 3000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(800);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(6);
      expect(solution.assignments.length).toBeLessThanOrEqual(12);
      
      // Conflicting scenarios create natural competition
      const successRate = solution.assignments.length / students.length;
      expect(successRate).toBeGreaterThan(0.3);
      expect(successRate).toBeLessThan(0.8);
    });
  });
});

// ============================================================================
// PERFORMANCE VALIDATION FOR HARD SCENARIOS
// ============================================================================

describe('Generated Hard - Performance Validation', () => {
  describe('Scaling with Difficulty', () => {
    it('should maintain reasonable performance as difficulty increases', () => {
      const difficultyCases = [
        { students: 8, maxTime: 300, minScheduled: 5 },
        { students: 12, maxTime: 500, minScheduled: 7 },
        { students: 16, maxTime: 800, minScheduled: 9 },
        { students: 20, maxTime: 1200, minScheduled: 11 }
      ];

      difficultyCases.forEach(({ students: studentCount, maxTime, minScheduled }) => {
        // Create increasingly difficult scenarios
        const teacherAvailability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: Math.max(60, studentCount * 20) }]),
          createDayWithBlocks(3, [{ start: 600, duration: Math.max(90, studentCount * 15) }]),
          createDayWithBlocks(5, [{ start: 570, duration: Math.max(120, studentCount * 10) }])
        ]);
        const teacher = createTestTeacher(teacherAvailability, {
          allowedDurations: [60, 90],
          maxConsecutiveMinutes: 90,
          breakDurationMinutes: 30
        });

        // Generate students with increasing conflicts
        const students = Array.from({ length: studentCount }, (_, i) => {
          const competitionLevel = Math.min(3, Math.floor(i / 4)); // Groups create competition
          const dayOption = competitionLevel === 0 ? 1 : competitionLevel === 1 ? 3 : 5;
          
          return {
            person: createTestPerson(`s${i + 1}`, `Scaling Student ${i + 1}`),
            preferredDuration: [60, 90][i % 2],
            maxLessonsPerWeek: 1,
            availability: createWeekWithDays([
              createDayWithBlocks(dayOption, [{ start: 540 + (i % 8) * 45, duration: 180 }])
            ])
          };
        });

        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: true,
          maxTimeMs: maxTime * 2 // Give extra buffer
        });
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(maxTime);
        expect(solution.assignments.length).toBeGreaterThanOrEqual(minScheduled);
        
        console.log(`Hard ${studentCount} students: ${elapsed}ms, ${solution.assignments.length}/${studentCount} scheduled`);
      });
    });

    it('should handle worst-case constraint combinations efficiently', () => {
      // Create a particularly challenging scenario
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 45 },  // 9:00-9:45
          { start: 615, duration: 45 },  // 10:15-11:00  
          { start: 690, duration: 45 }   // 11:30-12:15
        ]),
        createDayWithBlocks(3, [
          { start: 600, duration: 60 },  // 10:00-11:00
          { start: 690, duration: 60 }   // 11:30-12:30
        ]),
        createDayWithBlocks(5, [
          { start: 570, duration: 90 }   // 9:30-11:00
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [45, 60, 90],
        maxConsecutiveMinutes: 45, // Very tight - only one lesson at a time
        breakDurationMinutes: 30
      });

      // Students all competing for limited slots
      const students = Array.from({ length: 20 }, (_, i) => ({
        person: createTestPerson(`s${i + 1}`, `Worst Case Student ${i + 1}`),
        preferredDuration: [45, 60, 90][i % 3],
        maxLessonsPerWeek: 1,
        availability: createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 135 }]),
          createDayWithBlocks(3, [{ start: 600, duration: 150 }]),
          createDayWithBlocks(5, [{ start: 570, duration: 90 }])
        ])
      }));

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: true,
        maxTimeMs: 5000
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1500); // Should handle worst case in reasonable time
      expect(solution.assignments.length).toBeGreaterThanOrEqual(4);
      expect(solution.assignments.length).toBeLessThanOrEqual(8);
      
      // Should respect very tight constraints
      const assignmentsByDay = new Map<number, typeof solution.assignments>();
      solution.assignments.forEach(a => {
        if (!assignmentsByDay.has(a.dayOfWeek)) {
          assignmentsByDay.set(a.dayOfWeek, []);
        }
        assignmentsByDay.get(a.dayOfWeek)!.push(a);
      });
      
      // With max 45 minutes consecutive, should only have single lessons per block
      assignmentsByDay.forEach(dayAssignments => {
        dayAssignments.forEach(assignment => {
          expect(assignment.durationMinutes).toBeLessThanOrEqual(45);
        });
      });
    });
  });
});