import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from '../lib/scheduling/solver-wrapper';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

console.log('=== TESTING CONSECUTIVE CONSTRAINT IMPACT ===');

// Test with only non-consecutive constraints (exclude consecutive-limit)
const solverWithoutConsecutive = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,
  enabledConstraints: [
    'availability', 
    'non-overlapping', 
    'duration', 
    // 'consecutive-limit',  // DISABLED
    'break-requirement',
    'preferred-time',
    'workload-balance',
    'back-to-back-preference'
  ],
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

console.log('\n=== WITHOUT ConsecutiveLimitConstraint ===');
const startTime1 = Date.now();
const solution1 = solverWithoutConsecutive.solve(testCase.teacher, testCase.students);
const elapsed1 = Date.now() - startTime1;

console.log(`Scheduled: ${solution1.assignments.length} / ${testCase.students.length}`);
console.log(`Elapsed time: ${elapsed1}ms`);

// Check distribution across days
const assignmentsByDay1 = solution1.assignments.reduce((acc, assignment) => {
  acc[assignment.dayOfWeek] = (acc[assignment.dayOfWeek] || 0) + 1;
  return acc;
}, {} as Record<number, number>);

console.log('Assignments by day:');
Object.entries(assignmentsByDay1).forEach(([day, count]) => {
  console.log(`  Day ${day}: ${count} lessons`);
});

// Now test with only consecutive constraint (plus availability/non-overlapping for validity)
const solverOnlyConsecutive = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,
  enabledConstraints: [
    'availability', 
    'non-overlapping', 
    'duration',
    'consecutive-limit'  // ONLY this constraint plus basics
  ],
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

console.log('\n=== WITH ONLY ConsecutiveLimitConstraint ===');
const startTime2 = Date.now();
const solution2 = solverOnlyConsecutive.solve(testCase.teacher, testCase.students);
const elapsed2 = Date.now() - startTime2;

console.log(`Scheduled: ${solution2.assignments.length} / ${testCase.students.length}`);
console.log(`Elapsed time: ${elapsed2}ms`);

// Check distribution across days
const assignmentsByDay2 = solution2.assignments.reduce((acc, assignment) => {
  acc[assignment.dayOfWeek] = (acc[assignment.dayOfWeek] || 0) + 1;
  return acc;
}, {} as Record<number, number>);

console.log('Assignments by day:');
Object.entries(assignmentsByDay2).forEach(([day, count]) => {
  console.log(`  Day ${day}: ${count} lessons`);
});

console.log(`\nConstraint impact: ${solution1.assignments.length - solution2.assignments.length} fewer lessons with consecutive constraint`);