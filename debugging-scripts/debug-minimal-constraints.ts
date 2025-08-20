import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from '../lib/scheduling/solver-wrapper';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

console.log('=== TESTING WITH MINIMAL CONSTRAINTS ===');

// Create teacher with no constraints
const relaxedTeacher = {
  ...testCase.teacher,
  constraints: {
    allowedDurations: [], // Allow any duration
    minLessonDuration: 15,
    maxLessonDuration: 240,
    maxLessonsPerDay: 20,
    maxConsecutiveMinutes: 480,
    breakRequirement: 0, // No break required
    backToBackPreference: 'agnostic' as const
  }
};

const solver = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: false, // Disable constraint propagation
  enableOptimizations: false,
  enabledConstraints: ['availability'], // Only check availability
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

const startTime = Date.now();
const solution = solver.solve(relaxedTeacher, testCase.students);
const elapsed = Date.now() - startTime;

console.log('\n=== RESULTS ===');
console.log(`Scheduled: ${solution.assignments.length} / ${testCase.students.length}`);
console.log(`Elapsed time: ${elapsed}ms`);

// Check distribution across days
const assignmentsByDay = solution.assignments.reduce((acc, assignment) => {
  acc[assignment.dayOfWeek] = (acc[assignment.dayOfWeek] || 0) + 1;
  return acc;
}, {} as Record<number, number>);

console.log('\nAssignments by day:');
Object.entries(assignmentsByDay).forEach(([day, count]) => {
  console.log(`  Day ${day}: ${count} lessons`);
});

console.log(`\nWith minimal constraints, should approach theoretical max of 27`);