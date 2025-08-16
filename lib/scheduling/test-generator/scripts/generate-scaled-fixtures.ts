#!/usr/bin/env node
/**
 * Generate Scaled Test Fixtures Script
 * 
 * Creates comprehensive test fixtures with varying student counts (10-50)
 * and different k-values for thorough scheduler testing.
 * 
 * Usage:
 *   npx tsx lib/scheduling/test-generator/scripts/generate-scaled-fixtures.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

import {
  TestCaseGenerator,
  KSolutionGenerator,
  type TestCase,
  type TestSuite,
  type DifficultyParams
} from '../index';

// ============================================================================
// SCALED FIXTURE CONFIGURATION
// ============================================================================

interface ScaledFixtureConfig {
  category: string;
  description: string;
  studentCounts: number[];
  targetK: number;
  baseParams: Omit<DifficultyParams, 'studentCount'>;
  casesPerCount: number;
}

const SCALED_FIXTURES: ScaledFixtureConfig[] = [
  {
    category: 'k-0-impossible-scaled',
    description: 'Impossible scenarios across different scales',
    studentCounts: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    targetK: 0,
    baseParams: {
      overlapRatio: 0.05,        // Very low overlap
      fragmentationLevel: 0.9,   // Highly fragmented
      packingDensity: 1.3,       // Over-packed 
      durationVariety: 4,        // Complex durations
      constraintTightness: 0.95  // Very tight constraints
    },
    casesPerCount: 5
  },
  {
    category: 'k-1-unique-scaled',
    description: 'Unique solution scenarios across different scales',
    studentCounts: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    targetK: 1,
    baseParams: {
      overlapRatio: 0.25,        // Low overlap
      fragmentationLevel: 0.7,   // Moderately fragmented
      packingDensity: 0.98,      // Nearly full utilization
      durationVariety: 3,        // Mix of durations
      constraintTightness: 0.9   // Tight constraints
    },
    casesPerCount: 5
  },
  {
    category: 'k-5-tight-scaled',
    description: 'Few solutions scenarios across different scales',
    studentCounts: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    targetK: 5,
    baseParams: {
      overlapRatio: 0.4,         // Moderate overlap
      fragmentationLevel: 0.5,   // Balanced fragmentation
      packingDensity: 0.85,      // High utilization
      durationVariety: 2,        // Standard durations
      constraintTightness: 0.75  // Moderate constraints
    },
    casesPerCount: 5
  },
  {
    category: 'k-10-moderate-scaled',
    description: 'Moderate solution count scenarios across different scales',
    studentCounts: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    targetK: 10,
    baseParams: {
      overlapRatio: 0.6,         // Good overlap
      fragmentationLevel: 0.3,   // Low fragmentation
      packingDensity: 0.75,      // Reasonable utilization
      durationVariety: 2,        // Standard durations
      constraintTightness: 0.6   // Moderate constraints
    },
    casesPerCount: 4
  },
  {
    category: 'k-25-flexible-scaled',
    description: 'Many solutions scenarios across different scales',
    studentCounts: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    targetK: 25,
    baseParams: {
      overlapRatio: 0.7,         // High overlap
      fragmentationLevel: 0.2,   // Low fragmentation
      packingDensity: 0.6,       // Comfortable utilization
      durationVariety: 2,        // Standard durations
      constraintTightness: 0.5   // Relaxed constraints
    },
    casesPerCount: 3
  },
  {
    category: 'k-100-easy-scaled',
    description: 'Many solutions scenarios across different scales',
    studentCounts: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    targetK: 100,
    baseParams: {
      overlapRatio: 0.85,        // Very high overlap
      fragmentationLevel: 0.1,   // Minimal fragmentation
      packingDensity: 0.5,       // Low utilization
      durationVariety: 1,        // Single duration
      constraintTightness: 0.3   // Very relaxed constraints
    },
    casesPerCount: 3
  }
];

// ============================================================================
// GENERATION LOGIC
// ============================================================================

/**
 * Generate test cases for a scaled fixture configuration
 */
async function generateScaledFixtures(
  config: ScaledFixtureConfig,
  seed: number,
  verbose: boolean = false
): Promise<TestSuite> {
  const generator = new TestCaseGenerator(seed);
  const kSolutionGenerator = new KSolutionGenerator({});
  
  const cases: TestCase[] = [];
  let caseIndex = 0;
  
  if (verbose) {
    console.log(`Generating ${config.category} with ${config.studentCounts.length} scales`);
  }
  
  for (const studentCount of config.studentCounts) {
    if (verbose) {
      console.log(`  Scale: ${studentCount} students (${config.casesPerCount} cases)`);
    }
    
    for (let i = 0; i < config.casesPerCount; i++) {
      try {
        const difficulty: DifficultyParams = {
          studentCount,
          ...config.baseParams
        };
        
        // Adjust parameters based on scale
        const scaledDifficulty = adjustForScale(difficulty, studentCount);
        
        const testConfig = {
          targetK: config.targetK,
          difficulty: scaledDifficulty,
          metadata: {
            description: `${config.category} - ${studentCount} students (case ${i + 1})`,
            expectedSolveTime: estimateSolveTime(studentCount, config.targetK),
            category: categorizeByK(config.targetK) as any
          }
        };
        
        const result = await generator.generateTestCase(testConfig);
        
        if (!result.success) {
          console.warn(`Failed to generate case ${caseIndex + 1}: ${result.error}`);
          continue;
        }
        
        cases.push(result.testCase!);
        caseIndex++;
        
        if (verbose && caseIndex % 10 === 0) {
          console.log(`    Generated ${caseIndex} total cases`);
        }
        
      } catch (error) {
        console.error(`Error generating case for ${studentCount} students:`, error);
      }
    }
  }
  
  return {
    name: config.category,
    description: config.description,
    cases,
    totalCases: cases.length,
    categories: { [config.category]: cases.length },
    createdAt: new Date()
  };
}

/**
 * Adjust difficulty parameters based on student count scale
 */
function adjustForScale(difficulty: DifficultyParams, studentCount: number): DifficultyParams {
  // As student count increases, we need to adjust some parameters
  const scaleFactor = Math.min(studentCount / 20, 2.5); // Cap at 2.5x adjustment
  
  return {
    ...difficulty,
    // Slightly increase overlap for larger groups (easier to schedule)
    overlapRatio: Math.min(difficulty.overlapRatio * (1 + scaleFactor * 0.1), 0.95),
    
    // Slightly decrease fragmentation for larger groups 
    fragmentationLevel: Math.max(difficulty.fragmentationLevel * (1 - scaleFactor * 0.05), 0.05),
    
    // Adjust packing density to maintain realistic constraints
    packingDensity: difficulty.packingDensity * (1 - scaleFactor * 0.02),
    
    // Keep other parameters mostly stable
    durationVariety: difficulty.durationVariety,
    constraintTightness: Math.max(difficulty.constraintTightness * (1 - scaleFactor * 0.03), 0.2)
  };
}

/**
 * Estimate solve time based on student count and target k
 */
function estimateSolveTime(studentCount: number, targetK: number): number {
  const baseTime = 50; // Base time for small problems
  const scaleFactor = Math.pow(studentCount / 10, 1.5); // Slightly super-linear
  const kFactor = targetK === 0 ? 0.5 : (targetK === 1 ? 2 : 1); // Impossible cases are fast, unique cases slower
  
  return Math.round(baseTime * scaleFactor * kFactor);
}

/**
 * Categorize difficulty by k-value
 */
function categorizeByK(k: number): string {
  if (k === 0) return 'impossible';
  if (k === 1) return 'hard';
  if (k <= 10) return 'medium';
  return 'easy';
}

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

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const seed = Date.now();
  const outputDir = resolve(join(__dirname, '../fixtures'));
  const verbose = true;
  
  console.log('🚀 Generating scaled test fixtures...');
  console.log(`   Seed: ${seed}`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Configurations: ${SCALED_FIXTURES.length}`);
  console.log('');
  
  let totalGenerated = 0;
  
  try {
    for (const config of SCALED_FIXTURES) {
      console.log(`📊 Generating ${config.category}...`);
      
      const testSuite = await generateScaledFixtures(config, seed, verbose);
      writeTestSuite(testSuite, outputDir, `${config.category}.json`);
      
      totalGenerated += testSuite.totalCases;
      console.log('');
    }
    
    console.log(`✅ Successfully generated ${totalGenerated} total scaled test cases`);
    console.log('');
    console.log('📋 Generated fixture files:');
    for (const config of SCALED_FIXTURES) {
      const expectedCases = config.studentCounts.length * config.casesPerCount;
      console.log(`   ${config.category}.json (${expectedCases} cases expected)`);
    }
    
  } catch (error) {
    console.error('❌ Scaled fixture generation failed:', error);
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

export { main as generateScaledFixtures };