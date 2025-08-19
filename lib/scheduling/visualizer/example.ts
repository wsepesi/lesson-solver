/**
 * Example usage of the schedule visualizer
 */

import { ScheduleVisualizer, type VisualizerTestCase } from './index';
import type { StudentConfig, TeacherConfig, TimeBlock, DaySchedule, WeekSchedule } from '../types';

// Create example data
function createExampleTeacher(): TeacherConfig {
  const mondayBlocks: TimeBlock[] = [
    { start: 9 * 60, duration: 4 * 60 }, // 9 AM - 1 PM
    { start: 14 * 60, duration: 3 * 60 } // 2 PM - 5 PM
  ];

  const tuesdayBlocks: TimeBlock[] = [
    { start: 10 * 60, duration: 6 * 60 } // 10 AM - 4 PM
  ];

  const availability: WeekSchedule = {
    days: [
      { dayOfWeek: 0, blocks: [] }, // Sunday - unavailable
      { dayOfWeek: 1, blocks: mondayBlocks }, // Monday
      { dayOfWeek: 2, blocks: tuesdayBlocks }, // Tuesday
      { dayOfWeek: 3, blocks: mondayBlocks }, // Wednesday
      { dayOfWeek: 4, blocks: tuesdayBlocks }, // Thursday
      { dayOfWeek: 5, blocks: [{ start: 9 * 60, duration: 3 * 60 }] }, // Friday - shorter
      { dayOfWeek: 6, blocks: [] } // Saturday - unavailable
    ],
    timezone: 'America/New_York'
  };

  return {
    person: {
      id: 'teacher-1',
      name: 'Ms. Johnson',
      email: 'teacher@example.com'
    },
    studioId: 'studio-123',
    availability,
    constraints: {
      maxConsecutiveMinutes: 180,
      breakDurationMinutes: 15,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [30, 45, 60, 90],
      backToBackPreference: 'agnostic'
    }
  };
}

function createExampleStudents(): StudentConfig[] {
  // Student 1: Alice - available Mon/Wed/Fri mornings
  const aliceAvailability: WeekSchedule = {
    days: [
      { dayOfWeek: 0, blocks: [] },
      { dayOfWeek: 1, blocks: [{ start: 9 * 60, duration: 3 * 60 }] }, // Mon 9-12
      { dayOfWeek: 2, blocks: [] },
      { dayOfWeek: 3, blocks: [{ start: 9 * 60, duration: 3 * 60 }] }, // Wed 9-12
      { dayOfWeek: 4, blocks: [] },
      { dayOfWeek: 5, blocks: [{ start: 9 * 60, duration: 2 * 60 }] }, // Fri 9-11
      { dayOfWeek: 6, blocks: [] }
    ],
    timezone: 'America/New_York'
  };

  // Student 2: Bob - available Tue/Thu afternoons
  const bobAvailability: WeekSchedule = {
    days: [
      { dayOfWeek: 0, blocks: [] },
      { dayOfWeek: 1, blocks: [] },
      { dayOfWeek: 2, blocks: [{ start: 14 * 60, duration: 3 * 60 }] }, // Tue 2-5
      { dayOfWeek: 3, blocks: [] },
      { dayOfWeek: 4, blocks: [{ start: 13 * 60, duration: 4 * 60 }] }, // Thu 1-5
      { dayOfWeek: 5, blocks: [] },
      { dayOfWeek: 6, blocks: [] }
    ],
    timezone: 'America/New_York'
  };

  // Student 3: Charlie - limited availability (conflict scenario)
  const charlieAvailability: WeekSchedule = {
    days: [
      { dayOfWeek: 0, blocks: [] },
      { dayOfWeek: 1, blocks: [{ start: 15 * 60, duration: 2 * 60 }] }, // Mon 3-5 (conflicts with break)
      { dayOfWeek: 2, blocks: [] },
      { dayOfWeek: 3, blocks: [{ start: 16 * 60, duration: 1 * 60 }] }, // Wed 4-5 (very limited)
      { dayOfWeek: 4, blocks: [] },
      { dayOfWeek: 5, blocks: [] },
      { dayOfWeek: 6, blocks: [] }
    ],
    timezone: 'America/New_York'
  };

  return [
    {
      person: { id: 'student-1', name: 'Alice Smith', email: 'alice@example.com' },
      preferredDuration: 60,
      maxLessonsPerWeek: 1,
      availability: aliceAvailability
    },
    {
      person: { id: 'student-2', name: 'Bob Wilson', email: 'bob@example.com' },
      preferredDuration: 45,
      maxLessonsPerWeek: 1,
      availability: bobAvailability
    },
    {
      person: { id: 'student-3', name: 'Charlie Brown', email: 'charlie@example.com' },
      preferredDuration: 30,
      maxLessonsPerWeek: 1,
      availability: charlieAvailability
    }
  ];
}

// Example 1: Basic visualization
export function runBasicExample(): void {
  console.log('🎯 Schedule Visualizer - Basic Example\n');

  const teacher = createExampleTeacher();
  const students = createExampleStudents();

  const testCase: VisualizerTestCase = {
    id: 'basic-example',
    description: 'Three students with varying availability patterns',
    teacher,
    students,
    expectedSolutions: 2 // Expect Alice and Bob to be scheduled, Charlie might fail
  };

  const visualizer = new ScheduleVisualizer({
    mode: 'detailed',
    granularity: 15,
    startHour: 8,
    endHour: 18
  });

  const output = visualizer.renderTestCase(testCase);
  console.log(output);
}

// Example 2: Comparison view
export function runComparisonExample(): void {
  console.log('🔍 Schedule Visualizer - Comparison Example\n');

  const teacher = createExampleTeacher();
  const students = createExampleStudents();

  // Mock expected solution
  const expectedSolution = {
    assignments: [
      { studentId: 'student-1', dayOfWeek: 1, startMinute: 10 * 60, durationMinutes: 60 },
      { studentId: 'student-2', dayOfWeek: 2, startMinute: 14 * 60, durationMinutes: 45 },
      { studentId: 'student-3', dayOfWeek: 3, startMinute: 16 * 60, durationMinutes: 30 }
    ],
    unscheduled: [],
    metadata: {
      totalStudents: 3,
      scheduledStudents: 3,
      averageUtilization: 0.75,
      computeTimeMs: 150
    }
  };

  // Mock actual solution (partial failure)
  const actualSolution = {
    assignments: [
      { studentId: 'student-1', dayOfWeek: 1, startMinute: 9 * 60, durationMinutes: 60 },
      { studentId: 'student-2', dayOfWeek: 2, startMinute: 14 * 60, durationMinutes: 45 }
    ],
    unscheduled: ['student-3'],
    metadata: {
      totalStudents: 3,
      scheduledStudents: 2,
      averageUtilization: 0.50,
      computeTimeMs: 220
    }
  };

  const testCase: VisualizerTestCase = {
    id: 'comparison-example',
    description: 'Expected vs actual scheduling results',
    teacher,
    students,
    expectedSolution,
    actualSolution
  };

  const visualizer = new ScheduleVisualizer({
    mode: 'detailed',
    granularity: 30
  });

  const output = visualizer.renderComparison(testCase);
  console.log(output);
}

// Example 3: Compact mode
export function runCompactExample(): void {
  console.log('📊 Schedule Visualizer - Compact Mode Example\n');

  const teacher = createExampleTeacher();
  const students = createExampleStudents();

  const testCase: VisualizerTestCase = {
    id: 'compact-example',
    description: 'Summary view for quick overview',
    teacher,
    students
  };

  const visualizer = new ScheduleVisualizer({
    mode: 'summary',
    showLegend: false
  });

  const output = visualizer.renderTestCase(testCase);
  console.log(output);
}

// Example 4: Error scenario
export function runErrorExample(): void {
  console.log('❌ Schedule Visualizer - Error Scenario Example\n');

  const teacher = createExampleTeacher();
  const students = createExampleStudents();

  const testCase: VisualizerTestCase = {
    id: 'error-example',
    description: 'Solver encountered an error during scheduling',
    teacher,
    students,
    error: 'Constraint violation: Unable to satisfy back-to-back requirements for multiple students'
  };

  const visualizer = new ScheduleVisualizer();
  const output = visualizer.renderTestCase(testCase);
  console.log(output);
}

// Run all examples
export function runAllExamples(): void {
  console.log('🚀 Running all Schedule Visualizer examples...\n');
  console.log('='.repeat(80));
  
  runBasicExample();
  console.log('\n' + '='.repeat(80));
  
  runComparisonExample();
  console.log('\n' + '='.repeat(80));
  
  runCompactExample();
  console.log('\n' + '='.repeat(80));
  
  runErrorExample();
  console.log('\n' + '='.repeat(80));
  
  console.log('\n✅ All examples completed!');
}

// CLI entry point
if (require.main === module) {
  runAllExamples();
}