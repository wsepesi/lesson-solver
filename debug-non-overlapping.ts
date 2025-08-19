import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from './lib/scheduling/solver-wrapper.ts';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, 'lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

console.log('=== TESTING NON-OVERLAPPING CONSTRAINT IMPACT ===');

// Test with ONLY availability constraint
const solverAvailabilityOnly = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,
  enabledConstraints: [
    'availability'
  ],
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

console.log('\n=== WITH ONLY AVAILABILITY ===');
const startTime1 = Date.now();
const solution1 = solverAvailabilityOnly.solve(testCase.teacher, testCase.students);
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

// Test with availability + non-overlapping
const solverWithNonOverlapping = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,
  enabledConstraints: [
    'availability',
    'non-overlapping'
  ],
  maxTimeMs: 10000,
  maxBacktracks: 100000,
  logLevel: 'basic'
});

console.log('\n=== WITH AVAILABILITY + NON-OVERLAPPING ===');
const startTime2 = Date.now();
const solution2 = solverWithNonOverlapping.solve(testCase.teacher, testCase.students);
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

console.log(`\nNon-overlapping constraint impact: ${solution1.assignments.length - solution2.assignments.length} fewer lessons with non-overlapping constraint`);

// Show sample overlaps from first solution to understand the issue
if (solution1.assignments.length > solution2.assignments.length) {
  console.log('\n=== ANALYZING OVERLAPS IN AVAILABILITY-ONLY SOLUTION ===');
  const overlaps = [];
  
  for (let i = 0; i < solution1.assignments.length; i++) {
    for (let j = i + 1; j < solution1.assignments.length; j++) {
      const a = solution1.assignments[i];
      const b = solution1.assignments[j];
      
      if (a.dayOfWeek === b.dayOfWeek) {
        const aEnd = a.startMinute + a.durationMinutes;
        const bEnd = b.startMinute + b.durationMinutes;
        
        // Check for overlap
        if ((a.startMinute < bEnd) && (b.startMinute < aEnd)) {
          overlaps.push({
            student1: a.studentId,
            student2: b.studentId,
            day: a.dayOfWeek,
            time1: `${a.startMinute}-${aEnd}`,
            time2: `${b.startMinute}-${bEnd}`
          });
        }
      }
    }
  }
  
  console.log(`Found ${overlaps.length} overlaps:`);
  overlaps.slice(0, 5).forEach(overlap => {
    console.log(`  Day ${overlap.day}: ${overlap.student1} (${overlap.time1}) overlaps ${overlap.student2} (${overlap.time2})`);
  });
}