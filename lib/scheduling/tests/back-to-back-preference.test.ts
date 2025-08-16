/**
 * Tests for back-to-back lesson preference functionality
 * 
 * This test suite validates the back-to-back lesson preference feature which allows
 * teachers to specify whether they prefer to maximize, minimize, or remain agnostic
 * about consecutive lesson scheduling.
 */

import { describe, it, expect } from 'vitest';
import { ScheduleSolver } from '../solver';
import type { TeacherConfig, StudentConfig, SchedulingConstraints } from '../types';
import { BackToBackPreferenceConstraint } from '../constraints';
import type { SolverContext, LessonAssignment } from '../constraints';

// Helper functions for creating test data
function createTestTeacher(constraints: Partial<SchedulingConstraints> = {}): TeacherConfig {
  return {
    person: {
      id: 'teacher-1',
      name: 'Test Teacher',
      email: 'teacher@test.com'
    },
    studioId: 'test-studio',
    availability: {
      days: [
        { dayOfWeek: 0, blocks: [] }, // Sunday - no availability
        { // Monday
          dayOfWeek: 1,
          blocks: [
            { start: 480, duration: 240 }, // 8:00 AM - 12:00 PM (4 hours)
            { start: 780, duration: 180 }  // 1:00 PM - 4:00 PM (3 hours)
          ]
        },
        { // Tuesday
          dayOfWeek: 2,
          blocks: [
            { start: 540, duration: 300 }  // 9:00 AM - 2:00 PM (5 hours)
          ]
        },
        { // Wednesday
          dayOfWeek: 3,
          blocks: [
            { start: 480, duration: 360 }  // 8:00 AM - 2:00 PM (6 hours)
          ]
        },
        { dayOfWeek: 4, blocks: [] }, // Thursday - no availability
        { dayOfWeek: 5, blocks: [] }, // Friday - no availability
        { dayOfWeek: 6, blocks: [] }  // Saturday - no availability
      ],
      timezone: 'UTC'
    },
    constraints: {
      maxConsecutiveMinutes: 180, // 3 hours
      breakDurationMinutes: 30,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [30, 60],
      backToBackPreference: 'agnostic',
      ...constraints
    }
  };
}

function createTestStudent(id: string, availability: any): StudentConfig {
  return {
    person: {
      id,
      name: `Student ${id}`,
      email: `student${id}@test.com`
    },
    preferredDuration: 60,
    maxLessonsPerWeek: 1,
    availability
  };
}

function createStudentWithMondayAvailability(id: string): StudentConfig {
  return createTestStudent(id, {
    days: [
      { dayOfWeek: 0, blocks: [] },
      { // Monday
        dayOfWeek: 1,
        blocks: [
          { start: 480, duration: 240 } // 8:00 AM - 12:00 PM
        ]
      },
      { dayOfWeek: 2, blocks: [] },
      { dayOfWeek: 3, blocks: [] },
      { dayOfWeek: 4, blocks: [] },
      { dayOfWeek: 5, blocks: [] },
      { dayOfWeek: 6, blocks: [] }
    ],
    timezone: 'UTC'
  });
}

function createStudentWithSpreadAvailability(id: string): StudentConfig {
  return createTestStudent(id, {
    days: [
      { dayOfWeek: 0, blocks: [] },
      { // Monday
        dayOfWeek: 1,
        blocks: [{ start: 480, duration: 120 }] // 8:00 AM - 10:00 AM
      },
      { // Tuesday
        dayOfWeek: 2,
        blocks: [{ start: 540, duration: 120 }] // 9:00 AM - 11:00 AM
      },
      { // Wednesday
        dayOfWeek: 3,
        blocks: [{ start: 600, duration: 120 }] // 10:00 AM - 12:00 PM
      },
      { dayOfWeek: 4, blocks: [] },
      { dayOfWeek: 5, blocks: [] },
      { dayOfWeek: 6, blocks: [] }
    ],
    timezone: 'UTC'
  });
}

describe('BackToBackPreferenceConstraint', () => {
  const constraint = new BackToBackPreferenceConstraint();

  describe('constraint evaluation', () => {
    it('should always return true for agnostic preference', () => {
      const context: SolverContext = {
        teacherAvailability: createTestTeacher().availability,
        studentAvailability: new Map(),
        existingAssignments: [],
        constraints: { 
          maxConsecutiveMinutes: 180,
          breakDurationMinutes: 30,
          minLessonDuration: 30,
          maxLessonDuration: 90,
          allowedDurations: [30, 60],
          backToBackPreference: 'agnostic'
        },
        studentPreferences: new Map()
      };

      const assignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 480,
        durationMinutes: 60
      };

      expect(constraint.evaluate(assignment, context)).toBe(true);
    });

    it('should return true for maximize preference regardless of adjacency', () => {
      const context: SolverContext = {
        teacherAvailability: createTestTeacher().availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-2',
            dayOfWeek: 1,
            startMinute: 420, // 7:00 AM
            durationMinutes: 60
          }
        ],
        constraints: { 
          maxConsecutiveMinutes: 180,
          breakDurationMinutes: 30,
          minLessonDuration: 30,
          maxLessonDuration: 90,
          allowedDurations: [30, 60],
          backToBackPreference: 'maximize'
        },
        studentPreferences: new Map()
      };

      // Adjacent lesson
      const adjacentAssignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 480, // 8:00 AM (right after existing lesson)
        durationMinutes: 60
      };

      // Non-adjacent lesson
      const nonAdjacentAssignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 600, // 10:00 AM (gap from existing lesson)
        durationMinutes: 60
      };

      expect(constraint.evaluate(adjacentAssignment, context)).toBe(true);
      expect(constraint.evaluate(nonAdjacentAssignment, context)).toBe(true);
    });

    it('should return false for minimize preference with adjacent lessons', () => {
      const context: SolverContext = {
        teacherAvailability: createTestTeacher().availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-2',
            dayOfWeek: 1,
            startMinute: 420, // 7:00 AM
            durationMinutes: 60
          }
        ],
        constraints: { 
          maxConsecutiveMinutes: 180,
          breakDurationMinutes: 30,
          minLessonDuration: 30,
          maxLessonDuration: 90,
          allowedDurations: [30, 60],
          backToBackPreference: 'minimize'
        },
        studentPreferences: new Map()
      };

      // Adjacent lesson (should fail)
      const adjacentAssignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 480, // 8:00 AM (right after existing lesson)
        durationMinutes: 60
      };

      // Non-adjacent lesson (should pass)
      const nonAdjacentAssignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 600, // 10:00 AM (gap from existing lesson)
        durationMinutes: 60
      };

      expect(constraint.evaluate(adjacentAssignment, context)).toBe(false);
      expect(constraint.evaluate(nonAdjacentAssignment, context)).toBe(true);
    });

    it('should detect adjacency correctly for both before and after positions', () => {
      const context: SolverContext = {
        teacherAvailability: createTestTeacher().availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-2',
            dayOfWeek: 1,
            startMinute: 540, // 9:00 AM
            durationMinutes: 60 // ends at 10:00 AM
          }
        ],
        constraints: { 
          maxConsecutiveMinutes: 180,
          breakDurationMinutes: 30,
          minLessonDuration: 30,
          maxLessonDuration: 90,
          allowedDurations: [30, 60],
          backToBackPreference: 'minimize'
        },
        studentPreferences: new Map()
      };

      // Lesson that comes right before existing (8:00-9:00 AM)
      const beforeAssignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 480,
        durationMinutes: 60
      };

      // Lesson that comes right after existing (10:00-11:00 AM)
      const afterAssignment: LessonAssignment = {
        studentId: 'student-1',
        dayOfWeek: 1,
        startMinute: 600,
        durationMinutes: 60
      };

      expect(constraint.evaluate(beforeAssignment, context)).toBe(false);
      expect(constraint.evaluate(afterAssignment, context)).toBe(false);
    });
  });

  describe('constraint properties', () => {
    it('should have correct constraint properties', () => {
      expect(constraint.id).toBe('back-to-back-preference');
      expect(constraint.type).toBe('soft');
      expect(constraint.priority).toBe(25);
      expect(constraint.getViolationCost()).toBe(20);
      expect(constraint.getMessage()).toBe('Lesson scheduling should respect the back-to-back preference setting');
    });
  });
});

describe('ScheduleSolver with Back-to-Back Preferences', () => {
  describe('maximize preference', () => {
    it('should prefer scheduling lessons back-to-back when possible', () => {
      const teacher = createTestTeacher({
        backToBackPreference: 'maximize'
      });

      // Create 3 students who all have Monday morning availability
      const students = [
        createStudentWithMondayAvailability('student-1'),
        createStudentWithMondayAvailability('student-2'),
        createStudentWithMondayAvailability('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(3);
      
      // Check that lessons are scheduled consecutively on Monday
      const mondayLessons = solution.assignments
        .filter(a => a.dayOfWeek === 1)
        .sort((a, b) => a.startMinute - b.startMinute);

      expect(mondayLessons.length).toBe(3);

      // Verify lessons are back-to-back (no gaps)
      for (let i = 1; i < mondayLessons.length; i++) {
        const prevLesson = mondayLessons[i - 1]!;
        const currentLesson = mondayLessons[i]!;
        const prevEnd = prevLesson.startMinute + prevLesson.durationMinutes;
        
        expect(currentLesson.startMinute).toBe(prevEnd);
      }
    });
  });

  describe('minimize preference', () => {
    it('should prefer spreading lessons across different days', () => {
      const teacher = createTestTeacher({
        backToBackPreference: 'minimize'
      });

      // Create 3 students with availability across multiple days
      const students = [
        createStudentWithSpreadAvailability('student-1'),
        createStudentWithSpreadAvailability('student-2'),
        createStudentWithSpreadAvailability('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(3);

      // Check that lessons are spread across different days
      const dayCount = new Set(solution.assignments.map(a => a.dayOfWeek)).size;
      expect(dayCount).toBeGreaterThanOrEqual(2); // Should use at least 2 different days
    });

    it('should avoid scheduling consecutive lessons when possible', () => {
      const teacher = createTestTeacher({
        backToBackPreference: 'minimize',
        maxConsecutiveMinutes: 300 // Allow up to 5 hours consecutive
      });

      // Force students to have overlapping availability so solver must choose
      const students = [
        createStudentWithMondayAvailability('student-1'),
        createStudentWithMondayAvailability('student-2')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(2);

      // If both are scheduled on Monday, they should have gaps
      const mondayLessons = solution.assignments
        .filter(a => a.dayOfWeek === 1)
        .sort((a, b) => a.startMinute - b.startMinute);

      if (mondayLessons.length === 2) {
        const lesson1 = mondayLessons[0]!;
        const lesson2 = mondayLessons[1]!;
        const gap = lesson2.startMinute - (lesson1.startMinute + lesson1.durationMinutes);
        
        expect(gap).toBeGreaterThan(0); // Should have a gap between lessons
      }
    });
  });

  describe('agnostic preference (default behavior)', () => {
    it('should not influence scheduling decisions', () => {
      const teacher = createTestTeacher({
        backToBackPreference: 'agnostic'
      });

      const students = [
        createStudentWithMondayAvailability('student-1'),
        createStudentWithMondayAvailability('student-2'),
        createStudentWithMondayAvailability('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(3);
      // With agnostic preference, the solver should still find a valid solution
      // but without any particular bias toward back-to-back or spread scheduling
    });
  });

  describe('edge cases', () => {
    it('should handle mixed lesson durations with maximize preference', () => {
      const teacher = createTestTeacher({
        backToBackPreference: 'maximize',
        allowedDurations: [30, 60]
      });

      // Create students with different preferred durations
      const student30min = createTestStudent('student-30', {
        days: [
          { dayOfWeek: 0, blocks: [] },
          {
            dayOfWeek: 1,
            blocks: [{ start: 480, duration: 180 }] // 8:00 AM - 11:00 AM
          },
          { dayOfWeek: 2, blocks: [] },
          { dayOfWeek: 3, blocks: [] },
          { dayOfWeek: 4, blocks: [] },
          { dayOfWeek: 5, blocks: [] },
          { dayOfWeek: 6, blocks: [] }
        ],
        timezone: 'UTC'
      });
      student30min.preferredDuration = 30;

      const student60min = createTestStudent('student-60', {
        days: [
          { dayOfWeek: 0, blocks: [] },
          {
            dayOfWeek: 1,
            blocks: [{ start: 480, duration: 180 }] // 8:00 AM - 11:00 AM
          },
          { dayOfWeek: 2, blocks: [] },
          { dayOfWeek: 3, blocks: [] },
          { dayOfWeek: 4, blocks: [] },
          { dayOfWeek: 5, blocks: [] },
          { dayOfWeek: 6, blocks: [] }
        ],
        timezone: 'UTC'
      });
      student60min.preferredDuration = 60;

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, [student30min, student60min]);

      expect(solution.assignments.length).toBe(2);
      
      // Verify the different durations are respected
      const durations = solution.assignments.map(a => a.durationMinutes).sort();
      expect(durations).toEqual([30, 60]);
    });

    it('should balance maximize preference with consecutive limit constraint', () => {
      const teacher = createTestTeacher({
        backToBackPreference: 'maximize',
        maxConsecutiveMinutes: 90 // Only 1.5 hours consecutive allowed
      });

      // Create multiple students to test the limit
      const students = [
        createStudentWithMondayAvailability('student-1'),
        createStudentWithMondayAvailability('student-2'),
        createStudentWithMondayAvailability('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      // Should still find valid solution
      expect(solution.assignments.length).toBeGreaterThan(0);

      // The solver may violate soft constraints in favor of scheduling more students
      // but it should generally try to minimize violations
      const mondayLessons = solution.assignments
        .filter(a => a.dayOfWeek === 1)
        .sort((a, b) => a.startMinute - b.startMinute);

      // Verify that lessons are scheduled (the main goal)
      expect(mondayLessons.length).toBeGreaterThan(0);
      
      // If lessons are back-to-back, verify they form reasonable blocks
      // (This test is more about ensuring the feature works, not strict enforcement)
      if (mondayLessons.length > 1) {
        let hasBackToBackLessons = false;
        
        for (let i = 1; i < mondayLessons.length; i++) {
          const prevLesson = mondayLessons[i - 1]!;
          const currentLesson = mondayLessons[i]!;
          const prevEnd = prevLesson.startMinute + prevLesson.durationMinutes;
          
          if (currentLesson.startMinute === prevEnd) {
            hasBackToBackLessons = true;
            break;
          }
        }
        
        // With maximize preference, we should see some back-to-back scheduling
        // (though it might be balanced against consecutive limits)
        expect(hasBackToBackLessons).toBe(true);
      }
    });
  });
});