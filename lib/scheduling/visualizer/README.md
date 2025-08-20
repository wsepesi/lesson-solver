# Schedule Visualizer

A command-line tool for debugging the lesson scheduling solver by visualizing student schedules, teacher availability, solution results, and expected vs actual outcomes.

## Features

- **ASCII-based visualization** of weekly schedules with minute precision
- **Multiple display modes**: detailed, compact, and summary views
- **Color-coded output** for easy identification of different schedule elements
- **Test integration** with automatic visualization on test failures
- **Comparison mode** for expected vs actual results
- **CLI interface** with comprehensive options
- **Export capabilities** to files for reports and documentation

## Quick Start

### Basic Usage

```bash
# Show help
pnpm visualize --help

# Run example visualizations
pnpm tsx lib/scheduling/visualizer/example.ts

# Visualize with different modes
pnpm visualize --mode=detailed --granularity=15
pnpm visualize --mode=compact --no-color
pnpm visualize --mode=summary
```

### Test Integration

```bash
# Run tests with automatic visualization on failures
pnpm test:run --reporter=lib/scheduling/visualizer/test-integration.ts

# Enable visualization in your test files
import { enableTestVisualization, captureTestData } from './test-integration';

beforeAll(() => {
  enableTestVisualization();
});
```

## Display Examples

### Student Schedule Visualization
```
📚 STUDENT SCHEDULES (3 students)

┌──────────────────────── Alice Smith (1h lessons) ────────────────────────┐
│Mon    │ ████████████░░░░░░░░░░░░░░░░░░░ 9:00-12:00 AM     │
│Wed    │ ░░░░░░████████░░░░░░░░░░░░░░░░░ 2:00-4:00 PM      │
│Fri    │ ████████████████░░░░░░░░░░░░░░░ 9:00-1:00 PM      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Teacher Schedule Visualization
```
👨‍🏫 TEACHER SCHEDULE

       8:00 AM 9   10  11  12  13  14  15  16  17  
Mon    │ ████████████████████░░░░░░░░░░░ 9:00 AM-2:00 PM   │
Tue    │ ████████████████████████░░░░░░░ 9:00 AM-3:00 PM   │
Wed    │ ████████████████████░░░░░░░░░░░ 9:00 AM-2:00 PM   │
```

### Solution Results
```
🎯 SOLUTION
✅ 2/3 students scheduled

┌─────────────────────────────────────────────────────────────┐
│ ✅ Alice    Mon 10:00-11:00 AM                              │
│ ✅ Bob      Tue 11:00-12:00 PM                              │
│ ❌ Charlie  [UNSCHEDULED - No valid slots]                  │
└─────────────────────────────────────────────────────────────┘
```

### Comparison View
```
COMPARISON: Expected vs Actual

              EXPECTED                │                ACTUAL                
───────────────────────────────────── ┼ ─────────────────────────────────────
✅ 3/3 scheduled                       │ ✅ 2/3 scheduled                      
⏱️ 150ms                              │ ⏱️ 220ms                             
Alice Smith Mon 10:00 AM              │ Alice Smith Mon 9:00 AM              
Bob Wilson Tue 2:00 PM                │ Bob Wilson Tue 2:00 PM               
Charlie Brown Wed 4:00 PM             │ [UNSCHEDULED]                        
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--test, -t` | Test case name or ID to visualize | |
| `--mode, -m` | Display mode (detailed, compact, summary) | detailed |
| `--granularity, -g` | Time granularity in minutes (5, 15, 30, 60) | 15 |
| `--start-hour, -s` | Start hour for display (0-23) | 6 |
| `--end-hour, -e` | End hour for display (0-23) | 22 |
| `--output, -o` | Output file path | stdout |
| `--interactive, -i` | Enable interactive mode | false |
| `--compare, -c` | Show comparison view | false |
| `--width, -w` | Override terminal width | auto |
| `--no-color` | Disable colored output | false |

## Integration with Tests

### Automatic Visualization on Test Failures

```typescript
import { VisualizerReporter } from './test-integration';

// In vitest.config.ts or test command
export default defineConfig({
  test: {
    reporters: [
      'default',
      new VisualizerReporter({ outputDir: 'test-reports/visualizations' })
    ]
  }
});
```

### Manual Test Data Capture

```typescript
import { captureTestData, enableTestVisualization } from './test-integration';

describe('My Scheduling Tests', () => {
  beforeAll(() => {
    enableTestVisualization();
  });

  it('should schedule students correctly', async () => {
    const solution = await solveSchedule(teacher, students);
    
    // Capture for visualization on failure
    captureTestData('my_test_case', teacher, students, {
      actualSolution: solution,
      description: 'Test case description'
    });
    
    expect(solution.assignments.length).toBe(2);
  });
});
```

### Visualizable Test Wrapper

```typescript
import { visualizableTest } from './test-integration';

it('should handle complex scenario', 
  visualizableTest(
    'complex_scenario',
    teacher,
    students,
    async () => {
      const solution = await solveSchedule(teacher, students);
      expect(solution.assignments.length).toBeGreaterThan(0);
      return solution;
    },
    { description: 'Complex scheduling scenario with multiple constraints' }
  )
);
```

## Programmatic Usage

```typescript
import { ScheduleVisualizer, type VisualizerTestCase } from './index';

const visualizer = new ScheduleVisualizer({
  mode: 'detailed',
  granularity: 15,
  showLegend: true
});

const testCase: VisualizerTestCase = {
  id: 'my-test',
  description: 'Test case description',
  teacher,
  students,
  actualSolution: solution
};

// Generate visualization
const output = visualizer.renderTestCase(testCase);
console.log(output);

// Generate comparison
const comparison = visualizer.renderComparison(testCase);
console.log(comparison);
```

## File Structure

```
lib/scheduling/visualizer/
├── index.ts              # Main ScheduleVisualizer class
├── display.ts            # Display components (WeekSchedule, Students, Solution, Comparison)
├── utils.ts              # Utility functions (colors, formatting, terminal helpers)
├── cli.ts                # Command-line interface
├── test-integration.ts   # Test framework integration and reporter
├── example.ts            # Example usage and demonstrations
├── integration-example.ts # Test integration examples
└── README.md             # This file
```

## Legend

| Symbol | Meaning |
|--------|---------|
| `█` | Available time slots |
| `░` | Busy/unavailable time slots |
| `✅` | Successfully scheduled |
| `❌` | Failed to schedule |
| `⚠️` | Warning or partial success |
| `ℹ️` | Information |
| `📚` | Student schedules |
| `👨‍🏫` | Teacher schedule |
| `🎯` | Solution results |

## Export Formats

The visualizer can export to multiple formats:

- **Plain text**: ANSI codes stripped for file output
- **Colored text**: Full terminal color support
- **HTML**: (Future) Syntax-highlighted web format
- **Markdown**: (Future) Documentation-friendly format

## Performance

The visualizer is optimized for:
- Large numbers of students (50+)
- Complex schedules with many time blocks
- Responsive terminal layouts
- Minimal memory usage during rendering

## Troubleshooting

### Common Issues

1. **Colors not showing**: Use `--no-color` flag or check terminal color support
2. **Layout issues**: Try `--width=80` to override terminal width detection
3. **Test integration not working**: Ensure `enableTestVisualization()` is called in test setup

### Debug Mode

For debugging the visualizer itself:

```bash
DEBUG=visualizer pnpm visualize --test="test_case"
```

## Contributing

When adding new visualization features:

1. Update the display components in `display.ts`
2. Add utility functions to `utils.ts` if needed
3. Update CLI options in `cli.ts`
4. Add examples to `example.ts`
5. Update this README with new features