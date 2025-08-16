/**
 * Scheduling Adapter - Direct TimeBlock Integration
 * 
 * This adapter works directly with TimeBlock types (WeekSchedule, TimeBlock)
 * for efficient scheduling operations.
 */

import type {
  WeekSchedule,
  StudentConfig,
  TeacherConfig,
  ScheduleSolution,
  Person
} from './scheduling/types';

import { 
  solveSchedule,
  type SolverOptions 
} from './scheduling/solver';

import {
  createEmptyWeekSchedule
} from './scheduling/utils';

import type { 
  Student,
  LessonLength,
  TimeInterval 
} from './types';

import type { StudentSchema, StudioSchema } from './db-types';

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Event type for calendar display - using TimeInterval
 */
export type Event = {
  student: Student;
  time: TimeInterval;
}

/**
 * Event type for InteractiveCalendar compatibility
 */
export type CalendarEvent = {
  id: string;
  name: string;
  booking: {
    day: string;
    time_start: string;
    time_end: string;
  };
  other_avail_times: boolean[][];
  student_id: number;
}

/**
 * Final schedule type
 */
export type FinalSchedule = {
  Monday: Event[];
  Tuesday: Event[];
  Wednesday: Event[];
  Thursday: Event[];
  Friday: Event[];
  Saturday: Event[];
  Sunday: Event[];
}

// ============================================================================
// UTILITY CONSTANTS
// ============================================================================

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ============================================================================
// DIRECT MODERN TYPE FUNCTIONS
// ============================================================================

/**
 * Convert Student to Person
 */
export function studentToPerson(student: Student): Person {
  return {
    id: student.email, // Use email as ID for now
    name: student.name,
    email: student.email
  };
}

/**
 * Convert Student + WeekSchedule to StudentConfig
 */
export function createStudentConfig(
  student: Student, 
  availability: WeekSchedule
): StudentConfig {
  return {
    person: studentToPerson(student),
    preferredDuration: student.lessonLength,
    maxLessonsPerWeek: 1, // Default to 1 lesson per week
    availability
  };
}

/**
 * Convert database schedule format to WeekSchedule format
 */
export function convertScheduleToWeekSchedule(schedule: unknown): WeekSchedule {
    const weekSchedule = createEmptyWeekSchedule();
    
    if (!schedule) return weekSchedule;
    
    // If it's already a WeekSchedule, return it
    if (typeof schedule === 'object' && 'days' in schedule && 'timezone' in schedule) {
        return schedule as WeekSchedule;
    }
    
    // Otherwise, assume it's the legacy JSON format
    const jsonSchedule = schedule as Record<string, unknown>;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dayNames.forEach((dayName, dayIndex) => {
        const dayBlocks = jsonSchedule[dayName];
        if (dayBlocks && Array.isArray(dayBlocks)) {
            const blocks = dayBlocks.map((block: unknown) => {
                const blockData = block as Record<string, { hour: number; minute: number } | number>;
                
                // Handle both {start: {hour, minute}, end: {hour, minute}} and {start: number, duration: number} formats
                if ('start' in blockData && 'end' in blockData && typeof blockData.start === 'object') {
                    const start = blockData.start as { hour: number; minute: number };
                    const end = blockData.end as { hour: number; minute: number };
                    const startMinutes = start.hour * 60 + start.minute;
                    const endMinutes = end.hour * 60 + end.minute;
                    return {
                        start: startMinutes,
                        duration: endMinutes - startMinutes
                    };
                } else if ('start' in blockData && 'duration' in blockData && typeof blockData.start === 'number') {
                    return {
                        start: blockData.start,
                        duration: blockData.duration as number
                    };
                }
                
                throw new Error(`Invalid block format: ${JSON.stringify(block)}`);
            });
            
            weekSchedule.days[dayIndex] = {
                dayOfWeek: dayIndex,
                blocks,
                metadata: {
                    totalAvailable: blocks.reduce((sum, block) => sum + block.duration, 0),
                    largestBlock: Math.max(...blocks.map(block => block.duration), 0),
                    fragmentationScore: blocks.length > 1 ? blocks.length - 1 : 0
                }
            };
        }
    });
    
    return weekSchedule;
}

/**
 * Create TeacherConfig from WeekSchedule
 */
export function createTeacherConfig(
  teacherAvailability: WeekSchedule,
  studioId = "default-studio"
): TeacherConfig {
  return {
    person: {
      id: "teacher",
      name: "Teacher",
      email: "teacher@example.com"
    },
    studioId,
    availability: teacherAvailability,
    constraints: {
      maxConsecutiveMinutes: 120, // 2 hours default
      breakDurationMinutes: 30,   // 30 min break default
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [30, 60],
      backToBackPreference: 'agnostic' // Default to current behavior
    }
  };
}

/**
 * Convert ScheduleSolution to Events array
 */
export function solutionToEvents(
  solution: ScheduleSolution, 
  students: Student[]
): Event[] {
  const events: Event[] = [];
  const studentLookup = new Map<string, Student>();
  
  // Create lookup map
  for (const student of students) {
    studentLookup.set(student.email, student);
  }
  
  // Convert assignments to events
  for (const assignment of solution.assignments) {
    const student = studentLookup.get(assignment.studentId);
    if (!student) continue;
    
    events.push({
      student,
      time: {
        start: assignment.startMinute,
        duration: assignment.durationMinutes
      }
    });
  }
  
  return events;
}

/**
 * Convert ScheduleSolution to FinalSchedule format
 */
export function solutionToFinalSchedule(
  solution: ScheduleSolution, 
  students: Student[]
): FinalSchedule {
  const finalSchedule: FinalSchedule = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  };
  
  const studentLookup = new Map<string, Student>();
  for (const student of students) {
    studentLookup.set(student.email, student);
  }
  
  for (const assignment of solution.assignments) {
    const student = studentLookup.get(assignment.studentId);
    if (!student) continue;
    
    const dayName = DAY_NAMES[assignment.dayOfWeek];
    if (!dayName) continue;
    
    finalSchedule[dayName as keyof FinalSchedule].push({
      student,
      time: {
        start: assignment.startMinute,
        duration: assignment.durationMinutes
      }
    });
  }
  
  return finalSchedule;
}

// ============================================================================
// MAIN SCHEDULING FUNCTIONS
// ============================================================================

/**
 * Solve function that works directly with WeekSchedule
 */
export function solveScheduleModern(
  teacherAvailability: WeekSchedule,
  students: { student: Student; availability: WeekSchedule }[],
  constraints: {
    maxConsecutiveMinutes?: number;
    breakDurationMinutes?: number;
  } = {},
  studioId = "default-studio"
): Event[] {
  try {
    // Create teacher config
    const teacher = createTeacherConfig(teacherAvailability, studioId);
    
    // Apply constraints
    if (constraints.maxConsecutiveMinutes) {
      teacher.constraints.maxConsecutiveMinutes = constraints.maxConsecutiveMinutes;
    }
    if (constraints.breakDurationMinutes) {
      teacher.constraints.breakDurationMinutes = constraints.breakDurationMinutes;
    }
    
    // Create student configs
    const studentConfigs = students.map(({ student, availability }) => 
      createStudentConfig(student, availability)
    );
    
    // Configure solver options
    const solverOptions: SolverOptions = {
      maxTimeMs: 10000,
      maxBacktracks: 1000,
      useConstraintPropagation: true,
      useHeuristics: true,
      searchStrategy: 'backtracking',
      optimizeForQuality: true,
      logLevel: 'basic'
    };
    
    // Solve using CSP solver
    const solution = solveSchedule(teacher, studentConfigs, solverOptions);
    
    // Convert to events
    const allStudents = students.map(s => s.student);
    return solutionToEvents(solution, allStudents);
    
  } catch (error) {
    console.error('Scheduling error:', error);
    return [];
  }
}

/**
 * Solve schedule and return events for studio
 * Version that works with database schemas
 */
export function solveStudioSchedule(
  studio: StudioSchema,
  students: StudentSchema[]
): Event[] {
  try {
    // Convert teacher schedule from database (assumed to be WeekSchedule format)
    const teacherSchedule = studio.owner_schedule!;
    if (!teacherSchedule) {
      throw new Error('No teacher schedule available');
    }
    
    // Convert students to StudentConfig format
    const studentSchedules = students.map(studentSchema => {
      const student: Student = {
        name: `${studentSchema.first_name} ${studentSchema.last_name}`,
        email: studentSchema.email,
        lessonLength: parseInt(studentSchema.lesson_length ?? '60') as LessonLength
      };
      
      const availability = studentSchema.schedule!;
      
      return { student, availability };
    }).filter(s => s.availability); // Only include students with availability
    
    // Solve schedule
    return solveScheduleModern(
      teacherSchedule,
      studentSchedules,
      {
        maxConsecutiveMinutes: 120, // 2 hours
        breakDurationMinutes: 30    // 30 minutes
      },
      studio.id.toString()
    );
    
  } catch (error) {
    console.error('Studio scheduling error:', error);
    return [];
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  solveSchedule,
  createEmptyWeekSchedule
};