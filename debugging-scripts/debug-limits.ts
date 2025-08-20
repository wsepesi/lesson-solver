import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from '../lib/scheduling/solver-wrapper';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

// Test with Monday students to see detailed stats
const mondayStudents = testCase.students.filter(student => 
  student.availability.days.some(day => day.dayOfWeek === 1 && day.blocks.length > 0)
);

console.log(`=== Testing with increased limits ===`);

const solver = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  maxTimeMs: 30000,  // Increase timeout
  maxBacktracks: 200000,  // Increase backtrack limit
  logLevel: 'basic'
});

console.log('\n=== RUNNING SOLVER WITH INCREASED LIMITS ===');
const startTime = Date.now();
const solution = solver.solve(testCase.teacher, mondayStudents);
const elapsed = Date.now() - startTime;

console.log('\n=== RESULTS ===');
console.log(`Scheduled: ${solution.assignments.length} / ${mondayStudents.length}`);
console.log(`Elapsed time: ${elapsed}ms`);
console.log(`Metadata:`, solution.metadata);

if (solution.assignments.length > 0) {
  console.log('\nScheduled lessons:');
  solution.assignments.forEach((assignment, i) => {
    console.log(`  ${i+1}. ${assignment.studentId}: ${assignment.startMinute}-${assignment.startMinute + assignment.durationMinutes}`);
  });
}

// Test if ordering matters
console.log('\n=== Testing with reverse student order ===');
const reversedStudents = [...mondayStudents].reverse();
const solution2 = solver.solve(testCase.teacher, reversedStudents);
console.log(`Reverse order result: ${solution2.assignments.length} / ${reversedStudents.length}`);

// Test with shuffled order
console.log('\n=== Testing with shuffled student order ===');
const shuffledStudents = [...mondayStudents].sort(() => Math.random() - 0.5);
const solution3 = solver.solve(testCase.teacher, shuffledStudents);
console.log(`Shuffled order result: ${solution3.assignments.length} / ${shuffledStudents.length}`);