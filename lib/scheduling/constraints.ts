/**
 * Constraint Satisfaction System for Lesson Scheduling
 * 
 * This module implements a flexible constraint system for the CSP-based lesson scheduler.
 * It supports both hard constraints (must be satisfied) and soft constraints (preferences).
 * 
 * @author Claude Code
 * @version 1.0.0
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Core time block representation - minutes from day start
 */
export type TimeBlock = {
  start: number;    // minutes from day start (0-1439)
  duration: number; // minutes
}

/**
 * Schedule for a single day
 */
export type DaySchedule = {
  dayOfWeek: number; // 0-6, Sunday = 0
  blocks: TimeBlock[]; // sorted by start time
}

/**
 * Weekly schedule with all days
 */
export type WeekSchedule = {
  days: DaySchedule[];
  timezone: string;
}

/**
 * A single lesson assignment result
 */
export type LessonAssignment = {
  studentId: string;
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
  timestamp?: Date;
}

/**
 * Scheduling constraints configuration
 */
export type SchedulingConstraints = {
  maxConsecutiveMinutes: number;
  breakDurationMinutes: number;
  minLessonDuration: number;
  maxLessonDuration: number;
  allowedDurations: number[]; // e.g., [30, 45, 60, 90]
}

/**
 * Context information for constraint evaluation
 */
export type SolverContext = {
  teacherAvailability: WeekSchedule;
  studentAvailability: Map<string, WeekSchedule>;
  existingAssignments: LessonAssignment[];
  constraints: SchedulingConstraints;
  studentPreferences: Map<string, { 
    preferredDuration: number;
    preferredTimes?: TimeBlock[];
    maxLessonsPerWeek: number;
  }>;
}

/**
 * Represents a constraint violation
 */
export type ConstraintViolation = {
  constraintId: string;
  constraintType: 'hard' | 'soft';
  message: string;
  severity: number; // 0-10, higher = more severe
  affectedStudentId: string;
  suggestedFix?: string;
}

/**
 * Base interface for all constraints
 */
export interface Constraint {
  readonly id: string;
  readonly type: 'hard' | 'soft';
  readonly priority: number; // Higher = more important
  
  /**
   * Evaluate whether an assignment violates this constraint
   * @param assignment The lesson assignment to check
   * @param context Current solver context with all relevant data
   * @returns true if constraint is satisfied, false if violated
   */
  evaluate(assignment: LessonAssignment, context: SolverContext): boolean;
  
  /**
   * Get a human-readable description of this constraint
   */
  getMessage(): string;
  
  /**
   * Get the cost/penalty for violating this constraint
   * Used for soft constraint optimization
   */
  getViolationCost(): number;
}

// ============================================================================
// HARD CONSTRAINTS (Must be satisfied)
// ============================================================================

/**
 * Ensures lessons are only scheduled during available time slots
 */
export class AvailabilityConstraint implements Constraint {
  readonly id = 'availability';
  readonly type = 'hard' as const;
  readonly priority = 100; // Highest priority

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    // Check teacher availability
    const teacherDay = context.teacherAvailability.days[assignment.dayOfWeek];
    if (!teacherDay || !this.isTimeSlotAvailable(teacherDay, assignment.startMinute, assignment.durationMinutes)) {
      return false;
    }

    // Check student availability
    const studentAvailability = context.studentAvailability.get(assignment.studentId);
    if (!studentAvailability) {
      return false;
    }

    const studentDay = studentAvailability.days[assignment.dayOfWeek];
    return studentDay ? this.isTimeSlotAvailable(studentDay, assignment.startMinute, assignment.durationMinutes) : false;
  }

  getMessage(): string {
    return "Lessons must be scheduled during available time slots for both teacher and student";
  }

  getViolationCost(): number {
    return Infinity; // Hard constraint - infinite cost
  }

  private isTimeSlotAvailable(daySchedule: DaySchedule, startMinute: number, duration: number): boolean {
    const endMinute = startMinute + duration;

    for (const block of daySchedule.blocks) {
      const blockEnd = block.start + block.duration;
      
      // Check if the lesson fits entirely within this available block
      if (startMinute >= block.start && endMinute <= blockEnd) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Ensures no two lessons overlap in time
 */
export class NonOverlappingConstraint implements Constraint {
  readonly id = 'non-overlapping';
  readonly type = 'hard' as const;
  readonly priority = 95;

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    const assignmentEnd = assignment.startMinute + assignment.durationMinutes;

    for (const existing of context.existingAssignments) {
      // Skip if different day
      if (existing.dayOfWeek !== assignment.dayOfWeek) {
        continue;
      }

      // Skip if same student (handled by other constraints)
      if (existing.studentId === assignment.studentId) {
        continue;
      }

      const existingEnd = existing.startMinute + existing.durationMinutes;

      // Check for overlap
      if (this.intervalsOverlap(
        assignment.startMinute, assignmentEnd,
        existing.startMinute, existingEnd
      )) {
        return false;
      }
    }

    return true;
  }

  getMessage(): string {
    return "Lessons cannot overlap with each other";
  }

  getViolationCost(): number {
    return Infinity; // Hard constraint
  }

  private intervalsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }
}

/**
 * Ensures lesson duration meets minimum and maximum requirements
 */
export class DurationConstraint implements Constraint {
  readonly id = 'duration';
  readonly type = 'hard' as const;
  readonly priority = 90;

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    const duration = assignment.durationMinutes;
    const constraints = context.constraints;

    // Check minimum and maximum duration
    if (duration < constraints.minLessonDuration || duration > constraints.maxLessonDuration) {
      return false;
    }

    // Check if duration is in allowed list
    if (constraints.allowedDurations.length > 0) {
      return constraints.allowedDurations.includes(duration);
    }

    return true;
  }

  getMessage(): string {
    return "Lesson duration must meet the configured requirements";
  }

  getViolationCost(): number {
    return Infinity; // Hard constraint
  }
}

// ============================================================================
// SOFT CONSTRAINTS (Preferences - can be violated with cost)
// ============================================================================

/**
 * Tries to schedule lessons during preferred times
 */
export class PreferredTimeConstraint implements Constraint {
  readonly id = 'preferred-time';
  readonly type = 'soft' as const;
  readonly priority = 80;

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    const preferences = context.studentPreferences.get(assignment.studentId);
    if (!preferences?.preferredTimes?.length) {
      return true; // No preferences = always satisfied
    }

    const assignmentEnd = assignment.startMinute + assignment.durationMinutes;

    // Check if assignment overlaps with any preferred time
    for (const prefTime of preferences.preferredTimes) {
      const prefEnd = prefTime.start + prefTime.duration;
      
      if (this.intervalsOverlap(
        assignment.startMinute, assignmentEnd,
        prefTime.start, prefEnd
      )) {
        return true;
      }
    }

    return false; // No overlap with preferred times
  }

  getMessage(): string {
    return "Lessons should be scheduled during student's preferred times when possible";
  }

  getViolationCost(): number {
    return 50; // Moderate penalty
  }

  private intervalsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }
}

/**
 * Limits consecutive lesson time to prevent teacher fatigue
 */
export class ConsecutiveLimitConstraint implements Constraint {
  readonly id = 'consecutive-limit';
  readonly type = 'soft' as const;
  readonly priority = 70;

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    const maxConsecutive = context.constraints.maxConsecutiveMinutes;

    // Find all lessons on the same day
    const sameDayLessons = context.existingAssignments
      .filter(existing => existing.dayOfWeek === assignment.dayOfWeek)
      .concat([assignment])
      .sort((a, b) => a.startMinute - b.startMinute);

    // Calculate consecutive blocks
    let consecutiveMinutes = 0;
    let currentBlockStart = -1;

    for (let i = 0; i < sameDayLessons.length; i++) {
      const lesson = sameDayLessons[i];
      if (!lesson) continue;

      if (currentBlockStart === -1) {
        // Start new block
        currentBlockStart = lesson.startMinute;
        consecutiveMinutes = lesson.durationMinutes;
      } else {
        const prevLesson = sameDayLessons[i - 1];
        if (!prevLesson) continue;
        
        const prevEnd = prevLesson.startMinute + prevLesson.durationMinutes;

        // Check if lessons are consecutive (no gap)
        if (lesson.startMinute <= prevEnd) {
          consecutiveMinutes += lesson.durationMinutes;
        } else {
          // Gap found - start new block
          currentBlockStart = lesson.startMinute;
          consecutiveMinutes = lesson.durationMinutes;
        }
      }

      // Check if this block exceeds the limit
      if (consecutiveMinutes > maxConsecutive) {
        return false;
      }
    }

    return true;
  }

  getMessage(): string {
    return "Consecutive lesson time should not exceed the configured limit";
  }

  getViolationCost(): number {
    return 75; // High penalty for teacher wellbeing
  }
}

/**
 * Ensures adequate breaks between lesson blocks
 */
export class BreakRequirementConstraint implements Constraint {
  readonly id = 'break-requirement';
  readonly type = 'soft' as const;
  readonly priority = 65;

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    const requiredBreak = context.constraints.breakDurationMinutes;
    const assignmentEnd = assignment.startMinute + assignment.durationMinutes;

    // Check for adequate breaks before and after this lesson
    for (const existing of context.existingAssignments) {
      if (existing.dayOfWeek !== assignment.dayOfWeek) {
        continue;
      }

      const existingEnd = existing.startMinute + existing.durationMinutes;

      // Check break after existing lesson
      if (existingEnd <= assignment.startMinute) {
        const breakTime = assignment.startMinute - existingEnd;
        if (breakTime > 0 && breakTime < requiredBreak) {
          return false;
        }
      }

      // Check break after new assignment
      if (assignmentEnd <= existing.startMinute) {
        const breakTime = existing.startMinute - assignmentEnd;
        if (breakTime > 0 && breakTime < requiredBreak) {
          return false;
        }
      }
    }

    return true;
  }

  getMessage(): string {
    return "Adequate break time should be maintained between lesson blocks";
  }

  getViolationCost(): number {
    return 40; // Moderate penalty
  }
}

/**
 * Balances lesson distribution across the week
 */
export class WorkloadBalanceConstraint implements Constraint {
  readonly id = 'workload-balance';
  readonly type = 'soft' as const;
  readonly priority = 30;

  evaluate(assignment: LessonAssignment, context: SolverContext): boolean {
    // Count lessons per day
    const lessonsPerDay = new Array(7).fill(0) as number[];
    
    for (const existing of context.existingAssignments) {
      if (existing.dayOfWeek >= 0 && existing.dayOfWeek < 7) {
        lessonsPerDay[existing.dayOfWeek] = (lessonsPerDay[existing.dayOfWeek] ?? 0) + 1;
      }
    }
    if (assignment.dayOfWeek >= 0 && assignment.dayOfWeek < 7) {
      lessonsPerDay[assignment.dayOfWeek] = (lessonsPerDay[assignment.dayOfWeek] ?? 0) + 1;
    }

    // Calculate balance score (lower is better)
    const totalLessons = lessonsPerDay.reduce((sum, count) => sum + count, 0);
    const averagePerDay = totalLessons / 7;
    
    let imbalanceScore = 0;
    for (const count of lessonsPerDay) {
      imbalanceScore += Math.abs(count - averagePerDay);
    }

    // Consider constraint satisfied if imbalance is reasonable
    const maxAcceptableImbalance = Math.max(2, totalLessons * 0.3);
    return imbalanceScore <= maxAcceptableImbalance;
  }

  getMessage(): string {
    return "Lessons should be distributed relatively evenly across the week";
  }

  getViolationCost(): number {
    return 20; // Low penalty - nice to have
  }
}

// ============================================================================
// CONSTRAINT MANAGER
// ============================================================================

/**
 * Manages and orchestrates constraint checking for the scheduling system
 */
export class ConstraintManager {
  private constraints: Constraint[] = [];

  constructor() {
    // Add default constraints
    this.addConstraint(new AvailabilityConstraint());
    this.addConstraint(new NonOverlappingConstraint());
    this.addConstraint(new DurationConstraint());
    this.addConstraint(new PreferredTimeConstraint());
    this.addConstraint(new ConsecutiveLimitConstraint());
    this.addConstraint(new BreakRequirementConstraint());
    this.addConstraint(new WorkloadBalanceConstraint());
  }

  /**
   * Add a new constraint to the system
   */
  addConstraint(constraint: Constraint): void {
    // Remove any existing constraint with the same ID
    this.constraints = this.constraints.filter(c => c.id !== constraint.id);
    
    // Add the new constraint and sort by priority
    this.constraints.push(constraint);
    this.constraints.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a constraint by ID
   */
  removeConstraint(constraintId: string): void {
    this.constraints = this.constraints.filter(c => c.id !== constraintId);
  }

  /**
   * Get all constraints of a specific type
   */
  getConstraintsByType(type: 'hard' | 'soft'): Constraint[] {
    return this.constraints.filter(c => c.type === type);
  }

  /**
   * Check all constraints for a given assignment
   * Returns list of violations (empty if all satisfied)
   */
  checkConstraints(assignment: LessonAssignment, context: SolverContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const constraint of this.constraints) {
      if (!constraint.evaluate(assignment, context)) {
        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          message: constraint.getMessage(),
          severity: constraint.type === 'hard' ? 10 : Math.min(9, constraint.getViolationCost() / 10),
          affectedStudentId: assignment.studentId,
          suggestedFix: this.generateSuggestedFix(constraint, assignment, context)
        });
      }
    }

    return violations;
  }

  /**
   * Calculate total violation cost for optimization
   * Hard constraints return Infinity cost
   */
  getViolationCost(violations: ConstraintViolation[]): number {
    let totalCost = 0;

    for (const violation of violations) {
      if (violation.constraintType === 'hard') {
        return Infinity; // Any hard constraint violation makes solution invalid
      }

      const constraint = this.constraints.find(c => c.id === violation.constraintId);
      if (constraint) {
        totalCost += constraint.getViolationCost();
      }
    }

    return totalCost;
  }

  /**
   * Check if an assignment is valid (no hard constraint violations)
   */
  isValidAssignment(assignment: LessonAssignment, context: SolverContext): boolean {
    const violations = this.checkConstraints(assignment, context);
    return !violations.some(v => v.constraintType === 'hard');
  }

  /**
   * Get all constraints ordered by priority
   */
  getAllConstraints(): readonly Constraint[] {
    return [...this.constraints];
  }

  /**
   * Generate a suggested fix for a constraint violation
   * This is a basic implementation - can be enhanced with more sophisticated suggestions
   */
  private generateSuggestedFix(
    constraint: Constraint, 
    _assignment: LessonAssignment, 
    _context: SolverContext
  ): string | undefined {
    switch (constraint.id) {
      case 'availability':
        return "Try a different time slot when both teacher and student are available";
      case 'non-overlapping':
        return "Schedule this lesson at a different time to avoid conflicts";
      case 'duration':
        return "Adjust lesson duration to meet the configured requirements";
      case 'preferred-time':
        return "Consider scheduling during the student's preferred time slots";
      case 'consecutive-limit':
        return "Add a break or schedule on a different day to reduce consecutive lesson time";
      case 'break-requirement':
        return "Ensure adequate break time between lessons";
      case 'workload-balance':
        return "Consider distributing lessons more evenly across the week";
      default:
        return undefined;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a constraint manager with custom constraint configuration
 */
export function createConstraintManager(
  enabledConstraints?: string[],
  customConstraints?: Constraint[]
): ConstraintManager {
  const manager = new ConstraintManager();

  // Remove unwanted default constraints
  if (enabledConstraints) {
    const allConstraints = manager.getAllConstraints();
    for (const constraint of allConstraints) {
      if (!enabledConstraints.includes(constraint.id)) {
        manager.removeConstraint(constraint.id);
      }
    }
  }

  // Add custom constraints
  if (customConstraints) {
    for (const constraint of customConstraints) {
      manager.addConstraint(constraint);
    }
  }

  return manager;
}

/**
 * Validate constraint configuration
 */
export function validateConstraints(constraints: Constraint[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const constraint of constraints) {
    // Check for duplicate IDs
    if (ids.has(constraint.id)) {
      errors.push(`Duplicate constraint ID: ${constraint.id}`);
    }
    ids.add(constraint.id);

    // Validate priority
    if (constraint.priority < 0 || constraint.priority > 100) {
      errors.push(`Invalid priority for constraint ${constraint.id}: must be 0-100`);
    }

    // Validate violation cost for soft constraints
    if (constraint.type === 'soft' && constraint.getViolationCost() <= 0) {
      errors.push(`Soft constraint ${constraint.id} must have positive violation cost`);
    }
  }

  return errors;
}