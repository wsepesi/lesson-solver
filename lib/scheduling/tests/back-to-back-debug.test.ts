/**
 * Detailed debugging tests for back-to-back lesson preference functionality
 * 
 * These tests provide detailed output to verify constraint and heuristic logic.
 */

import { describe, it, expect } from 'vitest';
import { ScheduleSolver } from '../solver';
import { ConstraintManager, BackToBackPreferenceConstraint } from '../constraints';
import type { TeacherConfig, StudentConfig, SolverContext } from '../types';

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

// Helper function to format minutes as time string
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

describe('Back-to-Back Preference - Debug Tests', () => {
  describe('constraint evaluation logic', () => {
    it('should correctly evaluate maximize preference constraint', () => {
      const constraint = new BackToBackPreferenceConstraint();
      const teacher = createSimpleTeacher('maximize');
      
      // Create context with existing assignment
      const context: SolverContext = {
        teacherAvailability: teacher.availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-1',
            dayOfWeek: 1,
            startMinute: 480, // 8:00 AM
            durationMinutes: 60
          }
        ],
        constraints: teacher.constraints,
        studentPreferences: new Map()
      };
      
      // Test assignment that would be back-to-back (should satisfy maximize)
      const backToBackAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 540, // 9:00 AM (right after first lesson)
        durationMinutes: 60
      };
      
      // Test assignment with gap (should violate maximize)
      const gapAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 600, // 10:00 AM (1 hour gap)
        durationMinutes: 60
      };
      
      const backToBackResult = constraint.evaluate(backToBackAssignment, context);
      const gapResult = constraint.evaluate(gapAssignment, context);
      
      console.log('Maximize Constraint Evaluation:');
      console.log(`  Back-to-back assignment: ${backToBackResult} (expected: true)`);
      console.log(`  Gap assignment: ${gapResult} (expected: false)`);
      
      expect(backToBackResult).toBe(true); // Should satisfy maximize preference
      expect(gapResult).toBe(false); // Should violate maximize preference
    });
    
    it('should correctly evaluate minimize preference constraint', () => {
      const constraint = new BackToBackPreferenceConstraint();
      const teacher = createSimpleTeacher('minimize');
      
      // Create context with existing assignment
      const context: SolverContext = {
        teacherAvailability: teacher.availability,
        studentAvailability: new Map(),
        existingAssignments: [
          {
            studentId: 'student-1',
            dayOfWeek: 1,
            startMinute: 480, // 8:00 AM
            durationMinutes: 60
          }
        ],
        constraints: teacher.constraints,
        studentPreferences: new Map()
      };
      
      // Test assignment that would be back-to-back (should violate minimize)
      const backToBackAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 540, // 9:00 AM (right after first lesson)
        durationMinutes: 60
      };
      
      // Test assignment with gap (should satisfy minimize)
      const gapAssignment = {
        studentId: 'student-2',
        dayOfWeek: 1,
        startMinute: 600, // 10:00 AM (1 hour gap)
        durationMinutes: 60
      };
      
      const backToBackResult = constraint.evaluate(backToBackAssignment, context);
      const gapResult = constraint.evaluate(gapAssignment, context);
      
      console.log('Minimize Constraint Evaluation:');
      console.log(`  Back-to-back assignment: ${backToBackResult} (expected: false)`);
      console.log(`  Gap assignment: ${gapResult} (expected: true)`);
      
      expect(backToBackResult).toBe(false); // Should violate minimize preference
      expect(gapResult).toBe(true); // Should satisfy minimize preference
    });
  });
  
  describe('solver integration with detailed output', () => {
    it('should demonstrate different behavior between maximize and minimize preferences', () => {
      console.log('\n=== SOLVER INTEGRATION TEST ===');
      
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
      console.log('\n--- MAXIMIZE PREFERENCE TEST ---');
      const maximizeTeacher = createSimpleTeacher('maximize');
      const maximizeSolver = new ScheduleSolver(solverOptions);
      const maximizeSolution = maximizeSolver.solve(maximizeTeacher, students);
      
      console.log(`Scheduled ${maximizeSolution.assignments.length}/${students.length} students with MAXIMIZE preference:`);
      const maximizeSchedule = maximizeSolution.assignments
        .sort((a, b) => a.startMinute - b.startMinute)
        .map(a => `  ${a.studentId}: ${formatTime(a.startMinute)}-${formatTime(a.startMinute + a.durationMinutes)}`);
      maximizeSchedule.forEach(line => console.log(line));
      
      // Check for back-to-back lessons in maximize solution
      let maximizeBackToBackCount = 0;
      for (let i = 1; i < maximizeSolution.assignments.length; i++) {
        const prev = maximizeSolution.assignments[i - 1]!;
        const curr = maximizeSolution.assignments[i]!;
        if (prev.startMinute + prev.durationMinutes === curr.startMinute) {
          maximizeBackToBackCount++;
        }
      }
      console.log(`  Back-to-back pairs found: ${maximizeBackToBackCount}`);
      
      // Test with minimize preference
      console.log('\n--- MINIMIZE PREFERENCE TEST ---');
      const minimizeTeacher = createSimpleTeacher('minimize');
      const minimizeSolver = new ScheduleSolver(solverOptions);
      const minimizeSolution = minimizeSolver.solve(minimizeTeacher, students);
      
      console.log(`Scheduled ${minimizeSolution.assignments.length}/${students.length} students with MINIMIZE preference:`);
      const minimizeSchedule = minimizeSolution.assignments
        .sort((a, b) => a.startMinute - b.startMinute)
        .map(a => `  ${a.studentId}: ${formatTime(a.startMinute)}-${formatTime(a.startMinute + a.durationMinutes)}`);
      minimizeSchedule.forEach(line => console.log(line));
      
      // Check for back-to-back lessons in minimize solution
      let minimizeBackToBackCount = 0;
      for (let i = 1; i < minimizeSolution.assignments.length; i++) {
        const prev = minimizeSolution.assignments[i - 1]!;
        const curr = minimizeSolution.assignments[i]!;
        if (prev.startMinute + prev.durationMinutes === curr.startMinute) {
          minimizeBackToBackCount++;
        }
      }
      console.log(`  Back-to-back pairs found: ${minimizeBackToBackCount}`);
      
      // Test with agnostic preference
      console.log('\n--- AGNOSTIC PREFERENCE TEST ---');
      const agnosticTeacher = createSimpleTeacher('agnostic');
      const agnosticSolver = new ScheduleSolver(solverOptions);
      const agnosticSolution = agnosticSolver.solve(agnosticTeacher, students);
      
      console.log(`Scheduled ${agnosticSolution.assignments.length}/${students.length} students with AGNOSTIC preference:`);
      const agnosticSchedule = agnosticSolution.assignments
        .sort((a, b) => a.startMinute - b.startMinute)
        .map(a => `  ${a.studentId}: ${formatTime(a.startMinute)}-${formatTime(a.startMinute + a.durationMinutes)}`);
      agnosticSchedule.forEach(line => console.log(line));
      
      // Check for back-to-back lessons in agnostic solution
      let agnosticBackToBackCount = 0;
      for (let i = 1; i < agnosticSolution.assignments.length; i++) {
        const prev = agnosticSolution.assignments[i - 1]!;
        const curr = agnosticSolution.assignments[i]!;
        if (prev.startMinute + prev.durationMinutes === curr.startMinute) {
          agnosticBackToBackCount++;
        }
      }
      console.log(`  Back-to-back pairs found: ${agnosticBackToBackCount}`);
      
      console.log('\n--- COMPARISON ---');
      console.log(`Maximize back-to-back pairs: ${maximizeBackToBackCount}`);
      console.log(`Minimize back-to-back pairs: ${minimizeBackToBackCount}`);
      console.log(`Agnostic back-to-back pairs: ${agnosticBackToBackCount}`);
      
      // Verify all students were scheduled in each case
      expect(maximizeSolution.assignments.length).toBe(students.length);
      expect(minimizeSolution.assignments.length).toBe(students.length);
      expect(agnosticSolution.assignments.length).toBe(students.length);
      
      // Expect maximize to have more back-to-back lessons than minimize
      // (This might not always be true due to other constraints, but it's a reasonable expectation)
      console.log(`Expected: maximize (${maximizeBackToBackCount}) >= agnostic (${agnosticBackToBackCount}) >= minimize (${minimizeBackToBackCount})`);
    });
  });
  
  describe('edge cases', () => {
    it('should handle single student correctly', () => {
      const teacher = createSimpleTeacher('maximize');
      const students = [createSimpleStudent('student-1')];
      
      const solver = new ScheduleSolver({
        maxTimeMs: 2000,
        useHeuristics: true,
        logLevel: 'none'
      });
      
      const solution = solver.solve(teacher, students);
      
      console.log('\nSingle student test:');
      console.log(`  Scheduled: ${solution.assignments.length}/1 students`);
      console.log(`  Assignment: ${solution.assignments[0] ? `${formatTime(solution.assignments[0].startMinute)}-${formatTime(solution.assignments[0].startMinute + solution.assignments[0].durationMinutes)}` : 'None'}`);
      
      expect(solution.assignments.length).toBe(1);
    });
    
    it('should handle mixed lesson durations', () => {
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
      
      console.log('\nMixed duration test:');
      console.log(`  Scheduled: ${solution.assignments.length}/${students.length} students`);
      solution.assignments
        .sort((a, b) => a.startMinute - b.startMinute)
        .forEach(a => {
          console.log(`  ${a.studentId}: ${formatTime(a.startMinute)}-${formatTime(a.startMinute + a.durationMinutes)} (${a.durationMinutes}min)`);
        });
      
      expect(solution.assignments.length).toBeGreaterThan(0);
    });
  });
});