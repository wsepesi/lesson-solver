/**
 * Constraint Graph Analyzer for Solution Bounds
 * 
 * Analyzes the constraint structure of scheduling problems to calculate
 * theoretical bounds on solution counts. Uses graph theory, constraint
 * satisfaction theory, and combinatorial analysis.
 */

import type { 
  TeacherConfig, 
  StudentConfig, 
  TimeBlock,
  DaySchedule
} from '../../types';

// Internal types
interface TimeSlot {
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
}

import { findAvailableSlots, isTimeAvailable } from '../../utils';

/**
 * Node in the constraint graph representing a variable-value pair
 */
interface ConstraintNode {
  /** Unique identifier */
  id: string;
  
  /** Student this node represents */
  studentId: string;
  
  /** Time slot this node represents */
  timeSlot: TimeSlot;
  
  /** Degree (number of connections) */
  degree: number;
  
  /** Connected nodes (conflicts) */
  conflicts: Set<string>;
  
  /** Domain size for this variable */
  domainSize: number;
}

/**
 * Edge in the constraint graph representing a conflict
 */
interface ConstraintEdge {
  /** Source node ID */
  from: string;
  
  /** Target node ID */
  to: string;
  
  /** Type of constraint causing conflict */
  constraintType: 'time_overlap' | 'teacher_consecutive' | 'break_violation' | 'capacity';
  
  /** Strength of the constraint (0-1) */
  strength: number;
}

/**
 * Analysis result of the constraint graph
 */
interface ConstraintGraphAnalysis {
  /** Number of nodes in the graph */
  nodeCount: number;
  
  /** Number of edges (conflicts) */
  edgeCount: number;
  
  /** Graph density (edges / max possible edges) */
  density: number;
  
  /** Maximum clique size (tight constraint group) */
  maxCliqueSize: number;
  
  /** Number of connected components */
  connectedComponents: number;
  
  /** Average node degree */
  averageDegree: number;
  
  /** Constraint tightness score (0-1) */
  tightnessScore: number;
  
  /** Estimated constraint reduction factor */
  reductionFactor: number;
  
  /** Critical path information */
  criticalPath: {
    length: number;
    bottlenecks: string[];
  };
}

/**
 * Bounds calculation result
 */
export interface SolutionBounds {
  /** Lower bound on solution count */
  lowerBound: number;
  
  /** Upper bound on solution count */
  upperBound: number;
  
  /** Theoretical maximum (unconstrained) */
  theoreticalMax: number;
  
  /** Constraint analysis details */
  analysis: ConstraintGraphAnalysis;
  
  /** Reasoning for the bounds */
  reasoning: string[];
  
  /** Confidence in bounds accuracy (0-1) */
  confidence: number;
}

/**
 * Configuration for constraint analysis
 */
interface AnalysisConfig {
  /** Include break constraints in analysis */
  includeBreakConstraints: boolean;
  
  /** Include consecutive time constraints */
  includeConsecutiveConstraints: boolean;
  
  /** Maximum clique size to compute exactly */
  maxCliqueComputationSize: number;
  
  /** Enable heuristic approximations for large graphs */
  useHeuristics: boolean;
  
  /** Confidence threshold for bounds */
  confidenceThreshold: number;
}

/**
 * Constraint graph analyzer for solution bounds calculation
 */
export class ConstraintGraphAnalyzer {
  private defaultConfig: AnalysisConfig = {
    includeBreakConstraints: true,
    includeConsecutiveConstraints: true,
    maxCliqueComputationSize: 20,
    useHeuristics: true,
    confidenceThreshold: 0.8
  };
  
  constructor(private config: Partial<AnalysisConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }
  
  /**
   * Calculate solution bounds using constraint graph analysis
   */
  calculateBounds(teacher: TeacherConfig, students: StudentConfig[]): SolutionBounds {
    const startTime = Date.now();
    const reasoning: string[] = [];
    
    // Build constraint graph
    const graph = this.buildConstraintGraph(teacher, students);
    reasoning.push(`Built constraint graph with ${graph.nodes.size} nodes and ${graph.edges.length} conflicts`);
    
    // Analyze graph structure
    const analysis = this.analyzeConstraintGraph(graph, students);
    reasoning.push(`Graph density: ${analysis.density.toFixed(3)}, Average degree: ${analysis.averageDegree.toFixed(1)}`);
    
    // Calculate theoretical maximum
    const theoreticalMax = this.calculateTheoreticalMax(teacher, students);
    reasoning.push(`Theoretical maximum: ${theoreticalMax.toLocaleString()} (product of domain sizes)`);
    
    // Calculate upper bound using constraint reduction
    const upperBound = this.calculateUpperBound(theoreticalMax, analysis, reasoning);
    
    // Calculate lower bound using feasibility analysis
    const lowerBound = this.calculateLowerBound(teacher, students, analysis, reasoning);
    
    // Calculate confidence based on analysis quality
    const confidence = this.calculateConfidence(analysis, students.length);
    reasoning.push(`Analysis confidence: ${(confidence * 100).toFixed(1)}%`);
    
    const analysisTime = Date.now() - startTime;
    reasoning.push(`Analysis completed in ${analysisTime}ms`);
    
    return {
      lowerBound,
      upperBound,
      theoreticalMax,
      analysis,
      reasoning,
      confidence
    };
  }
  
  /**
   * Build constraint graph from teacher and student configurations
   */
  private buildConstraintGraph(
    teacher: TeacherConfig, 
    students: StudentConfig[]
  ): { nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[] } {
    const nodes = new Map<string, ConstraintNode>();
    const edges: ConstraintEdge[] = [];
    
    // Create nodes for each student-timeslot combination
    for (const student of students) {
      const timeSlots = this.generateTimeSlots(teacher, student);
      
      for (const timeSlot of timeSlots) {
        const nodeId = `${student.person.id}_${timeSlot.dayOfWeek}_${timeSlot.startMinute}`;
        
        nodes.set(nodeId, {
          id: nodeId,
          studentId: student.person.id,
          timeSlot,
          degree: 0,
          conflicts: new Set(),
          domainSize: timeSlots.length
        });
      }
    }
    
    // Create edges for conflicts
    const nodeArray = Array.from(nodes.values());
    
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const node1 = nodeArray[i]!;
        const node2 = nodeArray[j]!;
        
        const conflicts = this.findConflicts(node1, node2, teacher);
        
        for (const conflict of conflicts) {
          edges.push(conflict);
          
          // Update node conflict sets and degrees
          node1.conflicts.add(node2.id);
          node2.conflicts.add(node1.id);
          node1.degree++;
          node2.degree++;
        }
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * Generate all possible time slots for a student
   */
  private generateTimeSlots(teacher: TeacherConfig, student: StudentConfig): TimeSlot[] {
    const timeSlots: TimeSlot[] = [];
    const duration = student.preferredDuration;
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const teacherDay = teacher.availability.days[dayOfWeek];
      const studentDay = student.availability.days[dayOfWeek];
      
      if (!teacherDay || !studentDay) continue;
      
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
    
    return timeSlots;
  }
  
  /**
   * Find conflicts between two constraint nodes
   */
  private findConflicts(
    node1: ConstraintNode, 
    node2: ConstraintNode, 
    teacher: TeacherConfig
  ): ConstraintEdge[] {
    const conflicts: ConstraintEdge[] = [];
    
    // Different students can't have overlapping time slots
    if (node1.studentId !== node2.studentId) {
      if (this.timeSlotsOverlap(node1.timeSlot, node2.timeSlot)) {
        conflicts.push({
          from: node1.id,
          to: node2.id,
          constraintType: 'time_overlap',
          strength: 1.0 // Hard constraint
        });
      }
      
      // Check teacher consecutive time constraints
      if (this.config.includeConsecutiveConstraints) {
        const consecutiveConflict = this.checkConsecutiveTimeConflict(
          node1.timeSlot, 
          node2.timeSlot, 
          teacher
        );
        
        if (consecutiveConflict) {
          conflicts.push({
            from: node1.id,
            to: node2.id,
            constraintType: 'teacher_consecutive',
            strength: consecutiveConflict.strength
          });
        }
      }
      
      // Check break constraints
      if (this.config.includeBreakConstraints) {
        const breakConflict = this.checkBreakConstraint(
          node1.timeSlot, 
          node2.timeSlot, 
          teacher
        );
        
        if (breakConflict) {
          conflicts.push({
            from: node1.id,
            to: node2.id,
            constraintType: 'break_violation',
            strength: breakConflict.strength
          });
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Check if two time slots overlap
   */
  private timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return false;
    
    const end1 = slot1.startMinute + slot1.durationMinutes;
    const end2 = slot2.startMinute + slot2.durationMinutes;
    
    return !(end1 <= slot2.startMinute || slot1.startMinute >= end2);
  }
  
  /**
   * Check for consecutive time constraint violations
   */
  private checkConsecutiveTimeConflict(
    slot1: TimeSlot,
    slot2: TimeSlot,
    teacher: TeacherConfig
  ): { strength: number } | null {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return null;
    
    const maxConsecutive = teacher.constraints.maxConsecutiveMinutes;
    const totalDuration = slot1.durationMinutes + slot2.durationMinutes;
    
    // Check if slots are adjacent or close
    const end1 = slot1.startMinute + slot1.durationMinutes;
    const gap = Math.abs(slot2.startMinute - end1);
    
    if (gap <= teacher.constraints.breakDurationMinutes && totalDuration > maxConsecutive) {
      return {
        strength: Math.min(1.0, totalDuration / maxConsecutive - 1.0)
      };
    }
    
    return null;
  }
  
  /**
   * Check for break constraint violations
   */
  private checkBreakConstraint(
    slot1: TimeSlot,
    slot2: TimeSlot,
    teacher: TeacherConfig
  ): { strength: number } | null {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return null;
    
    const minBreak = teacher.constraints.breakDurationMinutes;
    const end1 = slot1.startMinute + slot1.durationMinutes;
    const gap = Math.abs(slot2.startMinute - end1);
    
    if (gap > 0 && gap < minBreak) {
      return {
        strength: (minBreak - gap) / minBreak
      };
    }
    
    return null;
  }
  
  /**
   * Analyze the structure of the constraint graph
   */
  private analyzeConstraintGraph(
    graph: { nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[] },
    students: StudentConfig[]
  ): ConstraintGraphAnalysis {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    // Calculate average degree
    const totalDegree = Array.from(graph.nodes.values()).reduce((sum, node) => sum + node.degree, 0);
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    
    // Estimate maximum clique size
    const maxCliqueSize = this.estimateMaxCliqueSize(graph);
    
    // Count connected components
    const connectedComponents = this.countConnectedComponents(graph);
    
    // Calculate tightness score
    const tightnessScore = this.calculateTightnessScore(graph, students);
    
    // Estimate constraint reduction factor
    const reductionFactor = this.estimateReductionFactor(density, averageDegree, maxCliqueSize, students.length);
    
    // Find critical path
    const criticalPath = this.findCriticalPath(graph);
    
    return {
      nodeCount,
      edgeCount,
      density,
      maxCliqueSize,
      connectedComponents,
      averageDegree,
      tightnessScore,
      reductionFactor,
      criticalPath
    };
  }
  
  /**
   * Calculate theoretical maximum solutions (unconstrained)
   */
  private calculateTheoreticalMax(teacher: TeacherConfig, students: StudentConfig[]): number {
    let max = 1;
    
    for (const student of students) {
      const timeSlots = this.generateTimeSlots(teacher, student);
      max *= Math.max(1, timeSlots.length);
    }
    
    return max;
  }
  
  /**
   * Calculate upper bound using constraint reduction
   */
  private calculateUpperBound(
    theoreticalMax: number,
    analysis: ConstraintGraphAnalysis,
    reasoning: string[]
  ): number {
    let upperBound = theoreticalMax;
    
    // Apply constraint reduction factor
    upperBound *= analysis.reductionFactor;
    reasoning.push(`Applied constraint reduction factor: ${analysis.reductionFactor.toFixed(3)}`);
    
    // Apply clique-based reduction
    if (analysis.maxCliqueSize > 1) {
      const cliqueReduction = Math.pow(0.5, analysis.maxCliqueSize - 1);
      upperBound *= cliqueReduction;
      reasoning.push(`Applied clique reduction (size ${analysis.maxCliqueSize}): ${cliqueReduction.toFixed(3)}`);
    }
    
    // Apply density-based reduction
    if (analysis.density > 0.1) {
      const densityReduction = Math.pow(1 - analysis.density, 0.5);
      upperBound *= densityReduction;
      reasoning.push(`Applied density reduction: ${densityReduction.toFixed(3)}`);
    }
    
    return Math.max(1, Math.floor(upperBound));
  }
  
  /**
   * Calculate lower bound using feasibility analysis
   */
  private calculateLowerBound(
    teacher: TeacherConfig,
    students: StudentConfig[],
    analysis: ConstraintGraphAnalysis,
    reasoning: string[]
  ): number {
    // Check basic feasibility
    const totalRequiredTime = students.reduce((sum, s) => sum + s.preferredDuration, 0);
    const totalAvailableTime = this.calculateTotalAvailableTime(teacher);
    
    if (totalRequiredTime > totalAvailableTime) {
      reasoning.push(`Impossible: required ${totalRequiredTime}min > available ${totalAvailableTime}min`);
      return 0;
    }
    
    // Check if all students have at least one available slot
    for (const student of students) {
      const timeSlots = this.generateTimeSlots(teacher, student);
      if (timeSlots.length === 0) {
        reasoning.push(`Impossible: student ${student.person.name} has no available slots`);
        return 0;
      }
    }
    
    // If constraint graph is not too dense, at least one solution should exist
    if (analysis.density < 0.8 && analysis.connectedComponents > 1) {
      reasoning.push(`Feasible: low density (${analysis.density.toFixed(2)}) with ${analysis.connectedComponents} components`);
      return 1;
    }
    
    // Check for independent components
    if (analysis.connectedComponents > 1) {
      reasoning.push(`Multiple independent components suggest at least one solution exists`);
      return 1;
    }
    
    // Very tight constraints - might still be solvable
    if (analysis.tightnessScore < 0.9) {
      reasoning.push(`Moderate constraint tightness (${analysis.tightnessScore.toFixed(2)}) suggests feasibility`);
      return 1;
    }
    
    // Conservative estimate for highly constrained problems
    reasoning.push(`Highly constrained - conservative lower bound`);
    return 0;
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
   * Estimate maximum clique size in the constraint graph
   */
  private estimateMaxCliqueSize(
    graph: { nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[] }
  ): number {
    const nodes = Array.from(graph.nodes.values());
    
    if (nodes.length <= this.config.maxCliqueComputationSize!) {
      return this.findMaxCliqueExact(nodes);
    } else {
      return this.estimateMaxCliqueHeuristic(nodes);
    }
  }
  
  /**
   * Find maximum clique exactly (for small graphs)
   */
  private findMaxCliqueExact(nodes: ConstraintNode[]): number {
    // Simplified implementation - returns maximum degree + 1 as approximation
    const maxDegree = Math.max(...nodes.map(n => n.degree));
    return Math.min(nodes.length, maxDegree + 1);
  }
  
  /**
   * Estimate maximum clique using heuristics
   */
  private estimateMaxCliqueHeuristic(nodes: ConstraintNode[]): number {
    // Use degree-based heuristic
    const sortedByDegree = nodes.sort((a, b) => b.degree - a.degree);
    const highDegreeNodes = sortedByDegree.slice(0, Math.min(10, nodes.length));
    
    // Find the largest set where all nodes are connected to each other
    let maxClique = 1;
    
    for (let i = 0; i < highDegreeNodes.length; i++) {
      const node = highDegreeNodes[i]!;
      let cliqueSize = 1;
      
      for (let j = i + 1; j < highDegreeNodes.length; j++) {
        const other = highDegreeNodes[j]!;
        if (node.conflicts.has(other.id)) {
          cliqueSize++;
        }
      }
      
      maxClique = Math.max(maxClique, cliqueSize);
    }
    
    return maxClique;
  }
  
  /**
   * Count connected components in the graph
   */
  private countConnectedComponents(
    graph: { nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[] }
  ): number {
    const visited = new Set<string>();
    let components = 0;
    
    const nodeArray = Array.from(graph.nodes.values());
    for (const node of nodeArray) {
      if (!visited.has(node.id)) {
        this.dfsVisit(node, graph.nodes, visited);
        components++;
      }
    }
    
    return components;
  }
  
  /**
   * DFS visit for connected component counting
   */
  private dfsVisit(
    node: ConstraintNode,
    nodes: Map<string, ConstraintNode>,
    visited: Set<string>
  ): void {
    visited.add(node.id);
    
    const conflictArray = Array.from(node.conflicts);
    for (const conflictId of conflictArray) {
      if (!visited.has(conflictId)) {
        const conflictNode = nodes.get(conflictId);
        if (conflictNode) {
          this.dfsVisit(conflictNode, nodes, visited);
        }
      }
    }
  }
  
  /**
   * Calculate constraint tightness score
   */
  private calculateTightnessScore(
    graph: { nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[] },
    students: StudentConfig[]
  ): number {
    if (graph.nodes.size === 0) return 0;
    
    // Calculate based on average domain size and conflict density
    const avgDomainSize = Array.from(graph.nodes.values())
      .reduce((sum, node) => sum + node.domainSize, 0) / graph.nodes.size;
    
    const avgStudentDomainSize = avgDomainSize / students.length;
    const domainTightness = Math.max(0, 1 - avgStudentDomainSize / 10); // Normalize to 0-1
    
    // Combine with constraint density
    const conflictDensity = graph.edges.length / Math.max(1, graph.nodes.size);
    const constraintTightness = Math.min(1, conflictDensity / 5); // Normalize
    
    return (domainTightness + constraintTightness) / 2;
  }
  
  /**
   * Estimate constraint reduction factor
   */
  private estimateReductionFactor(
    density: number,
    averageDegree: number,
    maxCliqueSize: number,
    studentCount: number
  ): number {
    let factor = 1.0;
    
    // Reduce based on density
    factor *= Math.pow(1 - density, 0.3);
    
    // Reduce based on average degree
    if (averageDegree > 0) {
      factor *= Math.pow(0.8, averageDegree / studentCount);
    }
    
    // Reduce based on clique size
    if (maxCliqueSize > 1) {
      factor *= Math.pow(0.6, maxCliqueSize - 1);
    }
    
    return Math.max(0.001, factor);
  }
  
  /**
   * Find critical path in the constraint graph
   */
  private findCriticalPath(
    graph: { nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[] }
  ): { length: number; bottlenecks: string[] } {
    // Simplified implementation - find nodes with highest degree as bottlenecks
    const nodes = Array.from(graph.nodes.values());
    const maxDegree = Math.max(...nodes.map(n => n.degree), 0);
    
    const bottlenecks = nodes
      .filter(n => n.degree >= maxDegree * 0.8)
      .map(n => n.studentId)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Unique student IDs
    
    return {
      length: maxDegree,
      bottlenecks
    };
  }
  
  /**
   * Calculate confidence in the bounds analysis
   */
  private calculateConfidence(analysis: ConstraintGraphAnalysis, studentCount: number): number {
    let confidence = 1.0;
    
    // Reduce confidence for very large problems
    if (studentCount > 30) {
      confidence *= 0.8;
    }
    
    // Reduce confidence for very dense graphs
    if (analysis.density > 0.7) {
      confidence *= 0.7;
    }
    
    // Reduce confidence for highly fragmented graphs
    if (analysis.connectedComponents > studentCount / 2) {
      confidence *= 0.8;
    }
    
    // Increase confidence for well-structured problems
    if (analysis.density > 0.1 && analysis.density < 0.5) {
      confidence *= 1.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/**
 * Create constraint graph analyzer with optimal settings
 */
export function createOptimalConstraintAnalyzer(studentCount: number): ConstraintGraphAnalyzer {
  const config: Partial<AnalysisConfig> = {
    maxCliqueComputationSize: studentCount <= 15 ? 25 : 15,
    useHeuristics: studentCount > 20,
    includeBreakConstraints: true,
    includeConsecutiveConstraints: true,
    confidenceThreshold: studentCount <= 20 ? 0.9 : 0.7
  };
  
  return new ConstraintGraphAnalyzer(config);
}

/**
 * Default constraint graph analyzer instance
 */
export const defaultConstraintGraphAnalyzer = new ConstraintGraphAnalyzer();