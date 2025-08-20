// Performance profiling script
const { performance } = require('perf_hooks');

// Import from test files directly
const path = require('path');
const { execSync } = require('child_process');

// Build TypeScript files first if needed
console.log('Building TypeScript files...');
execSync('pnpx tsc lib/scheduling/solver.ts --outDir .temp --module commonjs --target es2020 --esModuleInterop --skipLibCheck', { stdio: 'ignore' });
execSync('pnpx tsc lib/scheduling/test-generator/generators.ts --outDir .temp --module commonjs --target es2020 --esModuleInterop --skipLibCheck', { stdio: 'ignore' });

// Now require the compiled files
const { ScheduleSolver } = require('./.temp/lib/scheduling/solver.js');
const { StudentGenerator } = require('./.temp/lib/scheduling/test-generator/generators.js');

function createTestTeacher(blocks) {
  const days = [];
  for (let d = 1; d <= 5; d++) {
    days.push({ dayOfWeek: d, blocks });
  }
  const fullWeek = Array.from({ length: 7 }, (_, i) => 
    days.find(d => d.dayOfWeek === i) || { dayOfWeek: i, blocks: [] }
  );
  
  return {
    person: { id: 'teacher', name: 'Teacher', email: 'teacher@test.com' },
    studioId: 'studio',
    availability: { days: fullWeek, timezone: 'UTC' },
    constraints: {
      maxConsecutiveMinutes: 180,
      breakDurationMinutes: 15,
      minLessonDuration: 30,
      maxLessonDuration: 120,
      allowedDurations: [30, 45, 60, 90]
    }
  };
}

async function profilePerformance(studentCount, seed = 12345) {
  console.log(`\n=== Profiling ${studentCount} students ===`);
  
  const teacher = createTestTeacher([{ start: 540, duration: 480 }]); // 9am-5pm
  const generator = new StudentGenerator(seed);
  const students = generator.generateStudents({ count: studentCount, seed });
  
  // Test with optimizations
  console.log('\nWith optimizations:');
  let start = performance.now();
  const solverOpt = new ScheduleSolver({
    maxTimeMs: 5000,
    useHeuristics: true,
    enableOptimizations: true,
    logLevel: 'none'
  });
  
  const solutionOpt = solverOpt.solve(teacher, students);
  const timeOpt = performance.now() - start;
  const statsOpt = solverOpt.getStats();
  
  console.log(`  Time: ${timeOpt.toFixed(2)}ms`);
  console.log(`  Scheduled: ${solutionOpt.metadata.scheduledStudents}/${solutionOpt.metadata.totalStudents}`);
  console.log(`  Backtracks: ${statsOpt.backtracks}`);
  console.log(`  Constraint checks: ${statsOpt.constraintChecks}`);
  console.log(`  Quality: ${statsOpt.solutionQuality}%`);
  
  // Test without optimizations
  console.log('\nWithout optimizations:');
  start = performance.now();
  const solverNoOpt = new ScheduleSolver({
    maxTimeMs: 5000,
    useHeuristics: true,
    enableOptimizations: false,
    logLevel: 'none'
  });
  
  const solutionNoOpt = solverNoOpt.solve(teacher, students);
  const timeNoOpt = performance.now() - start;
  const statsNoOpt = solverNoOpt.getStats();
  
  console.log(`  Time: ${timeNoOpt.toFixed(2)}ms`);
  console.log(`  Scheduled: ${solutionNoOpt.metadata.scheduledStudents}/${solutionNoOpt.metadata.totalStudents}`);
  console.log(`  Backtracks: ${statsNoOpt.backtracks}`);
  console.log(`  Constraint checks: ${statsNoOpt.constraintChecks}`);
  console.log(`  Quality: ${statsNoOpt.solutionQuality}%`);
  
  console.log(`\nSpeedup: ${(timeNoOpt / timeOpt).toFixed(2)}x`);
  
  return {
    studentCount,
    withOpt: { time: timeOpt, scheduled: solutionOpt.metadata.scheduledStudents, backtracks: statsOpt.backtracks },
    withoutOpt: { time: timeNoOpt, scheduled: solutionNoOpt.metadata.scheduledStudents, backtracks: statsNoOpt.backtracks }
  };
}

// Run profiling for different student counts
async function main() {
  const results = [];
  
  for (const count of [10, 20, 30, 50]) {
    try {
      const result = await profilePerformance(count);
      results.push(result);
    } catch (error) {
      console.error(`Error profiling ${count} students:`, error.message);
    }
  }
  
  // Summary
  console.log('\n=== Performance Summary ===');
  console.log('Student Count | With Opt (ms) | Without Opt (ms) | Speedup | Scheduled');
  console.log('-------------|---------------|------------------|---------|----------');
  for (const r of results) {
    console.log(
      `${r.studentCount.toString().padEnd(12)} | ` +
      `${r.withOpt.time.toFixed(1).padEnd(13)} | ` +
      `${r.withoutOpt.time.toFixed(1).padEnd(16)} | ` +
      `${(r.withoutOpt.time / r.withOpt.time).toFixed(2).padEnd(7)} | ` +
      `${r.withOpt.scheduled}/${r.studentCount}`
    );
  }
  
  // Clean up temp directory
  const fs = require('fs');
  fs.rmSync('.temp', { recursive: true, force: true });
}

main().catch(console.error);