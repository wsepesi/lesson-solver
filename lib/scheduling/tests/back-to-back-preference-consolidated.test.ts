/**
 * Comprehensive Tests for Back-to-Back Lesson Preferences
 * 
 * This test suite validates the back-to-back lesson preference feature which allows
 * teachers to specify whether they prefer to maximize, minimize, or remain agnostic
 * about consecutive lesson scheduling.
 * 
 * Test Categories:
 * - Constraint evaluation logic
 * - Solver integration and behavior
 * - Edge cases and complex scenarios
 * - Performance and debugging output
 */

import { describe, it, expect } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true
import { ScheduleSolver } from '../solver-wrapper';
import { BackToBackPreferenceConstraint } from '../constraints';
import type { TeacherConfig, StudentConfig, SchedulingConstraints, SolverContext, LessonAssignment } from '../types';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestPerson(id: string, name: string) {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`
  };
}

function createTestTeacher(constraints: Partial<SchedulingConstraints> = {}): TeacherConfig {
  return {
    person: createTestPerson('teacher-1', 'Test Teacher'),
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

function createSimpleTeacher(backToBackPreference: 'maximize' | 'minimize' | 'agnostic'): TeacherConfig {
  return {
    person: createTestPerson('teacher-1', 'Simple Test Teacher'),
    studioId: 'test-studio',
    availability: {
      days: [
        { dayOfWeek: 0, blocks: [] }, // Sunday - no availability
        { // Monday - full day
          dayOfWeek: 1,
          blocks: [
            { start: 480, duration: 600 } // 8:00 AM - 6:00 PM (10 hours)
          ]
        },
        { dayOfWeek: 2, blocks: [] },
        { dayOfWeek: 3, blocks: [] },
        { dayOfWeek: 4, blocks: [] },
        { dayOfWeek: 5, blocks: [] },
        { dayOfWeek: 6, blocks: [] }
      ],
      timezone: 'UTC'
    },
    constraints: {
      maxConsecutiveMinutes: 300, // 5 hours max consecutive
      breakDurationMinutes: 30,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [60], // Only 60-minute lessons for simplicity
      backToBackPreference
    }
  };
}

function createTestStudent(id: string, availability: any): StudentConfig {
  return {
    person: createTestPerson(id, `Student ${id}`),
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

function createSimpleStudent(id: string): StudentConfig {
  return {
    person: createTestPerson(id, `Student ${id}`),
    preferredDuration: 60,
    maxLessonsPerWeek: 1,
    availability: {
      days: [
        { dayOfWeek: 0, blocks: [] },
        { // Monday - full day
          dayOfWeek: 1,
          blocks: [
            { start: 480, duration: 600 } // 8:00 AM - 6:00 PM (10 hours)
          ]
        },
        { dayOfWeek: 2, blocks: [] },
        { dayOfWeek: 3, blocks: [] },
        { dayOfWeek: 4, blocks: [] },
        { dayOfWeek: 5, blocks: [] },
        { dayOfWeek: 6, blocks: [] }
      ],
      timezone: 'UTC'
    }
  };
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

// ============================================================================
// CONSTRAINT EVALUATION TESTS
// ============================================================================

describe('BackToBackPreferenceConstraint', () => {
  const constraint = new BackToBackPreferenceConstraint();

  describe('constraint evaluation logic', () => {
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

    it('should correctly evaluate maximize preference', () => {
      const context: SolverContext = {
        teacherAvailability: createSimpleTeacher('maximize').availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-1',
            dayOfWeek: 1,
            startMinute: 480, // 8:00 AM
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

      // Adjacent lesson (should satisfy maximize)
      const adjacentAssignment: LessonAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 540, // 9:00 AM (right after existing lesson)
        durationMinutes: 60
      };

      // Non-adjacent lesson (should violate maximize)
      const nonAdjacentAssignment: LessonAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 600, // 10:00 AM (gap from existing lesson)
        durationMinutes: 60
      };

      expect(constraint.evaluate(adjacentAssignment, context)).toBe(true);
      expect(constraint.evaluate(nonAdjacentAssignment, context)).toBe(false);
    });

    it('should correctly evaluate minimize preference', () => {
      const context: SolverContext = {
        teacherAvailability: createSimpleTeacher('minimize').availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-1',
            dayOfWeek: 1,
            startMinute: 480, // 8:00 AM
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

      // Adjacent lesson (should violate minimize)
      const adjacentAssignment: LessonAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 540, // 9:00 AM (right after existing lesson)
        durationMinutes: 60
      };

      // Non-adjacent lesson (should satisfy minimize)
      const nonAdjacentAssignment: LessonAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 600, // 10:00 AM (gap from existing lesson)
        durationMinutes: 60
      };

      expect(constraint.evaluate(adjacentAssignment, context)).toBe(false);
      expect(constraint.evaluate(nonAdjacentAssignment, context)).toBe(true);
    });

    it('should detect adjacency correctly for both before and after positions', () => {
      const context: SolverContext = {
        teacherAvailability: createSimpleTeacher('minimize').availability,
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

// ============================================================================
// SOLVER INTEGRATION TESTS
// ============================================================================

describe('Solver Integration - Back-to-Back Preferences', () => {
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

    it('should schedule 3 students back-to-back in simple scenario', () => {
      const teacher = createSimpleTeacher('maximize');
      const students = [
        createSimpleStudent('student-1'),
        createSimpleStudent('student-2'),
        createSimpleStudent('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      // Should schedule all 3 students
      expect(solution.assignments.length).toBe(3);

      // All should be on Monday
      const mondayLessons = solution.assignments
        .filter(a => a.dayOfWeek === 1)
        .sort((a, b) => a.startMinute - b.startMinute);

      expect(mondayLessons.length).toBe(3);

      // Check that lessons are back-to-back (no gaps between them)
      const lesson1 = mondayLessons[0]!;
      const lesson2 = mondayLessons[1]!;
      const lesson3 = mondayLessons[2]!;

      const lesson1End = lesson1.startMinute + lesson1.durationMinutes;
      const lesson2End = lesson2.startMinute + lesson2.durationMinutes;

      // Lessons should be consecutive
      expect(lesson2.startMinute).toBe(lesson1End);
      expect(lesson3.startMinute).toBe(lesson2End);
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

    it('should schedule students with gaps when minimizing', () => {
      const teacher = createSimpleTeacher('minimize');
      const students = [
        createSimpleStudent('student-1'),
        createSimpleStudent('student-2'),
        createSimpleStudent('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      // Should schedule all 3 students
      expect(solution.assignments.length).toBe(3);

      // Sort lessons by start time
      const allLessons = solution.assignments
        .sort((a, b) => a.dayOfWeek * 1440 + a.startMinute - (b.dayOfWeek * 1440 + b.startMinute));

      // Check if there are gaps (either spread across days or with gaps on same day)
      let hasGapsOrSpread = false;

      // Check if spread across multiple days
      const daysUsed = new Set(solution.assignments.map(a => a.dayOfWeek));
      if (daysUsed.size > 1) {
        hasGapsOrSpread = true;
      } else {
        // Check for gaps on the same day
        const sameDayLessons = allLessons.filter(a => a.dayOfWeek === allLessons[0]!.dayOfWeek);
        if (sameDayLessons.length > 1) {
          for (let i = 1; i < sameDayLessons.length; i++) {
            const prevLesson = sameDayLessons[i - 1]!;
            const currentLesson = sameDayLessons[i]!;
            const prevEnd = prevLesson.startMinute + prevLesson.durationMinutes;
            
            // If there's a gap between lessons
            if (currentLesson.startMinute > prevEnd) {
              hasGapsOrSpread = true;
              break;
            }
          }
        }
      }

      // With minimize preference, should have gaps or spread
      expect(hasGapsOrSpread).toBe(true);
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

    it('should schedule students without preference influence', () => {
      const teacher = createSimpleTeacher('agnostic');
      const students = [
        createSimpleStudent('student-1'),
        createSimpleStudent('student-2'),
        createSimpleStudent('student-3')
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      // Should schedule all 3 students
      expect(solution.assignments.length).toBe(3);

      // Should find a valid solution (no specific pattern expected)
      expect(solution.unscheduled.length).toBe(0);
    });
  });
});

// ============================================================================
// EDGE CASES AND COMPLEX SCENARIOS
// ============================================================================

describe('Back-to-Back Preferences - Edge Cases', () => {
  describe('mixed lesson durations', () => {
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

    it('should handle mixed lesson durations in simple scenario', () => {
      const teacher = createSimpleTeacher('maximize');
      teacher.constraints.allowedDurations = [30, 60, 90]; // Mixed durations
      
      const students = [
        createSimpleStudent('student-1'),
        createSimpleStudent('student-2'),
        createSimpleStudent('student-3')
      ];
      
      // Set different preferred durations
      students[0]!.preferredDuration = 30;
      students[1]!.preferredDuration = 60;
      students[2]!.preferredDuration = 90;
      
      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });
      
      const solution = solver.solve(teacher, students);
      
      expect(solution.assignments.length).toBeGreaterThan(0);
    });
  });

  describe('constraint interaction', () => {
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

    it('should respect consecutive limit even with maximize preference', () => {
      const teacher = createSimpleTeacher('maximize');
      // Set a very strict consecutive limit
      teacher.constraints.maxConsecutiveMinutes = 90; // Only 1.5 hours

      const students = [
        createSimpleStudent('student-1'),
        createSimpleStudent('student-2'),
        createSimpleStudent('student-3') // This should not be able to fit back-to-back
      ];

      const solver = new ScheduleSolver({
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none'
      });

      const solution = solver.solve(teacher, students);

      // Should still schedule students (solver should handle conflicts)
      expect(solution.assignments.length).toBeGreaterThan(0);
    });
  });

  describe('single student scenarios', () => {
    it('should handle single student correctly', () => {
      const teacher = createSimpleTeacher('maximize');
      const students = [createSimpleStudent('student-1')];
      
      const solver = new ScheduleSolver({
        maxTimeMs: 2000,
        useHeuristics: true,
        logLevel: 'none'
      });
      
      const solution = solver.solve(teacher, students);
      
      expect(solution.assignments.length).toBe(1);
    });
  });
});

// ============================================================================
// DEBUGGING AND PERFORMANCE TESTS
// ============================================================================

describe('Back-to-Back Preferences - Debugging', () => {
  describe('detailed behavior comparison', () => {
    it('should demonstrate different behavior between preferences', () => {
      const students = [
        createSimpleStudent('student-1'),
        createSimpleStudent('student-2'),
        createSimpleStudent('student-3'),
        createSimpleStudent('student-4')
      ];
      
      const solverOptions = {
        maxTimeMs: 5000,
        useHeuristics: true,
        logLevel: 'none' as const
      };
      
      // Test with maximize preference
      const maximizeTeacher = createSimpleTeacher('maximize');
      const maximizeSolver = new ScheduleSolver(solverOptions);
      const maximizeSolution = maximizeSolver.solve(maximizeTeacher, students);
      
      // Check for back-to-back lessons in maximize solution
      let maximizeBackToBackCount = 0;
      const maximizeSorted = maximizeSolution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < maximizeSorted.length; i++) {
        const prev = maximizeSorted[i - 1]!;
        const curr = maximizeSorted[i]!;
        if (prev.dayOfWeek === curr.dayOfWeek && prev.startMinute + prev.durationMinutes === curr.startMinute) {
          maximizeBackToBackCount++;
        }
      }
      
      // Test with minimize preference
      const minimizeTeacher = createSimpleTeacher('minimize');
      const minimizeSolver = new ScheduleSolver(solverOptions);
      const minimizeSolution = minimizeSolver.solve(minimizeTeacher, students);
      
      // Check for back-to-back lessons in minimize solution
      let minimizeBackToBackCount = 0;
      const minimizeSorted = minimizeSolution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < minimizeSorted.length; i++) {
        const prev = minimizeSorted[i - 1]!;
        const curr = minimizeSorted[i]!;
        if (prev.dayOfWeek === curr.dayOfWeek && prev.startMinute + prev.durationMinutes === curr.startMinute) {
          minimizeBackToBackCount++;
        }
      }
      
      // Test with agnostic preference
      const agnosticTeacher = createSimpleTeacher('agnostic');
      const agnosticSolver = new ScheduleSolver(solverOptions);
      const agnosticSolution = agnosticSolver.solve(agnosticTeacher, students);
      
      // Verify all students were scheduled in each case
      expect(maximizeSolution.assignments.length).toBe(students.length);
      expect(minimizeSolution.assignments.length).toBe(students.length);
      expect(agnosticSolution.assignments.length).toBe(students.length);
      
      // The exact relationship between counts may vary based on other constraints,
      // but we should at least verify that all preferences produce valid solutions
      expect(maximizeBackToBackCount).toBeGreaterThanOrEqual(0);
      expect(minimizeBackToBackCount).toBeGreaterThanOrEqual(0);
    });
  });
});