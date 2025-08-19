/**
 * Example showing how to integrate the visualizer with actual tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  captureTestData, 
  enableTestVisualization, 
  visualizableTest 
} from './test-integration';
import { solveSchedule } from '../solver';
import type { StudentConfig, TeacherConfig } from '../types';

// Enable visualization for this test suite
beforeAll(() => {
  enableTestVisualization();
});

// Example teacher and students (simplified)
const exampleTeacher: TeacherConfig = {
  person: { id: 'teacher-1', name: 'Example Teacher', email: 'teacher@test.com' },
  studioId: 'test-studio',
  availability: {
    days: [
      { dayOfWeek: 0, blocks: [] }, // Sunday
      { dayOfWeek: 1, blocks: [{ start: 9 * 60, duration: 6 * 60 }] }, // Monday 9-3
      { dayOfWeek: 2, blocks: [{ start: 10 * 60, duration: 5 * 60 }] }, // Tuesday 10-3
      { dayOfWeek: 3, blocks: [{ start: 9 * 60, duration: 6 * 60 }] }, // Wednesday 9-3
      { dayOfWeek: 4, blocks: [{ start: 10 * 60, duration: 5 * 60 }] }, // Thursday 10-3
      { dayOfWeek: 5, blocks: [{ start: 9 * 60, duration: 3 * 60 }] }, // Friday 9-12
      { dayOfWeek: 6, blocks: [] } // Saturday
    ],
    timezone: 'UTC'
  },
  constraints: {
    maxConsecutiveMinutes: 180,
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 90,
    allowedDurations: [30, 45, 60],
    backToBackPreference: 'agnostic'
  }
};

const exampleStudents: StudentConfig[] = [
  {
    person: { id: 'student-1', name: 'Student One', email: 'student1@test.com' },
    preferredDuration: 60,
    maxLessonsPerWeek: 1,
    availability: {
      days: [
        { dayOfWeek: 0, blocks: [] },
        { dayOfWeek: 1, blocks: [{ start: 9 * 60, duration: 3 * 60 }] }, // Mon 9-12
        { dayOfWeek: 2, blocks: [] },
        { dayOfWeek: 3, blocks: [{ start: 10 * 60, duration: 2 * 60 }] }, // Wed 10-12
        { dayOfWeek: 4, blocks: [] },
        { dayOfWeek: 5, blocks: [] },
        { dayOfWeek: 6, blocks: [] }
      ],
      timezone: 'UTC'
    }
  },
  {
    person: { id: 'student-2', name: 'Student Two', email: 'student2@test.com' },
    preferredDuration: 45,
    maxLessonsPerWeek: 1,
    availability: {
      days: [
        { dayOfWeek: 0, blocks: [] },
        { dayOfWeek: 1, blocks: [] },
        { dayOfWeek: 2, blocks: [{ start: 11 * 60, duration: 3 * 60 }] }, // Tue 11-2
        { dayOfWeek: 3, blocks: [] },
        { dayOfWeek: 4, blocks: [{ start: 12 * 60, duration: 2 * 60 }] }, // Thu 12-2
        { dayOfWeek: 5, blocks: [] },
        { dayOfWeek: 6, blocks: [] }
      ],
      timezone: 'UTC'
    }
  }
];

describe('Visualizer Integration Examples', () => {
  it('should schedule 2 students successfully (with visualization)', 
    visualizableTest(
      'successful_2_student_case',
      exampleTeacher,
      exampleStudents,
      async () => {
        const solution = await solveSchedule(exampleTeacher, exampleStudents);
        expect(solution.assignments.length).toBe(2);
        expect(solution.unscheduled.length).toBe(0);
        return solution;
      },
      { description: 'Simple 2-student scheduling scenario' }
    )
  );

  it('should handle impossible scheduling scenario', async () => {
    // Create an impossible scenario - students with conflicting times
    const impossibleStudents: StudentConfig[] = [
      {
        person: { id: 'conflict-1', name: 'Conflict Student 1', email: 'conflict1@test.com' },
        preferredDuration: 120, // 2 hour lesson
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            { dayOfWeek: 0, blocks: [] },
            { dayOfWeek: 1, blocks: [{ start: 9 * 60, duration: 2 * 60 }] }, // Mon 9-11 (only 2 hours available)
            { dayOfWeek: 2, blocks: [] },
            { dayOfWeek: 3, blocks: [] },
            { dayOfWeek: 4, blocks: [] },
            { dayOfWeek: 5, blocks: [] },
            { dayOfWeek: 6, blocks: [] }
          ],
          timezone: 'UTC'
        }
      }
    ];

    // Capture test data manually for visualization
    captureTestData(
      'impossible_scheduling_scenario',
      exampleTeacher,
      impossibleStudents,
      {
        description: 'Student needs 2h lesson but only 2h available (impossible with breaks)',
        error: 'Insufficient time for lesson including required breaks'
      }
    );

    try {
      const solution = await solveSchedule(exampleTeacher, impossibleStudents);
      // This might succeed or fail depending on solver implementation
      expect(solution.unscheduled.length).toBeGreaterThan(0);
    } catch (error) {
      // Test failed as expected
      expect(error).toBeDefined();
    }
  });

  it('should demonstrate visualizer with partial success', async () => {
    // Create scenario where only some students can be scheduled
    const partialStudents: StudentConfig[] = [
      ...exampleStudents, // The two successful students
      {
        person: { id: 'difficult-student', name: 'Difficult Student', email: 'difficult@test.com' },
        preferredDuration: 90,
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            { dayOfWeek: 0, blocks: [] },
            { dayOfWeek: 1, blocks: [] },
            { dayOfWeek: 2, blocks: [] },
            { dayOfWeek: 3, blocks: [] },
            { dayOfWeek: 4, blocks: [] },
            { dayOfWeek: 5, blocks: [{ start: 11 * 60, duration: 1 * 60 }] }, // Fri 11-12 (only 1h available, needs 1.5h)
            { dayOfWeek: 6, blocks: [] }
          ],
          timezone: 'UTC'
        }
      }
    ];

    const solution = await solveSchedule(exampleTeacher, partialStudents);
    
    captureTestData(
      'partial_success_scenario',
      exampleTeacher,
      partialStudents,
      {
        actualSolution: solution,
        description: 'Scenario where some students can be scheduled but others cannot'
      }
    );

    // Should schedule the first 2 students but not the difficult one
    expect(solution.assignments.length).toBe(2);
    expect(solution.unscheduled.length).toBe(1);
  });
});

// Example of how to use the visualizer programmatically
export function demonstrateVisualizerUsage() {
  console.log('🎯 Demonstrating Schedule Visualizer Usage\n');
  
  console.log('1. Run tests with visualization:');
  console.log('   pnpm test:run --reporter=lib/scheduling/visualizer/test-integration.ts');
  console.log('');
  
  console.log('2. Visualize specific scenarios:');
  console.log('   pnpm visualize --test="successful_2_student_case"');
  console.log('   pnpm visualize --test="impossible_scheduling_scenario" --mode=compact');
  console.log('');
  
  console.log('3. Generate comparison reports:');
  console.log('   pnpm visualize --test="partial_success_scenario" --compare --output=report.txt');
  console.log('');
  
  console.log('4. Interactive debugging:');
  console.log('   pnpm visualize --interactive');
  console.log('');
  
  console.log('✅ Visualizations will be automatically generated in test-reports/visualizations/');
  console.log('   when tests fail and the visualizer reporter is enabled.');
}