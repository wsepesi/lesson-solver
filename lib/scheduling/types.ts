// Core time representation using minute precision
export type TimeBlock = {
  start: number;    // minutes from day start (0-1439)
  duration: number; // minutes
}

export type ScheduleMetadata = {
  totalAvailable: number;
  largestBlock: number;
  fragmentationScore: number;
}

export type DaySchedule = {
  dayOfWeek: number; // 0-6, Sunday = 0
  blocks: TimeBlock[]; // sorted by start time
  metadata?: ScheduleMetadata;
}

export type WeekSchedule = {
  days: DaySchedule[];
  timezone: string;
}

// Student/Teacher types
export type Person = {
  id: string;
  name: string;
  email: string;
}

export type StudentConfig = {
  person: Person;
  preferredDuration: number; // minutes
  minDuration?: number;
  maxDuration?: number;
  maxLessonsPerWeek: number;
  availability: WeekSchedule;
}

export type TeacherConfig = {
  person: Person;
  studioId: string;
  availability: WeekSchedule;
  constraints: SchedulingConstraints;
}

export type SchedulingConstraints = {
  maxConsecutiveMinutes: number;
  breakDurationMinutes: number;
  minLessonDuration: number;
  maxLessonDuration: number;
  allowedDurations: number[]; // e.g., [30, 45, 60, 90]
}

// Assignment result
export type LessonAssignment = {
  studentId: string;
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
  timestamp?: Date;
}

export type ScheduleSolution = {
  assignments: LessonAssignment[];
  unscheduled: string[]; // student IDs that couldn't be scheduled
  metadata: {
    totalStudents: number;
    scheduledStudents: number;
    averageUtilization: number;
    computeTimeMs: number;
  }
}

// UI-specific types for AdaptiveCalendar
export type CalendarGranularity = 5 | 10 | 15 | 30 | 60;

export type CalendarProps = {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  constraints?: SchedulingConstraints;
  granularity?: CalendarGranularity;
  minTime?: string; // "07:00"
  maxTime?: string; // "22:00"
  readOnly?: boolean;
  showWeekends?: boolean;
  timezone?: string;
}

// Time selection and interaction types
export type TimeSelection = {
  day: number;
  startMinute: number;
  duration: number;
}

export type CalendarInteraction = {
  type: 'select' | 'deselect' | 'resize' | 'move';
  selection: TimeSelection;
}

// Error handling
export type ValidationError = {
  type: 'overlap' | 'duration' | 'constraint' | 'time_range';
  message: string;
  blockIndex?: number;
}

export type CalendarError = {
  errors: ValidationError[];
  isValid: boolean;
}