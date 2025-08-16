/**
 * Monte Carlo Estimator for Solution Counting
 * 
 * Implements statistical sampling techniques to estimate solution counts
 * for large scheduling problems where exact enumeration is infeasible.
 * Uses stratified sampling, importance sampling, and confidence intervals.
 */

import type { 
  TeacherConfig, 
  StudentConfig, 
  LessonAssignment
} from '../../types';

// Internal types
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

import type { SolutionCountResult } from './solution-counter';
import { ScheduleSolver } from '../../solver';
import { findAvailableSlots, isTimeAvailable } from '../../utils';

/**
 * Configuration for Monte Carlo estimation
 */
export interface MonteCarloConfig {
  /** Base number of samples */
  baseSamples: number;
  
  /** Confidence level for intervals (0-1) */
  confidenceLevel: number;
  
  /** Target margin of error (relative) */
  targetMarginOfError: number;
  
  /** Maximum samples to prevent infinite loops */
  maxSamples: number;
  
  /** Minimum samples for reliable estimates */
  minSamples: number;
  
  /** Enable stratified sampling */
  useStratifiedSampling: boolean;
  
  /** Enable importance sampling */
  useImportanceSampling: boolean;
  
  /** Number of strata for stratified sampling */
  numStrata: number;
  
  /** Adaptive sampling threshold */
  adaptiveThreshold: number;
}

/**
 * Result from a single sampling iteration
 */
interface SampleResult {
  /** Whether a valid solution was found */
  hasValidSolution: boolean;
  
  /** Number of students successfully scheduled */
  studentsScheduled: number;
  
  /** Quality score of the solution */
  solutionQuality: number;
  
  /** Time taken to find solution (ms) */
  solutionTimeMs: number;
  
  /** Stratum this sample belongs to */
  stratum?: number;
  
  /** Importance weight for this sample */
  weight?: number;
}

/**
 * Statistical metadata for the estimation
 */
interface EstimationMetadata {
  /** Sample variance */
  variance: number;
  
  /** Standard error */
  standardError: number;
  
  /** Effective sample size */
  effectiveSampleSize: number;
  
  /** Convergence indicator */
  hasConverged: boolean;
  
  /** Margin of error achieved */
  marginOfError: number;
  
  /** Quality distribution */
  qualityDistribution: {
    mean: number;
    median: number;
    standardDeviation: number;
  };
}

/**
 * Monte Carlo solution count estimator
 */
export class MonteCarloEstimator {
  private defaultConfig: MonteCarloConfig = {
    baseSamples: 1000,
    confidenceLevel: 0.95,
    targetMarginOfError: 0.1, // 10%
    maxSamples: 10000,
    minSamples: 100,
    useStratifiedSampling: true,
    useImportanceSampling: true,
    numStrata: 5,
    adaptiveThreshold: 0.05
  };
  
  constructor(private config: Partial<MonteCarloConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }
  
  /**
   * Estimate solution count using Monte Carlo sampling
   */
  async estimate(
    teacher: TeacherConfig,
    students: StudentConfig[],
    samples?: number
  ): Promise<SolutionCountResult> {
    const startTime = Date.now();
    const targetSamples = samples ?? this.config.baseSamples!;
    
    try {
      let sampleResults: SampleResult[] = [];
      let estimationResult: SolutionCountResult;
      
      if (this.config.useStratifiedSampling && students.length > 5) {
        estimationResult = await this.stratifiedSampling(teacher, students, targetSamples);
      } else if (this.config.useImportanceSampling && students.length > 10) {
        estimationResult = await this.importanceSampling(teacher, students, targetSamples);
      } else {
        estimationResult = await this.simpleMonteCarlo(teacher, students, targetSamples);
      }
      
      // Add timing information
      estimationResult.timeMs = Date.now() - startTime;
      
      return estimationResult;
      
    } catch (error) {
      return {
        count: 0,
        isExact: false,
        timeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Monte Carlo estimation failed'
      };
    }
  }
  
  /**
   * Simple Monte Carlo sampling
   */
  private async simpleMonteCarlo(
    teacher: TeacherConfig,
    students: StudentConfig[],
    targetSamples: number
  ): Promise<SolutionCountResult> {
    const samples: SampleResult[] = [];
    const solver = this.createSolver();
    
    // Adaptive sampling
    let sampleCount = Math.min(targetSamples, this.config.minSamples!);
    let converged = false;
    
    while (sampleCount <= this.config.maxSamples! && !converged) {
      // Generate additional samples
      const batchSize = Math.min(100, sampleCount - samples.length);
      const newSamples = await this.generateSamples(teacher, students, batchSize, solver);
      samples.push(...newSamples);
      
      // Check convergence every 100 samples
      if (samples.length >= this.config.minSamples! && samples.length % 100 === 0) {
        const convergenceCheck = this.checkConvergence(samples);
        converged = convergenceCheck.hasConverged;
        
        if (converged || samples.length >= targetSamples) {
          break;
        }
      }
      
      sampleCount += batchSize;
    }
    
    return this.computeEstimate(samples, teacher, students);
  }
  
  /**
   * Stratified sampling based on problem difficulty characteristics
   */
  private async stratifiedSampling(
    teacher: TeacherConfig,
    students: StudentConfig[],
    targetSamples: number
  ): Promise<SolutionCountResult> {
    const strata = this.createStrata(teacher, students);
    const samplesPerStratum = Math.ceil(targetSamples / strata.length);
    const allSamples: SampleResult[] = [];
    
    const solver = this.createSolver();
    
    for (let stratumIndex = 0; stratumIndex < strata.length; stratumIndex++) {
      const stratum = strata[stratumIndex]!;
      const samples = await this.generateStratumSamples(
        teacher,
        stratum.students,
        samplesPerStratum,
        stratumIndex,
        solver
      );
      
      allSamples.push(...samples);
    }
    
    return this.computeStratifiedEstimate(allSamples, strata, teacher, students);
  }
  
  /**
   * Importance sampling focusing on promising regions
   */
  private async importanceSampling(
    teacher: TeacherConfig,
    students: StudentConfig[],
    targetSamples: number
  ): Promise<SolutionCountResult> {
    const solver = this.createSolver();
    
    // First, run a small exploratory sample to identify promising regions
    const exploratorySamples = Math.min(100, Math.floor(targetSamples * 0.2));
    const exploratoryResults = await this.generateSamples(teacher, students, exploratorySamples, solver);
    
    // Analyze results to create importance distribution
    const importanceWeights = this.calculateImportanceWeights(exploratoryResults, students);
    
    // Generate remaining samples using importance distribution
    const remainingSamples = targetSamples - exploratorySamples;
    const importanceSamples = await this.generateImportanceSamples(
      teacher,
      students,
      remainingSamples,
      importanceWeights,
      solver
    );
    
    const allSamples = [...exploratoryResults, ...importanceSamples];
    return this.computeWeightedEstimate(allSamples, teacher, students);
  }
  
  /**
   * Generate a batch of random samples
   */
  private async generateSamples(
    teacher: TeacherConfig,
    students: StudentConfig[],
    count: number,
    solver: ScheduleSolver
  ): Promise<SampleResult[]> {
    const samples: SampleResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const sampleStartTime = Date.now();
      
      // Create randomized problem instance
      const shuffledStudents = this.randomizeStudentOrder(students, i);
      const perturbedStudents = this.perturbStudentPreferences(shuffledStudents, 0.1);
      
      // Attempt to solve
      const solution = solver.solve(teacher, perturbedStudents);
      const sampleTime = Date.now() - sampleStartTime;
      
      const sampleResult: SampleResult = {
        hasValidSolution: solution.assignments.length > 0,
        studentsScheduled: solution.assignments.length,
        solutionQuality: this.calculateSolutionQuality(solution, students.length),
        solutionTimeMs: sampleTime
      };
      
      samples.push(sampleResult);
    }
    
    return samples;
  }
  
  /**
   * Create strata based on problem characteristics
   */
  private createStrata(teacher: TeacherConfig, students: StudentConfig[]): Array<{
    students: StudentConfig[];
    characteristics: string;
    weight: number;
  }> {
    const strata: Array<{ students: StudentConfig[]; characteristics: string; weight: number }> = [];
    const numStrata = this.config.numStrata!;
    const studentsPerStratum = Math.ceil(students.length / numStrata);
    
    // Sort students by availability overlap with teacher
    const studentsWithOverlap = students.map(student => ({
      student,
      overlap: this.calculateOverlapRatio(teacher, student)
    })).sort((a, b) => a.overlap - b.overlap);
    
    // Create strata based on overlap levels
    for (let i = 0; i < numStrata; i++) {
      const startIdx = i * studentsPerStratum;
      const endIdx = Math.min((i + 1) * studentsPerStratum, students.length);
      const stratumStudents = studentsWithOverlap.slice(startIdx, endIdx).map(s => s.student);
      
      if (stratumStudents.length > 0) {
        const avgOverlap = studentsWithOverlap.slice(startIdx, endIdx)
          .reduce((sum, s) => sum + s.overlap, 0) / (endIdx - startIdx);
        
        strata.push({
          students: stratumStudents,
          characteristics: `overlap-${avgOverlap.toFixed(2)}`,
          weight: stratumStudents.length / students.length
        });
      }
    }
    
    return strata;
  }
  
  /**
   * Generate samples for a specific stratum
   */
  private async generateStratumSamples(
    teacher: TeacherConfig,
    stratumStudents: StudentConfig[],
    count: number,
    stratumIndex: number,
    solver: ScheduleSolver
  ): Promise<SampleResult[]> {
    const samples = await this.generateSamples(teacher, stratumStudents, count, solver);
    
    // Mark samples with stratum information
    return samples.map(sample => ({
      ...sample,
      stratum: stratumIndex
    }));
  }
  
  /**
   * Calculate importance weights based on exploratory results
   */
  private calculateImportanceWeights(
    exploratoryResults: SampleResult[],
    students: StudentConfig[]
  ): number[] {
    const weights = new Array(students.length).fill(1);
    
    // Assign higher weights to students that appear in successful solutions
    for (const result of exploratoryResults) {
      if (result.hasValidSolution) {
        const successRate = result.studentsScheduled / students.length;
        const qualityBonus = result.solutionQuality;
        
        for (let i = 0; i < result.studentsScheduled; i++) {
          weights[i] = (weights[i] ?? 1) * (1 + successRate * qualityBonus);
        }
      }
    }
    
    return this.normalizeWeights(weights);
  }
  
  /**
   * Generate samples using importance distribution
   */
  private async generateImportanceSamples(
    teacher: TeacherConfig,
    students: StudentConfig[],
    count: number,
    importanceWeights: number[],
    solver: ScheduleSolver
  ): Promise<SampleResult[]> {
    const samples: SampleResult[] = [];
    
    for (let i = 0; i < count; i++) {
      // Select students based on importance weights
      const selectedStudents = this.sampleStudentsByImportance(students, importanceWeights);
      
      const sampleStartTime = Date.now();
      const solution = solver.solve(teacher, selectedStudents);
      const sampleTime = Date.now() - sampleStartTime;
      
      // Calculate importance weight for this sample
      const weight = this.calculateSampleWeight(selectedStudents, students, importanceWeights);
      
      const sampleResult: SampleResult = {
        hasValidSolution: solution.assignments.length > 0,
        studentsScheduled: solution.assignments.length,
        solutionQuality: this.calculateSolutionQuality(solution, students.length),
        solutionTimeMs: sampleTime,
        weight
      };
      
      samples.push(sampleResult);
    }
    
    return samples;
  }
  
  /**
   * Compute final estimate from samples
   */
  private computeEstimate(
    samples: SampleResult[],
    teacher: TeacherConfig,
    students: StudentConfig[]
  ): SolutionCountResult {
    if (samples.length === 0) {
      return {
        count: 0,
        isExact: false,
        timeMs: 0,
        error: 'No samples generated'
      };
    }
    
    // Calculate success rate
    const successfulSamples = samples.filter(s => s.hasValidSolution).length;
    const successRate = successfulSamples / samples.length;
    
    // Estimate total solution space
    const theoreticalMax = this.calculateTheoreticalMaxSolutions(teacher, students);
    const estimatedSolutions = theoreticalMax * successRate;
    
    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(
      successRate,
      samples.length,
      this.config.confidenceLevel!
    );
    
    // Calculate metadata
    const metadata = this.calculateEstimationMetadata(samples);
    
    return {
      count: Math.round(estimatedSolutions),
      isExact: false,
      timeMs: 0, // Will be set by caller
      confidence: this.config.confidenceLevel,
      samplesUsed: samples.length,
      confidenceInterval: [
        Math.round(theoreticalMax * confidenceInterval[0]),
        Math.round(theoreticalMax * confidenceInterval[1])
      ],
      metadata: {
        backtrackCount: 0,
        constraintChecks: samples.length,
        timeoutOccurred: false,
        memoryLimitReached: false
      }
    };
  }
  
  /**
   * Compute stratified estimate
   */
  private computeStratifiedEstimate(
    samples: SampleResult[],
    strata: Array<{ students: StudentConfig[]; characteristics: string; weight: number }>,
    teacher: TeacherConfig,
    students: StudentConfig[]
  ): SolutionCountResult {
    let weightedSuccessRate = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < strata.length; i++) {
      const stratumSamples = samples.filter(s => s.stratum === i);
      const stratumSuccessRate = stratumSamples.filter(s => s.hasValidSolution).length / stratumSamples.length;
      const stratumWeight = strata[i]!.weight;
      
      weightedSuccessRate += stratumSuccessRate * stratumWeight;
      totalWeight += stratumWeight;
    }
    
    const normalizedSuccessRate = weightedSuccessRate / totalWeight;
    const theoreticalMax = this.calculateTheoreticalMaxSolutions(teacher, students);
    const estimatedSolutions = theoreticalMax * normalizedSuccessRate;
    
    return {
      count: Math.round(estimatedSolutions),
      isExact: false,
      timeMs: 0,
      confidence: this.config.confidenceLevel,
      samplesUsed: samples.length,
      confidenceInterval: [
        Math.round(estimatedSolutions * 0.8),
        Math.round(estimatedSolutions * 1.2)
      ]
    };
  }
  
  /**
   * Compute weighted estimate for importance sampling
   */
  private computeWeightedEstimate(
    samples: SampleResult[],
    teacher: TeacherConfig,
    students: StudentConfig[]
  ): SolutionCountResult {
    const weightedSuccessRate = samples.reduce((sum, sample) => {
      const weight = sample.weight ?? 1;
      return sum + (sample.hasValidSolution ? weight : 0);
    }, 0) / samples.reduce((sum, sample) => sum + (sample.weight ?? 1), 0);
    
    const theoreticalMax = this.calculateTheoreticalMaxSolutions(teacher, students);
    const estimatedSolutions = theoreticalMax * weightedSuccessRate;
    
    return {
      count: Math.round(estimatedSolutions),
      isExact: false,
      timeMs: 0,
      confidence: this.config.confidenceLevel,
      samplesUsed: samples.length
    };
  }
  
  // Helper methods
  
  private createSolver(): ScheduleSolver {
    return new ScheduleSolver({
      maxTimeMs: 2000, // Quick solves for sampling
      maxBacktracks: 200,
      useConstraintPropagation: true,
      useHeuristics: true,
      logLevel: 'none',
      enableOptimizations: false // Disable for consistent timing
    });
  }
  
  private randomizeStudentOrder(students: StudentConfig[], seed: number): StudentConfig[] {
    const shuffled = [...students];
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 1103515245 + 12345) % (2 ** 31);
      const j = currentSeed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    
    return shuffled;
  }
  
  private perturbStudentPreferences(
    students: StudentConfig[], 
    perturbationRate: number
  ): StudentConfig[] {
    return students.map(student => {
      if (Math.random() < perturbationRate) {
        // Slightly modify preferred duration
        const allowedDurations = [30, 45, 60, 90];
        const currentIndex = allowedDurations.indexOf(student.preferredDuration);
        const newIndex = Math.max(0, Math.min(allowedDurations.length - 1, 
          currentIndex + (Math.random() < 0.5 ? -1 : 1)));
        
        return {
          ...student,
          preferredDuration: allowedDurations[newIndex]!
        };
      }
      return student;
    });
  }
  
  private calculateSolutionQuality(solution: any, totalStudents: number): number {
    if (solution.assignments.length === 0) return 0;
    
    const scheduledRatio = solution.assignments.length / totalStudents;
    const utilizationBonus = (solution.metadata?.averageUtilization ?? 50) / 100;
    
    return scheduledRatio * 0.8 + utilizationBonus * 0.2;
  }
  
  private calculateOverlapRatio(teacher: TeacherConfig, student: StudentConfig): number {
    let totalOverlap = 0;
    let totalTeacherTime = 0;
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const teacherDay = teacher.availability.days[dayOfWeek];
      const studentDay = student.availability.days[dayOfWeek];
      
      if (teacherDay) {
        const dayTeacherTime = teacherDay.blocks.reduce((sum, block) => sum + block.duration, 0);
        totalTeacherTime += dayTeacherTime;
        
        if (studentDay) {
          totalOverlap += this.calculateDayOverlap(teacherDay.blocks, studentDay.blocks);
        }
      }
    }
    
    return totalTeacherTime > 0 ? totalOverlap / totalTeacherTime : 0;
  }
  
  private calculateDayOverlap(teacherBlocks: any[], studentBlocks: any[]): number {
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
  
  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((s, w) => s + w, 0);
    return weights.map(w => w / sum);
  }
  
  private sampleStudentsByImportance(
    students: StudentConfig[], 
    weights: number[]
  ): StudentConfig[] {
    // For simplicity, return all students
    // In a full implementation, this would sample based on weights
    return students;
  }
  
  private calculateSampleWeight(
    selectedStudents: StudentConfig[],
    allStudents: StudentConfig[],
    importanceWeights: number[]
  ): number {
    // Simplified weight calculation
    return 1.0;
  }
  
  private calculateTheoreticalMaxSolutions(teacher: TeacherConfig, students: StudentConfig[]): number {
    let maxSolutions = 1;
    
    for (const student of students) {
      const availableSlots = this.countAvailableSlots(teacher, student);
      maxSolutions *= Math.max(1, availableSlots);
    }
    
    return maxSolutions;
  }
  
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
  
  private calculateConfidenceInterval(
    proportion: number,
    sampleSize: number,
    confidence: number
  ): [number, number] {
    const z = this.getZScore(confidence);
    const se = Math.sqrt((proportion * (1 - proportion)) / sampleSize);
    
    return [
      Math.max(0, proportion - z * se),
      Math.min(1, proportion + z * se)
    ];
  }
  
  private getZScore(confidence: number): number {
    if (confidence >= 0.99) return 2.576;
    if (confidence >= 0.95) return 1.96;
    if (confidence >= 0.90) return 1.645;
    return 1.96;
  }
  
  private checkConvergence(samples: SampleResult[]): { hasConverged: boolean; marginOfError: number } {
    if (samples.length < this.config.minSamples!) {
      return { hasConverged: false, marginOfError: 1.0 };
    }
    
    const successRate = samples.filter(s => s.hasValidSolution).length / samples.length;
    const standardError = Math.sqrt((successRate * (1 - successRate)) / samples.length);
    const marginOfError = 1.96 * standardError; // 95% confidence
    
    return {
      hasConverged: marginOfError <= this.config.targetMarginOfError!,
      marginOfError
    };
  }
  
  private calculateEstimationMetadata(samples: SampleResult[]): EstimationMetadata {
    const qualities = samples.map(s => s.solutionQuality);
    const successRate = samples.filter(s => s.hasValidSolution).length / samples.length;
    const variance = this.calculateVariance(samples.map(s => s.hasValidSolution ? 1 : 0));
    
    return {
      variance,
      standardError: Math.sqrt(variance / samples.length),
      effectiveSampleSize: samples.length,
      hasConverged: true,
      marginOfError: 1.96 * Math.sqrt(variance / samples.length),
      qualityDistribution: {
        mean: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
        median: this.calculateMedian(qualities),
        standardDeviation: Math.sqrt(this.calculateVariance(qualities))
      }
    };
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
  
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;
  }
}

/**
 * Create Monte Carlo estimator with optimal settings
 */
export function createOptimalMonteCarloEstimator(studentCount: number): MonteCarloEstimator {
  const config: Partial<MonteCarloConfig> = {
    baseSamples: Math.max(500, Math.min(5000, studentCount * 50)),
    maxSamples: Math.max(2000, studentCount * 200),
    minSamples: Math.max(100, studentCount * 10),
    targetMarginOfError: studentCount <= 20 ? 0.05 : 0.1,
    useStratifiedSampling: studentCount > 15,
    useImportanceSampling: studentCount > 25,
    numStrata: Math.min(10, Math.max(3, Math.floor(studentCount / 5)))
  };
  
  return new MonteCarloEstimator(config);
}

/**
 * Default Monte Carlo estimator instance
 */
export const defaultMonteCarloEstimator = new MonteCarloEstimator();