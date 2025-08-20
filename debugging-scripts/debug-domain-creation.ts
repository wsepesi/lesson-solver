import fs from 'fs';
import path from 'path';
import { ScheduleSolver } from '../lib/scheduling/solver-wrapper';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];
console.log('=== DEBUG: 50 Students Test Case ===');
console.log(`Teacher availability days: ${testCase.teacher.availability.days.filter(d => d.blocks.length > 0).length}`);
console.log(`Total students: ${testCase.students.length}`);

// Create solver with basic logging (detailed is too verbose)
const solver = new ScheduleSolver({
  useHeuristics: false,
  useConstraintPropagation: true,
  maxTimeMs: 5000,
  logLevel: 'basic'
});

console.log('\n=== RUNNING SOLVER ===');
const solution = solver.solve(testCase.teacher, testCase.students);

console.log('\n=== RESULTS ===');
console.log(`Scheduled: ${solution.assignments.length}`);
console.log(`Unscheduled: ${solution.unscheduled.length}`);
console.log(`Total: ${solution.assignments.length + solution.unscheduled.length}`);