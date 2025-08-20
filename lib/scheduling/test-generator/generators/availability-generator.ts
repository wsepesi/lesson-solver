/**
 * Availability Pattern Generator
 * 
 * Generates realistic WeekSchedule patterns using TimeBlock system
 * with minute precision. Creates various availability patterns that
 * simulate real-world teacher and student scheduling scenarios.
 */

import type { WeekSchedule, DaySchedule, TimeBlock, ScheduleMetadata } from '../../types';

/**
 * Available time range configuration
 */
export interface TimeRange {
  /** Start time in minutes from midnight (0-1439) */
  startMinute: number;
  
  /** End time in minutes from midnight (0-1439) */
  endMinute: number;
}

/**
 * Configuration for availability pattern generation
 */
export interface AvailabilityConfig {
  /** Days of week to include (0=Sunday, 6=Saturday) */
  activeDays: number[];
  
  /** Primary time range for availability */
  primaryRange: TimeRange;
  
  /** Optional secondary time range */
  secondaryRange?: TimeRange;
  
  /** Minimum block duration in minutes */
  minBlockDuration: number;
  
  /** Maximum block duration in minutes */
  maxBlockDuration: number;
  
  /** Target fragmentation level (0-1, higher = more fragments) */
  fragmentationLevel: number;
  
  /** Random seed for reproducible generation */
  seed?: number;
  
  /** Timezone identifier */
  timezone: string;
}

/**
 * Available pattern types
 */
export type AvailabilityPattern = 
  | 'working-hours'
  | 'evening'
  | 'fragmented'
  | 'peak-time'
  | 'sparse'
  | 'realistic'
  | 'morning'
  | 'afternoon'
  | 'weekend-only'
  | 'weekday-only'
  | 'full-time'
  | 'part-time';

/**
 * Main availability generator class
 */
export class AvailabilityGenerator {
  private seed: number;
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
  }
  
  /**
   * Generate availability pattern by type
   */
  generatePattern(pattern: AvailabilityPattern, config?: Partial<AvailabilityConfig>): WeekSchedule {
    switch (pattern) {
      case 'working-hours':
        return this.generateWorkingHours(config);
      case 'evening':
        return this.generateEvening(config);
      case 'fragmented':
        return this.generateFragmented(config);
      case 'peak-time':
        return this.generatePeakTime(config);
      case 'sparse':
        return this.generateSparse(config);
      case 'realistic':
        return this.generateRealistic(config);
      case 'morning':
        return this.generateMorning(config);
      case 'afternoon':
        return this.generateAfternoon(config);
      case 'weekend-only':
        return this.generateWeekendOnly(config);
      case 'weekday-only':
        return this.generateWeekdayOnly(config);
      case 'full-time':
        return this.generateFullTime(config);
      case 'part-time':
        return this.generatePartTime(config);
      default:
        throw new Error(`Unknown availability pattern: ${String(pattern)}`);
    }
  }
  
  /**
   * Generate working hours availability (9am-5pm with lunch break)
   */
  generateWorkingHours(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5], // Monday-Friday
      primaryRange: {
        startMinute: 9 * 60,  // 9:00 AM
        endMinute: 17 * 60    // 5:00 PM
      },
      minBlockDuration: 60,
      maxBlockDuration: 240,
      fragmentationLevel: 0.2,
      timezone: 'UTC',
      ...config
    };
    
    const days: DaySchedule[] = [];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (finalConfig.activeDays.includes(dayOfWeek)) {
        const blocks: TimeBlock[] = [];
        
        // Use configured time range
        const totalDuration = finalConfig.primaryRange.endMinute - finalConfig.primaryRange.startMinute;
        
        if (totalDuration <= 4 * 60) {
          // Single block for shorter ranges
          blocks.push({
            start: finalConfig.primaryRange.startMinute,
            duration: totalDuration
          });
        } else {
          // Morning block (first half)
          const morningDuration = Math.floor(totalDuration * 0.4);
          blocks.push({
            start: finalConfig.primaryRange.startMinute,
            duration: morningDuration
          });
          
          // Afternoon block (second half with lunch break)
          const lunchBreak = Math.floor(totalDuration * 0.15);
          const afternoonStart = finalConfig.primaryRange.startMinute + morningDuration + lunchBreak;
          const afternoonDuration = finalConfig.primaryRange.endMinute - afternoonStart;
          
          if (afternoonDuration > 0) {
            blocks.push({
              start: afternoonStart,
              duration: afternoonDuration
            });
          }
        }
        
        days.push({
          dayOfWeek,
          blocks: blocks.sort((a, b) => a.start - b.start),
          metadata: this.calculateMetadata(blocks)
        });
      } else {
        days.push({
          dayOfWeek,
          blocks: [],
          metadata: this.calculateMetadata([])
        });
      }
    }
    
    return {
      days,
      timezone: finalConfig.timezone
    };
  }
  
  /**
   * Generate evening availability (6pm-9pm)
   */
  generateEvening(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5, 6], // Monday-Saturday
      primaryRange: {
        startMinute: 18 * 60, // 6:00 PM
        endMinute: 21 * 60    // 9:00 PM
      },
      minBlockDuration: 30,
      maxBlockDuration: 180,
      fragmentationLevel: 0.1,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate heavily fragmented availability (many small blocks)
   */
  generateFragmented(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5, 6],
      primaryRange: {
        startMinute: 8 * 60,  // 8:00 AM
        endMinute: 20 * 60    // 8:00 PM
      },
      minBlockDuration: 15,
      maxBlockDuration: 60,
      fragmentationLevel: 0.8, // High fragmentation
      timezone: 'UTC',
      ...config
    };
    
    const days: DaySchedule[] = [];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (finalConfig.activeDays.includes(dayOfWeek)) {
        const blocks = this.generateFragmentedBlocks(finalConfig);
        days.push({
          dayOfWeek,
          blocks: blocks.sort((a, b) => a.start - b.start),
          metadata: this.calculateMetadata(blocks)
        });
      } else {
        days.push({
          dayOfWeek,
          blocks: [],
          metadata: this.calculateMetadata([])
        });
      }
    }
    
    return {
      days,
      timezone: finalConfig.timezone
    };
  }
  
  /**
   * Generate peak time availability (4pm-6pm - high conflict potential)
   */
  generatePeakTime(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5],
      primaryRange: {
        startMinute: 16 * 60, // 4:00 PM
        endMinute: 18 * 60    // 6:00 PM
      },
      minBlockDuration: 30,
      maxBlockDuration: 120,
      fragmentationLevel: 0.3,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate sparse availability (very limited time slots)
   */
  generateSparse(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [2, 4], // Tuesday, Thursday only
      primaryRange: {
        startMinute: 15 * 60, // 3:00 PM
        endMinute: 17 * 60    // 5:00 PM
      },
      minBlockDuration: 45,
      maxBlockDuration: 90,
      fragmentationLevel: 0.1,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate realistic mixed availability patterns
   */
  generateRealistic(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const patterns = [
      'working-hours',
      'evening',
      'morning',
      'afternoon',
      'part-time'
    ] as const;
    
    // Pick a random pattern and add some variation
    const basePattern = patterns[this.randomInt(0, patterns.length - 1)]!;
    const baseSchedule = this.generatePattern(basePattern, config);
    
    // Add some realistic variations
    return this.addRealisticVariations(baseSchedule, config);
  }
  
  /**
   * Generate morning availability (7am-11am)
   */
  generateMorning(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5],
      primaryRange: {
        startMinute: 7 * 60,  // 7:00 AM
        endMinute: 11 * 60    // 11:00 AM
      },
      minBlockDuration: 60,
      maxBlockDuration: 240,
      fragmentationLevel: 0.2,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate afternoon availability (1pm-5pm)
   */
  generateAfternoon(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5],
      primaryRange: {
        startMinute: 13 * 60, // 1:00 PM
        endMinute: 17 * 60    // 5:00 PM
      },
      minBlockDuration: 60,
      maxBlockDuration: 240,
      fragmentationLevel: 0.2,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate weekend-only availability
   */
  generateWeekendOnly(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [0, 6], // Sunday, Saturday
      primaryRange: {
        startMinute: 9 * 60,  // 9:00 AM
        endMinute: 18 * 60    // 6:00 PM
      },
      minBlockDuration: 90,
      maxBlockDuration: 360,
      fragmentationLevel: 0.1,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate weekday-only availability
   */
  generateWeekdayOnly(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5], // Monday-Friday
      primaryRange: {
        startMinute: 9 * 60,  // 9:00 AM
        endMinute: 17 * 60    // 5:00 PM
      },
      minBlockDuration: 60,
      maxBlockDuration: 240,
      fragmentationLevel: 0.3,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate full-time availability (8am-6pm)
   */
  generateFullTime(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 2, 3, 4, 5],
      primaryRange: {
        startMinute: 8 * 60,  // 8:00 AM
        endMinute: 18 * 60    // 6:00 PM
      },
      minBlockDuration: 120,
      maxBlockDuration: 480,
      fragmentationLevel: 0.1,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate part-time availability (scattered throughout week)
   */
  generatePartTime(config?: Partial<AvailabilityConfig>): WeekSchedule {
    const finalConfig: AvailabilityConfig = {
      activeDays: [1, 3, 5], // Monday, Wednesday, Friday
      primaryRange: {
        startMinute: 10 * 60, // 10:00 AM
        endMinute: 15 * 60    // 3:00 PM
      },
      minBlockDuration: 60,
      maxBlockDuration: 180,
      fragmentationLevel: 0.4,
      timezone: 'UTC',
      ...config
    };
    
    return this.generateBlocksFromConfig(finalConfig);
  }
  
  /**
   * Generate blocks from configuration
   */
  private generateBlocksFromConfig(config: AvailabilityConfig): WeekSchedule {
    const days: DaySchedule[] = [];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (config.activeDays.includes(dayOfWeek)) {
        const blocks = this.generateDayBlocks(config);
        days.push({
          dayOfWeek,
          blocks: blocks.sort((a, b) => a.start - b.start),
          metadata: this.calculateMetadata(blocks)
        });
      } else {
        days.push({
          dayOfWeek,
          blocks: [],
          metadata: this.calculateMetadata([])
        });
      }
    }
    
    return {
      days,
      timezone: config.timezone
    };
  }
  
  /**
   * Generate time blocks for a single day
   */
  private generateDayBlocks(config: AvailabilityConfig): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    const totalDuration = config.primaryRange.endMinute - config.primaryRange.startMinute;
    
    if (config.fragmentationLevel < 0.3) {
      // Low fragmentation - create 1-2 large blocks
      const blockCount = this.randomInt(1, 2);
      
      if (blockCount === 1) {
        blocks.push({
          start: config.primaryRange.startMinute,
          duration: totalDuration
        });
      } else {
        // Split into two blocks with a gap
        const firstDuration = Math.floor(totalDuration * 0.4);
        const gapDuration = Math.floor(totalDuration * 0.2);
        const secondDuration = totalDuration - firstDuration - gapDuration;
        
        blocks.push({
          start: config.primaryRange.startMinute,
          duration: firstDuration
        });
        
        blocks.push({
          start: config.primaryRange.startMinute + firstDuration + gapDuration,
          duration: secondDuration
        });
      }
    } else if (config.fragmentationLevel < 0.6) {
      // Medium fragmentation - create 2-4 blocks
      const blockCount = this.randomInt(2, 4);
      this.createFragmentedBlocks(
        blocks,
        config.primaryRange.startMinute,
        totalDuration,
        blockCount,
        config.minBlockDuration,
        config.maxBlockDuration
      );
    } else {
      // High fragmentation - create many small blocks
      const blockCount = this.randomInt(3, 8);
      this.createFragmentedBlocks(
        blocks,
        config.primaryRange.startMinute,
        totalDuration,
        blockCount,
        config.minBlockDuration,
        Math.min(config.maxBlockDuration, 90) // Limit max for fragmented
      );
    }
    
    return blocks.filter(block => block.duration >= config.minBlockDuration);
  }
  
  /**
   * Generate highly fragmented blocks
   */
  private generateFragmentedBlocks(config: AvailabilityConfig): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    // const _totalMinutes = config.primaryRange.endMinute - config.primaryRange.startMinute;
    
    // Create many small blocks with gaps
    let currentMinute = config.primaryRange.startMinute;
    
    while (currentMinute < config.primaryRange.endMinute - config.minBlockDuration) {
      // Random block duration
      const maxPossibleDuration = Math.min(
        config.maxBlockDuration,
        config.primaryRange.endMinute - currentMinute
      );
      
      const duration = this.randomInt(
        config.minBlockDuration,
        Math.max(config.minBlockDuration, maxPossibleDuration)
      );
      
      blocks.push({
        start: currentMinute,
        duration
      });
      
      // Add random gap between blocks
      const gapDuration = this.randomInt(15, 60); // 15-60 minute gaps
      currentMinute += duration + gapDuration;
    }
    
    return blocks;
  }
  
  /**
   * Create fragmented blocks within a time range
   */
  private createFragmentedBlocks(
    blocks: TimeBlock[],
    startMinute: number,
    totalDuration: number,
    blockCount: number,
    minDuration: number,
    maxDuration: number
  ): void {
    const avgBlockDuration = Math.floor(totalDuration / (blockCount * 1.5)); // Account for gaps
    
    let currentMinute = startMinute;
    let remainingBlocks = blockCount;
    
    while (remainingBlocks > 0 && currentMinute < startMinute + totalDuration - minDuration) {
      const blockDuration = Math.min(
        maxDuration,
        Math.max(
          minDuration,
          this.randomInt(
            Math.floor(avgBlockDuration * 0.5),
            Math.floor(avgBlockDuration * 1.5)
          )
        )
      );
      
      blocks.push({
        start: currentMinute,
        duration: blockDuration
      });
      
      // Add gap between blocks
      const gapDuration = this.randomInt(15, 45);
      currentMinute += blockDuration + gapDuration;
      remainingBlocks--;
    }
  }
  
  /**
   * Add realistic variations to a base schedule
   */
  private addRealisticVariations(schedule: WeekSchedule, _config?: Partial<AvailabilityConfig>): WeekSchedule {
    const modifiedDays = schedule.days.map(day => {
      if (day.blocks.length === 0) return day;
      
      // Randomly modify some blocks
      const modifiedBlocks = day.blocks.map(block => {
        // 30% chance to slightly adjust timing
        if (this.random() < 0.3) {
          const startVariation = this.randomInt(-15, 15); // ±15 minutes
          const durationVariation = this.randomInt(-15, 15); // ±15 minutes
          
          return {
            start: Math.max(0, block.start + startVariation),
            duration: Math.max(15, block.duration + durationVariation)
          };
        }
        
        return block;
      });
      
      // 20% chance to remove a block (realistic cancellations)
      const finalBlocks = modifiedBlocks.filter(() => this.random() > 0.2);
      
      return {
        ...day,
        blocks: finalBlocks.sort((a, b) => a.start - b.start),
        metadata: this.calculateMetadata(finalBlocks)
      };
    });
    
    return {
      ...schedule,
      days: modifiedDays
    };
  }
  
  /**
   * Calculate metadata for a set of time blocks
   */
  private calculateMetadata(blocks: TimeBlock[]): ScheduleMetadata {
    const totalAvailable = blocks.reduce((sum, block) => sum + block.duration, 0);
    const largestBlock = blocks.length > 0 ? Math.max(...blocks.map(b => b.duration)) : 0;
    
    // Calculate fragmentation score (higher = more fragmented)
    let fragmentationScore = 0;
    if (blocks.length > 1) {
      const avgBlockSize = totalAvailable / blocks.length;
      const variance = blocks.reduce(
        (sum, block) => sum + Math.pow(block.duration - avgBlockSize, 2),
        0
      ) / blocks.length;
      
      // Normalize fragmentation score (0-1)
      fragmentationScore = Math.min(1, variance / (avgBlockSize * avgBlockSize) + (blocks.length - 1) / 10);
    }
    
    return {
      totalAvailable,
      largestBlock,
      fragmentationScore
    };
  }
  
  /**
   * Generate random number with current seed
   */
  private random(): number {
    // Simple linear congruential generator for reproducible randomness
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  /**
   * Generate random integer in range [min, max]
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Set random seed for reproducible generation
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
  
  /**
   * Get current random seed
   */
  getSeed(): number {
    return this.seed;
  }
  
  /**
   * Convert time string (HH:MM) to minutes from midnight
   */
  static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  }
  
  /**
   * Convert minutes from midnight to time string (HH:MM)
   */
  static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  /**
   * Merge overlapping time blocks
   */
  static mergeOverlappingBlocks(blocks: TimeBlock[]): TimeBlock[] {
    if (blocks.length === 0) return [];
    
    const sorted = [...blocks].sort((a, b) => a.start - b.start);
    const merged: TimeBlock[] = [sorted[0]!];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]!;
      const last = merged[merged.length - 1]!;
      
      // Check if blocks overlap or are adjacent
      if (current.start <= last.start + last.duration) {
        // Merge blocks
        const mergedEnd = Math.max(last.start + last.duration, current.start + current.duration);
        last.duration = mergedEnd - last.start;
      } else {
        // No overlap, add as new block
        merged.push(current);
      }
    }
    
    return merged;
  }
  
  /**
   * Check if two time blocks overlap
   */
  static blocksOverlap(block1: TimeBlock, block2: TimeBlock): boolean {
    const end1 = block1.start + block1.duration;
    const end2 = block2.start + block2.duration;
    
    return block1.start < end2 && block2.start < end1;
  }
}

/**
 * Default availability generator instance
 */
export const defaultAvailabilityGenerator = new AvailabilityGenerator();

/**
 * Convenience functions for common patterns
 */
export class AvailabilityPresets {
  private generator = new AvailabilityGenerator();
  
  /**
   * Create a teacher schedule (full working hours)
   */
  generateTeacherSchedule(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('working-hours');
  }
  
  /**
   * Create a flexible student schedule
   */
  generateFlexibleStudent(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('realistic');
  }
  
  /**
   * Create a morning person student schedule
   */
  generateMorningStudent(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('morning');
  }
  
  /**
   * Create an evening person student schedule
   */
  generateEveningStudent(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('evening');
  }
  
  /**
   * Create a weekend-only student schedule
   */
  generateWeekendStudent(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('weekend-only');
  }
  
  /**
   * Create a busy student with limited availability
   */
  generateBusyStudent(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('sparse');
  }
  
  /**
   * Create high-conflict availability (peak times)
   */
  generateHighConflictSchedule(seed?: number): WeekSchedule {
    if (seed) this.generator.setSeed(seed);
    return this.generator.generatePattern('peak-time');
  }
}

/**
 * Default presets instance
 */
export const availabilityPresets = new AvailabilityPresets();