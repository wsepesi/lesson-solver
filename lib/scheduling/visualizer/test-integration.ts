/**
 * Test framework integration for automatic visualization on failures
 */

import chalk from 'chalk';
import type { Reporter } from 'vitest';
import type { File, Task, TaskResultPack } from 'vitest';
import { ScheduleVisualizer, type VisualizerTestCase } from './index';
import type { StudentConfig, TeacherConfig, ScheduleSolution } from '../types';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Test case data that can be captured during test execution
 */
export interface CapturedTestData {
  teacher: TeacherConfig;
  students: StudentConfig[];
  expectedSolution?: ScheduleSolution;
  actualSolution?: ScheduleSolution | null;
  error?: string;
  testName: string;
  testDescription: string;
}

/**
 * Global registry for test data capture
 */
class TestDataRegistry {
  private static instance: TestDataRegistry;
  private capturedData = new Map<string, CapturedTestData>();
  private visualizationEnabled = false;

  static getInstance(): TestDataRegistry {
    if (!TestDataRegistry.instance) {
      TestDataRegistry.instance = new TestDataRegistry();
    }
    return TestDataRegistry.instance;
  }

  enableVisualization(): void {
    this.visualizationEnabled = true;
  }

  isVisualizationEnabled(): boolean {
    return this.visualizationEnabled;
  }

  captureTestData(testId: string, data: CapturedTestData): void {
    this.capturedData.set(testId, data);
  }

  getTestData(testId: string): CapturedTestData | undefined {
    return this.capturedData.get(testId);
  }

  getAllTestData(): Map<string, CapturedTestData> {
    return new Map(this.capturedData);
  }

  clear(): void {
    this.capturedData.clear();
  }
}

/**
 * Helper function to capture test data for visualization
 * Call this from within test cases to enable visualization on failure
 */
export function captureTestData(
  testName: string,
  teacher: TeacherConfig,
  students: StudentConfig[],
  options?: {
    expectedSolution?: ScheduleSolution;
    actualSolution?: ScheduleSolution | null;
    error?: string;
    description?: string;
  }
): void {
  const registry = TestDataRegistry.getInstance();
  
  if (!registry.isVisualizationEnabled()) {
    return; // Skip if visualization is disabled
  }

  const testData: CapturedTestData = {
    testName,
    testDescription: options?.description ?? testName,
    teacher,
    students,
    expectedSolution: options?.expectedSolution,
    actualSolution: options?.actualSolution,
    error: options?.error
  };

  registry.captureTestData(testName, testData);
}

/**
 * Vitest reporter that generates visualizations for failed tests
 */
export class VisualizerReporter implements Reporter {
  private outputDir: string;
  private visualizer: ScheduleVisualizer;

  constructor(options: { outputDir?: string } = {}) {
    this.outputDir = options.outputDir || 'test-reports/visualizations';
    this.visualizer = new ScheduleVisualizer({
      mode: 'detailed',
      granularity: 15,
      showLegend: true
    });
  }

  onInit(): void {
    // Enable visualization when this reporter is active or when flag is set
    if (shouldVisualize()) {
      TestDataRegistry.getInstance().enableVisualization();
    }
    
    // Ensure output directory exists
    try {
      mkdirSync(this.outputDir, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create visualization output directory: ${String(error)}`);
    }
  }

  onFinished(_files: File[]): void {
    const registry = TestDataRegistry.getInstance();
    const testData = registry.getAllTestData();
    
    if (testData.size === 0) {
      return;
    }

    console.log(chalk.cyan('\n📊 Generating test visualizations...'));

    for (const [testId, data] of testData) {
      try {
        this.generateVisualization(testId, data);
      } catch (error) {
        console.warn(`Failed to generate visualization for ${testId}: ${String(error)}`);
      }
    }

    console.log(chalk.green(`✅ Generated ${testData.size} visualizations in ${this.outputDir}`));
    registry.clear();
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    // Check for failed tests and generate immediate visualizations
    for (const pack of packs) {
      for (const result of pack) {
        if (result[1]?.state === 'fail') {
          this.handleFailedTest(result[0]);
        }
      }
    }
  }

  private handleFailedTest(task: Task): void {
    const registry = TestDataRegistry.getInstance();
    const testData = registry.getTestData(task.name);
    
    if (!testData) {
      return; // No captured data for this test
    }

    // Add error information from test result
    if (task.result?.errors?.[0]) {
      testData.error = task.result.errors[0].message;
    }

    // Generate immediate visualization for failed test
    console.log(chalk.yellow(`\n⚠️ Test failed: ${task.name}`));
    console.log(chalk.gray('Generating visualization...'));
    
    try {
      const visualization = this.createVisualization(task.name, testData);
      console.log('\n' + visualization);
      console.log(''); // Extra spacing
    } catch (error) {
      console.warn(`Failed to generate inline visualization: ${String(error)}`);
    }
  }

  private generateVisualization(testId: string, data: CapturedTestData): void {
    const testCase: VisualizerTestCase = {
      id: testId,
      description: data.testDescription,
      teacher: data.teacher,
      students: data.students,
      actualSolution: data.actualSolution,
      expectedSolution: data.expectedSolution,
      error: data.error
    };

    // Generate detailed visualization
    const detailedViz = this.visualizer.renderTestCase(testCase);
    
    // Generate comparison if we have expected solution
    const comparisonViz = data.expectedSolution ? 
      this.visualizer.renderComparison(testCase) : 
      null;

    // Save to files
    const safeTestId = testId.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    this.saveVisualization(
      `${safeTestId}_detailed.txt`, 
      this.stripAnsiCodes(detailedViz)
    );

    if (comparisonViz) {
      this.saveVisualization(
        `${safeTestId}_comparison.txt`, 
        this.stripAnsiCodes(comparisonViz)
      );
    }

    // Save colored version for terminal viewing
    this.saveVisualization(
      `${safeTestId}_colored.txt`, 
      detailedViz
    );
  }

  private createVisualization(testId: string, data: CapturedTestData): string {
    const testCase: VisualizerTestCase = {
      id: testId,
      description: data.testDescription,
      teacher: data.teacher,
      students: data.students,
      actualSolution: data.actualSolution,
      expectedSolution: data.expectedSolution,
      error: data.error
    };

    return this.visualizer.renderTestCase(testCase);
  }

  private saveVisualization(filename: string, content: string): void {
    const filePath = join(this.outputDir, filename);
    
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.warn(`Failed to save visualization to ${filePath}: ${String(error)}`);
    }
  }

  private stripAnsiCodes(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\u001b\[[0-9;]*m/g, '');
  }
}

/**
 * Helper function to enable visualization for a test suite
 * Call this in beforeAll or describe blocks
 */
export function enableTestVisualization(): void {
  TestDataRegistry.getInstance().enableVisualization();
}

/**
 * Check if visualization should be enabled based on environment variables or CLI flags
 */
export function shouldVisualize(): boolean {
  // Check for environment variable
  if (process.env.VISUALIZE === 'true' || process.env.VISUALIZE === '1') {
    return true;
  }
  
  // Check for CLI argument
  if (process.argv.includes('--visualize') || process.argv.includes('-v')) {
    return true;
  }
  
  // Check if current registry is enabled
  return TestDataRegistry.getInstance().isVisualizationEnabled();
}

/**
 * Conditionally enable visualization based on environment/CLI flags
 */
export function enableVisualizationIfRequested(): void {
  if (shouldVisualize()) {
    enableTestVisualization();
  }
}

/**
 * Helper function to create visualizer-friendly test wrapper
 */
export function visualizableTest(
  name: string,
  teacher: TeacherConfig,
  students: StudentConfig[],
  testFn: () => Promise<ScheduleSolution | null> | ScheduleSolution | null,
  options?: {
    expectedSolution?: ScheduleSolution;
    description?: string;
  }
): () => Promise<void> {
  return async () => {
    let actualSolution: ScheduleSolution | null = null;
    let error: string | undefined = undefined;

    try {
      const result = await testFn();
      actualSolution = result;
    } catch (testError) {
      error = testError instanceof Error ? testError.message : String(testError);
      throw testError; // Re-throw to maintain test failure
    } finally {
      // Capture data regardless of success/failure
      captureTestData(name, teacher, students, {
        actualSolution,
        expectedSolution: options?.expectedSolution,
        error,
        description: options?.description
      });
    }
  };
}

/**
 * Test wrapper that automatically enables visualization and solves if needed
 */
export async function testWithVisualization(
  name: string,
  teacher: TeacherConfig,
  students: StudentConfig[],
  testFn?: () => Promise<ScheduleSolution | null> | ScheduleSolution | null,
  options?: {
    expectedSolution?: ScheduleSolution;
    description?: string;
    forceVisualize?: boolean;
  }
): Promise<void> {
  // Enable visualization if requested
  if (options?.forceVisualize || shouldVisualize()) {
    enableTestVisualization();

    let actualSolution: ScheduleSolution | null = null;
    let error: string | undefined = undefined;

    try {
      if (testFn) {
        actualSolution = await testFn();
      } else {
        // Auto-solve if no test function provided
        const { solveSchedule } = await import('../solver');
        actualSolution = await solveSchedule(teacher, students);
      }
    } catch (testError) {
      error = testError instanceof Error ? testError.message : String(testError);
    }

    // Capture and potentially display visualization
    captureTestData(name, teacher, students, {
      actualSolution,
      expectedSolution: options?.expectedSolution,
      error,
      description: options?.description
    });

    // If requested, show immediate visualization
    if (shouldVisualize()) {
      const { ScheduleVisualizer } = await import('./index');
      const visualizer = new ScheduleVisualizer();
      
      const testCase = {
        id: name,
        description: options?.description ?? name,
        teacher,
        students,
        actualSolution,
        expectedSolution: options?.expectedSolution,
        error
      };

      console.log('\n' + await visualizer.renderTestCaseWithSolving(testCase));
    }

    // Re-throw error if there was one and no expected solution
    if (error && !options?.expectedSolution) {
      throw new Error(error);
    }
  }
}

/**
 * Export the registry for advanced usage
 */
export { TestDataRegistry };

/**
 * Convenience function to manually trigger visualization
 */
export function generateManualVisualization(
  testName: string,
  teacher: TeacherConfig,
  students: StudentConfig[],
  solution?: ScheduleSolution | null,
  options?: { outputPath?: string; description?: string }
): void {
  const visualizer = new ScheduleVisualizer();
  
  const testCase: VisualizerTestCase = {
    id: testName,
    description: options?.description || testName,
    teacher,
    students,
    actualSolution: solution
  };

  const visualization = visualizer.renderTestCase(testCase);
  
  if (options?.outputPath) {
    const content = visualization.replace(/\u001b\[[0-9;]*m/g, ''); // Strip colors for file
    try {
      mkdirSync(dirname(options.outputPath), { recursive: true });
      writeFileSync(options.outputPath, content, 'utf-8');
      console.log(chalk.green(`✅ Visualization saved to: ${options.outputPath}`));
    } catch (error) {
      console.error(chalk.red(`Failed to save visualization: ${error}`));
    }
  } else {
    console.log(visualization);
  }
}