/**
 * Example usage of the availability, constraint, and student generators
 * 
 * This file demonstrates how to use the three generators together to create
 * realistic test scenarios with different difficulty levels and patterns.
 */

import { AvailabilityGenerator, availabilityPresets } from '../generators/availability-generator';
import { ConstraintGenerator, constraintPresets } from '../generators/constraint-generator';
import { StudentGenerator, studentPresets } from '../generators/student-generator';
import type { TeacherConfig } from '../../types';

/**
 * Example 1: Creating a basic teacher and students for easy scheduling
 */
export function createEasySchedulingScenario(seed = 12345) {
  console.log('=== Easy Scheduling Scenario ===');
  
  // Create teacher with flexible constraints
  const teacher: TeacherConfig = {
    person: {
      id: 'teacher_easy',
      name: 'Easy Teacher',
      email: 'easy@example.com'
    },
    studioId: 'studio_easy',
    availability: availabilityPresets.generateTeacherSchedule(seed),
    constraints: constraintPresets.generateFlexibleConstraints(seed)
  };
  
  // Create flexible students
  const students = studentPresets.generateEasySchedulingSet(8, seed);
  
  console.log(`Teacher availability: ${teacher.availability.days.filter(d => d.blocks.length > 0).length} days`);
  console.log(`Teacher constraints: ${teacher.constraints.maxConsecutiveMinutes}min consecutive, ${teacher.constraints.breakDurationMinutes}min breaks`);
  console.log(`Students: ${students.length} total`);
  
  students.forEach((student, _i) => {
    const availableDays = student.availability.days.filter(d => d.blocks.length > 0).length;
    console.log(`  ${student.person.name}: ${student.preferredDuration}min lessons, ${availableDays} days available`);
  });
  
  return { teacher, students };
}

/**
 * Example 2: Creating a difficult scheduling scenario
 */
export function createDifficultSchedulingScenario(seed = 54321) {
  console.log('\n=== Difficult Scheduling Scenario ===');
  
  // Create teacher with strict constraints
  const teacher: TeacherConfig = {
    person: {
      id: 'teacher_hard',
      name: 'Strict Teacher',
      email: 'strict@example.com'
    },
    studioId: 'studio_hard',
    availability: availabilityPresets.generateTeacherSchedule(seed),
    constraints: constraintPresets.generateStrictConstraints(seed)
  };
  
  // Create students with conflicting availability
  const students = studentPresets.generateDifficultSchedulingSet(12, seed);
  
  console.log(`Teacher availability: ${teacher.availability.days.filter(d => d.blocks.length > 0).length} days`);
  console.log(`Teacher constraints: ${teacher.constraints.maxConsecutiveMinutes}min consecutive, ${teacher.constraints.breakDurationMinutes}min breaks`);
  console.log(`Allowed durations: [${teacher.constraints.allowedDurations.join(', ')}]`);
  console.log(`Students: ${students.length} total`);
  
  students.forEach((student, _i) => {
    const availableDays = student.availability.days.filter(d => d.blocks.length > 0).length;
    const totalMinutes = student.availability.days.reduce((sum, day) => 
      sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0), 0
    );
    console.log(`  ${student.person.name}: ${student.preferredDuration}min lessons, ${availableDays} days, ${Math.floor(totalMinutes/60)}h total`);
  });
  
  return { teacher, students };
}

/**
 * Example 3: Creating an impossible scheduling scenario (k=0 solutions)
 */
export function createImpossibleSchedulingScenario(seed = 99999) {
  console.log('\n=== Impossible Scheduling Scenario ===');
  
  const constraintGen = new ConstraintGenerator(seed);
  const studentGen = new StudentGenerator(seed);
  
  // Create teacher with extremely strict constraints
  const teacher: TeacherConfig = {
    person: {
      id: 'teacher_impossible',
      name: 'Impossible Teacher',
      email: 'impossible@example.com'
    },
    studioId: 'studio_impossible',
    availability: availabilityPresets.generateBusyStudent(seed), // Very limited availability
    constraints: constraintGen.generateForKSolutions(0, 'strict', seed) // Impossible constraints
  };
  
  // Create students optimized for impossible scheduling
  const students = studentGen.generateForKSolutions(0, 15, seed);
  
  console.log(`Teacher availability: ${teacher.availability.days.filter(d => d.blocks.length > 0).length} days`);
  console.log(`Teacher constraints: ${teacher.constraints.maxConsecutiveMinutes}min consecutive, ${teacher.constraints.breakDurationMinutes}min breaks`);
  console.log(`Allowed durations: [${teacher.constraints.allowedDurations.join(', ')}]`);
  console.log(`Students: ${students.length} total`);
  
  // Analyze the constraints
  const analysis = constraintGen.analyzeConstraints(teacher.constraints);
  console.log(`Constraint tightness: ${(analysis.tightnessScore * 100).toFixed(1)}%`);
  console.log(`Difficulty impact: ${analysis.difficultyImpact}`);
  console.log(`Bottlenecks: ${analysis.bottlenecks.join(', ')}`);
  
  return { teacher, students };
}

/**
 * Example 4: Creating scenarios for k-solution targeting
 */
export function createKSolutionScenarios() {
  console.log('\n=== K-Solution Targeting Examples ===');
  
  const constraintGen = new ConstraintGenerator(11111);
  const studentGen = new StudentGenerator(11111);
  
  const scenarios = [
    { k: 1, description: 'Unique solution puzzle' },
    { k: 5, description: 'Few solutions challenge' },
    { k: 10, description: 'Moderate flexibility' },
    { k: 100, description: 'High flexibility' }
  ];
  
  scenarios.forEach(({ k, description }) => {
    console.log(`\n${description} (k=${k}):`);
    
    const constraints = constraintGen.generateForKSolutions(k, 'moderate', 11111 + k);
    const students = studentGen.generateForKSolutions(k, 10, 11111 + k);
    
    const analysis = constraintGen.analyzeConstraints(constraints);
    const studentAnalysis = studentGen.analyzeStudentSet(students);
    
    console.log(`  Constraint tightness: ${(analysis.tightnessScore * 100).toFixed(1)}%`);
    console.log(`  Overlap ratio: ${(studentAnalysis.difficultyIndicators.overlapRatio * 100).toFixed(1)}%`);
    console.log(`  Average duration: ${studentAnalysis.durationStats.averagePreferred}min`);
    console.log(`  Duration variety: ${studentAnalysis.durationStats.durationVariety} different lengths`);
  });
}

/**
 * Example 5: Demonstrating different availability patterns
 */
export function demonstrateAvailabilityPatterns(seed = 33333) {
  console.log('\n=== Availability Patterns ===');
  
  const generator = new AvailabilityGenerator(seed);
  
  const patterns = [
    'working-hours',
    'evening',
    'morning',
    'weekend-only',
    'fragmented',
    'sparse'
  ] as const;
  
  patterns.forEach(pattern => {
    const schedule = generator.generatePattern(pattern);
    const activeDays = schedule.days.filter(d => d.blocks.length > 0);
    const totalHours = activeDays.reduce((sum, day) => 
      sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0), 0
    ) / 60;
    
    const avgFragmentation = activeDays.length > 0 
      ? activeDays.reduce((sum, day) => sum + (day.metadata?.fragmentationScore ?? 0), 0) / activeDays.length 
      : 0;
    
    console.log(`${pattern}: ${activeDays.length} days, ${totalHours.toFixed(1)}h total, ${(avgFragmentation * 100).toFixed(1)}% fragmentation`);
  });
}

/**
 * Example 6: Demonstrating constraint strictness levels
 */
export function demonstrateConstraintLevels(seed = 44444) {
  console.log('\n=== Constraint Strictness Levels ===');
  
  const generator = new ConstraintGenerator(seed);
  
  const levels = [
    'very-loose',
    'loose', 
    'moderate',
    'strict',
    'very-strict',
    'extreme'
  ] as const;
  
  levels.forEach(level => {
    const constraints = generator.generateByStrictness(level);
    const analysis = generator.analyzeConstraints(constraints);
    
    console.log(`${level}:`);
    console.log(`  Consecutive: ${constraints.maxConsecutiveMinutes}min, Break: ${constraints.breakDurationMinutes}min`);
    console.log(`  Duration range: ${constraints.minLessonDuration}-${constraints.maxLessonDuration}min`);
    console.log(`  Allowed durations: ${constraints.allowedDurations.length} options`);
    console.log(`  Tightness: ${(analysis.tightnessScore * 100).toFixed(1)}%, Impact: ${analysis.difficultyImpact}`);
  });
}

/**
 * Example 7: Demonstrating student types
 */
export function demonstrateStudentTypes(seed = 55555) {
  console.log('\n=== Student Types ===');
  
  const generator = new StudentGenerator(seed);
  
  const types = [
    'morning-person',
    'evening-person',
    'flexible',
    'weekend-only',
    'busy-student',
    'long-lessons',
    'short-lessons',
    'variable-length'
  ] as const;
  
  types.forEach(type => {
    const student = generator.generateStudent(type, 1, { count: 1 });
    const availableDays = student.availability.days.filter(d => d.blocks.length > 0).length;
    const totalMinutes = student.availability.days.reduce((sum, day) => 
      sum + day.blocks.reduce((daySum, block) => daySum + block.duration, 0), 0
    );
    
    console.log(`${type}:`);
    console.log(`  Duration: ${student.minDuration}-${student.preferredDuration}-${student.maxDuration}min`);
    console.log(`  Max lessons/week: ${student.maxLessonsPerWeek}`);
    console.log(`  Availability: ${availableDays} days, ${Math.floor(totalMinutes/60)}h total`);
  });
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('🎯 Generator Examples - TimeBlock-based Scheduling Test Framework\n');
  
  createEasySchedulingScenario();
  createDifficultSchedulingScenario();
  createImpossibleSchedulingScenario();
  createKSolutionScenarios();
  demonstrateAvailabilityPatterns();
  demonstrateConstraintLevels();
  demonstrateStudentTypes();
  
  console.log('\n✅ All examples completed!');
  console.log('\nThese generators can be used to create comprehensive test suites for:');
  console.log('• K-solvability testing (exact solution counts)');
  console.log('• Difficulty progression (trivial → impossible)');
  console.log('• Performance benchmarking (scaling with student count)');
  console.log('• Edge case validation (over-constrained scenarios)');
  console.log('• Realistic scenario testing (varied patterns)');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}