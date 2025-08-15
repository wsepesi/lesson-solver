/**
 * Search Strategies for Constraint Satisfaction Problem Solving
 * 
 * This module implements various search strategies for the CSP-based lesson scheduler.
 * Includes backtracking, local search, and hybrid approaches with different heuristics
 * for variable and value ordering.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import type {
  LessonAssignment,
  StudentConfig,
  TeacherConfig,
  WeekSchedule,
  TimeBlock,
  ScheduleSolution,
  SchedulingConstraints
} from './types';
import type {
  ConstraintManager,
  SolverContext
} from './constraints';

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Represents a variable in the CSP (a student to be scheduled)
 */
export type CSPVariable = {
  studentId: string;
  config: StudentConfig;
  domain: CSPValue[]; // Available time slots for this student
}

/**
 * Represents a possible value for a variable (time slot assignment)
 */
export type CSPValue = {
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
  cost: number; // Soft constraint violation cost
}

/**
 * Current state of the search process
 */
export type SearchState = {
  assignments: Map<string, LessonAssignment>;
  unassigned: Set<string>;
  context: SolverContext;
}

/**
 * Configuration options for search strategies
 */
export type SearchOptions = {
  maxIterations?: number;
  timeoutMs?: number;
  randomSeed?: number;
  enablePruning?: boolean;
  objectiveWeights?: {
    utilization: number;
    balance: number;
    preferences: number;
  };
}

/**
 * Base interface for all search strategies
 */
export interface SearchStrategy {
  readonly name: string;
  readonly description: string;
  
  /**
   * Find a solution for the given scheduling problem
   * @param teacher Teacher configuration and availability
   * @param students List of students to schedule
   * @param constraintManager Constraint evaluation system
   * @param options Search configuration options
   * @returns Complete schedule solution or partial if no full solution found
   */
  solve(
    teacher: TeacherConfig,
    students: StudentConfig[],
    constraintManager: ConstraintManager,
    options?: SearchOptions
  ): ScheduleSolution;
}

/**
 * Interface for variable ordering heuristics
 */
export interface VariableHeuristic {
  readonly name: string;
  
  /**
   * Order variables by priority (most important first)
   * @param variables Unassigned variables to order
   * @param state Current search state
   * @returns Ordered list of variables
   */
  orderVariables(variables: CSPVariable[], state: SearchState): CSPVariable[];
}

/**
 * Interface for value ordering heuristics
 */
export interface ValueHeuristic {
  readonly name: string;
  
  /**
   * Order values by preference (best first)
   * @param variable Variable to order values for
   * @param values Available values for the variable
   * @param state Current search state
   * @returns Ordered list of values
   */
  orderValues(variable: CSPVariable, values: CSPValue[], state: SearchState): CSPValue[];
}

/**
 * Interface for optimization objectives
 */
export interface OptimizationObjective {
  readonly name: string;
  readonly weight: number;
  
  /**
   * Evaluate how well a solution meets this objective
   * @param solution Current solution state
   * @param context Solver context
   * @returns Score (higher = better)
   */
  evaluate(solution: LessonAssignment[], context: SolverContext): number;
}

// ============================================================================
// SEARCH STRATEGIES
// ============================================================================

/**
 * Backtracking search with constraint propagation
 * Uses systematic search to find valid solutions
 */
export class BacktrackingSearch implements SearchStrategy {
  readonly name = 'Backtracking';
  readonly description = 'Systematic search with backtracking and constraint propagation';

  private variableHeuristic: VariableHeuristic;
  private valueHeuristic: ValueHeuristic;

  constructor(
    variableHeuristic: VariableHeuristic = new MRVHeuristic(),
    valueHeuristic: ValueHeuristic = new LCVHeuristic()
  ) {
    this.variableHeuristic = variableHeuristic;
    this.valueHeuristic = valueHeuristic;
  }

  solve(
    teacher: TeacherConfig,
    students: StudentConfig[],
    constraintManager: ConstraintManager,
    options: SearchOptions = {}
  ): ScheduleSolution {
    const startTime = Date.now();
    const maxIterations = options.maxIterations ?? 10000;
    const timeoutMs = options.timeoutMs ?? 5000;

    // Initialize CSP variables and domains
    const variables = this.createVariables(students, teacher);
    const context = this.createContext(teacher, students, constraintManager);
    
    // Initial constraint propagation
    this.propagateConstraints(variables, context, constraintManager);
    
    const state: SearchState = {
      assignments: new Map(),
      unassigned: new Set(students.map(s => s.person.id)),
      context
    };

    let iterations = 0;
    const result = this.backtrack(variables, state, constraintManager, () => {
      iterations++;
      const elapsed = Date.now() - startTime;
      return iterations >= maxIterations || elapsed >= timeoutMs;
    });

    return this.buildSolution(result, state, students, Date.now() - startTime);
  }

  private backtrack(
    variables: CSPVariable[],
    state: SearchState,
    constraintManager: ConstraintManager,
    shouldStop: () => boolean
  ): boolean {
    if (shouldStop()) {
      return false;
    }

    // Check if all variables are assigned
    if (state.unassigned.size === 0) {
      return true; // Solution found
    }

    // Select next variable to assign
    const unassignedVars = variables.filter(v => state.unassigned.has(v.studentId));
    const orderedVars = this.variableHeuristic.orderVariables(unassignedVars, state);
    
    if (orderedVars.length === 0) {
      return false; // No variables to assign
    }

    const variable = orderedVars[0];
    if (!variable) return false;
    
    // Order values for this variable
    const orderedValues = this.valueHeuristic.orderValues(variable, variable.domain, state);

    // Try each value
    for (const value of orderedValues) {
      const assignment: LessonAssignment = {
        studentId: variable.studentId,
        dayOfWeek: value.dayOfWeek,
        startMinute: value.startMinute,
        durationMinutes: value.durationMinutes
      };

      // Check if assignment is valid
      if (constraintManager.isValidAssignment(assignment, state.context)) {
        // Make assignment
        state.assignments.set(variable.studentId, assignment);
        state.unassigned.delete(variable.studentId);
        state.context.existingAssignments.push(assignment);

        // Forward checking - prune inconsistent values
        const prunedValues = this.forwardCheck(variables, assignment, constraintManager, state);

        // Recursive call
        if (this.backtrack(variables, state, constraintManager, shouldStop)) {
          return true; // Solution found
        }

        // Backtrack - undo assignment
        state.assignments.delete(variable.studentId);
        state.unassigned.add(variable.studentId);
        state.context.existingAssignments.pop();

        // Restore pruned values
        this.restorePrunedValues(variables, prunedValues);
      }
    }

    return false; // No solution found
  }

  private forwardCheck(
    variables: CSPVariable[],
    assignment: LessonAssignment,
    constraintManager: ConstraintManager,
    state: SearchState
  ): Map<string, CSPValue[]> {
    const prunedValues = new Map<string, CSPValue[]>();

    for (const variable of variables) {
      if (state.assignments.has(variable.studentId)) {
        continue; // Already assigned
      }

      const toRemove: CSPValue[] = [];
      
      for (const value of variable.domain) {
        const testAssignment: LessonAssignment = {
          studentId: variable.studentId,
          dayOfWeek: value.dayOfWeek,
          startMinute: value.startMinute,
          durationMinutes: value.durationMinutes
        };

        if (!constraintManager.isValidAssignment(testAssignment, state.context)) {
          toRemove.push(value);
        }
      }

      if (toRemove.length > 0) {
        prunedValues.set(variable.studentId, [...toRemove]);
        variable.domain = variable.domain.filter(v => !toRemove.includes(v));
      }
    }

    return prunedValues;
  }

  private restorePrunedValues(variables: CSPVariable[], prunedValues: Map<string, CSPValue[]>): void {
    prunedValues.forEach((values, studentId) => {
      const variable = variables.find(v => v.studentId === studentId);
      if (variable) {
        variable.domain.push(...values);
      }
    });
  }

  private createVariables(students: StudentConfig[], teacher: TeacherConfig): CSPVariable[] {
    return students.map(student => ({
      studentId: student.person.id,
      config: student,
      domain: this.generateDomain(student, teacher)
    }));
  }

  private generateDomain(student: StudentConfig, teacher: TeacherConfig): CSPValue[] {
    const domain: CSPValue[] = [];
    const durations = teacher.constraints.allowedDurations.length > 0 
      ? teacher.constraints.allowedDurations 
      : [student.preferredDuration];

    // For each day of the week
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const teacherDay = teacher.availability.days[dayOfWeek];
      const studentDay = student.availability.days[dayOfWeek];

      if (!teacherDay || !studentDay) continue;

      // Find overlapping availability
      const overlaps = this.findTimeOverlaps(teacherDay.blocks, studentDay.blocks);

      // Generate possible assignments for each overlap
      for (const overlap of overlaps) {
        for (const duration of durations) {
          if (duration <= overlap.duration) {
            // Create assignments at different start times within the overlap
            const maxStartTime = overlap.start + overlap.duration - duration;
            
            for (let startMinute = overlap.start; startMinute <= maxStartTime; startMinute += 5) {
              domain.push({
                dayOfWeek,
                startMinute,
                durationMinutes: duration,
                cost: this.calculateSoftConstraintCost(student, dayOfWeek, startMinute, duration)
              });
            }
          }
        }
      }
    }

    return domain.sort((a, b) => a.cost - b.cost); // Sort by cost (best first)
  }

  private findTimeOverlaps(blocks1: TimeBlock[], blocks2: TimeBlock[]): TimeBlock[] {
    const overlaps: TimeBlock[] = [];

    for (const block1 of blocks1) {
      for (const block2 of blocks2) {
        const start = Math.max(block1.start, block2.start);
        const end = Math.min(
          block1.start + block1.duration,
          block2.start + block2.duration
        );

        if (start < end) {
          overlaps.push({
            start,
            duration: end - start
          });
        }
      }
    }

    return overlaps;
  }

  private calculateSoftConstraintCost(
    student: StudentConfig,
    dayOfWeek: number,
    startMinute: number,
    duration: number
  ): number {
    let cost = 0;

    // Preference for student's preferred duration
    const durationDiff = Math.abs(duration - student.preferredDuration);
    cost += durationDiff * 0.1;

    // Time-of-day preferences (prefer mid-morning and afternoon)
    const hour = Math.floor(startMinute / 60);
    if (hour < 9 || hour > 17) {
      cost += 20; // Early morning or evening penalty
    }

    return cost;
  }

  private createContext(
    teacher: TeacherConfig,
    students: StudentConfig[],
    _constraintManager: ConstraintManager
  ): SolverContext {
    const studentAvailability = new Map<string, WeekSchedule>();
    const studentPreferences = new Map<string, {
      preferredDuration: number;
      preferredTimes?: TimeBlock[];
      maxLessonsPerWeek: number;
    }>();

    for (const student of students) {
      studentAvailability.set(student.person.id, student.availability);
      studentPreferences.set(student.person.id, {
        preferredDuration: student.preferredDuration,
        maxLessonsPerWeek: student.maxLessonsPerWeek
      });
    }

    return {
      teacherAvailability: teacher.availability,
      studentAvailability,
      existingAssignments: [],
      constraints: teacher.constraints,
      studentPreferences
    };
  }

  private propagateConstraints(
    variables: CSPVariable[],
    context: SolverContext,
    constraintManager: ConstraintManager
  ): void {
    // AC-3 constraint propagation
    const queue: Array<[CSPVariable, CSPVariable]> = [];
    
    // Initialize queue with all variable pairs
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const varI = variables[i];
        const varJ = variables[j];
        
        if (varI && varJ) {
          queue.push([varI, varJ]);
          queue.push([varJ, varI]);
        }
      }
    }

    while (queue.length > 0) {
      const [xi, xj] = queue.shift()!;
      
      if (this.revise(xi, xj, constraintManager, context)) {
        if (xi.domain.length === 0) {
          // Domain wipe-out - no solution possible
          break;
        }
        
        // Add arcs back to queue
        for (const xk of variables) {
          if (xk !== xi && xk !== xj) {
            queue.push([xk, xi]);
          }
        }
      }
    }
  }

  private revise(
    xi: CSPVariable,
    xj: CSPVariable,
    constraintManager: ConstraintManager,
    context: SolverContext
  ): boolean {
    let revised = false;
    
    const toRemove: CSPValue[] = [];
    
    for (const valueI of xi.domain) {
      let satisfied = false;
      
      for (const valueJ of xj.domain) {
        const assignmentI: LessonAssignment = {
          studentId: xi.studentId,
          dayOfWeek: valueI.dayOfWeek,
          startMinute: valueI.startMinute,
          durationMinutes: valueI.durationMinutes
        };
        
        const assignmentJ: LessonAssignment = {
          studentId: xj.studentId,
          dayOfWeek: valueJ.dayOfWeek,
          startMinute: valueJ.startMinute,
          durationMinutes: valueJ.durationMinutes
        };

        // Check if these assignments can coexist
        const testContext = {
          ...context,
          existingAssignments: [...context.existingAssignments, assignmentI]
        };

        if (constraintManager.isValidAssignment(assignmentJ, testContext)) {
          satisfied = true;
          break;
        }
      }
      
      if (!satisfied) {
        toRemove.push(valueI);
        revised = true;
      }
    }
    
    xi.domain = xi.domain.filter(v => !toRemove.includes(v));
    return revised;
  }

  private buildSolution(
    found: boolean,
    state: SearchState,
    students: StudentConfig[],
    computeTimeMs: number
  ): ScheduleSolution {
    const assignments = Array.from(state.assignments.values());
    const unscheduled = Array.from(state.unassigned);

    return {
      assignments,
      unscheduled,
      metadata: {
        totalStudents: students.length,
        scheduledStudents: assignments.length,
        averageUtilization: this.calculateUtilization(assignments, state.context.teacherAvailability),
        computeTimeMs
      }
    };
  }

  private calculateUtilization(assignments: LessonAssignment[], teacherSchedule: WeekSchedule): number {
    const totalLessonMinutes = assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
    const totalAvailableMinutes = teacherSchedule.days.reduce(
      (sum, day) => sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0),
      0
    );
    
    return totalAvailableMinutes > 0 ? (totalLessonMinutes / totalAvailableMinutes) * 100 : 0;
  }
}

/**
 * Local search for solution optimization
 * Uses hill climbing or simulated annealing to improve existing solutions
 */
export class LocalSearch implements SearchStrategy {
  readonly name = 'Local Search';
  readonly description = 'Hill climbing and simulated annealing for solution optimization';

  private objectives: OptimizationObjective[];

  constructor(objectives: OptimizationObjective[] = []) {
    this.objectives = objectives.length > 0 ? objectives : [
      new UtilizationObjective(1.0),
      new BalanceObjective(0.8),
      new PreferenceObjective(0.6)
    ];
  }

  solve(
    teacher: TeacherConfig,
    students: StudentConfig[],
    constraintManager: ConstraintManager,
    options: SearchOptions = {}
  ): ScheduleSolution {
    const startTime = Date.now();
    const maxIterations = options.maxIterations ?? 1000;

    // Start with a random valid solution or use backtracking to find initial solution
    const backtrackingSearch = new BacktrackingSearch();
    let currentSolution = backtrackingSearch.solve(teacher, students, constraintManager, {
      maxIterations: Math.min(1000, maxIterations / 2),
      timeoutMs: (options.timeoutMs ?? 5000) / 2
    });

    if (currentSolution.assignments.length === 0) {
      return currentSolution; // No initial solution found
    }

    const context = this.createContext(teacher, students, constraintManager, currentSolution.assignments);

    // Hill climbing with restarts
    let bestSolution = currentSolution;
    let bestScore = this.evaluateSolution(currentSolution.assignments, context);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const neighbor = this.generateNeighbor(currentSolution, context, constraintManager);
      if (!neighbor) continue;

      const neighborScore = this.evaluateSolution(neighbor.assignments, context);

      if (neighborScore > bestScore) {
        bestSolution = neighbor;
        bestScore = neighborScore;
        currentSolution = neighbor;
      } else if (this.shouldAcceptWorse(bestScore, neighborScore, iteration, maxIterations)) {
        // Simulated annealing: sometimes accept worse solutions
        currentSolution = neighbor;
      }
    }

    const computeTimeMs = Date.now() - startTime;
    return {
      ...bestSolution,
      metadata: {
        ...bestSolution.metadata,
        computeTimeMs: bestSolution.metadata.computeTimeMs + computeTimeMs
      }
    };
  }

  private generateNeighbor(
    solution: ScheduleSolution,
    context: SolverContext,
    constraintManager: ConstraintManager
  ): ScheduleSolution | null {
    // Generate neighbor by making small changes to current solution
    const assignments = [...solution.assignments];
    
    if (assignments.length === 0) return null;

    // Random move types: swap times, move assignment, change duration
    const moveType = Math.random();
    
    if (moveType < 0.4 && assignments.length >= 2) {
      // Swap two assignments
      return this.swapAssignments(solution, assignments, constraintManager, context);
    } else if (moveType < 0.8) {
      // Move one assignment to different time
      return this.moveAssignment(solution, assignments, constraintManager, context);
    } else {
      // Change duration of one assignment
      return this.changeDuration(solution, assignments, constraintManager, context);
    }
  }

  private swapAssignments(
    solution: ScheduleSolution,
    assignments: LessonAssignment[],
    constraintManager: ConstraintManager,
    context: SolverContext
  ): ScheduleSolution | null {
    const i = Math.floor(Math.random() * assignments.length);
    const j = Math.floor(Math.random() * assignments.length);
    
    if (i === j) return null;

    const newAssignments = [...assignments];
    
    // Swap the times but keep student IDs
    const assignmentI = newAssignments[i];
    const assignmentJ = newAssignments[j];
    
    if (!assignmentI || !assignmentJ) return null;
    
    const tempTime = {
      dayOfWeek: assignmentI.dayOfWeek,
      startMinute: assignmentI.startMinute,
      durationMinutes: assignmentI.durationMinutes
    };
    
    newAssignments[i] = {
      ...assignmentI,
      dayOfWeek: assignmentJ.dayOfWeek,
      startMinute: assignmentJ.startMinute,
      durationMinutes: assignmentJ.durationMinutes
    };
    
    newAssignments[j] = {
      ...assignmentJ,
      ...tempTime
    };

    // Validate the swap
    const testContext = { ...context, existingAssignments: newAssignments };
    if (constraintManager.isValidAssignment(newAssignments[i], testContext) &&
        constraintManager.isValidAssignment(newAssignments[j], testContext)) {
      return {
        ...solution,
        assignments: newAssignments
      };
    }

    return null;
  }

  private moveAssignment(
    solution: ScheduleSolution,
    assignments: LessonAssignment[],
    constraintManager: ConstraintManager,
    context: SolverContext
  ): ScheduleSolution | null {
    const index = Math.floor(Math.random() * assignments.length);
    const assignment = assignments[index];
    if (!assignment) return null;

    // Generate alternative times for this student
    const student = context.studentAvailability.get(assignment.studentId);
    if (!student) return null;

    const alternatives = this.generateAlternativeTimes(
      assignment,
      student,
      context.teacherAvailability,
      context.constraints
    );

    if (alternatives.length === 0) return null;

    const newTime = alternatives[Math.floor(Math.random() * alternatives.length)];
    const newAssignments = [...assignments];
    newAssignments[index] = {
      ...assignment,
      ...newTime
    };

    // Validate the move
    const testContext = { ...context, existingAssignments: newAssignments };
    if (constraintManager.isValidAssignment(newAssignments[index], testContext)) {
      return {
        ...solution,
        assignments: newAssignments
      };
    }

    return null;
  }

  private changeDuration(
    solution: ScheduleSolution,
    assignments: LessonAssignment[],
    constraintManager: ConstraintManager,
    context: SolverContext
  ): ScheduleSolution | null {
    const index = Math.floor(Math.random() * assignments.length);
    const assignment = assignments[index];
    if (!assignment) return null;

    // Try different durations
    const allowedDurations = context.constraints.allowedDurations.length > 0
      ? context.constraints.allowedDurations
      : [30, 45, 60, 90];

    const currentDuration = assignment.durationMinutes;
    const otherDurations = allowedDurations.filter(d => d !== currentDuration);

    if (otherDurations.length === 0) return null;

    const newDuration = otherDurations[Math.floor(Math.random() * otherDurations.length)];
    if (!newDuration) return null;
    
    const newAssignments = [...assignments];
    const updatedAssignment = {
      ...assignment,
      durationMinutes: newDuration
    };
    newAssignments[index] = updatedAssignment;

    // Validate the change
    const testContext = { ...context, existingAssignments: newAssignments };
    if (constraintManager.isValidAssignment(updatedAssignment, testContext)) {
      return {
        ...solution,
        assignments: newAssignments
      };
    }

    return null;
  }

  private generateAlternativeTimes(
    assignment: LessonAssignment,
    studentSchedule: WeekSchedule,
    teacherSchedule: WeekSchedule,
    _constraints: SchedulingConstraints
  ): Array<{ dayOfWeek: number; startMinute: number; durationMinutes: number }> {
    const alternatives: Array<{ dayOfWeek: number; startMinute: number; durationMinutes: number }> = [];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const studentDay = studentSchedule.days[dayOfWeek];
      const teacherDay = teacherSchedule.days[dayOfWeek];

      if (!studentDay || !teacherDay) continue;

      const overlaps = this.findTimeOverlaps(teacherDay.blocks, studentDay.blocks);

      for (const overlap of overlaps) {
        if (overlap.duration >= assignment.durationMinutes) {
          const maxStartTime = overlap.start + overlap.duration - assignment.durationMinutes;
          
          for (let startMinute = overlap.start; startMinute <= maxStartTime; startMinute += 15) {
            // Skip current assignment time
            if (dayOfWeek === assignment.dayOfWeek && startMinute === assignment.startMinute) {
              continue;
            }

            alternatives.push({
              dayOfWeek,
              startMinute,
              durationMinutes: assignment.durationMinutes
            });
          }
        }
      }
    }

    return alternatives;
  }

  private findTimeOverlaps(blocks1: TimeBlock[], blocks2: TimeBlock[]): TimeBlock[] {
    const overlaps: TimeBlock[] = [];

    for (const block1 of blocks1) {
      for (const block2 of blocks2) {
        const start = Math.max(block1.start, block2.start);
        const end = Math.min(
          block1.start + block1.duration,
          block2.start + block2.duration
        );

        if (start < end) {
          overlaps.push({
            start,
            duration: end - start
          });
        }
      }
    }

    return overlaps;
  }

  private shouldAcceptWorse(currentScore: number, newScore: number, iteration: number, maxIterations: number): boolean {
    if (newScore >= currentScore) return true;
    
    // Simulated annealing: accept worse solutions with decreasing probability
    const temperature = 1.0 - (iteration / maxIterations);
    const scoreDiff = currentScore - newScore;
    const probability = Math.exp(-scoreDiff / temperature);
    
    return Math.random() < probability;
  }

  private evaluateSolution(assignments: LessonAssignment[], context: SolverContext): number {
    let totalScore = 0;

    for (const objective of this.objectives) {
      const score = objective.evaluate(assignments, context);
      totalScore += score * objective.weight;
    }

    return totalScore;
  }

  private createContext(
    teacher: TeacherConfig,
    students: StudentConfig[],
    constraintManager: ConstraintManager,
    assignments: LessonAssignment[]
  ): SolverContext {
    const studentAvailability = new Map<string, WeekSchedule>();
    const studentPreferences = new Map<string, {
      preferredDuration: number;
      preferredTimes?: TimeBlock[];
      maxLessonsPerWeek: number;
    }>();

    for (const student of students) {
      studentAvailability.set(student.person.id, student.availability);
      studentPreferences.set(student.person.id, {
        preferredDuration: student.preferredDuration,
        maxLessonsPerWeek: student.maxLessonsPerWeek
      });
    }

    return {
      teacherAvailability: teacher.availability,
      studentAvailability,
      existingAssignments: assignments,
      constraints: teacher.constraints,
      studentPreferences
    };
  }
}

/**
 * Hybrid search combining backtracking and local search
 * Finds feasible solutions quickly, then optimizes them
 */
export class HybridSearch implements SearchStrategy {
  readonly name = 'Hybrid Search';
  readonly description = 'Combines backtracking for feasibility with local search for optimization';

  private backtrackingSearch: BacktrackingSearch;
  private localSearch: LocalSearch;

  constructor(
    variableHeuristic?: VariableHeuristic,
    valueHeuristic?: ValueHeuristic,
    objectives?: OptimizationObjective[]
  ) {
    this.backtrackingSearch = new BacktrackingSearch(variableHeuristic, valueHeuristic);
    this.localSearch = new LocalSearch(objectives);
  }

  solve(
    teacher: TeacherConfig,
    students: StudentConfig[],
    constraintManager: ConstraintManager,
    options: SearchOptions = {}
  ): ScheduleSolution {
    const startTime = Date.now();
    const totalTime = options.timeoutMs ?? 5000;
    const backtrackingTime = Math.min(totalTime * 0.6, 3000); // 60% of time for initial solution
    const optimizationTime = totalTime - backtrackingTime;

    // Phase 1: Find initial feasible solution with backtracking
    const initialSolution = this.backtrackingSearch.solve(teacher, students, constraintManager, {
      ...options,
      timeoutMs: backtrackingTime,
      maxIterations: options.maxIterations ? Math.floor(options.maxIterations * 0.7) : undefined
    });

    // Phase 2: Optimize solution with local search
    if (initialSolution.assignments.length > 0) {
      const optimizedSolution = this.localSearch.solve(teacher, students, constraintManager, {
        ...options,
        timeoutMs: optimizationTime,
        maxIterations: options.maxIterations ? Math.floor(options.maxIterations * 0.3) : undefined
      });

      // Return the better of the two solutions
      if (optimizedSolution.metadata.scheduledStudents >= initialSolution.metadata.scheduledStudents) {
        return {
          ...optimizedSolution,
          metadata: {
            ...optimizedSolution.metadata,
            computeTimeMs: Date.now() - startTime
          }
        };
      }
    }

    return {
      ...initialSolution,
      metadata: {
        ...initialSolution.metadata,
        computeTimeMs: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// VARIABLE ORDERING HEURISTICS
// ============================================================================

/**
 * Most Constrained Variable (MRV) heuristic
 * Choose the variable with the fewest remaining values in its domain
 */
export class MRVHeuristic implements VariableHeuristic {
  readonly name = 'Most Constrained Variable (MRV)';

  orderVariables(variables: CSPVariable[], state: SearchState): CSPVariable[] {
    return variables
      .filter(v => state.unassigned.has(v.studentId))
      .sort((a, b) => {
        // Primary: fewer domain values first
        const domainDiff = a.domain.length - b.domain.length;
        if (domainDiff !== 0) return domainDiff;

        // Tie-breaker: degree heuristic (most constrained by other variables)
        const degreeA = this.calculateDegree(a, variables, state);
        const degreeB = this.calculateDegree(b, variables, state);
        return degreeB - degreeA;
      });
  }

  private calculateDegree(variable: CSPVariable, allVariables: CSPVariable[], state: SearchState): number {
    let degree = 0;
    
    for (const other of allVariables) {
      if (other.studentId === variable.studentId || state.assignments.has(other.studentId)) {
        continue;
      }
      
      // Check if these variables constrain each other
      if (this.variablesConstrain(variable, other)) {
        degree++;
      }
    }
    
    return degree;
  }

  private variablesConstrain(var1: CSPVariable, var2: CSPVariable): boolean {
    // Two variables constrain each other if they might compete for the same time slots
    for (const value1 of var1.domain) {
      for (const value2 of var2.domain) {
        if (value1.dayOfWeek === value2.dayOfWeek) {
          const end1 = value1.startMinute + value1.durationMinutes;
          const end2 = value2.startMinute + value2.durationMinutes;
          
          // Check for time overlap
          if (value1.startMinute < end2 && value2.startMinute < end1) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

/**
 * Degree heuristic
 * Choose the variable involved in the largest number of constraints with other unassigned variables
 */
export class DegreeHeuristic implements VariableHeuristic {
  readonly name = 'Degree Heuristic';

  orderVariables(variables: CSPVariable[], state: SearchState): CSPVariable[] {
    return variables
      .filter(v => state.unassigned.has(v.studentId))
      .sort((a, b) => {
        const degreeA = this.calculateDegree(a, variables, state);
        const degreeB = this.calculateDegree(b, variables, state);
        
        // Higher degree first
        return degreeB - degreeA;
      });
  }

  private calculateDegree(variable: CSPVariable, allVariables: CSPVariable[], state: SearchState): number {
    let degree = 0;
    
    for (const other of allVariables) {
      if (other.studentId === variable.studentId || state.assignments.has(other.studentId)) {
        continue;
      }
      
      // Count constraints between variables
      if (this.hasConstraints(variable, other)) {
        degree++;
      }
    }
    
    return degree;
  }

  private hasConstraints(var1: CSPVariable, var2: CSPVariable): boolean {
    // Check if variables share time conflicts
    for (const value1 of var1.domain) {
      for (const value2 of var2.domain) {
        if (value1.dayOfWeek === value2.dayOfWeek) {
          const end1 = value1.startMinute + value1.durationMinutes;
          const end2 = value2.startMinute + value2.durationMinutes;
          
          if (value1.startMinute < end2 && value2.startMinute < end1) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

// ============================================================================
// VALUE ORDERING HEURISTICS
// ============================================================================

/**
 * Least Constraining Value (LCV) heuristic
 * Choose the value that eliminates the fewest options from the domains of remaining variables
 */
export class LCVHeuristic implements ValueHeuristic {
  readonly name = 'Least Constraining Value (LCV)';

  orderValues(variable: CSPVariable, values: CSPValue[], state: SearchState): CSPValue[] {
    if (values.length <= 1) return values;

    // Calculate how constraining each value is
    const valueConstraints = values.map(value => ({
      value,
      constraintCount: this.calculateConstraintCount(variable, value, state)
    }));

    // Sort by constraint count (least constraining first) and then by cost
    valueConstraints.sort((a, b) => {
      const constraintDiff = a.constraintCount - b.constraintCount;
      if (constraintDiff !== 0) return constraintDiff;
      
      return a.value.cost - b.value.cost; // Lower cost is better
    });

    return valueConstraints.map(vc => vc.value);
  }

  private calculateConstraintCount(_variable: CSPVariable, value: CSPValue, _state: SearchState): number {
    // Count how many values this assignment would eliminate from other variables' domains
    // This is a simplified calculation - in a full implementation, we'd need access to all variables
    
    // For now, we'll use the soft constraint cost as a proxy
    return value.cost;
  }
}

// ============================================================================
// OPTIMIZATION OBJECTIVES
// ============================================================================

/**
 * Objective to maximize teacher schedule utilization
 */
export class UtilizationObjective implements OptimizationObjective {
  readonly name = 'Utilization';
  readonly weight: number;

  constructor(weight = 1.0) {
    this.weight = weight;
  }

  evaluate(assignments: LessonAssignment[], context: SolverContext): number {
    if (assignments.length === 0) return 0;

    const totalLessonMinutes = assignments.reduce((sum, a) => sum + a.durationMinutes, 0);
    const totalAvailableMinutes = context.teacherAvailability.days.reduce(
      (sum, day) => sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0),
      0
    );
    
    return totalAvailableMinutes > 0 ? (totalLessonMinutes / totalAvailableMinutes) * 100 : 0;
  }
}

/**
 * Objective to balance lesson distribution across the week
 */
export class BalanceObjective implements OptimizationObjective {
  readonly name = 'Balance';
  readonly weight: number;

  constructor(weight = 1.0) {
    this.weight = weight;
  }

  evaluate(assignments: LessonAssignment[], _context: SolverContext): number {
    if (assignments.length === 0) return 100; // Perfect balance when no lessons

    // Count lessons per day
    const lessonsPerDay = new Array(7).fill(0);
    for (const assignment of assignments) {
      lessonsPerDay[assignment.dayOfWeek]++;
    }

    // Calculate balance score (lower variance = better balance)
    const totalLessons = assignments.length;
    const averagePerDay = totalLessons / 7;
    
    let variance = 0;
    for (const count of lessonsPerDay) {
      variance += Math.pow(count - averagePerDay, 2);
    }
    variance /= 7;

    // Convert to score (higher = better, range 0-100)
    const maxVariance = Math.pow(totalLessons, 2) / 7; // Worst case: all lessons on one day
    return maxVariance > 0 ? Math.max(0, 100 - (variance / maxVariance) * 100) : 100;
  }
}

/**
 * Objective to maximize student preference satisfaction
 */
export class PreferenceObjective implements OptimizationObjective {
  readonly name = 'Preferences';
  readonly weight: number;

  constructor(weight = 1.0) {
    this.weight = weight;
  }

  evaluate(assignments: LessonAssignment[], context: SolverContext): number {
    if (assignments.length === 0) return 0;

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const assignment of assignments) {
      const prefs = context.studentPreferences.get(assignment.studentId);
      if (!prefs) continue;

      maxPossibleScore += 100;

      // Score based on preferred duration
      const durationScore = this.scoreDurationPreference(assignment.durationMinutes, prefs.preferredDuration);
      
      // Score based on preferred times (if specified)
      const timeScore = this.scoreTimePreference(assignment, prefs.preferredTimes);
      
      totalScore += (durationScore + timeScore) / 2;
    }

    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  }

  private scoreDurationPreference(actualDuration: number, preferredDuration: number): number {
    const diff = Math.abs(actualDuration - preferredDuration);
    const maxDiff = Math.max(actualDuration, preferredDuration);
    return maxDiff > 0 ? Math.max(0, 100 - (diff / maxDiff) * 100) : 100;
  }

  private scoreTimePreference(assignment: LessonAssignment, preferredTimes?: TimeBlock[]): number {
    if (!preferredTimes || preferredTimes.length === 0) {
      return 50; // Neutral score when no preferences
    }

    // Check if assignment overlaps with any preferred time
    const assignmentEnd = assignment.startMinute + assignment.durationMinutes;
    
    for (const prefTime of preferredTimes) {
      const prefEnd = prefTime.start + prefTime.duration;
      
      // Check for overlap
      if (assignment.startMinute < prefEnd && prefTime.start < assignmentEnd) {
        // Calculate overlap percentage
        const overlapStart = Math.max(assignment.startMinute, prefTime.start);
        const overlapEnd = Math.min(assignmentEnd, prefEnd);
        const overlapDuration = overlapEnd - overlapStart;
        const overlapPercentage = (overlapDuration / assignment.durationMinutes) * 100;
        
        return Math.min(100, overlapPercentage);
      }
    }

    return 0; // No overlap with preferred times
  }
}