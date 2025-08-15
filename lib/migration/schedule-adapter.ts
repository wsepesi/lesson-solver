/**
 * Migration Adapter for Backward Compatibility
 * 
 * Provides seamless conversion between legacy Schedule format and new
 * flexible scheduling system. Supports gradual migration with feature flags.
 */

import type { Schedule, BlockOfTime, Day } from '../types';
import { Time } from '../types';
import type { 
  FlexibleScheduleItem, 
  TimeSlot, 
  TimeString
} from '../time-utils';
import { isValidTimeString } from '../time-utils';

// Day mapping for conversions
const DAY_NAME_TO_NUMBER: Record<Day, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

const DAY_NUMBER_TO_NAME: Record<number, Day> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',  
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

export class ScheduleAdapter {
  /**
   * Convert legacy Schedule format to new flexible format
   * Maps Day -> BlockOfTime[] to FlexibleScheduleItem[]
   */
  static legacyToFlexible(schedule: Schedule): FlexibleScheduleItem[] {
    const items: FlexibleScheduleItem[] = [];
    
    for (const [dayName, blocks] of Object.entries(schedule)) {
      if (!blocks || blocks.length === 0) continue;
      
      const dayOfWeek = DAY_NAME_TO_NUMBER[dayName as Day];
      if (dayOfWeek === undefined) {
        console.warn(`Unknown day name: ${dayName}`);
        continue;
      }
      
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block) continue;
        
        try {
          const startTime = this.timeToTimeString(block.start);
          const endTime = this.timeToTimeString(block.end);
          
          items.push({
            id: `${dayName}-${i}-${startTime}-${endTime}`,
            timeSlot: {
              startTime,
              endTime
            },
            recurrence: {
              type: 'weekly',
              interval: 1,
              daysOfWeek: [dayOfWeek]
            },
            metadata: {
              originalDay: dayName,
              originalIndex: i,
              source: 'legacy-migration'
            }
          });
        } catch (error) {
          console.error(`Failed to convert block ${i} for ${dayName}:`, error);
        }
      }
    }
    
    return items;
  }

  /**
   * Convert new flexible format back to legacy Schedule
   * Maps FlexibleScheduleItem[] to Day -> BlockOfTime[]
   */
  static flexibleToLegacy(items: FlexibleScheduleItem[]): Schedule {
    const schedule: Schedule = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };

    for (const item of items) {
      // Skip non-weekly recurring items for legacy compatibility
      if (!item.recurrence || item.recurrence.type !== 'weekly') {
        console.warn('Skipping non-weekly recurrence item for legacy compatibility', item.id);
        continue;
      }

      if (!item.recurrence.daysOfWeek) {
        console.warn('Skipping item without daysOfWeek', item.id);
        continue;
      }

      for (const dayNum of item.recurrence.daysOfWeek) {
        const dayName = DAY_NUMBER_TO_NAME[dayNum];
        if (!dayName) {
          console.warn(`Invalid day number: ${dayNum}`);
          continue;
        }

        try {
          const startTime = this.timeStringToTime(item.timeSlot.startTime);
          const endTime = this.timeStringToTime(item.timeSlot.endTime);
          
          schedule[dayName]?.push({
            start: startTime,
            end: endTime
          });
        } catch (error) {
          console.error(`Failed to convert flexible item ${item.id}:`, error);
        }
      }
    }

    // Sort blocks by start time for consistency
    for (const day of Object.keys(schedule) as Day[]) {
      const daySchedule = schedule[day];
      if (daySchedule) {
        schedule[day] = daySchedule.sort((a, b) => {
          return a.start.valueOf() - b.start.valueOf();
        });
      }
    }

    return schedule;
  }

  /**
   * Convert Time object to TimeString
   */
  private static timeToTimeString(time: Time): TimeString {
    if (time.hour < 0 || time.hour > 23 || time.minute < 0 || time.minute > 59) {
      throw new Error(`Invalid time: ${time.hour}:${time.minute}`);
    }
    
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  }

  /**
   * Convert TimeString to Time object
   */
  private static timeStringToTime(timeString: TimeString): Time {
    if (!isValidTimeString(timeString)) {
      throw new Error(`Invalid time string: ${timeString}`);
    }
    
    const parts = timeString.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    
    if (hours === undefined || minutes === undefined) {
      throw new Error(`Invalid time string format: ${timeString}`);
    }
    
    return new Time(hours, minutes);
  }

  /**
   * Check if data is in legacy Schedule format
   */
  static isLegacyFormat(data: unknown): data is Record<string, unknown> {
    if (!data || typeof data !== 'object') return false;
    
    const record = data as Record<string, unknown>;
    const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hasLegacyStructure = days.some(day => day in record);
    
    if (!hasLegacyStructure) return false;
    
    // Check if it has the BlockOfTime structure
    for (const day of days) {
      const dayData = record[day];
      if (dayData !== undefined) {
        if (!Array.isArray(dayData)) return false;
        
        // Check first block structure if array is not empty
        if (dayData.length > 0) {
          const firstBlock = dayData[0] as Record<string, unknown>;
          if (!firstBlock?.start || typeof firstBlock.start !== 'object' || 
              !firstBlock?.end || typeof firstBlock.end !== 'object') {
            return false;
          }
          const start = firstBlock.start as Record<string, unknown>;
          const end = firstBlock.end as Record<string, unknown>;
          if (typeof start.hour !== 'number' || typeof end.hour !== 'number') {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Check if data is in new flexible format
   */
  static isFlexibleFormat(data: unknown): data is FlexibleScheduleItem[] {
    if (!Array.isArray(data)) return false;
    
    if (data.length === 0) return true; // Empty array is valid
    
    // Check structure of first item
    const firstItem = data[0] as Record<string, unknown>;
    return Boolean(
      firstItem &&
      typeof firstItem.id === 'string' &&
      firstItem.timeSlot &&
      typeof firstItem.timeSlot === 'object' &&
      firstItem.timeSlot !== null &&
      typeof (firstItem.timeSlot as Record<string, unknown>).startTime === 'string' &&
      typeof (firstItem.timeSlot as Record<string, unknown>).endTime === 'string'
    );
  }

  /**
   * Validate converted schedule data integrity
   */
  static validateConversion(original: Schedule, converted: FlexibleScheduleItem[]): boolean {
    try {
      const reconverted = this.flexibleToLegacy(converted);
      
      // Check that all original blocks are preserved
      for (const [dayName, blocks] of Object.entries(original)) {
        const originalBlocks = blocks ?? [];
        const reconvertedBlocks = reconverted[dayName as Day] ?? [];
        
        if (originalBlocks.length !== reconvertedBlocks.length) {
          console.error(`Block count mismatch for ${dayName}: ${originalBlocks.length} vs ${reconvertedBlocks.length}`);
          return false;
        }
        
        for (let i = 0; i < originalBlocks.length; i++) {
          const orig = originalBlocks[i];
          const reconv = reconvertedBlocks[i];
          
          if (!orig || !reconv) {
            console.error(`Missing block for ${dayName}[${i}]`);
            return false;
          }
          
          if (orig.start.hour !== reconv.start.hour || 
              orig.start.minute !== reconv.start.minute ||
              orig.end.hour !== reconv.end.hour ||
              orig.end.minute !== reconv.end.minute) {
            console.error(`Time mismatch for ${dayName}[${i}]:`, orig, reconv);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Safe conversion with error handling and rollback
   */
  static safeConversion<T>(
    data: unknown,
    converter: (data: unknown) => T,
    validator?: (result: T) => boolean
  ): T | null {
    try {
      const result = converter(data);
      
      if (validator && !validator(result)) {
        console.error('Conversion validation failed');
        return null;
      }
      
      return result;
    } catch (error) {
      console.error('Safe conversion failed:', error);
      return null;
    }
  }

  // Feature flag support for gradual migration

  /**
   * Check if new schedule format is enabled
   */
  static useNewScheduleFormat(): boolean {
    return process.env.NEXT_PUBLIC_USE_NEW_SCHEDULE_FORMAT === 'true';
  }

  /**
   * Check if flexible solver is enabled
   */
  static useFlexibleSolver(): boolean {
    return process.env.NEXT_PUBLIC_USE_FLEXIBLE_SOLVER === 'true';
  }

  /**
   * Check if migration mode is enabled (both systems running)
   */
  static useMigrationMode(): boolean {
    return process.env.NEXT_PUBLIC_MIGRATION_MODE === 'true';
  }

  /**
   * Get appropriate format based on feature flags
   */
  static getScheduleFormat(legacyData: Schedule): Schedule | FlexibleScheduleItem[] {
    if (this.useNewScheduleFormat()) {
      const flexible = this.legacyToFlexible(legacyData);
      return this.useMigrationMode() ? legacyData : flexible;
    }
    return legacyData;
  }

  /**
   * Normalize schedule data to expected format based on feature flags
   */
  static normalizeScheduleData(data: unknown): Schedule | FlexibleScheduleItem[] | null {
    if (!data) return null;

    if (this.isLegacyFormat(data)) {
      const legacyData = data as Schedule;
      return this.useNewScheduleFormat() ? this.legacyToFlexible(legacyData) : legacyData;
    }

    if (this.isFlexibleFormat(data)) {
      return this.useNewScheduleFormat() ? data : this.flexibleToLegacy(data);
    }

    console.error('Unknown schedule data format:', data);
    return null;
  }
}

/**
 * Helper functions for common migration tasks
 */

/**
 * Extract time slots from legacy schedule for specific days
 */
export function extractLegacyTimeSlotsForDays(
  schedule: Schedule, 
  days: Day[]
): BlockOfTime[] {
  const slots: BlockOfTime[] = [];
  
  for (const day of days) {
    const daySlots = schedule[day];
    if (daySlots) {
      slots.push(...daySlots);
    }
  }
  
  return slots.sort((a, b) => a.start.valueOf() - b.start.valueOf());
}

/**
 * Convert legacy availability to time slots with metadata
 */
export function legacyAvailabilityToTimeSlots(
  schedule: Schedule,
  metadata?: Record<string, unknown>
): TimeSlot[] {
  const flexible = ScheduleAdapter.legacyToFlexible(schedule);
  return flexible.map(item => ({
    ...item.timeSlot,
    ...(metadata && { metadata })
  }));
}

/**
 * Merge multiple legacy schedules into flexible format
 */
export function mergeLegacySchedules(schedules: Schedule[]): FlexibleScheduleItem[] {
  const merged: FlexibleScheduleItem[] = [];
  let itemCounter = 0;
  
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    if (!schedule) continue;
    
    const flexible = ScheduleAdapter.legacyToFlexible(schedule);
    
    // Add source metadata and ensure unique IDs
    for (const item of flexible) {
      item.id = `merged-${itemCounter++}-${item.id}`;
      item.metadata = {
        ...item.metadata,
        sourceScheduleIndex: i,
        mergedTimestamp: new Date().toISOString()
      };
    }
    
    merged.push(...flexible);
  }
  
  return merged;
}

/**
 * Migration status tracking
 */
export interface MigrationTracker {
  recordCount: number;
  successCount: number;
  errorCount: number;
  warnings: string[];
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

export function createMigrationTracker(): MigrationTracker {
  return {
    recordCount: 0,
    successCount: 0,
    errorCount: 0,
    warnings: [],
    errors: [],
    startTime: new Date()
  };
}

export function finalizeMigrationTracker(tracker: MigrationTracker): MigrationTracker {
  return {
    ...tracker,
    endTime: new Date()
  };
}