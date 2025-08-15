import { describe, test, expect } from 'vitest';
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
  detectOverlaps,
  createEmptyWeekSchedule,
  cloneWeekSchedule,
  getTotalAvailableMinutes,
  formatDuration
} from '../utils';
import type { TimeBlock, DaySchedule, WeekSchedule } from '../types';

describe('Time Conversion Utilities', () => {
  describe('timeStringToMinutes', () => {
    test('converts valid time strings correctly', () => {
      expect(timeStringToMinutes('00:00')).toBe(0);
      expect(timeStringToMinutes('09:30')).toBe(570);
      expect(timeStringToMinutes('14:30')).toBe(870);
      expect(timeStringToMinutes('23:59')).toBe(1439);
    });

    test('handles single digit hours and minutes', () => {
      expect(timeStringToMinutes('9:30')).toBe(570);
      expect(timeStringToMinutes('09:5')).toBe(545);
      expect(timeStringToMinutes('9:5')).toBe(545);
    });

    test('throws error for invalid format', () => {
      expect(() => timeStringToMinutes('25:00')).toThrow('Invalid time format');
      expect(() => timeStringToMinutes('09:60')).toThrow('Invalid time format');
      expect(() => timeStringToMinutes('abc')).toThrow('Invalid time format');
      expect(() => timeStringToMinutes('')).toThrow('Invalid time format');
    });

    test('throws error for invalid values', () => {
      expect(() => timeStringToMinutes('24:00')).toThrow('Invalid time format');
      expect(() => timeStringToMinutes('-1:00')).toThrow('Invalid time format');
    });
  });

  describe('minutesToTimeString', () => {
    test('converts valid minutes correctly', () => {
      expect(minutesToTimeString(0)).toBe('00:00');
      expect(minutesToTimeString(570)).toBe('09:30');
      expect(minutesToTimeString(870)).toBe('14:30');
      expect(minutesToTimeString(1439)).toBe('23:59');
    });

    test('pads single digits correctly', () => {
      expect(minutesToTimeString(65)).toBe('01:05');
      expect(minutesToTimeString(545)).toBe('09:05');
    });

    test('throws error for invalid minutes', () => {
      expect(() => minutesToTimeString(-1)).toThrow('Invalid minutes');
      expect(() => minutesToTimeString(1440)).toThrow('Invalid minutes');
      expect(() => minutesToTimeString(2000)).toThrow('Invalid minutes');
    });
  });

  describe('blockToTimeRange', () => {
    test('converts time blocks to readable ranges', () => {
      expect(blockToTimeRange({ start: 570, duration: 90 })).toEqual(['09:30', '11:00']);
      expect(blockToTimeRange({ start: 0, duration: 60 })).toEqual(['00:00', '01:00']);
      expect(blockToTimeRange({ start: 1380, duration: 59 })).toEqual(['23:00', '23:59']);
    });
  });
});

describe('Schedule Operations', () => {
  describe('mergeTimeBlocks', () => {
    test('merges adjacent blocks', () => {
      const blocks: TimeBlock[] = [
        { start: 60, duration: 30 },   // 01:00-01:30
        { start: 90, duration: 30 }    // 01:30-02:00
      ];
      const merged = mergeTimeBlocks(blocks);
      expect(merged).toEqual([{ start: 60, duration: 60 }]);
    });

    test('merges overlapping blocks', () => {
      const blocks: TimeBlock[] = [
        { start: 60, duration: 60 },   // 01:00-02:00
        { start: 90, duration: 60 }    // 01:30-02:30
      ];
      const merged = mergeTimeBlocks(blocks);
      expect(merged).toEqual([{ start: 60, duration: 90 }]);
    });

    test('keeps separate non-adjacent blocks', () => {
      const blocks: TimeBlock[] = [
        { start: 60, duration: 30 },   // 01:00-01:30
        { start: 180, duration: 30 }   // 03:00-03:30
      ];
      const merged = mergeTimeBlocks(blocks);
      expect(merged).toEqual([
        { start: 60, duration: 30 },
        { start: 180, duration: 30 }
      ]);
    });

    test('handles empty array', () => {
      expect(mergeTimeBlocks([])).toEqual([]);
    });

    test('sorts blocks by start time before merging', () => {
      const blocks: TimeBlock[] = [
        { start: 180, duration: 30 },  // 03:00-03:30
        { start: 60, duration: 30 },   // 01:00-01:30
        { start: 90, duration: 30 }    // 01:30-02:00
      ];
      const merged = mergeTimeBlocks(blocks);
      expect(merged).toEqual([
        { start: 60, duration: 60 },   // Merged 01:00-02:00
        { start: 180, duration: 30 }   // Separate 03:00-03:30
      ]);
    });
  });

  describe('findAvailableSlots', () => {
    test('finds slots within a single block', () => {
      const daySchedule: DaySchedule = {
        dayOfWeek: 1,
        blocks: [{ start: 540, duration: 120 }] // 09:00-11:00
      };
      
      const slots = findAvailableSlots(daySchedule, 60);
      expect(slots).toHaveLength(2);
      expect(slots).toEqual([
        { start: 540, duration: 60 },  // 09:00-10:00
        { start: 600, duration: 60 }   // 10:00-11:00
      ]);
    });

    test('finds slots across multiple blocks', () => {
      const daySchedule: DaySchedule = {
        dayOfWeek: 1,
        blocks: [
          { start: 540, duration: 60 },  // 09:00-10:00
          { start: 720, duration: 90 }   // 12:00-13:30
        ]
      };
      
      const slots = findAvailableSlots(daySchedule, 30);
      expect(slots).toHaveLength(5); // 2 in first block + 3 in second block
    });

    test('returns empty array for empty schedule', () => {
      const daySchedule: DaySchedule = {
        dayOfWeek: 1,
        blocks: []
      };
      
      const slots = findAvailableSlots(daySchedule, 60);
      expect(slots).toEqual([]);
    });

    test('returns empty array when no slots fit', () => {
      const daySchedule: DaySchedule = {
        dayOfWeek: 1,
        blocks: [{ start: 540, duration: 30 }] // 09:00-09:30
      };
      
      const slots = findAvailableSlots(daySchedule, 60);
      expect(slots).toEqual([]);
    });
  });

  describe('isTimeAvailable', () => {
    const daySchedule: DaySchedule = {
      dayOfWeek: 1,
      blocks: [
        { start: 540, duration: 120 },  // 09:00-11:00
        { start: 720, duration: 60 }    // 12:00-13:00
      ]
    };

    test('returns true for available time slots', () => {
      expect(isTimeAvailable(daySchedule, 540, 60)).toBe(true);   // 09:00-10:00
      expect(isTimeAvailable(daySchedule, 600, 60)).toBe(true);   // 10:00-11:00
      expect(isTimeAvailable(daySchedule, 720, 30)).toBe(true);   // 12:00-12:30
    });

    test('returns false for unavailable time slots', () => {
      expect(isTimeAvailable(daySchedule, 480, 60)).toBe(false);  // 08:00-09:00 (before)
      expect(isTimeAvailable(daySchedule, 660, 60)).toBe(false);  // 11:00-12:00 (gap)
      expect(isTimeAvailable(daySchedule, 780, 30)).toBe(false);  // 13:00-13:30 (after)
    });

    test('returns false for slots that extend beyond available time', () => {
      expect(isTimeAvailable(daySchedule, 630, 60)).toBe(false);  // 10:30-11:30 (extends beyond)
      expect(isTimeAvailable(daySchedule, 750, 60)).toBe(false);  // 12:30-13:30 (extends beyond)
    });

    test('returns false for empty schedule', () => {
      const emptySchedule: DaySchedule = { dayOfWeek: 1, blocks: [] };
      expect(isTimeAvailable(emptySchedule, 540, 60)).toBe(false);
    });
  });

  describe('computeScheduleMetadata', () => {
    test('computes metadata for schedule with blocks', () => {
      const daySchedule: DaySchedule = {
        dayOfWeek: 1,
        blocks: [
          { start: 540, duration: 120 }, // 09:00-11:00
          { start: 720, duration: 60 }   // 12:00-13:00
        ]
      };
      
      const metadata = computeScheduleMetadata(daySchedule);
      expect(metadata.totalAvailable).toBe(180); // 120 + 60
      expect(metadata.largestBlock).toBe(120);
      expect(metadata.fragmentationScore).toBe(0.5); // (2-1)/2 = 0.5
    });

    test('handles single block (no fragmentation)', () => {
      const daySchedule: DaySchedule = {
        dayOfWeek: 1,
        blocks: [{ start: 540, duration: 180 }] // 09:00-12:00
      };
      
      const metadata = computeScheduleMetadata(daySchedule);
      expect(metadata.totalAvailable).toBe(180);
      expect(metadata.largestBlock).toBe(180);
      expect(metadata.fragmentationScore).toBe(0); // No fragmentation
    });

    test('handles empty schedule', () => {
      const daySchedule: DaySchedule = { dayOfWeek: 1, blocks: [] };
      
      const metadata = computeScheduleMetadata(daySchedule);
      expect(metadata.totalAvailable).toBe(0);
      expect(metadata.largestBlock).toBe(0);
      expect(metadata.fragmentationScore).toBe(0);
    });
  });
});

describe('Validation Functions', () => {
  describe('validateTimeBlock', () => {
    test('validates correct time blocks', () => {
      expect(validateTimeBlock({ start: 0, duration: 60 })).toBe(true);
      expect(validateTimeBlock({ start: 570, duration: 90 })).toBe(true);
      expect(validateTimeBlock({ start: 1380, duration: 59 })).toBe(true); // 23:00-23:59
    });

    test('rejects invalid time blocks', () => {
      expect(validateTimeBlock({ start: -1, duration: 60 })).toBe(false);   // Negative start
      expect(validateTimeBlock({ start: 1440, duration: 60 })).toBe(false); // Start >= 1440
      expect(validateTimeBlock({ start: 570, duration: 0 })).toBe(false);   // Zero duration
      expect(validateTimeBlock({ start: 570, duration: -30 })).toBe(false); // Negative duration
      expect(validateTimeBlock({ start: 1380, duration: 61 })).toBe(false); // Extends beyond day
    });

    test('rejects non-objects and invalid types', () => {
      expect(validateTimeBlock(null as unknown as TimeBlock)).toBe(false);
      expect(validateTimeBlock(undefined as unknown as TimeBlock)).toBe(false);
      expect(validateTimeBlock('invalid' as unknown as TimeBlock)).toBe(false);
      expect(validateTimeBlock({ start: '570', duration: 60 } as unknown as TimeBlock)).toBe(false);
      expect(validateTimeBlock({ start: 570, duration: '60' } as unknown as TimeBlock)).toBe(false);
    });
  });

  describe('validateWeekSchedule', () => {
    test('validates correct week schedule', () => {
      const validSchedule: WeekSchedule = {
        days: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          blocks: i === 1 ? [{ start: 540, duration: 60 }] : [] // Monday has one block
        })),
        timezone: 'UTC'
      };
      
      expect(validateWeekSchedule(validSchedule)).toBe(true);
    });

    test('rejects schedule with wrong number of days', () => {
      const invalidSchedule: WeekSchedule = {
        days: [{ dayOfWeek: 0, blocks: [] }], // Only 1 day instead of 7
        timezone: 'UTC'
      };
      
      expect(validateWeekSchedule(invalidSchedule)).toBe(false);
    });

    test('rejects schedule with invalid day indices', () => {
      const invalidSchedule: WeekSchedule = {
        days: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i === 1 ? 8 : i, // Invalid day index
          blocks: []
        })),
        timezone: 'UTC'
      };
      
      expect(validateWeekSchedule(invalidSchedule)).toBe(false);
    });

    test('rejects schedule with overlapping blocks', () => {
      const invalidSchedule: WeekSchedule = {
        days: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          blocks: i === 1 ? [
            { start: 540, duration: 90 },  // 09:00-10:30
            { start: 600, duration: 60 }   // 10:00-11:00 (overlaps)
          ] : []
        })),
        timezone: 'UTC'
      };
      
      expect(validateWeekSchedule(invalidSchedule)).toBe(false);
    });

    test('rejects schedule with missing timezone', () => {
      const invalidSchedule = {
        days: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          blocks: []
        }))
        // Missing timezone
      } as unknown as WeekSchedule;
      
      expect(validateWeekSchedule(invalidSchedule)).toBe(false);
    });
  });

  describe('detectOverlaps', () => {
    test('detects overlapping blocks', () => {
      const blocks: TimeBlock[] = [
        { start: 540, duration: 90 },  // 09:00-10:30
        { start: 600, duration: 60 },  // 10:00-11:00 (overlaps with first)
        { start: 720, duration: 30 }   // 12:00-12:30 (no overlap)
      ];
      
      const overlaps = detectOverlaps(blocks);
      expect(overlaps).toHaveLength(2);
      expect(overlaps).toContainEqual({ start: 540, duration: 90 });
      expect(overlaps).toContainEqual({ start: 600, duration: 60 });
    });

    test('returns empty array for non-overlapping blocks', () => {
      const blocks: TimeBlock[] = [
        { start: 540, duration: 60 },  // 09:00-10:00
        { start: 600, duration: 60 },  // 10:00-11:00 (adjacent, not overlapping)
        { start: 720, duration: 30 }   // 12:00-12:30
      ];
      
      const overlaps = detectOverlaps(blocks);
      expect(overlaps).toEqual([]);
    });

    test('handles empty array', () => {
      expect(detectOverlaps([])).toEqual([]);
    });

    test('handles single block', () => {
      const blocks: TimeBlock[] = [{ start: 540, duration: 60 }];
      expect(detectOverlaps(blocks)).toEqual([]);
    });
  });
});

describe('Utility Functions', () => {
  describe('createEmptyWeekSchedule', () => {
    test('creates valid empty schedule with default timezone', () => {
      const schedule = createEmptyWeekSchedule();
      
      expect(schedule.timezone).toBe('UTC');
      expect(schedule.days).toHaveLength(7);
      
      schedule.days.forEach((day, index) => {
        expect(day.dayOfWeek).toBe(index);
        expect(day.blocks).toEqual([]);
      });
    });

    test('creates empty schedule with custom timezone', () => {
      const schedule = createEmptyWeekSchedule('America/New_York');
      expect(schedule.timezone).toBe('America/New_York');
    });
  });

  describe('cloneWeekSchedule', () => {
    test('creates deep copy of week schedule', () => {
      const original: WeekSchedule = {
        days: [
          { dayOfWeek: 0, blocks: [{ start: 540, duration: 60 }] },
          ...Array.from({ length: 6 }, (_, i) => ({
            dayOfWeek: i + 1,
            blocks: []
          }))
        ],
        timezone: 'UTC'
      };
      
      const cloned = cloneWeekSchedule(original);
      
      // Verify it's a different object
      expect(cloned).not.toBe(original);
      expect(cloned.days).not.toBe(original.days);
      expect(cloned.days[0]).not.toBe(original.days[0]);
      expect(cloned.days[0]!.blocks).not.toBe(original.days[0]!.blocks);
      expect(cloned.days[0]!.blocks[0]).not.toBe(original.days[0]!.blocks[0]);
      
      // But content should be equal
      expect(cloned).toEqual(original);
      
      // Verify modifications don't affect original
      cloned.days[0]!.blocks[0]!.duration = 90;
      expect(original.days[0]!.blocks[0]!.duration).toBe(60);
    });
  });

  describe('getTotalAvailableMinutes', () => {
    test('calculates total across all days', () => {
      const schedule: WeekSchedule = {
        days: [
          { dayOfWeek: 0, blocks: [{ start: 540, duration: 60 }] },      // 60 minutes
          { dayOfWeek: 1, blocks: [{ start: 540, duration: 120 }] },     // 120 minutes
          { dayOfWeek: 2, blocks: [] },                                   // 0 minutes
          { dayOfWeek: 3, blocks: [{ start: 540, duration: 30 }, { start: 720, duration: 60 }] }, // 90 minutes
          ...Array.from({ length: 3 }, (_, i) => ({ dayOfWeek: i + 4, blocks: [] }))
        ],
        timezone: 'UTC'
      };
      
      expect(getTotalAvailableMinutes(schedule)).toBe(270); // 60 + 120 + 0 + 90
    });

    test('returns 0 for empty schedule', () => {
      const schedule = createEmptyWeekSchedule();
      expect(getTotalAvailableMinutes(schedule)).toBe(0);
    });
  });

  describe('formatDuration', () => {
    test('formats minutes correctly', () => {
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(45)).toBe('45m');
    });

    test('formats hours correctly', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(180)).toBe('3h');
    });

    test('formats hours and minutes correctly', () => {
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(135)).toBe('2h 15m');
      expect(formatDuration(195)).toBe('3h 15m');
    });

    test('handles zero duration', () => {
      expect(formatDuration(0)).toBe('0m');
    });
  });
});