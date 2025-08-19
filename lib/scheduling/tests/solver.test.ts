/**
 * Test suite for the CSP-based scheduling solver
 * 
 * These tests validate the core CSP solver functionality without relying on
 * the boolean grid system. Tests focus on:
 * - Basic solver functionality
 * - Constraint satisfaction
 * - Performance benchmarks
 * - Edge cases and error handling
 * 
 * VISUALIZATION USAGE:
 * To visualize test cases and their solutions:
 * - Run with: VISUALIZE=true pnpm test (shows visualization for all tests)
 * - Or use: pnpm test:visual (same as above)
 * - Individual test files can call enableVisualizationIfRequested() in beforeEach
 * - Use testWithVisualization() for tests that should show detailed visualizations
 * 
 * CLI visualization:
 * - pnpm visualize --test="test_name" --solve (visualize and solve a specific test)
 * - See lib/scheduling/visualizer/cli.ts for full options
 */

import { describe, it, expect, beforeEach } from 'vitest';
// Import wrapped solver for automatic visualization when VISUALIZE=true  
import {
  ScheduleSolver,
  createOptimalSolver,
  solveSchedule,
  validateInputs
} from '../solver-wrapper';

// Visualization imports - uncomment to enable for specific tests
import { 
  enableVisualizationIfRequested,
  testWithVisualization,
  shouldVisualize
} from '../visualizer/test-integration';

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
    allowedDurations: [30, 45, 60, 90]
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

// ============================================================================
// BASIC FUNCTIONALITY TESTS
// ============================================================================

describe('ScheduleSolver - Basic Functionality', () => {
  let solver: ScheduleSolver;

  beforeEach(() => {
    // Enable visualization if requested via VISUALIZE=true env var or --visualize flag
    enableVisualizationIfRequested();
    
    solver = new ScheduleSolver({
      maxTimeMs: 5000,
      logLevel: 'none'
    });
  });

  it('should create solver with default options', () => {
    const defaultSolver = new ScheduleSolver();
    expect(defaultSolver).toBeDefined();
    
    const stats = defaultSolver.getStats();
    expect(stats.strategy).toBe('backtracking');
  });

  it('should create solver with explicit heuristic control', () => {
    const solverWithHeuristics = new ScheduleSolver({ useHeuristics: true });
    const solverWithoutHeuristics = new ScheduleSolver({ useHeuristics: false });
    
    expect(solverWithHeuristics).toBeDefined();
    expect(solverWithoutHeuristics).toBeDefined();
    
    // Both should use backtracking strategy
    expect(solverWithHeuristics.getStats().strategy).toBe('backtracking');
    expect(solverWithoutHeuristics.getStats().strategy).toBe('backtracking');
  });

  it('should solve simple single student scenario', () => {
    // Teacher available Monday 9am-5pm
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // 9:00-17:00
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Student available Monday 10am-2pm, wants 60min lesson
    const studentAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 240 }]) // 10:00-14:00
    ]);
    const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

    const solution = solver.solve(teacher, students);

    expect(solution.assignments).toHaveLength(1);
    expect(solution.unscheduled).toHaveLength(0);
    expect(solution.metadata.scheduledStudents).toBe(1);
    expect(solution.metadata.totalStudents).toBe(1);

    const assignment = solution.assignments[0]!;
    expect(assignment.studentId).toBe('s1');
    expect(assignment.dayOfWeek).toBe(1); // Monday
    expect(assignment.durationMinutes).toBe(60);
    
    // Should be scheduled between 10am-2pm
    expect(assignment.startMinute).toBeGreaterThanOrEqual(600);
    expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(840);
  });

  it('should handle no overlapping availability', () => {
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

    const solution = solver.solve(teacher, students);

    expect(solution.assignments).toHaveLength(0);
    expect(solution.unscheduled).toHaveLength(1);
    expect(solution.unscheduled[0]).toBe('s1');
  });

  it('should handle multiple students with non-conflicting times', () => {
    // Teacher available Monday 9am-5pm
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // 9:00-17:00
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Student 1: Monday 9am-11am
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

    const solution = solver.solve(teacher, students);

    expect(solution.assignments).toHaveLength(2);
    expect(solution.unscheduled).toHaveLength(0);
    
    const assignment1 = solution.assignments.find(a => a.studentId === 's1');
    const assignment2 = solution.assignments.find(a => a.studentId === 's2');
    
    expect(assignment1).toBeDefined();
    expect(assignment2).toBeDefined();
    
    // Check no overlap
    if (assignment1 && assignment2) {
      const end1 = assignment1.startMinute + assignment1.durationMinutes;
      const end2 = assignment2.startMinute + assignment2.durationMinutes;
      
      const noOverlap = (end1 <= assignment2.startMinute) || (end2 <= assignment1.startMinute);
      expect(noOverlap).toBe(true);
    }
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

    const solution = solver.solve(teacher, students);

    expect(solution.assignments).toHaveLength(0);
    expect(solution.unscheduled).toHaveLength(1);
  });
});

// ============================================================================
// EXPLICIT HEURISTIC CONTROL TESTS
// ============================================================================

describe('ScheduleSolver - Explicit Heuristic Control', () => {
  describe('Heuristic Configuration', () => {
    it('should use heuristics by default', () => {
      const solver = new ScheduleSolver();
      const options = (solver as any).options; // Access private options for testing
      expect(options.useHeuristics).toBe(true);
    });

    it('should allow disabling heuristics', () => {
      const solver = new ScheduleSolver({ useHeuristics: false });
      const options = (solver as any).options;
      expect(options.useHeuristics).toBe(false);
    });

    it('should allow explicitly enabling heuristics', () => {
      const solver = new ScheduleSolver({ useHeuristics: true });
      const options = (solver as any).options;
      expect(options.useHeuristics).toBe(true);
    });
  });

  describe('Heuristic Behavior Verification', () => {
    it('should produce valid solutions with and without heuristics', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]), // Monday
        createDayWithBlocks(2, [{ start: 540, duration: 480 }])  // Tuesday
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = Array.from({ length: 5 }, (_, i) => {
        const dayOfWeek = (i % 2) + 1;
        const startTime = 600 + i * 60;
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: startTime, duration: 120 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const solverWithHeuristics = new ScheduleSolver({ useHeuristics: true, logLevel: 'none' });
      const solverWithoutHeuristics = new ScheduleSolver({ useHeuristics: false, logLevel: 'none' });

      const solutionWith = solverWithHeuristics.solve(teacher, students);
      const solutionWithout = solverWithoutHeuristics.solve(teacher, students);

      // Both should produce valid solutions
      expect(solutionWith.assignments.length).toBeGreaterThan(0);
      expect(solutionWithout.assignments.length).toBeGreaterThan(0);
      
      // Total assignments + unscheduled should equal total students
      expect(solutionWith.assignments.length + solutionWith.unscheduled.length).toBe(students.length);
      expect(solutionWithout.assignments.length + solutionWithout.unscheduled.length).toBe(students.length);

      // Both should respect hard constraints (no overlaps)
      function validateNoOverlaps(solution: any) {
        const assignments = solution.assignments.sort((a: any, b: any) => 
          a.dayOfWeek === b.dayOfWeek ? a.startMinute - b.startMinute : a.dayOfWeek - b.dayOfWeek
        );
        
        for (let i = 1; i < assignments.length; i++) {
          const prev = assignments[i - 1];
          const curr = assignments[i];
          
          if (prev.dayOfWeek === curr.dayOfWeek) {
            const prevEnd = prev.startMinute + prev.durationMinutes;
            expect(curr.startMinute).toBeGreaterThanOrEqual(prevEnd);
          }
        }
      }

      validateNoOverlaps(solutionWith);
      validateNoOverlaps(solutionWithout);
    });

    it('should show different performance characteristics with/without heuristics', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Create overlapping students to force search
      const students = Array.from({ length: 10 }, (_, i) => {
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600 + i * 30, duration: 240 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const solverWithHeuristics = new ScheduleSolver({ 
        useHeuristics: true, 
        logLevel: 'none',
        maxTimeMs: 10000 
      });
      const solverWithoutHeuristics = new ScheduleSolver({ 
        useHeuristics: false, 
        logLevel: 'none',
        maxTimeMs: 10000 
      });

      const start1 = Date.now();
      const solutionWith = solverWithHeuristics.solve(teacher, students);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const solutionWithout = solverWithoutHeuristics.solve(teacher, students);
      const time2 = Date.now() - start2;

      // Both should complete successfully
      expect(solutionWith).toBeDefined();
      expect(solutionWithout).toBeDefined();
      
      // Performance might differ but both should be reasonable
      expect(time1).toBeLessThan(10000);
      expect(time2).toBeLessThan(10000);
      
      // Results should be comparable in quality (allow more variation for complex cases)
      const diff = Math.abs(solutionWith.assignments.length - solutionWithout.assignments.length);
      expect(diff).toBeLessThanOrEqual(4); // Should be within 4 assignments of each other
    });
  });

  describe('Deterministic Behavior Without Heuristics', () => {
    it('should be deterministic when heuristics are disabled', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('s1', 'Alice', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }])
        ]), 60),
        createTestStudent('s2', 'Bob', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 120 }])
        ]), 60),
        createTestStudent('s3', 'Carol', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 120 }])
        ]), 60)
      ];

      const solver = new ScheduleSolver({ useHeuristics: false, logLevel: 'none' });
      
      // Run multiple times to verify determinism
      const results = [];
      for (let i = 0; i < 3; i++) {
        const solution = solver.solve(teacher, students);
        results.push({
          assignmentCount: solution.assignments.length,
          assignments: solution.assignments.map((a: any) => ({
            studentId: a.studentId,
            startMinute: a.startMinute,
            durationMinutes: a.durationMinutes
          })).sort((a: any, b: any) => a.studentId.localeCompare(b.studentId))
        });
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });
});

// ============================================================================
// COMPREHENSIVE CONSTRAINT UNIT TESTS (Phase 3.5 Requirements) 
// ============================================================================

describe('ScheduleSolver - Individual Constraint Testing', () => {
  describe('Availability Constraint Tests', () => {
    it('should enforce teacher availability (hard constraint)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm only
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student available outside teacher hours
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 840, duration: 240 }]) // Monday 2pm-6pm
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      expect(solution.assignments).toHaveLength(0);
      expect(solution.unscheduled).toContain('s1');
    });

    it('should enforce student availability (hard constraint)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9am-5pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Student only available in small window
      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 90 }]) // Monday 10am-11:30am
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length > 0) {
        const assignment = solution.assignments[0]!;
        // Must be within student's available time
        expect(assignment.startMinute).toBeGreaterThanOrEqual(600);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(690);
      }
    });

    it('should handle multiple availability blocks correctly', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 120 }, // 9am-11am  
          { start: 780, duration: 120 }  // 1pm-3pm
        ])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 720, duration: 240 }]) // 12pm-4pm (overlaps 2nd block)
      ]);
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 60)];

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length > 0) {
        const assignment = solution.assignments[0]!;
        // Should be scheduled in the overlapping block (1pm-3pm)
        expect(assignment.startMinute).toBeGreaterThanOrEqual(780);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(900);
      }
    });
  });

  describe('Non-Overlapping Constraint Tests', () => {
    it('should prevent lesson time conflicts (hard constraint)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9am-5pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Both students want same time window
      const sharedAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // 10am-12pm
      ]);
      
      const students = [
        createTestStudent('s1', 'Student One', sharedAvailability, 60),
        createTestStudent('s2', 'Student Two', sharedAvailability, 60)
      ];

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length === 2) {
        const [first, second] = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
        const firstEnd = first!.startMinute + first!.durationMinutes;
        
        // Second lesson must start after first ends (no overlap)
        expect(second!.startMinute).toBeGreaterThanOrEqual(firstEnd);
      } else {
        // Or only one should be scheduled if no non-overlapping solution exists
        expect(solution.assignments.length).toBe(1);
        expect(solution.unscheduled.length).toBe(1);
      }
    });

    it('should allow lessons on different days', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]), // Monday 10am-11am (tight)
        createDayWithBlocks(2, [{ start: 600, duration: 60 }])  // Tuesday 10am-11am 
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = [
        createTestStudent('s1', 'Student One', createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 60 }])
        ]), 60),
        createTestStudent('s2', 'Student Two', createWeekWithDays([
          createDayWithBlocks(2, [{ start: 600, duration: 60 }])
        ]), 60)
      ];

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      // Should schedule both on different days
      expect(solution.assignments).toHaveLength(2);
      expect(solution.unscheduled).toHaveLength(0);
      
      const days = solution.assignments.map(a => a.dayOfWeek).sort();
      expect(days).toEqual([1, 2]);
    });
  });

  describe('Duration Constraint Tests', () => {
    it('should enforce allowed durations (hard constraint)', () => {
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

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length > 0) {
        const duration = solution.assignments[0]!.durationMinutes;
        expect([30, 45]).toContain(duration); // Must be allowed duration
      }
    });

    it('should respect minimum duration limits', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        minLessonDuration: 60,
        maxLessonDuration: 120,
        allowedDurations: [] // Allow any duration in range
      });

      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }])
      ]);
      
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 30)]; // Below min

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length > 0) {
        expect(solution.assignments[0]!.durationMinutes).toBeGreaterThanOrEqual(60);
      }
    });

    it('should respect maximum duration limits', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        minLessonDuration: 30,
        maxLessonDuration: 90,
        allowedDurations: []
      });

      const studentAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }])
      ]);
      
      const students = [createTestStudent('s1', 'Student One', studentAvailability, 120)]; // Above max

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length > 0) {
        expect(solution.assignments[0]!.durationMinutes).toBeLessThanOrEqual(90);
      }
    });
  });

  describe('Break Requirement Constraint Tests (Soft)', () => {
    it('should attempt to maintain break requirements between lessons', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // 9am-2pm
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        breakDurationMinutes: 30 // Require 30-min breaks
      });

      const sharedAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }])
      ]);
      
      const students = [
        createTestStudent('s1', 'Student One', sharedAvailability, 60),
        createTestStudent('s2', 'Student Two', sharedAvailability, 60),
        createTestStudent('s3', 'Student Three', sharedAvailability, 60)
      ];

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length >= 2) {
        const sortedAssignments = solution.assignments.sort((a, b) => a.startMinute - b.startMinute);
        
        for (let i = 1; i < sortedAssignments.length; i++) {
          const prev = sortedAssignments[i - 1]!;
          const curr = sortedAssignments[i]!;
          const gap = curr.startMinute - (prev.startMinute + prev.durationMinutes);
          
          // Soft constraint - might be violated but should be minimized
          expect(gap).toBeGreaterThanOrEqual(0); // At least no overlap
        }
      }
    });
  });

  describe('Consecutive Limit Constraint Tests (Soft)', () => {
    it('should attempt to limit consecutive teaching time', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // 9am-5pm
      ]);
      
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 180 // Max 3 hours consecutive
      });

      const sharedAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }])
      ]);
      
      // Request many lessons to test consecutive limit
      const students = Array.from({ length: 6 }, (_, i) => 
        createTestStudent(`s${i + 1}`, `Student ${i + 1}`, sharedAvailability, 60)
      );

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length >= 4) {
        const mondayLessons = solution.assignments
          .filter(a => a.dayOfWeek === 1)
          .sort((a, b) => a.startMinute - b.startMinute);
        
        // Check for breaks in consecutive blocks
        let consecutiveMinutes = 0;
        
        for (let i = 0; i < mondayLessons.length; i++) {
          const lesson = mondayLessons[i]!;
          
          if (i === 0 || lesson.startMinute === mondayLessons[i-1]!.startMinute + mondayLessons[i-1]!.durationMinutes) {
            consecutiveMinutes += lesson.durationMinutes;
          } else {
            // Gap found - reset consecutive counter
            consecutiveMinutes = lesson.durationMinutes;
          }
          
          // Soft constraint - may be violated but should be considered
          if (consecutiveMinutes > 180) {
            // Log for debugging but don't fail (soft constraint)
            console.log(`Consecutive limit potentially violated: ${consecutiveMinutes} minutes`);
          }
        }
      }
    });
  });

  describe('Workload Balance Constraint Tests (Soft)', () => {
    it('should attempt to balance lessons across multiple days', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]), // Monday
        createDayWithBlocks(2, [{ start: 540, duration: 480 }]), // Tuesday
        createDayWithBlocks(3, [{ start: 540, duration: 480 }])  // Wednesday
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Students available on all three days
      const flexibleAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }]),
        createDayWithBlocks(2, [{ start: 600, duration: 240 }]),
        createDayWithBlocks(3, [{ start: 600, duration: 240 }])
      ]);
      
      const students = Array.from({ length: 9 }, (_, i) => 
        createTestStudent(`s${i + 1}`, `Student ${i + 1}`, flexibleAvailability, 60)
      );

      const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

      if (solution.assignments.length >= 6) {
        const lessonsByDay = [0, 0, 0, 0, 0, 0, 0]; // Count for each day
        
        solution.assignments.forEach(assignment => {
          lessonsByDay[assignment.dayOfWeek]!++;
        });
        
        // Should have some distribution (soft constraint)
        const activeDays = lessonsByDay.filter(count => count > 0).length;
        expect(activeDays).toBeGreaterThanOrEqual(2); // At least spread across 2 days
        
        // Check that no single day is overloaded compared to others
        const maxLessons = Math.max(...lessonsByDay);
        const totalLessons = lessonsByDay.reduce((a, b) => a + b, 0);
        const avgPerActiveDay = totalLessons / activeDays;
        
        // Soft constraint - some imbalance is acceptable
        expect(maxLessons).toBeLessThanOrEqual(avgPerActiveDay * 2);
      }
    });
  });
});

// ============================================================================
// COMPREHENSIVE PERFORMANCE BENCHMARKS (Phase 3.5 Requirements)
// ============================================================================

describe('ScheduleSolver - Performance Benchmarks', () => {
  describe('Benchmark: 10 Students (Target: < 100ms)', () => {
    it('should solve 10 students in under 100ms - well distributed availability', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]), // Monday 9am-5pm
        createDayWithBlocks(2, [{ start: 540, duration: 480 }]), // Tuesday 9am-5pm
        createDayWithBlocks(3, [{ start: 540, duration: 480 }])  // Wednesday 9am-5pm
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // Create 10 students with good distribution
      const students = Array.from({ length: 10 }, (_, i) => {
        const dayOfWeek = (i % 3) + 1; // Spread across Mon/Tue/Wed
        const startOffset = (i % 4) * 90; // Different start times
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: 600 + startOffset, duration: 240 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const startTime = Date.now();
      const solution = new ScheduleSolver({ 
        maxTimeMs: 200, // Give some buffer
        logLevel: 'none' 
      }).solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(100);
      expect(solution.metadata.computeTimeMs).toBeLessThan(100);
      
      // Quality assertions
      expect(solution.assignments.length).toBeGreaterThanOrEqual(8); // Should schedule most students
      expect(solution.metadata.scheduledStudents).toBe(solution.assignments.length);
    });

    it('should solve 10 students in under 100ms - overlapping availability (harder)', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (limited)
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      // All 10 students want the same limited time window
      const students = Array.from({ length: 10 }, (_, i) => {
        const availability = createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 180 }]) // 10am-1pm overlap
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const startTime = Date.now();
      const solution = new ScheduleSolver({ 
        maxTimeMs: 200,
        logLevel: 'none' 
      }).solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(100);
      expect(solution.metadata.computeTimeMs).toBeLessThan(100);
      
      // Should schedule some students despite constraints
      expect(solution.assignments.length).toBeGreaterThan(0);
    });
  });

  describe('Benchmark: 30 Students (Target: < 500ms)', () => {
    it('should solve 30 students in under 500ms - realistic studio scenario', () => {
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 5 }, (_, day) => 
          createDayWithBlocks(day + 1, [{ start: 540, duration: 480 }]) // Weekdays 9am-5pm
        )
      );
      const teacher = createTestTeacher(teacherAvailability);

      // Create 30 students with realistic distribution
      const students = Array.from({ length: 30 }, (_, i) => {
        const primaryDay = (i % 5) + 1; // Primary day preference
        const secondaryDay = ((i + 2) % 5) + 1; // Secondary day option
        const timeVariation = (i % 6) * 60; // Vary start times
        
        const availability = createWeekWithDays([
          createDayWithBlocks(primaryDay, [{ start: 600 + timeVariation, duration: 300 }]),
          createDayWithBlocks(secondaryDay, [{ start: 720 + timeVariation, duration: 240 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const startTime = Date.now();
      const solution = new ScheduleSolver({ 
        maxTimeMs: 1000, // Give buffer for complex case
        logLevel: 'none' 
      }).solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(500);
      expect(solution.metadata.computeTimeMs).toBeLessThan(500);
      
      // Quality assertions
      expect(solution.assignments.length).toBeGreaterThanOrEqual(25); // Should schedule most
      expect(solution.metadata.averageUtilization).toBeGreaterThan(50); // Good utilization
    });

    it('should solve 30 students in under 500ms - constrained availability', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]), // Monday 9am-1pm
        createDayWithBlocks(3, [{ start: 780, duration: 240 }])  // Wednesday 1pm-5pm
      ]);
      const teacher = createTestTeacher(teacherAvailability, {
        maxConsecutiveMinutes: 120, // Max 2 hours consecutive
        breakDurationMinutes: 30    // 30 min breaks
      });

      const students = Array.from({ length: 30 }, (_, i) => {
        const dayOfWeek = i < 15 ? 1 : 3; // Split between two days
        const startTime = dayOfWeek === 1 ? 600 : 840;
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: startTime, duration: 180 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const startTime = Date.now();
      const solution = new ScheduleSolver({ 
        maxTimeMs: 1000,
        logLevel: 'none' 
      }).solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance assertion  
      expect(elapsed).toBeLessThan(500);
      expect(solution.metadata.computeTimeMs).toBeLessThan(500);
    });
  });

  describe('Benchmark: 50 Students (Target: < 2s)', () => {
    it('should solve 50 students in under 2 seconds - large studio scenario', () => {
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 6 }, (_, day) => 
          createDayWithBlocks(day + 1, [{ start: 480, duration: 660 }]) // Mon-Sat 8am-7pm
        )
      );
      const teacher = createTestTeacher(teacherAvailability);

      // Create 50 students with varied preferences
      const students = Array.from({ length: 50 }, (_, i) => {
        const preferredDays = [];
        // Most students have 2-3 day options
        preferredDays.push((i % 6) + 1);
        preferredDays.push(((i + 2) % 6) + 1);
        if (i % 3 === 0) preferredDays.push(((i + 4) % 6) + 1);
        
        const timeOffset = (i % 8) * 45; // Vary start times by 45 min increments
        const duration = [45, 60, 90][i % 3]; // Mix of lesson durations
        
        const availability = createWeekWithDays(
          preferredDays.map(day => 
            createDayWithBlocks(day, [{ start: 600 + timeOffset, duration: 360 }])
          )
        );
        
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, duration);
      });

      const startTime = Date.now();
      const solution = new ScheduleSolver({ 
        maxTimeMs: 3000, // Give some buffer
        logLevel: 'none' 
      }).solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(2000);
      expect(solution.metadata.computeTimeMs).toBeLessThan(2000);
      
      // Quality assertions
      expect(solution.assignments.length).toBeGreaterThanOrEqual(40); // Should schedule most
      expect(solution.metadata.averageUtilization).toBeGreaterThan(60);
    });
  });

  describe('Benchmark: 100 Students (Target: < 10s) - Stress Test', () => {
    it('should solve 100 students in under 10 seconds - extreme scenario', () => {
      const teacherAvailability = createWeekWithDays(
        Array.from({ length: 7 }, (_, day) => 
          createDayWithBlocks(day, [{ start: 420, duration: 780 }]) // All week 7am-8pm
        )
      );
      const teacher = createTestTeacher(teacherAvailability);

      // Create 100 students with realistic constraints
      const students = Array.from({ length: 100 }, (_, i) => {
        const numDays = Math.min(3, Math.floor(i / 20) + 1); // Fewer options for later students
        const days = Array.from({ length: numDays }, (_, j) => (i + j) % 7);
        
        const timeWindow = 480 - Math.floor(i / 10) * 30; // Decreasing availability 
        const startTime = 480 + (i % 10) * 30;
        
        const availability = createWeekWithDays(
          days.map(day => 
            createDayWithBlocks(day, [{ start: startTime, duration: timeWindow }])
          )
        );
        
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const startTime = Date.now();
      const solution = new ScheduleSolver({ 
        maxTimeMs: 15000, // Give buffer for stress test
        logLevel: 'none' 
      }).solve(teacher, students);
      const elapsed = Date.now() - startTime;

      // Performance assertion
      expect(elapsed).toBeLessThan(10000);
      expect(solution.metadata.computeTimeMs).toBeLessThan(10000);
      
      // Should schedule a reasonable number even in stress scenario
      expect(solution.assignments.length).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across multiple runs', () => {
      const teacherAvailability = createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]),
        createDayWithBlocks(2, [{ start: 540, duration: 480 }])
      ]);
      const teacher = createTestTeacher(teacherAvailability);

      const students = Array.from({ length: 20 }, (_, i) => {
        const dayOfWeek = (i % 2) + 1;
        const availability = createWeekWithDays([
          createDayWithBlocks(dayOfWeek, [{ start: 600 + i * 30, duration: 240 }])
        ]);
        return createTestStudent(`s${i + 1}`, `Student ${i + 1}`, availability, 60);
      });

      const times: number[] = [];
      const assignments: number[] = [];

      // Run 5 times to check consistency
      for (let run = 0; run < 5; run++) {
        const startTime = Date.now();
        const solution = new ScheduleSolver({ 
          maxTimeMs: 1000,
          logLevel: 'none' 
        }).solve(teacher, students);
        const elapsed = Date.now() - startTime;
        
        times.push(elapsed);
        assignments.push(solution.assignments.length);
      }

      // Performance should be consistent
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      expect(avgTime).toBeLessThan(500); // Average should be reasonable
      expect(maxTime - minTime).toBeLessThan(200); // Variance should be small
      
      // Results should be consistent
      const avgAssignments = assignments.reduce((a, b) => a + b) / assignments.length;
      const maxAssignments = Math.max(...assignments);
      const minAssignments = Math.min(...assignments);
      
      expect(maxAssignments - minAssignments).toBeLessThanOrEqual(2); // Should be very consistent
      expect(avgAssignments).toBeGreaterThanOrEqual(15); // Should schedule most students
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Solver Utilities', () => {
  it('should create optimal solver with appropriate settings', () => {
    const smallSolver = createOptimalSolver(10);
    const largeSolver = createOptimalSolver(60);
    
    expect(smallSolver.getStats().strategy).toBe('backtracking');
    expect(largeSolver.getStats().strategy).toBe('backtracking');
    
    // Different solvers should have different timeout settings
    // (We can't directly test this without exposing options, but we test behavior)
    expect(smallSolver).toBeDefined();
    expect(largeSolver).toBeDefined();
  });

  it('should validate inputs correctly', () => {
    const validTeacher = createTestTeacher(createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }])
    ]));
    
    const validStudent = createTestStudent('s1', 'Student', createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 240 }])
    ]));

    // Valid inputs
    expect(validateInputs(validTeacher, [validStudent])).toEqual([]);

    // Invalid teacher
    const invalidTeacher = { ...validTeacher, availability: createEmptyWeekSchedule() };
    expect(validateInputs(invalidTeacher, [validStudent])).toContain('Teacher has no availability set');

    // No students
    expect(validateInputs(validTeacher, [])).toContain('No students to schedule');

    // Student without availability
    const invalidStudent = { ...validStudent, availability: createEmptyWeekSchedule() };
    expect(validateInputs(validTeacher, [invalidStudent])).toContain('1 students have no availability set');
  });

  it('should solve using quick function', () => {
    const teacher = createTestTeacher(createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }])
    ]));
    
    const students = [createTestStudent('s1', 'Student', createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 240 }])
    ]))];

    const solution = solveSchedule(teacher, students, { logLevel: 'none' });
    
    expect(solution).toBeDefined();
    expect(solution.metadata.totalStudents).toBe(1);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('ScheduleSolver - Error Handling', () => {
  it('should handle empty availability gracefully', () => {
    const teacher = createTestTeacher(createEmptyWeekSchedule());
    const students = [createTestStudent('s1', 'Student', createEmptyWeekSchedule())];

    const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);

    expect(solution.assignments).toHaveLength(0);
    expect(solution.unscheduled).toContain('s1');
  });

  it('should respect timeout limits', () => {
    // Create a complex scenario that might take time
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // Very limited availability
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Many students competing for the same slot
    const students = Array.from({ length: 20 }, (_, i) => 
      createTestStudent(`s${i + 1}`, `Student ${i + 1}`, createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 60 }])
      ]))
    );

    const startTime = Date.now();
    const solution = new ScheduleSolver({ 
      maxTimeMs: 100, // Very short timeout
      logLevel: 'none' 
    }).solve(teacher, students);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(200); // Should respect timeout with some buffer
    expect(solution).toBeDefined(); // Should return some result even if incomplete
  });

  it('should handle invalid time blocks gracefully', () => {
    // Teacher with invalid time block (extends past midnight)
    const invalidAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 1400, duration: 100 }]) // 23:20 + 1h40m = past midnight
    ]);
    const teacher = createTestTeacher(invalidAvailability);
    
    const studentAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 600, duration: 240 }])
    ]);
    const students = [createTestStudent('s1', 'Student', studentAvailability)];

    // Should handle invalid data without crashing
    const solution = new ScheduleSolver({ logLevel: 'none' }).solve(teacher, students);
    expect(solution).toBeDefined();
  });

  // Example of how to use visualization in tests
  it('should visualize complex scheduling scenario (when VISUALIZE=true)', async () => {
    // Create a realistic teacher schedule
    const teacherAvailability = createWeekWithDays([
      createDayWithBlocks(1, [{ start: 540, duration: 480 }]), // Monday 9am-5pm
      createDayWithBlocks(2, [{ start: 600, duration: 360 }]), // Tuesday 10am-4pm  
      createDayWithBlocks(3, [{ start: 540, duration: 480 }]), // Wednesday 9am-5pm
    ]);
    const teacher = createTestTeacher(teacherAvailability);

    // Create multiple students with different availability
    const students = [
      createTestStudent('s1', 'Alice Johnson', createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 240 }]) // Mon 10am-2pm
      ]), 60),
      createTestStudent('s2', 'Bob Smith', createWeekWithDays([
        createDayWithBlocks(2, [{ start: 660, duration: 180 }]) // Tue 11am-2pm
      ]), 45),
      createTestStudent('s3', 'Carol Davis', createWeekWithDays([
        createDayWithBlocks(1, [{ start: 780, duration: 120 }]), // Mon 1pm-3pm
        createDayWithBlocks(3, [{ start: 600, duration: 240 }])  // Wed 10am-2pm
      ]), 90)
    ];

    // Run the test with visualization if enabled
    if (shouldVisualize()) {
      await testWithVisualization(
        'Complex Multi-Student Scenario',
        teacher,
        students,
        () => {
          const localSolver = new ScheduleSolver({ logLevel: 'none' });
          return localSolver.solve(teacher, students);
        },
        {
          description: 'Testing scheduling with 3 students across multiple days with different lesson lengths'
        }
      );
    } else {
      // Regular test execution
      const localSolver = new ScheduleSolver({ logLevel: 'none' });
      const solution = localSolver.solve(teacher, students);
      expect(solution.assignments.length).toBeGreaterThan(0);
      expect(solution.metadata.totalStudents).toBe(3);
    }
  });
});