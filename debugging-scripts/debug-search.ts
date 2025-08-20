import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from '../lib/scheduling/solver-wrapper';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

// Let's examine a simpler scenario first - just first 5 students
const fiveStudents = testCase.students.slice(0, 5);

console.log('=== DEBUG: 5 Students Analysis ===');
fiveStudents.forEach((student, i) => {
  const availableDays = student.availability.days.filter(d => d.blocks.length > 0);
  console.log(`Student ${i+1} (${student.person.id}): ${availableDays.length} available days`);
  availableDays.forEach(day => {
    day.blocks.forEach(block => {
      console.log(`  Day ${day.dayOfWeek}: ${block.start}-${block.start + block.duration} (${block.duration}min)`);
    });
  });
});

console.log('\n=== Teacher availability ===');
testCase.teacher.availability.days.forEach((day, i) => {
  if (day.blocks.length > 0) {
    day.blocks.forEach(block => {
      console.log(`Day ${i}: ${block.start}-${block.start + block.duration} (${block.duration}min)`);
    });
  }
});

const solver = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  maxTimeMs: 5000,
  logLevel: 'basic'
});

console.log('\n=== RUNNING SOLVER ON 5 STUDENTS ===');
const solution = solver.solve(testCase.teacher, fiveStudents);

console.log('\n=== RESULTS ===');
console.log(`Scheduled: ${solution.assignments.length}`);
console.log(`Unscheduled: ${solution.unscheduled.length}`);

if (solution.assignments.length > 0) {
  console.log('\nScheduled lessons:');
  solution.assignments.forEach(assignment => {
    console.log(`  ${assignment.studentId}: Day ${assignment.dayOfWeek}, ${assignment.startMinute}-${assignment.startMinute + assignment.durationMinutes}`);
  });
}

if (solution.unscheduled.length > 0) {
  console.log('\nUnscheduled students:');
  solution.unscheduled.forEach(id => {
    console.log(`  ${id}`);
  });
}