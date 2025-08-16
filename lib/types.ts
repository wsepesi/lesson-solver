/**
 * Unified Types
 * 
 * This file provides type definitions using the TimeBlock system
 * while maintaining compatibility with existing component interfaces.
 */

// Re-export all scheduling types
export type {
  TimeBlock,
  WeekSchedule,
  DaySchedule,
  Person,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints,
  LessonAssignment,
  ScheduleSolution,
  CalendarGranularity,
  CalendarProps,
  TimeSelection,
  CalendarInteraction,
  ValidationError,
  CalendarError
} from './scheduling/types';

// Import WeekSchedule for use in this file
import type { WeekSchedule } from './scheduling/types';

// ============================================================================
// MODERN EQUIVALENTS OF LEGACY TYPES
// ============================================================================

/**
 * Time representation using minutes from midnight (0-1439)
 * Simple number representation for time
 */
export type TimeMinutes = number;

/**
 * Time interval with minute precision
 * Time interval representation
 */
export type TimeInterval = {
  start: number; // minutes from midnight (0-1439)
  duration: number; // duration in minutes
}

/**
 * Day names
 */
export type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

/**
 * Schedule type using WeekSchedule
 */
export type Schedule = WeekSchedule;

/**
 * Lesson length in minutes
 * Lesson length using numbers
 */
export type LessonLength = 30 | 60;

/**
 * Student type
 * Uses Person interface with additional lesson preferences
 */
export type Student = {
  name: string;
  email: string;
  lessonLength: LessonLength;
}

/**
 * Student with availability schedule
 */
export type StudentWithSchedule = Student & {
  schedule: WeekSchedule;
}

/**
 * Student schedule pairing
 */
export type StudentSchedule = {
  student: Student;
  schedule: WeekSchedule;
}

/**
 * Application state
 */
export type State = "teacher" | "student" | "result" | "failed";

/**
 * Student availability for scheduling
 */
export type StudentAvailability = {
  student: Student;
  availability: TimeInterval[];
}

/**
 * Scheduled lesson
 */
export type Scheduled = {
  student: StudentAvailability;
  interval: TimeInterval;
}

/**
 * Schedule with quality score
 */
export type ScheduleAndScore = {
  schedule: Scheduled[];
  score: number;
}

/**
 * Studio creation info
 */
export type NewStudioInfo = {
  name: string;
}

/**
 * Studio progress states
 */
export type StudioProgress = "Not Started" | "In Progress" | "Done";

/**
 * Studio info for display
 */
export type StudioInfo = {
  name: string;
  numEnrolled: number;
  code: string;
  progress: StudioProgress;
}

/**
 * Simple interval
 */
export type Interval = {
  start: number;
  end: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert minutes from midnight to time string
 * Time to string functionality
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert time string to minutes from midnight
 * Parse "HH:MM" format
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Format time interval as AM/PM string
 * TimeInterval to string functionality
 */
export function timeIntervalToString(interval: TimeInterval): string {
  const startMinutes = interval.start;
  const endMinutes = interval.start + interval.duration;
  
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    const minStr = mins === 0 ? '00' : mins.toString();
    return `${hour12}:${minStr} ${ampm}`;
  };
  
  return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
}

/**
 * Compare two time values
 * Time comparison methods
 */
export function compareTimeMinutes(a: number, b: number): number {
  return a - b;
}

/**
 * Check if time a is greater than time b
 */
export function isTimeAfter(a: number, b: number): boolean {
  return a > b;
}

/**
 * Check if time a is before time b
 */
export function isTimeBefore(a: number, b: number): boolean {
  return a < b;
}

/**
 * Check if time a equals time b
 */
export function isTimeEqual(a: number, b: number): boolean {
  return a === b;
}

// ============================================================================
// DAY UTILITIES
// ============================================================================

/**
 * Day mapping for conversions
 */
export const DAY_MAPPING: Record<Day, number> = {
  "Sunday": 0,
  "Monday": 1,
  "Tuesday": 2,
  "Wednesday": 3,
  "Thursday": 4,
  "Friday": 5,
  "Saturday": 6
};

/**
 * Day names array for index-based access
 */
export const DAY_NAMES: Day[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Get day name from index
 */
export function getDayName(dayIndex: number): Day {
  return DAY_NAMES[dayIndex] ?? "Sunday";
}

/**
 * Get day index from name
 */
export function getDayIndex(dayName: Day): number {
  return DAY_MAPPING[dayName];
}