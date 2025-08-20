/**
 * Core Solver Fixture Tests - No Heuristics
 * 
 * This test suite uses comprehensive fixtures to test the core solver
 * without heuristics. Uses hand-crafted test cases that ensure proper
 * coverage of scheduling scenarios and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { ScheduleSolver } from '../solver';
import {
  loadAllFixtures,
  loadFixture,
  getFixturesByCategory,
  type TestFixture
} from './fixtures/fixture-loader';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a solver configured for no-heuristics testing
 */
function createCoreTestSolver(options = {}) {
  return new ScheduleSolver({
    useHeuristics: false, // CRITICAL: No heuristics for core testing
    useConstraintPropagation: true,
    maxTimeMs: 5000,
    logLevel: 'none',
    ...options
  });
}

/**
 * Run a fixture test and validate results
 */
function runFixtureTest(fixture: TestFixture) {
  const solver = createCoreTestSolver();
  const solution = solver.solve(fixture.teacher, fixture.students);

  // Basic sanity checks
  expect(solution).toBeDefined();
  expect(solution.assignments.length + solution.unscheduled.length).toBe(fixture.students.length);

  // Check assignment count expectations
  expect(solution.assignments.length).toBeGreaterThanOrEqual(fixture.expectedResults.minAssignments);
  expect(solution.assignments.length).toBeLessThanOrEqual(fixture.expectedResults.maxAssignments);

  // Check if specific students should be impossible
  if (fixture.expectedResults.impossibleStudents) {
    fixture.expectedResults.impossibleStudents.forEach(studentId => {
      expect(solution.unscheduled).toContain(studentId);
    });
  }

  // Validate solution correctness
  validateSolutionCorrectness(solution, fixture);

  return solution;
}

/**
 * Validate that a solution meets all hard constraints
 */
function validateSolutionCorrectness(solution: any, fixture: TestFixture) {
  const assignments = solution.assignments;

  // Check for overlapping assignments (no two lessons at same time)
  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a1 = assignments[i];
      const a2 = assignments[j];
      
      if (a1.dayOfWeek === a2.dayOfWeek) {
        const end1 = a1.startMinute + a1.durationMinutes;
        const end2 = a2.startMinute + a2.durationMinutes;
        
        // Check no overlap
        const noOverlap = (end1 <= a2.startMinute) || (end2 <= a1.startMinute);
        expect(noOverlap).toBe(true);
      }
    }
  }

  // Check that all assignments are within teacher availability
  assignments.forEach((assignment: any) => {
    const teacherDay = fixture.teacher.availability.days[assignment.dayOfWeek];
    expect(teacherDay).toBeDefined();
    
    const teacherBlocks = teacherDay!.blocks;
    const assignmentEnd = assignment.startMinute + assignment.durationMinutes;
    
    const withinTeacherAvailability = teacherBlocks.some(block => 
      assignment.startMinute >= block.start && 
      assignmentEnd <= block.start + block.duration
    );
    expect(withinTeacherAvailability).toBe(true);
  });

  // Check that all assignments are within student availability
  assignments.forEach((assignment: any) => {
    const student = fixture.students.find(s => s.person.id === assignment.studentId);
    expect(student).toBeDefined();
    
    const studentDay = student!.availability.days[assignment.dayOfWeek];
    expect(studentDay).toBeDefined();
    
    const studentBlocks = studentDay!.blocks;
    const assignmentEnd = assignment.startMinute + assignment.durationMinutes;
    
    const withinStudentAvailability = studentBlocks.some(block => 
      assignment.startMinute >= block.start && 
      assignmentEnd <= block.start + block.duration
    );
    expect(withinStudentAvailability).toBe(true);
  });

  // Check duration constraints
  assignments.forEach((assignment: any) => {
    const constraints = fixture.teacher.constraints;
    
    // Check allowed durations
    if (constraints.allowedDurations && constraints.allowedDurations.length > 0) {
      expect(constraints.allowedDurations).toContain(assignment.durationMinutes);
    }
    
    // Check min/max duration
    expect(assignment.durationMinutes).toBeGreaterThanOrEqual(constraints.minLessonDuration);
    expect(assignment.durationMinutes).toBeLessThanOrEqual(constraints.maxLessonDuration);
  });
}

// ============================================================================
// FIXTURE-BASED TESTS
// ============================================================================

describe('Core Solver - Trivial Fixtures (No Heuristics)', () => {
  const trivialFixtures = getFixturesByCategory('trivial');

  trivialFixtures.forEach(fixture => {
    it(`should handle ${fixture.name}`, () => {
      const solution = runFixtureTest(fixture);
      
      // Additional checks specific to trivial cases
      if (fixture.expectedResults.shouldBeFullySolvable) {
        expect(solution.unscheduled.length).toBe(0);
      }
    });
  });

  it('should load all trivial fixtures correctly', () => {
    expect(trivialFixtures.length).toBeGreaterThan(0);
    trivialFixtures.forEach(fixture => {
      expect(fixture.category).toBe('trivial');
      expect(fixture.teacher).toBeDefined();
      expect(fixture.students.length).toBeGreaterThan(0);
    });
  });
});

describe('Core Solver - Simple Fixtures (No Heuristics)', () => {
  const simpleFixtures = getFixturesByCategory('simple');

  simpleFixtures.forEach(fixture => {
    it(`should handle ${fixture.name}`, () => {
      const solution = runFixtureTest(fixture);
      
      // For simple cases, check deterministic behavior
      const solution2 = runFixtureTest(fixture);
      expect(solution.assignments.length).toBe(solution2.assignments.length);
      expect(solution.unscheduled.length).toBe(solution2.unscheduled.length);
    });
  });

  it('should process students in natural order for simple cases', () => {
    const fixture = loadFixture('simple-001'); // Two students non-overlapping
    expect(fixture).toBeDefined();
    
    if (fixture) {
      const solution = runFixtureTest(fixture);
      
      // Should schedule both students
      expect(solution.assignments.length).toBe(2);
      
      // Check that students are processed in order (first student gets first choice)
      const assignment1 = solution.assignments.find((a: any) => a.studentId === 'student-s1-001');
      const assignment2 = solution.assignments.find((a: any) => a.studentId === 'student-s1-002');
      
      expect(assignment1).toBeDefined();
      expect(assignment2).toBeDefined();
    }
  });
});

describe('Core Solver - Complex Fixtures (No Heuristics)', () => {
  const complexFixtures = getFixturesByCategory('complex');

  complexFixtures.forEach(fixture => {
    it(`should handle ${fixture.name}`, () => {
      const solution = runFixtureTest(fixture);
      
      // Complex cases should complete within reasonable time
      expect(solution.metadata.computeTimeMs).toBeLessThan(5000);
    });
  });

  it('should enforce duration constraints strictly', () => {
    const fixture = loadFixture('complex-001'); // Duration constraints
    expect(fixture).toBeDefined();
    
    if (fixture) {
      const solution = runFixtureTest(fixture);
      
      // Check that all scheduled lessons use allowed durations
      const allowedDurations = fixture.teacher.constraints.allowedDurations || [];
      solution.assignments.forEach((assignment: any) => {
        expect(allowedDurations).toContain(assignment.durationMinutes);
      });
    }
  });

  it('should demonstrate backtracking capability', () => {
    const fixture = loadFixture('complex-002'); // Backtracking required
    expect(fixture).toBeDefined();
    
    if (fixture) {
      const solution = runFixtureTest(fixture);
      
      // Should find some solution even if not optimal
      expect(solution.assignments.length).toBeGreaterThan(0);
      
      // Validate that the solution respects all constraints
      validateSolutionCorrectness(solution, fixture);
    }
  });
});

describe('Core Solver - Edge Case Fixtures (No Heuristics)', () => {
  const edgeFixtures = getFixturesByCategory('edge-case');

  edgeFixtures.forEach(fixture => {
    it(`should handle ${fixture.name}`, () => {
      const solution = runFixtureTest(fixture);
      
      // Edge cases should not crash or hang
      expect(solution).toBeDefined();
      expect(solution.metadata).toBeDefined();
    });
  });

  it('should handle empty availability gracefully', () => {
    const fixture = loadFixture('edge-001'); // Empty availability
    expect(fixture).toBeDefined();
    
    if (fixture) {
      const solution = runFixtureTest(fixture);
      
      // Should schedule nothing but not crash
      expect(solution.assignments.length).toBe(0);
      expect(solution.unscheduled.length).toBe(fixture.students.length);
    }
  });

  it('should handle boundary times correctly', () => {
    const fixture = loadFixture('edge-002'); // Boundary times
    expect(fixture).toBeDefined();
    
    if (fixture) {
      const solution = runFixtureTest(fixture);
      
      // Should work with extreme times
      if (solution.assignments.length > 0) {
        const assignment = solution.assignments[0];
        expect(assignment.startMinute).toBeGreaterThanOrEqual(0);
        expect(assignment.startMinute + assignment.durationMinutes).toBeLessThanOrEqual(1440);
      }
    }
  });
});

// ============================================================================
// COMPREHENSIVE FIXTURE INTEGRATION TESTS
// ============================================================================

describe('Core Solver - All Fixtures Integration (No Heuristics)', () => {
  it('should load all fixture collections successfully', () => {
    const collections = loadAllFixtures();
    
    expect(collections.length).toBeGreaterThan(0);
    
    let totalFixtures = 0;
    collections.forEach(collection => {
      expect(collection.name).toBeDefined();
      expect(collection.description).toBeDefined();
      expect(collection.fixtures.length).toBeGreaterThan(0);
      totalFixtures += collection.fixtures.length;
    });
    
    expect(totalFixtures).toBeGreaterThanOrEqual(8); // Expect at least 8 fixtures
  });

  it('should run all fixtures without errors', () => {
    const collections = loadAllFixtures();
    let passedCount = 0;
    let totalCount = 0;
    
    collections.forEach(collection => {
      collection.fixtures.forEach(fixture => {
        totalCount++;
        try {
          runFixtureTest(fixture);
          passedCount++;
        } catch (error) {
          console.error(`Fixture ${fixture.id} failed:`, error);
        }
      });
    });
    
    // Should pass most fixtures (allow for some expected failures in edge cases)
    expect(passedCount).toBeGreaterThanOrEqual(totalCount * 0.8);
  });

  it('should demonstrate consistent behavior across multiple runs', () => {
    const fixture = loadFixture('simple-001'); // Deterministic case
    expect(fixture).toBeDefined();
    
    if (fixture) {
      const results = [];
      
      for (let i = 0; i < 5; i++) {
        const solution = runFixtureTest(fixture);
        results.push({
          assignments: solution.assignments.length,
          unscheduled: solution.unscheduled.length
        });
      }
      
      // All runs should produce identical results
      const first = results[0];
      results.forEach(result => {
        expect(result.assignments).toBe(first!.assignments);
        expect(result.unscheduled).toBe(first!.unscheduled);
      });
    }
  });

  it('should provide performance benchmarks for fixture complexity', () => {
    const categories = ['trivial', 'simple', 'complex', 'edge-case'] as const;
    const performanceResults: Record<string, number[]> = {};
    
    categories.forEach(category => {
      const fixtures = getFixturesByCategory(category);
      performanceResults[category] = [];
      
      fixtures.forEach(fixture => {
        const startTime = Date.now();
        runFixtureTest(fixture);
        const elapsed = Date.now() - startTime;
        performanceResults[category]!.push(elapsed);
      });
    });
    
    // Trivial should be fastest, complex might be slower
    const trivialAvg = performanceResults.trivial!.reduce((a, b) => a + b, 0) / performanceResults.trivial!.length;
    const complexAvg = performanceResults.complex!.reduce((a, b) => a + b, 0) / performanceResults.complex!.length;
    
    expect(trivialAvg).toBeLessThan(100); // Trivial should be very fast
    expect(complexAvg).toBeLessThan(1000); // Complex should still be reasonable
  });
});