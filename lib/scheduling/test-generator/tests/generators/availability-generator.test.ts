/**
 * Tests for AvailabilityGenerator
 * 
 * Comprehensive tests for all availability patterns and functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AvailabilityGenerator, AvailabilityPresets } from '../../generators/availability-generator';
import type { TimeBlock } from '../../../types';
import type { AvailabilityPattern } from '../../generators/availability-generator';

describe('AvailabilityGenerator', () => {
  let generator: AvailabilityGenerator;
  const testSeed = 12345;
  
  beforeEach(() => {
    generator = new AvailabilityGenerator(testSeed);
  });
  
  describe('Basic functionality', () => {
    it('should initialize with a seed', () => {
      expect(generator.getSeed()).toBe(testSeed);
    });
    
    it('should generate deterministic results with same seed', () => {
      const generator1 = new AvailabilityGenerator(42);
      const generator2 = new AvailabilityGenerator(42);
      
      const schedule1 = generator1.generatePattern('working-hours');
      const schedule2 = generator2.generatePattern('working-hours');
      
      expect(schedule1).toEqual(schedule2);
    });
    
    it('should generate different results with different seeds', () => {
      const generator1 = new AvailabilityGenerator(1);
      const generator2 = new AvailabilityGenerator(2);
      
      const schedule1 = generator1.generatePattern('realistic');
      const schedule2 = generator2.generatePattern('realistic');
      
      expect(schedule1).not.toEqual(schedule2);
    });
  });
  
  describe('Working hours pattern', () => {
    it('should generate standard working hours (9am-5pm with lunch)', () => {
      const schedule = generator.generatePattern('working-hours');
      
      expect(schedule.timezone).toBe('UTC');
      expect(schedule.days).toHaveLength(7);
      
      // Check weekdays have availability
      for (let day = 1; day <= 5; day++) {
        const daySchedule = schedule.days[day];
        expect(daySchedule.dayOfWeek).toBe(day);
        expect(daySchedule.blocks.length).toBeGreaterThan(0);
        
        // Should have morning and afternoon blocks
        expect(daySchedule.blocks.length).toBe(2);
        
        // First block starts at 9 AM
        const firstBlock = daySchedule.blocks[0];
        expect(firstBlock.start).toBe(9 * 60); // 9:00 AM
        
        // Blocks should cover the working hours with a lunch break
        const totalDuration = daySchedule.blocks.reduce((sum, block) => sum + block.duration, 0);
        expect(totalDuration).toBeLessThanOrEqual(8 * 60); // Should be less than full 8 hours due to lunch
        expect(totalDuration).toBeGreaterThan(6 * 60); // Should be more than 6 hours
      }
      
      // Check weekends have no availability
      expect(schedule.days[0].blocks).toHaveLength(0); // Sunday
      expect(schedule.days[6].blocks).toHaveLength(0); // Saturday
    });
    
    it('should calculate correct metadata for working hours', () => {
      const schedule = generator.generatePattern('working-hours');
      
      for (let day = 1; day <= 5; day++) {
        const daySchedule = schedule.days[day];
        expect(daySchedule.metadata).toBeDefined();
        expect(daySchedule.metadata!.totalAvailable).toBeGreaterThan(6 * 60); // At least 6 hours
        expect(daySchedule.metadata!.totalAvailable).toBeLessThanOrEqual(8 * 60); // At most 8 hours
        expect(daySchedule.metadata!.largestBlock).toBeGreaterThan(3 * 60); // At least 3 hour block
        expect(daySchedule.metadata!.fragmentationScore).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Evening pattern', () => {
    it('should generate evening availability (6pm-9pm)', () => {
      const schedule = generator.generatePattern('evening');
      
      // Should include Monday through Saturday
      for (let day = 1; day <= 6; day++) {
        const daySchedule = schedule.days[day];
        expect(daySchedule.blocks.length).toBeGreaterThan(0);
        
        // All blocks should be in evening hours
        daySchedule.blocks.forEach(block => {
          expect(block.start).toBeGreaterThanOrEqual(18 * 60); // After 6 PM
          expect(block.start + block.duration).toBeLessThanOrEqual(21 * 60); // Before 9 PM
        });
      }
      
      // Sunday should have no availability
      expect(schedule.days[0].blocks).toHaveLength(0);
    });
  });
  
  describe('Morning pattern', () => {
    it('should generate morning availability (7am-11am)', () => {
      const schedule = generator.generatePattern('morning');
      
      // Check weekdays
      for (let day = 1; day <= 5; day++) {
        const daySchedule = schedule.days[day];
        expect(daySchedule.blocks.length).toBeGreaterThan(0);
        
        // All blocks should be in morning hours
        daySchedule.blocks.forEach(block => {
          expect(block.start).toBeGreaterThanOrEqual(7 * 60); // After 7 AM
          expect(block.start + block.duration).toBeLessThanOrEqual(11 * 60); // Before 11 AM
        });
      }
    });
  });
  
  describe('Fragmented pattern', () => {
    it('should generate highly fragmented availability', () => {
      const schedule = generator.generatePattern('fragmented');
      
      // Should have active days with multiple small blocks
      const activeDays = schedule.days.filter(day => day.blocks.length > 0);
      expect(activeDays.length).toBeGreaterThan(0);
      
      activeDays.forEach(day => {
        // Should have multiple blocks
        expect(day.blocks.length).toBeGreaterThan(1);
        
        // Blocks should be relatively small
        day.blocks.forEach(block => {
          expect(block.duration).toBeLessThanOrEqual(60); // Max 1 hour for fragmented
        });
        
        // Should have high fragmentation score
        expect(day.metadata!.fragmentationScore).toBeGreaterThan(0.5);
      });
    });
  });
  
  describe('Weekend-only pattern', () => {
    it('should generate availability only on weekends', () => {
      const schedule = generator.generatePattern('weekend-only');
      
      // Weekdays should be empty
      for (let day = 1; day <= 5; day++) {
        expect(schedule.days[day].blocks).toHaveLength(0);
      }
      
      // Weekends should have availability
      expect(schedule.days[0].blocks.length).toBeGreaterThan(0); // Sunday
      expect(schedule.days[6].blocks.length).toBeGreaterThan(0); // Saturday
    });
  });
  
  describe('Weekday-only pattern', () => {
    it('should generate availability only on weekdays', () => {
      const schedule = generator.generatePattern('weekday-only');
      
      // Weekdays should have availability
      for (let day = 1; day <= 5; day++) {
        expect(schedule.days[day].blocks.length).toBeGreaterThan(0);
      }
      
      // Weekends should be empty
      expect(schedule.days[0].blocks).toHaveLength(0); // Sunday
      expect(schedule.days[6].blocks).toHaveLength(0); // Saturday
    });
  });
  
  describe('Sparse pattern', () => {
    it('should generate very limited availability', () => {
      const schedule = generator.generatePattern('sparse');
      
      // Should have very few active days
      const activeDays = schedule.days.filter(day => day.blocks.length > 0);
      expect(activeDays.length).toBeLessThanOrEqual(3);
      
      // Total available time should be limited
      const totalAvailable = schedule.days.reduce((total, day) => {
        return total + day.blocks.reduce((dayTotal, block) => dayTotal + block.duration, 0);
      }, 0);
      
      expect(totalAvailable).toBeLessThan(10 * 60); // Less than 10 hours total
    });
  });
  
  describe('Custom configuration', () => {
    it('should respect custom active days', () => {
      const schedule = generator.generatePattern('working-hours', {
        activeDays: [1, 3, 5] // Monday, Wednesday, Friday only
      });
      
      // Should only have availability on specified days
      expect(schedule.days[1].blocks.length).toBeGreaterThan(0); // Monday
      expect(schedule.days[2].blocks).toHaveLength(0); // Tuesday
      expect(schedule.days[3].blocks.length).toBeGreaterThan(0); // Wednesday
      expect(schedule.days[4].blocks).toHaveLength(0); // Thursday
      expect(schedule.days[5].blocks.length).toBeGreaterThan(0); // Friday
    });
    
    it('should respect custom time ranges', () => {
      const schedule = generator.generatePattern('working-hours', {
        primaryRange: {
          startMinute: 10 * 60, // 10 AM
          endMinute: 14 * 60    // 2 PM
        }
      });
      
      const activeDays = schedule.days.filter(day => day.blocks.length > 0);
      activeDays.forEach(day => {
        day.blocks.forEach(block => {
          expect(block.start).toBeGreaterThanOrEqual(10 * 60);
          expect(block.start + block.duration).toBeLessThanOrEqual(14 * 60);
        });
      });
    });
    
    it('should respect custom timezone', () => {
      const schedule = generator.generatePattern('working-hours', {
        timezone: 'America/New_York'
      });
      
      expect(schedule.timezone).toBe('America/New_York');
    });
  });
  
  describe('Time utilities', () => {
    it('should convert time strings to minutes correctly', () => {
      expect(AvailabilityGenerator.timeToMinutes('09:00')).toBe(9 * 60);
      expect(AvailabilityGenerator.timeToMinutes('13:30')).toBe(13 * 60 + 30);
      expect(AvailabilityGenerator.timeToMinutes('00:00')).toBe(0);
      expect(AvailabilityGenerator.timeToMinutes('23:59')).toBe(23 * 60 + 59);
    });
    
    it('should convert minutes to time strings correctly', () => {
      expect(AvailabilityGenerator.minutesToTime(9 * 60)).toBe('09:00');
      expect(AvailabilityGenerator.minutesToTime(13 * 60 + 30)).toBe('13:30');
      expect(AvailabilityGenerator.minutesToTime(0)).toBe('00:00');
      expect(AvailabilityGenerator.minutesToTime(23 * 60 + 59)).toBe('23:59');
    });
    
    it('should detect overlapping blocks correctly', () => {
      const block1: TimeBlock = { start: 60, duration: 60 }; // 1:00-2:00
      const block2: TimeBlock = { start: 90, duration: 60 }; // 1:30-2:30
      const block3: TimeBlock = { start: 180, duration: 60 }; // 3:00-4:00
      
      expect(AvailabilityGenerator.blocksOverlap(block1, block2)).toBe(true);
      expect(AvailabilityGenerator.blocksOverlap(block1, block3)).toBe(false);
      expect(AvailabilityGenerator.blocksOverlap(block2, block3)).toBe(false);
    });
    
    it('should merge overlapping blocks correctly', () => {
      const blocks: TimeBlock[] = [
        { start: 60, duration: 60 },   // 1:00-2:00
        { start: 90, duration: 60 },   // 1:30-2:30 (overlaps with first)
        { start: 180, duration: 60 },  // 3:00-4:00 (separate)
        { start: 120, duration: 30 }   // 2:00-2:30 (adjacent/overlaps)
      ];
      
      const merged = AvailabilityGenerator.mergeOverlappingBlocks(blocks);
      
      // Should merge first three blocks and keep the last separate
      expect(merged).toHaveLength(2);
      expect(merged[0].start).toBe(60);
      expect(merged[0].duration).toBe(90); // 1:00-2:30
      expect(merged[1].start).toBe(180);
      expect(merged[1].duration).toBe(60);
    });
  });
  
  describe('Metadata calculation', () => {
    it('should calculate correct total available time', () => {
      const schedule = generator.generatePattern('working-hours');
      
      // Working hours should be 6-8 hours per weekday
      for (let day = 1; day <= 5; day++) {
        const daySchedule = schedule.days[day];
        expect(daySchedule.metadata!.totalAvailable).toBeGreaterThan(6 * 60);
        expect(daySchedule.metadata!.totalAvailable).toBeLessThanOrEqual(8 * 60);
      }
    });
    
    it('should calculate correct largest block', () => {
      const schedule = generator.generatePattern('working-hours');
      
      // Largest block should be at least 3 hours
      for (let day = 1; day <= 5; day++) {
        const daySchedule = schedule.days[day];
        expect(daySchedule.metadata!.largestBlock).toBeGreaterThan(3 * 60);
      }
    });
    
    it('should calculate fragmentation score', () => {
      const fragmentedSchedule = generator.generatePattern('fragmented');
      const workingSchedule = generator.generatePattern('working-hours');
      
      // Fragmented schedule should have higher fragmentation score
      const fragmentedDays = fragmentedSchedule.days.filter(day => day.blocks.length > 0);
      const workingDays = workingSchedule.days.filter(day => day.blocks.length > 0);
      
      if (fragmentedDays.length > 0 && workingDays.length > 0) {
        const avgFragmentedScore = fragmentedDays.reduce(
          (sum, day) => sum + day.metadata!.fragmentationScore, 0
        ) / fragmentedDays.length;
        
        const avgWorkingScore = workingDays.reduce(
          (sum, day) => sum + day.metadata!.fragmentationScore, 0
        ) / workingDays.length;
        
        expect(avgFragmentedScore).toBeGreaterThan(avgWorkingScore);
      }
    });
  });
  
  describe('Block validation', () => {
    it('should generate blocks within valid time ranges', () => {
      const patterns = ['working-hours', 'evening', 'morning', 'afternoon', 'fragmented'];
      
      patterns.forEach(pattern => {
        const schedule = generator.generatePattern(pattern as AvailabilityPattern);
        
        schedule.days.forEach(day => {
          day.blocks.forEach(block => {
            // Block should start within day (0-1439 minutes)
            expect(block.start).toBeGreaterThanOrEqual(0);
            expect(block.start).toBeLessThan(24 * 60);
            
            // Block should have positive duration
            expect(block.duration).toBeGreaterThan(0);
            
            // Block should end within day
            expect(block.start + block.duration).toBeLessThanOrEqual(24 * 60);
          });
        });
      });
    });
    
    it('should generate blocks in sorted order', () => {
      const schedule = generator.generatePattern('fragmented');
      
      schedule.days.forEach(day => {
        for (let i = 1; i < day.blocks.length; i++) {
          expect(day.blocks[i].start).toBeGreaterThanOrEqual(day.blocks[i - 1].start);
        }
      });
    });
  });
});

describe('AvailabilityPresets', () => {
  let presets: AvailabilityPresets;
  
  beforeEach(() => {
    presets = new AvailabilityPresets();
  });
  
  it('should generate teacher schedule', () => {
    const schedule = presets.generateTeacherSchedule(12345);
    
    expect(schedule).toBeDefined();
    expect(schedule.timezone).toBe('UTC');
    
    // Should have working hours pattern
    const activeDays = schedule.days.filter(day => day.blocks.length > 0);
    expect(activeDays.length).toBe(5); // Monday-Friday
  });
  
  it('should generate flexible student schedule', () => {
    const schedule = presets.generateFlexibleStudent(12345);
    
    expect(schedule).toBeDefined();
    expect(schedule.timezone).toBe('UTC');
  });
  
  it('should generate morning student schedule', () => {
    const schedule = presets.generateMorningStudent(12345);
    
    expect(schedule).toBeDefined();
    
    // All blocks should be in morning hours
    schedule.days.forEach(day => {
      day.blocks.forEach(block => {
        expect(block.start).toBeGreaterThanOrEqual(7 * 60); // After 7 AM
        expect(block.start + block.duration).toBeLessThanOrEqual(11 * 60); // Before 11 AM
      });
    });
  });
  
  it('should generate evening student schedule', () => {
    const schedule = presets.generateEveningStudent(12345);
    
    expect(schedule).toBeDefined();
    
    // All blocks should be in evening hours
    schedule.days.forEach(day => {
      day.blocks.forEach(block => {
        expect(block.start).toBeGreaterThanOrEqual(18 * 60); // After 6 PM
        expect(block.start + block.duration).toBeLessThanOrEqual(21 * 60); // Before 9 PM
      });
    });
  });
  
  it('should generate weekend student schedule', () => {
    const schedule = presets.generateWeekendStudent(12345);
    
    expect(schedule).toBeDefined();
    
    // Should only have weekend availability
    for (let day = 1; day <= 5; day++) {
      expect(schedule.days[day].blocks).toHaveLength(0);
    }
    expect(schedule.days[0].blocks.length).toBeGreaterThan(0); // Sunday
    expect(schedule.days[6].blocks.length).toBeGreaterThan(0); // Saturday
  });
  
  it('should generate busy student schedule', () => {
    const schedule = presets.generateBusyStudent(12345);
    
    expect(schedule).toBeDefined();
    
    // Should have limited availability
    const totalAvailable = schedule.days.reduce((total, day) => {
      return total + day.blocks.reduce((dayTotal, block) => dayTotal + block.duration, 0);
    }, 0);
    
    expect(totalAvailable).toBeLessThan(10 * 60); // Less than 10 hours total
  });
  
  it('should generate high-conflict schedule', () => {
    const schedule = presets.generateHighConflictSchedule(12345);
    
    expect(schedule).toBeDefined();
    
    // Should focus on peak time hours (4-6 PM)
    const activeDays = schedule.days.filter(day => day.blocks.length > 0);
    activeDays.forEach(day => {
      day.blocks.forEach(block => {
        expect(block.start).toBeGreaterThanOrEqual(16 * 60); // After 4 PM
        expect(block.start + block.duration).toBeLessThanOrEqual(18 * 60); // Before 6 PM
      });
    });
  });
  
  it('should be deterministic with same seed', () => {
    const schedule1 = presets.generateTeacherSchedule(42);
    const schedule2 = presets.generateTeacherSchedule(42);
    
    expect(schedule1).toEqual(schedule2);
  });
});