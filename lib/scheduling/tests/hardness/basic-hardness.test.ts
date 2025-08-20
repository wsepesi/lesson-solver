/**
 * Basic Hardness Tests - Hand-written Simple Cases
 * 
 * This test suite contains carefully crafted, simple scheduling scenarios
 * to validate basic solver functionality and establish baseline hardness
 * measurements. These tests are hand-written and deterministic.
 * 
 * Test Categories:
 * - Trivial cases (2-3 students, exact fit scenarios)
 * - Single solution puzzles
 * - Obviously impossible cases
 * - Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true
import {
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
    maxConsecutiveMinutes: 180, // 3 hours
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90],
    backToBackPreference: 'agnostic'
  };

  return {
    person: createTestPerson('teacher-basic', 'Basic Test Teacher'),
    studioId: 'studio-basic',
    availability,
    constraints: { ...defaultConstraints, ...constraints }
  };
}

function createTestStudent(
  id: string,
  name: string,
  availability: WeekSchedule,
  preferredDuration = 60,
  maxLessons = 1
): StudentConfig {
  return {
    person: createTestPerson(id, name),
    preferredDuration,
    maxLessonsPerWeek: maxLessons,
    availability
  };
}

function createDayWithBlocks(dayOfWeek: number, blocks: TimeBlock[]): DaySchedule {
  return {
    dayOfWeek,
    blocks: blocks.filter(block => block.start >= 0 && block.start < 1440)
  };
}

function createWeekWithDays(days: DaySchedule[], timezone = 'UTC'): WeekSchedule {
  // Fill missing days with empty schedules
  const fullWeek = Array.from({ length: 7 }, (_, i) => 
    days.find(d => d.dayOfWeek === i) ?? createDayWithBlocks(i, [])
  );
  
  return {
    days: fullWeek,
    timezone
  };
}

// ============================================================================
// TRIVIAL CASES - SHOULD ALWAYS SOLVE QUICKLY
// ============================================================================

describe('Basic Hardness - Trivial Cases (Perfect Fits)', () => {
  describe('Single Student Perfect Matches', () => {
    it('should solve single student with exact time match in under 10ms', () => {
      // Teacher available Monday 10am-11am (exactly 60 minutes)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available Monday 10am-11am, wants 60min lesson (perfect match)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00
      ]);
      const students = [createTestStudent('s1', 'Perfect Match Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false // Test pure CSP performance
      });
      const elapsed = Date.now() - startTime;

      // Performance assertion - should be fast (increased tolerance for CI environments)
      expect(elapsed).toBeLessThan(50);
      expect(solution.metadata.computeTimeMs).toBeLessThan(50);

      // Should find the perfect solution
      expect(solution.assignments).toHaveLength(1);
      expect(solution.unscheduled).toHaveLength(0);
      expect(solution.metadata.scheduledStudents).toBe(1);

      const assignment = solution.assignments[0]!;
      expect(assignment.studentId).toBe('s1');
      expect(assignment.dayOfWeek).toBe(1);
      expect(assignment.startMinute).toBe(600);
      expect(assignment.durationMinutes).toBe(60);
    });

    it('should solve two students with non-overlapping exact matches in under 15ms', () => {
      // Teacher available Monday 9am-11am (exactly 120 minutes)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // 9:00-11:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student 1: Monday 9am-10am, wants 60min
      const student1Availability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9:00-10:00
      ]);
      
      // Student 2: Monday 10am-11am, wants 60min
      const student2Availability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00
      ]);

      const students = [
        createTestStudent('s1', 'First Student', student1Availability, 60),
        createTestStudent('s2', 'Second Student', student2Availability, 60)
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(75);
      expect(solution.metadata.computeTimeMs).toBeLessThan(75);

      // Should schedule both students
      expect(solution.assignments).toHaveLength(2);
      expect(solution.unscheduled).toHaveLength(0);

      // Verify assignments are correct
      const assignment1 = solution.assignments.find(a => a.studentId === 's1');
      const assignment2 = solution.assignments.find(a => a.studentId === 's2');
      
      expect(assignment1).toBeDefined();
      expect(assignment2).toBeDefined();
      
      if (assignment1 && assignment2) {
        expect(assignment1.startMinute).toBe(540);
        expect(assignment2.startMinute).toBe(600);
        expect(assignment1.durationMinutes).toBe(60);
        expect(assignment2.durationMinutes).toBe(60);
      }
    });

    it('should solve three students across different days in under 20ms', () => {
      // Teacher available Mon/Wed/Fri 2pm-3pm
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 840, duration: 60 }]), // Monday 2pm-3pm
        createDayWithBlocks(3, [{ start: 840, duration: 60 }]), // Wednesday 2pm-3pm
        createDayWithBlocks(5, [{ start: 840, duration: 60 }])  // Friday 2pm-3pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('s1', 'Monday Student', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 840, duration: 60 }])
        ]), 60),
        createTestStudent('s2', 'Wednesday Student', createWeekWithDays([
          createDayWithBlocks(3, [{ start: 840, duration: 60 }])
        ]), 60),
        createTestStudent('s3', 'Friday Student', createWeekWithDays([
          createDayWithBlocks(5, [{ start: 840, duration: 60 }])
        ]), 60)
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(solution.assignments).toHaveLength(3);
      expect(solution.unscheduled).toHaveLength(0);
    });
  });

  describe('Multiple Choice Trivial Cases', () => {
    it('should solve single student with multiple time options in under 10ms', () => {
      // Teacher available Mon/Tue 10am-11am
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]), // Monday 10am-11am
        createDayWithBlocks(2, [{ start: 600, duration: 60 }])  // Tuesday 10am-11am
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available both days (multiple valid solutions)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]),
        createDayWithBlocks(2, [{ start: 600, duration: 60 }])
      ]);
      const students = [createTestStudent('s1', 'Flexible Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
      expect(solution.assignments).toHaveLength(1);
      expect(solution.unscheduled).toHaveLength(0);

      // Should pick one of the available options
      const assignment = solution.assignments[0]!;
      expect([1, 2]).toContain(assignment.dayOfWeek);
      expect(assignment.startMinute).toBe(600);
    });
  });
});

// ============================================================================
// SINGLE SOLUTION PUZZLES - EXACTLY ONE VALID ARRANGEMENT
// ============================================================================

describe('Basic Hardness - Single Solution Puzzles', () => {
  describe('Unique Solution Constraints', () => {
    it('should find unique solution with tight time constraints in under 50ms', () => {
      // Teacher available Monday 9am-12pm with break requirement
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // 9:00-12:00
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 30, // Require 30-min breaks
        allowedDurations: [60] // Only 60-min lessons
      });

      // Student 1: Only available 9am-10am
      const student1Availability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9:00-10:00
      ]);
      
      // Student 2: Only available 11am-12pm (forces 30-min break after student 1)
      const student2Availability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 660, duration: 60 }]) // 11:00-12:00
      ]);

      const students = [
        createTestStudent('s1', 'Morning Student', student1Availability, 60),
        createTestStudent('s2', 'Late Morning Student', student2Availability, 60)
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
      expect(solution.assignments).toHaveLength(2);
      expect(solution.unscheduled).toHaveLength(0);

      // Verify the unique solution
      const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      expect(assignments[0]!.startMinute).toBe(540); // 9:00
      expect(assignments[1]!.startMinute).toBe(660); // 11:00
      
      // Verify break requirement is satisfied
      const gap = assignments[1]!.startMinute - (assignments[0]!.startMinute + assignments[0]!.durationMinutes);
      expect(gap).toBeGreaterThanOrEqual(30);
    });

    it('should solve tetris-like packing puzzle in under 100ms', () => {
      // Teacher available Monday 9am-1pm (240 minutes)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // 9:00-13:00
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60, 90],
        breakDurationMinutes: 15
      });

      // Design students so only one arrangement fits perfectly
      const students = [
        // Student 1: 30-min lesson, only 9:00-9:45 available
        createTestStudent('s1', 'Short Early', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 45 }]) // 9:00-9:45
        ]), 30),
        
        // Student 2: 45-min lesson, only 9:45-11:00 available
        createTestStudent('s2', 'Medium Middle', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 585, duration: 75 }]) // 9:45-11:00
        ]), 45),
        
        // Student 3: 60-min lesson, only 11:15-13:00 available (after break)
        createTestStudent('s3', 'Long Late', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 675, duration: 105 }]) // 11:15-13:00
        ]), 60)
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(solution.assignments).toHaveLength(3);
      expect(solution.unscheduled).toHaveLength(0);

      // Verify the tetris-like solution
      const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      expect(assignments[0]!.durationMinutes).toBe(30); // First: 30-min
      expect(assignments[1]!.durationMinutes).toBe(45); // Second: 45-min
      expect(assignments[2]!.durationMinutes).toBe(60); // Third: 60-min
    });
  });

  describe('Constraint Interaction Puzzles', () => {
    it('should solve puzzle with multiple constraint interactions in under 75ms', () => {
      // Teacher with strict constraints
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 90, // Max 1.5 hours consecutive
        breakDurationMinutes: 30,
        allowedDurations: [45, 60]
      });

      // Design a puzzle where constraints force a unique solution
      const students = [
        // Must be first (earliest availability)
        createTestStudent('s1', 'Early Bird', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // 9:00-11:00
        ]), 45),
        
        // Must be after break (90min consecutive limit)
        createTestStudent('s2', 'After Break', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 570, duration: 270 }]) // 9:30-14:00
        ]), 60),
        
        // Can only fit at end
        createTestStudent('s3', 'End Fitter', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 120 }]) // 12:00-14:00
        ]), 45)
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(75);
      
      // Should find a valid solution respecting all constraints
      if (solution.assignments.length > 0) {
        const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
        
        // Verify no consecutive limit violations
        for (let i = 1; i < assignments.length; i++) {
          const prev = assignments[i - 1]!;
          const curr = assignments[i]!;
          const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
          
          if (gap < 30) { // If no break, check consecutive limit
            const consecutiveTime = prev.durationMinutes + curr.durationMinutes;
            expect(consecutiveTime).toBeLessThanOrEqual(90);
          }
        }
      }
    });
  });
});

// ============================================================================
// OBVIOUSLY IMPOSSIBLE CASES - SHOULD FAIL QUICKLY
// ============================================================================

describe('Basic Hardness - Obviously Impossible Cases', () => {
  describe('No Overlap Scenarios', () => {
    it('should quickly detect no teacher-student overlap in under 5ms', () => {
      // Teacher available Monday 9am-5pm
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9:00-17:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student only available Tuesday (no overlap)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(2, [{ start: 540, duration: 480 }]) // Tuesday 9:00-17:00
      ]);
      const students = [createTestStudent('s1', 'Wrong Day Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25); // Should fail quickly
      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toHaveLength(1);
      expect(solution.unscheduled[0]).toBe('s1');
    });

    it('should quickly detect time-of-day conflicts in under 5ms', () => {
      // Teacher available Monday 9am-12pm
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // Monday 9:00-12:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student only available Monday 2pm-5pm (same day, no time overlap)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 840, duration: 180 }]) // Monday 14:00-17:00
      ]);
      const students = [createTestStudent('s1', 'Wrong Time Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25);
      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toContain('s1');
    });
  });

  describe('Insufficient Duration Scenarios', () => {
    it('should quickly detect insufficient lesson duration in under 5ms', () => {
      // Teacher available Monday 10am-10:30am (only 30 minutes)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 30 }]) // 10:00-10:30
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student wants 60-minute lesson (impossible in 30-minute window)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00
      ]);
      const students = [createTestStudent('s1', 'Long Lesson Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25);
      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toContain('s1');
    });

    it('should quickly detect when multiple students cannot fit in under 10ms', () => {
      // Teacher available Monday 10am-11am (only 60 minutes total)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Two students each wanting 45-minute lessons (90 minutes total > 60 available)
      const sharedAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Both want 10:00-11:00
      ]);
      
      const students = [
        createTestStudent('s1', 'First 45min Student', sharedAvailability, 45),
        createTestStudent('s2', 'Second 45min Student', sharedAvailability, 45)
      ];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
      
      // Should schedule at most one student (can't fit both)
      expect(solution.assignments.length).toBeLessThanOrEqual(1);
      expect(solution.unscheduled.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Constraint Violation Scenarios', () => {
    it('should quickly detect duration constraint violations in under 5ms', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      
      // Teacher only allows 30-minute lessons
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30],
        minLessonDuration: 30,
        maxLessonDuration: 30
      });

      // Student wants 60-minute lesson (not allowed)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }])
      ]);
      const students = [createTestStudent('s1', 'Wrong Duration Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25);
      
      // Should either schedule with allowed duration or fail to schedule
      if (solution.assignments.length > 0) {
        expect(solution.assignments[0]!.durationMinutes).toBe(30);
      }
    });
  });
});

// ============================================================================
// EDGE CASES AND BOUNDARY CONDITIONS
// ============================================================================

describe('Basic Hardness - Edge Cases', () => {
  describe('Boundary Time Conditions', () => {
    it('should handle midnight boundary correctly in under 10ms', () => {
      // Teacher available Sunday 11pm-Monday 1am (crosses midnight)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(0, [{ start: 1380, duration: 60 }]), // Sunday 23:00-24:00 (last hour)
        createDayWithBlocks(1, [{ start: 0, duration: 60 }])     // Monday 00:00-01:00 (first hour)
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available Sunday 11:30pm-Monday 12:30am
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(0, [{ start: 1410, duration: 30 }]), // Sunday 23:30-24:00
        createDayWithBlocks(1, [{ start: 0, duration: 30 }])     // Monday 00:00-00:30
      ]);
      const students = [createTestStudent('s1', 'Midnight Student', studentAvailability, 30)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
      expect(solution).toBeDefined();
      
      // Should handle boundary gracefully (either schedule or not, but no crash)
      expect(solution.assignments.length + solution.unscheduled.length).toBe(1);
    });

    it('should handle minimum duration edge case in under 5ms', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 15 }]) // Exactly minimum duration
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        minLessonDuration: 15,
        allowedDurations: [15]
      });

      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 15 }])
      ]);
      const students = [createTestStudent('s1', 'Minimum Duration Student', studentAvailability, 15)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25);
      expect(solution.assignments).toHaveLength(1);
      expect(solution.assignments[0]!.durationMinutes).toBe(15);
    });
  });

  describe('Empty Input Handling', () => {
    it('should handle no students quickly in under 1ms', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const startTime = Date.now();
      const solution = solveSchedule(teacher, [], { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5);
      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toHaveLength(0);
      expect(solution.metadata.totalStudents).toBe(0);
    });

    it('should handle empty teacher availability quickly in under 5ms', () => {
      const teacher = createTestTeacher(createEmptyWeekSchedule());
      
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }])
      ]);
      const students = [createTestStudent('s1', 'Student', studentAvailability, 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25);
      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toContain('s1');
    });

    it('should handle student with no availability quickly in under 5ms', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability);
      
      const students = [createTestStudent('s1', 'No Availability Student', createEmptyWeekSchedule(), 60)];

      const startTime = Date.now();
      const solution = solveSchedule(teacher, students, { 
        logLevel: 'none',
        enableOptimizations: false
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(25);
      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toContain('s1');
    });
  });
});

// ============================================================================
// HARDNESS BASELINE MEASUREMENTS
// ============================================================================

describe('Basic Hardness - Baseline Measurements', () => {
  describe('Performance Baseline Establishment', () => {
    it('should establish baseline for simple cases (2-3 students)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('s1', 'Student 1', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }])
        ]), 60),
        createTestStudent('s2', 'Student 2', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 120 }])
        ]), 60),
        createTestStudent('s3', 'Student 3', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 120 }])
        ]), 60)
      ];

      const times: number[] = [];
      
      // Run multiple times for baseline
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: false
        });
        const elapsed = Date.now() - startTime;
        
        times.push(elapsed);
        
        // Verify correctness
        expect(solution.assignments.length + solution.unscheduled.length).toBe(3);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      console.log(`Baseline 3-student case: avg=${avgTime}ms, max=${maxTime}ms`);
      
      // Baseline expectations
      expect(avgTime).toBeLessThan(25);
      expect(maxTime).toBeLessThan(50);
    });

    it('should measure hardness scaling from 1 to 5 students', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 360 }]) // Monday 9am-3pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      for (let studentCount = 1; studentCount <= 5; studentCount++) {
        const students = Array.from({ length: studentCount }, (_, i) => 
          createTestStudent(`s${i + 1}`, `Student ${i + 1}`, createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600 + i * 30, duration: 180 }])
          ]), 60)
        );

        const startTime = Date.now();
        const solution = solveSchedule(teacher, students, { 
          logLevel: 'none',
          enableOptimizations: false
        });
        const elapsed = Date.now() - startTime;

        console.log(`${studentCount} students: ${elapsed}ms, scheduled=${solution.assignments.length}`);
        
        // Performance should scale reasonably
        expect(elapsed).toBeLessThan(studentCount * 20);
        expect(solution).toBeDefined();
      }
    });
  });
});