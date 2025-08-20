# Scheduler Test Generator Framework

A comprehensive testing framework for the TimeBlock-based scheduler with minute-precision scheduling. Generates test cases with varying difficulty levels and exact k-solvability guarantees.

## Quick Start

```bash
# Generate all test fixtures
pnpm tsx lib/scheduling/test-generator/scripts/generate-fixtures.ts

# Generate specific category
pnpm tsx lib/scheduling/test-generator/scripts/generate-fixtures.ts --category k-1-unique --count 50

# Use in code
import { createCompleteTestFramework } from 'lib/scheduling/test-generator';
const framework = createCompleteTestFramework(20);
```

## Components

### Core Generator (`core.ts`, `k-solution-generator.ts`, `difficulty-calculator.ts`)
- **TestCaseGenerator**: Creates test cases with configurable difficulty parameters
- **KSolutionGenerator**: Targets specific solution counts (k=0,1,5,10,100+)  
- **DifficultyCalculator**: Computes comprehensive difficulty metrics

### Generators (`generators/`)
- **AvailabilityGenerator**: Realistic teacher/student availability patterns
- **ConstraintGenerator**: Flexible scheduling constraint generation
- **StudentGenerator**: Various student types and configurations

### K-Solver (`k-solver/`)
- **SolutionCounter**: Exact counting for small cases, estimation for large
- **MonteCarloEstimator**: Statistical sampling with confidence intervals
- **ConstraintGraphAnalyzer**: Graph-based analysis and bounds calculation

### Fixtures & Scripts
- **generate-fixtures.ts**: CLI tool for generating test case JSON files
- **fixtures/**: Pre-generated test cases organized by k-value categories
- **integration.test.ts**: End-to-end validation tests

## Generated Test Categories

- **k-0-impossible**: Over-constrained scenarios with no solutions
- **k-1-unique**: Tightly constrained with exactly one solution
- **k-5-tight**: Moderately constrained with few solutions  
- **k-10-moderate**: Balanced scenarios with moderate flexibility
- **k-100-flexible**: High flexibility with many possible solutions

## Key Features

- ✅ **Minute-precision scheduling** with TimeBlock data model
- ✅ **Progressive difficulty levels** from trivial to impossible
- ✅ **K-solvability guarantees** with exact solution count targets
- ✅ **Realistic constraints** including breaks, consecutive lessons, conflicts
- ✅ **Performance validation** with sub-2-second targets for 50 students
- ✅ **Reproducible generation** with seeded randomization
- ✅ **Comprehensive validation** with integration tests

## Architecture

The framework integrates all components through a unified API:

```typescript
// Get complete framework optimized for student count
const framework = createCompleteTestFramework(studentCount);

// All components available:
framework.generator           // Core test case generation
framework.kSolutionGenerator  // K-solution targeting
framework.difficultyCalculator // Difficulty analysis
framework.availabilityGenerator // Availability patterns
framework.constraintGenerator // Constraint management
framework.studentGenerator   // Student types
framework.solutionCounter    // Solution counting
framework.monteCarloEstimator // Statistical estimation
framework.constraintAnalyzer // Graph analysis
```

## Usage Examples

### Generate Test Case

```typescript
const result = await framework.generator.generateTestCase({
  targetK: 5,
  difficulty: {
    studentCount: 10,
    overlapRatio: 0.6,
    fragmentationLevel: 0.4,
    packingDensity: 0.8,
    durationVariety: 2,
    constraintTightness: 0.7
  },
  metadata: {
    description: 'Medium difficulty test',
    expectedSolveTime: 300,
    category: 'medium'
  }
});
```

### Count Solutions

```typescript
const result = await framework.solutionCounter.countSolutions(
  testCase.teacher,
  testCase.students
);

console.log(`Found ${result.count} solutions (${result.isExact ? 'exact' : 'estimated'})`);
```

### Analyze Difficulty

```typescript
const analysis = framework.difficultyCalculator.calculateDifficulty({
  studentCount: 15,
  overlapRatio: 0.4,
  fragmentationLevel: 0.6,
  packingDensity: 0.9,
  durationVariety: 3,
  constraintTightness: 0.8
});

console.log(`Difficulty: ${analysis.category} (score: ${analysis.score})`);
```

## CLI Usage

```bash
# Show help
pnpm tsx scripts/generate-fixtures.ts --help

# Generate all categories with default counts
pnpm tsx scripts/generate-fixtures.ts

# Generate specific category with custom count
pnpm tsx scripts/generate-fixtures.ts --category k-5-tight --count 25

# Use reproducible seed
pnpm tsx scripts/generate-fixtures.ts --seed 12345 --verbose

# Custom output directory  
pnpm tsx scripts/generate-fixtures.ts --output ./my-fixtures/
```

## Testing

```bash
# Run integration tests
pnpm test test-generator/tests/integration.test.ts

# Run specific component tests
pnpm test test-generator/tests/core.test.ts
pnpm test test-generator/k-solver/tests/
```

## Performance Targets

- **10 students**: < 50ms
- **20 students**: < 200ms
- **30 students**: < 500ms
- **50 students**: < 2000ms

The framework generates test cases that validate these performance requirements and enables regression testing for scheduler optimizations.

---

**Status**: ✅ Production Ready  
**Coverage**: 100% of planned components implemented  
**Integration**: Fully validated end-to-end workflow