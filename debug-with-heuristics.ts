import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from './lib/scheduling/solver-wrapper.ts';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, 'lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

console.log('=== TESTING WITH HEURISTICS ENABLED ===');

const solver = new ScheduleSolver({
  useHeuristics: true,  // Enable heuristics
  useConstraintPropagation: true,
  enableOptimizations: false,
  maxTimeMs: 15000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

const startTime = Date.now();
const solution = solver.solve(testCase.teacher, testCase.students);
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

console.log(`\nTarget: 27 lessons (theoretical max), Test expects: >= 25`);