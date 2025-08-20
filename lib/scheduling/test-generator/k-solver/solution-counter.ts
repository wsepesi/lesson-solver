/**
 * Solution Counter for K-Solvability Framework
 * 
 * Provides exact and estimated solution counting for scheduling test cases.
 * Uses backtracking enumeration for small cases and statistical sampling
 * for larger cases with confidence intervals.
 */

import type { 
  TeacherConfig, 
  StudentConfig, 
  LessonAssignment, 
  ScheduleSolution,
  TimeBlock
} from '../../types';

import type { TestCase } from '../core';

// Internal CSP types for solution enumeration
interface TimeSlot {
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
}

interface Variable {
  studentId: string;
  studentConfig: StudentConfig;
  domain: TimeSlot[];
  constraints: string[];
}

interface Domain {
  variableId: string;
  timeSlots: TimeSlot[];
  isReduced: boolean;
}

import { ScheduleSolver } from '../../solver';
import { findAvailableSlots, isTimeAvailable } from '../../utils';

/**
 * Result of a solution counting operation
 */
export interface SolutionCountResult {
  /** Number of solutions found */
  count: number;
  
  /** Whether this is an exact count or estimate */
  isExact: boolean;
  
  /** Time taken to count solutions (ms) */
  timeMs: number;
  
  /** Confidence interval for estimates */
  confidenceInterval?: [number, number];
  
  /** Statistical confidence level (0-1) */
  confidence?: number;
  
  /** Number of samples used for estimation */
  samplesUsed?: number;
  
  /** Error message if counting failed */
  error?: string;
  
  /** Additional metadata about the counting process */
  metadata?: {
    backtrackCount?: number;
    constraintChecks?: number;
    timeoutOccurred?: boolean;
    memoryLimitReached?: boolean;
  };
}

/**
 * Configuration for solution counting
 */
export interface CountingConfig {
  /** Maximum time for exact counting (ms) */
  maxExactTimeMs: number;
  
  /** Maximum student count for exact counting */
  maxExactStudents: number;
  
  /** Statistical confidence level for estimates */
  confidenceLevel: number;
  
  /** Default number of samples for estimation */
  defaultSamples: number;
  
  /** Enable early termination optimizations */
  enableEarlyTermination: boolean;
  
  /** Memory limit for solution storage (MB) */
  memoryLimitMB: number;
}

/**
 * Internal state for solution enumeration
 */
interface EnumerationState {
  solutions: LessonAssignment[][];
  backtrackCount: number;
  constraintChecks: number;
  startTime: number;
  maxTime: number;
  terminated: boolean;
  terminationReason?: 'timeout' | 'memory' | 'complete';
}

/**
 * Solution counter with exact and estimated counting capabilities
 */
export class SolutionCounter {
  private defaultConfig: CountingConfig = {
    maxExactTimeMs: 30000, // 30 seconds
    maxExactStudents: 10,
    confidenceLevel: 0.95,
    defaultSamples: 1000,
    enableEarlyTermination: true,
    memoryLimitMB: 512
  };
  
  constructor(private config: Partial<CountingConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }
  
  /**
   * Count exact number of solutions for a test case
   */
  async countExact(
    teacher: TeacherConfig, 
    students: StudentConfig[],
    timeoutMs?: number
  ): Promise<SolutionCountResult> {
    const startTime = Date.now();
    const maxTime = timeoutMs ?? this.config.maxExactTimeMs!;
    
    // Validate input size
    if (students.length > this.config.maxExactStudents!) {
      return {
        count: 0,
        isExact: false,
        timeMs: Date.now() - startTime,
        error: `Too many students for exact counting (${students.length} > ${this.config.maxExactStudents})`
      };
    }
    
    try {
      // Initialize enumeration state
      const state: EnumerationState = {
        solutions: [],
        backtrackCount: 0,
        constraintChecks: 0,
        startTime,
        maxTime,
        terminated: false
      };
      
      // Create CSP representation
      const variables = this.createVariables(students);
      const domains = this.createDomains(teacher, students);
      
      // Enumerate all solutions
      await this.enumerateAllSolutions(variables, domains, teacher, [], state);
      
      const timeMs = Date.now() - startTime;
      
      return {
        count: state.solutions.length,
        isExact: true,
        timeMs,
        metadata: {
          backtrackCount: state.backtrackCount,
          constraintChecks: state.constraintChecks,
          timeoutOccurred: state.terminationReason === 'timeout',
          memoryLimitReached: state.terminationReason === 'memory'
        }
      };
      
    } catch (error) {
      return {
        count: 0,
        isExact: false,
        timeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Estimate solution count using statistical sampling
   */
  estimateViaSampling(
    teacher: TeacherConfig,
    students: StudentConfig[],
    samples: number
  ): Promise<SolutionCountResult> {
    const startTime = Date.now();
    
    try {
      // Use Monte Carlo estimation - this will be implemented in monte-carlo-estimator.ts
      // For now, provide a basic implementation
      
      const solver = new ScheduleSolver({
        maxTimeMs: 1000, // Quick solves for sampling
        maxBacktracks: 100,
        useConstraintPropagation: true,
        useHeuristics: true,
        logLevel: 'none'
      });
      
      let validSolutions = 0;
      const sampleResults: boolean[] = [];
      
      // Sample random starting points and check if solutions exist
      for (let i = 0; i < samples; i++) {
        // Create a randomized version of the problem
        const shuffledStudents = this.shuffleStudents(students, i);
        const solution = solver.solve(teacher, shuffledStudents);
        
        const hasValidSolution = solution.assignments.length > 0;
        sampleResults.push(hasValidSolution);
        
        if (hasValidSolution) {
          validSolutions++;
        }
        
        // Early termination if we have enough samples
        if (i > 100 && i % 100 === 0) {
          const currentRate = validSolutions / (i + 1);
          if (currentRate < 0.001 || currentRate > 0.999) {
            // Very high or very low success rate - can estimate confidently
            break;
          }
        }
      }
      
      const successRate = validSolutions / sampleResults.length;
      
      // Estimate total solutions based on combinatorial space
      const estimatedSolutions = this.estimateSolutionSpaceSize(teacher, students, successRate);
      
      // Calculate confidence interval using binomial distribution
      const confidenceInterval = this.calculateConfidenceInterval(
        successRate,
        sampleResults.length,
        this.config.confidenceLevel!
      );
      
      const timeMs = Date.now() - startTime;
      
      return Promise.resolve({
        count: Math.round(estimatedSolutions),
        isExact: false,
        timeMs,
        confidence: this.config.confidenceLevel,
        samplesUsed: sampleResults.length,
        confidenceInterval: [
          Math.round(this.estimateSolutionSpaceSize(teacher, students, confidenceInterval[0])),
          Math.round(this.estimateSolutionSpaceSize(teacher, students, confidenceInterval[1]))
        ]
      });
      
    } catch (error) {
      return Promise.resolve({
        count: 0,
        isExact: false,
        timeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Estimation failed'
      });
    }
  }
  
  /**
   * Calculate theoretical bounds for solution count
   */
  calculateBounds(
    teacher: TeacherConfig, 
    students: StudentConfig[]
  ): { min: number; max: number; reasoning: string[] } {
    const reasoning: string[] = [];
    
    // Upper bound: product of domain sizes
    let maxSolutions = 1;
    let totalSlots = 0;
    
    for (const student of students) {
      const studentSlots = this.countAvailableSlots(teacher, student);
      totalSlots += studentSlots;
      maxSolutions *= studentSlots;
      reasoning.push(`Student ${student.person.name}: ${studentSlots} available slots`);
    }
    
    reasoning.push(`Theoretical maximum: ${maxSolutions.toLocaleString()} (product of domain sizes)`);
    
    // Lower bound: check if any solution is possible
    let minSolutions = 0;
    
    // Basic feasibility check
    const totalRequiredTime = students.reduce((sum, s) => sum + s.preferredDuration, 0);
    const totalAvailableTime = this.calculateTotalAvailableTime(teacher);
    
    if (totalRequiredTime <= totalAvailableTime) {
      minSolutions = 1; // At least one solution should be possible
      reasoning.push(`Total required time (${totalRequiredTime}min) <= available time (${totalAvailableTime}min)`);
    } else {
      reasoning.push(`Total required time (${totalRequiredTime}min) > available time (${totalAvailableTime}min) - impossible`);
    }
    
    // Adjust upper bound based on constraint analysis
    const constraintFactor = this.estimateConstraintReductionFactor(teacher, students);
    const adjustedMax = Math.floor(maxSolutions * constraintFactor);
    
    reasoning.push(`Constraint reduction factor: ${constraintFactor.toFixed(3)}`);
    reasoning.push(`Adjusted maximum: ${adjustedMax.toLocaleString()}`);
    
    return {
      min: minSolutions,
      max: Math.max(minSolutions, adjustedMax),
      reasoning
    };
  }
  
  /**
   * Generate test case with exactly k solutions
   */
  generateKSolutionCase(
    k: number, 
    studentCount: number,
    baseTeacher?: TeacherConfig
  ): Promise<TestCase | null> {
    // This method will be used by the k-solution-generator
    // For now, return null - this will be implemented after integration
    return Promise.resolve(null);
  }
  
  /**
   * Create CSP variables from students
   */
  private createVariables(students: StudentConfig[]): Variable[] {
    return students.map(student => ({
      studentId: student.person.id,
      studentConfig: student,
      domain: [], // Will be populated by createDomains
      constraints: [] // Will be populated based on teacher constraints
    }));
  }
  
  /**
   * Create domains (possible time slots) for each student
   */
  private createDomains(teacher: TeacherConfig, students: StudentConfig[]): Domain[] {
    const domains: Domain[] = [];
    
    for (const student of students) {
      const timeSlots: TimeSlot[] = [];
      const duration = student.preferredDuration;
      
      // For each day of the week
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const teacherDay = teacher.availability.days[dayOfWeek];
        const studentDay = student.availability.days[dayOfWeek];
        
        if (!teacherDay || !studentDay) continue;
        
        // Find available slots for both teacher and student
        const teacherSlots = findAvailableSlots(teacherDay, duration);
        
        for (const slot of teacherSlots) {
          if (isTimeAvailable(studentDay, slot.start, duration)) {
            timeSlots.push({
              dayOfWeek,
              startMinute: slot.start,
              durationMinutes: duration
            });
          }
        }
      }
      
      domains.push({
        variableId: student.person.id,
        timeSlots,
        isReduced: false
      });
    }
    
    return domains;
  }
  
  /**
   * Enumerate all valid solutions using backtracking
   */
  private async enumerateAllSolutions(
    variables: Variable[],
    domains: Domain[],
    teacher: TeacherConfig,
    currentAssignments: LessonAssignment[],
    state: EnumerationState
  ): Promise<void> {
    // Check termination conditions
    if (Date.now() - state.startTime > state.maxTime) {
      state.terminated = true;
      state.terminationReason = 'timeout';
      return;
    }
    
    // Check memory limit (rough estimate)
    const memoryUsageMB = (state.solutions.length * variables.length * 100) / (1024 * 1024);
    if (memoryUsageMB > this.config.memoryLimitMB!) {
      state.terminated = true;
      state.terminationReason = 'memory';
      return;
    }
    
    // Base case: all variables assigned
    if (currentAssignments.length === variables.length) {
      state.solutions.push([...currentAssignments]);
      return;
    }
    
    // Select next variable
    const nextVariableIndex = currentAssignments.length;
    const variable = variables[nextVariableIndex];
    const domain = domains.find(d => d.variableId === variable?.studentId);
    
    if (!variable || !domain) return;
    
    // Try each possible assignment
    for (const timeSlot of domain.timeSlots) {
      const assignment: LessonAssignment = {
        studentId: variable.studentId,
        dayOfWeek: timeSlot.dayOfWeek,
        startMinute: timeSlot.startMinute,
        durationMinutes: timeSlot.durationMinutes
      };
      
      state.constraintChecks++;
      
      // Check if this assignment conflicts with existing ones
      if (this.isValidAssignment(assignment, currentAssignments, teacher)) {
        currentAssignments.push(assignment);
        
        await this.enumerateAllSolutions(
          variables,
          domains,
          teacher,
          currentAssignments,
          state
        );
        
        currentAssignments.pop();
        state.backtrackCount++;
        
        if (state.terminated) break;
      }
    }
  }
  
  /**
   * Check if an assignment is valid given existing assignments
   */
  private isValidAssignment(
    assignment: LessonAssignment,
    existingAssignments: LessonAssignment[],
    teacher: TeacherConfig
  ): boolean {
    // Check for time conflicts with existing assignments
    for (const existing of existingAssignments) {
      if (assignment.dayOfWeek === existing.dayOfWeek) {
        const assignmentEnd = assignment.startMinute + assignment.durationMinutes;
        const existingEnd = existing.startMinute + existing.durationMinutes;
        
        // Check for overlap
        if (!(assignmentEnd <= existing.startMinute || assignment.startMinute >= existingEnd)) {
          return false; // Time conflict
        }
      }
    }
    
    // Check teacher constraints (consecutive time, breaks, etc.)
    // This is a simplified check - full constraint checking would use the constraint manager
    const sameDay = existingAssignments.filter(a => a.dayOfWeek === assignment.dayOfWeek);
    
    if (sameDay.length > 0) {
      // Check maximum consecutive time
      const dayAssignments = [...sameDay, assignment].sort((a, b) => a.startMinute - b.startMinute);
      let consecutiveTime = 0;
      let lastEnd = 0;
      
      for (const dayAssignment of dayAssignments) {
        if (lastEnd > 0 && dayAssignment.startMinute - lastEnd < teacher.constraints.breakDurationMinutes) {
          consecutiveTime += dayAssignment.durationMinutes;
        } else {
          consecutiveTime = dayAssignment.durationMinutes;
        }
        
        if (consecutiveTime > teacher.constraints.maxConsecutiveMinutes) {
          return false;
        }
        
        lastEnd = dayAssignment.startMinute + dayAssignment.durationMinutes;
      }
    }
    
    return true;
  }
  
  /**
   * Count available time slots for a student with teacher
   */
  private countAvailableSlots(teacher: TeacherConfig, student: StudentConfig): number {
    let slotCount = 0;
    const duration = student.preferredDuration;
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const teacherDay = teacher.availability.days[dayOfWeek];
      const studentDay = student.availability.days[dayOfWeek];
      
      if (!teacherDay || !studentDay) continue;
      
      const teacherSlots = findAvailableSlots(teacherDay, duration);
      
      for (const slot of teacherSlots) {
        if (isTimeAvailable(studentDay, slot.start, duration)) {
          slotCount++;
        }
      }
    }
    
    return slotCount;
  }
  
  /**
   * Calculate total available time for teacher
   */
  private calculateTotalAvailableTime(teacher: TeacherConfig): number {
    let totalTime = 0;
    
    for (const day of teacher.availability.days) {
      for (const block of day.blocks) {
        totalTime += block.duration;
      }
    }
    
    return totalTime;
  }
  
  /**
   * Estimate constraint reduction factor
   */
  private estimateConstraintReductionFactor(teacher: TeacherConfig, students: StudentConfig[]): number {
    // Start with base factor
    let factor = 1.0;
    
    // Reduce based on overlap requirements
    const avgOverlap = this.calculateAverageOverlap(teacher, students);
    factor *= Math.max(0.1, avgOverlap);
    
    // Reduce based on consecutive time constraints
    const avgLessonTime = students.reduce((sum, s) => sum + s.preferredDuration, 0) / students.length;
    const consecutiveRatio = teacher.constraints.maxConsecutiveMinutes / avgLessonTime;
    
    if (consecutiveRatio < students.length) {
      factor *= consecutiveRatio / students.length;
    }
    
    // Reduce based on break requirements
    if (teacher.constraints.breakDurationMinutes > 0) {
      factor *= 0.7; // Approximate reduction due to break constraints
    }
    
    return Math.max(0.001, factor);
  }
  
  /**
   * Calculate average availability overlap between teacher and students
   */
  private calculateAverageOverlap(teacher: TeacherConfig, students: StudentConfig[]): number {
    if (students.length === 0) return 0;
    
    let totalOverlap = 0;
    
    for (const student of students) {
      let studentOverlap = 0;
      let teacherTotal = 0;
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const teacherDay = teacher.availability.days[dayOfWeek];
        const studentDay = student.availability.days[dayOfWeek];
        
        if (teacherDay) {
          teacherTotal += teacherDay.blocks.reduce((sum, block) => sum + block.duration, 0);
        }
        
        if (teacherDay && studentDay) {
          studentOverlap += this.calculateDayOverlap(teacherDay.blocks, studentDay.blocks);
        }
      }
      
      if (teacherTotal > 0) {
        totalOverlap += studentOverlap / teacherTotal;
      }
    }
    
    return totalOverlap / students.length;
  }
  
  /**
   * Calculate overlap between two sets of time blocks
   */
  private calculateDayOverlap(teacherBlocks: TimeBlock[], studentBlocks: TimeBlock[]): number {
    let overlap = 0;
    
    for (const teacherBlock of teacherBlocks) {
      for (const studentBlock of studentBlocks) {
        const teacherEnd = teacherBlock.start + teacherBlock.duration;
        const studentEnd = studentBlock.start + studentBlock.duration;
        
        const overlapStart = Math.max(teacherBlock.start, studentBlock.start);
        const overlapEnd = Math.min(teacherEnd, studentEnd);
        
        if (overlapStart < overlapEnd) {
          overlap += overlapEnd - overlapStart;
        }
      }
    }
    
    return overlap;
  }
  
  /**
   * Shuffle students for sampling variation
   */
  private shuffleStudents(students: StudentConfig[], seed: number): StudentConfig[] {
    const shuffled = [...students];
    
    // Simple seeded shuffle using seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = ((seed * (i + 1)) % 1000) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      seed = (seed * 1103515245 + 12345) % (2 ** 31);
    }
    
    return shuffled;
  }
  
  /**
   * Estimate solution space size based on success rate
   */
  private estimateSolutionSpaceSize(
    teacher: TeacherConfig,
    students: StudentConfig[],
    successRate: number
  ): number {
    // Calculate theoretical maximum solutions
    let maxSpace = 1;
    
    for (const student of students) {
      const slots = this.countAvailableSlots(teacher, student);
      maxSpace *= Math.max(1, slots);
    }
    
    // Adjust by success rate
    return maxSpace * successRate;
  }
  
  /**
   * Calculate confidence interval for binomial proportion
   */
  private calculateConfidenceInterval(
    proportion: number,
    sampleSize: number,
    confidence: number
  ): [number, number] {
    // Use Wilson score interval for better performance with small samples
    const z = this.getZScore(confidence);
    const n = sampleSize;
    const p = proportion;
    
    const denominator = 1 + (z * z) / n;
    const centre = (p + (z * z) / (2 * n)) / denominator;
    const width = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    
    return [
      Math.max(0, centre - width),
      Math.min(1, centre + width)
    ];
  }
  
  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidence: number): number {
    // Common confidence levels
    if (confidence >= 0.99) return 2.576;
    if (confidence >= 0.95) return 1.96;
    if (confidence >= 0.90) return 1.645;
    if (confidence >= 0.80) return 1.282;
    
    // Default to 95% confidence
    return 1.96;
  }
}

/**
 * Create solution counter with optimal settings for student count
 */
export function createOptimalSolutionCounter(studentCount: number): SolutionCounter {
  const config: Partial<CountingConfig> = {
    maxExactStudents: studentCount <= 8 ? 12 : 8,
    maxExactTimeMs: studentCount <= 5 ? 60000 : 30000,
    defaultSamples: Math.max(500, Math.min(5000, studentCount * 50)),
    confidenceLevel: 0.95,
    enableEarlyTermination: true
  };
  
  return new SolutionCounter(config);
}

/**
 * Default solution counter instance
 */
export const defaultSolutionCounter = new SolutionCounter();