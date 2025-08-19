#!/usr/bin/env node

/**
 * CLI interface for the schedule visualizer
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { ScheduleVisualizer, type VisualizerTestCase } from './index';
import type { TestFixture } from '../tests/fixtures/fixture-loader';

interface CliOptions {
  test?: string;
  mode?: 'compact' | 'detailed' | 'summary';
  granularity?: number;
  startHour?: number;
  endHour?: number;
  output?: string;
  interactive?: boolean;
  compare?: boolean;
  solve?: boolean;
  width?: number;
  noColor?: boolean;
  help?: boolean;
  failuresOnly?: boolean;
}

/**
 * Main CLI entry point
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('schedule-visualizer')
    .usage('Usage: $0 [options]')
    .option('test', {
      alias: 't',
      type: 'string',
      description: 'Test case name or ID to visualize'
    })
    .option('mode', {
      alias: 'm',
      type: 'string',
      choices: ['compact', 'detailed', 'summary'],
      default: 'detailed',
      description: 'Display mode'
    })
    .option('granularity', {
      alias: 'g',
      type: 'number',
      choices: [5, 15, 30, 60],
      default: 15,
      description: 'Time granularity in minutes'
    })
    .option('start-hour', {
      alias: 's',
      type: 'number',
      default: 6,
      description: 'Start hour for display (0-23)'
    })
    .option('end-hour', {
      alias: 'e',
      type: 'number',
      default: 22,
      description: 'End hour for display (0-23)'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output file path (defaults to stdout)'
    })
    .option('interactive', {
      alias: 'i',
      type: 'boolean',
      default: false,
      description: 'Enable interactive mode'
    })
    .option('compare', {
      alias: 'c',
      type: 'boolean',
      default: false,
      description: 'Show comparison view (expected vs actual)'
    })
    .option('solve', {
      type: 'boolean',
      default: false,
      description: 'Automatically solve schedule if no solution provided'
    })
    .option('width', {
      alias: 'w',
      type: 'number',
      description: 'Override terminal width'
    })
    .option('no-color', {
      type: 'boolean',
      default: false,
      description: 'Disable colored output'
    })
    .option('failures-only', {
      alias: 'f',
      type: 'boolean',
      default: false,
      description: 'Show only failing test cases (requires --solve)'
    })
    .help()
    .alias('help', 'h')
    .example(
      '$0 --test="hard_overlap_scenario"',
      'Visualize a specific test case'
    )
    .example(
      '$0 --test="test_case" --solve',
      'Solve and visualize a test case'
    )
    .example(
      '$0 --mode=compact --output=report.txt',
      'Generate compact report to file'
    )
    .example(
      '$0 --interactive',
      'Launch interactive mode'
    )
    .example(
      '$0 --test="core-solver-no-heuristics" --solve --failures-only',
      'Show only failing test cases'
    )
    .parseAsync();

  const options = argv as CliOptions;

  // Disable colors if requested
  if (options.noColor) {
    chalk.level = 0;
  }

  // Override terminal width if specified
  if (options.width) {
    process.stdout.columns = options.width;
  }

  try {
    const visualizer = new ScheduleVisualizer({
      mode: options.mode,
      granularity: options.granularity,
      startHour: options.startHour,
      endHour: options.endHour,
      dayWidth: calculateDayWidth(options.startHour!, options.endHour!, options.granularity!),
      showLegend: true,
      showTimeRuler: options.mode === 'detailed'
    });

    if (options.interactive) {
      await runInteractiveMode(visualizer);
    } else if (options.test) {
      await visualizeTestCase(visualizer, options.test, options);
    } else {
      await showHelp();
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Calculate day width based on time range and granularity
 */
function calculateDayWidth(startHour: number, endHour: number, granularity: number): number {
  const totalMinutes = (endHour - startHour) * 60;
  return Math.floor(totalMinutes / granularity);
}

/**
 * Convert TestFixture to VisualizerTestCase format
 */
function convertFixtureToVisualizerTestCase(fixture: TestFixture): VisualizerTestCase {
  return {
    id: fixture.id,
    description: `${fixture.name} - ${fixture.description}`,
    teacher: fixture.teacher,
    students: fixture.students,
    expectedSolutions: fixture.expectedResults.maxAssignments
  };
}

/**
 * Visualize test case(s) - supports both single and multiple test cases
 */
async function visualizeTestCase(
  visualizer: ScheduleVisualizer, 
  testName: string, 
  options: CliOptions
): Promise<void> {
  console.log(chalk.cyan(`🔍 Loading test case(s): ${testName}`));
  console.log('');

  try {
    // Try to load test case(s) from various sources
    const testCasesWithFixtures = await loadTestCasesWithFixtures(testName);
    
    if (testCasesWithFixtures.length === 0) {
      throw new Error(`Test case "${testName}" not found`);
    }

    if (testCasesWithFixtures.length === 1) {
      // Single test case - use existing logic
      await visualizeSingleTestCase(visualizer, testCasesWithFixtures[0].visualizerTestCase, options);
    } else {
      // Multiple test cases - batch visualization with fixture data
      await visualizeBatchTestCasesWithFixtures(visualizer, testCasesWithFixtures, options);
    }

  } catch (error) {
    throw new Error(`Failed to visualize test case: ${error}`);
  }
}

/**
 * Visualize a single test case
 */
async function visualizeSingleTestCase(
  visualizer: ScheduleVisualizer,
  testCase: VisualizerTestCase,
  options: CliOptions
): Promise<void> {
  let output: string;
  
  if (options.solve) {
    // Use automatic solving
    output = await visualizer.renderTestCaseWithSolving(testCase);
  } else if (options.compare) {
    output = visualizer.renderComparison(testCase);
  } else {
    output = visualizer.renderTestCase(testCase);
  }

  if (options.output) {
    await writeToFile(options.output, stripAnsiCodes(output));
    console.log(chalk.green(`✅ Output saved to: ${options.output}`));
  } else {
    console.log(output);
  }
}

/**
 * Determine if a test case is failing based on expected vs actual results
 */
function isTestCaseFailing(testCase: VisualizerTestCase, originalFixture?: any): boolean {
  // If no solution was found/computed, can't determine failure yet
  if (!testCase.actualSolution) {
    return false;
  }

  const solution = testCase.actualSolution;
  const totalStudents = testCase.students.length;
  const scheduledStudents = solution.assignments.length;
  
  // Use original fixture data if available for precise comparison
  if (originalFixture?.expectedResults) {
    const expected = originalFixture.expectedResults;
    
    // Check minimum assignments constraint
    if (expected.minAssignments !== undefined && scheduledStudents < expected.minAssignments) {
      return true;
    }
    
    // Check maximum assignments constraint
    if (expected.maxAssignments !== undefined && scheduledStudents > expected.maxAssignments) {
      return true;
    }
    
    // Check if test expected to be fully solvable
    if (expected.shouldBeFullySolvable) {
      // Test fails if we expected all students to be scheduled but some weren't
      if (scheduledStudents < totalStudents) {
        return true;
      }
    } else {
      // Test expected NOT to be fully solvable
      if (scheduledStudents === totalStudents) {
        // Test fails if we scheduled everyone but expected some to fail
        return true;
      }
    }
    
    // Check for specific students that should be impossible to schedule
    if (expected.impossibleStudents) {
      const unscheduledIds = solution.unscheduled;
      for (const impossibleId of expected.impossibleStudents) {
        if (!unscheduledIds.includes(impossibleId)) {
          // Test fails if we scheduled a student that should be impossible
          return true;
        }
      }
    }
    
    return false; // Test passed - results match expectations
  }

  // Fallback logic when no original fixture data available
  // This is less precise but better than nothing
  
  // Check if test expected to be fully solvable but wasn't (from VisualizerTestCase)
  if (testCase.expectedSolutions && testCase.expectedSolutions > 0) {
    if (scheduledStudents < testCase.expectedSolutions) {
      return true;
    }
  }

  // Heuristic: If description suggests it should fail but all students were scheduled
  const description = testCase.description.toLowerCase();
  if ((description.includes('impossible') || description.includes('insufficient') || 
       description.includes('no overlap')) && scheduledStudents === totalStudents) {
    return true;
  }

  return false;
}

/**
 * Visualize multiple test cases in batch with original fixture data
 */
async function visualizeBatchTestCasesWithFixtures(
  visualizer: ScheduleVisualizer,
  testCasesWithFixtures: TestCaseWithFixture[],
  options: CliOptions
): Promise<void> {
  const testCases = testCasesWithFixtures.map(item => item.visualizerTestCase);
  
  console.log(chalk.blue(`📊 Batch visualization: ${testCases.length} test cases`));
  if (options.failuresOnly) {
    console.log(chalk.yellow('🔍 Failures-only mode: Will show only failing test cases'));
  }
  console.log('');

  const allOutputs: { output: string; testCase: VisualizerTestCase; index: number }[] = [];
  const results: { name: string; success: boolean; error?: string; failing?: boolean }[] = [];

  // First pass: Process all test cases and collect results
  for (let i = 0; i < testCasesWithFixtures.length; i++) {
    const { visualizerTestCase: testCase, originalFixture } = testCasesWithFixtures[i];
    const progress = `[${i + 1}/${testCases.length}]`;
    
    console.log(chalk.gray(`${progress} Processing: ${testCase.id}`));
    
    try {
      let output: string;
      
      if (options.solve) {
        output = await visualizer.renderTestCaseWithSolving(testCase);
      } else if (options.compare) {
        output = visualizer.renderComparison(testCase);
      } else {
        output = visualizer.renderTestCase(testCase);
      }

      // Determine if this test case is failing using original fixture data
      const isFailing = options.solve ? isTestCaseFailing(testCase, originalFixture) : false;

      allOutputs.push({ output, testCase, index: i });
      results.push({ name: testCase.id, success: true, failing: isFailing });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ name: testCase.id, success: false, error: errorMsg, failing: true });
      console.log(chalk.red(`❌ ${progress} Failed: ${errorMsg}`));
    }
  }

  // Filter outputs if failures-only mode is enabled
  let filteredOutputs = allOutputs;
  if (options.failuresOnly) {
    if (!options.solve) {
      console.log(chalk.yellow('⚠️ Warning: --failures-only requires --solve flag to determine test failures'));
      console.log(chalk.yellow('   Showing all tests since failures cannot be determined without solving'));
    } else {
      filteredOutputs = allOutputs.filter((item, index) => results[index]?.failing);
      
      if (filteredOutputs.length === 0) {
        console.log(chalk.green('🎉 No failing tests found! All tests are passing.'));
        return;
      }
      
      console.log(chalk.blue(`📋 Filtered to ${filteredOutputs.length} failing test(s) out of ${testCases.length} total`));
      console.log('');
    }
  }

  const outputs = filteredOutputs.map(item => item.output);

  // Continue with existing summary and output logic
  await renderBatchSummaryAndOutputs(outputs, results, testCases, filteredOutputs, options);
}

/**
 * Visualize multiple test cases in batch (legacy)
 */
async function visualizeBatchTestCases(
  visualizer: ScheduleVisualizer,
  testCases: VisualizerTestCase[],
  options: CliOptions
): Promise<void> {
  // Convert to TestCaseWithFixture format without original fixtures
  const testCasesWithFixtures: TestCaseWithFixture[] = testCases.map(testCase => ({
    visualizerTestCase: testCase,
    originalFixture: null
  }));
  
  await visualizeBatchTestCasesWithFixtures(visualizer, testCasesWithFixtures, options);
}

/**
 * Render batch summary and outputs
 */
async function renderBatchSummaryAndOutputs(
  outputs: string[], 
  results: { name: string; success: boolean; error?: string; failing?: boolean }[],
  testCases: VisualizerTestCase[],
  filteredOutputs: { output: string; testCase: VisualizerTestCase; index: number }[],
  options: CliOptions
): Promise<void> {

  // Print summary
  console.log('');
  console.log(chalk.blue('═'.repeat(80)));
  if (options.failuresOnly && options.solve && filteredOutputs.length > 0) {
    console.log(chalk.blue('📋 FAILURES-ONLY VISUALIZATION SUMMARY'));
  } else {
    console.log(chalk.blue('📋 BATCH VISUALIZATION SUMMARY'));
  }
  console.log(chalk.blue('═'.repeat(80)));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const failing = results.filter(r => r.failing).length;
  
  console.log(chalk.green(`✅ Successful: ${successful}`));
  if (failed > 0) {
    console.log(chalk.red(`❌ Failed: ${failed}`));
  }
  
  if (options.solve) {
    if (failing > 0) {
      console.log(chalk.yellow(`⚠️ Failing tests: ${failing}`));
    } else {
      console.log(chalk.green(`🎉 All tests passing!`));
    }
  }
  
  if (options.failuresOnly && options.solve) {
    const filtered = testCases.length - filteredOutputs.length;
    if (filtered > 0) {
      console.log(chalk.gray(`🔍 Filtered out: ${filtered} passing tests`));
    }
  }
  
  console.log('');

  // Print all outputs with separators
  for (let i = 0; i < outputs.length; i++) {
    if (i > 0) {
      console.log('');
      console.log(chalk.gray('═'.repeat(120)));
      console.log('');
    }
    console.log(outputs[i]);
  }

  // Handle file output for batch
  if (options.output && outputs.length > 0) {
    const combinedOutput = outputs.join('\n\n' + '═'.repeat(120) + '\n\n');
    await writeToFile(options.output, stripAnsiCodes(combinedOutput));
    console.log('');
    console.log(chalk.green(`✅ Batch output saved to: ${options.output}`));
  }
}

/**
 * Extended result type that includes original fixture for comparison
 */
interface TestCaseWithFixture {
  visualizerTestCase: VisualizerTestCase;
  originalFixture: any;
}

/**
 * Load test case(s) by name or ID - returns array with original fixture data
 */
async function loadTestCasesWithFixtures(testName: string): Promise<TestCaseWithFixture[]> {
  // Check if we should load extracted test data
  if (testName === 'core-solver-no-heuristics' || testName === 'extracted') {
    try {
      const { loadExtractedTestData } = await import('../tests/extract-test-data');
      const extractedData = await loadExtractedTestData();
      
      return extractedData.testCases.map(testCase => ({
        visualizerTestCase: {
          id: testCase.id,
          description: `${testCase.name} - ${testCase.description}`,
          teacher: testCase.teacher,
          students: testCase.students,
          expectedSolutions: testCase.expectedResults?.expectedAssignments
        },
        originalFixture: {
          expectedResults: {
            minAssignments: testCase.expectedResults?.minAssignments ?? 0,
            maxAssignments: testCase.expectedResults?.maxAssignments ?? 0,
            shouldBeFullySolvable: testCase.expectedResults?.shouldBeFullySolvable ?? false,
            impossibleStudents: testCase.expectedResults?.impossibleStudents
          }
        }
      }));
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not load extracted test data: ${error}`));
      console.log(chalk.yellow(`   Falling back to fixtures. Run tests with EXTRACT_TEST_DATA=true first.`));
    }
  }

  // Import fixture loader functions
  const { 
    loadFixture, 
    loadAllFixtures, 
    loadFixtureCollection, 
    getFixturesByCategory 
  } = await import('../tests/fixtures/fixture-loader');

  // Try to load specific fixture by ID first
  const fixture = loadFixture(testName);
  if (fixture) {
    return [{
      visualizerTestCase: convertFixtureToVisualizerTestCase(fixture),
      originalFixture: fixture
    }];
  }

  // Try to load by test file name mapping
  const testCaseMapping: Record<string, string> = {
    'core-solver-no-heuristics': 'all',
    'core-solver-fixtures': 'all',
    'trivial': 'trivial',
    'simple': 'simple', 
    'complex': 'complex',
    'edge-case': 'edge-case'
  };

  const mappedCategory = testCaseMapping[testName];
  if (mappedCategory) {
    if (mappedCategory === 'all') {
      // Return ALL fixtures from all collections
      const collections = loadAllFixtures();
      const allFixtures: TestCaseWithFixture[] = [];
      for (const collection of collections) {
        for (const fixture of collection.fixtures) {
          allFixtures.push({
            visualizerTestCase: convertFixtureToVisualizerTestCase(fixture),
            originalFixture: fixture
          });
        }
      }
      return allFixtures;
    } else {
      // Return all fixtures from specific category
      const fixtures = getFixturesByCategory(mappedCategory as any);
      return fixtures.map(fixture => ({
        visualizerTestCase: convertFixtureToVisualizerTestCase(fixture),
        originalFixture: fixture
      }));
    }
  }

  // Try partial name matching
  const collections = loadAllFixtures();
  const matchingFixtures: TestCaseWithFixture[] = [];
  for (const collection of collections) {
    for (const fixture of collection.fixtures) {
      if (fixture.name.toLowerCase().includes(testName.toLowerCase()) ||
          fixture.id.includes(testName)) {
        matchingFixtures.push({
          visualizerTestCase: convertFixtureToVisualizerTestCase(fixture),
          originalFixture: fixture
        });
      }
    }
  }

  if (matchingFixtures.length > 0) {
    return matchingFixtures;
  }

  return [];
}

/**
 * Load test case(s) by name or ID - returns array to support multiple fixtures (legacy)
 */
async function loadTestCases(testName: string): Promise<VisualizerTestCase[]> {
  const testCasesWithFixtures = await loadTestCasesWithFixtures(testName);
  return testCasesWithFixtures.map(item => item.visualizerTestCase);
}

/**
 * Load test case by name or ID (legacy single-case function)
 */
async function loadTestCase(testName: string): Promise<VisualizerTestCase | null> {
  const testCases = await loadTestCases(testName);
  return testCases.length > 0 ? testCases[0] : null;
}

/**
 * Run interactive mode
 */
async function runInteractiveMode(visualizer: ScheduleVisualizer): Promise<void> {
  console.log(chalk.cyan('🎯 Interactive Schedule Visualizer'));
  console.log(chalk.gray('Use arrow keys to navigate, q to quit, h for help'));
  console.log('');

  // This would implement interactive terminal UI
  // For now, show available test cases
  console.log(chalk.yellow('📋 Available Test Cases:'));
  
  const availableTests = [
    'hard_overlap_scenario',
    'medium_fragmentation_test',
    'performance_50_students',
    'impossible_constraints',
    'back_to_back_preference'
  ];

  for (let i = 0; i < availableTests.length; i++) {
    console.log(chalk.gray(`  ${i + 1}. ${availableTests[i]}`));
  }

  console.log('');
  console.log(chalk.yellow('Interactive mode coming soon! Use --test option for now.'));
  console.log(chalk.gray('Example: pnpm visualize --test="hard_overlap_scenario"'));
}

/**
 * Show help information
 */
async function showHelp(): Promise<void> {
  console.log(chalk.cyan('📚 Schedule Visualizer Help'));
  console.log('');
  console.log('This tool helps debug scheduling algorithm issues by visualizing:');
  console.log('• Student availability schedules');
  console.log('• Teacher availability schedules');
  console.log('• Solver solutions (or failures)');
  console.log('• Expected vs actual results');
  console.log('');
  console.log(chalk.yellow('Common Usage:'));
  console.log('  pnpm visualize --test="test_case_name"     # Visualize specific test');
  console.log('  pnpm visualize --test="case" --solve       # Solve and visualize test');
  console.log('  pnpm visualize --interactive               # Interactive mode');
  console.log('  pnpm visualize --compare --test="case"     # Comparison view');
  console.log('');
  console.log(chalk.yellow('Display Options:'));
  console.log('  --mode=detailed                           # Full time grid');
  console.log('  --mode=compact                            # Single line per day');
  console.log('  --mode=summary                            # High-level overview');
  console.log('  --granularity=15                          # 15-minute blocks');
  console.log('  --start-hour=9 --end-hour=17              # Business hours only');
  console.log('');
  console.log(chalk.gray('Run with --help for full options list'));
}

/**
 * Write output to file
 */
async function writeToFile(filePath: string, content: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Strip ANSI color codes for file output
 */
function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Handle CLI errors
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('CLI Error:'), error);
    process.exit(1);
  });
}

export { main as runCli };