# Test Generators - TimeBlock-based Scheduling

This directory contains three comprehensive generators for creating realistic test scenarios for the TimeBlock-based scheduling system. These generators work together to create test cases with varying difficulty levels, realistic patterns, and exact k-solvability guarantees.

## Overview

The test generator framework consists of three main components:

1. **AvailabilityGenerator** - Creates realistic availability patterns using TimeBlock system
2. **ConstraintGenerator** - Generates teacher constraints with varying strictness levels  
3. **StudentGenerator** - Produces varied student configurations with different types and preferences

## AvailabilityGenerator

Generates realistic `WeekSchedule` patterns using minute precision TimeBlocks.

### Key Features

- **12+ Availability Patterns**: working-hours, evening, morning, weekend-only, fragmented, etc.
- **Minute Precision**: Any time range, any duration (not limited to 30-minute slots)
- **Realistic Variations**: Adds natural variations to make patterns more realistic
- **Configurable**: Custom time ranges, active days, fragmentation levels, timezones
- **Deterministic**: Reproducible with seeds for consistent testing

### Usage Examples

```typescript
import { AvailabilityGenerator, availabilityPresets } from './availability-generator';

const generator = new AvailabilityGenerator(12345);

// Generate specific patterns
const workingHours = generator.generatePattern('working-hours');
const eveningOnly = generator.generatePattern('evening');
const fragmented = generator.generatePattern('fragmented');

// Use presets for common scenarios
const teacherSchedule = availabilityPresets.generateTeacherSchedule();
const flexibleStudent = availabilityPresets.generateFlexibleStudent();
const morningPerson = availabilityPresets.generateMorningStudent();
const busyStudent = availabilityPresets.generateBusyStudent();

// Custom configuration
const customSchedule = generator.generatePattern('working-hours', {
  activeDays: [1, 3, 5], // Monday, Wednesday, Friday
  primaryRange: { startMinute: 10 * 60, endMinute: 16 * 60 }, // 10am-4pm
  timezone: 'America/New_York'
});
```

### Available Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| `working-hours` | 9am-5pm with lunch break | Standard teacher availability |
| `evening` | 6pm-9pm slots | After-work students |
| `morning` | 7am-11am slots | Early morning preferences |
| `afternoon` | 1pm-5pm slots | Afternoon availability |
| `weekend-only` | Saturday/Sunday only | Weekend-only students |
| `weekday-only` | Monday-Friday only | School/work schedules |
| `fragmented` | Many small blocks | Busy, interrupted schedules |
| `peak-time` | 4pm-6pm (high conflict) | Peak demand periods |
| `sparse` | Very limited availability | Extremely busy students |
| `realistic` | Mixed patterns with variations | Natural, varied schedules |
| `part-time` | 2-3 days per week | Part-time availability |
| `full-time` | 8am-6pm extensive | High availability |

## ConstraintGenerator

Generates teacher scheduling constraints with varying strictness levels that affect solution space size.

### Key Features

- **6 Strictness Levels**: very-loose → extreme
- **Focus Areas**: Can emphasize specific constraint types
- **K-Solution Targeting**: Generate constraints optimized for specific solution counts
- **Constraint Analysis**: Analyze difficulty impact and identify bottlenecks
- **Realistic Variations**: Add natural variations to constraint values

### Usage Examples

```typescript
import { ConstraintGenerator, constraintPresets } from './constraint-generator';

const generator = new ConstraintGenerator(12345);

// Generate by strictness level
const flexible = generator.generateByStrictness('loose');
const moderate = generator.generateByStrictness('moderate');
const strict = generator.generateByStrictness('strict');

// Focus on specific constraint types
const breakFocused = generator.generateConstraints({
  strictness: 'strict',
  focus: { breakRequirements: true },
  addVariations: true
});

// Generate for k-solution targeting
const impossible = generator.generateForKSolutions(0); // k=0 (impossible)
const unique = generator.generateForKSolutions(1);     // k=1 (unique solution)
const flexible = generator.generateForKSolutions(100); // k=100 (many solutions)

// Analyze constraint difficulty
const analysis = generator.analyzeConstraints(constraints);
console.log(`Tightness: ${analysis.tightnessScore}`);
console.log(`Impact: ${analysis.difficultyImpact}`);
console.log(`Bottlenecks: ${analysis.bottlenecks}`);

// Use presets
const teacherConstraints = constraintPresets.generateTeacherConstraints();
const impossibleConstraints = constraintPresets.generateImpossibleConstraints();
```

### Strictness Levels

| Level | Consecutive Time | Break Duration | Allowed Durations | Use Case |
|-------|-----------------|----------------|-------------------|----------|
| `very-loose` | 6+ hours | 5 min | 10+ options | Easy scheduling |
| `loose` | 5 hours | 10 min | 7+ options | Flexible teachers |
| `moderate` | 4 hours | 15 min | 6 options | Standard constraints |
| `strict` | 3 hours | 20 min | 4 options | Demanding teachers |
| `very-strict` | 2 hours | 30 min | 2 options | Very limited |
| `extreme` | 1.5 hours | 45 min | 1 option | Nearly impossible |

### Focus Areas

- **consecutiveLimits**: Reduce maximum consecutive teaching time
- **breakRequirements**: Increase required break duration between sessions
- **durationFlexibility**: Narrow the range of allowed lesson durations
- **allowedDurations**: Reduce the number of acceptable lesson lengths

## StudentGenerator

Generates varied student configurations with different availability patterns, duration preferences, and scheduling constraints.

### Key Features

- **11 Student Types**: morning-person, evening-person, flexible, busy-student, etc.
- **Configurable Distribution**: Control the mix of student types
- **Duration Variety**: Different lesson length preferences and constraints
- **K-Solution Optimization**: Generate student sets optimized for specific difficulty levels
- **Set Analysis**: Analyze generated student sets for scheduling characteristics

### Usage Examples

```typescript
import { StudentGenerator, studentPresets } from './student-generator';

const generator = new StudentGenerator(12345);

// Generate mixed student set
const students = generator.generateStudents({
  count: 15,
  typeDistribution: {
    'morning-person': 0.3,
    'evening-person': 0.3,
    'flexible': 0.4
  },
  addVariations: true
});

// Generate for k-solution targeting
const easyStudents = generator.generateForKSolutions(100, 10); // Many solutions
const hardStudents = generator.generateForKSolutions(1, 15);   // Unique solution
const impossibleStudents = generator.generateForKSolutions(0, 20); // Impossible

// Analyze student set
const analysis = generator.analyzeStudentSet(students);
console.log(`Total students: ${analysis.totalStudents}`);
console.log(`Average duration: ${analysis.durationStats.averagePreferred}min`);
console.log(`Overlap ratio: ${analysis.difficultyIndicators.overlapRatio}`);

// Use presets
const realisticMix = studentPresets.generateRealisticMix(20);
const easySet = studentPresets.generateEasySchedulingSet(10);
const difficultSet = studentPresets.generateDifficultSchedulingSet(15);
const conflictingSet = studentPresets.generateConflictingSet(12);
```

### Student Types

| Type | Availability Pattern | Duration Preference | Max Lessons | Use Case |
|------|---------------------|-------------------|-------------|----------|
| `morning-person` | 7am-11am | Standard | 1-3 | Early risers |
| `evening-person` | 6pm-9pm | Standard | 1-3 | After work/school |
| `flexible` | Realistic mixed | Standard | 1-3 | Accommodating students |
| `weekend-only` | Sat/Sun only | Standard | 1-3 | Working students |
| `weekday-only` | Mon-Fri only | Standard | 1-2 | School schedules |
| `busy-student` | Very sparse | Shorter | 1 only | Extremely limited |
| `part-time` | 2-3 days | Standard | 1-2 | Part-time availability |
| `specific-days` | 2-3 random days | Standard | 1-2 | Irregular schedules |
| `long-lessons` | Realistic | 75-120 min | 1-3 | Prefers longer sessions |
| `short-lessons` | Realistic | 30-45 min | 1-3 | Prefers shorter sessions |
| `variable-length` | Realistic | Wide range | 1-3 | Very flexible on duration |

## Integration Examples

### Creating Test Scenarios

```typescript
import { AvailabilityGenerator, ConstraintGenerator, StudentGenerator } from './generators';

// Easy scheduling scenario
function createEasyScenario(seed: number) {
  const availGen = new AvailabilityGenerator(seed);
  const constraintGen = new ConstraintGenerator(seed);
  const studentGen = new StudentGenerator(seed);
  
  const teacher = {
    person: { id: 'teacher1', name: 'Easy Teacher', email: 'teacher@test.com' },
    studioId: 'studio1',
    availability: availGen.generatePattern('working-hours'),
    constraints: constraintGen.generateByStrictness('loose')
  };
  
  const students = studentGen.generateStudents({
    count: 10,
    typeDistribution: { 'flexible': 0.6, 'morning-person': 0.2, 'evening-person': 0.2 }
  });
  
  return { teacher, students };
}

// Impossible scheduling scenario
function createImpossibleScenario(seed: number) {
  const availGen = new AvailabilityGenerator(seed);
  const constraintGen = new ConstraintGenerator(seed);
  const studentGen = new StudentGenerator(seed);
  
  const teacher = {
    person: { id: 'teacher2', name: 'Strict Teacher', email: 'strict@test.com' },
    studioId: 'studio2',
    availability: availGen.generatePattern('sparse'), // Very limited
    constraints: constraintGen.generateForKSolutions(0) // Impossible constraints
  };
  
  const students = studentGen.generateForKSolutions(0, 15); // Conflicting students
  
  return { teacher, students };
}
```

### K-Solvability Testing

```typescript
// Generate test cases with exact solution counts
const testCases = [
  { k: 0, description: 'Impossible case' },
  { k: 1, description: 'Unique solution puzzle' },
  { k: 5, description: 'Few solutions' },
  { k: 10, description: 'Moderate flexibility' },
  { k: 100, description: 'Many solutions' }
];

testCases.forEach(({ k, description }) => {
  const constraints = constraintGen.generateForKSolutions(k, 'moderate');
  const students = studentGen.generateForKSolutions(k, 12);
  
  // Test with scheduler...
  const result = scheduler.solve(teacher, students);
  assert(result.solutions.length === k, `Expected ${k} solutions, got ${result.solutions.length}`);
});
```

## Time Utilities

The generators include utility functions for working with time:

```typescript
import { AvailabilityGenerator } from './availability-generator';

// Convert between time formats
const minutes = AvailabilityGenerator.timeToMinutes('14:30'); // 870
const timeStr = AvailabilityGenerator.minutesToTime(870); // "14:30"

// Check for overlaps
const overlap = AvailabilityGenerator.blocksOverlap(block1, block2);

// Merge overlapping blocks
const merged = AvailabilityGenerator.mergeOverlappingBlocks(blocks);
```

## Testing Strategy

These generators enable comprehensive testing of the scheduler:

1. **Basic Functionality**: Use presets for standard scenarios
2. **Edge Cases**: Generate extreme constraint combinations
3. **Performance**: Create scaling test suites (10→50 students)
4. **K-Solvability**: Generate cases with exact solution counts
5. **Regression**: Use seeded generation for reproducible tests

## Best Practices

1. **Use Seeds**: Always provide seeds for reproducible test cases
2. **Combine Generators**: Use all three generators together for realistic scenarios
3. **Analyze Results**: Use the analysis methods to understand test case characteristics
4. **Start Simple**: Begin with preset configurations before customizing
5. **Test Progressively**: Create difficulty progressions from trivial to impossible

## Performance Considerations

- Generators are fast (< 1ms per student/constraint/schedule)
- Use deterministic seeding for consistent performance testing
- Analysis methods provide insights into expected scheduler performance
- Generated test cases should meet the 50 students < 2 seconds target

This generator framework provides the foundation for comprehensive testing of the TimeBlock-based scheduling system, enabling validation of both correctness and performance across a wide range of realistic scenarios.