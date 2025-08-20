import fs from 'fs';
import path from 'path';

// Load the extracted test data
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataPath = path.join(__dirname, 'lib/scheduling/tests/extracted-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const testCase = testData.testCases[0];

console.log('=== CAPACITY ANALYSIS FOR ALL WEEKDAYS ===');

// For each weekday (1-5), calculate theoretical capacity
let totalCapacity = 0;

for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
  console.log(`\n=== DAY ${dayOfWeek} ANALYSIS ===`);
  
  const teacherDay = testCase.teacher.availability.days[dayOfWeek];
  if (!teacherDay || teacherDay.blocks.length === 0) {
    console.log('Teacher not available');
    continue;
  }
  
  const teacherBlock = teacherDay.blocks[0];
  console.log(`Teacher available: ${teacherBlock.start}-${teacherBlock.start + teacherBlock.duration} (${teacherBlock.duration} minutes)`);
  
  // Get students available on this day
  const studentsOnDay = testCase.students.filter(student => 
    student.availability.days.some(day => day.dayOfWeek === dayOfWeek && day.blocks.length > 0)
  );
  
  console.log(`Students interested in day ${dayOfWeek}: ${studentsOnDay.length}`);
  
  // Generate all possible 60-minute slots
  const possibleSlots = [];
  for (let start = teacherBlock.start; start <= teacherBlock.start + teacherBlock.duration - 60; start += 60) {
    possibleSlots.push({ start, end: start + 60 });
  }
  
  console.log(`Possible slots: ${possibleSlots.length}`);
  
  // Count how many students are available for each slot
  let filledSlots = 0;
  possibleSlots.forEach((slot, i) => {
    const availableStudents = studentsOnDay.filter(student => {
      const studentDay = student.availability.days.find(day => day.dayOfWeek === dayOfWeek);
      if (!studentDay || studentDay.blocks.length === 0) return false;
      
      const block = studentDay.blocks[0];
      return block.start <= slot.start && block.start + block.duration >= slot.end;
    });
    
    console.log(`  Slot ${i+1} (${slot.start}-${slot.end}): ${availableStudents.length} students available`);
    
    if (availableStudents.length > 0) {
      filledSlots++;
    }
  });
  
  console.log(`Day ${dayOfWeek} capacity: ${filledSlots} lessons`);
  totalCapacity += filledSlots;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total theoretical capacity: ${totalCapacity} lessons`);
console.log(`Test expects: >= 25 lessons`);
console.log(`Current solver achieves: 15 lessons`);
console.log(`Performance gap: ${totalCapacity - 15} lessons missing`);