/**
 * Simple Performance Profiling Script
 * Profiles different stages by running targeted tests
 */

import { ScheduleSolver } from '../lib/scheduling/solver';
import { StudentGenerator } from '../lib/scheduling/test-generator/generators';
import type { TeacherConfig, StudentConfig, Person, SchedulingConstraints } from '../lib/scheduling/types';

// Timing utilities
interface TimingResult {
  label: string;
  time: number;
  scheduled: number;
  total: number;
  backtracks: number;
  constraintChecks: number;
}

interface ScenarioResult {
  studentCount: number;
  results: TimingResult[];
  averages: {
    [key: string]: {
      time: number;
      scheduled: number;
      backtracks: number;
      constraintChecks: number;
    };
  };
}

// Test data creation
function createTestPerson(id: string, name: string): Person {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`
  };
}

function createTestTeacher(hoursPerDay: number = 8): TeacherConfig {
  const minutesPerDay = hoursPerDay * 60;
  const blocks = [{ start: 540, duration: minutesPerDay }]; // 9am start
  
  const days = [];
  for (let d = 1; d <= 5; d++) {
    days.push({
      dayOfWeek: d,
      blocks
    });
  }
  
  const fullWeek = Array.from({ length: 7 }, (_, i) => 
    days.find(d => d.dayOfWeek === i) ?? { dayOfWeek: i, blocks: [] }
  );
  
  const constraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 180,
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };
  
  return {
    person: createTestPerson('teacher', 'Test Teacher'),
    studioId: 'studio',
    availability: { days: fullWeek, timezone: 'UTC' },
    constraints
  };
}

// Profile a specific configuration
async function profileConfiguration(
  studentCount: number,
  seed: number,
  config: {
    enableOptimizations: boolean;
    useHeuristics: boolean;
    useConstraintPropagation?: boolean;
    maxTimeMs?: number;
  },
  label: string
): Promise<TimingResult> {
  const teacher = createTestTeacher();
  const generator = new StudentGenerator(seed);
  const students = generator.generateStudents({ count: studentCount, seed });
  
  const solver = new ScheduleSolver({
    maxTimeMs: config.maxTimeMs ?? 5000,
    useHeuristics: config.useHeuristics,
    enableOptimizations: config.enableOptimizations,
    useConstraintPropagation: config.useConstraintPropagation ?? true,
    logLevel: 'none'
  });
  
  const start = performance.now();
  const solution = solver.solve(teacher, students);
  const time = performance.now() - start;
  
  const stats = solver.getStats();
  
  return {
    label,
    time,
    scheduled: solution.metadata.scheduledStudents,
    total: solution.metadata.totalStudents,
    backtracks: stats.backtracks,
    constraintChecks: stats.constraintChecks
  };
}

// Test different configurations
async function runScenario(studentCount: number, seeds: number[]): Promise<ScenarioResult> {
  console.log(`\\nTesting ${studentCount} students...`);
  
  const configurations = [
    { 
      config: { enableOptimizations: true, useHeuristics: true }, 
      label: 'Full Optimization' 
    },
    { 
      config: { enableOptimizations: false, useHeuristics: true }, 
      label: 'Heuristics Only' 
    },
    { 
      config: { enableOptimizations: true, useHeuristics: false }, 
      label: 'Optimizations Only' 
    },
    { 
      config: { enableOptimizations: false, useHeuristics: false }, 
      label: 'No Optimization' 
    },
    {
      config: { enableOptimizations: true, useHeuristics: true, useConstraintPropagation: false },
      label: 'No Constraint Propagation'
    }
  ];
  
  const results: TimingResult[] = [];
  
  for (const { config, label } of configurations) {
    let totalTime = 0;
    let totalScheduled = 0;
    let totalBacktracks = 0;
    let totalConstraintChecks = 0;
    
    for (const seed of seeds) {
      const result = await profileConfiguration(studentCount, seed, config, label);
      totalTime += result.time;
      totalScheduled += result.scheduled;
      totalBacktracks += result.backtracks;
      totalConstraintChecks += result.constraintChecks;
    }
    
    results.push({
      label,
      time: totalTime / seeds.length,
      scheduled: totalScheduled / seeds.length,
      total: studentCount,
      backtracks: Math.round(totalBacktracks / seeds.length),
      constraintChecks: Math.round(totalConstraintChecks / seeds.length)
    });
  }
  
  // Calculate averages for comparison
  const averages: ScenarioResult['averages'] = {};
  for (const result of results) {
    averages[result.label] = {
      time: result.time,
      scheduled: result.scheduled,
      backtracks: result.backtracks,
      constraintChecks: result.constraintChecks
    };
  }
  
  return { studentCount, results, averages };
}

// Main profiling function
async function runDetailedProfiling() {
  console.log('='.repeat(80));
  console.log('PERFORMANCE PROFILING - COMPONENT BREAKDOWN');
  console.log('='.repeat(80));
  
  const scenarios = [
    { students: 10, seeds: [42001, 42002, 42003] },
    { students: 20, seeds: [42004, 42005, 42006] },
    { students: 30, seeds: [42007, 42008, 42009] },
    { students: 50, seeds: [42010, 42011, 42012] }
  ];
  
  const allResults: ScenarioResult[] = [];
  
  for (const scenario of scenarios) {
    const result = await runScenario(scenario.students, scenario.seeds);
    allResults.push(result);
    
    // Print results for this scenario
    console.log(`\\n${'='.repeat(60)}`);
    console.log(`RESULTS FOR ${scenario.students} STUDENTS (avg of ${scenario.seeds.length} runs)`);
    console.log('='.repeat(60));
    
    console.log('\\nConfiguration                  | Time (ms) | Scheduled | Backtracks | Checks');
    console.log('-'.repeat(80));
    
    for (const r of result.results) {
      console.log(
        `${r.label.padEnd(30)} | ` +
        `${r.time.toFixed(1).padStart(9)} | ` +
        `${r.scheduled.toFixed(0).padStart(9)}/${r.total} | ` +
        `${r.backtracks.toString().padStart(10)} | ` +
        `${r.constraintChecks.toString().padStart(6)}`
      );
    }
    
    // Calculate speedups
    const fullOpt = result.averages['Full Optimization'];
    const noOpt = result.averages['No Optimization'];
    
    if (fullOpt && noOpt) {
      console.log(`\\nOptimization Impact:`);
      console.log(`  Time speedup: ${(noOpt.time / fullOpt.time).toFixed(2)}x`);
      console.log(`  Backtrack reduction: ${((1 - fullOpt.backtracks / Math.max(noOpt.backtracks, 1)) * 100).toFixed(1)}%`);
      console.log(`  Constraint check reduction: ${((1 - fullOpt.constraintChecks / Math.max(noOpt.constraintChecks, 1)) * 100).toFixed(1)}%`);
    }
  }
  
  // Component contribution analysis
  console.log(`\\n${'='.repeat(80)}`);
  console.log('COMPONENT CONTRIBUTION ANALYSIS');
  console.log('='.repeat(80));
  
  for (const result of allResults) {
    console.log(`\\n${result.studentCount} Students:`);
    
    const fullOpt = result.averages['Full Optimization'];
    const heuristicsOnly = result.averages['Heuristics Only'];
    const optimizationsOnly = result.averages['Optimizations Only'];
    const noOpt = result.averages['No Optimization'];
    
    if (fullOpt && heuristicsOnly && optimizationsOnly && noOpt) {
      // Calculate individual contributions
      const heuristicContribution = noOpt.time - heuristicsOnly.time;
      const optimizationContribution = noOpt.time - optimizationsOnly.time;
      const combinedBenefit = noOpt.time - fullOpt.time;
      const synergyEffect = combinedBenefit - (heuristicContribution + optimizationContribution);
      
      console.log(`  Base time (no optimization): ${noOpt.time.toFixed(1)}ms`);
      console.log(`  Heuristics contribution: -${heuristicContribution.toFixed(1)}ms (${((heuristicContribution / noOpt.time) * 100).toFixed(1)}%)`);
      console.log(`  Optimizations contribution: -${optimizationContribution.toFixed(1)}ms (${((optimizationContribution / noOpt.time) * 100).toFixed(1)}%)`);
      console.log(`  Synergy effect: ${synergyEffect > 0 ? '-' : '+'}${Math.abs(synergyEffect).toFixed(1)}ms`);
      console.log(`  Final time: ${fullOpt.time.toFixed(1)}ms`);
    }
  }
  
  // Scaling analysis
  console.log(`\\n${'='.repeat(80)}`);
  console.log('SCALING ANALYSIS');
  console.log('='.repeat(80));
  
  console.log('\\nTime Complexity Growth (Full Optimization):');
  const fullOptTimes = allResults.map(r => ({
    students: r.studentCount,
    time: r.averages['Full Optimization']?.time ?? 0
  }));
  
  for (let i = 1; i < fullOptTimes.length; i++) {
    const prev = fullOptTimes[i - 1];
    const curr = fullOptTimes[i];
    const studentGrowth = curr.students / prev.students;
    const timeGrowth = curr.time / prev.time;
    const complexity = Math.log(timeGrowth) / Math.log(studentGrowth);
    
    console.log(`  ${prev.students} → ${curr.students} students: ${timeGrowth.toFixed(2)}x time growth (O(n^${complexity.toFixed(2)}))`);
  }
  
  // Performance bottlenecks
  console.log(`\\n${'='.repeat(80)}`);
  console.log('IDENTIFIED BOTTLENECKS');
  console.log('='.repeat(80));
  
  const bottlenecks: string[] = [];
  
  // Check if optimizations are actually helping
  for (const result of allResults) {
    const fullOpt = result.averages['Full Optimization'];
    const heuristicsOnly = result.averages['Heuristics Only'];
    
    if (fullOpt && heuristicsOnly && fullOpt.time > heuristicsOnly.time * 0.9) {
      bottlenecks.push(`🔥 At ${result.studentCount} students, optimizations provide < 10% improvement`);
    }
  }
  
  // Check for exponential growth
  if (fullOptTimes.length >= 2) {
    const lastTwo = fullOptTimes.slice(-2);
    const growth = lastTwo[1].time / lastTwo[0].time;
    const studentRatio = lastTwo[1].students / lastTwo[0].students;
    
    if (growth > studentRatio * studentRatio) {
      bottlenecks.push(`⚠️  Exponential time growth detected beyond ${lastTwo[0].students} students`);
    }
  }
  
  // Check constraint check explosion
  for (const result of allResults) {
    const fullOpt = result.averages['Full Optimization'];
    if (fullOpt && fullOpt.constraintChecks > result.studentCount * 1000) {
      bottlenecks.push(`📊 Excessive constraint checks at ${result.studentCount} students (${fullOpt.constraintChecks} checks)`);
    }
  }
  
  if (bottlenecks.length > 0) {
    bottlenecks.forEach(b => console.log(`  ${b}`));
  } else {
    console.log('  ✅ No major bottlenecks identified');
  }
  
  console.log(`\\n${'='.repeat(80)}`);
  console.log('PROFILING COMPLETE');
  console.log('='.repeat(80));
}

// Run profiling
runDetailedProfiling().catch(console.error);