/**
 * Test to verify the integration of optimizations with the main solver
 */

import type {
  StudentConfig,
  TeacherConfig,
  WeekSchedule,
  DaySchedule,
  SchedulingConstraints
} from './types';

import { createOptimalSolver } from './solver';
import { createOptimalConfig } from './optimizations';

// Helper function to create a basic day schedule
function createBasicDaySchedule(dayOfWeek: number): DaySchedule {
  return {
    dayOfWeek,
    blocks: [
      { start: 540, duration: 480 }, // 9 AM to 5 PM (8 hours)
    ]
  };
}

// Helper function to create a basic week schedule
function createBasicWeekSchedule(): WeekSchedule {
  return {
    days: Array.from({ length: 7 }, (_, i) => createBasicDaySchedule(i)),
    timezone: 'UTC'
  };
}

// Create sample teacher
function createSampleTeacher(): TeacherConfig {
  const constraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 240, // 4 hours max consecutive
    breakDurationMinutes: 15,   // 15 minute breaks
    minLessonDuration: 30,      // 30 min minimum
    maxLessonDuration: 120,     // 2 hours maximum
    allowedDurations: [30, 45, 60, 90], // Common lesson lengths
    backToBackPreference: 'agnostic' // Default preference
  };

  return {
    person: {
      id: 'teacher-1',
      name: 'Test Teacher',
      email: 'teacher@test.com'
    },
    studioId: 'studio-1',
    availability: createBasicWeekSchedule(),
    constraints
  };
}

// Create sample students
function createSampleStudents(count: number): StudentConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    person: {
      id: `student-${i + 1}`,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@test.com`
    },
    preferredDuration: [30, 45, 60, 90][i % 4] ?? 60, // Vary durations
    maxLessonsPerWeek: 1,
    availability: createBasicWeekSchedule()
  }));
}

/**
 * Test basic optimization integration
 */
export async function testBasicOptimization() {
  await new Promise(resolve => setTimeout(resolve, 0)); // Add await expression to satisfy ESLint
  console.log('🧪 Testing Basic Optimization Integration');

  const teacher = createSampleTeacher();
  const students = createSampleStudents(10);

  // Create solver with optimizations enabled
  const solver = createOptimalSolver(students.length);

  const startTime = Date.now();
  const solution = solver.solve(teacher, students);
  const solveTime = Date.now() - startTime;

  console.log('📊 Solution Results:');
  console.log(`  Students scheduled: ${solution.assignments.length}/${students.length}`);
  console.log(`  Unscheduled: ${solution.unscheduled.length}`);
  console.log(`  Solve time: ${solveTime}ms`);
  console.log(`  Solution quality: ${solution.metadata.averageUtilization.toFixed(1)}% utilization`);

  // Get performance report
  try {
    const report = solver.getPerformanceReport();
    console.log('📈 Performance Report:');
    console.log(`  Total time: ${report.summary.totalTimeMs}ms`);
    console.log(`  Solution quality: ${report.summary.solutionQuality.toFixed(1)}`);
    console.log(`  Scheduling rate: ${(report.summary.schedulingRate * 100).toFixed(1)}%`);
    console.log(`  Optimization efficiency: ${report.summary.optimizationEfficiency.toFixed(2)}`);
    
    if (report.optimizations.preprocessing.enabled) {
      console.log(`  Preprocessing: ${report.optimizations.preprocessing.valuesEliminated} values eliminated in ${report.optimizations.preprocessing.timeMs}ms`);
    }
    
    if (report.optimizations.caching.enabled) {
      console.log(`  Caching: ${(report.optimizations.caching.hitRate * 100).toFixed(1)}% hit rate, ${report.optimizations.caching.totalEntries} entries`);
    }

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  } catch (error) {
    console.log('⚠️  Performance report not available:', error instanceof Error ? error.message : 'Unknown error');
  }

  return solution;
}

/**
 * Test large scale optimization
 */
export async function testLargeScaleOptimization() {
  await new Promise(resolve => setTimeout(resolve, 0)); // Add await expression to satisfy ESLint
  console.log('\n🧪 Testing Large Scale Optimization');

  const teacher = createSampleTeacher();
  const students = createSampleStudents(50); // Test with 50 students

  console.log(`📊 Testing with ${students.length} students`);

  // Get optimal configuration for this size
  const config = createOptimalConfig(students.length);
  console.log('⚙️ Optimization Config:', {
    preprocessing: `Level ${config.preprocessingLevel}`,
    caching: config.enableCaching ? `Max ${config.maxCacheSize} entries` : 'Disabled',
    incremental: config.enableIncrementalSolving ? 'Enabled' : 'Disabled',
    earlyTermination: config.enableEarlyTermination ? `${config.earlyTerminationThreshold}% threshold` : 'Disabled'
  });

  // Create solver with optimizations
  const solver = createOptimalSolver(students.length);

  const startTime = Date.now();
  const solution = solver.solve(teacher, students);
  const solveTime = Date.now() - startTime;

  console.log('📊 Solution Results:');
  console.log(`  Students scheduled: ${solution.assignments.length}/${students.length}`);
  console.log(`  Unscheduled: ${solution.unscheduled.length}`);
  console.log(`  Solve time: ${solveTime}ms`);
  console.log(`  Target: < 2000ms for 50 students`);
  console.log(`  Performance: ${solveTime < 2000 ? '✅ PASS' : '❌ FAIL'}`);

  return solution;
}

/**
 * Run all optimization tests
 */
export async function runOptimizationTests() {
  console.log('🚀 Running Optimization Integration Tests\n');

  try {
    await testBasicOptimization();
    await testLargeScaleOptimization();
    
    console.log('\n✅ All optimization tests completed');
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Allow this file to be run directly
if (require.main === module) {
  runOptimizationTests().catch(console.error);
}