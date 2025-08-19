/**
 * Core display components for schedule visualization
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import type { 
  TimeBlock, 
  WeekSchedule, 
  DaySchedule, 
  StudentConfig, 
  TeacherConfig, 
  LessonAssignment,
  ScheduleSolution 
} from '../types';
import { dayNames, minutesToTimeString, timeBlockToString } from '../display-utils';
import { 
  getStudentColor, 
  Colors,
  TextColors, 
  StatusIndicators, 
  createBox, 
  padString, 
  renderTimeBlocks, 
  createTimeRuler,
  formatDuration,
  BoxChars,
  getTerminalWidth,
  truncateText
} from './utils';

export interface DisplayOptions {
  /** Show time ruler above schedule */
  showTimeRuler?: boolean;
  /** Granularity in minutes (5, 15, 30, 60) */
  granularity?: number;
  /** Width of day display in characters */
  dayWidth?: number;
  /** Start hour for display (0-23) */
  startHour?: number;
  /** End hour for display (0-23) */
  endHour?: number;
  /** Display mode */
  mode?: 'compact' | 'detailed' | 'summary';
  /** Show student names in legend */
  showLegend?: boolean;
}

/**
 * Display a week schedule as ASCII grid
 */
export class WeekScheduleDisplay {
  constructor(private options: DisplayOptions = {}) {
    this.options = {
      showTimeRuler: true,
      granularity: 15,
      dayWidth: 48,
      startHour: 6,
      endHour: 22,
      mode: 'detailed',
      showLegend: true,
      ...options
    };
  }

  /**
   * Render a complete week schedule
   */
  renderWeekSchedule(
    schedule: WeekSchedule, 
    title: string = 'Week Schedule',
    assignments?: LessonAssignment[]
  ): string {
    const { dayWidth, showTimeRuler, mode } = this.options;
    const lines: string[] = [];

    if (mode === 'summary') {
      return this.renderSummaryMode(schedule, title, assignments);
    }

    // Header
    lines.push(TextColors.header(title));
    lines.push('');

    // Time ruler
    if (showTimeRuler && mode === 'detailed') {
      const ruler = createTimeRuler(
        this.options.startHour!,
        this.options.endHour!,
        dayWidth!,
        true,
        this.options.granularity!
      );
      lines.push(TextColors.muted(`       ${ruler}`));
    }

    // Day-by-day display
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const daySchedule = schedule.days[dayIndex];
      if (!daySchedule || daySchedule.blocks.length === 0) {
        if (mode === 'detailed') {
          lines.push(this.renderEmptyDay(dayIndex));
        }
        continue;
      }

      lines.push(this.renderDaySchedule(daySchedule, assignments));
    }

    return lines.join('\n');
  }

  /**
   * Render a single day schedule
   */
  renderDaySchedule(daySchedule: DaySchedule, assignments?: LessonAssignment[]): string {
    const { dayWidth, granularity } = this.options;
    const dayName = dayNames[daySchedule.dayOfWeek]!.slice(0, 3);
    const formattedDayName = dayName.padEnd(6);
    
    // Get assignments for this day
    const dayAssignments = assignments?.filter(a => a.dayOfWeek === daySchedule.dayOfWeek) || [];
    
    // Render available blocks
    const availableDisplay = renderTimeBlocks(
      daySchedule.blocks,
      dayWidth!,
      granularity!,
      '░',
      '█',
      this.options.startHour!
    );

    // Overlay assignments if present
    let finalDisplay = availableDisplay;
    if (dayAssignments.length > 0) {
      finalDisplay = this.overlayAssignments(availableDisplay, dayAssignments);
    }

    // Time range summary
    const timeRange = this.getTimeRangeSummary(daySchedule.blocks);
    const summary = timeRange ? TextColors.muted(` ${timeRange}`) : '';

    return `${TextColors.info(formattedDayName)}${BoxChars.vertical} ${finalDisplay}${summary}`;
  }

  /**
   * Render empty day
   */
  private renderEmptyDay(dayIndex: number): string {
    const { dayWidth } = this.options;
    const dayName = dayNames[dayIndex]!.slice(0, 3);
    const formattedDayName = dayName.padEnd(6);
    const emptyDisplay = TextColors.muted('░'.repeat(dayWidth!));
    return `${TextColors.muted(formattedDayName)}${BoxChars.vertical} ${emptyDisplay} ${TextColors.muted('(unavailable)')}`;
  }

  /**
   * Overlay lesson assignments on schedule display
   */
  private overlayAssignments(baseDisplay: string, assignments: LessonAssignment[]): string {
    const { dayWidth, granularity } = this.options;
    const chars = baseDisplay.split('');

    for (const assignment of assignments) {
      const startBlock = Math.floor(assignment.startMinute / granularity!);
      const endBlock = Math.ceil((assignment.startMinute + assignment.durationMinutes) / granularity!);
      
      for (let i = startBlock; i < endBlock && i < dayWidth!; i++) {
        chars[i] = Colors.scheduled;
      }
    }

    return chars.join('');
  }

  /**
   * Get time range summary for a day
   */
  private getTimeRangeSummary(blocks: TimeBlock[]): string | null {
    if (blocks.length === 0) return null;

    const sortedBlocks = [...blocks].sort((a, b) => a.start - b.start);
    
    // Group contiguous blocks
    const timeRanges: string[] = [];
    let currentGroupStart = sortedBlocks[0]!;
    let currentGroupEnd = sortedBlocks[0]!;
    
    for (let i = 1; i < sortedBlocks.length; i++) {
      const block = sortedBlocks[i]!;
      const previousEnd = currentGroupEnd.start + currentGroupEnd.duration;
      
      // If blocks are contiguous (within 5 minutes), merge them
      if (block.start - previousEnd <= 5) {
        currentGroupEnd = block;
      } else {
        // Save the current group and start a new one
        const startTime = minutesToTimeString(currentGroupStart.start);
        const endTime = minutesToTimeString(currentGroupEnd.start + currentGroupEnd.duration);
        timeRanges.push(`${startTime}-${endTime}`);
        
        currentGroupStart = block;
        currentGroupEnd = block;
      }
    }
    
    // Add the last group
    const startTime = minutesToTimeString(currentGroupStart.start);
    const endTime = minutesToTimeString(currentGroupEnd.start + currentGroupEnd.duration);
    timeRanges.push(`${startTime}-${endTime}`);
    
    return timeRanges.join(', ');
  }

  /**
   * Render summary mode (compact)
   */
  private renderSummaryMode(
    schedule: WeekSchedule, 
    title: string, 
    assignments?: LessonAssignment[]
  ): string {
    const lines: string[] = [];
    lines.push(TextColors.header(title));
    lines.push('');

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const daySchedule = schedule.days[dayIndex];
      const dayName = dayNames[dayIndex]!.padEnd(9);
      
      if (!daySchedule || daySchedule.blocks.length === 0) {
        lines.push(TextColors.muted(`${dayName} [Unavailable]`));
        continue;
      }

      const dayAssignments = assignments?.filter(a => a.dayOfWeek === dayIndex) || [];
      const timeRange = this.getTimeRangeSummary(daySchedule.blocks);
      const assignmentCount = dayAssignments.length;
      
      let status = TextColors.available(`Available ${timeRange || ''}`);
      if (assignmentCount > 0) {
        status = TextColors.scheduled(`${assignmentCount} lesson${assignmentCount > 1 ? 's' : ''} scheduled`);
      }

      lines.push(`${TextColors.info(dayName)} ${status}`);
    }

    return lines.join('\n');
  }
}

/**
 * Display student schedules with color coding
 */
export class StudentSchedulesDisplay {
  constructor(private options: DisplayOptions = {}) {}

  /**
   * Render all student schedules
   */
  renderStudentSchedules(students: StudentConfig[]): string {
    const lines: string[] = [];
    
    lines.push(TextColors.header(`${StatusIndicators.student} STUDENT SCHEDULES (${students.length} students)`));
    lines.push('');

    for (const student of students) {
      lines.push(this.renderSingleStudent(student));
      lines.push('');
    }

    if (this.options.showLegend) {
      lines.push(this.renderStudentLegend(students));
    }

    return lines.join('\n');
  }

  /**
   * Render a single student's schedule
   */
  private renderSingleStudent(student: StudentConfig): string {
    const studentColor = getStudentColor(student.person.id);
    const title = `${student.person.name} (${formatDuration(student.preferredDuration)} lessons)`;
    
    const display = new WeekScheduleDisplay({
      ...this.options,
      showTimeRuler: true,
      mode: 'detailed'
    });
    
    const scheduleOutput = display.renderWeekSchedule(student.availability, '', []);
    const scheduleLines = scheduleOutput.split('\n');
    
    // Filter out empty lines and header lines, keep only the day schedule lines and time ruler
    const contentLines = scheduleLines.filter(line => {
      const trimmed = line.trim();
      // Include lines that contain vertical bars (day schedules) or have numbers (time ruler)
      const hasVerticalBar = trimmed.includes('│');
      const isTimeRuler = /^\s*\d+/.test(trimmed) || trimmed.includes('  ') && /\d/.test(trimmed);
      
      return trimmed.length > 0 && 
             (hasVerticalBar || isTimeRuler) && 
             !trimmed.startsWith('Week Schedule') &&
             !trimmed.startsWith('TEACHER SCHEDULE');
    });
    
    // Color the student's blocks
    const coloredLines = contentLines.map(line => {
      if (line.includes('█')) {
        return line.replace(/█/g, studentColor('█'));
      }
      return line;
    });

    // Add empty lines at start and end for proper spacing
    const finalLines = ['', '', ...coloredLines, ''];

    return createBox(finalLines, studentColor(title));
  }

  /**
   * Render legend for student colors
   */
  private renderStudentLegend(students: StudentConfig[]): string {
    const lines: string[] = [];
    lines.push(TextColors.header('Legend:'));
    
    for (const student of students) {
      const color = getStudentColor(student.person.id);
      lines.push(`${color('█')} ${student.person.name}`);
    }
    
    return lines.join('\n');
  }
}

/**
 * Display solution results
 */
export class SolutionDisplay {
  /**
   * Render solution with assignments and unscheduled students
   */
  renderSolution(
    solution: ScheduleSolution, 
    students: StudentConfig[],
    teacher: TeacherConfig
  ): string {
    const lines: string[] = [];
    
    // Header
    const successRate = solution.metadata.scheduledStudents / solution.metadata.totalStudents;
    const status = successRate === 1.0 ? 
      StatusIndicators.success : 
      successRate > 0.5 ? StatusIndicators.warning : StatusIndicators.failure;
    
    lines.push(TextColors.header(`${StatusIndicators.solution} SOLUTION`));
    lines.push(`${status} ${solution.metadata.scheduledStudents}/${solution.metadata.totalStudents} students scheduled`);
    lines.push('');

    if (solution.assignments.length > 0) {
      lines.push(this.renderAssignments(solution.assignments, students));
      lines.push('');
    }

    if (solution.unscheduled.length > 0) {
      lines.push(this.renderUnscheduled(solution.unscheduled, students));
      lines.push('');
    }

    // Performance metrics
    lines.push(this.renderMetrics(solution));

    return lines.join('\n');
  }

  /**
   * Render successful assignments
   */
  private renderAssignments(assignments: LessonAssignment[], students: StudentConfig[]): string {
    const table = new Table({
      head: ['Student', 'Day', 'Time', 'Duration'],
      style: { head: ['cyan'] }
    });

    const sortedAssignments = [...assignments].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startMinute - b.startMinute;
    });

    for (const assignment of sortedAssignments) {
      const student = students.find(s => s.person.id === assignment.studentId);
      const studentName = student?.person.name || assignment.studentId;
      const dayName = dayNames[assignment.dayOfWeek]!;
      const startTime = minutesToTimeString(assignment.startMinute);
      const endTime = minutesToTimeString(assignment.startMinute + assignment.durationMinutes);
      const duration = formatDuration(assignment.durationMinutes);
      
      const studentColor = getStudentColor(assignment.studentId);
      
      table.push([
        studentColor(studentName),
        dayName,
        `${startTime}-${endTime}`,
        duration
      ]);
    }

    return `${StatusIndicators.success} ${TextColors.success('Scheduled Lessons')}\n${table.toString()}`;
  }

  /**
   * Render unscheduled students
   */
  private renderUnscheduled(unscheduledIds: string[], students: StudentConfig[]): string {
    const lines: string[] = [];
    lines.push(`${StatusIndicators.failure} ${TextColors.error('Unscheduled Students')}`);
    
    for (const studentId of unscheduledIds) {
      const student = students.find(s => s.person.id === studentId);
      const name = student?.person.name || studentId;
      lines.push(`  ${TextColors.error('•')} ${name}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Render performance metrics
   */
  private renderMetrics(solution: ScheduleSolution): string {
    const lines: string[] = [];
    lines.push(TextColors.header('Performance Metrics:'));
    lines.push(`  Solve time: ${solution.metadata.computeTimeMs}ms`);
    lines.push(`  Utilization: ${(solution.metadata.averageUtilization * 100).toFixed(1)}%`);
    
    return lines.join('\n');
  }
}

/**
 * Comparison display for expected vs actual results
 */
export class ComparisonDisplay {
  /**
   * Render side-by-side comparison
   */
  renderComparison(
    expected: ScheduleSolution | null,
    actual: ScheduleSolution | null,
    students: StudentConfig[],
    teacher: TeacherConfig
  ): string {
    const lines: string[] = [];
    const terminalWidth = getTerminalWidth();
    const columnWidth = Math.floor((terminalWidth - 6) / 2);

    lines.push(TextColors.header('COMPARISON: Expected vs Actual'));
    lines.push('');

    // Headers
    const expectedHeader = padString(chalk.cyan('EXPECTED'), columnWidth, 'center');
    const actualHeader = padString(chalk.yellow('ACTUAL'), columnWidth, 'center');
    lines.push(`${expectedHeader} ${BoxChars.vertical} ${actualHeader}`);
    lines.push(`${BoxChars.horizontal.repeat(columnWidth)} ${BoxChars.cross} ${BoxChars.horizontal.repeat(columnWidth)}`);

    // Content
    const expectedLines = expected ? 
      this.formatSolutionForComparison(expected, students, columnWidth) :
      ['No expected solution provided'];
    
    const actualLines = actual ?
      this.formatSolutionForComparison(actual, students, columnWidth) :
      ['❌ FAILED - No solution found'];

    const maxLines = Math.max(expectedLines.length, actualLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const expectedLine = padString(expectedLines[i] || '', columnWidth);
      const actualLine = padString(actualLines[i] || '', columnWidth);
      lines.push(`${expectedLine} ${BoxChars.vertical} ${actualLine}`);
    }

    return lines.join('\n');
  }

  /**
   * Format solution for comparison display
   */
  private formatSolutionForComparison(
    solution: ScheduleSolution, 
    students: StudentConfig[], 
    width: number
  ): string[] {
    const lines: string[] = [];
    
    lines.push(`✅ ${solution.metadata.scheduledStudents}/${solution.metadata.totalStudents} scheduled`);
    lines.push(`⏱️ ${solution.metadata.computeTimeMs}ms`);
    lines.push('');

    // Assignments
    for (const assignment of solution.assignments.slice(0, 5)) { // Limit for space
      const student = students.find(s => s.person.id === assignment.studentId);
      const name = truncateText(student?.person.name || assignment.studentId, 12);
      const day = dayNames[assignment.dayOfWeek]!.slice(0, 3);
      const time = minutesToTimeString(assignment.startMinute);
      lines.push(`${name} ${day} ${time}`);
    }

    if (solution.assignments.length > 5) {
      lines.push(`... +${solution.assignments.length - 5} more`);
    }

    return lines.map(line => truncateText(line, width - 2));
  }
}