/**
 * Test Data Extraction Utilities
 * 
 * This module provides utilities to extract test data from running tests
 * so that the visualizer can work with all tests in the test file,
 * not just pre-defined fixtures.
 */

import fs from 'fs/promises';
import path from 'path';
import type { 
  TeacherConfig, 
  StudentConfig, 
  ScheduleSolution 
} from '../types';
import { ScheduleSolver } from '../solver';

export interface ExtractedTestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  teacher: TeacherConfig;
  students: StudentConfig[];
  solution?: ScheduleSolution;
  expectedResults?: {
    expectedAssignments?: number;
    shouldBeFullySolvable?: boolean;
    minAssignments?: number;
    maxAssignments?: number;
    impossibleStudents?: string[];
  };
  error?: string;
}

export interface ExtractedTestData {
  generatedAt: string;
  totalTests: number;
  testCases: ExtractedTestCase[];
}

/**
 * Global storage for extracted test data
 */
let extractedTestCases: ExtractedTestCase[] = [];
let isExtractionMode = false;

/**
 * Initialize extraction mode
 */
export function initializeExtraction(): void {
  isExtractionMode = process.env.EXTRACT_TEST_DATA === 'true';
  if (isExtractionMode) {
    extractedTestCases = [];
    console.log('🔍 Test data extraction mode enabled');
  }
}

/**
 * Check if we're in extraction mode
 */
export function isExtractingTestData(): boolean {
  return isExtractionMode;
}

/**
 * Wrapper for the solver that captures test data
 */
export class ExtractingSolver extends ScheduleSolver {
  private currentTestName: string = '';
  private currentTestDescription: string = '';
  private currentTestCategory: string = '';

  constructor(options: any = {}) {
    super(options);
  }

  /**
   * Set the current test context
   */
  setTestContext(name: string, description: string = '', category: string = ''): void {
    this.currentTestName = name;
    this.currentTestDescription = description;
    this.currentTestCategory = category;
  }

  /**
   * Override solve method to capture test data
   */
  solve(teacher: TeacherConfig, students: StudentConfig[]): ScheduleSolution {
    const solution = super.solve(teacher, students);

    if (isExtractionMode && this.currentTestName) {
      // Create extracted test case
      const testCase: ExtractedTestCase = {
        id: this.generateTestId(this.currentTestName),
        name: this.currentTestName,
        description: this.currentTestDescription || this.currentTestName,
        category: this.currentTestCategory || 'unknown',
        teacher: this.deepClone(teacher),
        students: this.deepClone(students),
        solution: this.deepClone(solution)
      };

      // Try to infer expected results from the test pattern
      testCase.expectedResults = this.inferExpectedResults(solution, students);

      extractedTestCases.push(testCase);
      console.log(`🔍 Extracted test ${extractedTestCases.length}: ${this.currentTestName}`);
    }

    return solution;
  }

  private generateTestId(testName: string): string {
    const slug = testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Add a counter to ensure uniqueness
    const existing = extractedTestCases.filter(tc => tc.id.startsWith(slug));
    return existing.length > 0 ? `${slug}-${existing.length + 1}` : slug;
  }

  private inferExpectedResults(solution: ScheduleSolution, students: StudentConfig[]) {
    const totalStudents = students.length;
    const assignedCount = solution.assignments.length;
    
    return {
      expectedAssignments: assignedCount,
      shouldBeFullySolvable: assignedCount === totalStudents,
      minAssignments: assignedCount,
      maxAssignments: assignedCount,
      impossibleStudents: solution.unscheduled
    };
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Factory function to create solver for test extraction
 */
export function createExtractorSolver(options: any = {}): ExtractingSolver {
  return new ExtractingSolver({
    useHeuristics: false,
    useConstraintPropagation: true,
    maxTimeMs: 5000,
    logLevel: 'none',
    ...options
  });
}

/**
 * Helper to wrap a test execution with extraction context
 */
export function withTestExtraction<T>(
  testName: string,
  category: string,
  testFn: (solver: ExtractingSolver) => T
): T {
  if (!isExtractionMode) {
    // In normal mode, use regular solver
    const solver = new ScheduleSolver({
      useHeuristics: false,
      useConstraintPropagation: true,
      maxTimeMs: 5000,
      logLevel: 'none'
    });
    return testFn(solver as any);
  }

  const extractingSolver = createExtractorSolver();
  extractingSolver.setTestContext(testName, '', category);
  
  try {
    return testFn(extractingSolver);
  } catch (error) {
    // Capture error in test case if extraction is enabled
    const testCase: ExtractedTestCase = {
      id: extractingSolver['generateTestId'](testName),
      name: testName,
      description: testName,
      category: category,
      teacher: {} as TeacherConfig, // Will be empty on error
      students: [],
      error: error instanceof Error ? error.message : String(error)
    };
    extractedTestCases.push(testCase);
    throw error;
  }
}

/**
 * Save extracted test data to file
 */
export async function saveExtractedTestData(outputPath?: string): Promise<string> {
  if (!isExtractionMode || extractedTestCases.length === 0) {
    throw new Error('No test data to save. Run in extraction mode first.');
  }

  const data: ExtractedTestData = {
    generatedAt: new Date().toISOString(),
    totalTests: extractedTestCases.length,
    testCases: extractedTestCases
  };

  const defaultPath = path.join(
    process.cwd(), 
    'lib/scheduling/tests/extracted-test-data.json'
  );
  const filePath = outputPath || defaultPath;

  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`✅ Extracted ${extractedTestCases.length} test cases to ${filePath}`);
  return filePath;
}

/**
 * Load extracted test data from file
 */
export async function loadExtractedTestData(inputPath?: string): Promise<ExtractedTestData> {
  const defaultPath = path.join(
    process.cwd(), 
    'lib/scheduling/tests/extracted-test-data.json'
  );
  const filePath = inputPath || defaultPath;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load extracted test data from ${filePath}: ${error}`);
  }
}

/**
 * Get current extracted test cases (for debugging)
 */
export function getExtractedTestCases(): ExtractedTestCase[] {
  return [...extractedTestCases];
}

/**
 * Clear extracted test cases (for testing)
 */
export function clearExtractedTestCases(): void {
  extractedTestCases = [];
}

// Initialize extraction mode when module loads
initializeExtraction();