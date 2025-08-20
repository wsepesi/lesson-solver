#!/usr/bin/env node
/**
 * Generate Test Fixtures Script
 * 
 * Creates JSON test fixture files for the scheduler hardness testing framework.
 * Generates test cases with specific k-values and difficulty levels for
 * reproducible testing and benchmarking.
 * 
 * Usage:
 *   pnpm tsx lib/scheduling/test-generator/scripts/generate-fixtures.ts
 *   pnpm tsx lib/scheduling/test-generator/scripts/generate-fixtures.ts --category hard --count 50
 *   pnpm tsx lib/scheduling/test-generator/scripts/generate-fixtures.ts --seed 12345 --output custom-fixtures/
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { parseArgs } from 'util';

import {
  TestCaseGenerator,
  KSolutionGenerator,
  type TestCase,
  type TestSuite,
  type DifficultyParams
} from '../index';

import {
  HeuristicAwareGenerator,
  HeuristicMode,
  type HeuristicAwareConfig
} from '../heuristic-aware-generator';

// ============================================================================
// CLI CONFIGURATION
// ============================================================================

interface CLIOptions {
  category?: string;
  count?: number;
  seed?: number;
  output?: string;
  help?: boolean;
  verbose?: boolean;
}

const DEFAULT_COUNTS = {
  'k-0-impossible': 20,
  'k-1-unique': 30,
  'k-5-tight': 25,
  'k-10-moderate': 20,
  'k-100-flexible': 15,
  // New heuristic-aware categories
  'heuristic-friendly': 25,
  'heuristic-hostile': 25,
  'heuristic-neutral': 20,
  'heuristic-mixed': 30,
  'heuristic-comparison': 15
};

const FIXTURE_CATEGORIES = [
  'k-0-impossible',
  'k-1-unique', 
  'k-5-tight',
  'k-10-moderate',
  'k-100-flexible',
  // New heuristic-aware categories
  'heuristic-friendly',
  'heuristic-hostile',
  'heuristic-neutral',
  'heuristic-mixed',
  'heuristic-comparison'
] as const;

type FixtureCategory = typeof FIXTURE_CATEGORIES[number];

// ============================================================================
// FIXTURE GENERATION LOGIC
// ============================================================================

/**
 * Generate test cases for a specific category (k-value or heuristic-based)
 */
async function generateCategoryFixtures(
  category: FixtureCategory,
  count: number,
  seed: number,
  verbose: boolean = false
): Promise<TestSuite> {
  const cases: TestCase[] = [];
  
  if (verbose) {
    console.log(`Generating ${count} test cases for category: ${category}`);
  }
  
  // Check if this is a heuristic-aware category
  if (category.startsWith('heuristic-')) {
    const heuristicGenerator = new HeuristicAwareGenerator(seed);
    
    for (let i = 0; i < count; i++) {
      try {
        const testCase = await generateHeuristicTestCase(
          category,
          heuristicGenerator,
          seed + i,
          verbose
        );
        
        if (testCase) {
          cases.push(testCase);
        }
        
        if (verbose && (i + 1) % 5 === 0) {
          console.log(`  Generated ${i + 1}/${count} heuristic-aware cases`);
        }
      } catch (error) {
        console.error(`Failed to generate heuristic test case ${i + 1} for ${category}:`, error);
      }
    }
  } else {
    // Original k-value based generation
    const generator = new TestCaseGenerator(seed);
    const kSolutionGenerator = new KSolutionGenerator({});
    
    for (let i = 0; i < count; i++) {
      try {
        const testCase = await generateSingleTestCase(
          category,
          generator,
          kSolutionGenerator,
          seed + i,
          verbose
        );
        
        cases.push(testCase);
        
        if (verbose && (i + 1) % 5 === 0) {
          console.log(`  Generated ${i + 1}/${count} k-value cases`);
        }
      } catch (error) {
        console.error(`Failed to generate test case ${i + 1} for ${category}:`, error);
      }
    }
  }
  
  return {
    name: category,
    description: getCategoryDescription(category),
    cases,
    totalCases: cases.length,
    categories: { [category]: cases.length },
    createdAt: new Date()
  };
}

/**
 * Generate a heuristic-aware test case
 */
async function generateHeuristicTestCase(
  category: FixtureCategory,
  generator: HeuristicAwareGenerator,
  seed: number,
  verbose: boolean = false
): Promise<TestCase | null> {
  const config = getHeuristicCategoryConfig(category, seed);
  
  if (category === 'heuristic-comparison') {
    // Special case: generate comparison set
    const baseConfig = {
      targetSolvability: 0.8,
      constraintTightness: 0.5,
      studentCount: 15,
      seed,
      description: 'Heuristic comparison test case'
    };
    
    const comparisonSet = await generator.generateComparisonSet(baseConfig);
    // Return the first case for now (in practice, you might want to return all)
    return comparisonSet[0] || null;
  } else {
    const result = await generator.generateTestCase(config);
    return result.success ? result.testCase : null;
  }
}

/**
 * Get configuration for heuristic category
 */
function getHeuristicCategoryConfig(category: FixtureCategory, seed: number): HeuristicAwareConfig {
  const baseConfig = {
    seed,
    studentCount: 12 + (seed % 8), // 12-19 students
    constraintTightness: 0.5 + (seed % 3) * 0.15, // Vary tightness
    description: `Generated ${category} test case`
  };

  switch (category) {
    case 'heuristic-friendly':
      return {
        ...baseConfig,
        heuristicMode: HeuristicMode.PRO_HEURISTIC,
        targetSolvability: 0.8 + (seed % 3) * 0.05, // 80-90%
        solutionCount: 10 + (seed % 20) // 10-29 solutions
      };

    case 'heuristic-hostile':
      return {
        ...baseConfig,
        heuristicMode: HeuristicMode.ANTI_HEURISTIC,
        targetSolvability: 0.4 + (seed % 4) * 0.1, // 40-70%
        solutionCount: 1 + (seed % 5), // 1-5 solutions
        constraintTightness: 0.7 + (seed % 3) * 0.1 // Higher tightness
      };

    case 'heuristic-neutral':
      return {
        ...baseConfig,
        heuristicMode: HeuristicMode.NEUTRAL,
        targetSolvability: 0.6 + (seed % 4) * 0.1, // 60-90%
        solutionCount: 5 + (seed % 15) // 5-19 solutions
      };

    case 'heuristic-mixed':
      return {
        ...baseConfig,
        heuristicMode: HeuristicMode.MIXED,
        targetSolvability: 0.5 + (seed % 5) * 0.1, // 50-90%
        solutionCount: 3 + (seed % 12), // 3-14 solutions
        studentCount: 15 + (seed % 10) // More students for complexity
      };

    default:
      return {
        ...baseConfig,
        heuristicMode: HeuristicMode.NONE,
        targetSolvability: 0.7,
        solutionCount: 8
      };
  }
}

/**
 * Generate a single test case for the specified k-value category
 */
async function generateSingleTestCase(
  category: FixtureCategory,
  generator: TestCaseGenerator,
  kSolutionGenerator: KSolutionGenerator,
  seed: number,
  verbose: boolean = false
): Promise<TestCase> {
  const params = getCategoryParams(category);
  const studentCount = getStudentCountForCategory(category);
  
  // Generate base test case
  const config = {
    targetK: params.targetK,
    difficulty: params.difficulty,
    metadata: {
      description: `Generated ${category} test case`,
      expectedSolveTime: params.expectedSolveTime,
      category: params.category as any
    }
  };
  
  const result = await generator.generateTestCase(config);
  
  if (!result.success) {
    throw new Error(`Failed to generate test case: ${result.error}`);
  }
  
  // Try to refine to hit exact k-value if needed
  if (params.targetK <= 10) {
    try {
      const refinedCase = await kSolutionGenerator.generateKSolutionCase(
        config,
        { targetK: params.targetK }
      );
      
      if (refinedCase.success) {
        return refinedCase.testCase!;
      }
    } catch (error) {
      if (verbose) {
        console.warn(`Failed to refine to exact k=${params.targetK}, using base case`);
      }
    }
  }
  
  return result.testCase!;
}

/**
 * Get generation parameters for each category
 */
function getCategoryParams(category: FixtureCategory) {
  switch (category) {
    case 'k-0-impossible':
      return {
        targetK: 0,
        difficulty: {
          studentCount: 15,
          overlapRatio: 0.1,
          fragmentationLevel: 0.8,
          packingDensity: 1.2, // Over-packed to make impossible
          durationVariety: 3,
          constraintTightness: 0.95
        } as DifficultyParams,
        expectedSolveTime: 1000,
        category: 'impossible'
      };
      
    case 'k-1-unique':
      return {
        targetK: 1,
        difficulty: {
          studentCount: 12,
          overlapRatio: 0.3,
          fragmentationLevel: 0.6,
          packingDensity: 0.95,
          durationVariety: 2,
          constraintTightness: 0.85
        } as DifficultyParams,
        expectedSolveTime: 500,
        category: 'hard'
      };
      
    case 'k-5-tight':
      return {
        targetK: 5,
        difficulty: {
          studentCount: 10,
          overlapRatio: 0.5,
          fragmentationLevel: 0.4,
          packingDensity: 0.8,
          durationVariety: 2,
          constraintTightness: 0.7
        } as DifficultyParams,
        expectedSolveTime: 300,
        category: 'medium'
      };
      
    case 'k-10-moderate':
      return {
        targetK: 10,
        difficulty: {
          studentCount: 8,
          overlapRatio: 0.6,
          fragmentationLevel: 0.3,
          packingDensity: 0.7,
          durationVariety: 2,
          constraintTightness: 0.6
        } as DifficultyParams,
        expectedSolveTime: 200,
        category: 'medium'
      };
      
    case 'k-100-flexible':
      return {
        targetK: 100,
        difficulty: {
          studentCount: 6,
          overlapRatio: 0.8,
          fragmentationLevel: 0.2,
          packingDensity: 0.5,
          durationVariety: 1,
          constraintTightness: 0.4
        } as DifficultyParams,
        expectedSolveTime: 100,
        category: 'easy'
      };
  }
}

/**
 * Get optimal student count for each category
 */
function getStudentCountForCategory(category: FixtureCategory): number {
  const params = getCategoryParams(category);
  return params.difficulty.studentCount;
}

/**
 * Get description for each category
 */
function getCategoryDescription(category: FixtureCategory): string {
  switch (category) {
    case 'k-0-impossible':
      return 'Impossible scheduling scenarios with no valid solutions (k=0)';
    case 'k-1-unique':
      return 'Tightly constrained scenarios with exactly one solution (k=1)';
    case 'k-5-tight':
      return 'Moderately constrained scenarios with few solutions (k=5)';
    case 'k-10-moderate':
      return 'Balanced scenarios with moderate solution counts (k=10)';
    case 'k-100-flexible':
      return 'Flexible scenarios with many possible solutions (k≥100)';
    // New heuristic-aware categories
    case 'heuristic-friendly':
      return 'Test cases designed to work well with solver heuristics (best-case performance)';
    case 'heuristic-hostile':
      return 'Test cases designed to work poorly with solver heuristics (worst-case performance)';
    case 'heuristic-neutral':
      return 'Test cases with balanced heuristic characteristics (neutral performance)';
    case 'heuristic-mixed':
      return 'Test cases with mixed heuristic patterns (realistic complexity)';
    case 'heuristic-comparison':
      return 'Comparison sets for testing heuristic effectiveness across multiple modes';
    default:
      return `Test cases for category: ${category}`;
  }
}

// ============================================================================
// FILE I/O OPERATIONS
// ============================================================================

/**
 * Write test suite to JSON file
 */
function writeTestSuite(testSuite: TestSuite, outputDir: string, filename: string): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = join(outputDir, filename);
  const jsonContent = JSON.stringify(testSuite, null, 2);
  
  writeFileSync(filepath, jsonContent, 'utf8');
  console.log(`✓ Generated ${testSuite.totalCases} cases: ${filepath}`);
}

/**
 * Parse and validate CLI arguments
 */
function parseCliArgs(): CLIOptions {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      category: { type: 'string', short: 'c' },
      count: { type: 'string', short: 'n' },
      seed: { type: 'string', short: 's' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
      verbose: { type: 'boolean', short: 'v' }
    },
    allowPositionals: true
  });
  
  return {
    category: values.category,
    count: values.count ? parseInt(values.count, 10) : undefined,
    seed: values.seed ? parseInt(values.seed, 10) : undefined,
    output: values.output,
    help: values.help,
    verbose: values.verbose
  };
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Generate Test Fixtures - Scheduler Testing Framework

USAGE:
  pnpm tsx generate-fixtures.ts [OPTIONS]

OPTIONS:
  -c, --category <name>    Generate specific category only
                          K-value categories: k-0-impossible, k-1-unique, k-5-tight, k-10-moderate, k-100-flexible
                          Heuristic categories: heuristic-friendly, heuristic-hostile, heuristic-neutral, heuristic-mixed, heuristic-comparison
  -n, --count <number>     Number of test cases to generate for the category
  -s, --seed <number>      Random seed for reproducible generation (default: current time)
  -o, --output <dir>       Output directory (default: ../fixtures/)
  -v, --verbose            Verbose output during generation
  -h, --help              Show this help message

EXAMPLES:
  # Generate all fixture categories with default counts
  pnpm tsx generate-fixtures.ts
  
  # Generate 50 hard test cases
  pnpm tsx generate-fixtures.ts --category k-1-unique --count 50
  
  # Generate heuristic-friendly test cases
  pnpm tsx generate-fixtures.ts --category heuristic-friendly --count 30
  
  # Generate with specific seed for reproducibility
  pnpm tsx generate-fixtures.ts --seed 12345 --verbose
  
  # Generate to custom output directory
  pnpm tsx generate-fixtures.ts --output ./my-fixtures/

GENERATED FILES:
  K-value based fixtures:
  fixtures/k-0-impossible.json  (${DEFAULT_COUNTS['k-0-impossible']} cases)
  fixtures/k-1-unique.json      (${DEFAULT_COUNTS['k-1-unique']} cases)
  fixtures/k-5-tight.json       (${DEFAULT_COUNTS['k-5-tight']} cases)
  fixtures/k-10-moderate.json   (${DEFAULT_COUNTS['k-10-moderate']} cases)
  fixtures/k-100-flexible.json  (${DEFAULT_COUNTS['k-100-flexible']} cases)
  
  Heuristic-aware fixtures:
  fixtures/heuristic-friendly.json   (${DEFAULT_COUNTS['heuristic-friendly']} cases)
  fixtures/heuristic-hostile.json    (${DEFAULT_COUNTS['heuristic-hostile']} cases)
  fixtures/heuristic-neutral.json    (${DEFAULT_COUNTS['heuristic-neutral']} cases)
  fixtures/heuristic-mixed.json      (${DEFAULT_COUNTS['heuristic-mixed']} cases)
  fixtures/heuristic-comparison.json (${DEFAULT_COUNTS['heuristic-comparison']} cases)
`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const options = parseCliArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  const seed = options.seed ?? Date.now();
  const outputDir = resolve(options.output ?? join(__dirname, '../fixtures'));
  const verbose = options.verbose ?? false;
  
  console.log('🚀 Starting test fixture generation...');
  console.log(`   Seed: ${seed}`);
  console.log(`   Output: ${outputDir}`);
  console.log('');
  
  try {
    if (options.category) {
      // Generate single category
      if (!FIXTURE_CATEGORIES.includes(options.category as FixtureCategory)) {
        console.error(`❌ Invalid category: ${options.category}`);
        console.error(`   Valid categories: ${FIXTURE_CATEGORIES.join(', ')}`);
        process.exit(1);
      }
      
      const category = options.category as FixtureCategory;
      const count = options.count ?? DEFAULT_COUNTS[category];
      
      const testSuite = await generateCategoryFixtures(category, count, seed, verbose);
      writeTestSuite(testSuite, outputDir, `${category}.json`);
      
    } else {
      // Generate all categories
      let totalGenerated = 0;
      
      for (const category of FIXTURE_CATEGORIES) {
        const count = DEFAULT_COUNTS[category];
        const testSuite = await generateCategoryFixtures(category, count, seed, verbose);
        writeTestSuite(testSuite, outputDir, `${category}.json`);
        totalGenerated += testSuite.totalCases;
      }
      
      console.log('');
      console.log(`✅ Successfully generated ${totalGenerated} total test cases`);
    }
    
  } catch (error) {
    console.error('❌ Fixture generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as generateFixtures };