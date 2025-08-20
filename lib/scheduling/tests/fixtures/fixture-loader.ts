/**
 * Fixture Loading Utilities
 * 
 * Provides utilities for loading and using test fixtures for no-heuristics
 * core solver testing. Creates comprehensive test scenarios that work
 * with the core solver without relying on complex generators.
 */

import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  Person
} from '../../types';

// ============================================================================
// FIXTURE TYPES
// ============================================================================

export interface TestFixture {
  id: string;
  name: string;
  description: string;
  category: 'trivial' | 'simple' | 'complex' | 'edge-case' | 'performance' | 'stress';
  expectedBehavior: string;
  teacher: TeacherConfig;
  students: StudentConfig[];
  expectedResults: {
    minAssignments: number;
    maxAssignments: number;
    shouldBeFullySolvable: boolean;
    impossibleStudents?: string[];
  };
}

export interface FixtureCollection {
  name: string;
  description: string;
  fixtures: TestFixture[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestPerson(id: string, name: string): Person {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`
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

function createTeacher(
  id: string,
  name: string,
  availability: WeekSchedule,
  constraints?: Partial<SchedulingConstraints>
): TeacherConfig {
  const defaultConstraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 180,
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };

  return {
    person: createTestPerson(id, name),
    studioId: `studio-${id}`,
    availability,
    constraints: { ...defaultConstraints, ...constraints }
  };
}

function createStudent(
  id: string,
  name: string,
  availability: WeekSchedule,
  preferredDuration = 60,
  maxLessonsPerWeek = 1
): StudentConfig {
  return {
    person: createTestPerson(id, name),
    preferredDuration,
    maxLessonsPerWeek,
    availability
  };
}

// ============================================================================
// CORE SOLVER FIXTURES (NO HEURISTICS)
// ============================================================================

/**
 * Create trivial test fixtures for basic correctness testing
 */
export function createTrivialFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // Single student, perfect fit
  fixtures.push({
    id: 'trivial-001',
    name: 'Single Student Perfect Fit',
    description: 'One student with availability that exactly matches teacher availability',
    category: 'trivial',
    expectedBehavior: 'Should schedule the student at the exact available time slot',
    teacher: createTeacher(
      'teacher-trivial-001',
      'Perfect Fit Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Monday 10am-11am
      ])
    ),
    students: [
      createStudent(
        'student-001',
        'Perfect Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Monday 10am-11am
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 1,
      maxAssignments: 1,
      shouldBeFullySolvable: true
    }
  });

  // No overlapping availability
  fixtures.push({
    id: 'trivial-002',
    name: 'No Overlap Impossible',
    description: 'Teacher and student have no overlapping availability',
    category: 'trivial',
    expectedBehavior: 'Should fail to schedule any students',
    teacher: createTeacher(
      'teacher-trivial-002',
      'Morning Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // Monday 9am-12pm
      ])
    ),
    students: [
      createStudent(
        'student-002',
        'Evening Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 840, duration: 180 }]) // Monday 2pm-5pm
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 0,
      maxAssignments: 0,
      shouldBeFullySolvable: false,
      impossibleStudents: ['student-002']
    }
  });

  // Insufficient duration
  fixtures.push({
    id: 'trivial-003',
    name: 'Insufficient Duration',
    description: 'Available time slot is too short for requested lesson duration',
    category: 'trivial',
    expectedBehavior: 'Should fail to schedule due to insufficient duration',
    teacher: createTeacher(
      'teacher-trivial-003',
      'Short Slot Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 30 }]) // Monday 10am-10:30am
      ])
    ),
    students: [
      createStudent(
        'student-003',
        'Long Lesson Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // Monday 10am-11am
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 0,
      maxAssignments: 0,
      shouldBeFullySolvable: false,
      impossibleStudents: ['student-003']
    }
  });

  return {
    name: 'Trivial Core Solver Fixtures',
    description: 'Basic test cases for core solver correctness without heuristics',
    fixtures
  };
}

/**
 * Create simple multi-student fixtures for sequential processing
 */
export function createSimpleFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // Two students, non-overlapping
  fixtures.push({
    id: 'simple-001',
    name: 'Two Students Non-Overlapping',
    description: 'Two students with clearly separated time preferences',
    category: 'simple',
    expectedBehavior: 'Should schedule both students in their preferred time slots',
    teacher: createTeacher(
      'teacher-simple-001',
      'Available Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9am-5pm
      ])
    ),
    students: [
      createStudent(
        'student-s1-001',
        'Morning Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // Monday 10am-12pm
        ]),
        60
      ),
      createStudent(
        'student-s1-002',
        'Afternoon Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 780, duration: 120 }]) // Monday 1pm-3pm
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 2,
      maxAssignments: 2,
      shouldBeFullySolvable: true
    }
  });

  // Three students, overlapping availability (forces choice)
  fixtures.push({
    id: 'simple-002',
    name: 'Three Students Overlapping',
    description: 'Three students with overlapping availability requiring sequential decisions',
    category: 'simple',
    expectedBehavior: 'Should schedule students in order, with later students getting remaining slots',
    teacher: createTeacher(
      'teacher-simple-002',
      'Limited Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 180 }]) // Monday 10am-1pm
      ])
    ),
    students: [
      createStudent(
        'student-s2-001',
        'First Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // Monday 10am-12pm
        ]),
        60
      ),
      createStudent(
        'student-s2-002',
        'Second Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 120 }]) // Monday 11am-1pm
        ]),
        60
      ),
      createStudent(
        'student-s2-003',
        'Third Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 60 }]) // Monday 12pm-1pm
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 2,
      maxAssignments: 3,
      shouldBeFullySolvable: false // Not all can fit
    }
  });

  // Multi-day distribution
  fixtures.push({
    id: 'simple-003',
    name: 'Multi-Day Distribution',
    description: 'Students with availability across multiple days',
    category: 'simple',
    expectedBehavior: 'Should distribute students across available days without heuristic preferences',
    teacher: createTeacher(
      'teacher-simple-003',
      'Multi-Day Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 120 }]), // Monday 10am-12pm
        createDayWithBlocks(2, [{ start: 600, duration: 120 }]), // Tuesday 10am-12pm
        createDayWithBlocks(3, [{ start: 600, duration: 120 }])  // Wednesday 10am-12pm
      ])
    ),
    students: [
      createStudent(
        'student-s3-001',
        'Monday Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 60 }])
        ]),
        60
      ),
      createStudent(
        'student-s3-002',
        'Tuesday Student',
        createWeekWithDays([
          createDayWithBlocks(2, [{ start: 600, duration: 60 }])
        ]),
        60
      ),
      createStudent(
        'student-s3-003',
        'Flexible Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 60 }]),
          createDayWithBlocks(3, [{ start: 600, duration: 60 }])
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 3,
      maxAssignments: 3,
      shouldBeFullySolvable: true
    }
  });

  return {
    name: 'Simple Multi-Student Fixtures',
    description: 'Test cases for sequential student processing and basic scheduling logic',
    fixtures
  };
}

/**
 * Create complex fixtures for constraint testing
 */
export function createComplexFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // Duration constraint testing
  fixtures.push({
    id: 'complex-001',
    name: 'Duration Constraints',
    description: 'Test enforcement of allowed lesson durations',
    category: 'complex',
    expectedBehavior: 'Should only schedule lessons with allowed durations',
    teacher: createTeacher(
      'teacher-complex-001',
      'Strict Duration Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 480 }]) // Monday 9am-5pm
      ]),
      {
        allowedDurations: [30, 45], // Only 30 and 45 minute lessons
        minLessonDuration: 30,
        maxLessonDuration: 45
      }
    ),
    students: [
      createStudent(
        'student-c1-001',
        'Sixty Minute Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }])
        ]),
        60 // Wants 60 minutes (not allowed)
      ),
      createStudent(
        'student-c1-002',
        'Thirty Minute Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 60 }])
        ]),
        30 // Wants 30 minutes (allowed)
      )
    ],
    expectedResults: {
      minAssignments: 1,
      maxAssignments: 2, // First student might get 45min instead of 60min
      shouldBeFullySolvable: false
    }
  });

  // Backtracking scenario
  fixtures.push({
    id: 'complex-002',
    name: 'Backtracking Required',
    description: 'Scenario where initial choices lead to dead ends, requiring backtracking',
    category: 'complex',
    expectedBehavior: 'Should backtrack from failed attempts and find valid solution',
    teacher: createTeacher(
      'teacher-complex-002',
      'Backtrack Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 180 }]) // Monday 10am-1pm
      ])
    ),
    students: [
      createStudent(
        'student-c2-001',
        'Flexible Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // Monday 10am-12pm
        ]),
        60
      ),
      createStudent(
        'student-c2-002',
        'Constrained Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 120 }]) // Monday 11am-1pm (overlaps)
        ]),
        90 // Needs 90 minutes
      )
    ],
    expectedResults: {
      minAssignments: 1,
      maxAssignments: 2,
      shouldBeFullySolvable: false // Both can't fit optimally
    }
  });

  return {
    name: 'Complex Constraint Fixtures',
    description: 'Test cases for advanced constraint satisfaction and backtracking',
    fixtures
  };
}

/**
 * Create edge case fixtures
 */
export function createEdgeCaseFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // Empty availability
  fixtures.push({
    id: 'edge-001',
    name: 'Empty Availability',
    description: 'Students and teacher with no availability',
    category: 'edge-case',
    expectedBehavior: 'Should handle empty schedules gracefully',
    teacher: createTeacher(
      'teacher-edge-001',
      'Unavailable Teacher',
      createWeekWithDays([]) // No availability
    ),
    students: [
      createStudent(
        'student-e1-001',
        'Unavailable Student',
        createWeekWithDays([]), // No availability
        60
      )
    ],
    expectedResults: {
      minAssignments: 0,
      maxAssignments: 0,
      shouldBeFullySolvable: false,
      impossibleStudents: ['student-e1-001']
    }
  });

  // Boundary time testing
  fixtures.push({
    id: 'edge-002',
    name: 'Boundary Times',
    description: 'Testing with start/end of day boundary times',
    category: 'edge-case',
    expectedBehavior: 'Should handle early morning and late evening times correctly',
    teacher: createTeacher(
      'teacher-edge-002',
      'Early Bird Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 0, duration: 60 },    // Midnight-1am
          { start: 1380, duration: 60 }  // 11pm-midnight
        ])
      ])
    ),
    students: [
      createStudent(
        'student-e2-001',
        'Night Owl Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 1380, duration: 60 }]) // 11pm-midnight
        ]),
        30
      )
    ],
    expectedResults: {
      minAssignments: 1,
      maxAssignments: 1,
      shouldBeFullySolvable: true
    }
  });

  return {
    name: 'Edge Case Fixtures',
    description: 'Test cases for boundary conditions and error handling',
    fixtures
  };
}

/**
 * Create constraint coverage fixtures for comprehensive constraint testing
 */
export function createConstraintCoverageFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // Consecutive time limit constraint
  fixtures.push({
    id: 'constraint-001',
    name: 'Consecutive Time Limit Constraint',
    description: 'Test enforcement of maximum consecutive minutes constraint',
    category: 'complex',
    expectedBehavior: 'Should enforce consecutive time limits with required breaks',
    teacher: createTeacher(
      'teacher-constraint-001',
      'Limited Consecutive Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (5 hours)
      ]),
      {
        maxConsecutiveMinutes: 120, // Max 2 hours consecutive
        breakDurationMinutes: 15,
        allowedDurations: [60]
      }
    ),
    students: [
      createStudent(
        'student-c1-001',
        'First Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 180 }]) // 9am-12pm
        ]),
        60
      ),
      createStudent(
        'student-c1-002',
        'Second Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 180 }]) // 10am-1pm
        ]),
        60
      ),
      createStudent(
        'student-c1-003',
        'Third Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 180 }]) // 11am-2pm
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 2,
      maxAssignments: 3,
      shouldBeFullySolvable: false
    }
  });

  // Break requirement constraint
  fixtures.push({
    id: 'constraint-002',
    name: 'Break Requirement Constraint',
    description: 'Test enforcement of required breaks between lessons',
    category: 'complex',
    expectedBehavior: 'Should require breaks between consecutive lessons',
    teacher: createTeacher(
      'teacher-constraint-002',
      'Break Requiring Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // Monday 9am-1pm
      ]),
      {
        breakDurationMinutes: 30, // 30-minute breaks required
        allowedDurations: [60]
      }
    ),
    students: [
      createStudent(
        'student-c2-001',
        'First Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 120 }]) // 9am-11am
        ]),
        60
      ),
      createStudent(
        'student-c2-002',
        'Second Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 120 }]) // 10am-12pm
        ]),
        60
      ),
      createStudent(
        'student-c2-003',
        'Third Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 690, duration: 60 }]) // 11:30am-12:30pm
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 2,
      maxAssignments: 3,
      shouldBeFullySolvable: false
    }
  });

  // Mixed duration constraints
  fixtures.push({
    id: 'constraint-003',
    name: 'Mixed Duration Constraints',
    description: 'Test handling of mixed lesson durations',
    category: 'complex',
    expectedBehavior: 'Should schedule lessons with different durations appropriately',
    teacher: createTeacher(
      'teacher-constraint-003',
      'Mixed Duration Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm
      ]),
      {
        allowedDurations: [30, 45, 60, 90],
        minLessonDuration: 30,
        maxLessonDuration: 90
      }
    ),
    students: [
      createStudent(
        'student-c3-001',
        'Thirty Minute Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 60 }]) // 9am-10am
        ]),
        30
      ),
      createStudent(
        'student-c3-002',
        'Forty-Five Minute Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 570, duration: 90 }]) // 9:30am-11am
        ]),
        45
      ),
      createStudent(
        'student-c3-003',
        'Sixty Minute Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 615, duration: 120 }]) // 10:15am-12:15pm
        ]),
        60
      ),
      createStudent(
        'student-c3-004',
        'Ninety Minute Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 675, duration: 150 }]) // 11:15am-1:45pm
        ]),
        90
      )
    ],
    expectedResults: {
      minAssignments: 3,
      maxAssignments: 4,
      shouldBeFullySolvable: true
    }
  });

  return {
    name: 'Constraint Coverage Fixtures',
    description: 'Test cases for comprehensive constraint validation',
    fixtures
  };
}

/**
 * Create performance test fixtures for scaling and timing tests
 */
export function createPerformanceFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // Large student count test
  fixtures.push({
    id: 'performance-001',
    name: 'Large Student Count Test',
    description: 'Test solver performance with many students',
    category: 'performance',
    expectedBehavior: 'Should handle large numbers of students efficiently',
    teacher: createTeacher(
      'teacher-perf-001',
      'High Capacity Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 480, duration: 600 }]), // Monday 8am-6pm
        createDayWithBlocks(2, [{ start: 480, duration: 600 }]), // Tuesday 8am-6pm
        createDayWithBlocks(3, [{ start: 480, duration: 600 }]), // Wednesday 8am-6pm
        createDayWithBlocks(4, [{ start: 480, duration: 600 }]), // Thursday 8am-6pm
        createDayWithBlocks(5, [{ start: 480, duration: 600 }])  // Friday 8am-6pm
      ]),
      {
        allowedDurations: [60],
        maxConsecutiveMinutes: 240
      }
    ),
    students: Array.from({ length: 30 }, (_, i) => 
      createStudent(
        `student-perf-${i + 1}`,
        `Performance Student ${i + 1}`,
        createWeekWithDays([
          createDayWithBlocks((i % 5) + 1, [{ 
            start: 480 + (i % 10) * 60, 
            duration: 180 + (i % 3) * 60 
          }])
        ]),
        60
      )
    ),
    expectedResults: {
      minAssignments: 25,
      maxAssignments: 30,
      shouldBeFullySolvable: true
    }
  });

  // Fragmented availability test
  fixtures.push({
    id: 'performance-002',
    name: 'Fragmented Availability Test',
    description: 'Test solver with highly fragmented teacher availability',
    category: 'performance',
    expectedBehavior: 'Should handle fragmented schedules efficiently',
    teacher: createTeacher(
      'teacher-perf-002',
      'Fragmented Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [
          { start: 540, duration: 30 }, // 9:00-9:30
          { start: 600, duration: 30 }, // 10:00-10:30
          { start: 660, duration: 30 }, // 11:00-11:30
          { start: 720, duration: 30 }, // 12:00-12:30
          { start: 780, duration: 30 }, // 1:00-1:30
          { start: 840, duration: 30 }  // 2:00-2:30
        ])
      ])
    ),
    students: Array.from({ length: 12 }, (_, i) => 
      createStudent(
        `student-frag-${i + 1}`,
        `Fragmented Student ${i + 1}`,
        createWeekWithDays([
          createDayWithBlocks(1, [{ 
            start: 540 + (i * 30), 
            duration: 90 
          }])
        ]),
        30
      )
    ),
    expectedResults: {
      minAssignments: 6,
      maxAssignments: 12,
      shouldBeFullySolvable: false
    }
  });

  return {
    name: 'Performance Test Fixtures',
    description: 'Test cases for performance and scalability validation',
    fixtures
  };
}

/**
 * Create stress test fixtures for edge cases and algorithm-breaking scenarios
 */
export function createStressTestFixtures(): FixtureCollection {
  const fixtures: TestFixture[] = [];

  // High time utilization test
  fixtures.push({
    id: 'stress-001',
    name: 'High Time Utilization Test',
    description: 'Test solver at near-maximum time capacity',
    category: 'stress',
    expectedBehavior: 'Should handle high utilization scenarios efficiently',
    teacher: createTeacher(
      'teacher-stress-001',
      'High Utilization Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm (5 hours = 300 minutes)
      ])
    ),
    students: Array.from({ length: 5 }, (_, i) => 
      createStudent(
        `student-stress-${i + 1}`,
        `High Util Student ${i + 1}`,
        createWeekWithDays([
          createDayWithBlocks(1, [{ 
            start: 540 + (i * 50), 
            duration: 120 
          }])
        ]),
        60
      )
    ),
    expectedResults: {
      minAssignments: 4,
      maxAssignments: 5,
      shouldBeFullySolvable: true
    }
  });

  // Combinatorial explosion test
  fixtures.push({
    id: 'stress-002',
    name: 'Combinatorial Explosion Test',
    description: 'Test solver with many overlapping but incompatible constraints',
    category: 'stress',
    expectedBehavior: 'Should handle complex constraint interactions without performance degradation',
    teacher: createTeacher(
      'teacher-stress-002',
      'Complex Constraints Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 600, duration: 180 }]) // Monday 10am-1pm (3 hours)
      ]),
      {
        allowedDurations: [90],
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 30
      }
    ),
    students: Array.from({ length: 25 }, (_, i) => 
      createStudent(
        `student-combo-${i + 1}`,
        `Combo Student ${i + 1}`,
        createWeekWithDays([
          createDayWithBlocks(1, [{ 
            start: 600 + (i % 4) * 15, // Overlapping 15-minute offsets
            duration: 90 
          }])
        ]),
        90
      )
    ),
    expectedResults: {
      minAssignments: 1,
      maxAssignments: 2,
      shouldBeFullySolvable: false
    }
  });

  // Backtracking scenario test
  fixtures.push({
    id: 'stress-003',
    name: 'Deep Backtracking Test',
    description: 'Test scenario requiring extensive backtracking',
    category: 'stress',
    expectedBehavior: 'Should find solution despite misleading initial choices',
    teacher: createTeacher(
      'teacher-stress-003',
      'Backtracking Teacher',
      createWeekWithDays([
        createDayWithBlocks(1, [{ start: 540, duration: 300 }]) // Monday 9am-2pm
      ])
    ),
    students: [
      // Student 1: Can take multiple slots (backtracking trigger)
      createStudent(
        'student-backtrack-001',
        'Flexible Student',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 540, duration: 240 }]) // 9am-1pm
        ]),
        60
      ),
      // Student 2: Can only fit in specific slot
      createStudent(
        'student-backtrack-002',
        'Constrained Student 1',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 600, duration: 60 }]) // 10am-11am only
        ]),
        60
      ),
      // Student 3: Can only fit in different specific slot
      createStudent(
        'student-backtrack-003',
        'Constrained Student 2',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 660, duration: 60 }]) // 11am-12pm only
        ]),
        60
      ),
      // Student 4: Can only fit in third specific slot
      createStudent(
        'student-backtrack-004',
        'Constrained Student 3',
        createWeekWithDays([
          createDayWithBlocks(1, [{ start: 720, duration: 60 }]) // 12pm-1pm only
        ]),
        60
      )
    ],
    expectedResults: {
      minAssignments: 4,
      maxAssignments: 4,
      shouldBeFullySolvable: true
    }
  });

  return {
    name: 'Stress Test Fixtures',
    description: 'Test cases for algorithm stress testing and edge cases',
    fixtures
  };
}

// ============================================================================
// FIXTURE LOADING FUNCTIONS
// ============================================================================

/**
 * Load all fixture collections for comprehensive testing
 */
export function loadAllFixtures(): FixtureCollection[] {
  return [
    createTrivialFixtures(),
    createSimpleFixtures(),
    createComplexFixtures(),
    createEdgeCaseFixtures(),
    createConstraintCoverageFixtures(),
    createPerformanceFixtures(),
    createStressTestFixtures()
  ];
}

/**
 * Load specific fixture collection by name
 */
export function loadFixtureCollection(name: string): FixtureCollection | null {
  const collections = loadAllFixtures();
  return collections.find(collection => 
    collection.name.toLowerCase().includes(name.toLowerCase())
  ) || null;
}

/**
 * Load specific fixture by ID
 */
export function loadFixture(id: string): TestFixture | null {
  const collections = loadAllFixtures();
  for (const collection of collections) {
    const fixture = collection.fixtures.find(f => f.id === id);
    if (fixture) return fixture;
  }
  return null;
}

/**
 * Get all fixtures of a specific category
 */
export function getFixturesByCategory(category: TestFixture['category']): TestFixture[] {
  const collections = loadAllFixtures();
  const fixtures: TestFixture[] = [];
  
  collections.forEach(collection => {
    fixtures.push(...collection.fixtures.filter(f => f.category === category));
  });
  
  return fixtures;
}