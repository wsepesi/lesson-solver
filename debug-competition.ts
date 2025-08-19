import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from './lib/scheduling/solver-wrapper.ts';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, 'lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

// Let's test with students competing for the same day
// Get all students for Monday (day 1)
const mondayStudents = testCase.students.filter(student => 
  student.availability.days.some(day => day.dayOfWeek === 1 && day.blocks.length > 0)
);

console.log(`=== DEBUG: ${mondayStudents.length} Students competing for Monday ===`);

// Show their availability windows
mondayStudents.forEach((student, i) => {
  const mondayDay = student.availability.days.find(day => day.dayOfWeek === 1);
  if (mondayDay && mondayDay.blocks.length > 0) {
    const block = mondayDay.blocks[0];
    console.log(`Student ${i+1} (${student.person.id}): ${block.start}-${block.start + block.duration} (${block.duration}min)`);
  }
});

console.log('\n=== Teacher Monday availability ===');
const teacherMonday = testCase.teacher.availability.days[1];
if (teacherMonday && teacherMonday.blocks.length > 0) {
  teacherMonday.blocks.forEach(block => {
    console.log(`  ${block.start}-${block.start + block.duration} (${block.duration}min)`);
  });
}

const solver = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  maxTimeMs: 5000,
  logLevel: 'basic'
});

console.log('\n=== RUNNING SOLVER ON MONDAY STUDENTS ===');
const solution = solver.solve(testCase.teacher, mondayStudents);

console.log('\n=== RESULTS ===');
console.log(`Scheduled: ${solution.assignments.length}`);
console.log(`Unscheduled: ${solution.unscheduled.length}`);

if (solution.assignments.length > 0) {
  console.log('\nScheduled lessons:');
  solution.assignments.forEach(assignment => {
    console.log(`  ${assignment.studentId}: Day ${assignment.dayOfWeek}, ${assignment.startMinute}-${assignment.startMinute + assignment.durationMinutes}`);
  });
}

// Calculate theoretical capacity
const teacherBlock = teacherMonday?.blocks[0];
if (teacherBlock) {
  const maxLessons = Math.floor(teacherBlock.duration / 60);
  console.log(`\nTheoretical capacity: ${maxLessons} lessons (${teacherBlock.duration} minutes / 60 minutes per lesson)`);
}