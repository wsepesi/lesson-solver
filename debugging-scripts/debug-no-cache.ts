import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from './lib/scheduling/solver-wrapper.ts';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, 'lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

// Test with Monday students but disable optimizations that might interfere
const mondayStudents = testCase.students.filter(student => 
  student.availability.days.some(day => day.dayOfWeek === 1 && day.blocks.length > 0)
);

console.log(`=== Testing with no caching/optimizations ===`);

const solver = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  enableOptimizations: false,  // Disable all optimizations
  maxTimeMs: 10000,
  maxBacktracks: 50000,
  logLevel: 'basic'
});

console.log('\n=== RUNNING SOLVER WITHOUT OPTIMIZATIONS ===');
const startTime = Date.now();
const solution = solver.solve(testCase.teacher, mondayStudents);
const elapsed = Date.now() - startTime;

console.log('\n=== RESULTS ===');
console.log(`Scheduled: ${solution.assignments.length} / ${mondayStudents.length}`);
console.log(`Elapsed time: ${elapsed}ms`);

if (solution.assignments.length > 0) {
  console.log('\nScheduled lessons:');
  solution.assignments.forEach((assignment, i) => {
    console.log(`  ${i+1}. ${assignment.studentId}: ${assignment.startMinute}-${assignment.startMinute + assignment.durationMinutes}`);
  });
}

// Check which students have availability in missing slots
console.log('\n=== Analyzing missing slots ===');
const teacherMonday = testCase.teacher.availability.days[1];
const teacherBlock = teacherMonday.blocks[0];
console.log(`Teacher available: ${teacherBlock.start}-${teacherBlock.start + teacherBlock.duration}`);

// Check 480-540 slot (missing)
console.log('\nStudents available 480-540:');
mondayStudents.forEach(student => {
  const mondayDay = student.availability.days.find(day => day.dayOfWeek === 1);
  if (mondayDay && mondayDay.blocks.length > 0) {
    const block = mondayDay.blocks[0];
    if (block.start <= 480 && block.start + block.duration >= 540) {
      console.log(`  ${student.person.id}: ${block.start}-${block.start + block.duration}`);
    }
  }
});

// Check 780-840 slot (missing)
console.log('\nStudents available 780-840:');
mondayStudents.forEach(student => {
  const mondayDay = student.availability.days.find(day => day.dayOfWeek === 1);
  if (mondayDay && mondayDay.blocks.length > 0) {
    const block = mondayDay.blocks[0];
    if (block.start <= 780 && block.start + block.duration >= 840) {
      console.log(`  ${student.person.id}: ${block.start}-${block.start + block.duration}`);
    }
  }
});