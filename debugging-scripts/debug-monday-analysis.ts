import fs from 'fs';
import path from 'path';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, '../lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

// Get Monday students
const mondayStudents = testCase.students.filter(student => 
  student.availability.days.some(day => day.dayOfWeek === 1 && day.blocks.length > 0)
);

console.log('=== MONDAY CAPACITY ANALYSIS ===');

const teacherMonday = testCase.teacher.availability.days[1];
const teacherBlock = teacherMonday.blocks[0];
console.log(`Teacher available: ${teacherBlock.start}-${teacherBlock.start + teacherBlock.duration} (${teacherBlock.duration} minutes)`);

// Generate all possible 60-minute slots
const possibleSlots = [];
for (let start = teacherBlock.start; start <= teacherBlock.start + teacherBlock.duration - 60; start += 60) {
  possibleSlots.push({ start, end: start + 60 });
}

console.log(`\nPossible 60-minute slots: ${possibleSlots.length}`);
possibleSlots.forEach((slot, i) => {
  console.log(`  Slot ${i+1}: ${slot.start}-${slot.end}`);
});

console.log('\n=== STUDENT AVAILABILITY PER SLOT ===');
possibleSlots.forEach((slot, i) => {
  console.log(`\nSlot ${i+1} (${slot.start}-${slot.end}):`);
  
  const availableStudents = mondayStudents.filter(student => {
    const mondayDay = student.availability.days.find(day => day.dayOfWeek === 1);
    if (!mondayDay || mondayDay.blocks.length === 0) return false;
    
    const block = mondayDay.blocks[0];
    // Student is available if their block contains the entire 60-minute slot
    return block.start <= slot.start && block.start + block.duration >= slot.end;
  });
  
  console.log(`  Available students: ${availableStudents.length}`);
  availableStudents.forEach(student => {
    const mondayDay = student.availability.days.find(day => day.dayOfWeek === 1);
    const block = mondayDay.blocks[0];
    console.log(`    ${student.person.id}: ${block.start}-${block.start + block.duration}`);
  });
});

console.log('\n=== MAXIMUM THEORETICAL CAPACITY ===');
const nonEmptySlots = possibleSlots.filter((slot, i) => {
  const availableStudents = mondayStudents.filter(student => {
    const mondayDay = student.availability.days.find(day => day.dayOfWeek === 1);
    if (!mondayDay || mondayDay.blocks.length === 0) return false;
    
    const block = mondayDay.blocks[0];
    return block.start <= slot.start && block.start + block.duration >= slot.end;
  });
  return availableStudents.length > 0;
});

console.log(`Non-empty slots: ${nonEmptySlots.length}`);
console.log(`Therefore, maximum capacity = ${nonEmptySlots.length} lessons`);