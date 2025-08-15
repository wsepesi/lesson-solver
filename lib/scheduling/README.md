# Scheduling System - Phase 1.3 Complete

This directory contains the Phase 1.3 implementation of the new TimeBlock-based scheduling system, as defined in `/plans/data-model.md`.

## Overview

The new scheduling system replaces the boolean grid approach with flexible TimeBlock tuples, enabling:
- **Minute-level precision** - Any start time and duration
- **Flexible time ranges** - Not limited to 9am-9pm
- **Efficient operations** - Direct interval arithmetic instead of grid manipulations
- **Type safety** - Comprehensive TypeScript types with validation

## Files

### Core Implementation
- **`types.ts`** - Core data types (TimeBlock, DaySchedule, WeekSchedule, etc.)
- **`utils.ts`** - All utility functions for time conversion, schedule operations, validation
- **`index.ts`** - Main export file for the module

### Testing & Examples
- **`tests/utils.test.ts`** - Comprehensive test suite (45 tests, all passing)
- **`example.ts`** - Complete demo of all utilities with sample data

## Usage

```typescript
import {
  TimeBlock,
  WeekSchedule,
  timeStringToMinutes,
  createEmptyWeekSchedule,
  findAvailableSlots,
  validateWeekSchedule
} from 'lib/scheduling';

// Convert human-readable time to minutes
const startTime = timeStringToMinutes('09:30'); // 570

// Create a time block
const block: TimeBlock = { start: startTime, duration: 90 };

// Create and validate schedules
const schedule = createEmptyWeekSchedule('America/New_York');
const isValid = validateWeekSchedule(schedule);
```

## Key Features

### Time Representation
- **Minutes from day start**: 0-1439 (midnight to 23:59)
- **TimeBlock format**: `{start: number, duration: number}`
- **No grid constraints**: Any time, any duration, any precision

### Schedule Operations
- **Merge overlapping blocks** - Consolidates adjacent/overlapping time
- **Find available slots** - Generates all possible lesson times
- **Availability checking** - Validates if specific times are free
- **Metadata computation** - Utilization, fragmentation, largest blocks

### Validation
- **Type safety** - Runtime validation of all data structures
- **Overlap detection** - Prevents scheduling conflicts
- **Range checking** - Ensures times are within valid ranges
- **Structure validation** - Verifies correct WeekSchedule format

### Database Integration
- **Placeholder operations** - Ready for Phase 1.2 schema integration
- **Async interfaces** - Prepared for real database operations
- **Error handling** - Comprehensive validation before persistence

## Test Results

All 45 tests passing:
```
✓ Time conversion utilities (8 tests)
✓ Schedule operations (16 tests) 
✓ Validation functions (13 tests)
✓ Utility functions (8 tests)
```

## Next Steps

Phase 1.3 is **complete** and ready for:

1. **Phase 1.2**: Database schema implementation
2. **Phase 2.1**: AdaptiveCalendar UI component 
3. **Phase 2.2**: Schedule persistence hooks
4. **Phase 3**: CSP solver implementation

## Performance

Optimized for typical studio sizes:
- **Time conversions**: O(1) constant time
- **Block merging**: O(n log n) where n = number of blocks
- **Slot finding**: O(n × m) where m = slots per block
- **Validation**: O(n) linear time
- **Memory usage**: Minimal - no grid arrays, direct intervals only

## Architecture Alignment

This implementation follows the data model exactly as specified in `/plans/data-model.md`:
- ✅ TimeBlock `{start: number, duration: number}` format
- ✅ Minute-level precision (0-1439 range)
- ✅ No boolean grids or fixed time slots
- ✅ Flexible duration and time range support
- ✅ Comprehensive validation and error handling
- ✅ Database operation interfaces ready
- ✅ Type-safe throughout with TypeScript