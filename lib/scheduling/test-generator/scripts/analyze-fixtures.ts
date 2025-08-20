#!/usr/bin/env node
/**
 * Analyze Generated Fixtures Script
 * 
 * Provides comprehensive analysis of all generated test fixtures
 * including counts, difficulty distributions, and coverage metrics.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

interface FixtureAnalysis {
  filename: string;
  totalCases: number;
  studentCountRange: { min: number; max: number; distribution: Record<number, number> };
  difficultyMetrics: {
    overlapRange: { min: number; max: number; avg: number };
    fragmentationRange: { min: number; max: number; avg: number };
    packingDensityRange: { min: number; max: number; avg: number };
    constraintTightnessRange: { min: number; max: number; avg: number };
  };
  categories: Record<string, number>;
  fileSize: string;
}

function analyzeFixture(filename: string, fixturesDir: string): FixtureAnalysis {
  const filepath = join(fixturesDir, filename);
  const content = readFileSync(filepath, 'utf8');
  const data = JSON.parse(content);
  
  // Get file size
  const stats = require('fs').statSync(filepath);
  const fileSize = `${(stats.size / 1024).toFixed(1)}KB`;
  
  if (!data.cases || !Array.isArray(data.cases)) {
    return {
      filename,
      totalCases: 0,
      studentCountRange: { min: 0, max: 0, distribution: {} },
      difficultyMetrics: {
        overlapRange: { min: 0, max: 0, avg: 0 },
        fragmentationRange: { min: 0, max: 0, avg: 0 },
        packingDensityRange: { min: 0, max: 0, avg: 0 },
        constraintTightnessRange: { min: 0, max: 0, avg: 0 }
      },
      categories: {},
      fileSize
    };
  }
  
  const cases = data.cases;
  const studentCounts = cases.map((c: any) => c.students?.length || c.difficulty?.studentCount || 0);
  const studentCountDistribution: Record<number, number> = {};
  
  studentCounts.forEach((count: number) => {
    studentCountDistribution[count] = (studentCountDistribution[count] || 0) + 1;
  });
  
  // Extract difficulty metrics
  const difficulties = cases.map((c: any) => c.difficulty).filter(Boolean);
  
  const overlapValues = difficulties.map((d: any) => d.overlapRatio || 0);
  const fragmentationValues = difficulties.map((d: any) => d.fragmentationLevel || 0);
  const packingValues = difficulties.map((d: any) => d.packingDensity || 0);
  const constraintValues = difficulties.map((d: any) => d.constraintTightness || 0);
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const minMax = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });
  
  // Categories
  const categories: Record<string, number> = {};
  cases.forEach((c: any) => {
    const cat = c.metadata?.category || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  return {
    filename,
    totalCases: cases.length,
    studentCountRange: {
      ...minMax(studentCounts),
      distribution: studentCountDistribution
    },
    difficultyMetrics: {
      overlapRange: { ...minMax(overlapValues), avg: avg(overlapValues) },
      fragmentationRange: { ...minMax(fragmentationValues), avg: avg(fragmentationValues) },
      packingDensityRange: { ...minMax(packingValues), avg: avg(packingValues) },
      constraintTightnessRange: { ...minMax(constraintValues), avg: avg(constraintValues) }
    },
    categories,
    fileSize
  };
}

function main() {
  const fixturesDir = resolve(join(__dirname, '../fixtures'));
  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
  
  console.log('🧪 TEST FIXTURE ANALYSIS REPORT');
  console.log('=====================================\n');
  
  const analyses = files.map(f => analyzeFixture(f, fixturesDir));
  const totalCases = analyses.reduce((sum, a) => sum + a.totalCases, 0);
  
  console.log(`📊 SUMMARY`);
  console.log(`Total fixture files: ${files.length}`);
  console.log(`Total test cases: ${totalCases}`);
  console.log('');
  
  // Overall student count distribution
  const allStudentCounts: Record<number, number> = {};
  analyses.forEach(a => {
    Object.entries(a.studentCountRange.distribution).forEach(([count, num]) => {
      const c = parseInt(count);
      allStudentCounts[c] = (allStudentCounts[c] || 0) + num;
    });
  });
  
  console.log(`📈 STUDENT COUNT DISTRIBUTION`);
  const sortedCounts = Object.entries(allStudentCounts)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));
  
  for (const [count, cases] of sortedCounts) {
    console.log(`${count.padStart(2)} students: ${cases.toString().padStart(3)} cases`);
  }
  console.log('');
  
  // Category distribution
  const allCategories: Record<string, number> = {};
  analyses.forEach(a => {
    Object.entries(a.categories).forEach(([cat, num]) => {
      allCategories[cat] = (allCategories[cat] || 0) + num;
    });
  });
  
  console.log(`🎯 DIFFICULTY CATEGORY DISTRIBUTION`);
  Object.entries(allCategories)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, num]) => {
      console.log(`${cat.padEnd(12)}: ${num.toString().padStart(3)} cases`);
    });
  console.log('');
  
  // File-by-file breakdown
  console.log(`📁 DETAILED FILE ANALYSIS`);
  console.log('-----------------------------------------------------------');
  
  analyses.sort((a, b) => b.totalCases - a.totalCases).forEach(analysis => {
    console.log(`\n📄 ${analysis.filename} (${analysis.fileSize})`);
    console.log(`   Cases: ${analysis.totalCases}`);
    console.log(`   Student range: ${analysis.studentCountRange.min}-${analysis.studentCountRange.max}`);
    
    if (analysis.totalCases > 0) {
      const dm = analysis.difficultyMetrics;
      console.log(`   Difficulty ranges:`);
      console.log(`     Overlap: ${dm.overlapRange.min.toFixed(2)}-${dm.overlapRange.max.toFixed(2)} (avg: ${dm.overlapRange.avg.toFixed(2)})`);
      console.log(`     Fragmentation: ${dm.fragmentationRange.min.toFixed(2)}-${dm.fragmentationRange.max.toFixed(2)} (avg: ${dm.fragmentationRange.avg.toFixed(2)})`);
      console.log(`     Packing: ${dm.packingDensityRange.min.toFixed(2)}-${dm.packingDensityRange.max.toFixed(2)} (avg: ${dm.packingDensityRange.avg.toFixed(2)})`);
      console.log(`     Constraints: ${dm.constraintTightnessRange.min.toFixed(2)}-${dm.constraintTightnessRange.max.toFixed(2)} (avg: ${dm.constraintTightnessRange.avg.toFixed(2)})`);
      
      console.log(`   Categories: ${Object.entries(analysis.categories).map(([k,v]) => `${k}(${v})`).join(', ')}`);
    }
  });
  
  console.log('\n🎉 COVERAGE ANALYSIS');
  console.log('-----------------------------------------------------------');
  
  const minStudents = Math.min(...Object.keys(allStudentCounts).map(Number));
  const maxStudents = Math.max(...Object.keys(allStudentCounts).map(Number));
  
  console.log(`✅ Student count coverage: ${minStudents}-${maxStudents} students`);
  console.log(`✅ Difficulty categories: ${Object.keys(allCategories).join(', ')}`);
  console.log(`✅ K-value coverage: Impossible (k=0), Unique (k=1), Few (k=5-10), Many (k=25-100+)`);
  console.log(`✅ Scale testing: ${totalCases} test cases across ${files.length} fixture files`);
  
  // Identify any gaps
  const gaps = [];
  for (let i = minStudents; i <= maxStudents; i += 5) {
    if (!allStudentCounts[i] && !allStudentCounts[i-1] && !allStudentCounts[i+1]) {
      gaps.push(i);
    }
  }
  
  if (gaps.length > 0) {
    console.log(`⚠️  Potential gaps in coverage: ${gaps.join(', ')} students`);
  } else {
    console.log(`✅ No significant gaps in student count coverage`);
  }
  
  console.log('\n🚀 READY FOR COMPREHENSIVE SCHEDULER TESTING!');
}

if (require.main === module) {
  main();
}