/**
 * Student Configuration Generator
 * 
 * Generates realistic student configurations with varied availability patterns,
 * lesson preferences, and scheduling constraints. Creates different student
 * types that produce varied scheduling challenges and difficulties.
 */

import type { StudentConfig, Person, WeekSchedule } from '../../types';
import { AvailabilityGenerator } from './availability-generator';

/**
 * Student behavior types that affect scheduling difficulty
 */
export type StudentType = 
  | 'morning-person'
  | 'evening-person'
  | 'flexible'
  | 'weekend-only'
  | 'weekday-only'
  | 'busy-student'
  | 'part-time'
  | 'specific-days'
  | 'long-lessons'
  | 'short-lessons'
  | 'variable-length';

/**
 * Configuration for student generation
 */
export interface StudentGenerationConfig {
  /** Number of students to generate */
  count: number;
  
  /** Distribution of student types (weights) */
  typeDistribution?: Partial<Record<StudentType, number>>;
  
  /** Base configuration for all students */
  baseConfig?: Partial<StudentConfig>;
  
  /** Lesson duration preferences */
  durationConfig?: {
    preferredRange: [number, number];
    minRange: [number, number];
    maxRange: [number, number];
  };
  
  /** Maximum lessons per week range */
  maxLessonsRange?: [number, number];
  
  /** Random seed for reproducible generation */
  seed?: number;
  
  /** Enable realistic variations */
  addVariations?: boolean;
  
  /** Timezone for generated schedules */
  timezone?: string;
}

/**
 * Analysis of generated student set
 */
export interface StudentSetAnalysis {
  /** Total number of students */
  totalStudents: number;
  
  /** Breakdown by student type */
  typeBreakdown: Record<StudentType, number>;
  
  /** Availability statistics */
  availabilityStats: {
    averageAvailableHours: number;
    totalOverlapHours: number;
    fragmentationScore: number;
    peakTimeConflicts: number;
  };
  
  /** Duration preference statistics */
  durationStats: {
    averagePreferred: number;
    durationVariety: number;
    totalRequiredTime: number;
  };
  
  /** Scheduling difficulty indicators */
  difficultyIndicators: {
    overlapRatio: number;
    conflictPotential: number;
    packingChallenge: number;
  };
}

/**
 * Main student generator class
 */
export class StudentGenerator {
  private seed: number;
  private availabilityGenerator: AvailabilityGenerator;
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
    this.availabilityGenerator = new AvailabilityGenerator(this.seed);
  }
  
  /**
   * Generate a set of students with mixed types
   */
  generateStudents(config: StudentGenerationConfig): StudentConfig[] {
    if (config.seed) this.setSeed(config.seed);
    
    const students: StudentConfig[] = [];
    const typeDistribution = this.normalizeTypeDistribution(config.typeDistribution);
    const studentTypes = this.selectStudentTypes(config.count, typeDistribution);
    
    for (let i = 0; i < config.count; i++) {
      const studentType = studentTypes[i]!;
      const student = this.generateStudent(studentType, i + 1, config);
      students.push(student);
    }
    
    // Apply variations if requested
    if (config.addVariations) {
      return this.addRealisticVariations(students);
    }
    
    return students;
  }
  
  /**
   * Generate a single student of specific type
   */
  generateStudent(
    type: StudentType,
    index: number,
    config: StudentGenerationConfig
  ): StudentConfig {
    const person = this.generatePerson(index, type);
    const availability = this.generateAvailabilityForType(type, config);
    const durations = this.generateDurationPreferences(type, config);
    const maxLessons = this.generateMaxLessons(type, config);
    
    const student: StudentConfig = {
      person,
      preferredDuration: durations.preferred,
      minDuration: durations.min,
      maxDuration: durations.max,
      maxLessonsPerWeek: maxLessons,
      availability,
      ...config.baseConfig
    };
    
    return student;
  }
  
  /**
   * Analyze a set of generated students
   */
  analyzeStudentSet(students: StudentConfig[]): StudentSetAnalysis {
    const typeBreakdown = this.calculateTypeBreakdown(students);
    const availabilityStats = this.calculateAvailabilityStats(students);
    const durationStats = this.calculateDurationStats(students);
    const difficultyIndicators = this.calculateDifficultyIndicators(students);
    
    return {
      totalStudents: students.length,
      typeBreakdown,
      availabilityStats,
      durationStats,
      difficultyIndicators
    };
  }
  
  /**
   * Generate students optimized for k-solution targeting
   */
  generateForKSolutions(
    targetK: number,
    studentCount: number,
    seed?: number
  ): StudentConfig[] {
    if (seed) this.setSeed(seed);
    
    const config = this.getConfigForTargetK(targetK, studentCount);
    return this.generateStudents(config);
  }
  
  /**
   * Generate person information
   */
  private generatePerson(index: number, type: StudentType): Person {
    return {
      id: `student_${index}`,
      name: `${this.getTypeDescription(type)} Student ${index}`,
      email: `student${index}@test.com`
    };
  }
  
  /**
   * Generate availability based on student type
   */
  private generateAvailabilityForType(
    type: StudentType,
    config: StudentGenerationConfig
  ): WeekSchedule {
    const timezone = config.timezone ?? 'UTC';
    this.availabilityGenerator.setSeed(this.seed + this.hashString(type));
    
    switch (type) {
      case 'morning-person':
        return this.availabilityGenerator.generatePattern('morning', { timezone });
        
      case 'evening-person':
        return this.availabilityGenerator.generatePattern('evening', { timezone });
        
      case 'flexible':
        return this.availabilityGenerator.generatePattern('realistic', { timezone });
        
      case 'weekend-only':
        return this.availabilityGenerator.generatePattern('weekend-only', { timezone });
        
      case 'weekday-only':
        return this.availabilityGenerator.generatePattern('weekday-only', { timezone });
        
      case 'busy-student':
        return this.availabilityGenerator.generatePattern('sparse', { timezone });
        
      case 'part-time':
        return this.availabilityGenerator.generatePattern('part-time', { timezone });
        
      case 'specific-days':
        return this.generateSpecificDaysAvailability(timezone);
        
      case 'long-lessons':
      case 'short-lessons':
      case 'variable-length':
        // These types use standard patterns but vary durations
        return this.availabilityGenerator.generatePattern('realistic', { timezone });
        
      default:
        return this.availabilityGenerator.generatePattern('realistic', { timezone });
    }
  }
  
  /**
   * Generate availability for specific days pattern
   */
  private generateSpecificDaysAvailability(timezone: string): WeekSchedule {
    // Pick 2-3 random days of the week
    const numDays = this.randomInt(2, 3);
    const allDays = [1, 2, 3, 4, 5, 6]; // Monday-Saturday
    const selectedDays: number[] = [];
    
    for (let i = 0; i < numDays; i++) {
      const dayIndex = this.randomInt(0, allDays.length - 1);
      selectedDays.push(allDays[dayIndex]!);
      allDays.splice(dayIndex, 1);
    }
    
    return this.availabilityGenerator.generatePattern('realistic', {
      activeDays: selectedDays,
      timezone
    });
  }
  
  /**
   * Generate duration preferences based on student type
   */
  private generateDurationPreferences(
    type: StudentType,
    config: StudentGenerationConfig
  ): { preferred: number; min: number; max: number } {
    const durationConfig = config.durationConfig ?? {
      preferredRange: [45, 75],
      minRange: [30, 45],
      maxRange: [60, 120]
    };
    
    switch (type) {
      case 'long-lessons':
        {
          const min = this.randomInt(60, 75);
          const preferred = Math.max(min, this.randomInt(75, 120));
          const max = Math.max(preferred, this.randomInt(90, 180));
          return { preferred, min, max };
        }
        
      case 'short-lessons':
        {
          const min = this.randomInt(15, 30);
          const preferred = Math.max(min, this.randomInt(30, 45));
          const max = Math.max(preferred, this.randomInt(45, 60));
          return { preferred, min, max };
        }
        
      case 'variable-length':
        // Wide range of acceptable durations
        {
          const min = this.randomInt(20, 40);
          const preferred = Math.max(min, this.randomInt(45, 90));
          const max = Math.max(preferred, this.randomInt(90, 150));
          return { preferred, min, max };
        }
        
      case 'busy-student':
        // Prefers shorter lessons due to time constraints
        {
          const min = this.randomInt(20, 30);
          const preferred = Math.max(min, this.randomInt(30, 60));
          const max = Math.max(preferred, this.randomInt(60, 90));
          return { preferred, min, max };
        }
        
      default:
        const min = this.randomInt(durationConfig.minRange[0], durationConfig.minRange[1]);
        const preferred = Math.max(min, this.randomInt(durationConfig.preferredRange[0], durationConfig.preferredRange[1]));
        const max = Math.max(preferred, this.randomInt(durationConfig.maxRange[0], durationConfig.maxRange[1]));
        
        return { preferred, min, max };
    }
  }
  
  /**
   * Generate maximum lessons per week based on student type
   */
  private generateMaxLessons(
    type: StudentType,
    config: StudentGenerationConfig
  ): number {
    const range = config.maxLessonsRange ?? [1, 2];
    
    switch (type) {
      case 'busy-student':
        return 1; // Very limited time
        
      case 'part-time':
        return this.randomInt(1, 2);
        
      case 'weekend-only':
        return this.randomInt(1, 3); // Can fit more on weekends
        
      case 'flexible':
        return this.randomInt(1, 3); // Very flexible
        
      default:
        return this.randomInt(range[0], range[1]);
    }
  }
  
  /**
   * Normalize type distribution weights
   */
  private normalizeTypeDistribution(
    distribution?: Partial<Record<StudentType, number>>
  ): Record<StudentType, number> {
    const defaultDistribution: Record<StudentType, number> = {
      'morning-person': 0.15,
      'evening-person': 0.15,
      'flexible': 0.20,
      'weekend-only': 0.05,
      'weekday-only': 0.10,
      'busy-student': 0.10,
      'part-time': 0.10,
      'specific-days': 0.05,
      'long-lessons': 0.03,
      'short-lessons': 0.03,
      'variable-length': 0.04
    };
    
    const finalDistribution = { ...defaultDistribution, ...distribution };
    
    // Normalize to sum to 1.0
    const total = Object.values(finalDistribution).reduce((sum, weight) => sum + weight, 0);
    
    if (total > 0) {
      Object.keys(finalDistribution).forEach(key => {
        finalDistribution[key as StudentType] /= total;
      });
    }
    
    return finalDistribution;
  }
  
  /**
   * Select student types based on distribution
   */
  private selectStudentTypes(
    count: number,
    distribution: Record<StudentType, number>
  ): StudentType[] {
    const types: StudentType[] = [];
    const typeKeys = Object.keys(distribution) as StudentType[];
    
    for (let i = 0; i < count; i++) {
      const rand = this.random();
      let cumulative = 0;
      let typeAssigned = false;
      
      for (const type of typeKeys) {
        cumulative += distribution[type];
        if (rand <= cumulative) {
          types.push(type);
          typeAssigned = true;
          break;
        }
      }
      
      // If no type was assigned (due to rounding errors), assign the first available type
      if (!typeAssigned && typeKeys.length > 0) {
        types.push(typeKeys[0]!);
      }
    }
    
    // If we still didn't assign all students, assign remaining as 'flexible'
    while (types.length < count) {
      types.push('flexible');
    }
    
    return types;
  }
  
  /**
   * Add realistic variations to generated students
   */
  private addRealisticVariations(students: StudentConfig[]): StudentConfig[] {
    return students.map(student => {
      // 20% chance to adjust preferred duration
      if (this.random() < 0.2) {
        const variation = this.randomInt(-15, 15);
        const newPreferred = student.preferredDuration + variation;
        const minDuration = student.minDuration ?? 15;
        const maxDuration = student.maxDuration ?? 180;
        
        // Ensure the new preferred duration is within bounds
        student.preferredDuration = Math.max(minDuration, Math.min(maxDuration, newPreferred));
        
        // If preferred went below min, adjust min down
        if (student.preferredDuration === minDuration && newPreferred < minDuration) {
          student.minDuration = Math.max(15, newPreferred);
        }
        
        // If preferred went above max, adjust max up
        if (student.preferredDuration === maxDuration && newPreferred > maxDuration) {
          student.maxDuration = Math.min(180, newPreferred);
        }
      }
      
      // 10% chance to adjust max lessons
      if (this.random() < 0.1) {
        student.maxLessonsPerWeek = Math.max(1, student.maxLessonsPerWeek + this.randomInt(-1, 1));
      }
      
      // 15% chance to slightly modify availability
      if (this.random() < 0.15) {
        student.availability = this.addAvailabilityVariation(student.availability);
      }
      
      return student;
    });
  }
  
  /**
   * Add small variations to availability
   */
  private addAvailabilityVariation(availability: WeekSchedule): WeekSchedule {
    const modifiedDays = availability.days.map(day => {
      if (day.blocks.length === 0) return day;
      
      const modifiedBlocks = day.blocks.map(block => {
        // Small chance to adjust timing
        if (this.random() < 0.3) {
          const startVariation = this.randomInt(-30, 30); // ±30 minutes
          const durationVariation = this.randomInt(-15, 15); // ±15 minutes
          
          return {
            start: Math.max(0, block.start + startVariation),
            duration: Math.max(15, block.duration + durationVariation)
          };
        }
        return block;
      });
      
      return {
        ...day,
        blocks: modifiedBlocks.sort((a, b) => a.start - b.start)
      };
    });
    
    return {
      ...availability,
      days: modifiedDays
    };
  }
  
  /**
   * Get configuration optimized for k-solution targeting
   */
  private getConfigForTargetK(targetK: number, studentCount: number): StudentGenerationConfig {
    if (targetK === 0) {
      // For impossible cases, create conflicting students
      return {
        count: studentCount,
        typeDistribution: {
          'busy-student': 0.4,
          'specific-days': 0.3,
          'weekend-only': 0.2,
          'evening-person': 0.1
        },
        addVariations: false,
        timezone: 'UTC'
      };
    } else if (targetK === 1) {
      // For unique solutions, create moderately conflicting scenarios
      return {
        count: studentCount,
        typeDistribution: {
          'busy-student': 0.3,
          'specific-days': 0.2,
          'morning-person': 0.2,
          'evening-person': 0.2,
          'part-time': 0.1
        },
        addVariations: false,
        timezone: 'UTC'
      };
    } else if (targetK <= 10) {
      // For few solutions, moderate variety
      return {
        count: studentCount,
        typeDistribution: {
          'morning-person': 0.2,
          'evening-person': 0.2,
          'weekday-only': 0.2,
          'part-time': 0.2,
          'busy-student': 0.2
        },
        addVariations: false,
        timezone: 'UTC'
      };
    } else {
      // For many solutions, flexible students
      return {
        count: studentCount,
        typeDistribution: {
          'flexible': 0.5,
          'morning-person': 0.15,
          'evening-person': 0.15,
          'weekday-only': 0.1,
          'variable-length': 0.1
        },
        addVariations: true,
        timezone: 'UTC'
      };
    }
  }
  
  /**
   * Calculate type breakdown analysis
   */
  private calculateTypeBreakdown(students: StudentConfig[]): Record<StudentType, number> {
    const breakdown: Record<StudentType, number> = {
      'morning-person': 0,
      'evening-person': 0,
      'flexible': 0,
      'weekend-only': 0,
      'weekday-only': 0,
      'busy-student': 0,
      'part-time': 0,
      'specific-days': 0,
      'long-lessons': 0,
      'short-lessons': 0,
      'variable-length': 0
    };
    
    // Infer types from student characteristics
    students.forEach(student => {
      const type = this.inferStudentType(student);
      breakdown[type]++;
    });
    
    return breakdown;
  }
  
  /**
   * Infer student type from configuration
   */
  private inferStudentType(student: StudentConfig): StudentType {
    // Simple heuristic based on name or characteristics
    const name = student.person.name.toLowerCase();
    
    if (name.includes('morning')) return 'morning-person';
    if (name.includes('evening')) return 'evening-person';
    if (name.includes('flexible')) return 'flexible';
    if (name.includes('weekend')) return 'weekend-only';
    if (name.includes('weekday')) return 'weekday-only';
    if (name.includes('busy')) return 'busy-student';
    if (name.includes('part')) return 'part-time';
    if (name.includes('specific')) return 'specific-days';
    if (name.includes('long')) return 'long-lessons';
    if (name.includes('short')) return 'short-lessons';
    if (name.includes('variable')) return 'variable-length';
    
    // Default inference based on characteristics
    if (student.preferredDuration >= 90) return 'long-lessons';
    if (student.preferredDuration <= 45) return 'short-lessons';
    if (student.maxLessonsPerWeek === 1) return 'busy-student';
    
    return 'flexible';
  }
  
  /**
   * Calculate availability statistics
   */
  private calculateAvailabilityStats(students: StudentConfig[]): StudentSetAnalysis['availabilityStats'] {
    const totalHours = students.reduce((sum, student) => {
      const studentHours = student.availability.days.reduce((daySum, day) => {
        return daySum + day.blocks.reduce((blockSum, block) => blockSum + block.duration, 0);
      }, 0);
      return sum + (studentHours / 60); // Convert to hours
    }, 0);
    
    const averageAvailableHours = totalHours / students.length;
    
    // Simplified calculations for other stats
    return {
      averageAvailableHours,
      totalOverlapHours: totalHours * 0.3, // Rough estimate
      fragmentationScore: 0.4, // Placeholder
      peakTimeConflicts: Math.floor(students.length * 0.2) // Estimate
    };
  }
  
  /**
   * Calculate duration statistics
   */
  private calculateDurationStats(students: StudentConfig[]): StudentSetAnalysis['durationStats'] {
    const totalPreferred = students.reduce((sum, s) => sum + s.preferredDuration, 0);
    const averagePreferred = totalPreferred / students.length;
    
    const uniqueDurations = new Set(students.map(s => s.preferredDuration));
    const durationVariety = uniqueDurations.size;
    
    return {
      averagePreferred,
      durationVariety,
      totalRequiredTime: totalPreferred
    };
  }
  
  /**
   * Calculate difficulty indicators
   */
  private calculateDifficultyIndicators(_students: StudentConfig[]): StudentSetAnalysis['difficultyIndicators'] {
    // Simplified difficulty calculations
    return {
      overlapRatio: 0.5, // Placeholder
      conflictPotential: 0.3, // Placeholder
      packingChallenge: 0.6 // Placeholder
    };
  }
  
  /**
   * Get description for student type
   */
  private getTypeDescription(type: StudentType): string {
    switch (type) {
      case 'morning-person': return 'Morning Person';
      case 'evening-person': return 'Evening Person';
      case 'flexible': return 'Flexible';
      case 'weekend-only': return 'Weekend Only';
      case 'weekday-only': return 'Weekday Only';
      case 'busy-student': return 'Busy Student';
      case 'part-time': return 'Part Time';
      case 'specific-days': return 'Specific Days';
      case 'long-lessons': return 'Long Lessons';
      case 'short-lessons': return 'Short Lessons';
      case 'variable-length': return 'Variable Length';
      default: return 'Standard';
    }
  }
  
  /**
   * Hash string to number for seeding
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Generate random number with current seed
   */
  private random(): number {
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
    this.availabilityGenerator.setSeed(seed);
  }
  
  /**
   * Get current random seed
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Student preset configurations for common scenarios
 */
export class StudentPresets {
  private generator = new StudentGenerator();
  
  /**
   * Generate a mixed set of realistic students
   */
  generateRealisticMix(count: number, seed?: number): StudentConfig[] {
    return this.generator.generateStudents({
      count,
      seed,
      addVariations: true,
      timezone: 'UTC'
    });
  }
  
  /**
   * Generate students for easy scheduling scenarios
   */
  generateEasySchedulingSet(count: number, seed?: number): StudentConfig[] {
    return this.generator.generateStudents({
      count,
      seed,
      typeDistribution: {
        'flexible': 0.6,
        'morning-person': 0.2,
        'evening-person': 0.2
      },
      addVariations: true,
      timezone: 'UTC'
    });
  }
  
  /**
   * Generate students for difficult scheduling scenarios
   */
  generateDifficultSchedulingSet(count: number, seed?: number): StudentConfig[] {
    return this.generator.generateStudents({
      count,
      seed,
      typeDistribution: {
        'busy-student': 0.4,
        'specific-days': 0.3,
        'weekend-only': 0.2,
        'part-time': 0.1
      },
      addVariations: false,
      timezone: 'UTC'
    });
  }
  
  /**
   * Generate students with conflicting availability
   */
  generateConflictingSet(count: number, seed?: number): StudentConfig[] {
    return this.generator.generateStudents({
      count,
      seed,
      typeDistribution: {
        'morning-person': 0.5,
        'evening-person': 0.5
      },
      addVariations: false,
      timezone: 'UTC'
    });
  }
  
  /**
   * Generate students with varied lesson length preferences
   */
  generateDurationVariedSet(count: number, seed?: number): StudentConfig[] {
    return this.generator.generateStudents({
      count,
      seed,
      typeDistribution: {
        'long-lessons': 0.3,
        'short-lessons': 0.3,
        'variable-length': 0.4
      },
      addVariations: true,
      timezone: 'UTC'
    });
  }
}

/**
 * Default student generator instance
 */
export const defaultStudentGenerator = new StudentGenerator();

/**
 * Default student presets instance
 */
export const studentPresets = new StudentPresets();