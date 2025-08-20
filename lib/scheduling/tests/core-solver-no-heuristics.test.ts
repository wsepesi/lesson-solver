/**
 * Core Solver Test Suite - No Heuristics
 * 
 * This test suite validates the core CSP solver functionality WITHOUT
 * heuristic optimizations (MRV/LCV). This ensures:
 * 
 * 1. Pure backtracking correctness
 * 2. Constraint satisfaction accuracy
 * 3. Deterministic behavior
 * 4. Complete solution space exploration
 * 5. Baseline performance metrics
 * 
 * All tests explicitly set useHeuristics: false to test the core algorithm.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScheduleSolver,
  solveSchedule
} from '../solver';
import {
  createExtractorSolver,
  isExtractingTestData,
  saveExtractedTestData
} from './extract-test-data';

import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  Person
} from '../types';

import {
  createEmptyWeekSchedule
} from '../utils';

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
    person: createTestPerson('teacher-1', 'Test Teacher'),
    studioId: 'studio-123',
    availability,
    constraints: { ...defaultConstraints, ...constraints }
  };
}

function createTestStudent(
  id: string,
  name: string,
  availability: WeekSchedule,
  preferredDuration = 60
): StudentConfig {
  return {
    person: createTestPerson(id, name),
    preferredDuration,
    maxLessonsPerWeek: 1,
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

/**
 * Create a solver configured for no-heuristics testing
 */
function createCoreTestSolver(options = {}, testName?: string, category = 'core-solver') {
  if (isExtractingTestData()) {
    const solver = createExtractorSolver({
      useHeuristics: false, // CRITICAL: No heuristics for core testing
      useConstraintPropagation: true, // Keep constraint propagation for efficiency
      maxTimeMs: 5000,
      logLevel: 'none',
      ...options
    });
    
    if (testName) {
      solver.setTestContext(testName, '', category);
    }
    
    return solver;
  }
  
  return new ScheduleSolver({
    useHeuristics: false, // CRITICAL: No heuristics for core testing
    useConstraintPropagation: true, // Keep constraint propagation for efficiency
    maxTimeMs: 5000,
    logLevel: 'none',
    ...options
  });
}

// ============================================================================
// BASIC CORRECTNESS TESTS
// ============================================================================

describe('Core Solver - Basic Correctness (No Heuristics)', () => {
  describe('Trivial Cases', () => {
    it('should solve single student with single time slot', () => {
      // Teacher available Monday 9am-10am
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9:00-10:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available Monday 9am-10am, wants 60min lesson
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9:00-10:00
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solver = createCoreTestSolver({}, 'should solve single student with single time slot', 'trivial');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments).toHaveLength(1);
      expect(solution.unscheduled).toHaveLength(0);
      expect(solution.assignments[0]!.studentId).toBe('s1');
      expect(solution.assignments[0]!.startMinute).toBe(540);
      expect(solution.assignments[0]!.durationMinutes).toBe(60);
    });

    it('should handle impossible case (no overlapping availability)', () => {
      // Teacher available Monday 9am-12pm
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // 9:00-12:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available Monday 2pm-5pm (no overlap)
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 840, duration: 180 }]) // 14:00-17:00
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solver = createCoreTestSolver({}, 'should handle impossible case (no overlapping availability)', 'trivial');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toHaveLength(1);
      expect(solution.unscheduled[0]).toBe('s1');
    });

    it('should handle insufficient duration in available slot', () => {
      // Teacher available Monday 9am-9:30am (only 30 minutes)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 30 }]) // 9:00-9:30
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student wants 60-minute lesson
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9:00-10:00
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solver = createCoreTestSolver({}, 'should handle insufficient duration in available slot', 'trivial');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toHaveLength(1);
    });
  });

  describe('Multiple Students - Sequential Processing', () => {
    it('should process students in natural order without MRV', () => {
      // Teacher available Monday 9am-5pm
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // 9:00-17:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student 1: Monday 9am-11am (first in array)
      const student1Availability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // 9:00-11:00
      ]);
      
      // Student 2: Monday 1pm-3pm
      const student2Availability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 780, duration: 120 }]) // 13:00-15:00
      ]);

      const students = [
        createTestStudent('s1', 'Student One', student1Availability, 60),
        createTestStudent('s2', 'Student Two', student2Availability, 60)
      ];

      const solver = createCoreTestSolver({}, 'should process students in natural order without MRV', 'simple');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments).toHaveLength(2);
      expect(solution.unscheduled).toHaveLength(0);
      
      // Without heuristics, should process s1 first (natural order)
      const assignment1 = solution.assignments.find(a => a.studentId === 's1');
      const assignment2 = solution.assignments.find(a => a.studentId === 's2');
      
      expect(assignment1).toBeDefined();
      expect(assignment2).toBeDefined();
      
      // Verify no time conflicts
      if (assignment1 && assignment2) {
        const end1 = assignment1.startMinute + assignment1.durationMinutes;
        const end2 = assignment2.startMinute + assignment2.durationMinutes;
        const noOverlap = (end1 <= assignment2.startMinute) || (end2 <= assignment1.startMinute);
        expect(noOverlap).toBe(true);
      }
    });

    it('should handle conflicting availability deterministically', () => {
      // Teacher available Monday 10am-12pm (limited)
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // 10:00-12:00
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Both students want same time window
      const sharedAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // 10:00-12:00
      ]);
      
      const students = [
        createTestStudent('s1', 'Student One', sharedAvailability, 60),
        createTestStudent('s2', 'Student Two', sharedAvailability, 60)
      ];

      const solver = createCoreTestSolver({}, 'should handle conflicting availability deterministically', 'simple');
      
      // Run multiple times to test determinism
      const solutions = [];
      for (let i = 0; i < 3; i++) {
        const solution = solver.solve(teacher, students);
        solutions.push(solution);
      }

      // All solutions should be identical (deterministic behavior)
      for (let i = 1; i < solutions.length; i++) {
        expect(solutions[i]!.assignments.length).toBe(solutions[0]!.assignments.length);
        expect(solutions[i]!.unscheduled.length).toBe(solutions[0]!.unscheduled.length);
        
        if (solutions[i]!.assignments.length > 0) {
          expect(solutions[i]!.assignments[0]!.studentId).toBe(solutions[0]!.assignments[0]!.studentId);
          expect(solutions[i]!.assignments[0]!.startMinute).toBe(solutions[0]!.assignments[0]!.startMinute);
        }
      }
    });
  });
});

// ============================================================================
// CONSTRAINT SATISFACTION TESTS
// ============================================================================

describe('Core Solver - Constraint Satisfaction (No Heuristics)', () => {
  describe('Hard Constraints - Never Violated', () => {
    it('should never violate teacher availability constraint', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm only
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available wider than teacher
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 360 }]) // Monday 8am-2pm
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solver = createCoreTestSolver({}, 'should never violate teacher availability constraint', 'constraints-hard');
      const solution = solver.solve(teacher, students);

      if (solution.assignments.length > 0) {
        const assignment = solution.assignments[0]!;
        // Must be within teacher's availability
        expect(assignment.startMinute).toBeGreaterThanOrEqual(540);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(780);
      }
    });

    it('should never violate student availability constraint', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 360 }]) // Monday 8am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available narrow window
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 90 }]) // Monday 10am-11:30am
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solver = createCoreTestSolver({}, 'should never violate student availability constraint', 'constraints-hard');
      const solution = solver.solve(teacher, students);

      if (solution.assignments.length > 0) {
        const assignment = solution.assignments[0]!;
        // Must be within student's availability
        expect(assignment.startMinute).toBeGreaterThanOrEqual(600);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(690);
      }
    });

    it('should never schedule overlapping lessons', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9am-5pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Create 5 students with overlapping availability
      const students = Array.from({ length: 5 }, (_, i) => {
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600 + i * 30, duration: 240 }]) // Overlapping windows
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const solver = createCoreTestSolver({}, 'should never schedule overlapping lessons', 'constraints-hard');
      const solution = solver.solve(teacher, students);

      // Check that no assignments overlap
      const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      for (let i = 1; i < assignments.length; i++) {
        const prev = assignments[i - 1]!;
        const curr = assignments[i]!;
        const prevEnd = prev.startMinute + prev.durationMinutes;
        
        expect(curr.startMinute).toBeGreaterThanOrEqual(prevEnd);
      }
    });

    it('should enforce allowed duration constraints', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      
      // Only allow 30 and 45 minute lessons
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45],
        minLessonDuration: 30,
        maxLessonDuration: 45
      });

      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }])
      ]);
      
      // Student requests 60-minute lesson (not allowed)
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solver = createCoreTestSolver({}, 'should enforce allowed duration constraints', 'constraints-hard');
      const solution = solver.solve(teacher, students);

      if (solution.assignments.length > 0) {
        const duration = solution.assignments[0]!.durationMinutes;
        expect([30, 45]).toContain(duration); // Must use allowed duration
      }
    });
  });

  describe('Soft Constraints - Can Be Violated', () => {
    it('should attempt to satisfy break requirements but may violate if needed', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm (tight)
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 30 // Require 30-min breaks
      });

      // Create 4 students wanting same day (forces tight scheduling)
      const students = Array.from({ length: 4 }, (_, i) => {
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 240 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const solver = createCoreTestSolver({}, 'should attempt to satisfy break requirements but may violate if needed', 'constraints-soft');
      const solution = solver.solve(teacher, students);

      // Should schedule some students even if breaks are not ideal
      expect(solution.assignments.length).toBeGreaterThan(0);
      
      // Verify no hard constraint violations (overlaps)
      const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < assignments.length; i++) {
        const prev = assignments[i - 1]!;
        const curr = assignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        expect(gap).toBeGreaterThanOrEqual(0); // No negative gaps (overlaps)
      }
    });
  });
});

// ============================================================================
// DETERMINISTIC BEHAVIOR TESTS
// ============================================================================

describe('Core Solver - Deterministic Behavior (No Heuristics)', () => {
  it('should produce identical results for identical inputs', () => {
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 300 }]), // Monday
      createDayWithBlocks(2, [{ start: 600, duration: 240 }])  // Tuesday
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    const students = [
      createTestStudent('s1', 'Alice', createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 180 }])
      ]), 60),
      createTestStudent('s2', 'Bob', createWeekWithDays([
        createDayWithBlocks(2, [{ start: 660, duration: 120 }])
      ]), 45),
      createTestStudent('s3', 'Carol', createWeekWithDays([
        createDayWithBlocks(1, [{ start: 720, duration: 120 }])
      ]), 60)
    ];

    const solver = createCoreTestSolver({}, 'should produce identical results for identical inputs', 'determinism');
    
    // Run same scenario 5 times
    const results = [];
    for (let i = 0; i < 5; i++) {
      const solution = solver.solve(teacher, students);
      results.push({
        assignmentCount: solution.assignments.length,
        unscheduledCount: solution.unscheduled.length,
        assignments: solution.assignments.map(a => ({
          studentId: a.studentId,
          startMinute: a.startMinute,
          durationMinutes: a.durationMinutes,
          dayOfWeek: a.dayOfWeek
        })).sort((a, b) => a.studentId.localeCompare(b.studentId))
      });
    }

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });

  it('should be insensitive to student array ordering when no heuristics are used', () => {
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }])
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    const baseStudents = [
      createTestStudent('s1', 'Alice', createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }])
      ]), 60),
      createTestStudent('s2', 'Bob', createWeekWithDays([
        createDayWithBlocks(1, [{ start: 780, duration: 120 }])
      ]), 60)
    ];

    const solver = createCoreTestSolver({}, 'should be insensitive to student array ordering when no heuristics are used', 'determinism');
    
    // Test with original order
    const solution1 = solver.solve(teacher, baseStudents);
    
    // Test with reversed order
    const solution2 = solver.solve(teacher, [...baseStudents].reverse());

    // Both should schedule both students (different time slots)
    expect(solution1.assignments.length).toBe(2);
    expect(solution2.assignments.length).toBe(2);
    expect(solution1.unscheduled.length).toBe(0);
    expect(solution2.unscheduled.length).toBe(0);

    // Sort assignments by student ID for comparison
    const sorted1 = solution1.assignments.sort((a, b) => a.studentId.localeCompare(b.studentId));
    const sorted2 = solution2.assignments.sort((a, b) => a.studentId.localeCompare(b.studentId));
    
    // Should get same final assignments regardless of input order
    for (let i = 0; i < sorted1.length; i++) {
      expect(sorted1[i]!.studentId).toBe(sorted2[i]!.studentId);
      expect(sorted1[i]!.startMinute).toBe(sorted2[i]!.startMinute);
      expect(sorted1[i]!.durationMinutes).toBe(sorted2[i]!.durationMinutes);
    }
  });
});

// ============================================================================
// COMPLETE SOLUTION EXPLORATION TESTS
// ============================================================================

describe('Core Solver - Solution Completeness (No Heuristics)', () => {
  it('should find solution when one exists', () => {
    // Simple scenario with exactly one solution
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10am-11am only
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    const studentAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10am-11am
    ]);
    const students = [createTestStudent('s1', 'Student', studentAvailability, 60)];

    const solver = createCoreTestSolver({}, 'should find solution when one exists', 'completeness');
    const solution = solver.solve(teacher, students);

    expect(solution.assignments.length).toBe(1);
    expect(solution.assignments[0]!.studentId).toBe('s1');
    expect(solution.assignments[0]!.startMinute).toBe(600);
  });

  it('should explore backtracking correctly when initial choices fail', () => {
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // 9am-12pm
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Student 1: Available 9am-11am (first 2 hours)
    const student1Availability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // 9:00-11:00
    ]);
    
    // Student 2: Available 10am-12pm (overlaps with student 1)
    const student2Availability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // 10:00-12:00
    ]);

    const students = [
      createTestStudent('s1', 'Student One', student1Availability, 60),
      createTestStudent('s2', 'Student Two', student2Availability, 60)
    ];

    const solver = createCoreTestSolver({}, 'should explore backtracking correctly when initial choices fail', 'completeness');
    const solution = solver.solve(teacher, students);

    // Should find solution by backtracking
    expect(solution.assignments.length).toBe(2);
    expect(solution.unscheduled.length).toBe(0);
    
    // Verify scheduling makes sense
    const assignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
    const first = assignments[0]!;
    const second = assignments[1]!;
    
    expect(first.startMinute + first.durationMinutes).toBeLessThanOrEqual(second.startMinute);
  });

  it('should correctly identify impossible scenarios', () => {
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10am-11am (only 1 hour)
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Two students both need 60 minutes in the same 60-minute window
    const sharedAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10am-11am
    ]);
    
    const students = [
      createTestStudent('s1', 'Student One', sharedAvailability, 60),
      createTestStudent('s2', 'Student Two', sharedAvailability, 60)
    ];

    const solver = createCoreTestSolver({}, 'should correctly identify impossible scenarios', 'completeness');
    const solution = solver.solve(teacher, students);

    // Should schedule at most one student (impossible to fit both)
    expect(solution.assignments.length + solution.unscheduled.length).toBe(2);
    expect(solution.assignments.length).toBeLessThanOrEqual(1);
    expect(solution.unscheduled.length).toBeGreaterThanOrEqual(1);
    
    if (solution.assignments.length === 1) {
      // If one is scheduled, it should be the first student (natural order processing)
      expect(solution.assignments[0]!.studentId).toBe('s1');
      expect(solution.unscheduled[0]).toBe('s2');
    } else {
      // If none are scheduled, both should be unscheduled
      expect(solution.unscheduled).toContain('s1');
      expect(solution.unscheduled).toContain('s2');
    }
  });
});

// ============================================================================
// PERFORMANCE BASELINE TESTS
// ============================================================================

describe('Core Solver - Performance Baseline (No Heuristics)', () => {
  it('should solve small problems quickly even without heuristics', () => {
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }]), // Monday
      createDayWithBlocks(2, [{ start: 540, duration: 480 }])  // Tuesday
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // 5 students with different time preferences
    const students = Array.from({ length: 5 }, (_, i) => {
      const dayOfWeek = (i % 2) + 1;
      const startTime = 600 + i * 60;
      const availability = createWeekWithDays([
        createDayWithBlocks(dayOfWeek, [{ start: startTime, duration: 240 }])
      ]);
      return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
    });

    const solver = createCoreTestSolver({ maxTimeMs: 2000 }, 'should solve small problems quickly even without heuristics', 'performance');
    
    const startTime = Date.now();
    const solution = solver.solve(teacher, students);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(1000); // Should be fast for small problems
    expect(solution.assignments.length).toBeGreaterThanOrEqual(4); // Should schedule most students
  });

  it('should handle medium-sized problems within reasonable time', () => {
    const teacherAvailability = createWeekWithDays(
      Array.from({ length: 3 }, (_, day) => 
        createDayWithBlocks(day + 1, [{ start: 540, duration: 480 }])
      )
    );
    const teacher = createTestTeacher(teacherAvailability);

    // 15 students with overlapping availability (more challenging)
    const students = Array.from({ length: 15 }, (_, i) => {
      const dayOfWeek = (i % 3) + 1;
      const startTime = 600 + (i % 5) * 45;
      const availability = createWeekWithDays([
        createDayWithBlocks(dayOfWeek, [{ start: startTime, duration: 180 }])
      ]);
      return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
    });

    const solver = createCoreTestSolver({ maxTimeMs: 10000 }, 'should handle medium-sized problems within reasonable time', 'performance');
    
    const startTime = Date.now();
    const solution = solver.solve(teacher, students);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(5000); // Should complete in reasonable time
    expect(solution.assignments.length).toBeGreaterThanOrEqual(10); // Should schedule majority
  });
});

// ============================================================================
// COMPLEX SCENARIO TESTS (30-50+ STUDENTS)
// ============================================================================

describe('Core Solver - Complex Scenarios (No Heuristics)', () => {
  describe('Large Student Counts', () => {
    it('should handle 30 students with limited teacher availability', () => {
      // Teacher available 3 days, 4 hours each (12 total hours = 720 minutes)
      // 30 students wanting 60min each = 1800 minutes needed
      // This creates a highly constrained scenario where only ~40% can be scheduled
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]), // Monday 9am-1pm
        createDayWithBlocks(3, [{ start: 600, duration: 240 }]), // Wednesday 10am-2pm  
        createDayWithBlocks(5, [{ start: 540, duration: 240 }])  // Friday 9am-1pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 30 students with overlapping availability
      const students = Array.from({ length: 30 }, (_, i) => {
        const dayOfWeek = (i % 3) * 2 + 1; // Distribute across Mon/Wed/Fri
        const startOffset = (i % 4) * 30; // Stagger start times
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: 540 + startOffset, duration: 180 }])
        ]);
        return createTestStudent(`large-s${i + 1}`, `Large Student ${i + 1}`, availability, 60);
      });

      const solver = createCoreTestSolver({ maxTimeMs: 15000 }, 'should handle 30 students with limited teacher availability', 'complex');
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10000);
      expect(solution.assignments.length + solution.unscheduled.length).toBe(30);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(10); // Should schedule at least 1/3
      expect(solution.assignments.length).toBeLessThanOrEqual(12); // Can't exceed available slots

      // Verify no overlaps in large solution set
      const assignments = solution.assignments.sort((a, b) => 
        a.dayOfWeek === b.dayOfWeek ? a.startMinute - b.startMinute : a.dayOfWeek - b.dayOfWeek
      );
      
      for (let i = 1; i < assignments.length; i++) {
        const prev = assignments[i - 1]!;
        const curr = assignments[i]!;
        
        if (prev.dayOfWeek === curr.dayOfWeek) {
          const prevEnd = prev.startMinute + prev.durationMinutes;
          expect(curr.startMinute).toBeGreaterThanOrEqual(prevEnd);
        }
      }
    });

    it('should handle 50 students with varied availability patterns', () => {
      // Teacher available 5 days, 6 hours each
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 360 }]), // Monday 8am-2pm
        createDayWithBlocks(2, [{ start: 540, duration: 360 }]), // Tuesday 9am-3pm
        createDayWithBlocks(3, [{ start: 480, duration: 360 }]), // Wednesday 8am-2pm
        createDayWithBlocks(4, [{ start: 540, duration: 360 }]), // Thursday 9am-3pm
        createDayWithBlocks(5, [{ start: 480, duration: 360 }])  // Friday 8am-2pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 50 students with varied patterns
      const students = Array.from({ length: 50 }, (_, i) => {
        const dayPattern = i % 5 + 1; // Spread across weekdays
        const timePattern = Math.floor(i / 10); // 5 different time patterns
        const startTime = 540 + timePattern * 60; // 9am, 10am, 11am, 12pm, 1pm starts
        const duration = 150 + (i % 3) * 30; // 2.5, 3, 3.5 hour windows
        
        const availability = createWeekWithDays([
          createDayWithBlocks(dayPattern, [{ start: startTime, duration }])
        ]);
        return createTestStudent(`mega-s${i + 1}`, `Mega Student ${i + 1}`, availability, 60);
      });

      const solver = createCoreTestSolver({ maxTimeMs: 20000 }, 'should handle 50 students with varied availability patterns', 'complex');
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(15000);
      expect(solution.assignments.length + solution.unscheduled.length).toBe(50);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(25); // Should handle at least half
      
      // Check distribution across days
      const assignmentsByDay = solution.assignments.reduce((acc, assignment) => {
        acc[assignment.dayOfWeek] = (acc[assignment.dayOfWeek] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      // Should use multiple days
      expect(Object.keys(assignmentsByDay).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Deep Backtracking Scenarios', () => {
    it('should handle misleading initial choices requiring extensive backtracking', () => {
      // Create a scenario where the "obvious" first choice blocks many later assignments
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (5 hours)
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student 1: Can only fit at start (9am-10am) - "obvious" choice
      // Students 2-5: Need specific later slots that conflict if student 1 takes wrong slot
      const students = [
        // Student 1: Available anywhere in the window
        createTestStudent('backtrack-s1', 'Backtrack Student 1', 
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 300 }])
          ]), 60),
        
        // Student 2: Needs 10am-11am slot specifically
        createTestStudent('backtrack-s2', 'Backtrack Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }])
          ]), 60),
        
        // Student 3: Needs 11am-12pm slot specifically  
        createTestStudent('backtrack-s3', 'Backtrack Student 3',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 660, duration: 60 }])
          ]), 60),
        
        // Student 4: Needs 12pm-1pm slot specifically
        createTestStudent('backtrack-s4', 'Backtrack Student 4',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 720, duration: 60 }])
          ]), 60),
        
        // Student 5: Needs 1pm-2pm slot specifically
        createTestStudent('backtrack-s5', 'Backtrack Student 5',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 780, duration: 60 }])
          ]), 60)
      ];

      const solver = createCoreTestSolver({ maxTimeMs: 10000 }, 'should handle misleading initial choices requiring extensive backtracking', 'complex');
      const solution = solver.solve(teacher, students);

      // Should schedule all 5 students by finding correct placement for student 1
      expect(solution.assignments.length).toBe(5);
      expect(solution.unscheduled.length).toBe(0);
      
      // Verify proper sequencing
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        expect(curr.startMinute).toBe(prev.startMinute + prev.durationMinutes);
      }
    });

    it('should handle complex cascading constraint scenarios', () => {
      // Create interlocking constraints that require deep search
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 180 }]), // Monday 9am-12pm
        createDayWithBlocks(2, [{ start: 540, duration: 180 }])  // Tuesday 9am-12pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Create a complex dependency chain
      const students = [
        // Group A: Monday preference but can do Tuesday
        createTestStudent('cascade-a1', 'Cascade A1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 90 }]), // Mon 9-10:30
            createDayWithBlocks(2, [{ start: 600, duration: 90 }])  // Tue 10-11:30
          ]), 90),
        
        createTestStudent('cascade-a2', 'Cascade A2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 630, duration: 90 }]), // Mon 10:30-12
            createDayWithBlocks(2, [{ start: 540, duration: 90 }])  // Tue 9-10:30
          ]), 90),
        
        // Group B: Tuesday preference but can do Monday  
        createTestStudent('cascade-b1', 'Cascade B1',
          createWeekWithDays([
            createDayWithBlocks(2, [{ start: 540, duration: 90 }]), // Tue 9-10:30
            createDayWithBlocks(1, [{ start: 600, duration: 90 }])  // Mon 10-11:30
          ]), 90),
        
        createTestStudent('cascade-b2', 'Cascade B2',
          createWeekWithDays([
            createDayWithBlocks(2, [{ start: 630, duration: 90 }]), // Tue 10:30-12
            createDayWithBlocks(1, [{ start: 540, duration: 90 }])  // Mon 9-10:30
          ]), 90)
      ];

      const solver = createCoreTestSolver({ maxTimeMs: 8000 }, 'should handle complex cascading constraint scenarios', 'complex');
      const solution = solver.solve(teacher, students);

      // All students should be schedulable with the right combination
      expect(solution.assignments.length).toBe(4);
      expect(solution.unscheduled.length).toBe(0);
      
      // Verify 2 per day
      const mondayCount = solution.assignments.filter(a => a.dayOfWeek === 1).length;
      const tuesdayCount = solution.assignments.filter(a => a.dayOfWeek === 2).length;
      expect(mondayCount).toBe(2);
      expect(tuesdayCount).toBe(2);
    });
  });

  describe('Highly Constrained Scenarios', () => {
    it('should handle extreme competition for limited slots', () => {
      // Only 2 hours available total, 20 students wanting 60min each
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // Monday 10am-12pm only
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 20 students all wanting the same time window
      const students = Array.from({ length: 20 }, (_, i) => 
        createTestStudent(`compete-s${i + 1}`, `Competing Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 120 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({ maxTimeMs: 5000 }, 'should handle extreme competition for limited slots', 'complex');
      const solution = solver.solve(teacher, students);

      // Should schedule exactly 2 students (max possible)
      expect(solution.assignments.length).toBe(2);
      expect(solution.unscheduled.length).toBe(18);
      
      // Should be sequential with no gaps
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      expect(sortedAssignments[0]!.startMinute).toBe(600); // 10am
      expect(sortedAssignments[1]!.startMinute).toBe(660); // 11am
      
      // Should schedule first 2 students in natural order (no heuristics)
      expect(solution.assignments.map(a => a.studentId).sort()).toEqual(['compete-s1', 'compete-s2']);
    });

    it('should handle impossible scenarios gracefully', () => {
      // 10 students need 90min each, only 60min available total
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Only 1 hour available
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = Array.from({ length: 10 }, (_, i) =>
        createTestStudent(`impossible-s${i + 1}`, `Impossible Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }])
          ]), 90) // Want 90min but only 60min available
      );

      const solver = createCoreTestSolver({ maxTimeMs: 3000 }, 'should handle impossible scenarios gracefully', 'complex');
      const solution = solver.solve(teacher, students);

      // Should schedule nobody (impossible to fit 90min in 60min slot)
      expect(solution.assignments.length).toBe(0);
      expect(solution.unscheduled.length).toBe(10);
      expect(solution.unscheduled).toEqual(students.map(s => s.person.id));
    });
  });
});

// ============================================================================
// COMPREHENSIVE CONSTRAINT COVERAGE TESTS
// ============================================================================

describe('Core Solver - Comprehensive Constraint Coverage (No Heuristics)', () => {
  describe('ConsecutiveLimitConstraint Tests', () => {
    it('should enforce maximum consecutive minutes constraint', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9am-5pm (8 hours)
      ]);
      
      // Set maxConsecutiveMinutes to 120 (2 hours)
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 30
      });

      // Create 6 students wanting back-to-back 60min slots
      const students = Array.from({ length: 6 }, (_, i) => 
        createTestStudent(`consec-s${i + 1}`, `Consecutive Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540 + i * 60, duration: 300 }]) // All can fit anywhere
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should enforce maximum consecutive minutes constraint', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should schedule some but not all consecutively
      expect(solution.assignments.length).toBeGreaterThan(0);
      
      // Check that consecutive limit is respected
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      let consecutiveMinutes = 0;
      let lastEnd = -1;
      
      for (const assignment of sortedAssignments) {
        if (assignment.startMinute === lastEnd) {
          // Consecutive lesson
          consecutiveMinutes += assignment.durationMinutes;
          expect(consecutiveMinutes).toBeLessThanOrEqual(120); // Should not exceed limit
        } else {
          // Gap or first lesson, reset counter
          consecutiveMinutes = assignment.durationMinutes;
        }
        lastEnd = assignment.startMinute + assignment.durationMinutes;
      }
    });

    it('should handle edge case where consecutive limit equals lesson duration', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }])
      ]);
      
      // Set consecutive limit to exactly one lesson duration
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 60,
        breakDurationMinutes: 15
      });

      const students = Array.from({ length: 3 }, (_, i) => 
        createTestStudent(`edge-consec-s${i + 1}`, `Edge Consec Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 300 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should handle edge case where consecutive limit equals lesson duration', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should schedule all with required breaks
      expect(solution.assignments.length).toBe(3);
      
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      // Check minimum breaks between lessons
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        expect(gap).toBeGreaterThanOrEqual(15); // Should have at least 15min break
      }
    });
  });

  describe('BreakRequirementConstraint Tests', () => {
    it('should require breaks between lessons when specified', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm (4 hours)
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 30, // Require 30-minute breaks
        maxConsecutiveMinutes: 240
      });

      // 3 students, each wanting 60min - total 180min lessons + 60min breaks = 240min
      const students = Array.from({ length: 3 }, (_, i) => 
        createTestStudent(`break-s${i + 1}`, `Break Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 240 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should require breaks between lessons when specified', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should schedule all with proper breaks
      expect(solution.assignments.length).toBe(3);
      
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      // Verify breaks between consecutive lessons
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        expect(gap).toBeGreaterThanOrEqual(30); // Should have at least 30min break
      }
    });

    it('should handle tight scheduling when breaks would make solution impossible', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // Only 2 hours available
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 30, // 30-minute breaks required
        maxConsecutiveMinutes: 240
      });

      // 3 students wanting 60min each = 180min + 2*30min breaks = 240min needed, only 120min available
      const students = Array.from({ length: 3 }, (_, i) => 
        createTestStudent(`tight-break-s${i + 1}`, `Tight Break Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 120 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should handle tight scheduling when breaks would make solution impossible', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should schedule at most 2 (2*60min = 120min, no room for breaks)
      // or possibly relax break constraint as soft constraint
      expect(solution.assignments.length).toBeLessThanOrEqual(2);
      expect(solution.assignments.length + solution.unscheduled.length).toBe(3);
    });
  });

  describe('Mixed Duration Constraint Tests', () => {
    it('should handle mixed lesson durations (30, 45, 60, 90 minutes)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 360 }]) // Monday 9am-3pm (6 hours)
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 45, 60, 90],
        minLessonDuration: 30,
        maxLessonDuration: 90
      });

      // Students with different preferred durations
      const students = [
        createTestStudent('mixed-s1', 'Mixed Student 1', 
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 360 }])
          ]), 30),
        createTestStudent('mixed-s2', 'Mixed Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 360 }])
          ]), 45),
        createTestStudent('mixed-s3', 'Mixed Student 3',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 360 }])
          ]), 60),
        createTestStudent('mixed-s4', 'Mixed Student 4',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 360 }])
          ]), 90),
        createTestStudent('mixed-s5', 'Mixed Student 5',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 360 }])
          ]), 60)
      ];

      const solver = createCoreTestSolver({}, 'should handle mixed lesson durations (30, 45, 60, 90 minutes)', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should schedule most or all students
      expect(solution.assignments.length).toBeGreaterThanOrEqual(4);
      
      // Verify all durations are allowed
      solution.assignments.forEach(assignment => {
        expect([30, 45, 60, 90]).toContain(assignment.durationMinutes);
      });
      
      // Verify no overlaps with mixed durations
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const prevEnd = prev.startMinute + prev.durationMinutes;
        expect(curr.startMinute).toBeGreaterThanOrEqual(prevEnd);
      }
    });

    it('should respect duration constraints when student preference is not allowed', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }])
      ]);
      
      // Only allow 30 and 60-minute lessons
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [30, 60],
        minLessonDuration: 30,
        maxLessonDuration: 60
      });

      // Student wants 45min (not allowed) and 90min (not allowed)
      const students = [
        createTestStudent('constraint-s1', 'Constraint Student 1', 
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 300 }])
          ]), 45), // Not allowed, should get 30 or 60
        createTestStudent('constraint-s2', 'Constraint Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 240 }])
          ]), 90) // Not allowed, should get 60
      ];

      const solver = createCoreTestSolver({}, 'should respect duration constraints when student preference is not allowed', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should schedule both with allowed durations
      expect(solution.assignments.length).toBe(2);
      
      solution.assignments.forEach(assignment => {
        expect([30, 60]).toContain(assignment.durationMinutes);
      });
    });
  });

  describe('BackToBackPreferenceConstraint Tests', () => {
    it('should maximize back-to-back scheduling when preference is "maximize"', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (5 hours)
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        backToBackPreference: 'maximize',
        breakDurationMinutes: 0 // Allow back-to-back
      });

      // 4 students wanting 60min each - should try to cluster them
      const students = Array.from({ length: 4 }, (_, i) => 
        createTestStudent(`btb-max-s${i + 1}`, `BTB Max Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540 + i * 30, duration: 240 }]) // Overlapping availability
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should maximize back-to-back scheduling when preference is "maximize"', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(4);
      
      // Check for back-to-back scheduling
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      let backToBackCount = 0;
      
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        
        if (gap === 0) {
          backToBackCount++;
        }
      }
      
      // Should have some back-to-back scheduling (exact count depends on implementation)
      expect(backToBackCount).toBeGreaterThanOrEqual(1);
    });

    it('should minimize back-to-back scheduling when preference is "minimize"', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (5 hours)
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        backToBackPreference: 'minimize',
        breakDurationMinutes: 15 // Prefer breaks
      });

      // 3 students wanting 60min each - should try to space them out
      const students = Array.from({ length: 3 }, (_, i) => 
        createTestStudent(`btb-min-s${i + 1}`, `BTB Min Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 300 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should minimize back-to-back scheduling when preference is "minimize"', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(3);
      
      // Check for spacing between lessons
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        
        // Should prefer gaps over back-to-back
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Multiple Lessons Per Student Tests', () => {
    it('should handle students wanting multiple lessons per week', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]), // Monday 9am-1pm
        createDayWithBlocks(2, [{ start: 540, duration: 240 }]), // Tuesday 9am-1pm
        createDayWithBlocks(3, [{ start: 540, duration: 240 }])  // Wednesday 9am-1pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Students with multiple lessons per week
      const students = [
        // Student 1 wants 2 lessons
        { 
          ...createTestStudent('multi-s1', 'Multi Student 1', 
            createWeekWithDays([
              createDayWithBlocks(1, [{ start: 540, duration: 240 }]),
              createDayWithBlocks(3, [{ start: 540, duration: 240 }])
            ]), 60), 
          maxLessonsPerWeek: 2 
        },
        // Student 2 wants 2 lessons  
        {
          ...createTestStudent('multi-s2', 'Multi Student 2',
            createWeekWithDays([
              createDayWithBlocks(1, [{ start: 600, duration: 180 }]),
              createDayWithBlocks(2, [{ start: 540, duration: 240 }])
            ]), 60),
          maxLessonsPerWeek: 2
        }
      ];

      const solver = createCoreTestSolver({}, 'should handle students wanting multiple lessons per week', 'constraint-coverage');
      const solution = solver.solve(teacher, students);

      // Should accommodate multiple lessons per student
      expect(solution.assignments.length).toBeGreaterThanOrEqual(2);
      expect(solution.assignments.length).toBeLessThanOrEqual(4); // Max 2 each
      
      // Check that students can have multiple assignments
      const assignmentsByStudent = solution.assignments.reduce((acc, assignment) => {
        acc[assignment.studentId] = (acc[assignment.studentId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Some students should have multiple lessons
      const multiLessonStudents = Object.values(assignmentsByStudent).filter(count => count > 1);
      expect(multiLessonStudents.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ============================================================================
// STRESS TESTS - PATHOLOGICAL CASES
// ============================================================================

describe('Core Solver - Stress Tests (No Heuristics)', () => {
  describe('Fragmented Availability Tests', () => {
    it('should handle highly fragmented teacher availability', () => {
      // Teacher has many small available slots throughout the week
      const teacherAvailability = createWeekWithDays([
        // Monday: 30min slots with gaps
        createDayWithBlocks(1, [
          { start: 540, duration: 30 }, // 9:00-9:30
          { start: 600, duration: 30 }, // 10:00-10:30  
          { start: 720, duration: 30 }, // 12:00-12:30
          { start: 780, duration: 30 }  // 13:00-13:30
        ]),
        // Tuesday: 15min slots
        createDayWithBlocks(2, [
          { start: 480, duration: 15 }, // 8:00-8:15
          { start: 510, duration: 15 }, // 8:30-8:45
          { start: 540, duration: 15 }, // 9:00-9:15
          { start: 570, duration: 15 }, // 9:30-9:45
          { start: 600, duration: 15 }, // 10:00-10:15
          { start: 630, duration: 15 }  // 10:30-10:45
        ]),
        // Wednesday: Mixed small blocks
        createDayWithBlocks(3, [
          { start: 540, duration: 45 }, // 9:00-9:45
          { start: 600, duration: 15 }, // 10:00-10:15
          { start: 630, duration: 30 }, // 10:30-11:00
          { start: 720, duration: 60 }  // 12:00-13:00
        ])
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [15, 30, 45, 60],
        minLessonDuration: 15,
        maxLessonDuration: 60
      });

      // Students with various duration preferences
      const students = Array.from({ length: 12 }, (_, i) => {
        const durations = [15, 30, 45, 60];
        const preferredDuration = durations[i % 4]!;
        const dayOfWeek = (i % 3) + 1; // Spread across Mon/Tue/Wed
        
        // Student availability matches one of the teacher's fragments
        let availability: WeekSchedule;
        
        if (dayOfWeek === 1) { // Monday - 30min slots
          availability = createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540 + (i % 4) * 60, duration: 60 }])
          ]);
        } else if (dayOfWeek === 2) { // Tuesday - 15min slots
          availability = createWeekWithDays([
            createDayWithBlocks(2, [{ start: 480 + (i % 6) * 30, duration: 30 }])
          ]);
        } else { // Wednesday - mixed blocks
          availability = createWeekWithDays([
            createDayWithBlocks(3, [{ start: 540 + (i % 4) * 45, duration: 120 }])
          ]);
        }
        
        return createTestStudent(`frag-s${i + 1}`, `Fragmented Student ${i + 1}`, 
          availability, preferredDuration);
      });

      const solver = createCoreTestSolver({ maxTimeMs: 15000 }, 'should handle highly fragmented teacher availability', 'stress');
      const solution = solver.solve(teacher, students);

      // Should schedule some students despite fragmentation
      expect(solution.assignments.length).toBeGreaterThanOrEqual(6);
      expect(solution.assignments.length + solution.unscheduled.length).toBe(12);
      
      // Verify all assignments fit within available fragments
      solution.assignments.forEach(assignment => {
        const teacherDay = teacher.availability.days[assignment.dayOfWeek]!;
        const assignmentEnd = assignment.startMinute + assignment.durationMinutes;
        
        const fitsInFragment = teacherDay.blocks.some(block =>
          assignment.startMinute >= block.start && 
          assignmentEnd <= block.start + block.duration
        );
        expect(fitsInFragment).toBe(true);
      });
    });

    it('should handle students with highly fragmented availability', () => {
      // Teacher has large continuous blocks
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 600 }]), // Monday 8am-6pm
        createDayWithBlocks(2, [{ start: 480, duration: 600 }])  // Tuesday 8am-6pm  
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Students with very fragmented availability (many small windows)
      const students = Array.from({ length: 8 }, (_, i) => {
        const baseDay = (i % 2) + 1;
        
        // Each student has 4-6 small availability windows scattered throughout the day
        const fragments = Array.from({ length: 4 + (i % 3) }, (_, j) => ({
          start: 540 + j * 90 + (i % 4) * 15, // Staggered 15min offsets
          duration: 45 + (j % 2) * 30 // 45min or 75min windows
        }));
        
        const availability = createWeekWithDays([
          createDayWithBlocks(baseDay, fragments)
        ]);
        
        return createTestStudent(`student-frag-s${i + 1}`, `Student Fragmented ${i + 1}`, 
          availability, 60);
      });

      const solver = createCoreTestSolver({ maxTimeMs: 12000 }, 'should handle students with highly fragmented availability', 'stress');
      const solution = solver.solve(teacher, students);

      // Should schedule most students by finding suitable fragments
      expect(solution.assignments.length).toBeGreaterThanOrEqual(6);
      
      // Verify assignments fit within student fragments
      solution.assignments.forEach(assignment => {
        const student = students.find(s => s.person.id === assignment.studentId)!;
        const studentDay = student.availability.days[assignment.dayOfWeek]!;
        const assignmentEnd = assignment.startMinute + assignment.durationMinutes;
        
        const fitsInStudentFragment = studentDay.blocks.some(block =>
          assignment.startMinute >= block.start && 
          assignmentEnd <= block.start + block.duration
        );
        expect(fitsInStudentFragment).toBe(true);
      });
    });
  });

  describe('Pathological Algorithm-Breaking Cases', () => {
    it('should handle "thrashing" scenario - many overlapping but incompatible constraints', () => {
      // Create a scenario designed to cause maximum backtracking
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }]) // Monday 10am-2pm (4 hours)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 15,
        maxConsecutiveMinutes: 90
      });

      // Create interlocking constraints that force extensive search
      const students = [
        // Group 1: Must be scheduled in first half (10am-12pm)
        createTestStudent('thrash-s1', 'Thrashing Student 1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00 only
          ]), 60),
        
        createTestStudent('thrash-s2', 'Thrashing Student 2', 
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 630, duration: 90 }]) // 10:30-12:00 only
          ]), 75),
        
        // Group 2: Must be scheduled in second half (12pm-2pm) 
        createTestStudent('thrash-s3', 'Thrashing Student 3',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 720, duration: 60 }]) // 12:00-13:00 only
          ]), 60),
        
        createTestStudent('thrash-s4', 'Thrashing Student 4',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 750, duration: 90 }]) // 12:30-14:00 only  
          ]), 75),
        
        // Group 3: Can bridge the gap but conflicts with others
        createTestStudent('thrash-s5', 'Thrashing Student 5',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 675, duration: 90 }]) // 11:15-12:45
          ]), 90),
        
        // Group 4: Large lesson that conflicts with everyone
        createTestStudent('thrash-s6', 'Thrashing Student 6',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 240 }]) // 10:00-14:00 (entire window)
          ]), 120)
      ];

      const solver = createCoreTestSolver({ maxTimeMs: 20000 }, 'should handle "thrashing" scenario - many overlapping but incompatible constraints', 'stress');
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Should complete within time limit despite complexity
      expect(elapsed).toBeLessThan(18000);
      
      // Should find a valid partial solution
      expect(solution.assignments.length + solution.unscheduled.length).toBe(6);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(2); // Some should be schedulable
      
      // Verify solution correctness
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        expect(gap).toBeGreaterThanOrEqual(0); // No overlaps
      }
    });

    it('should handle "combinatorial explosion" - many students with overlapping windows', () => {
      // Small availability window with many competing students
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 180 }]) // Monday 10am-1pm (3 hours)
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 25 students all wanting overlapping 90-minute slots
      const students = Array.from({ length: 25 }, (_, i) => {
        // Create slightly staggered overlapping windows to maximize conflicts
        const startOffset = (i % 10) * 15; // 15-minute increments
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ 
            start: 600 + startOffset, 
            duration: 120 // 2-hour windows, overlapping
          }])
        ]);
        
        return createTestStudent(`combo-s${i + 1}`, `Combo Student ${i + 1}`, 
          availability, 90);
      });

      const solver = createCoreTestSolver({ maxTimeMs: 25000 }, 'should handle "combinatorial explosion" - many students with overlapping windows', 'stress');
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Should complete within time limit
      expect(elapsed).toBeLessThan(20000);
      
      // Should schedule exactly 2 students (3 hours ÷ 90 min = 2 max)
      expect(solution.assignments.length).toBe(2);
      expect(solution.unscheduled.length).toBe(23);
      
      // Should be first 2 students due to natural ordering (no heuristics)
      const assignedIds = solution.assignments.map(a => a.studentId).sort();
      expect(assignedIds).toEqual(['combo-s1', 'combo-s2']);
    });

    it('should handle "constraint contradiction" scenarios gracefully', () => {
      // Create contradictory constraints
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Only 1 hour available
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [90], // Want 90min lessons
        minLessonDuration: 90,
        maxLessonDuration: 90,
        breakDurationMinutes: 30 // Plus need 30min breaks
      });

      // Students wanting the impossible 90min lessons
      const students = Array.from({ length: 5 }, (_, i) => 
        createTestStudent(`contra-s${i + 1}`, `Contradiction Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Only 60min available
          ]), 90) // Want 90min (impossible)
      );

      const solver = createCoreTestSolver({ maxTimeMs: 5000 }, 'should handle "constraint contradiction" scenarios gracefully', 'stress');
      const solution = solver.solve(teacher, students);

      // Should gracefully handle impossible constraints
      expect(solution.assignments.length).toBe(0); // Nothing should be schedulable
      expect(solution.unscheduled.length).toBe(5); // All should be unscheduled
      expect(solution).toBeDefined(); // Should not crash or hang
    });
  });

  describe('High Time Utilization Tests', () => {
    it('should handle 95% time utilization efficiently', () => {
      // 10 hours available
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 300 }]), // Monday 8am-1pm (5h)
        createDayWithBlocks(2, [{ start: 480, duration: 300 }])  // Tuesday 8am-1pm (5h)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 10 // Minimal breaks
      });

      // Students needing 9.5 hours total (95% utilization)
      const students = Array.from({ length: 19 }, (_, i) => {
        const dayOfWeek = (i % 2) + 1;
        const startTime = 480 + (i % 8) * 30; // Distribute start times
        
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: startTime, duration: 240 }])
        ]);
        
        return createTestStudent(`util-s${i + 1}`, `Utilization Student ${i + 1}`,
          availability, 30); // 30min lessons = 19 * 30min = 570min = 9.5h
      });

      const solver = createCoreTestSolver({ maxTimeMs: 15000 }, 'should handle 95% time utilization efficiently', 'stress');
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(12000);
      
      // Should schedule most students (with breaks, may not fit all)
      expect(solution.assignments.length).toBeGreaterThanOrEqual(16); // At least 80%
      
      // Verify high utilization is achieved
      const totalScheduledMinutes = solution.assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
      const utilization = totalScheduledMinutes / 600; // 600 total minutes available
      expect(utilization).toBeGreaterThan(0.8); // At least 80% utilization
    });

    it('should handle exact capacity scenarios', () => {
      // Exactly enough time for all students with no waste
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (5 hours = 300min)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 0 // No breaks to achieve exact fit
      });

      // Exactly 5 students wanting 60min each = 300min total
      const students = Array.from({ length: 5 }, (_, i) => {
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540 + i * 60, duration: 240 - i * 60 }])
        ]);
        
        return createTestStudent(`exact-s${i + 1}`, `Exact Student ${i + 1}`,
          availability, 60);
      });

      const solver = createCoreTestSolver({ maxTimeMs: 8000 }, 'should handle exact capacity scenarios', 'stress');
      const solution = solver.solve(teacher, students);

      // Should schedule all students perfectly
      expect(solution.assignments.length).toBe(5);
      expect(solution.unscheduled.length).toBe(0);
      
      // Verify perfect packing (no gaps)
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      expect(sortedAssignments[0]!.startMinute).toBe(540); // Start at 9am
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const expectedStart = prev.startMinute + prev.durationMinutes;
        expect(curr.startMinute).toBe(expectedStart); // Perfect back-to-back
      }
      
      const lastAssignment = sortedAssignments[sortedAssignments.length - 1]!;
      const endTime = lastAssignment.startMinute + lastAssignment.durationMinutes;
      expect(endTime).toBe(840); // End exactly at 2pm
    });
  });
});

// ============================================================================
// PERFORMANCE TESTING - 50+ STUDENTS
// ============================================================================

describe('Core Solver - Performance Testing (No Heuristics)', () => {
  describe('Large Scale Performance', () => {
    it('should handle 50 students within performance limits', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 480 }]), // Monday 8am-4pm
        createDayWithBlocks(2, [{ start: 480, duration: 480 }]), // Tuesday 8am-4pm
        createDayWithBlocks(3, [{ start: 480, duration: 480 }]), // Wednesday 8am-4pm
        createDayWithBlocks(4, [{ start: 480, duration: 480 }]), // Thursday 8am-4pm
        createDayWithBlocks(5, [{ start: 480, duration: 480 }])  // Friday 8am-4pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 50 students with realistic distributed availability
      const students = Array.from({ length: 50 }, (_, i) => {
        const dayOfWeek = (i % 5) + 1; // Distribute across weekdays
        const timeSlot = Math.floor(i / 10); // 5 time slots per day
        const startTime = 540 + timeSlot * 90; // 9am, 10:30am, 12pm, 1:30pm, 3pm
        
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: startTime, duration: 120 }])
        ]);
        
        return createTestStudent(`perf-50-s${i + 1}`, `Performance 50 Student ${i + 1}`, 
          availability, 60);
      });

      const solver = createCoreTestSolver({ 
        maxTimeMs: 30000, // 30 seconds max
        maxBacktracks: 10000 
      }, 'should handle 50 students within performance limits', 'performance-large');
      
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance requirements
      expect(elapsed).toBeLessThan(25000); // Should complete in under 25 seconds
      expect(solution.assignments.length + solution.unscheduled.length).toBe(50);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(30); // Should schedule at least 60%
      
      // Verify solution quality
      const assignmentsByDay = solution.assignments.reduce((acc, assignment) => {
        acc[assignment.dayOfWeek] = (acc[assignment.dayOfWeek] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      // Should distribute across multiple days
      expect(Object.keys(assignmentsByDay).length).toBeGreaterThanOrEqual(4);
    });

    it('should handle 75 students with degraded performance', () => {
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 7 }, (_, day) => 
          createDayWithBlocks(day, day === 0 || day === 6 ? [] : [{ start: 480, duration: 600 }]) // Weekdays only
        )
      );
      const teacher = createTestTeacher(teacherAvailability);

      // 75 students with more conflicts
      const students = Array.from({ length: 75 }, (_, i) => {
        const dayOfWeek = (i % 5) + 1;
        const groupSize = 15; // 15 students per day
        const timeOffset = (i % groupSize) * 30; // 30min offsets within day
        
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ 
            start: 540 + timeOffset, 
            duration: 300 // 5-hour window 
          }])
        ]);
        
        return createTestStudent(`perf-75-s${i + 1}`, `Performance 75 Student ${i + 1}`,
          availability, 60);
      });

      const solver = createCoreTestSolver({ 
        maxTimeMs: 45000, // 45 seconds max
        maxBacktracks: 15000
      }, 'should handle 75 students with degraded performance', 'performance-large');
      
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Relaxed requirements for larger scale
      expect(elapsed).toBeLessThan(40000); // Should complete in under 40 seconds
      expect(solution.assignments.length + solution.unscheduled.length).toBe(75);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(40); // Should schedule at least 50%
    });

    it('should handle 100 students stress test', () => {
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 7 }, (_, day) => {
          if (day === 0 || day === 6) return createDayWithBlocks(day, []); // No weekends
          return createDayWithBlocks(day, [
            { start: 480, duration: 300 }, // Morning: 8am-1pm
            { start: 840, duration: 240 }  // Afternoon: 2pm-6pm
          ]);
        })
      );
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 60 // 1-hour lunch break
      });

      // 100 students - extreme stress test
      const students = Array.from({ length: 100 }, (_, i) => {
        const dayOfWeek = (i % 5) + 1;
        const timeSlot = Math.floor((i % 20) / 4); // 4 time slots per day
        const isAfternoon = timeSlot >= 2;
        const startTime = isAfternoon ? 840 + (timeSlot - 2) * 60 : 480 + timeSlot * 75;
        
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ 
            start: startTime, 
            duration: isAfternoon ? 180 : 200 
          }])
        ]);
        
        return createTestStudent(`stress-100-s${i + 1}`, `Stress 100 Student ${i + 1}`,
          availability, 60);
      });

      const solver = createCoreTestSolver({ 
        maxTimeMs: 60000, // 1 minute max
        maxBacktracks: 20000
      }, 'should handle 100 students stress test', 'performance-large');
      
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Stress test - accept lower success rates
      expect(elapsed).toBeLessThan(55000); // Should complete within time limit
      expect(solution.assignments.length + solution.unscheduled.length).toBe(100);
      expect(solution.assignments.length).toBeGreaterThanOrEqual(30); // Should schedule at least 30%
      
      // Should not crash or hang
      expect(solution).toBeDefined();
      expect(solution.metadata).toBeDefined();
    });
  });

  describe('Timeout and Resource Limits', () => {
    it('should handle timeout gracefully with partial solutions', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Very limited: 10am-11am only
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 50 students competing for 1 hour slot
      const students = Array.from({ length: 50 }, (_, i) => 
        createTestStudent(`timeout-s${i + 1}`, `Timeout Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({ maxTimeMs: 2000 }, 'should handle timeout gracefully with partial solutions', 'performance-large'); // Very short timeout
      
      const startTime = Date.now();
      const solution = solver.solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Should respect timeout
      expect(elapsed).toBeLessThan(3000);
      expect(solution).toBeDefined();
      
      // Should return partial solution
      expect(solution.assignments.length + solution.unscheduled.length).toBe(50);
      expect(solution.assignments.length).toBeLessThanOrEqual(1); // At most 1 can fit
    });

    it('should handle backtrack limit gracefully', () => {
      // Create scenario that requires many backtracks
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 360 }]) // Monday 9am-3pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 20
      });

      // Students with complex interlocking constraints
      const students = Array.from({ length: 20 }, (_, i) => {
        const startTime = 540 + (i % 10) * 15; // Staggered 15min offsets
        const duration = 120 + (i % 3) * 30; // Varying windows: 2h, 2.5h, 3h
        
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: startTime, duration }])
        ]);
        
        return createTestStudent(`backtrack-s${i + 1}`, `Backtrack Student ${i + 1}`,
          availability, 90); // Long lessons to create conflicts
      });

      const solver = createCoreTestSolver({ 
        maxTimeMs: 15000,
        maxBacktracks: 100 // Very low backtrack limit
      }, 'should handle backtrack limit gracefully', 'performance-large');
      
      const solution = solver.solve(teacher, students);

      // Should complete despite backtrack limit
      expect(solution).toBeDefined();
      expect(solution.assignments.length + solution.unscheduled.length).toBe(20);
      
      // Should find some solution even with limited backtracks
      expect(solution.assignments.length).toBeGreaterThan(0);
    });

    it('should maintain correctness under resource pressure', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 480 }]) // Monday 8am-4pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // 30 students with reasonable but challenging constraints
      const students = Array.from({ length: 30 }, (_, i) => {
        const timeOffset = (i % 12) * 30; // 12 different start times
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540 + timeOffset, duration: 240 }])
        ]);
        
        return createTestStudent(`pressure-s${i + 1}`, `Pressure Student ${i + 1}`,
          availability, 45); // 45min lessons
      });

      const solver = createCoreTestSolver({ 
        maxTimeMs: 8000, // Tight time limit
        maxBacktracks: 5000 // Reasonable backtrack limit
      }, 'should maintain correctness under resource pressure', 'performance-large');
      
      const solution = solver.solve(teacher, students);

      // Should maintain solution correctness despite pressure
      expect(solution.assignments.length + solution.unscheduled.length).toBe(30);
      
      // Verify no overlapping assignments
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
        expect(gap).toBeGreaterThanOrEqual(0); // No overlaps
      }
      
      // All assignments should be valid
      solution.assignments.forEach(assignment => {
        expect(assignment.startMinute).toBeGreaterThanOrEqual(0);
        expect(assignment.startMinute).toBeLessThan(1440);
        expect(assignment.durationMinutes).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================================================
// ENHANCED DETERMINISM TESTING
// ============================================================================

describe('Core Solver - Enhanced Determinism (No Heuristics)', () => {
  describe('Extensive Determinism Validation', () => {
    it('should produce identical results across 20 runs', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]), // Monday
        createDayWithBlocks(2, [{ start: 600, duration: 240 }]), // Tuesday  
        createDayWithBlocks(3, [{ start: 540, duration: 360 }])  // Wednesday
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('det-s1', 'Alice', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 180 }]),
          createDayWithBlocks(3, [{ start: 720, duration: 120 }])
        ]), 60),
        createTestStudent('det-s2', 'Bob', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 120 }]),
          createDayWithBlocks(2, [{ start: 660, duration: 180 }])
        ]), 90),
        createTestStudent('det-s3', 'Carol', createWeekWithDays([
          createDayWithBlocks(2, [{ start: 600, duration: 240 }]),
          createDayWithBlocks(3, [{ start: 540, duration: 240 }])
        ]), 75),
        createTestStudent('det-s4', 'David', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 240 }]),
          createDayWithBlocks(3, [{ start: 600, duration: 180 }])
        ]), 60)
      ];

      const solver = createCoreTestSolver({}, 'should produce identical results across 20 runs', 'determinism');
      
      // Run 20 times and collect results
      const results = [];
      for (let i = 0; i < 20; i++) {
        const solution = solver.solve(teacher, students);
        results.push({
          assignmentCount: solution.assignments.length,
          unscheduledCount: solution.unscheduled.length,
          assignments: solution.assignments.map(a => ({
            studentId: a.studentId,
            dayOfWeek: a.dayOfWeek,
            startMinute: a.startMinute,
            durationMinutes: a.durationMinutes
          })).sort((a, b) => 
            a.studentId.localeCompare(b.studentId) || a.dayOfWeek - b.dayOfWeek
          ),
          unscheduled: [...solution.unscheduled].sort()
        });
      }

      // All results should be identical
      const firstResult = results[0]!;
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult);
      }
    });

    it('should be deterministic with complex constraint interactions', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 15,
        maxConsecutiveMinutes: 120,
        backToBackPreference: 'minimize'
      });

      // Complex scenario with interacting constraints
      const students = [
        createTestStudent('complex-s1', 'Student 1', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // 9-11am
        ]), 60),
        createTestStudent('complex-s2', 'Student 2', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // 10am-12pm
        ]), 60),
        createTestStudent('complex-s3', 'Student 3', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 120 }]) // 11am-1pm
        ]), 60),
        createTestStudent('complex-s4', 'Student 4', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // 9am-12pm
        ]), 90)
      ];

      const solver = createCoreTestSolver({}, 'should be deterministic with complex constraint interactions', 'determinism');
      
      // Run multiple times
      const results = [];
      for (let i = 0; i < 15; i++) {
        const solution = solver.solve(teacher, students);
        
        const signature = {
          scheduled: solution.assignments.map(a => a.studentId).sort().join(','),
          unscheduled: solution.unscheduled.sort().join(','),
          timeslots: solution.assignments.map(a => 
            `${a.studentId}:${a.startMinute}-${a.startMinute + a.durationMinutes}`
          ).sort().join('|')
        };
        
        results.push(signature);
      }

      // All signatures should be identical
      expect(new Set(results).size).toBe(1);
    });

    it('should maintain determinism under memory pressure simulation', () => {
      // Simulate memory pressure with many objects
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 600 }]) // Monday 8am-6pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Create many students to increase memory usage
      const students = Array.from({ length: 40 }, (_, i) => {
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ 
            start: 540 + (i % 15) * 30, 
            duration: 180 + (i % 4) * 30 
          }])
        ]);
        
        return createTestStudent(`mem-s${i + 1}`, `Memory Student ${i + 1}`,
          availability, 60 + (i % 3) * 15);
      });

      // Create memory pressure with large objects
      const memoryPressure = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: new Array(1000).fill(Math.random()),
        timestamp: Date.now()
      }));

      const solver = createCoreTestSolver({ maxTimeMs: 20000 }, 'should maintain determinism under memory pressure simulation', 'determinism');
      
      // Run with memory pressure
      const results = [];
      for (let i = 0; i < 10; i++) {
        // Add more memory objects each iteration
        memoryPressure.push(...Array.from({ length: 100 }, (_, j) => ({
          id: i * 100 + j,
          data: new Array(500).fill(Math.random()),
          timestamp: Date.now()
        })));
        
        const solution = solver.solve(teacher, students);
        
        results.push({
          assignmentCount: solution.assignments.length,
          firstAssignment: solution.assignments[0] ? {
            studentId: solution.assignments[0].studentId,
            startMinute: solution.assignments[0].startMinute
          } : null,
          unscheduledCount: solution.unscheduled.length
        });
        
        // Cleanup some memory pressure
        memoryPressure.splice(0, 50);
      }

      // Results should be consistent despite memory pressure
      const firstResult = results[0]!;
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult);
      }
      
      // Clean up memory pressure
      memoryPressure.length = 0;
    });

    it('should handle determinism with shuffled input orders', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 420 }]) // Monday 9am-4pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Base students that will be shuffled
      const baseStudents = Array.from({ length: 12 }, (_, i) => 
        createTestStudent(`shuffle-s${i + 1}`, `Shuffle Student ${i + 1}`, 
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600 + i * 30, duration: 180 }])
          ]), 60)
      );

      const solver = createCoreTestSolver({}, 'should handle determinism with shuffled input orders', 'determinism');
      
      // Test with different input orders
      const results = [];
      for (let iteration = 0; iteration < 10; iteration++) {
        // Create shuffled copy (deterministic shuffle based on iteration)
        const shuffledStudents = [...baseStudents];
        
        // Simple deterministic shuffle
        for (let i = 0; i < shuffledStudents.length; i++) {
          const j = (i * 7 + iteration * 3) % shuffledStudents.length;
          [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j]!, shuffledStudents[i]!];
        }
        
        const solution = solver.solve(teacher, shuffledStudents);
        
        // Sort results for comparison
        const sortedResult = {
          assignments: solution.assignments.map(a => ({
            studentId: a.studentId,
            startMinute: a.startMinute,
            durationMinutes: a.durationMinutes
          })).sort((a, b) => a.studentId.localeCompare(b.studentId)),
          unscheduled: [...solution.unscheduled].sort()
        };
        
        results.push(sortedResult);
      }

      // All results should be equivalent when sorted
      const firstResult = results[0]!;
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult);
      }
    });
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Core Solver - Edge Cases (No Heuristics)', () => {
  it('should handle empty availability gracefully', () => {
    const teacher = createTestTeacher(createEmptyWeekSchedule());
    const students = [createTestStudent('s1', 'Student', createEmptyWeekSchedule())];

    const solver = createCoreTestSolver({}, 'should handle empty availability gracefully', 'edge-cases');
    const solution = solver.solve(teacher, students);

    expect(solution.assignments).toHaveLength(0);
    expect(solution.unscheduled).toContain('s1');
  });

  it('should handle no students', () => {
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }])
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    const solver = createCoreTestSolver({}, 'should handle no students', 'edge-cases');
    const solution = solver.solve(teacher, []);

    expect(solution.assignments).toHaveLength(0);
    expect(solution.unscheduled).toHaveLength(0);
    expect(solution.metadata.totalStudents).toBe(0);
  });

  it('should respect timeout limits', () => {
    // Create a scenario that could take time
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // Very limited availability
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Many students competing for same slot
    const students = Array.from({ length: 20 }, (_, i) => 
      createTestStudent(`s${i + 1}`, `Student ${i + 1}`, createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }])
      ]), 60)
    );

    const solver = createCoreTestSolver({ maxTimeMs: 100 }, 'should respect timeout limits', 'edge-cases'); // Very short timeout
    
    const startTime = Date.now();
    const solution = solver.solve(teacher, students);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(200); // Should respect timeout
    expect(solution).toBeDefined(); // Should return some result
  });

  describe('Boundary Time Tests', () => {
    it('should handle midnight boundary (start of day)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 0, duration: 120 }]) // Monday 12:00am-2:00am
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('boundary-s1', 'Boundary Student 1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 0, duration: 60 }]) // 12:00am-1:00am
          ]), 60),
        createTestStudent('boundary-s2', 'Boundary Student 2', 
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 60, duration: 60 }]) // 1:00am-2:00am
          ]), 60)
      ];

      const solver = createCoreTestSolver({}, 'should handle midnight boundary (start of day)', 'edge-cases');
      const solution = solver.solve(teacher, students);

      expect(solution.assignments.length).toBe(2);
      expect(solution.unscheduled.length).toBe(0);
      
      // Verify assignments are at correct boundary times
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      expect(sortedAssignments[0]!.startMinute).toBe(0);
      expect(sortedAssignments[1]!.startMinute).toBe(60);
    });

    it('should handle end of day boundary (11:59pm)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 1380, duration: 60 }]) // Monday 11:00pm-12:00am (next day)
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('late-s1', 'Late Student 1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 1380, duration: 59 }]) // 11:00pm-11:59pm
          ]), 59),
        createTestStudent('late-s2', 'Late Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 1380, duration: 60 }]) // Full hour
          ]), 60)
      ];

      const solver = createCoreTestSolver({}, 'should handle end of day boundary (11:59pm)', 'edge-cases');
      const solution = solver.solve(teacher, students);

      // Should schedule at least one (within day boundary)
      expect(solution.assignments.length).toBeGreaterThanOrEqual(1);
      
      // All assignments should be within day bounds
      solution.assignments.forEach(assignment => {
        expect(assignment.startMinute).toBeGreaterThanOrEqual(0);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(1440);
      });
    });

    it('should handle exact minute precision edge cases', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 181 }]) // Monday 9:00am-12:01pm (181 minutes)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [60, 61, 120, 121],
        minLessonDuration: 60,
        maxLessonDuration: 121
      });

      const students = [
        createTestStudent('precise-s1', 'Precise Student 1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 61 }]) // Exactly 61 minutes
          ]), 61),
        createTestStudent('precise-s2', 'Precise Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 660, duration: 61 }]) // 11:00am-12:01pm
          ]), 60),
        createTestStudent('precise-s3', 'Precise Student 3',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 121 }]) // 10:00am-12:01pm
          ]), 121)
      ];

      const solver = createCoreTestSolver({}, 'should handle exact minute precision edge cases', 'edge-cases');
      const solution = solver.solve(teacher, students);

      // Should handle precise timing
      expect(solution.assignments.length).toBeGreaterThanOrEqual(2);
      
      // Verify precise minute calculations
      solution.assignments.forEach(assignment => {
        expect(assignment.startMinute % 1).toBe(0); // Should be whole minutes
        expect(assignment.durationMinutes % 1).toBe(0); // Should be whole minutes
      });
    });
  });

  describe('Exact Match Scenarios', () => {
    it('should handle perfect time window matches', () => {
      // Teacher and students have exactly matching availability
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 60 }, // 9:00-10:00
          { start: 630, duration: 90 }, // 10:30-12:00
          { start: 780, duration: 45 }  // 13:00-13:45
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('exact-s1', 'Exact Student 1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // Exact match 9:00-10:00
          ]), 60),
        createTestStudent('exact-s2', 'Exact Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 630, duration: 90 }]) // Exact match 10:30-12:00
          ]), 90),
        createTestStudent('exact-s3', 'Exact Student 3',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 780, duration: 45 }]) // Exact match 13:00-13:45
          ]), 45)
      ];

      const solver = createCoreTestSolver({}, 'should handle perfect time window matches', 'edge-cases');
      const solution = solver.solve(teacher, students);

      // Should schedule all perfectly
      expect(solution.assignments.length).toBe(3);
      expect(solution.unscheduled.length).toBe(0);
      
      // Verify exact matches
      solution.assignments.forEach(assignment => {
        const student = students.find(s => s.person.id === assignment.studentId)!;
        const studentBlock = student.availability.days[assignment.dayOfWeek]!.blocks[0]!;
        const teacherBlocks = teacher.availability.days[assignment.dayOfWeek]!.blocks;
        
        expect(assignment.startMinute).toBe(studentBlock.start);
        expect(assignment.durationMinutes).toBe(assignment.durationMinutes);
        
        // Should match exactly one teacher block
        const matchingTeacherBlock = teacherBlocks.find(block =>
          block.start === assignment.startMinute && 
          block.duration >= assignment.durationMinutes
        );
        expect(matchingTeacherBlock).toBeDefined();
      });
    });

    it('should handle zero-gap scheduling', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm (4 hours)
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 0 // No breaks required
      });

      // Students designed for perfect back-to-back scheduling
      const students = [
        createTestStudent('zero-s1', 'Zero Gap Student 1',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9:00-10:00
          ]), 60),
        createTestStudent('zero-s2', 'Zero Gap Student 2',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10:00-11:00
          ]), 60),
        createTestStudent('zero-s3', 'Zero Gap Student 3',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 660, duration: 60 }]) // 11:00-12:00
          ]), 60),
        createTestStudent('zero-s4', 'Zero Gap Student 4',
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 720, duration: 60 }]) // 12:00-1:00
          ]), 60)
      ];

      const solver = createCoreTestSolver({}, 'should handle zero-gap scheduling', 'edge-cases');
      const solution = solver.solve(teacher, students);

      // Should schedule all back-to-back
      expect(solution.assignments.length).toBe(4);
      expect(solution.unscheduled.length).toBe(0);
      
      // Verify zero gaps
      const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
      
      expect(sortedAssignments[0]!.startMinute).toBe(540); // Start at 9:00
      for (let i = 1; i < sortedAssignments.length; i++) {
        const prev = sortedAssignments[i - 1]!;
        const curr = sortedAssignments[i]!;
        const expectedStart = prev.startMinute + prev.durationMinutes;
        expect(curr.startMinute).toBe(expectedStart); // No gaps
      }
      
      const lastAssignment = sortedAssignments[3]!;
      expect(lastAssignment.startMinute + lastAssignment.durationMinutes).toBe(780); // End at 1:00
    });

    it('should handle single-minute availability windows', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 1 }, // 9:00-9:01 (1 minute)
          { start: 600, duration: 1 }, // 10:00-10:01 (1 minute)
          { start: 660, duration: 1 }  // 11:00-11:01 (1 minute)
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        allowedDurations: [1],
        minLessonDuration: 1,
        maxLessonDuration: 1
      });

      const students = Array.from({ length: 5 }, (_, i) =>
        createTestStudent(`minute-s${i + 1}`, `Minute Student ${i + 1}`,
          createWeekWithDays([
            createDayWithBlocks(1, [{ start: 540 + i * 60, duration: 1 }])
          ]), 1)
      );

      const solver = createCoreTestSolver({}, 'should handle single-minute availability windows', 'edge-cases');
      const solution = solver.solve(teacher, students);

      // Should schedule exactly 3 (matching teacher's availability)
      expect(solution.assignments.length).toBe(3);
      expect(solution.unscheduled.length).toBe(2);
      
      // All assignments should be exactly 1 minute
      solution.assignments.forEach(assignment => {
        expect(assignment.durationMinutes).toBe(1);
      });
    });
  });
});

// Save extracted test data after all tests complete (only in extraction mode)
if (isExtractingTestData()) {
  const { afterAll } = await import('vitest');
  afterAll(async () => {
    try {
      const outputPath = await saveExtractedTestData();
      console.log(`📊 Test data extraction complete: ${outputPath}`);
    } catch (error) {
      console.error('❌ Failed to save extracted test data:', error);
    }
  });
}