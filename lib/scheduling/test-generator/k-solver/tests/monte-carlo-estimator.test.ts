/**
 * Unit tests for Monte Carlo estimator functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MonteCarloEstimator, 
  createOptimalMonteCarloEstimator, 
  defaultMonteCarloEstimator 
} from '../monte-carlo-estimator';
import type { TeacherConfig, StudentConfig } from '../../../types';

describe('MonteCarloEstimator', () => {
  let estimator: MonteCarloEstimator;
  
  beforeEach(() => {
    estimator = new MonteCarloEstimator({
      baseSamples: 200,
      maxSamples: 1000,
      minSamples: 50,
      confidenceLevel: 0.95,
      targetMarginOfError: 0.1,
      useStratifiedSampling: true,
      useImportanceSampling: false
    });
  });
  
  // Helper to create test teacher with good availability
  const createTestTeacher = (): TeacherConfig => ({
    person: {
      id: 'teacher_mc_test',
      name: 'MC Test Teacher',
      email: 'mcteacher@test.com'
    },
    studioId: 'studio_mc_test',
    availability: {
      days: [
        {
          dayOfWeek: 1, // Monday
          blocks: [
            { start: 540, duration: 300 }, // 9am-2pm (5 hours)
            { start: 900, duration: 120 }  // 3pm-5pm (2 hours)
          ]
        },
        {
          dayOfWeek: 2, // Tuesday  
          blocks: [
            { start: 600, duration: 240 } // 10am-2pm (4 hours)
          ]
        },
        {
          dayOfWeek: 3, // Wednesday
          blocks: [
            { start: 480, duration: 360 } // 8am-2pm (6 hours)
          ]
        }
      ],
      timezone: 'UTC'
    },
    constraints: {
      maxConsecutiveMinutes: 180,
      breakDurationMinutes: 15,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [30, 45, 60, 90]
    }
  });
  
  // Helper to create test students with varying availability
  const createTestStudents = (count: number): StudentConfig[] => {
    const students: StudentConfig[] = [];
    
    for (let i = 0; i < count; i++) {
      const dayIndex = i % 3; // Distribute across different days
      const startTime = 540 + (i * 30); // Stagger start times
      
      students.push({
        person: {
          id: `student_mc_${i + 1}`,
          name: `MC Student ${i + 1}`,
          email: `mcstudent${i + 1}@test.com`
        },
        preferredDuration: [45, 60, 90][i % 3] ?? 60, // Vary durations
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            {
              dayOfWeek: dayIndex + 1, // Monday, Tuesday, or Wednesday
              blocks: [
                { start: startTime, duration: 120 + (i * 15) } // Vary block sizes
              ]
            }
          ],
          timezone: 'UTC'
        }
      });
    }
    
    return students;
  };
  
  describe('basic estimation', () => {
    it('should estimate solutions using simple Monte Carlo', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(8);
      
      const result = await estimator.estimate(teacher, students, 300);
      
      expect(result.isExact).toBe(false);
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.timeMs).toBeGreaterThan(0);
      expect(result.samplesUsed).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
    });
    
    it('should provide confidence intervals', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(6);
      
      const result = await estimator.estimate(teacher, students, 200);
      
      expect(result.confidenceInterval).toBeDefined();
      if (result.confidenceInterval) {
        const [lower, upper] = result.confidenceInterval;
        expect(lower).toBeLessThanOrEqual(upper);
        expect(lower).toBeGreaterThanOrEqual(0);
        expect(upper).toBeGreaterThanOrEqual(result.count);
      }
    });
    
    it('should handle cases with high solution probability', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3); // Small number, should have solutions
      
      const result = await estimator.estimate(teacher, students, 150);
      
      expect(result.count).toBeGreaterThan(0);
      expect(result.samplesUsed).toBeGreaterThan(0);
    });
    
    it('should handle cases with low solution probability', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      // Make it harder by requiring long lessons
      students.forEach(student => {
        student.preferredDuration = 120; // 2 hour lessons
      });
      
      const result = await estimator.estimate(teacher, students, 200);
      
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.samplesUsed).toBeGreaterThan(0);
    });
  });
  
  describe('stratified sampling', () => {
    it('should use stratified sampling for larger problems', async () => {
      const stratifiedEstimator = new MonteCarloEstimator({
        useStratifiedSampling: true,
        numStrata: 3,
        baseSamples: 300
      });
      
      const teacher = createTestTeacher();
      const students = createTestStudents(12); // Large enough to trigger stratification
      
      const result = await stratifiedEstimator.estimate(teacher, students, 300);
      
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.samplesUsed).toBeGreaterThan(0);
    });
    
    it('should provide consistent results with stratification', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(10);
      
      const stratified = new MonteCarloEstimator({
        useStratifiedSampling: true,
        baseSamples: 200
      });
      
      const nonStratified = new MonteCarloEstimator({
        useStratifiedSampling: false,
        baseSamples: 200
      });
      
      const result1 = await stratified.estimate(teacher, students, 200);
      const result2 = await nonStratified.estimate(teacher, students, 200);
      
      // Both should produce reasonable estimates
      expect(result1.count).toBeGreaterThanOrEqual(0);
      expect(result2.count).toBeGreaterThanOrEqual(0);
      
      // Results should be in the same ballpark (within an order of magnitude)
      if (result1.count > 0 && result2.count > 0) {
        const ratio = Math.max(result1.count, result2.count) / Math.min(result1.count, result2.count);
        expect(ratio).toBeLessThan(100); // Within 2 orders of magnitude
      }
    });
  });
  
  describe('importance sampling', () => {
    it('should use importance sampling when enabled', async () => {
      const importanceEstimator = new MonteCarloEstimator({
        useImportanceSampling: true,
        useStratifiedSampling: false,
        baseSamples: 250
      });
      
      const teacher = createTestTeacher();
      const students = createTestStudents(15); // Large enough to trigger importance sampling
      
      const result = await importanceEstimator.estimate(teacher, students, 250);
      
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.samplesUsed).toBeGreaterThan(0);
    });
  });
  
  describe('adaptive sampling', () => {
    it('should adapt sample size based on convergence', async () => {
      const adaptiveEstimator = new MonteCarloEstimator({
        targetMarginOfError: 0.05, // Tight margin
        maxSamples: 1000,
        minSamples: 100
      });
      
      const teacher = createTestTeacher();
      const students = createTestStudents(6);
      
      const result = await adaptiveEstimator.estimate(teacher, students);
      
      expect(result.samplesUsed).toBeGreaterThanOrEqual(100);
      expect(result.samplesUsed).toBeLessThanOrEqual(1000);
    });
    
    it('should stop early when convergence is achieved', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3); // Simple case should converge quickly
      
      const result = await estimator.estimate(teacher, students, 500);
      
      // For simple cases, might converge before using all samples
      expect(result.samplesUsed).toBeLessThanOrEqual(500);
    });
  });
  
  describe('error handling', () => {
    it('should handle impossible cases gracefully', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3);
      
      // Make impossible by requiring more time than available
      students.forEach(student => {
        student.preferredDuration = 600; // 10 hours each
      });
      
      const result = await estimator.estimate(teacher, students, 100);
      
      expect(result.count).toBe(0);
      expect(result.error).toBeUndefined();
    });
    
    it('should handle empty teacher availability', async () => {
      const teacher: TeacherConfig = {
        ...createTestTeacher(),
        availability: { days: [], timezone: 'UTC' }
      };
      const students = createTestStudents(2);
      
      const result = await estimator.estimate(teacher, students, 50);
      
      expect(result.count).toBe(0);
    });
    
    it('should handle students with no availability', async () => {
      const teacher = createTestTeacher();
      const students: StudentConfig[] = [{
        person: { id: 'no_avail', name: 'No Availability', email: 'no@test.com' },
        preferredDuration: 60,
        maxLessonsPerWeek: 1,
        availability: { days: [], timezone: 'UTC' }
      }];
      
      const result = await estimator.estimate(teacher, students, 50);
      
      expect(result.count).toBe(0);
    });
  });
  
  describe('performance and scaling', () => {
    it('should complete estimation in reasonable time', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(8);
      
      const startTime = Date.now();
      const result = await estimator.estimate(teacher, students, 200);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      expect(result.timeMs).toBeCloseTo(endTime - startTime, -2);
    });
    
    it('should scale reasonably with problem size', async () => {
      const teacher = createTestTeacher();
      
      const small = await estimator.estimate(teacher, createTestStudents(5), 100);
      const large = await estimator.estimate(teacher, createTestStudents(10), 100);
      
      // Larger problems should take more time but not exponentially more
      expect(large.timeMs).toBeGreaterThanOrEqual(small.timeMs);
      expect(large.timeMs).toBeLessThan(small.timeMs * 10); // Not more than 10x
    });
    
    it('should scale linearly with sample count', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(6);
      
      const result1 = await estimator.estimate(teacher, students, 100);
      const result2 = await estimator.estimate(teacher, students, 300);
      
      // More samples should take proportionally more time
      const timeRatio = result2.timeMs / result1.timeMs;
      const sampleRatio = (result2.samplesUsed ?? 300) / (result1.samplesUsed ?? 100);
      
      expect(timeRatio).toBeGreaterThan(1);
      expect(timeRatio).toBeLessThan(sampleRatio * 2); // Within 2x of linear scaling
    });
  });
  
  describe('statistical properties', () => {
    it('should provide consistent estimates with same input', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(5);
      
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await estimator.estimate(teacher, students, 150);
        results.push(result.count);
      }
      
      // Results should be reasonably consistent
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / results.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be reasonable relative to mean
      if (mean > 0) {
        expect(stdDev / mean).toBeLessThan(1.0); // Coefficient of variation < 100%
      }
    });
    
    it('should respect confidence levels', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      const result = await estimator.estimate(teacher, students, 200);
      
      if (result.confidenceInterval && result.confidence) {
        const [lower, upper] = result.confidenceInterval;
        const range = upper - lower;
        const estimate = result.count;
        
        // Confidence interval should be reasonable
        expect(range).toBeGreaterThan(0);
        expect(estimate).toBeGreaterThanOrEqual(lower);
        expect(estimate).toBeLessThanOrEqual(upper);
        
        // For 95% confidence, interval should not be too wide
        if (estimate > 0) {
          expect(range / estimate).toBeLessThan(2.0); // Range < 200% of estimate
        }
      }
    });
  });
  
  describe('configuration optimization', () => {
    it('should create optimal estimator for different problem sizes', () => {
      const smallOptimal = createOptimalMonteCarloEstimator(5);
      const largeOptimal = createOptimalMonteCarloEstimator(25);
      
      expect(smallOptimal).toBeDefined();
      expect(largeOptimal).toBeDefined();
    });
    
    it('should handle custom configuration', () => {
      const customEstimator = new MonteCarloEstimator({
        baseSamples: 500,
        confidenceLevel: 0.99,
        useStratifiedSampling: false,
        useImportanceSampling: true
      });
      
      expect(customEstimator).toBeDefined();
    });
  });
});

describe('Default Monte Carlo Estimator', () => {
  it('should be properly initialized', () => {
    expect(defaultMonteCarloEstimator).toBeDefined();
  });
  
  it('should work with default settings', async () => {
    const teacher: TeacherConfig = {
      person: { id: 'default_mc', name: 'Default MC', email: 'defaultmc@test.com' },
      studioId: 'default_mc_studio',
      availability: {
        days: [
          {
            dayOfWeek: 1,
            blocks: [{ start: 540, duration: 240 }] // 9am-1pm
          }
        ],
        timezone: 'UTC'
      },
      constraints: {
        maxConsecutiveMinutes: 180,
        breakDurationMinutes: 15,
        minLessonDuration: 30,
        maxLessonDuration: 90,
        allowedDurations: [60, 90]
      }
    };
    
    const students: StudentConfig[] = [
      {
        person: { id: 'mc1', name: 'MC Student 1', email: 'mc1@test.com' },
        preferredDuration: 60,
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            {
              dayOfWeek: 1,
              blocks: [{ start: 540, duration: 120 }]
            }
          ],
          timezone: 'UTC'
        }
      },
      {
        person: { id: 'mc2', name: 'MC Student 2', email: 'mc2@test.com' },
        preferredDuration: 90,
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            {
              dayOfWeek: 1,
              blocks: [{ start: 660, duration: 120 }]
            }
          ],
          timezone: 'UTC'
        }
      }
    ];
    
    const result = await defaultMonteCarloEstimator.estimate(teacher, students, 100);
    
    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timeMs).toBeGreaterThan(0);
  });
});