/**
 * Utility functions for the CLI schedule visualizer
 */

import chalk from 'chalk';
import type { TimeBlock, WeekSchedule, DaySchedule } from '../types';
import { minutesToTimeString, timeBlockToString, dayNames } from '../display-utils';

/**
 * Terminal width detection for responsive layout
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Box drawing characters for consistent UI
 */
export const BoxChars = {
  // Corners
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  
  // Lines
  horizontal: '─',
  vertical: '│',
  
  // Intersections
  cross: '┼',
  teeUp: '┴',
  teeDown: '┬',
  teeLeft: '┤',
  teeRight: '├',
  
  // Double lines for headers
  doubleHorizontal: '═',
  doubleVertical: '║',
  doubleTopLeft: '╔',
  doubleTopRight: '╗',
  doubleBottomLeft: '╚',
  doubleBottomRight: '╝',
  doubleTeeDown: '╦',
  doubleTeeUp: '╩',
  doubleTeeRight: '╠',
  doubleTeeLeft: '╣'
} as const;

/**
 * Color palette for different schedule elements
 */
export const Colors = {
  // Schedule blocks
  available: chalk.green('█'),
  busy: chalk.gray('░'),
  scheduled: chalk.blue('█'),
  conflict: chalk.red('█'),
  
  // Text colors
  header: chalk.bold.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  
  // Student colors (consistent across sessions)
  studentColors: [
    chalk.blue,
    chalk.green,
    chalk.yellow,
    chalk.magenta,
    chalk.cyan,
    chalk.red,
    chalk.white,
    chalk.gray
  ]
} as const;

// Text color functions for use in display
export const TextColors = {
  available: chalk.green,
  busy: chalk.gray,
  scheduled: chalk.blue,
  conflict: chalk.red,
  header: chalk.bold.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray
} as const;

/**
 * Get consistent color for a student ID
 */
export function getStudentColor(studentId: string): typeof chalk {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % Colors.studentColors.length;
  return Colors.studentColors[colorIndex]!;
}

/**
 * Create a horizontal line with specified width and character
 */
export function createLine(width: number, char: string = BoxChars.horizontal): string {
  return char.repeat(width);
}

/**
 * Create a bordered box with content
 */
export function createBox(content: string[], title?: string, width?: number): string {
  const terminalWidth = getTerminalWidth();
  const boxWidth = width || Math.min(terminalWidth - 4, 80);
  const contentWidth = boxWidth - 2; // Account for borders
  
  const lines: string[] = [];
  
  // Top border
  if (title) {
    const titleDisplayLength = stripAnsi(title).length;
    const titlePadding = Math.max(0, contentWidth - titleDisplayLength - 2);
    const leftPad = Math.floor(titlePadding / 2);
    const rightPad = titlePadding - leftPad;
    lines.push(
      BoxChars.topLeft + 
      BoxChars.horizontal.repeat(leftPad) + 
      ` ${title} ` + 
      BoxChars.horizontal.repeat(rightPad) + 
      BoxChars.topRight
    );
  } else {
    lines.push(
      BoxChars.topLeft + 
      BoxChars.horizontal.repeat(contentWidth) + 
      BoxChars.topRight
    );
  }
  
  // Content lines
  for (const line of content) {
    const displayLength = stripAnsi(line).length;
    let processedLine = line;
    
    // Truncate if too long
    if (displayLength > contentWidth) {
      processedLine = truncateText(line, contentWidth);
    }
    
    // Calculate padding based on actual display length
    const actualDisplayLength = stripAnsi(processedLine).length;
    const padding = ' '.repeat(Math.max(0, contentWidth - actualDisplayLength));
    lines.push(BoxChars.vertical + processedLine + padding + BoxChars.vertical);
  }
  
  // Bottom border
  lines.push(
    BoxChars.bottomLeft + 
    BoxChars.horizontal.repeat(contentWidth) + 
    BoxChars.bottomRight
  );
  
  return lines.join('\n');
}

/**
 * Strip ANSI escape codes to get actual string length
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Pad string to specified width, accounting for ANSI codes
 */
export function padString(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const displayLength = stripAnsi(text).length;
  const padding = Math.max(0, width - displayLength);
  
  switch (align) {
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    case 'right':
      return ' '.repeat(padding) + text;
    default:
      return text + ' '.repeat(padding);
  }
}

/**
 * Convert minutes to visual blocks for schedule display
 * @param startMinute Start time in minutes from day start
 * @param duration Duration in minutes
 * @param granularity Minutes per visual block (default: 15)
 * @param totalBlocks Total number of visual blocks for the display
 * @param displayStartHour Start hour of the display window (default: 0)
 */
export function minutesToBlocks(
  startMinute: number, 
  duration: number, 
  granularity: number = 15,
  totalBlocks: number = 48, // Display window blocks (e.g., 16 hours * 3 blocks/hour)
  displayStartHour: number = 0 // Start hour of display window
): { startBlock: number; blockCount: number } {
  // Adjust start time to be relative to display window
  const displayStartMinute = displayStartHour * 60;
  const relativeStartMinute = startMinute - displayStartMinute;
  const relativeEndMinute = relativeStartMinute + duration;
  
  // Calculate blocks relative to display window
  // Each block represents granularity minutes, so we need to divide by granularity
  const startBlock = Math.floor(relativeStartMinute / granularity);
  const endBlock = Math.ceil(relativeEndMinute / granularity);
  const blockCount = Math.max(1, endBlock - startBlock);
  
  // Ensure we stay within bounds
  const clampedStartBlock = Math.max(0, Math.min(startBlock, totalBlocks - 1));
  const maxBlockCount = totalBlocks - clampedStartBlock;
  const clampedBlockCount = Math.max(1, Math.min(blockCount, maxBlockCount));
  
  return {
    startBlock: clampedStartBlock,
    blockCount: clampedBlockCount
  };
}

/**
 * Create a visual time ruler for schedule displays
 */
export function createTimeRuler(
  startHour: number = 6, 
  endHour: number = 22, 
  width: number = 48,
  showLabels: boolean = true,
  granularity: number = 15
): string {
  if (!showLabels) {
    return ' '.repeat(width);
  }
  
  // Create a character array for precise positioning
  const ruler = new Array(width).fill(' ');
  
  // Calculate blocks per hour based on granularity
  const blocksPerHour = 60 / granularity;
  
  // Place hour markers using the same block-based calculation as renderTimeBlocks
  for (let hour = startHour; hour <= endHour; hour++) {
    const hourStartMinute = hour * 60;
    const { startBlock } = minutesToBlocks(
      hourStartMinute, 
      0, // duration doesn't matter for position calculation
      granularity, 
      width,
      startHour
    );
    
    // Format hour as single digit for hours < 10, double digit for >= 10
    const timeStr = hour.toString().padStart(2, ' ');
    
    // Place hour marker if it fits within the ruler
    if (startBlock >= 0 && startBlock + timeStr.length <= width) {
      for (let i = 0; i < timeStr.length && startBlock + i < width; i++) {
        ruler[startBlock + i] = timeStr[i];
      }
    }
  }
  
  return ruler.join('');
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Create status indicators
 */
export const StatusIndicators = {
  success: chalk.green('✅'),
  failure: chalk.red('❌'),
  warning: chalk.yellow('⚠️'),
  info: chalk.blue('ℹ️'),
  student: chalk.blue('📚'),
  teacher: chalk.yellow('👨‍🏫'),
  solution: chalk.green('🎯'),
  expected: chalk.cyan('📋')
} as const;

/**
 * Truncate text to fit width with ellipsis
 */
export function truncateText(text: string, maxWidth: number): string {
  const displayLength = stripAnsi(text).length;
  if (displayLength <= maxWidth) {
    return text;
  }
  
  // Account for ANSI codes when truncating
  let truncated = '';
  let visibleLength = 0;
  let inAnsiCode = false;
  
  for (let i = 0; i < text.length && visibleLength < maxWidth - 3; i++) {
    const char = text[i];
    if (char === '\u001b') {
      inAnsiCode = true;
    }
    
    truncated += char;
    
    if (!inAnsiCode) {
      visibleLength++;
    }
    
    if (inAnsiCode && char === 'm') {
      inAnsiCode = false;
    }
  }
  
  return truncated + '...';
}

/**
 * Convert TimeBlock array to visual schedule string
 */
export function renderTimeBlocks(
  blocks: TimeBlock[],
  dayWidth: number = 48,
  granularity: number = 15,
  emptyChar: string = '░',
  filledChar: string = '█',
  displayStartHour: number = 0
): string {
  const schedule = new Array(dayWidth).fill(emptyChar);
  
  for (const block of blocks) {
    const { startBlock, blockCount } = minutesToBlocks(
      block.start, 
      block.duration, 
      granularity, 
      dayWidth,
      displayStartHour
    );
    
    for (let i = 0; i < blockCount && startBlock + i < dayWidth; i++) {
      schedule[startBlock + i] = filledChar;
    }
  }
  
  return schedule.join('');
}