#!/usr/bin/env node

/**
 * Comprehensive script to update all test names in the core-solver-no-heuristics.test.ts file
 * Handles all patterns: createCoreTestSolver(), createCoreTestSolver({...}), expect.getState() calls, etc.
 */

const fs = require('fs');
const path = require('path');

const testFile = '/Users/wsepesi/lib/lesson-solver/lib/scheduling/tests/core-solver-no-heuristics.test.ts';

// Test name to category mapping - extracted from the file
const testMappings = [
  // Trivial Cases
  { pattern: 'should solve single student with single time slot', category: 'trivial' },
  { pattern: 'should handle impossible case (no overlapping availability)', category: 'trivial' },
  { pattern: 'should handle insufficient duration in available slot', category: 'trivial' },
  
  // Multiple Students - Sequential Processing  
  { pattern: 'should process students in natural order without MRV', category: 'simple' },
  { pattern: 'should handle conflicting availability deterministically', category: 'simple' },
  
  // Hard Constraints
  { pattern: 'should never violate teacher availability constraint', category: 'constraints-hard' },
  { pattern: 'should never violate student availability constraint', category: 'constraints-hard' },
  { pattern: 'should never schedule overlapping lessons', category: 'constraints-hard' },
  { pattern: 'should enforce allowed duration constraints', category: 'constraints-hard' },
  
  // Soft Constraints
  { pattern: 'should attempt to satisfy break requirements but may violate if needed', category: 'constraints-soft' },
  
  // Deterministic Behavior
  { pattern: 'should produce identical results for identical inputs', category: 'determinism' },
  { pattern: 'should be insensitive to student array ordering when no heuristics are used', category: 'determinism' },
  
  // Solution Completeness
  { pattern: 'should find solution when one exists', category: 'completeness' },
  { pattern: 'should explore backtracking correctly when initial choices fail', category: 'completeness' },
  { pattern: 'should correctly identify impossible scenarios', category: 'completeness' },
  
  // Performance Baseline
  { pattern: 'should solve small problems quickly even without heuristics', category: 'performance' },
  { pattern: 'should handle medium-sized problems within reasonable time', category: 'performance' },
  
  // Complex Scenarios - Large Student Counts
  { pattern: 'should handle 30 students with limited teacher availability', category: 'complex' },
  { pattern: 'should handle 50 students with varied availability patterns', category: 'complex' },
  
  // Complex Scenarios - Deep Backtracking
  { pattern: 'should handle misleading initial choices requiring extensive backtracking', category: 'complex' },
  { pattern: 'should handle complex cascading constraint scenarios', category: 'complex' },
  
  // Complex Scenarios - Highly Constrained
  { pattern: 'should handle extreme competition for limited slots', category: 'complex' },
  { pattern: 'should handle impossible scenarios gracefully', category: 'complex' },
  
  // Constraint Coverage - ConsecutiveLimitConstraint
  { pattern: 'should enforce maximum consecutive minutes constraint', category: 'constraint-coverage' },
  { pattern: 'should handle edge case where consecutive limit equals lesson duration', category: 'constraint-coverage' },
  
  // Constraint Coverage - BreakRequirementConstraint
  { pattern: 'should require breaks between lessons when specified', category: 'constraint-coverage' },
  { pattern: 'should handle tight scheduling when breaks would make solution impossible', category: 'constraint-coverage' },
  
  // Constraint Coverage - Mixed Duration
  { pattern: 'should handle mixed lesson durations (30, 45, 60, 90 minutes)', category: 'constraint-coverage' },
  { pattern: 'should respect duration constraints when student preference is not allowed', category: 'constraint-coverage' },
  
  // Constraint Coverage - BackToBackPreference
  { pattern: 'should maximize back-to-back scheduling when preference is "maximize"', category: 'constraint-coverage' },
  { pattern: 'should minimize back-to-back scheduling when preference is "minimize"', category: 'constraint-coverage' },
  
  // Constraint Coverage - Multiple Lessons
  { pattern: 'should handle students wanting multiple lessons per week', category: 'constraint-coverage' },
  
  // Stress Tests - Fragmented Availability
  { pattern: 'should handle highly fragmented teacher availability', category: 'stress' },
  { pattern: 'should handle students with highly fragmented availability', category: 'stress' },
  
  // Stress Tests - Pathological Cases
  { pattern: 'should handle "thrashing" scenario - many overlapping but incompatible constraints', category: 'stress' },
  { pattern: 'should handle "combinatorial explosion" - many students with overlapping windows', category: 'stress' },
  { pattern: 'should handle "constraint contradiction" scenarios gracefully', category: 'stress' },
  
  // Stress Tests - High Time Utilization
  { pattern: 'should handle 95% time utilization efficiently', category: 'stress' },
  { pattern: 'should handle exact capacity scenarios', category: 'stress' },
  
  // Performance Testing - Large Scale
  { pattern: 'should handle 50 students within performance limits', category: 'performance-large' },
  { pattern: 'should handle 75 students with degraded performance', category: 'performance-large' },
  { pattern: 'should handle 100 students stress test', category: 'performance-large' },
  
  // Performance Testing - Timeout and Resource Limits
  { pattern: 'should handle timeout gracefully with partial solutions', category: 'performance-large' },
  { pattern: 'should handle backtrack limit gracefully', category: 'performance-large' },
  { pattern: 'should maintain correctness under resource pressure', category: 'performance-large' },
  
  // Enhanced Determinism
  { pattern: 'should produce identical results across 20 runs', category: 'determinism' },
  { pattern: 'should be deterministic with complex constraint interactions', category: 'determinism' },
  { pattern: 'should maintain determinism under memory pressure simulation', category: 'determinism' },
  { pattern: 'should handle determinism with shuffled input orders', category: 'determinism' },
  
  // Edge Cases
  { pattern: 'should handle empty availability gracefully', category: 'edge-cases' },
  { pattern: 'should handle no students', category: 'edge-cases' },
  { pattern: 'should respect timeout limits', category: 'edge-cases' },
  
  // Edge Cases - Boundary Time Tests
  { pattern: 'should handle midnight boundary (start of day)', category: 'edge-cases' },
  { pattern: 'should handle end of day boundary (11:59pm)', category: 'edge-cases' },
  { pattern: 'should handle exact minute precision edge cases', category: 'edge-cases' },
  
  // Edge Cases - Exact Match Scenarios
  { pattern: 'should handle perfect time window matches', category: 'edge-cases' },
  { pattern: 'should handle zero-gap scheduling', category: 'edge-cases' },
  { pattern: 'should handle single-minute availability windows', category: 'edge-cases' }
];

function updateTestFile() {
  let content = fs.readFileSync(testFile, 'utf8');
  let updatedCount = 0;
  let alreadyUpdatedCount = 0;

  // For each test mapping, find and update the createCoreTestSolver call
  for (const mapping of testMappings) {
    const testName = mapping.pattern;
    const category = mapping.category;
    
    // Find the test start
    const testStartPattern = `it('${testName}', () => {`;
    const testStartIndex = content.indexOf(testStartPattern);
    
    if (testStartIndex === -1) {
      console.log(`❌ Test not found: ${testName}`);
      continue;
    }

    // Find the next test or end of describe block to bound our search
    const nextTestIndex = content.indexOf('it(', testStartIndex + 1);
    const nextDescribeIndex = content.indexOf('describe(', testStartIndex + 1);
    const nextCloseIndex = content.indexOf('});', testStartIndex + 1);
    
    let testEndIndex = content.length;
    if (nextTestIndex !== -1) testEndIndex = Math.min(testEndIndex, nextTestIndex);
    if (nextDescribeIndex !== -1) testEndIndex = Math.min(testEndIndex, nextDescribeIndex);
    if (nextCloseIndex !== -1) testEndIndex = Math.min(testEndIndex, nextCloseIndex);
    
    // Extract the test content
    const testContent = content.substring(testStartIndex, testEndIndex);
    
    // Check if this test already has a proper name (not expect.getState() or empty)
    const alreadyHasName = /createCoreTestSolver\([^)]*,\s*['"`][^'"`]+['"`]/.test(testContent);
    if (alreadyHasName && !testContent.includes('expect.getState()')) {
      console.log(`✅ Already updated: ${testName}`);
      alreadyUpdatedCount++;
      continue;
    }

    // Look for all patterns that need updating
    let updatedTestContent = testContent;
    let hasUpdate = false;

    // Pattern 1: createCoreTestSolver() - no parameters
    const pattern1 = /const solver = createCoreTestSolver\(\);/g;
    if (pattern1.test(testContent)) {
      updatedTestContent = updatedTestContent.replace(pattern1, 
        `const solver = createCoreTestSolver({}, '${testName}', '${category}');`);
      hasUpdate = true;
    }

    // Pattern 2: createCoreTestSolver({...}) - with options but no name
    const pattern2 = /const solver = createCoreTestSolver\((\{[^}]*\})\);/g;
    const pattern2Matches = [...testContent.matchAll(pattern2)];
    for (const match of pattern2Matches) {
      const options = match[1];
      updatedTestContent = updatedTestContent.replace(match[0], 
        `const solver = createCoreTestSolver(${options}, '${testName}', '${category}');`);
      hasUpdate = true;
    }

    // Pattern 3: expect.getState().currentTestName - replace with explicit name
    const pattern3 = /createCoreTestSolver\(([^,]*),\s*expect\.getState\(\)\.currentTestName[^)]*\)/g;
    const pattern3Matches = [...testContent.matchAll(pattern3)];
    for (const match of pattern3Matches) {
      const options = match[1];
      updatedTestContent = updatedTestContent.replace(match[0], 
        `createCoreTestSolver(${options}, '${testName}', '${category}')`);
      hasUpdate = true;
    }

    if (hasUpdate) {
      // Replace the test content in the full file content
      content = content.substring(0, testStartIndex) + updatedTestContent + content.substring(testEndIndex);
      console.log(`✅ Updated: ${testName}`);
      updatedCount++;
    } else {
      console.log(`⚠️  No updateable patterns found: ${testName}`);
    }
  }
  
  // Write the updated content back
  fs.writeFileSync(testFile, content, 'utf8');
  console.log(`\n🎉 Test file updated successfully!`);
  console.log(`   Updated: ${updatedCount} tests`);
  console.log(`   Already up-to-date: ${alreadyUpdatedCount} tests`);
  console.log(`   Total: ${updatedCount + alreadyUpdatedCount}/${testMappings.length} tests processed`);
}

updateTestFile();