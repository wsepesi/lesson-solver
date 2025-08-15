// Example usage of the scheduling utilities
// This file demonstrates how to use the Phase 1.3 utility functions

import type {
  TimeBlock,
  DaySchedule,
  StudentConfig,
  TeacherConfig,
  SchedulingConstraints
} from './types';

import {
  timeStringToMinutes,
  minutesToTimeString,
  blockToTimeRange,
  mergeTimeBlocks,
  findAvailableSlots,
  isTimeAvailable,
  computeScheduleMetadata,
  validateTimeBlock,
  validateWeekSchedule,
  createEmptyWeekSchedule,
  cloneWeekSchedule,
  getTotalAvailableMinutes,
  formatDuration
} from './utils';

console.log('=== Phase 1.3 Scheduling Utilities Demo ===\n');

// 1. Time Conversion Examples
console.log('1. Time Conversion:');
const morningTime = timeStringToMinutes('09:30'); // 570 minutes
console.log(`  "09:30" -> ${morningTime} minutes`);
console.log(`  ${morningTime} minutes -> "${minutesToTimeString(morningTime)}"`);

const block: TimeBlock = { start: 570, duration: 90 };
const [startTime, endTime] = blockToTimeRange(block);
console.log(`  Block {start: 570, duration: 90} -> ${startTime} to ${endTime}`);

// 2. Creating a Sample Schedule
console.log('\n2. Creating Sample Schedules:');
const mondaySchedule: DaySchedule = {
  dayOfWeek: 1, // Monday
  blocks: [
    { start: 540, duration: 120 },  // 09:00-11:00
    { start: 720, duration: 90 },   // 12:00-13:30
    { start: 840, duration: 60 }    // 14:00-15:00
  ]
};

console.log('  Monday schedule blocks:');
mondaySchedule.blocks.forEach((block, i) => {
  const [start, end] = blockToTimeRange(block);
  console.log(`    Block ${i + 1}: ${start} - ${end} (${formatDuration(block.duration)})`);
});

// 3. Schedule Metadata
console.log('\n3. Schedule Analysis:');
const metadata = computeScheduleMetadata(mondaySchedule);
console.log(`  Total available: ${formatDuration(metadata.totalAvailable)}`);
console.log(`  Largest block: ${formatDuration(metadata.largestBlock)}`);
console.log(`  Fragmentation score: ${metadata.fragmentationScore.toFixed(2)} (lower is better)`);

// 4. Finding Available Slots
console.log('\n4. Finding Available 60-minute Slots:');
const availableSlots = findAvailableSlots(mondaySchedule, 60);
console.log(`  Found ${availableSlots.length} available 60-minute slots:`);
availableSlots.forEach((slot, i) => {
  const [start, end] = blockToTimeRange(slot);
  console.log(`    Slot ${i + 1}: ${start} - ${end}`);
});

// 5. Time Availability Checking
console.log('\n5. Checking Time Availability:');
const testTimes = [
  { start: '09:00', duration: 60 },   // Should be available
  { start: '10:30', duration: 60 },   // Should extend beyond first block
  { start: '11:30', duration: 30 },   // Should be in gap between blocks
  { start: '12:30', duration: 30 }    // Should be available
];

testTimes.forEach(({ start, duration }) => {
  const startMinutes = timeStringToMinutes(start);
  const available = isTimeAvailable(mondaySchedule, startMinutes, duration);
  const endTime = minutesToTimeString(startMinutes + duration);
  console.log(`    ${start} - ${endTime} (${duration}min): ${available ? 'Available' : 'Not Available'}`);
});

// 6. Merging Overlapping Blocks
console.log('\n6. Merging Overlapping Time Blocks:');
const overlappingBlocks: TimeBlock[] = [
  { start: 540, duration: 60 },   // 09:00-10:00
  { start: 580, duration: 40 },   // 09:40-10:20 (overlaps)
  { start: 600, duration: 30 },   // 10:00-10:30 (adjacent to first)
  { start: 720, duration: 60 }    // 12:00-13:00 (separate)
];

console.log('  Original blocks:');
overlappingBlocks.forEach((block, i) => {
  const [start, end] = blockToTimeRange(block);
  console.log(`    Block ${i + 1}: ${start} - ${end}`);
});

const merged = mergeTimeBlocks(overlappingBlocks);
console.log('  After merging:');
merged.forEach((block, i) => {
  const [start, end] = blockToTimeRange(block);
  console.log(`    Block ${i + 1}: ${start} - ${end} (${formatDuration(block.duration)})`);
});

// 7. Creating and Validating Week Schedules
console.log('\n7. Week Schedule Operations:');
const weekSchedule = createEmptyWeekSchedule('America/New_York');
weekSchedule.days[1] = mondaySchedule; // Add Monday schedule

console.log(`  Created week schedule with timezone: ${weekSchedule.timezone}`);
console.log(`  Total weekly availability: ${formatDuration(getTotalAvailableMinutes(weekSchedule))}`);
console.log(`  Week schedule is valid: ${validateWeekSchedule(weekSchedule)}`);

// 8. Sample Student and Teacher Configurations
console.log('\n8. Sample Configurations:');

const teacherConstraints: SchedulingConstraints = {
  maxConsecutiveMinutes: 180,      // 3 hours max consecutive
  breakDurationMinutes: 15,        // 15 minute breaks
  minLessonDuration: 30,           // 30 minute minimum lessons
  maxLessonDuration: 120,          // 2 hour maximum lessons
  allowedDurations: [30, 45, 60, 90, 120] // Allowed lesson durations
};

const sampleTeacher: TeacherConfig = {
  person: {
    id: 'teacher-001',
    name: 'Ms. Johnson',
    email: 'johnson@music.school'
  },
  studioId: 'piano-studio',
  availability: weekSchedule,
  constraints: teacherConstraints
};

const sampleStudent: StudentConfig = {
  person: {
    id: 'student-001', 
    name: 'Alex Smith',
    email: 'alex@email.com'
  },
  preferredDuration: 60,      // 1 hour lessons
  minDuration: 45,            // Minimum 45 minutes
  maxDuration: 90,            // Maximum 1.5 hours
  maxLessonsPerWeek: 1,       // Once per week
  availability: cloneWeekSchedule(weekSchedule) // Same availability as teacher for this example
};

console.log(`  Teacher: ${sampleTeacher.person.name}`);
console.log(`    Studio: ${sampleTeacher.studioId}`);
console.log(`    Max consecutive: ${formatDuration(sampleTeacher.constraints.maxConsecutiveMinutes)}`);
console.log(`    Allowed lesson durations: ${sampleTeacher.constraints.allowedDurations.map(formatDuration).join(', ')}`);

console.log(`  Student: ${sampleStudent.person.name}`);
console.log(`    Preferred lesson: ${formatDuration(sampleStudent.preferredDuration)}`);
console.log(`    Duration range: ${formatDuration(sampleStudent.minDuration!)} - ${formatDuration(sampleStudent.maxDuration!)}`);
console.log(`    Max lessons per week: ${sampleStudent.maxLessonsPerWeek}`);

// 9. Validation Examples
console.log('\n9. Validation Examples:');
const validBlock = { start: 540, duration: 60 };
const invalidBlock = { start: 1400, duration: 60 }; // Extends beyond day end

console.log(`  Valid block {start: 540, duration: 60}: ${validateTimeBlock(validBlock)}`);
console.log(`  Invalid block {start: 1400, duration: 60}: ${validateTimeBlock(invalidBlock)}`);

// 10. Performance Note
console.log('\n10. Performance Note:');
console.log('    These utilities are optimized for typical studio sizes (20-50 students)');
console.log('    All time operations use minute-precision integers for efficiency');
console.log('    Validation functions prevent invalid data from propagating through the system');
console.log('    Database operations are prepared for Phase 1.2 schema integration');

// 11. CSP Solver Example (Phase 3.2)
console.log('\n11. CSP Solver Example (Phase 3.2):');

import {
  createOptimalSolver,
  validateInputs
} from './solver';

// Validate inputs first
const validationErrors = validateInputs(sampleTeacher, [sampleStudent]);
if (validationErrors.length > 0) {
  console.log('  Validation errors found:');
  validationErrors.forEach(error => console.log(`    - ${error}`));
} else {
  console.log('  ✓ Teacher and student configurations are valid');
  
  // Create an optimal solver for this scenario
  const solver = createOptimalSolver(1); // 1 student
  const solution = solver.solve(sampleTeacher, [sampleStudent]);
  
  console.log(`  Solving result:`);
  console.log(`    Total students: ${solution.metadata.totalStudents}`);
  console.log(`    Scheduled: ${solution.metadata.scheduledStudents}`);
  console.log(`    Unscheduled: ${solution.unscheduled.length}`);
  console.log(`    Compute time: ${solution.metadata.computeTimeMs}ms`);
  
  if (solution.assignments.length > 0) {
    console.log(`  Assignment:`);
    const assignment = solution.assignments[0];
    if (!assignment) {
      console.log(`    No valid assignment found`);
    } else {
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startTime = minutesToTimeString(assignment.startMinute);
    const endTime = minutesToTimeString(assignment.startMinute + assignment.durationMinutes);
      console.log(`    Student: ${assignment.studentId}`);
      console.log(`    Day: ${dayNames[assignment.dayOfWeek]}`);
      console.log(`    Time: ${startTime} - ${endTime}`);
      console.log(`    Duration: ${formatDuration(assignment.durationMinutes)}`);
    }
  }
  
  // Get solver statistics
  const stats = solver.getStats();
  console.log(`  Solver statistics:`);
  console.log(`    Strategy: ${stats.strategy}`);
  console.log(`    Variables: ${stats.totalVariables}`);
  console.log(`    Domain size: ${stats.totalDomainSize}`);
  console.log(`    Backtracks: ${stats.backtracks}`);
  console.log(`    Constraint checks: ${stats.constraintChecks}`);
  console.log(`    Solution quality: ${stats.solutionQuality}%`);
}

console.log('\n=== Demo Complete ===');
console.log('Phase 1.3 utility functions + Phase 3.2 CSP solver are ready for integration!');