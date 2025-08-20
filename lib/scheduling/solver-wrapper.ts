/**
 * Universal Solver Wrapper for Test Visualization
 * 
 * This module provides transparent wrappers around the solver functions that
 * automatically capture test data and display visualizations when the VISUALIZE
 * flag is enabled. Works with any existing test without modification.
 */

import type {
  StudentConfig,
  TeacherConfig,
  ScheduleSolution
} from './types';

import {
  ScheduleSolver as OriginalScheduleSolver,
  solveSchedule as originalSolveSchedule,
  createOptimalSolver as originalCreateOptimalSolver,
  type SolverOptions
} from './solver';

import { 
  shouldVisualize,
  enableTestVisualization,
  enableVisualizationIfRequested,
  captureTestData
} from './visualizer/test-integration';

import { ScheduleVisualizer } from './visualizer/index';

// Track current test context
let currentTestName = 'Unknown Test';
let currentTestDescription = '';

/**
 * Set the current test context for better visualization
 */
export function setTestContext(name: string, description?: string): void {
  currentTestName = name;
  currentTestDescription = description || name;
}

/**
 * Get current test name from vitest context if available
 */
function getCurrentTestName(): string {
  // Try to get test name from vitest's global context
  if (typeof globalThis !== 'undefined' && (globalThis as any).__vitest_runner__) {
    const runner = (globalThis as any).__vitest_runner__;
    if (runner.suite?.name && runner.task?.name) {
      return `${runner.suite.name} > ${runner.task.name}`;
    }
    if (runner.task?.name) {
      return runner.task.name;
    }
  }
  
  // Fallback to manually set context
  return currentTestName;
}

/**
 * Wrapped ScheduleSolver class that captures visualization data
 */
export class ScheduleSolver extends OriginalScheduleSolver {
  solve(teacher: TeacherConfig, students: StudentConfig[]): ScheduleSolution {
    const testName = getCurrentTestName();
    
    if (shouldVisualize()) {
      enableTestVisualization();
      
      let solution: ScheduleSolution;
      let error: string | undefined;
      
      try {
        // Call the original solver
        const startTime = performance.now();
        solution = super.solve(teacher, students);
        const endTime = performance.now();
        
        // Update timing metadata
        solution = {
          ...solution,
          metadata: {
            ...solution.metadata,
            computeTimeMs: endTime - startTime
          }
        };
        
        // Capture successful solve
        captureTestData(testName, teacher, students, {
          actualSolution: solution,
          description: currentTestDescription
        });
        
        // Show immediate visualization
        this.showVisualization(testName, teacher, students, solution);
        
        return solution;
        
      } catch (solverError) {
        error = solverError instanceof Error ? solverError.message : String(solverError);
        
        // Capture failed solve
        captureTestData(testName, teacher, students, {
          error,
          description: currentTestDescription
        });
        
        // Show error visualization
        this.showVisualization(testName, teacher, students, null, error);
        
        throw solverError;
      }
    }
    
    // Normal execution when visualization disabled
    return super.solve(teacher, students);
  }
  
  private async showVisualization(
    testName: string,
    teacher: TeacherConfig,
    students: StudentConfig[],
    solution?: ScheduleSolution | null,
    error?: string
  ): Promise<void> {
    try {
      const visualizer = new ScheduleVisualizer({
        mode: 'detailed',
        granularity: 15,
        showLegend: true
      });
      
      const testCase = {
        id: testName,
        description: currentTestDescription,
        teacher,
        students,
        actualSolution: solution,
        error
      };
      
      const output = await visualizer.renderTestCaseWithSolving(testCase);
      console.log('\n' + output + '\n');
      
    } catch (vizError) {
      console.warn(`Failed to show visualization: ${vizError}`);
    }
  }
}

/**
 * Wrapped solveSchedule function that captures visualization data
 */
export function solveSchedule(
  teacher: TeacherConfig,
  students: StudentConfig[],
  options?: SolverOptions
): ScheduleSolution {
  if (shouldVisualize()) {
    const solver = new ScheduleSolver(options || {});
    return solver.solve(teacher, students);
  }
  
  // Normal execution when visualization disabled
  return originalSolveSchedule(teacher, students, options);
}

/**
 * Wrapped createOptimalSolver function
 */
export function createOptimalSolver(studentCount: number): ScheduleSolver {
  if (shouldVisualize()) {
    const originalSolver = originalCreateOptimalSolver(studentCount);
    // Copy the options from the original solver
    return new ScheduleSolver({
      maxTimeMs: (originalSolver as any).options?.maxTimeMs || 10000,
      enableOptimizations: true,
      logLevel: 'none'
    });
  }
  
  return originalCreateOptimalSolver(studentCount);
}

/**
 * Export utilities for test setup
 */
export { shouldVisualize, enableVisualizationIfRequested };

// Re-export everything else from the original solver module
export * from './solver';

// Override the exported classes/functions with wrapped versions
export { ScheduleSolver as OriginalScheduleSolver } from './solver';