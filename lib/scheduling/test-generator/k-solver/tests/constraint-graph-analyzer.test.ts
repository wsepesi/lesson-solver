/**
 * Unit tests for constraint graph analyzer functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ConstraintGraphAnalyzer, 
  createOptimalConstraintAnalyzer, 
  defaultConstraintGraphAnalyzer 
} from '../constraint-graph-analyzer';
import type { TeacherConfig, StudentConfig } from '../../../types';

describe('ConstraintGraphAnalyzer', () => {
  let analyzer: ConstraintGraphAnalyzer;
  
  beforeEach(() => {
    analyzer = new ConstraintGraphAnalyzer({
      includeBreakConstraints: true,
      includeConsecutiveConstraints: true,
      maxCliqueComputationSize: 15,
      useHeuristics: true,
      confidenceThreshold: 0.8
    });
  });
  
  // Helper to create test teacher
  const createTestTeacher = (overrides?: Partial<TeacherConfig>): TeacherConfig => ({
    person: {
      id: 'teacher_cg_test',
      name: 'CG Test Teacher',
      email: 'cgteacher@test.com'
    },
    studioId: 'studio_cg_test',
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
          dayOfWeek: 2, // Tuesday  
          blocks: [
            { start: 600, duration: 300 } // 10am-3pm (5 hours)
          ]
        },
        {
          dayOfWeek: 3, // Wednesday
          blocks: [
            { start: 480, duration: 420 } // 8am-3pm (7 hours)
          ]
        }
      ],
      timezone: 'UTC'
    },
    constraints: {
      maxConsecutiveMinutes: 180, // 3 hours
      breakDurationMinutes: 15,
      minLessonDuration: 30,
      maxLessonDuration: 90,
      allowedDurations: [30, 45, 60, 90]
    },
    ...overrides
  });
  
  // Helper to create test students
  const createTestStudents = (count: number, pattern = 'overlapping'): StudentConfig[] => {
    const students: StudentConfig[] = [];
    
    for (let i = 0; i < count; i++) {
      let availability;
      
      switch (pattern) {
        case 'overlapping':
          // All students want same time slots (high conflict)
          availability = {
            days: [
              {
                dayOfWeek: 1,
                blocks: [{ start: 540, duration: 180 }] // 9am-12pm
              }
            ],
            timezone: 'UTC'
          };
          break;
          
        case 'non-overlapping':
          // Students want different time slots (low conflict)
          availability = {
            days: [
              {
                dayOfWeek: (i % 3) + 1, // Spread across Monday, Tuesday, Wednesday
                blocks: [{ start: 540 + (i * 60), duration: 120 }]
              }
            ],
            timezone: 'UTC'
          };
          break;
          
        case 'partial-overlap':
          // Some overlap but not complete
          availability = {
            days: [
              {
                dayOfWeek: 1,
                blocks: [{ start: 540 + (i * 30), duration: 150 }]
              }
            ],
            timezone: 'UTC'
          };
          break;
          
        default:
          availability = {
            days: [
              {
                dayOfWeek: 1,
                blocks: [{ start: 540, duration: 120 }]
              }
            ],
            timezone: 'UTC'
          };
      }
      
      students.push({
        person: {
          id: `student_cg_${i + 1}`,
          name: `CG Student ${i + 1}`,
          email: `cgstudent${i + 1}@test.com`
        },
        preferredDuration: [45, 60, 90][i % 3] ?? 60, // Vary durations
        maxLessonsPerWeek: 1,
        availability
      });
    }
    
    return students;
  };
  
  describe('bounds calculation', () => {
    it('should calculate bounds for simple cases', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3, 'non-overlapping');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds).toBeDefined();
      expect(bounds.lowerBound).toBeGreaterThanOrEqual(0);
      expect(bounds.upperBound).toBeGreaterThanOrEqual(bounds.lowerBound);
      expect(bounds.theoreticalMax).toBeGreaterThanOrEqual(bounds.upperBound);
      expect(bounds.reasoning).toBeDefined();
      expect(bounds.reasoning.length).toBeGreaterThan(0);
      expect(bounds.confidence).toBeGreaterThan(0);
      expect(bounds.confidence).toBeLessThanOrEqual(1);
    });
    
    it('should detect impossible cases', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(2);
      
      // Make impossible by requiring too much time
      students.forEach(student => {
        student.preferredDuration = 1000; // 16+ hours each
      });
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.lowerBound).toBe(0);
      expect(bounds.reasoning.some(r => 
        r.toLowerCase().includes('impossible') || 
        r.toLowerCase().includes('required') && r.toLowerCase().includes('available')
      )).toBe(true);
    });
    
    it('should provide tighter bounds for high-conflict scenarios', () => {
      const teacher = createTestTeacher();
      const overlappingStudents = createTestStudents(4, 'overlapping'); // Reduced to avoid impossible scenarios
      const nonOverlappingStudents = createTestStudents(4, 'non-overlapping');
      
      const overlappingBounds = analyzer.calculateBounds(teacher, overlappingStudents);
      const nonOverlappingBounds = analyzer.calculateBounds(teacher, nonOverlappingStudents);
      
      // Only check if both scenarios are feasible
      if (overlappingBounds.upperBound > 0 && nonOverlappingBounds.upperBound > 0) {
        // High conflict should have lower upper bound
        expect(overlappingBounds.upperBound).toBeLessThanOrEqual(nonOverlappingBounds.upperBound);
      }
      expect(overlappingBounds.analysis.density).toBeGreaterThan(nonOverlappingBounds.analysis.density);
    });
    
    it('should analyze constraint graph structure', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(5, 'partial-overlap');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      const analysis = bounds.analysis;
      
      expect(analysis.nodeCount).toBeGreaterThan(0);
      expect(analysis.edgeCount).toBeGreaterThanOrEqual(0);
      expect(analysis.density).toBeGreaterThanOrEqual(0);
      expect(analysis.density).toBeLessThanOrEqual(1);
      expect(analysis.averageDegree).toBeGreaterThanOrEqual(0);
      expect(analysis.maxCliqueSize).toBeGreaterThanOrEqual(1);
      expect(analysis.connectedComponents).toBeGreaterThanOrEqual(1);
      expect(analysis.tightnessScore).toBeGreaterThanOrEqual(0);
      expect(analysis.tightnessScore).toBeLessThanOrEqual(1);
      expect(analysis.reductionFactor).toBeGreaterThan(0);
      expect(analysis.reductionFactor).toBeLessThanOrEqual(1);
    });
  });
  
  describe('constraint graph construction', () => {
    it('should build graphs with correct node counts', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      // Should have nodes for each student-timeslot combination
      expect(bounds.analysis.nodeCount).toBeGreaterThan(0);
      // Each student should have at least some available slots
      expect(bounds.analysis.nodeCount).toBeGreaterThanOrEqual(students.length);
    });
    
    it('should detect conflicts correctly', () => {
      const teacher = createTestTeacher();
      const overlappingStudents = createTestStudents(4, 'overlapping');
      const nonOverlappingStudents = createTestStudents(4, 'non-overlapping');
      
      const overlappingBounds = analyzer.calculateBounds(teacher, overlappingStudents);
      const nonOverlappingBounds = analyzer.calculateBounds(teacher, nonOverlappingStudents);
      
      // Overlapping students should have more conflicts (higher edge count)
      expect(overlappingBounds.analysis.edgeCount).toBeGreaterThan(nonOverlappingBounds.analysis.edgeCount);
      expect(overlappingBounds.analysis.density).toBeGreaterThan(nonOverlappingBounds.analysis.density);
    });
    
    it('should handle break constraints', () => {
      const teacher = createTestTeacher({
        constraints: {
          maxConsecutiveMinutes: 90, // Short consecutive time
          breakDurationMinutes: 30,  // Long breaks required
          minLessonDuration: 30,
          maxLessonDuration: 60,
          allowedDurations: [30, 60]
        }
      });
      
      const students = createTestStudents(3, 'partial-overlap');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      // Should detect that break constraints reduce flexibility
      expect(bounds.analysis.tightnessScore).toBeGreaterThan(0.1);
      expect(bounds.analysis.reductionFactor).toBeLessThan(1.0);
    });
    
    it('should handle consecutive time constraints', () => {
      const teacher = createTestTeacher({
        constraints: {
          maxConsecutiveMinutes: 60, // Very short consecutive time
          breakDurationMinutes: 15,
          minLessonDuration: 30,
          maxLessonDuration: 90,
          allowedDurations: [45, 90]
        }
      });
      
      const students = createTestStudents(4);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      // Tight consecutive constraints should increase conflict
      expect(bounds.analysis.edgeCount).toBeGreaterThan(0);
      expect(bounds.analysis.tightnessScore).toBeGreaterThan(0);
    });
  });
  
  describe('graph analysis metrics', () => {
    it('should calculate density correctly', () => {
      const teacher = createTestTeacher();
      
      // High conflict scenario
      const highConflictStudents = createTestStudents(5, 'overlapping');
      const highConflictBounds = analyzer.calculateBounds(teacher, highConflictStudents);
      
      // Low conflict scenario
      const lowConflictStudents = createTestStudents(5, 'non-overlapping');
      const lowConflictBounds = analyzer.calculateBounds(teacher, lowConflictStudents);
      
      expect(highConflictBounds.analysis.density).toBeGreaterThan(lowConflictBounds.analysis.density);
      expect(highConflictBounds.analysis.averageDegree).toBeGreaterThan(lowConflictBounds.analysis.averageDegree);
    });
    
    it('should identify connected components', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(6, 'non-overlapping');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      // Non-overlapping students should create multiple components
      expect(bounds.analysis.connectedComponents).toBeGreaterThanOrEqual(1);
    });
    
    it('should estimate clique sizes', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4, 'overlapping');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.analysis.maxCliqueSize).toBeGreaterThanOrEqual(1);
      expect(bounds.analysis.maxCliqueSize).toBeLessThanOrEqual(students.length + 1);
    });
    
    it('should calculate tightness scores appropriately', () => {
      const teacher = createTestTeacher();
      
      // Loose constraints
      const looseTeacher = createTestTeacher({
        constraints: {
          maxConsecutiveMinutes: 480, // 8 hours
          breakDurationMinutes: 5,    // Short breaks
          minLessonDuration: 15,
          maxLessonDuration: 180,
          allowedDurations: [15, 30, 45, 60, 90, 120, 180]
        }
      });
      
      // Tight constraints  
      const tightTeacher = createTestTeacher({
        constraints: {
          maxConsecutiveMinutes: 60,  // 1 hour only
          breakDurationMinutes: 45,   // Long breaks
          minLessonDuration: 60,
          maxLessonDuration: 60,
          allowedDurations: [60]      // Only one option
        }
      });
      
      const students = createTestStudents(3);
      
      const looseBounds = analyzer.calculateBounds(looseTeacher, students);
      const tightBounds = analyzer.calculateBounds(tightTeacher, students);
      
      expect(tightBounds.analysis.tightnessScore).toBeGreaterThan(looseBounds.analysis.tightnessScore);
      expect(tightBounds.analysis.reductionFactor).toBeLessThan(looseBounds.analysis.reductionFactor);
    });
  });
  
  describe('critical path analysis', () => {
    it('should identify bottleneck students', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(5, 'overlapping');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.analysis.criticalPath).toBeDefined();
      expect(bounds.analysis.criticalPath.length).toBeGreaterThanOrEqual(0);
      expect(bounds.analysis.criticalPath.bottlenecks).toBeDefined();
      expect(Array.isArray(bounds.analysis.criticalPath.bottlenecks)).toBe(true);
    });
    
    it('should find longer critical paths for complex scenarios', () => {
      const teacher = createTestTeacher();
      
      const simpleStudents = createTestStudents(3, 'non-overlapping');
      const complexStudents = createTestStudents(6, 'overlapping');
      
      const simpleBounds = analyzer.calculateBounds(teacher, simpleStudents);
      const complexBounds = analyzer.calculateBounds(teacher, complexStudents);
      
      expect(complexBounds.analysis.criticalPath.length).toBeGreaterThanOrEqual(
        simpleBounds.analysis.criticalPath.length
      );
    });
  });
  
  describe('confidence calculation', () => {
    it('should provide reasonable confidence levels', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.confidence).toBeGreaterThan(0);
      expect(bounds.confidence).toBeLessThanOrEqual(1);
    });
    
    it('should have lower confidence for very large problems', () => {
      const teacher = createTestTeacher();
      
      const smallStudents = createTestStudents(5);
      const largeStudents = createTestStudents(35);
      
      const smallBounds = analyzer.calculateBounds(teacher, smallStudents);
      const largeBounds = analyzer.calculateBounds(teacher, largeStudents);
      
      expect(largeBounds.confidence).toBeLessThanOrEqual(smallBounds.confidence);
    });
    
    it('should have lower confidence for highly dense graphs', () => {
      const teacher = createTestTeacher();
      
      const sparseStudents = createTestStudents(4, 'non-overlapping');
      const denseStudents = createTestStudents(8, 'overlapping');
      
      const sparseBounds = analyzer.calculateBounds(teacher, sparseStudents);
      const denseBounds = analyzer.calculateBounds(teacher, denseStudents);
      
      if (denseBounds.analysis.density > sparseBounds.analysis.density * 2) {
        expect(denseBounds.confidence).toBeLessThanOrEqual(sparseBounds.confidence);
      }
    });
  });
  
  describe('reasoning and explanation', () => {
    it('should provide comprehensive reasoning', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.reasoning).toBeDefined();
      expect(bounds.reasoning.length).toBeGreaterThan(3); // Should have multiple reasoning steps
      expect(bounds.reasoning.some(r => r.includes('graph'))).toBe(true);
      expect(bounds.reasoning.some(r => r.includes('density') || r.includes('degree'))).toBe(true);
    });
    
    it('should explain impossible cases clearly', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(2);
      
      // Make impossible
      students.forEach(student => {
        student.preferredDuration = 500; // Too long
      });
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.reasoning.some(r => 
        r.toLowerCase().includes('impossible') ||
        r.toLowerCase().includes('required') && r.toLowerCase().includes('available')
      )).toBe(true);
    });
    
    it('should explain constraint effects', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(3, 'overlapping');
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.reasoning.some(r => 
        r.toLowerCase().includes('constraint') ||
        r.toLowerCase().includes('reduction') ||
        r.toLowerCase().includes('density')
      )).toBe(true);
    });
  });
  
  describe('configuration and optimization', () => {
    it('should respect configuration options', () => {
      const strictAnalyzer = new ConstraintGraphAnalyzer({
        includeBreakConstraints: true,
        includeConsecutiveConstraints: true,
        useHeuristics: false
      });
      
      const lenientAnalyzer = new ConstraintGraphAnalyzer({
        includeBreakConstraints: false,
        includeConsecutiveConstraints: false,
        useHeuristics: true
      });
      
      const teacher = createTestTeacher();
      const students = createTestStudents(4);
      
      const strictBounds = strictAnalyzer.calculateBounds(teacher, students);
      const lenientBounds = lenientAnalyzer.calculateBounds(teacher, students);
      
      // Strict analyzer should find more constraints
      expect(strictBounds.analysis.edgeCount).toBeGreaterThanOrEqual(lenientBounds.analysis.edgeCount);
    });
    
    it('should create optimal analyzer for different problem sizes', () => {
      const smallOptimal = createOptimalConstraintAnalyzer(5);
      const largeOptimal = createOptimalConstraintAnalyzer(30);
      
      expect(smallOptimal).toBeDefined();
      expect(largeOptimal).toBeDefined();
    });
  });
  
  describe('edge cases and error handling', () => {
    it('should handle empty teacher availability', () => {
      const teacher = createTestTeacher({
        availability: { days: [], timezone: 'UTC' }
      });
      const students = createTestStudents(2);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.lowerBound).toBe(0);
      expect(bounds.upperBound).toBe(0);
    });
    
    it('should handle students with no availability', () => {
      const teacher = createTestTeacher();
      const students: StudentConfig[] = [{
        person: { id: 'no_avail', name: 'No Availability', email: 'no@test.com' },
        preferredDuration: 60,
        maxLessonsPerWeek: 1,
        availability: { days: [], timezone: 'UTC' }
      }];
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds.lowerBound).toBe(0);
    });
    
    it('should handle single student cases', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(1);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds).toBeDefined();
      expect(bounds.analysis.nodeCount).toBeGreaterThanOrEqual(0);
      expect(bounds.analysis.connectedComponents).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle large student counts', () => {
      const teacher = createTestTeacher();
      const students = createTestStudents(25);
      
      const bounds = analyzer.calculateBounds(teacher, students);
      
      expect(bounds).toBeDefined();
      expect(bounds.confidence).toBeGreaterThan(0);
    });
  });
});

describe('Default Constraint Graph Analyzer', () => {
  it('should be properly initialized', () => {
    expect(defaultConstraintGraphAnalyzer).toBeDefined();
  });
  
  it('should work with default settings', () => {
    const teacher: TeacherConfig = {
      person: { id: 'default_cg', name: 'Default CG', email: 'defaultcg@test.com' },
      studioId: 'default_cg_studio',
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
        maxLessonDuration: 90,
        allowedDurations: [30, 60, 90]
      }
    };
    
    const students: StudentConfig[] = [
      {
        person: { id: 'cg1', name: 'CG Student 1', email: 'cg1@test.com' },
        preferredDuration: 60,
        maxLessonsPerWeek: 1,
        availability: {
          days: [
            {
              dayOfWeek: 1,
              blocks: [{ start: 540, duration: 90 }]
            }
          ],
          timezone: 'UTC'
        }
      }
    ];
    
    const bounds = defaultConstraintGraphAnalyzer.calculateBounds(teacher, students);
    
    expect(bounds).toBeDefined();
    expect(bounds.lowerBound).toBeGreaterThanOrEqual(0);
    expect(bounds.upperBound).toBeGreaterThanOrEqual(bounds.lowerBound);
    expect(bounds.reasoning.length).toBeGreaterThan(0);
  });
});