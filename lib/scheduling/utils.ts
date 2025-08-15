import type {
  TimeBlock,
  DaySchedule,
  WeekSchedule,
  ScheduleMetadata,
  ScheduleSolution,
  LessonAssignment,
  CalendarError,
  ValidationError
} from './types';

/**
 * Time conversion utilities for converting between different time representations
 */

/**
 * Converts a time string in HH:MM format to minutes from day start
 * @param time - Time string in "HH:MM" format (24-hour)
 * @returns Minutes from midnight (0-1439)
 * @throws Error if time format is invalid
 * 
 * @example
 * timeStringToMinutes("09:30") // returns 570
 * timeStringToMinutes("14:30") // returns 870
 */
export function timeStringToMinutes(time: string): number {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/;
  const match = timeRegex.exec(time);
  
  if (!match) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM format.`);
  }
  
  const hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${time}`);
  }
  
  return hours * 60 + minutes;
}

/**
 * Converts minutes from day start to HH:MM time string
 * @param minutes - Minutes from midnight (0-1439)
 * @returns Time string in "HH:MM" format
 * @throws Error if minutes are out of valid range
 * 
 * @example
 * minutesToTimeString(570) // returns "09:30"
 * minutesToTimeString(870) // returns "14:30"
 */
export function minutesToTimeString(minutes: number): string {
  if (minutes < 0 || minutes >= 1440) {
    throw new Error(`Invalid minutes: ${minutes}. Must be between 0 and 1439.`);
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Converts a TimeBlock to a readable time range string
 * @param block - TimeBlock to convert
 * @returns Array of [start, end] time strings
 * 
 * @example
 * blockToTimeRange({start: 570, duration: 90}) // returns ["09:30", "11:00"]
 */
export function blockToTimeRange(block: TimeBlock): [string, string] {
  const startTime = minutesToTimeString(block.start);
  const endTime = minutesToTimeString(block.start + block.duration);
  return [startTime, endTime];
}

/**
 * Schedule operations for manipulating and analyzing time blocks
 */

/**
 * Merges overlapping or adjacent TimeBlocks into consolidated blocks
 * @param blocks - Array of TimeBlocks to merge (does not need to be sorted)
 * @returns Array of merged TimeBlocks sorted by start time
 * 
 * @example
 * mergeTimeBlocks([
 *   {start: 60, duration: 30},   // 01:00-01:30
 *   {start: 90, duration: 30},   // 01:30-02:00
 *   {start: 180, duration: 60}   // 03:00-04:00
 * ]) // returns [{start: 60, duration: 60}, {start: 180, duration: 60}]
 */
export function mergeTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length === 0) return [];
  
  // Sort blocks by start time
  const sorted = blocks
    .filter(block => validateTimeBlock(block))
    .sort((a, b) => a.start - b.start);
  
  if (sorted.length === 0) return [];
  
  const merged: TimeBlock[] = [];
  let current: TimeBlock = { ...sorted[0]! };
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    const currentEnd = current.start + current.duration;
    
    // Check if blocks overlap or are adjacent
    if (next.start <= currentEnd) {
      // Merge blocks
      const nextEnd = next.start + next.duration;
      current.duration = Math.max(currentEnd, nextEnd) - current.start;
    } else {
      // No overlap, add current and move to next
      merged.push(current);
      current = { ...next };
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * Finds all available time slots of a specific duration within a day schedule
 * @param schedule - DaySchedule to search in
 * @param duration - Required duration in minutes
 * @returns Array of TimeBlocks representing available slots
 * 
 * @example
 * findAvailableSlots({
 *   dayOfWeek: 1,
 *   blocks: [{start: 540, duration: 120}] // 09:00-11:00
 * }, 60) // returns possible 60-minute slots within the available time
 */
export function findAvailableSlots(schedule: DaySchedule, duration: number): TimeBlock[] {
  if (!schedule.blocks || schedule.blocks.length === 0) {
    return [];
  }
  
  const availableSlots: TimeBlock[] = [];
  const merged = mergeTimeBlocks(schedule.blocks);
  
  for (const block of merged) {
    // Generate all possible slots within this block
    const maxSlots = Math.floor(block.duration / duration);
    
    for (let i = 0; i < maxSlots; i++) {
      const slotStart = block.start + (i * duration);
      availableSlots.push({
        start: slotStart,
        duration: duration
      });
    }
  }
  
  return availableSlots;
}

/**
 * Checks if a specific time slot is available in a day schedule
 * @param schedule - DaySchedule to check against
 * @param start - Start time in minutes from day start
 * @param duration - Duration in minutes
 * @returns True if the time slot is completely available
 */
export function isTimeAvailable(schedule: DaySchedule, start: number, duration: number): boolean {
  if (!schedule.blocks || schedule.blocks.length === 0) {
    return false;
  }
  
  const requestedEnd = start + duration;
  const merged = mergeTimeBlocks(schedule.blocks);
  
  // Check if the requested time falls within any available block
  for (const block of merged) {
    const blockEnd = block.start + block.duration;
    
    if (block.start <= start && requestedEnd <= blockEnd) {
      return true;
    }
  }
  
  return false;
}

/**
 * Computes metadata for a day schedule including utilization metrics
 * @param schedule - DaySchedule to analyze
 * @returns ScheduleMetadata with computed statistics
 */
export function computeScheduleMetadata(schedule: DaySchedule): ScheduleMetadata {
  if (!schedule.blocks || schedule.blocks.length === 0) {
    return {
      totalAvailable: 0,
      largestBlock: 0,
      fragmentationScore: 0
    };
  }
  
  const merged = mergeTimeBlocks(schedule.blocks);
  const totalAvailable = merged.reduce((sum, block) => sum + block.duration, 0);
  const largestBlock = Math.max(...merged.map(block => block.duration));
  
  // Fragmentation score: ratio of number of blocks to ideal (1 block)
  // Lower is better (0 = single block, higher = more fragmented)
  const fragmentationScore = merged.length > 1 ? (merged.length - 1) / merged.length : 0;
  
  return {
    totalAvailable,
    largestBlock,
    fragmentationScore
  };
}

/**
 * Validation functions for ensuring data integrity
 */

/**
 * Validates that a TimeBlock has valid values
 * @param block - TimeBlock to validate
 * @returns True if block is valid
 */
export function validateTimeBlock(block: TimeBlock): boolean {
  if (!block || typeof block !== 'object') {
    return false;
  }
  
  const { start, duration } = block;
  
  // Check if values are numbers
  if (typeof start !== 'number' || typeof duration !== 'number') {
    return false;
  }
  
  // Check if values are within valid ranges
  if (start < 0 || start >= 1440) {
    return false; // Start must be within a day (0-1439)
  }
  
  if (duration <= 0) {
    return false; // Duration must be positive
  }
  
  if (start + duration > 1440) {
    return false; // Block cannot extend beyond end of day
  }
  
  return true;
}

/**
 * Validates that a WeekSchedule has valid structure and data
 * @param schedule - WeekSchedule to validate
 * @returns True if schedule is valid
 */
export function validateWeekSchedule(schedule: WeekSchedule): boolean {
  if (!schedule || typeof schedule !== 'object') {
    return false;
  }
  
  if (!Array.isArray(schedule.days) || schedule.days.length !== 7) {
    return false;
  }
  
  if (!schedule.timezone || typeof schedule.timezone !== 'string') {
    return false;
  }
  
  // Validate each day
  for (let i = 0; i < 7; i++) {
    const day = schedule.days[i];
    
    if (!day || typeof day !== 'object') {
      return false;
    }
    
    if (day.dayOfWeek !== i) {
      return false;
    }
    
    if (!Array.isArray(day.blocks)) {
      return false;
    }
    
    // Validate all time blocks in the day
    for (const block of day.blocks) {
      if (!validateTimeBlock(block)) {
        return false;
      }
    }
    
    // Check for overlaps in the day
    if (detectOverlaps(day.blocks).length > 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Detects overlapping TimeBlocks in an array
 * @param blocks - Array of TimeBlocks to check
 * @returns Array of overlapping TimeBlocks
 */
export function detectOverlaps(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length < 2) {
    return [];
  }
  
  const sorted = blocks
    .filter(validateTimeBlock)
    .sort((a, b) => a.start - b.start);
  
  const overlaps: TimeBlock[] = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    const currentEnd = current.start + current.duration;
    
    if (currentEnd > next.start) {
      // Overlap detected
      if (!overlaps.includes(current)) {
        overlaps.push(current);
      }
      if (!overlaps.includes(next)) {
        overlaps.push(next);
      }
    }
  }
  
  return overlaps;
}

/**
 * Database operations (placeholder implementations for Phase 1.3)
 * These will be implemented with proper database integration in later phases
 */

/**
 * Saves a week schedule to the database
 * @param schedule - WeekSchedule to save
 * @param ownerId - ID of the schedule owner (teacher or student)
 * @throws Error if save operation fails
 */
export function saveSchedule(schedule: WeekSchedule, ownerId: string): Promise<void> {
  if (!validateWeekSchedule(schedule)) {
    throw new Error('Invalid schedule data');
  }
  
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('Invalid owner ID');
  }
  
  // TODO: Implement database save operation using Drizzle ORM
  // This will connect to the new scheduling tables once Phase 1.2 is complete
  console.log(`Saving schedule for owner ${ownerId}:`, schedule);
  
  // Placeholder - would normally:
  // 1. Connect to database using drizzle client
  // 2. Update/insert teacher or student record with new availability
  // 3. Handle transactions and error cases
  // 4. Return success/failure status
  return Promise.resolve();
}

/**
 * Loads a week schedule from the database
 * @param ownerId - ID of the schedule owner
 * @returns Promise resolving to WeekSchedule
 * @throws Error if load operation fails or schedule not found
 */
export function loadSchedule(ownerId: string): Promise<WeekSchedule> {
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('Invalid owner ID');
  }
  
  // TODO: Implement database load operation using Drizzle ORM
  console.log(`Loading schedule for owner ${ownerId}`);
  
  // Placeholder return - would normally:
  // 1. Query database for teacher/student record
  // 2. Parse JSON availability field into WeekSchedule
  // 3. Validate loaded data
  // 4. Return schedule or throw if not found
  
  const emptySchedule: WeekSchedule = {
    days: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      blocks: []
    })),
    timezone: 'UTC'
  };
  
  return Promise.resolve(emptySchedule);
}

/**
 * Saves lesson assignments to the database
 * @param solution - ScheduleSolution containing assignments
 * @throws Error if save operation fails
 */
export function saveAssignments(solution: ScheduleSolution): Promise<void> {
  if (!solution || !Array.isArray(solution.assignments)) {
    throw new Error('Invalid solution data');
  }
  
  // Validate all assignments
  for (const assignment of solution.assignments) {
    if (!validateAssignment(assignment)) {
      throw new Error(`Invalid assignment: ${JSON.stringify(assignment)}`);
    }
  }
  
  // TODO: Implement database save operation using Drizzle ORM
  console.log(`Saving ${solution.assignments.length} lesson assignments`);
  
  // Placeholder - would normally:
  // 1. Begin database transaction
  // 2. Clear existing assignments for the studio
  // 3. Insert new assignments
  // 4. Update student status
  // 5. Commit transaction
  return Promise.resolve();
}

/**
 * Helper function to validate a single lesson assignment
 * @param assignment - LessonAssignment to validate
 * @returns True if assignment is valid
 */
function validateAssignment(assignment: LessonAssignment): boolean {
  if (!assignment || typeof assignment !== 'object') {
    return false;
  }
  
  const { studentId, dayOfWeek, startMinute, durationMinutes } = assignment;
  
  if (!studentId || typeof studentId !== 'string') {
    return false;
  }
  
  if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
    return false;
  }
  
  if (typeof startMinute !== 'number' || startMinute < 0 || startMinute >= 1440) {
    return false;
  }
  
  if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    return false;
  }
  
  if (startMinute + durationMinutes > 1440) {
    return false; // Assignment cannot extend beyond end of day
  }
  
  return true;
}

/**
 * Utility functions for common schedule operations
 */

/**
 * Creates an empty week schedule with proper structure
 * @param timezone - Timezone for the schedule (defaults to 'UTC')
 * @returns Empty WeekSchedule
 */
export function createEmptyWeekSchedule(timezone = 'UTC'): WeekSchedule {
  return {
    days: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      blocks: []
    })),
    timezone
  };
}

/**
 * Clones a week schedule (deep copy)
 * @param schedule - WeekSchedule to clone
 * @returns Deep copy of the schedule
 */
export function cloneWeekSchedule(schedule: WeekSchedule): WeekSchedule {
  return {
    ...schedule,
    days: schedule.days.map(day => ({
      ...day,
      blocks: day.blocks.map(block => ({ ...block })),
      metadata: day.metadata ? { ...day.metadata } : undefined
    }))
  };
}

/**
 * Gets the total available minutes across all days in a week schedule
 * @param schedule - WeekSchedule to analyze
 * @returns Total available minutes in the week
 */
export function getTotalAvailableMinutes(schedule: WeekSchedule): number {
  return schedule.days.reduce((total, day) => {
    const dayTotal = day.blocks.reduce((daySum, block) => daySum + block.duration, 0);
    return total + dayTotal;
  }, 0);
}

/**
 * Converts minutes to a human-readable duration string
 * @param minutes - Duration in minutes
 * @returns Human-readable string (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Constants and utilities for calendar display
 */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Gets the display name for a day of the week
 * @param dayOfWeek - Day number (0 = Sunday, 1 = Monday, etc.)
 * @param short - Whether to return short name
 * @returns Day name string
 */
export function getDayName(dayOfWeek: number, short = false): string {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Invalid day of week: ${dayOfWeek}`);
  }
  return short ? WEEKDAY_SHORT[dayOfWeek]! : WEEKDAY_NAMES[dayOfWeek]!;
}

/**
 * Converts minutes to display time string with AM/PM
 * @param minutes - Minutes from midnight
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export function minutesToDisplayTime(minutes: number): string {
  if (minutes < 0 || minutes >= 1440) {
    throw new Error(`Invalid minutes: ${minutes}`);
  }
  
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const minStr = mins.toString().padStart(2, '0');
  
  return `${hours12}:${minStr} ${ampm}`;
}

/**
 * Generates an array of time slot minutes for a given range and granularity
 * @param minTime - Start time string (e.g., "07:00")
 * @param maxTime - End time string (e.g., "22:00")  
 * @param granularity - Minutes between slots
 * @returns Array of minute values
 */
export function generateTimeSlots(minTime: string, maxTime: string, granularity: number): number[] {
  const startMinutes = timeStringToMinutes(minTime);
  const endMinutes = timeStringToMinutes(maxTime);
  const slots: number[] = [];
  
  for (let minute = startMinutes; minute < endMinutes; minute += granularity) {
    slots.push(minute);
  }
  
  return slots;
}

/**
 * Enhanced validation function that returns detailed error information
 * @param schedule - WeekSchedule to validate
 * @returns CalendarError object with validation results
 */
export function validateWeekScheduleDetailed(schedule: WeekSchedule): CalendarError {
  const errors: ValidationError[] = [];
  
  if (!schedule || typeof schedule !== 'object') {
    errors.push({
      type: 'constraint',
      message: 'Invalid schedule object'
    });
    return { errors, isValid: false };
  }
  
  if (!Array.isArray(schedule.days) || schedule.days.length !== 7) {
    errors.push({
      type: 'constraint',
      message: 'Schedule must have exactly 7 days'
    });
    return { errors, isValid: false };
  }
  
  if (!schedule.timezone || typeof schedule.timezone !== 'string') {
    errors.push({
      type: 'constraint',
      message: 'Invalid timezone'
    });
  }
  
  // Validate each day
  for (let i = 0; i < 7; i++) {
    const day = schedule.days[i];
    
    if (!day || typeof day !== 'object') {
      errors.push({
        type: 'constraint',
        message: `Invalid day object for ${getDayName(i)}`
      });
      continue;
    }
    
    if (day.dayOfWeek !== i) {
      errors.push({
        type: 'constraint',
        message: `Day of week mismatch for ${getDayName(i)}`
      });
    }
    
    if (!Array.isArray(day.blocks)) {
      errors.push({
        type: 'constraint',
        message: `Invalid blocks array for ${getDayName(i)}`
      });
      continue;
    }
    
    // Validate all time blocks in the day
    for (let j = 0; j < day.blocks.length; j++) {
      const block = day.blocks[j]!;
      
      if (!validateTimeBlock(block)) {
        errors.push({
          type: 'time_range',
          message: `Invalid time block in ${getDayName(i)}: ${block.start}-${block.start + block.duration}`,
          blockIndex: j
        });
      }
    }
    
    // Check for overlaps in the day
    const overlaps = detectOverlaps(day.blocks);
    if (overlaps.length > 0) {
      errors.push({
        type: 'overlap',
        message: `Overlapping time blocks found in ${getDayName(i)}`,
        blockIndex: undefined
      });
    }
  }
  
  return {
    errors,
    isValid: errors.length === 0
  };
}


/**
 * Converts legacy Schedule format to WeekSchedule
 * @param legacySchedule - Legacy schedule object
 * @returns WeekSchedule object
 */
export function legacyScheduleToWeekSchedule(legacySchedule: Record<string, unknown>): WeekSchedule {
  const weekSchedule = createEmptyWeekSchedule();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  dayNames.forEach((dayName, dayIndex) => {
    const dayBlocks = legacySchedule[dayName];
    if (dayBlocks && Array.isArray(dayBlocks)) {
      const daySchedule = weekSchedule.days[dayIndex];
      if (daySchedule) {
        daySchedule.blocks = dayBlocks.map((block: unknown) => {
          const blockData = block as Record<string, { hour: number; minute: number }>;
          return {
            start: blockData.start!.hour * 60 + blockData.start!.minute,
            duration: (blockData.end!.hour * 60 + blockData.end!.minute) - (blockData.start!.hour * 60 + blockData.start!.minute)
          };
        });
      }
    }
  });

  return weekSchedule;
}

/**
 * Formats a WeekSchedule for display in the UI
 * @param schedule - WeekSchedule to format
 * @returns Array of formatted strings for display
 */
export function formatWeekScheduleDisplay(schedule: WeekSchedule): string[] {
  const displayLines: string[] = [];
  
  schedule.days.forEach((day) => {
    if (day.blocks.length > 0) {
      const dayName = getDayName(day.dayOfWeek);
      displayLines.push(`${dayName}:`);
      
      day.blocks.forEach((block) => {
        const startTime = minutesToDisplayTime(block.start);
        const endTime = minutesToDisplayTime(block.start + block.duration);
        displayLines.push(`  ${startTime} - ${endTime}`);
      });
    }
  });
  
  if (displayLines.length === 0) {
    displayLines.push('No availability set');
  }
  
  return displayLines;
}

/**
 * Conversion utilities for backward compatibility with legacy boolean grid system
 */

/**
 * Converts a boolean grid (legacy format) to WeekSchedule format
 * @param buttons - Boolean grid [7 days][24 half-hour slots] where true = available
 * @param granularityMinutes - Minutes per slot (typically 30)
 * @param startHour - Starting hour (typically 9 for 9am)
 * @returns WeekSchedule with TimeBlocks for selected slots
 */
export function buttonsToWeekSchedule(
  buttons: boolean[][],
  granularityMinutes = 30,
  startHour = 9
): WeekSchedule {
  const weekSchedule = createEmptyWeekSchedule();
  
  // Process each day (0=Sunday, 1=Monday, etc.)
  buttons.forEach((dayButtons, dayIndex) => {
    const daySchedule = weekSchedule.days[dayIndex];
    if (!daySchedule) return;
    
    const blocks: TimeBlock[] = [];
    let currentBlock: TimeBlock | null = null;
    
    dayButtons.forEach((isSelected, slotIndex) => {
      const slotStartMinute = startHour * 60 + slotIndex * granularityMinutes;
      
      if (isSelected) {
        if (currentBlock === null) {
          // Start new block
          currentBlock = {
            start: slotStartMinute,
            duration: granularityMinutes
          };
        } else {
          // Extend current block
          currentBlock.duration += granularityMinutes;
        }
      } else if (currentBlock !== null) {
        // End current block
        blocks.push(currentBlock);
        currentBlock = null;
      }
    });
    
    // Don't forget the last block if it extends to the end
    if (currentBlock !== null) {
      blocks.push(currentBlock);
    }
    
    daySchedule.blocks = blocks;
  });
  
  return weekSchedule;
}

/**
 * Converts WeekSchedule format to boolean grid (legacy format)
 * @param schedule - WeekSchedule to convert
 * @param granularityMinutes - Minutes per slot (typically 30)
 * @param startHour - Starting hour (typically 9 for 9am)
 * @param endHour - Ending hour (typically 21 for 9pm)
 * @returns Boolean grid [7 days][slots] where true = available
 */
export function weekScheduleToButtons(
  schedule: WeekSchedule,
  granularityMinutes = 30,
  startHour = 9,
  endHour = 21
): boolean[][] {
  const slotsPerDay = (endHour - startHour) * 60 / granularityMinutes;
  
  return schedule.days.map(daySchedule => {
    const dayButtons: boolean[] = new Array(slotsPerDay).fill(false) as boolean[];
    
    daySchedule.blocks.forEach(block => {
      const blockStartSlot = Math.floor((block.start - startHour * 60) / granularityMinutes);
      const blockEndSlot = Math.floor((block.start + block.duration - startHour * 60) / granularityMinutes);
      
      // Mark slots as selected, ensuring we stay within bounds
      for (let slot = Math.max(0, blockStartSlot); slot < Math.min(slotsPerDay, blockEndSlot); slot++) {
        dayButtons[slot] = true;
      }
    });
    
    return dayButtons;
  });
}

/**
 * Converts WeekSchedule to legacy Schedule format for database storage
 * @param weekSchedule - WeekSchedule to convert
 * @returns Legacy Schedule object
 */
export function weekScheduleToLegacySchedule(weekSchedule: WeekSchedule): Record<string, Array<{ start: { hour: number; minute: number }; end: { hour: number; minute: number } }> | undefined> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const legacySchedule: Record<string, Array<{ start: { hour: number; minute: number }; end: { hour: number; minute: number } }> | undefined> = {};
  
  weekSchedule.days.forEach((daySchedule, dayIndex) => {
    const dayName = dayNames[dayIndex];
    if (!dayName) return;
    
    if (daySchedule.blocks.length === 0) {
      legacySchedule[dayName] = undefined;
      return;
    }
    
    legacySchedule[dayName] = daySchedule.blocks.map(block => {
      const startMinutes = block.start;
      const endMinutes = block.start + block.duration;
      
      return {
        start: {
          hour: Math.floor(startMinutes / 60),
          minute: startMinutes % 60
        },
        end: {
          hour: Math.floor(endMinutes / 60),
          minute: endMinutes % 60
        }
      };
    });
  });
  
  return legacySchedule;
}