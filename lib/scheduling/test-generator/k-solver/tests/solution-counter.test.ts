/**
 * Unit tests for solution counter functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SolutionCounter, 
  createOptimalSolutionCounter, 
  defaultSolutionCounter 
} from '../solution-counter';
import type { TeacherConfig, StudentConfig } from '../../../types';

describe('SolutionCounter', () => {
  let solutionCounter: SolutionCounter;
  
  beforeEach(() => {
    solutionCounter = new SolutionCounter({
      maxExactTimeMs: 10000,
      maxExactStudents: 8,
      confidenceLevel: 0.95,
      defaultSamples: 500
    });
  });
  
  // Helper to create test teacher
  const createTestTeacher = (): TeacherConfig => ({
    person: {
      id: 'teacher_test',
      name: 'Test Teacher',
      email: 'teacher@test.com'
    },
    studioId: 'studio_test',
    availability: {
      days: [
        {
          dayOfWeek: 1, // Monday
          blocks: [
            { start: 540, duration: 240 }, // 9am-1pm (4 hours)
            { start: 840, duration: 180 }  // 2pm-5pm (3 hours)
          ]
        },
        {
          dayOfWeek: 3, // Wednesday  
          blocks: [
            { start: 600, duration: 300 } // 10am-3pm (5 hours)
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
  
  // Helper to create test students
  const createTestStudents = (count: number): StudentConfig[] => {
    const students: StudentConfig[] = [];
    
    for (let i = 0; i < count; i++) {
      students.push({
        person: {
          id: `student_${i + 1}`,
          name: `Student ${i + 1}`,
          email: `student${i + 1}@test.com`
        },
        preferredDuration: 60,
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            {
              dayOfWeek: 1, // Monday
              blocks: [
                { start: 540 + i * 60, duration: 120 } // Overlapping but offset times
              ]
            },
            {
              dayOfWeek: 3, // Wednesday
              blocks: [
                { start: 600 + i * 30, duration: 90 }
              ]
            }
          ],
          timezone: 'UTC'
        }
      });
    }
    
    return students;
  };
  
  describe('exact counting', () => {
    it('should count exact solutions for small cases', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3);
      
      const result = await solutionCounter.countExact(teacher, students);
      
      expect(result.isExact).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.timeMs).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.backtrackCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.constraintChecks).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle impossible cases', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(2);
      
      // Make it impossible by requiring more time than available
      students.forEach(student => {
        student.preferredDuration = 480; // 8 hours each (impossible)
      });
      
      const result = await solutionCounter.countExact(teacher, students);
      
      expect(result.isExact).toBe(true);
      expect(result.count).toBe(0);
    });
    
    it('should respect timeout limits', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(5);
      
      const result = await solutionCounter.countExact(teacher, students, 100); // Very short timeout
      
      // Should either complete quickly or timeout
      expect(result.timeMs).toBeLessThan(500);
      expect(result.isExact).toBe(true);
    });
    
    it('should reject cases that are too large', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(15); // Too many students
      
      const result = await solutionCounter.countExact(teacher, students);
      
      expect(result.isExact).toBe(false);
      expect(result.error).toContain('Too many students');
    });
  });
  
  describe('estimation via sampling', () => {
    it('should estimate solutions for larger cases', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(5);
      
      const result = await solutionCounter.estimateViaSampling(teacher, students, 200);
      
      expect(result.isExact).toBe(false);
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.timeMs).toBeGreaterThan(0);
      expect(result.samplesUsed).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval![0]).toBeLessThanOrEqual(result.count);
      expect(result.confidenceInterval![1]).toBeGreaterThanOrEqual(result.count);
    });
    
    it('should provide confidence intervals', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      const result = await solutionCounter.estimateViaSampling(teacher, students, 300);
      
      expect(result.confidenceInterval).toBeDefined();
      const [lower, upper] = result.confidenceInterval!;
      expect(lower).toBeLessThanOrEqual(upper);
      expect(lower).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle cases with no solutions', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3);
      
      // Make impossible by conflicting schedules
      students.forEach((student, i) => {
        student.availability.days = [
          {
            dayOfWeek: i + 5, // Each student only available on different weekends
            blocks: [{ start: 600, duration: 60 }]
          }
        ];
      });
      
      const result = await solutionCounter.estimateViaSampling(teacher, students, 100);
      
      expect(result.count).toBe(0);
    });
  });
  
  describe('bounds calculation', () => {
    it('should calculate theoretical bounds', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3);
      
      const bounds = solutionCounter.calculateBounds(teacher, students);
      
      expect(bounds.min).toBeGreaterThanOrEqual(0);
      expect(bounds.max).toBeGreaterThanOrEqual(bounds.min);
      expect(bounds.reasoning).toBeDefined();
      expect(bounds.reasoning.length).toBeGreaterThan(0);
    });
    
    it('should detect impossible cases in bounds', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(2);
      
      // Make impossible
      students.forEach(student => {
        student.preferredDuration = 1000; // Impossibly long
      });
      
      const bounds = solutionCounter.calculateBounds(teacher, students);
      
      expect(bounds.min).toBe(0);
      expect(bounds.reasoning.some(r => r.includes('impossible') || r.includes('Impossible'))).toBe(true);
    });
    
    it('should provide reasonable upper bounds', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(2);
      
      const bounds = solutionCounter.calculateBounds(teacher, students);
      
      expect(bounds.max).toBeGreaterThan(0);
      expect(bounds.max).toBeLessThan(1000000); // Should be reasonable
    });
  });
  
  describe('configuration and optimization', () => {
    it('should create optimal counter for different student counts', () => {
      const smallCounter = createOptimalSolutionCounter(5);
      const largeCounter = createOptimalSolutionCounter(30);
      
      // These should have different configurations optimized for their use case
      expect(smallCounter).toBeDefined();
      expect(largeCounter).toBeDefined();
    });
    
    it('should respect custom configuration', () => {
      const customCounter = new SolutionCounter({
        maxExactStudents: 5,
        maxExactTimeMs: 5000,
        confidenceLevel: 0.99,
        defaultSamples: 2000
      });
      
      expect(customCounter).toBeDefined();
    });
  });
  
  describe('error handling', () => {
    it('should handle malformed teacher data', async () => {
      const badTeacher: TeacherConfig = {
        person: { id: 'bad', name: 'Bad', email: 'bad@test.com' },
        studioId: 'bad',
        availability: { days: [], timezone: 'UTC' }, // No availability
        constraints: {
          maxConsecutiveMinutes: 60,
          breakDurationMinutes: 15,
          minLessonDuration: 30,
          maxLessonDuration: 90,
          allowedDurations: [60]
        }
      };
      
      const students = createTestStudents(2);
      
      const result = await solutionCounter.countExact(badTeacher, students);
      
      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });
    
    it('should handle malformed student data', async () => {
      const teacher = createTestTeacher();
      const badStudents: StudentConfig[] = [
        {
          person: { id: 'bad', name: 'Bad', email: 'bad@test.com' },
          preferredDuration: 60,
          maxLessonsPerWeek: 1,
          availability: { days: [], timezone: 'UTC' } // No availability
        }
      ];
      
      const result = await solutionCounter.countExact(teacher, badStudents);
      
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });
  });
  
  describe('performance characteristics', () => {
    it('should be reasonably fast for small cases', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3);
      
      const startTime = Date.now();
      const result = await solutionCounter.countExact(teacher, students);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in 5 seconds
      expect(result.timeMs).toBeCloseTo(endTime - startTime, -2); // Within 100ms
    });
    
    it('should scale reasonably with sampling', async () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(6);
      
      const smallSample = await solutionCounter.estimateViaSampling(teacher, students, 50);
      const largeSample = await solutionCounter.estimateViaSampling(teacher, students, 500);
      
      // Larger sample should be more time-consuming but potentially more accurate
      expect(largeSample.timeMs).toBeGreaterThanOrEqual(smallSample.timeMs);
      expect(largeSample.samplesUsed).toBeGreaterThan(smallSample.samplesUsed!);
    });
  });
});

describe('Default Solution Counter', () => {
  it('should be properly initialized', () => {
    expect(defaultSolutionCounter).toBeDefined();
  });
  
  it('should work with default settings', async () => {
    const teacher: TeacherConfig = {
      person: { id: 'default_test', name: 'Default Test', email: 'default@test.com' },
      studioId: 'default_studio',
      availability: {
        days: [
          {
            dayOfWeek: 1,
            blocks: [{ start: 540, duration: 180 }] // 9am-12pm
          }
        ],
        timezone: 'UTC'
      },
      constraints: {
        maxConsecutiveMinutes: 120,
        breakDurationMinutes: 15,
        minLessonDuration: 30,
        maxLessonDuration: 60,
        allowedDurations: [30, 60]
      }
    };
    
    const students: StudentConfig[] = [
      {
        person: { id: 's1', name: 'Student 1', email: 's1@test.com' },
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
      }
    ];
    
    const result = await defaultSolutionCounter.countExact(teacher, students);
    
    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThanOrEqual(0);
  });
});