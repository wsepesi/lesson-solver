#!/usr/bin/env node

/**
 * Final comprehensive script to update ALL test names in core-solver-no-heuristics.test.ts
 * Handles multi-line patterns, different indentation, and complex solver call patterns
 */

const fs = require('fs');

const testFile = '/Users/wsepesi/lib/lesson-solver/lib/scheduling/tests/core-solver-no-heuristics.test.ts';

// Test name to category mapping
const testMappings = [
  { pattern: 'should solve single student with single time slot', category: 'trivial' },
  { pattern: 'should handle impossible case (no overlapping availability)', category: 'trivial' },
  { pattern: 'should handle insufficient duration in available slot', category: 'trivial' },
  { pattern: 'should process students in natural order without MRV', category: 'simple' },
  { pattern: 'should handle conflicting availability deterministically', category: 'simple' },
  { pattern: 'should never violate teacher availability constraint', category: 'constraints-hard' },
  { pattern: 'should never violate student availability constraint', category: 'constraints-hard' },
  { pattern: 'should never schedule overlapping lessons', category: 'constraints-hard' },
  { pattern: 'should enforce allowed duration constraints', category: 'constraints-hard' },
  { pattern: 'should attempt to satisfy break requirements but may violate if needed', category: 'constraints-soft' },
  { pattern: 'should produce identical results for identical inputs', category: 'determinism' },
  { pattern: 'should be insensitive to student array ordering when no heuristics are used', category: 'determinism' },
  { pattern: 'should find solution when one exists', category: 'completeness' },
  { pattern: 'should explore backtracking correctly when initial choices fail', category: 'completeness' },
  { pattern: 'should correctly identify impossible scenarios', category: 'completeness' },
  { pattern: 'should solve small problems quickly even without heuristics', category: 'performance' },
  { pattern: 'should handle medium-sized problems within reasonable time', category: 'performance' },
  { pattern: 'should handle 30 students with limited teacher availability', category: 'complex' },
  { pattern: 'should handle 50 students with varied availability patterns', category: 'complex' },
  { pattern: 'should handle misleading initial choices requiring extensive backtracking', category: 'complex' },
  { pattern: 'should handle complex cascading constraint scenarios', category: 'complex' },
  { pattern: 'should handle extreme competition for limited slots', category: 'complex' },
  { pattern: 'should handle impossible scenarios gracefully', category: 'complex' },
  { pattern: 'should enforce maximum consecutive minutes constraint', category: 'constraint-coverage' },
  { pattern: 'should handle edge case where consecutive limit equals lesson duration', category: 'constraint-coverage' },
  { pattern: 'should require breaks between lessons when specified', category: 'constraint-coverage' },
  { pattern: 'should handle tight scheduling when breaks would make solution impossible', category: 'constraint-coverage' },
  { pattern: 'should handle mixed lesson durations (30, 45, 60, 90 minutes)', category: 'constraint-coverage' },
  { pattern: 'should respect duration constraints when student preference is not allowed', category: 'constraint-coverage' },
  { pattern: 'should maximize back-to-back scheduling when preference is "maximize"', category: 'constraint-coverage' },
  { pattern: 'should minimize back-to-back scheduling when preference is "minimize"', category: 'constraint-coverage' },
  { pattern: 'should handle students wanting multiple lessons per week', category: 'constraint-coverage' },
  { pattern: 'should handle highly fragmented teacher availability', category: 'stress' },
  { pattern: 'should handle students with highly fragmented availability', category: 'stress' },
  { pattern: 'should handle "thrashing" scenario - many overlapping but incompatible constraints', category: 'stress' },
  { pattern: 'should handle "combinatorial explosion" - many students with overlapping windows', category: 'stress' },
  { pattern: 'should handle "constraint contradiction" scenarios gracefully', category: 'stress' },
  { pattern: 'should handle 95% time utilization efficiently', category: 'stress' },
  { pattern: 'should handle exact capacity scenarios', category: 'stress' },
  { pattern: 'should handle 50 students within performance limits', category: 'performance-large' },
  { pattern: 'should handle 75 students with degraded performance', category: 'performance-large' },
  { pattern: 'should handle 100 students stress test', category: 'performance-large' },
  { pattern: 'should handle timeout gracefully with partial solutions', category: 'performance-large' },
  { pattern: 'should handle backtrack limit gracefully', category: 'performance-large' },
  { pattern: 'should maintain correctness under resource pressure', category: 'performance-large' },
  { pattern: 'should produce identical results across 20 runs', category: 'determinism' },
  { pattern: 'should be deterministic with complex constraint interactions', category: 'determinism' },
  { pattern: 'should maintain determinism under memory pressure simulation', category: 'determinism' },
  { pattern: 'should handle determinism with shuffled input orders', category: 'determinism' },
  { pattern: 'should handle empty availability gracefully', category: 'edge-cases' },
  { pattern: 'should handle no students', category: 'edge-cases' },
  { pattern: 'should respect timeout limits', category: 'edge-cases' },
  { pattern: 'should handle midnight boundary (start of day)', category: 'edge-cases' },
  { pattern: 'should handle end of day boundary (11:59pm)', category: 'edge-cases' },
  { pattern: 'should handle exact minute precision edge cases', category: 'edge-cases' },
  { pattern: 'should handle perfect time window matches', category: 'edge-cases' },
  { pattern: 'should handle zero-gap scheduling', category: 'edge-cases' },
  { pattern: 'should handle single-minute availability windows', category: 'edge-cases' }
];

function updateTestFile() {
  let content = fs.readFileSync(testFile, 'utf8');
  let updatedCount = 0;
  let alreadyUpdatedCount = 0;
  let notFoundCount = 0;

  for (const mapping of testMappings) {
    const testName = mapping.pattern;
    const category = mapping.category;
    
    // Find test boundaries more robustly
    const testStartPattern = `it('${testName}', () => {`;
    const testStartIndex = content.indexOf(testStartPattern);
    
    if (testStartIndex === -1) {
      console.log(`❌ Test not found: ${testName}`);
      notFoundCount++;
      continue;
    }

    // Find the test end by looking for the matching closing brace
    // We'll search for the solver call within a reasonable range
    const testEndPattern1 = content.indexOf('\n    });', testStartIndex);
    const testEndPattern2 = content.indexOf('\n  });', testStartIndex);  
    const nextTestIndex = content.indexOf('\n    it(', testStartIndex + 1);
    const nextDescribeIndex = content.indexOf('\n  describe(', testStartIndex + 1);
    
    let testEndIndex = Math.min(
      testEndPattern1 > 0 ? testEndPattern1 : Infinity,
      testEndPattern2 > 0 ? testEndPattern2 : Infinity,
      nextTestIndex > 0 ? nextTestIndex : Infinity,
      nextDescribeIndex > 0 ? nextDescribeIndex : Infinity
    );
    
    if (testEndIndex === Infinity) {
      testEndIndex = content.length;
    }
    
    // Extract test content
    let testContent = content.substring(testStartIndex, testEndIndex);
    
    // Check if already properly updated (has explicit test name, not expect.getState)
    const alreadyHasName = /createCoreTestSolver\([^)]*,\s*['"`][^'"`]+['"`]/.test(testContent);
    if (alreadyHasName && !testContent.includes('expect.getState()')) {
      console.log(`✅ Already updated: ${testName}`);
      alreadyUpdatedCount++;
      continue;
    }

    let hasUpdate = false;
    let originalTestContent = testContent;

    // Replace all variations of createCoreTestSolver patterns
    // Pattern 1: createCoreTestSolver() - no args
    testContent = testContent.replace(
      /(\s+)(const\s+solver\s*=\s*)createCoreTestSolver\(\s*\);/g,
      `$1$2createCoreTestSolver({}, '${testName}', '${category}');`
    );
    
    // Pattern 2: createCoreTestSolver({...}) - with options only
    testContent = testContent.replace(
      /(\s+)(const\s+solver\s*=\s*)createCoreTestSolver\(\s*(\{[^}]*\})\s*\);/g,
      `$1$2createCoreTestSolver($3, '${testName}', '${category}');`
    );

    // Pattern 3: createCoreTestSolver({...}, expect.getState()...) - replace expect.getState with test name
    testContent = testContent.replace(
      /(\s+)(const\s+solver\s*=\s*)createCoreTestSolver\(\s*(\{[^}]*\}),\s*expect\.getState\(\)[^)]+\);/g,
      `$1$2createCoreTestSolver($3, '${testName}', '${category}');`
    );

    // Pattern 4: createCoreTestSolver({}, expect.getState()...) - replace expect.getState with test name  
    testContent = testContent.replace(
      /(\s+)(const\s+solver\s*=\s*)createCoreTestSolver\(\s*\{\s*\},\s*expect\.getState\(\)[^)]+\);/g,
      `$1$2createCoreTestSolver({}, '${testName}', '${category}');`
    );

    if (testContent !== originalTestContent) {
      hasUpdate = true;
    }

    if (hasUpdate) {
      // Replace in the full content
      content = content.substring(0, testStartIndex) + testContent + content.substring(testEndIndex);
      console.log(`✅ Updated: ${testName}`);
      updatedCount++;
    } else {
      console.log(`⚠️  No patterns found to update: ${testName}`);
    }
  }
  
  // Write the updated content
  fs.writeFileSync(testFile, content, 'utf8');
  console.log(`\n🎉 Test file updated!`);
  console.log(`   Updated: ${updatedCount} tests`);
  console.log(`   Already up-to-date: ${alreadyUpdatedCount} tests`);
  console.log(`   Not found: ${notFoundCount} tests`);
  console.log(`   Total: ${updatedCount + alreadyUpdatedCount}/${testMappings.length} tests processed`);
}

updateTestFile();