/**
 * Test Generator Framework - Main Exports
 * 
 * Core test case generation framework for the scheduler hardness tests
 */

// Core interfaces and types
export type {
  DifficultyParams,
  TestCaseConfig,
  TestCaseMetadata,
  TestCase,
  TestSuite,
  GenerationResult
} from './core';

// Core generator class
export {
  TestCaseGenerator,
  defaultGenerator,
  createSeededGenerator
} from './core';

// K-solution generation
export type {
  KSolutionConfig,
  SolutionCountResult
} from './k-solution-generator';

export {
  KSolutionGenerator,
  KSolutionPresets,
  defaultKSolutionGenerator,
  kSolutionPresets
} from './k-solution-generator';

// Difficulty calculation
export type {
  DifficultyBreakdown,
  DifficultyWeights,
  SchedulingAnalysis
} from './difficulty-calculator';

export {
  DifficultyCalculator,
  DifficultyUtils,
  defaultDifficultyCalculator,
  difficultyUtils
} from './difficulty-calculator';

// Availability generation
export type {
  TimeRange,
  AvailabilityConfig,
  AvailabilityPattern
} from './generators/availability-generator';

export {
  AvailabilityGenerator,
  AvailabilityPresets,
  defaultAvailabilityGenerator,
  availabilityPresets
} from './generators/availability-generator';

// Constraint generation
export type {
  ConstraintStrictness,
  ConstraintConfig,
  ConstraintAnalysis
} from './generators/constraint-generator';

export {
  ConstraintGenerator,
  ConstraintPresets,
  defaultConstraintGenerator,
  constraintPresets
} from './generators/constraint-generator';

// Student generation
export type {
  StudentType,
  StudentGenerationConfig,
  StudentSetAnalysis
} from './generators/student-generator';

export {
  StudentGenerator,
  StudentPresets,
  defaultStudentGenerator,
  studentPresets
} from './generators/student-generator';

// K-solver components for solution counting and analysis
export type {
  CountingConfig,
  SolutionCountResult as CounterSolutionCountResult
} from './k-solver/solution-counter';

export {
  SolutionCounter,
  createOptimalSolutionCounter,
  defaultSolutionCounter
} from './k-solver/solution-counter';

export type {
  MonteCarloConfig
} from './k-solver/monte-carlo-estimator';

export {
  MonteCarloEstimator,
  createOptimalMonteCarloEstimator,
  defaultMonteCarloEstimator
} from './k-solver/monte-carlo-estimator';

// Constraint graph analysis components (commented out due to missing exports)
// export type {
//   AnalysisConfig,
//   ConstraintGraphAnalysis,
//   GraphMetrics
// } from './k-solver/constraint-graph-analyzer';

// export {
//   ConstraintGraphAnalyzer,
//   createOptimalConstraintAnalyzer,
//   defaultConstraintGraphAnalyzer
// } from './k-solver/constraint-graph-analyzer';

// Convenience factory functions for complete workflow (commented out due to dependency issues)
// export function createCompleteTestFramework(studentCount: number) {
//   return {
//     generator: createSeededGenerator(Date.now()),
//     kSolutionGenerator: defaultKSolutionGenerator,
//     difficultyCalculator: defaultDifficultyCalculator,
//     availabilityGenerator: defaultAvailabilityGenerator,
//     constraintGenerator: defaultConstraintGenerator,
//     studentGenerator: defaultStudentGenerator,
//     solutionCounter: createOptimalSolutionCounter(studentCount),
//     monteCarloEstimator: createOptimalMonteCarloEstimator(studentCount)
//     // constraintAnalyzer: createOptimalConstraintAnalyzer(studentCount) // Commented out due to missing exports
//   };
// }