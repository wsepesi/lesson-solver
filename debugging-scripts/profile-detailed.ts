/**
 * Detailed Performance Profiling Script
 * Breaks down execution time by component for flamegraph-like analysis
 */

import { ScheduleSolver } from '../lib/scheduling/solver';
import { StudentGenerator } from '../lib/scheduling/test-generator/generators';
import type { TeacherConfig, StudentConfig, WeekSchedule, SchedulingConstraints, Person } from '../lib/scheduling/types';

// Performance tracking utilities
class PerformanceProfiler {
  private timings: Map<string, number[]> = new Map();
  private callCounts: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  
  start(label: string): void {
    this.startTimes.set(label, performance.now());
  }
  
  end(label: string): void {
    const startTime = this.startTimes.get(label);
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      
      if (!this.timings.has(label)) {
        this.timings.set(label, []);
        this.callCounts.set(label, 0);
      }
      
      this.timings.get(label)!.push(duration);
      this.callCounts.set(label, (this.callCounts.get(label) ?? 0) + 1);
      this.startTimes.delete(label);
    }
  }
  
  getReport(): ProfileReport {
    const report: ProfileReport = {
      totalTime: 0,
      components: []
    };
    
    for (const [label, times] of this.timings) {
      const totalTime = times.reduce((a, b) => a + b, 0);
      const avgTime = totalTime / times.length;
      const calls = this.callCounts.get(label) ?? 0;
      
      report.components.push({
        label,
        totalTime,
        avgTime,
        calls,
        minTime: Math.min(...times),
        maxTime: Math.max(...times)
      });
      
      report.totalTime += totalTime;
    }
    
    // Sort by total time descending
    report.components.sort((a, b) => b.totalTime - a.totalTime);
    
    return report;
  }
  
  clear(): void {
    this.timings.clear();
    this.callCounts.clear();
    this.startTimes.clear();
  }
}

interface ProfileReport {
  totalTime: number;
  components: Array<{
    label: string;
    totalTime: number;
    avgTime: number;
    calls: number;
    minTime: number;
    maxTime: number;
  }>;
}

// Create test data
function createTestPerson(id: string, name: string): Person {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`
  };
}

function createDayWithBlocks(dayOfWeek: number, blocks: Array<{start: number, duration: number}>) {
  return {
    dayOfWeek,
    blocks: blocks.filter(block => block.start >= 0 && block.start < 1440)
  };
}

function createTestTeacher(minutesPerDay: number = 480): TeacherConfig {
  const blocks = [{ start: 540, duration: minutesPerDay }]; // 9am start
  const days = [];
  
  for (let d = 1; d <= 5; d++) {
    days.push(createDayWithBlocks(d, blocks));
  }
  
  const fullWeek = Array.from({ length: 7 }, (_, i) => 
    days.find(d => d.dayOfWeek === i) ?? createDayWithBlocks(i, [])
  );
  
  const constraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 180,
    breakDurationMinutes: 15,
    minLessonDuration: 30,
    maxLessonDuration: 120,
    allowedDurations: [30, 45, 60, 90]
  };
  
  return {
    person: createTestPerson('teacher-perf', 'Performance Test Teacher'),
    studioId: 'studio-perf',
    availability: { days: fullWeek, timezone: 'UTC' },
    constraints
  };
}

// Monkey-patch the solver to add profiling
function instrumentSolver(solver: any, profiler: PerformanceProfiler): void {
  // Instrument key methods
  const originalSolve = solver.solve.bind(solver);
  solver.solve = function(teacher: TeacherConfig, students: StudentConfig[]) {
    profiler.start('solve_total');
    const result = originalSolve(teacher, students);
    profiler.end('solve_total');
    return result;
  };
  
  const originalCreateVariables = solver.createVariables.bind(solver);
  solver.createVariables = function(students: StudentConfig[]) {
    profiler.start('create_variables');
    const result = originalCreateVariables(students);
    profiler.end('create_variables');
    return result;
  };
  
  const originalCreateDomains = solver.createDomains.bind(solver);
  solver.createDomains = function(teacher: TeacherConfig, students: StudentConfig[]) {
    profiler.start('create_domains');
    const result = originalCreateDomains(teacher, students);
    profiler.end('create_domains');
    return result;
  };
  
  if (solver.propagateConstraints) {
    const originalPropagate = solver.propagateConstraints.bind(solver);
    solver.propagateConstraints = function(...args: any[]) {
      profiler.start('constraint_propagation');
      const result = originalPropagate(...args);
      profiler.end('constraint_propagation');
      return result;
    };
  }
  
  if (solver.searchStrategy && solver.searchStrategy.search) {
    const originalSearch = solver.searchStrategy.search.bind(solver.searchStrategy);
    solver.searchStrategy.search = function(...args: any[]) {
      profiler.start('backtracking_search');
      const result = originalSearch(...args);
      profiler.end('backtracking_search');
      return result;
    };
  }
  
  if (solver.buildSolution) {
    const originalBuild = solver.buildSolution.bind(solver);
    solver.buildSolution = function(...args: any[]) {
      profiler.start('build_solution');
      const result = originalBuild(...args);
      profiler.end('build_solution');
      return result;
    };
  }
  
  // Instrument preprocessing if enabled
  if (solver.preprocessing) {
    const originalPreprocess = solver.preprocessing.preprocess.bind(solver.preprocessing);
    solver.preprocessing.preprocess = function(...args: any[]) {
      profiler.start('preprocessing');
      const result = originalPreprocess(...args);
      profiler.end('preprocessing');
      return result;
    };
  }
  
  // Instrument caching if enabled
  if (solver.caching) {
    const originalGet = solver.caching.get.bind(solver.caching);
    solver.caching.get = function(key: string) {
      profiler.start('cache_lookup');
      const result = originalGet(key);
      profiler.end('cache_lookup');
      return result;
    };
    
    const originalSet = solver.caching.set.bind(solver.caching);
    solver.caching.set = function(key: string, value: any) {
      profiler.start('cache_write');
      const result = originalSet(key, value);
      profiler.end('cache_write');
      return result;
    };
  }
  
  // Instrument constraint evaluation
  if (solver.constraints) {
    const originalEvaluate = solver.constraints.evaluate.bind(solver.constraints);
    solver.constraints.evaluate = function(...args: any[]) {
      profiler.start('constraint_evaluation');
      const result = originalEvaluate(...args);
      profiler.end('constraint_evaluation');
      return result;
    };
  }
}

// Profile a single scenario
async function profileScenario(
  studentCount: number, 
  seed: number,
  enableOptimizations: boolean,
  profiler: PerformanceProfiler
): Promise<{time: number, scheduled: number, report: ProfileReport}> {
  profiler.clear();
  
  const teacher = createTestTeacher();
  const generator = new StudentGenerator(seed);
  const students = generator.generateStudents({ count: studentCount, seed });
  
  const solver = new ScheduleSolver({
    maxTimeMs: 5000,
    useHeuristics: true,
    enableOptimizations,
    logLevel: 'none'
  });
  
  // Instrument the solver
  instrumentSolver(solver, profiler);
  
  const start = performance.now();
  const solution = solver.solve(teacher, students);
  const time = performance.now() - start;
  
  return {
    time,
    scheduled: solution.metadata.scheduledStudents,
    report: profiler.getReport()
  };
}

// Main profiling function
async function runDetailedProfiling() {
  console.log('=== DETAILED PERFORMANCE PROFILING ===\n');
  
  const scenarios = [
    { students: 10, seeds: [42001, 42002, 42003] },
    { students: 20, seeds: [42004, 42005, 42006] },
    { students: 30, seeds: [42007, 42008, 42009] },
    { students: 50, seeds: [42010, 42011, 42012] }
  ];
  
  const profiler = new PerformanceProfiler();
  
  for (const scenario of scenarios) {
    console.log(`\\n${'='.repeat(60)}`);
    console.log(`PROFILING ${scenario.students} STUDENTS`);
    console.log('='.repeat(60));
    
    // Aggregate results across multiple seeds
    const withOptReports: ProfileReport[] = [];
    const withoutOptReports: ProfileReport[] = [];
    let totalWithOpt = 0;
    let totalWithoutOpt = 0;
    let scheduledWithOpt = 0;
    let scheduledWithoutOpt = 0;
    
    for (const seed of scenario.seeds) {
      // With optimizations
      const withOpt = await profileScenario(scenario.students, seed, true, profiler);
      withOptReports.push(withOpt.report);
      totalWithOpt += withOpt.time;
      scheduledWithOpt += withOpt.scheduled;
      
      // Without optimizations
      const withoutOpt = await profileScenario(scenario.students, seed, false, profiler);
      withoutOptReports.push(withoutOpt.report);
      totalWithoutOpt += withoutOpt.time;
      scheduledWithoutOpt += withoutOpt.scheduled;
    }
    
    const avgWithOpt = totalWithOpt / scenario.seeds.length;
    const avgWithoutOpt = totalWithoutOpt / scenario.seeds.length;
    const avgScheduledWithOpt = scheduledWithOpt / scenario.seeds.length;
    const avgScheduledWithoutOpt = scheduledWithoutOpt / scenario.seeds.length;
    
    console.log(`\\nAVERAGE RESULTS (${scenario.seeds.length} runs):`);
    console.log(`  With optimizations:    ${avgWithOpt.toFixed(2)}ms (${avgScheduledWithOpt.toFixed(1)}/${scenario.students} scheduled)`);
    console.log(`  Without optimizations: ${avgWithoutOpt.toFixed(2)}ms (${avgScheduledWithoutOpt.toFixed(1)}/${scenario.students} scheduled)`);
    console.log(`  Speedup: ${(avgWithoutOpt / avgWithOpt).toFixed(2)}x`);
    
    // Aggregate component timings
    console.log(`\\nCOMPONENT BREAKDOWN (With Optimizations):`);
    const aggregatedWithOpt = aggregateReports(withOptReports);
    printComponentBreakdown(aggregatedWithOpt);
    
    console.log(`\\nCOMPONENT BREAKDOWN (Without Optimizations):`);
    const aggregatedWithoutOpt = aggregateReports(withoutOptReports);
    printComponentBreakdown(aggregatedWithoutOpt);
    
    // Show hotspots
    console.log(`\\nPERFORMANCE HOTSPOTS:`);
    const hotspots = identifyHotspots(aggregatedWithOpt, aggregatedWithoutOpt);
    for (const hotspot of hotspots) {
      console.log(`  ${hotspot}`);
    }
  }
  
  console.log(`\\n${'='.repeat(60)}`);
  console.log('PROFILING COMPLETE');
  console.log('='.repeat(60));
}

// Helper functions
function aggregateReports(reports: ProfileReport[]): ProfileReport {
  const aggregated: Map<string, {total: number, calls: number, times: number[]}> = new Map();
  
  for (const report of reports) {
    for (const component of report.components) {
      if (!aggregated.has(component.label)) {
        aggregated.set(component.label, { total: 0, calls: 0, times: [] });
      }
      
      const agg = aggregated.get(component.label)!;
      agg.total += component.totalTime;
      agg.calls += component.calls;
      agg.times.push(component.totalTime);
    }
  }
  
  const result: ProfileReport = {
    totalTime: 0,
    components: []
  };
  
  for (const [label, data] of aggregated) {
    const avgTime = data.total / reports.length;
    result.components.push({
      label,
      totalTime: avgTime,
      avgTime: avgTime / Math.max(data.calls / reports.length, 1),
      calls: Math.round(data.calls / reports.length),
      minTime: Math.min(...data.times),
      maxTime: Math.max(...data.times)
    });
    result.totalTime += avgTime;
  }
  
  result.components.sort((a, b) => b.totalTime - a.totalTime);
  return result;
}

function printComponentBreakdown(report: ProfileReport): void {
  const maxLabelLength = Math.max(...report.components.map(c => c.label.length));
  
  console.log(`  ${'Component'.padEnd(maxLabelLength)} | Time (ms) | % Total | Calls | Avg/Call`);
  console.log(`  ${'-'.repeat(maxLabelLength + 50)}`);
  
  for (const component of report.components) {
    const percentage = ((component.totalTime / report.totalTime) * 100).toFixed(1);
    const avgPerCall = component.calls > 0 ? (component.avgTime).toFixed(3) : 'N/A';
    
    console.log(
      `  ${component.label.padEnd(maxLabelLength)} | ` +
      `${component.totalTime.toFixed(2).padStart(9)} | ` +
      `${percentage.padStart(7)}% | ` +
      `${component.calls.toString().padStart(5)} | ` +
      `${avgPerCall.padStart(8)}`
    );
  }
}

function identifyHotspots(withOpt: ProfileReport, withoutOpt: ProfileReport): string[] {
  const hotspots: string[] = [];
  
  // Find components that take > 20% of total time
  for (const component of withOpt.components) {
    const percentage = (component.totalTime / withOpt.totalTime) * 100;
    if (percentage > 20) {
      hotspots.push(`🔥 ${component.label} takes ${percentage.toFixed(1)}% of total time with optimizations`);
    }
  }
  
  // Find components where optimization made things worse
  for (const component of withOpt.components) {
    const withoutOptComponent = withoutOpt.components.find(c => c.label === component.label);
    if (withoutOptComponent && component.totalTime > withoutOptComponent.totalTime * 1.2) {
      const regression = ((component.totalTime / withoutOptComponent.totalTime - 1) * 100).toFixed(1);
      hotspots.push(`⚠️  ${component.label} is ${regression}% slower with optimizations enabled`);
    }
  }
  
  // Find components with high call counts
  for (const component of withOpt.components) {
    if (component.calls > 1000) {
      hotspots.push(`📊 ${component.label} called ${component.calls} times - potential for optimization`);
    }
  }
  
  return hotspots;
}

// Run the profiling
runDetailedProfiling().catch(console.error);