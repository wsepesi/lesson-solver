#!/usr/bin/env node
/**
 * Generate Extreme Edge Case Fixtures Script
 * 
 * Creates challenging edge case test fixtures for stress testing the scheduler:
 * - Maximum scale scenarios (40-50 students)
 * - Pathological constraint combinations
 * - Performance stress tests
 * - Real-world edge cases
 * 
 * Usage:
 *   npx tsx lib/scheduling/test-generator/scripts/generate-extreme-fixtures.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

import {
  TestCaseGenerator,
  type TestCase,
  type TestSuite,
  type DifficultyParams
} from '../index';

// ============================================================================
// EXTREME FIXTURE CONFIGURATIONS
// ============================================================================

interface ExtremeFixtureConfig {
  category: string;
  description: string;
  scenarios: {
    name: string;
    studentCount: number;
    difficulty: DifficultyParams;
    expectedBehavior: 'solvable' | 'impossible' | 'timeout';
  }[];
}

const EXTREME_FIXTURES: ExtremeFixtureConfig[] = [
  {
    category: 'stress-max-scale',
    description: 'Maximum scale stress tests with 40-50 students',
    scenarios: [
      {
        name: 'Max scale easy - 50 students with high flexibility',
        studentCount: 50,
        difficulty: {
          studentCount: 50,
          overlapRatio: 0.9,
          fragmentationLevel: 0.1,
          packingDensity: 0.4,
          durationVariety: 1,
          constraintTightness: 0.2
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Max scale moderate - 45 students with some constraints',
        studentCount: 45,
        difficulty: {
          studentCount: 45,
          overlapRatio: 0.7,
          fragmentationLevel: 0.3,
          packingDensity: 0.6,
          durationVariety: 2,
          constraintTightness: 0.5
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Max scale hard - 40 students with tight constraints',
        studentCount: 40,
        difficulty: {
          studentCount: 40,
          overlapRatio: 0.5,
          fragmentationLevel: 0.6,
          packingDensity: 0.8,
          durationVariety: 3,
          constraintTightness: 0.8
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Max scale impossible - 50 students over-packed',
        studentCount: 50,
        difficulty: {
          studentCount: 50,
          overlapRatio: 0.2,
          fragmentationLevel: 0.8,
          packingDensity: 1.1,
          durationVariety: 4,
          constraintTightness: 0.9
        },
        expectedBehavior: 'impossible'
      }
    ]
  },
  {
    category: 'pathological-constraints',
    description: 'Pathological constraint combinations designed to stress the solver',
    scenarios: [
      {
        name: 'Extreme fragmentation - tiny time blocks',
        studentCount: 25,
        difficulty: {
          studentCount: 25,
          overlapRatio: 0.8,
          fragmentationLevel: 0.95,
          packingDensity: 0.3,
          durationVariety: 4,
          constraintTightness: 0.3
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Duration variety nightmare - all different lesson lengths',
        studentCount: 20,
        difficulty: {
          studentCount: 20,
          overlapRatio: 0.6,
          fragmentationLevel: 0.4,
          packingDensity: 0.7,
          durationVariety: 4,
          constraintTightness: 0.7
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Perfect packing puzzle - exactly full utilization',
        studentCount: 16,
        difficulty: {
          studentCount: 16,
          overlapRatio: 0.4,
          fragmentationLevel: 0.2,
          packingDensity: 1.0,
          durationVariety: 2,
          constraintTightness: 0.8
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Constraint cascade - extremely tight everything',
        studentCount: 12,
        difficulty: {
          studentCount: 12,
          overlapRatio: 0.1,
          fragmentationLevel: 0.9,
          packingDensity: 1.05,
          durationVariety: 4,
          constraintTightness: 0.98
        },
        expectedBehavior: 'impossible'
      }
    ]
  },
  {
    category: 'performance-stress',
    description: 'Performance stress tests designed to push time limits',
    scenarios: [
      {
        name: 'Backtrack explosion - many invalid partial solutions',
        studentCount: 30,
        difficulty: {
          studentCount: 30,
          overlapRatio: 0.3,
          fragmentationLevel: 0.7,
          packingDensity: 0.95,
          durationVariety: 3,
          constraintTightness: 0.9
        },
        expectedBehavior: 'timeout'
      },
      {
        name: 'Constraint thrashing - many constraint checks',
        studentCount: 35,
        difficulty: {
          studentCount: 35,
          overlapRatio: 0.4,
          fragmentationLevel: 0.8,
          packingDensity: 0.9,
          durationVariety: 4,
          constraintTightness: 0.85
        },
        expectedBehavior: 'timeout'
      },
      {
        name: 'Search space explosion - huge domains',
        studentCount: 25,
        difficulty: {
          studentCount: 25,
          overlapRatio: 0.9,
          fragmentationLevel: 0.6,
          packingDensity: 0.8,
          durationVariety: 4,
          constraintTightness: 0.7
        },
        expectedBehavior: 'solvable'
      }
    ]
  },
  {
    category: 'real-world-edge-cases',
    description: 'Real-world edge cases that schools might actually encounter',
    scenarios: [
      {
        name: 'Popular time slot conflict - everyone wants 4-6pm',
        studentCount: 30,
        difficulty: {
          studentCount: 30,
          overlapRatio: 0.2,
          fragmentationLevel: 0.1,
          packingDensity: 0.9,
          durationVariety: 2,
          constraintTightness: 0.6
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Teacher availability gap - lunch hour unavailable',
        studentCount: 25,
        difficulty: {
          studentCount: 25,
          overlapRatio: 0.6,
          fragmentationLevel: 0.5,
          packingDensity: 0.8,
          durationVariety: 2,
          constraintTightness: 0.7
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Mixed lesson lengths - 30min and 90min lessons',
        studentCount: 20,
        difficulty: {
          studentCount: 20,
          overlapRatio: 0.5,
          fragmentationLevel: 0.3,
          packingDensity: 0.85,
          durationVariety: 4,
          constraintTightness: 0.6
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Weekend vs weekday preference split',
        studentCount: 28,
        difficulty: {
          studentCount: 28,
          overlapRatio: 0.3,
          fragmentationLevel: 0.4,
          packingDensity: 0.75,
          durationVariety: 2,
          constraintTightness: 0.5
        },
        expectedBehavior: 'solvable'
      },
      {
        name: 'Studio overbooking scenario',
        studentCount: 40,
        difficulty: {
          studentCount: 40,
          overlapRatio: 0.4,
          fragmentationLevel: 0.3,
          packingDensity: 1.15,
          durationVariety: 3,
          constraintTightness: 0.8
        },
        expectedBehavior: 'impossible'
      }
    ]
  }
];

// ============================================================================
// GENERATION LOGIC
// ============================================================================

/**
 * Generate extreme test cases for a fixture configuration
 */
async function generateExtremeFixtures(
  config: ExtremeFixtureConfig,
  seed: number,
  verbose: boolean = false
): Promise<TestSuite> {
  const generator = new TestCaseGenerator(seed);
  const cases: TestCase[] = [];
  
  if (verbose) {
    console.log(`Generating ${config.category} with ${config.scenarios.length} scenarios`);
  }
  
  for (const [index, scenario] of config.scenarios.entries()) {
    if (verbose) {
      console.log(`  Scenario ${index + 1}: ${scenario.name}`);
    }
    
    try {
      const testConfig = {
        targetK: estimateTargetK(scenario.expectedBehavior, scenario.difficulty),
        difficulty: scenario.difficulty,
        metadata: {
          description: scenario.name,
          expectedSolveTime: estimateExtremeTime(scenario.studentCount, scenario.expectedBehavior),
          category: categorizeByBehavior(scenario.expectedBehavior) as any
        }
      };
      
      const result = await generator.generateTestCase(testConfig);
      
      if (!result.success) {
        console.warn(`Failed to generate scenario: ${scenario.name} - ${result.error}`);
        continue;
      }
      
      // Add scenario metadata
      const testCase = result.testCase!;
      testCase.metadata = {
        ...testCase.metadata,
        scenario: scenario.name,
        expectedBehavior: scenario.expectedBehavior,
        extremeCategory: config.category
      };
      
      cases.push(testCase);
      
    } catch (error) {
      console.error(`Error generating scenario ${scenario.name}:`, error);
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
 * Estimate target k based on expected behavior
 */
function estimateTargetK(behavior: string, difficulty: DifficultyParams): number {
  switch (behavior) {
    case 'impossible':
      return 0;
    case 'timeout':
      return 1; // Usually hard problems that might timeout
    case 'solvable':
      // Estimate based on difficulty
      if (difficulty.packingDensity > 0.9) return 1;
      if (difficulty.packingDensity > 0.8) return 5;
      if (difficulty.packingDensity > 0.6) return 25;
      return 100;
    default:
      return 10;
  }
}

/**
 * Estimate solve time for extreme scenarios
 */
function estimateExtremeTime(studentCount: number, behavior: string): number {
  const baseTime = Math.pow(studentCount / 10, 2) * 100; // Quadratic base for extreme cases
  
  switch (behavior) {
    case 'impossible':
      return Math.min(baseTime * 0.2, 500); // Should detect impossibility quickly
    case 'timeout':
      return baseTime * 10; // Designed to potentially timeout
    case 'solvable':
      return baseTime * 2; // Challenging but solvable
    default:
      return baseTime;
  }
}

/**
 * Categorize by expected behavior
 */
function categorizeByBehavior(behavior: string): string {
  switch (behavior) {
    case 'impossible':
      return 'impossible';
    case 'timeout':
      return 'hard';
    case 'solvable':
      return 'medium';
    default:
      return 'medium';
  }
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
  
  console.log('🔥 Generating extreme edge case test fixtures...');
  console.log(`   Seed: ${seed}`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Categories: ${EXTREME_FIXTURES.length}`);
  console.log('');
  
  let totalGenerated = 0;
  
  try {
    for (const config of EXTREME_FIXTURES) {
      console.log(`⚡ Generating ${config.category}...`);
      
      const testSuite = await generateExtremeFixtures(config, seed, verbose);
      writeTestSuite(testSuite, outputDir, `${config.category}.json`);
      
      totalGenerated += testSuite.totalCases;
      console.log('');
    }
    
    console.log(`🎯 Successfully generated ${totalGenerated} total extreme test cases`);
    console.log('');
    console.log('🔥 Generated extreme fixture files:');
    for (const config of EXTREME_FIXTURES) {
      console.log(`   ${config.category}.json (${config.scenarios.length} scenarios)`);
    }
    
    console.log('');
    console.log('⚠️  WARNING: These fixtures include intentionally challenging scenarios:');
    console.log('   - Some may timeout (designed to stress performance limits)');
    console.log('   - Some are impossible by design (should fail quickly)');
    console.log('   - Some push the solver to its computational limits');
    
  } catch (error) {
    console.error('❌ Extreme fixture generation failed:', error);
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

export { main as generateExtremeFixtures };