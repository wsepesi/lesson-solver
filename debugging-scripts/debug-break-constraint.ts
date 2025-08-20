import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from '../lib/scheduling/solver-wrapper';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

console.log('=== TESTING BREAK REQUIREMENT CONSTRAINT IMPACT ===');

// Test without break requirement constraint
const solverWithoutBreaks = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,
  enabledConstraints: [
    'availability', 
    'non-overlapping', 
    'duration', 
    'consecutive-limit',
    // 'break-requirement',  // DISABLED
    'preferred-time',
    'workload-balance',
    'back-to-back-preference'
  ],
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

console.log('\n=== WITHOUT BreakRequirementConstraint ===');
const startTime1 = Date.now();
const solution1 = solverWithoutBreaks.solve(testCase.teacher, testCase.students);
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

// Test with ONLY hard constraints (availability, non-overlapping, duration)
const solverHardOnly = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,
  enabledConstraints: [
    'availability', 
    'non-overlapping', 
    'duration'
  ],
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

console.log('\n=== WITH ONLY HARD CONSTRAINTS ===');
const startTime2 = Date.now();
const solution2 = solverHardOnly.solve(testCase.teacher, testCase.students);
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

console.log(`\nSoft constraints impact: ${solution2.assignments.length - solution1.assignments.length} fewer lessons without breaks constraint`);