// Utility functions for schedule display and visualization
import { type TimeBlock, type LessonAssignment, type WeekSchedule, type ScheduleSolution, type Person } from './types';

/**
 * Convert minutes from day start to display time string
 * @param minutes Minutes from day start (0-1439)
 * @returns Formatted time string like "2:30 PM"
 */
export const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${ampm}`;
};

/**
 * Convert time string to minutes from day start
 * @param timeString Time string like "14:30" or "2:30 PM"
 * @returns Minutes from day start
 */
export const timeStringToMinutes = (timeString: string): number => {
  const timeRegex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
  const match = timeRegex.exec(timeString);
  
  if (!match) throw new Error(`Invalid time format: ${timeString}`);
  
  let hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const period = match[3]?.toLowerCase();
  
  if (period) {
    // 12-hour format
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
  }
  
  return hours * 60 + minutes;
};

/**
 * Format a TimeBlock as a readable time range
 * @param block TimeBlock to format
 * @returns Formatted string like "9:00 AM - 10:30 AM"
 */
export const timeBlockToString = (block: TimeBlock): string => {
  const start = minutesToTimeString(block.start);
  const end = minutesToTimeString(block.start + block.duration);
  return `${start} - ${end}`;
};

/**
 * Check if two TimeBlocks overlap
 * @param block1 First time block
 * @param block2 Second time block
 * @returns True if blocks overlap
 */
export const timeBlocksOverlap = (block1: TimeBlock, block2: TimeBlock): boolean => {
  const block1End = block1.start + block1.duration;
  const block2End = block2.start + block2.duration;
  return block1.start < block2End && block2.start < block1End;
};

/**
 * Merge overlapping or adjacent TimeBlocks
 * @param blocks Array of TimeBlocks to merge
 * @returns Array of merged TimeBlocks
 */
export const mergeTimeBlocks = (blocks: TimeBlock[]): TimeBlock[] => {
  if (blocks.length === 0) return [];
  
  // Sort by start time
  const sortedBlocks = [...blocks].sort((a, b) => a.start - b.start);
  if (sortedBlocks.length === 0) return [];
  
  const merged: TimeBlock[] = [sortedBlocks[0]!];
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    const current = sortedBlocks[i];
    if (!current) continue;
    
    const lastMerged = merged[merged.length - 1];
    if (!lastMerged) continue;
    
    // Check if current block overlaps with or is adjacent to the last merged block
    if (current.start <= lastMerged.start + lastMerged.duration) {
      // Merge blocks
      const newEnd = Math.max(
        lastMerged.start + lastMerged.duration,
        current.start + current.duration
      );
      lastMerged.duration = newEnd - lastMerged.start;
    } else {
      // No overlap, add as new block
      merged.push(current);
    }
  }
  
  return merged;
};

/**
 * Find available time slots within a day schedule
 * @param dayBlocks Existing time blocks for the day
 * @param duration Required duration in minutes
 * @param dayStart Start of day in minutes (default: 0)
 * @param dayEnd End of day in minutes (default: 1439)
 * @returns Array of available TimeBlocks
 */
export const findAvailableSlots = (
  dayBlocks: TimeBlock[],
  duration: number,
  dayStart = 0,
  dayEnd = 1439
): TimeBlock[] => {
  if (duration <= 0) return [];
  
  const merged = mergeTimeBlocks(dayBlocks);
  const availableSlots: TimeBlock[] = [];
  
  let currentStart = dayStart;
  
  for (const block of merged) {
    // Check gap before this block
    const gapDuration = block.start - currentStart;
    if (gapDuration >= duration) {
      availableSlots.push({
        start: currentStart,
        duration: gapDuration
      });
    }
    currentStart = block.start + block.duration;
  }
  
  // Check gap after last block
  const finalGapDuration = dayEnd - currentStart;
  if (finalGapDuration >= duration) {
    availableSlots.push({
      start: currentStart,
      duration: finalGapDuration
    });
  }
  
  return availableSlots;
};

/**
 * Detect conflicts (overlapping assignments) in a list of lesson assignments
 * @param assignments Array of lesson assignments to check
 * @returns Array of conflict groups (each group contains conflicting assignments)
 */
export const detectConflicts = (assignments: LessonAssignment[]): LessonAssignment[][] => {
  const conflicts: LessonAssignment[][] = [];
  
  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a1 = assignments[i];
      const a2 = assignments[j];
      
      if (!a1 || !a2) continue;
      
      // Only check assignments on the same day
      if (a1.dayOfWeek === a2.dayOfWeek) {
        const a1End = a1.startMinute + a1.durationMinutes;
        const a2End = a2.startMinute + a2.durationMinutes;
        
        // Check for overlap
        if (a1.startMinute < a2End && a2.startMinute < a1End) {
          // Find existing conflict group that includes either assignment
          const existingConflict = conflicts.find(c => c.includes(a1) || c.includes(a2));
          
          if (existingConflict) {
            // Add both assignments to existing conflict group if not already present
            if (!existingConflict.includes(a1)) existingConflict.push(a1);
            if (!existingConflict.includes(a2)) existingConflict.push(a2);
          } else {
            // Create new conflict group
            conflicts.push([a1, a2]);
          }
        }
      }
    }
  }
  
  return conflicts;
};

/**
 * Calculate schedule utilization metrics
 * @param solution Schedule solution to analyze
 * @param teacherSchedule Teacher's availability
 * @returns Utilization metrics object
 */
export const calculateUtilization = (solution: ScheduleSolution, teacherSchedule: WeekSchedule) => {
  // Calculate total available teacher time
  const totalTeacherMinutes = teacherSchedule.days.reduce(
    (total, day) => total + day.blocks.reduce((dayTotal, block) => dayTotal + block.duration, 0),
    0
  );
  
  // Calculate total scheduled time
  const scheduledMinutes = solution.assignments.reduce(
    (total, assignment) => total + assignment.durationMinutes,
    0
  );
  
  // Calculate utilization rate
  const utilizationRate = totalTeacherMinutes > 0 ? (scheduledMinutes / totalTeacherMinutes) * 100 : 0;
  
  // Calculate fragmentation (gaps between lessons)
  const dayFragmentation = teacherSchedule.days.map(day => {
    const assignmentsForDay = solution.assignments.filter(a => a.dayOfWeek === day.dayOfWeek);
    if (assignmentsForDay.length < 2) return 0;
    
    // Sort assignments by start time
    const sortedAssignments = assignmentsForDay.sort((a, b) => a.startMinute - b.startMinute);
    
    let gaps = 0;
    for (let i = 0; i < sortedAssignments.length - 1; i++) {
      const current = sortedAssignments[i];
      const next = sortedAssignments[i + 1];
      
      if (!current || !next) continue;
      
      const currentEnd = current.startMinute + current.durationMinutes;
      const nextStart = next.startMinute;
      gaps += Math.max(0, nextStart - currentEnd);
    }
    
    return gaps;
  });
  
  const totalGaps = dayFragmentation.reduce((sum, gaps) => sum + gaps, 0);
  const avgFragmentation = dayFragmentation.length > 0 ? totalGaps / dayFragmentation.length : 0;
  
  // Count conflicts
  const conflictCount = detectConflicts(solution.assignments).length;
  
  return {
    utilizationRate,
    scheduledMinutes,
    totalTeacherMinutes,
    totalGaps,
    avgFragmentation,
    conflictCount,
    dayFragmentation
  };
};

/**
 * Generate ICS (iCalendar) format for schedule export
 * @param solution Schedule solution
 * @param students Student information
 * @param teacherName Teacher's name
 * @param timezone Timezone for events (default: local timezone)
 * @returns ICS content string
 */
export const generateICS = (
  solution: ScheduleSolution,
  students: Person[],
  teacherName: string,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): string => {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  };

  const escapeICSText = (text: string) => {
    return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cadenza//Cadenza//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${timezone}`
  ];

  solution.assignments.forEach((assignment, index) => {
    const student = students.find(s => s.id === assignment.studentId);
    const studentName = student?.name ?? `Student ${assignment.studentId}`;
    
    // Calculate next occurrence of this day of week
    const startDate = new Date();
    const dayDiff = (assignment.dayOfWeek - startDate.getDay() + 7) % 7;
    startDate.setDate(startDate.getDate() + dayDiff);
    startDate.setHours(Math.floor(assignment.startMinute / 60), assignment.startMinute % 60, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + assignment.durationMinutes);

    ics.push(
      'BEGIN:VEVENT',
      `UID:lesson-${assignment.studentId}-${index}@lesson-solver.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${escapeICSText(`Lesson with ${studentName}`)}`,
      `DESCRIPTION:${escapeICSText(`${assignment.durationMinutes} minute lesson with ${studentName}`)}`,
      `ORGANIZER:CN=${escapeICSText(teacherName)}:MAILTO:teacher@example.com`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
};

/**
 * Day names in order (Sunday = 0)
 */
export const dayNames = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

/**
 * Short day names in order (Sunday = 0)
 */
export const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Very short day names in order (Sunday = 0)  
 */
export const veryShortDayNames = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Workday names (Monday-Friday)
 */
export const workDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Check if a day index represents a weekend
 * @param dayIndex Day index (0 = Sunday, 6 = Saturday)
 * @returns True if weekend
 */
export const isWeekend = (dayIndex: number): boolean => {
  return dayIndex === 0 || dayIndex === 6;
};

/**
 * Get the current day of week index
 * @returns Current day index (0 = Sunday)
 */
export const getCurrentDayIndex = (): number => {
  return new Date().getDay();
};

/**
 * Format duration in minutes as human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted string like "1h 30m" or "45m"
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Get a color class name based on student ID (for consistent coloring)
 * @param studentId Student ID
 * @param type Type of color (bg, border, text)
 * @returns Tailwind color class
 */
export const getStudentColor = (studentId: string, type: 'bg' | 'border' | 'text' = 'bg'): string => {
  const colors = [
    'blue', 'green', 'purple', 'pink', 'indigo', 'yellow', 'red', 'gray'
  ];
  
  // Simple hash function to get consistent color for student
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const color = colors[colorIndex];
  
  switch (type) {
    case 'bg':
      return `bg-${color}-100`;
    case 'border':
      return `border-${color}-300`;
    case 'text':
      return `text-${color}-700`;
    default:
      return `bg-${color}-100`;
  }
};