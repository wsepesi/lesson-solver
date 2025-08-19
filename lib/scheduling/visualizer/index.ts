/**
 * Main Schedule Visualizer - Entry point for the visualization system
 */

import chalk from 'chalk';
import type { 
  StudentConfig, 
  TeacherConfig, 
  ScheduleSolution,
  LessonAssignment 
} from '../types';
import type { TestCase } from '../test-generator/core';
import { 
  WeekScheduleDisplay, 
  StudentSchedulesDisplay, 
  SolutionDisplay, 
  ComparisonDisplay,
  type DisplayOptions 
} from './display';
import { Colors, TextColors, StatusIndicators, createBox, getTerminalWidth } from './utils';
import { solveSchedule } from '../solver';

export interface VisualizerTestCase {
  id: string;
  description: string;
  teacher: TeacherConfig;
  students: StudentConfig[];
  expectedSolutions?: number;
  actualSolution?: ScheduleSolution | null;
  expectedSolution?: ScheduleSolution | null;
  error?: string;
}

/**
 * Main visualizer class that orchestrates all display components
 */
export class ScheduleVisualizer {
  private weekDisplay: WeekScheduleDisplay;
  private studentDisplay: StudentSchedulesDisplay;
  private solutionDisplay: SolutionDisplay;
  private comparisonDisplay: ComparisonDisplay;

  constructor(private options: DisplayOptions = {}) {
    this.weekDisplay = new WeekScheduleDisplay(options);
    this.studentDisplay = new StudentSchedulesDisplay(options);
    this.solutionDisplay = new SolutionDisplay();
    this.comparisonDisplay = new ComparisonDisplay();
  }

  /**
   * Render a complete test case visualization
   */
  renderTestCase(testCase: VisualizerTestCase): string {
    const sections: string[] = [];
    const terminalWidth = getTerminalWidth();

    // Header
    sections.push(this.renderHeader(testCase));
    sections.push('');

    // Student schedules
    sections.push(this.studentDisplay.renderStudentSchedules(testCase.students));
    sections.push('');

    // Teacher schedule
    sections.push(this.renderTeacherSchedule(testCase.teacher));
    sections.push('');

    // Solution or error
    if (testCase.error) {
      sections.push(this.renderError(testCase.error));
    } else if (testCase.actualSolution) {
      sections.push(this.solutionDisplay.renderSolution(
        testCase.actualSolution, 
        testCase.students, 
        testCase.teacher
      ));
    } else {
      sections.push(this.renderNoSolution());
    }

    sections.push('');
    sections.push(this.renderFooter());

    return sections.join('\n');
  }

  /**
   * Render a test case with automatic solving
   */
  async renderTestCaseWithSolving(testCase: VisualizerTestCase): Promise<string> {
    // If no solution provided, try to solve it
    if (!testCase.actualSolution && !testCase.error) {
      try {
        const startTime = performance.now();
        const solution = await solveSchedule(testCase.teacher, testCase.students);
        const endTime = performance.now();

        testCase.actualSolution = {
          ...solution,
          metadata: {
            ...solution.metadata,
            computeTimeMs: endTime - startTime
          }
        };
      } catch (error) {
        testCase.error = error instanceof Error ? error.message : String(error);
      }
    }

    return this.renderTestCase(testCase);
  }

  /**
   * Render comparison between expected and actual results
   */
  renderComparison(testCase: VisualizerTestCase): string {
    const sections: string[] = [];

    // Header
    sections.push(this.renderHeader(testCase));
    sections.push('');

    // Student schedules (compact)
    const compactOptions = { ...this.options, mode: 'summary' as const };
    const compactStudentDisplay = new StudentSchedulesDisplay(compactOptions);
    sections.push(compactStudentDisplay.renderStudentSchedules(testCase.students));
    sections.push('');

    // Teacher schedule (compact)
    const compactWeekDisplay = new WeekScheduleDisplay(compactOptions);
    sections.push(compactWeekDisplay.renderWeekSchedule(
      testCase.teacher.availability, 
      `${StatusIndicators.teacher} TEACHER SCHEDULE`
    ));
    sections.push('');

    // Comparison
    sections.push(this.comparisonDisplay.renderComparison(
      testCase.expectedSolution || null,
      testCase.actualSolution || null,
      testCase.students,
      testCase.teacher
    ));

    sections.push('');
    sections.push(this.renderFooter());

    return sections.join('\n');
  }

  /**
   * Visualize a live solving attempt
   */
  async visualizeSolving(
    teacher: TeacherConfig, 
    students: StudentConfig[],
    description: string = 'Live Solving Session'
  ): Promise<string> {
    const testCase: VisualizerTestCase = {
      id: 'live-session',
      description,
      teacher,
      students
    };

    // Show initial state
    console.log(this.renderTestCase(testCase));
    console.log(TextColors.info('🚀 Starting solver...'));
    console.log('');

    try {
      // Solve the schedule
      const startTime = performance.now();
      const solution = await solveSchedule(teacher, students);
      const endTime = performance.now();

      // Update test case with solution
      testCase.actualSolution = {
        ...solution,
        metadata: {
          ...solution.metadata,
          computeTimeMs: endTime - startTime
        }
      };

      return this.renderTestCase(testCase);

    } catch (error) {
      testCase.error = error instanceof Error ? error.message : String(error);
      return this.renderTestCase(testCase);
    }
  }

  /**
   * Render just the solution assignments in a compact format
   */
  renderAssignmentsOnly(
    assignments: LessonAssignment[], 
    students: StudentConfig[]
  ): string {
    const mockSolution: ScheduleSolution = {
      assignments,
      unscheduled: [],
      metadata: {
        totalStudents: students.length,
        scheduledStudents: assignments.length,
        averageUtilization: 0,
        computeTimeMs: 0
      }
    };

    return this.solutionDisplay.renderSolution(
      mockSolution, 
      students, 
      {} as TeacherConfig // Teacher not needed for assignments-only view
    );
  }

  /**
   * Create a test case from solver inputs
   */
  static createTestCase(
    id: string,
    description: string,
    teacher: TeacherConfig,
    students: StudentConfig[],
    expectedSolutions?: number
  ): VisualizerTestCase {
    return {
      id,
      description,
      teacher,
      students,
      expectedSolutions
    };
  }

  /**
   * Convert a TestCase from test-generator to VisualizerTestCase
   */
  static fromTestGeneratorCase(testCase: TestCase): VisualizerTestCase {
    return {
      id: testCase.id,
      description: testCase.description,
      teacher: testCase.teacher,
      students: testCase.students,
      expectedSolutions: testCase.expectedSolutions
    };
  }

  // Private helper methods

  private renderHeader(testCase: VisualizerTestCase): string {
    const lines: string[] = [];
    const terminalWidth = getTerminalWidth();
    
    // Title box
    const title = 'SCHEDULE VISUALIZER v1.0';
    lines.push('╔' + '═'.repeat(terminalWidth - 2) + '╗');
    lines.push('║' + title.padStart((terminalWidth - 2 + title.length) / 2).padEnd(terminalWidth - 2) + '║');
    lines.push('╠' + '═'.repeat(terminalWidth - 2) + '╣');
    
    // Test case info
    lines.push('║' + ` Test Case: ${testCase.id}`.padEnd(terminalWidth - 2) + '║');
    lines.push('║' + ` Description: ${testCase.description}`.padEnd(terminalWidth - 2) + '║');
    
    // Status
    let status = '';
    if (testCase.error) {
      status = `${StatusIndicators.failure} FAILED (${testCase.error})`;
    } else if (testCase.actualSolution) {
      const scheduled = testCase.actualSolution.metadata.scheduledStudents;
      const total = testCase.actualSolution.metadata.totalStudents;
      if (scheduled === total) {
        status = `${StatusIndicators.success} SUCCESS (${scheduled}/${total} students)`;
      } else {
        status = `${StatusIndicators.warning} PARTIAL (${scheduled}/${total} students)`;
      }
    } else {
      status = `${StatusIndicators.info} PENDING`;
    }
    
    lines.push('║' + ` Status: ${status}`.padEnd(terminalWidth - 2) + '║');
    lines.push('╚' + '═'.repeat(terminalWidth - 2) + '╝');
    
    return lines.join('\n');
  }

  private renderTeacherSchedule(teacher: TeacherConfig): string {
    return this.weekDisplay.renderWeekSchedule(
      teacher.availability, 
      `${StatusIndicators.teacher} TEACHER SCHEDULE`
    );
  }

  private renderError(error: string): string {
    const lines: string[] = [];
    lines.push(TextColors.header(`${StatusIndicators.failure} ERROR`));
    lines.push(TextColors.error(error));
    return createBox(lines, 'Solver Error');
  }

  private renderNoSolution(): string {
    const lines: string[] = [];
    lines.push(TextColors.header(`${StatusIndicators.failure} NO SOLUTION`));
    lines.push(TextColors.warning('The solver did not find any valid schedule.'));
    lines.push('');
    lines.push('Possible causes:');
    lines.push('• Insufficient teacher availability');
    lines.push('• Conflicting student requirements');
    lines.push('• Over-constrained scheduling parameters');
    return createBox(lines, 'Scheduling Failed');
  }

  private renderFooter(): string {
    const lines: string[] = [];
    lines.push(TextColors.muted('═'.repeat(getTerminalWidth())));
    lines.push(TextColors.muted('Legend: █ Available  ░ Busy  ✅ Scheduled  ❌ Failed'));
    lines.push(TextColors.muted('Generated by Schedule Visualizer • Use --help for options'));
    return lines.join('\n');
  }
}

// Export the main visualizer and display components
export { WeekScheduleDisplay, StudentSchedulesDisplay, SolutionDisplay, ComparisonDisplay };
export type { DisplayOptions, VisualizerTestCase };

// Convenience function for quick visualization
export function visualizeTestCase(testCase: VisualizerTestCase, options?: DisplayOptions): string {
  const visualizer = new ScheduleVisualizer(options);
  return visualizer.renderTestCase(testCase);
}

export function visualizeComparison(testCase: VisualizerTestCase, options?: DisplayOptions): string {
  const visualizer = new ScheduleVisualizer(options);
  return visualizer.renderComparison(testCase);
}

// Convenience function for automatic solving visualization
export async function visualizeTestCaseWithSolving(testCase: VisualizerTestCase, options?: DisplayOptions): Promise<string> {
  const visualizer = new ScheduleVisualizer(options);
  return visualizer.renderTestCaseWithSolving(testCase);
}