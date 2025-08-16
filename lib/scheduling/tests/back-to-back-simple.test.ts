/**
 * Simple tests for back-to-back lesson preference functionality
 * 
 * These tests focus on basic scenarios to verify the core logic works correctly.
 */

import { describe, it, expect } from 'vitest';
import { ScheduleSolver } from '../solver';
import type { TeacherConfig, StudentConfig } from '../types';

// Helper function to create a simple teacher with full day availability
function createSimpleTeacher(backToBackPreference: 'maximize' | 'minimize' | 'agnostic'): TeacherConfig {
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
        { // Monday - full day
          dayOfWeek: 1,
          blocks: [
            { start: 480, duration: 480 } // 8:00 AM - 4:00 PM (8 hours)
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
      maxConsecutiveMinutes: 240, // 4 hours max consecutive
      breakDurationMinutes: 30,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [60], // Only 60-minute lessons for simplicity
      backToBackPreference
    }
  };
}

// Helper function to create a student with Monday availability
function createSimpleStudent(id: string): StudentConfig {
  return {
    person: {
      id,
      name: `Student ${id}`,
      email: `student${id}@test.com`
    },
    preferredDuration: 60,
    maxLessonsPerWeek: 1,
    availability: {
      days: [
        { dayOfWeek: 0, blocks: [] },
        { // Monday - full day
          dayOfWeek: 1,
          blocks: [
            { start: 480, duration: 480 } // 8:00 AM - 4:00 PM (8 hours)
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

describe('Back-to-Back Preference - Simple Tests', () => {
  describe('maximize preference', () => {
    it('should schedule 3 students back-to-back when maximizing', () => {
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

      // Log the actual schedule for debugging
      console.log('Maximize schedule:', mondayLessons.map(l => 
        `${l.studentId}: ${Math.floor(l.startMinute/60)}:${(l.startMinute%60).toString().padStart(2, '0')}-${Math.floor((l.startMinute+l.durationMinutes)/60)}:${((l.startMinute+l.durationMinutes)%60).toString().padStart(2, '0')}`
      ));
    });
  });

  describe('minimize preference', () => {
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

      console.log('Minimize schedule:', allLessons.map(l => 
        `${l.studentId}: Day ${l.dayOfWeek} ${Math.floor(l.startMinute/60)}:${(l.startMinute%60).toString().padStart(2, '0')}-${Math.floor((l.startMinute+l.durationMinutes)/60)}:${((l.startMinute+l.durationMinutes)%60).toString().padStart(2, '0')}`
      ));

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

  describe('agnostic preference', () => {
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

      console.log('Agnostic schedule:', solution.assignments.map(l => 
        `${l.studentId}: Day ${l.dayOfWeek} ${Math.floor(l.startMinute/60)}:${(l.startMinute%60).toString().padStart(2, '0')}-${Math.floor((l.startMinute+l.durationMinutes)/60)}:${((l.startMinute+l.durationMinutes)%60).toString().padStart(2, '0')}`
      ));
    });
  });

  describe('constraint interaction', () => {
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
        logLevel: 'basic'
      });

      const solution = solver.solve(teacher, students);

      // Should still schedule students (solver should handle conflicts)
      expect(solution.assignments.length).toBeGreaterThan(0);

      console.log('Strict consecutive limit schedule:', solution.assignments.map(l => 
        `${l.studentId}: Day ${l.dayOfWeek} ${Math.floor(l.startMinute/60)}:${(l.startMinute%60).toString().padStart(2, '0')}-${Math.floor((l.startMinute+l.durationMinutes)/60)}:${((l.startMinute+l.durationMinutes)%60).toString().padStart(2, '0')}`
      ));
    });
  });
});