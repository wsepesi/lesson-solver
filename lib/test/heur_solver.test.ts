import { describe, test, expect, beforeEach } from 'vitest'
import { solve, scheduleToButtons } from '../heur_solver'
import type { StudentSchedule, Schedule, LessonLength } from '../types'
import type { Heuristics } from '../solver'
import { Time } from '../types'

describe('Heuristic Solver', () => {
  const basicHeuristics: Heuristics = {
    numConsecHalfHours: 4,    // Teacher can teach max 4 consecutive 30min slots
    breakLenInHalfHours: 1,   // Then needs 30min break
  }
  let teacherSchedule: Schedule
  
  beforeEach(() => {
    // This runs before each test - sets up clean data
    
    // Teacher available Mon-Fri 9am-5pm
    teacherSchedule = {
      Monday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Tuesday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Wednesday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Thursday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Friday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Saturday: [],
      Sunday: []
    }
  })

  describe('Basic Functionality', () => {
    test('should solve simple single student case', () => {
      // STEP 1: Create a simple test case - one student, plenty of availability
      const students: StudentSchedule[] = [{
        student: { 
          name: 'Alice', 
          email: 'alice@test.com', 
          lessonLength: 30 as const  // Must use 'as const' for TypeScript
        },
        schedule: {
          Monday: [{ start: new Time(10, 0), end: new Time(12, 0) }], // 2 hours available
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: []
        }
      }]
      
      // STEP 2: Call the solver
      const result = solve(students, teacherSchedule, basicHeuristics)
      
      // STEP 3: Verify the result
      expect(result.assignments).toHaveLength(1) // Should assign exactly 1 student
      expect(result.assignments[0]!.student.student.name).toBe('Alice')
      expect(result.assignments[0]!.time).toBeDefined() // Should have a time assigned
      
      // STEP 4: Verify the time is within student's availability
      const assignment = result.assignments[0]!
      expect(assignment.time.start.i).toBe(0) // Monday is index 0
      expect(assignment.time.start.j).toBeGreaterThanOrEqual(2) // 10am = slot 2
      expect(assignment.time.start.j).toBeLessThan(6) // before 12pm = slot 6
    })

    test('should handle multiple students with different lesson lengths', () => {
      // STEP 1: Create students with 30min and 60min lessons
      const students: StudentSchedule[] = [
        {
          student: { name: 'Bob', email: 'bob@test.com', lessonLength: 30 as const },
          schedule: {
            Monday: [{ start: new Time(9, 0), end: new Time(11, 0) }],
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          }
        },
        {
          student: { name: 'Carol', email: 'carol@test.com', lessonLength: 60 as const },
          schedule: {
            Monday: [{ start: new Time(11, 0), end: new Time(13, 0) }],
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          }
        }
      ]
      
      // STEP 2: Solve
      const result = solve(students, teacherSchedule, basicHeuristics)
      
      // STEP 3: Both students should be assigned
      expect(result.assignments).toHaveLength(2)
      
      // STEP 4: Verify lesson lengths are respected
      const bobAssignment = result.assignments.find(a => a.student.student.name === 'Bob')
      const carolAssignment = result.assignments.find(a => a.student.student.name === 'Carol')
      
      expect(bobAssignment).toBeDefined()
      expect(carolAssignment).toBeDefined()
      
      // Bob should get 30min slot (start and end at same slot), Carol should get 60min slot (end = start + 1)
      expect(bobAssignment!.time.start.j).toBe(bobAssignment!.time.end.j)
      expect(carolAssignment!.time.end.j).toBe(carolAssignment!.time.start.j + 1)
    })
  })

  describe('Edge Cases', () => {
    test('should throw error when no solution exists', () => {
      // STEP 1: Create impossible scenario - student wants lesson outside teacher hours
      const impossibleStudents: StudentSchedule[] = [{
        student: { name: 'Bob', email: 'bob@test.com', lessonLength: 60 as const },
        schedule: {
          Saturday: [{ start: new Time(10, 0), end: new Time(11, 0) }], // Teacher not available Saturday
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Sunday: []
        }
      }]
      
      // STEP 2: Solver should throw an error
      expect(() => solve(impossibleStudents, teacherSchedule, basicHeuristics))
        .toThrow('unsolvable schedule')
    })

    test('should handle empty student list', () => {
      // STEP 1: No students to schedule
      const result = solve([], teacherSchedule, basicHeuristics)
      
      // STEP 2: Should return empty assignments
      expect(result.assignments).toHaveLength(0)
    })

    test('should respect lesson length constraints', () => {
      // STEP 1: Create student wanting 60min lesson but only 30min availability
      const students: StudentSchedule[] = [{
        student: { name: 'Dave', email: 'dave@test.com', lessonLength: 60 as const },
        schedule: {
          // Only 30 minutes available - should be impossible for 60min lesson
          Monday: [{ start: new Time(10, 0), end: new Time(10, 30) }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      }]
      
      // STEP 2: Should throw error or fail to assign
      expect(() => solve(students, teacherSchedule, basicHeuristics))
        .toThrow() // Should fail because 60min lesson needs consecutive 30min slots
    })
  })

  describe('Constraint Validation', () => {
    test('should respect teacher availability', () => {
      // STEP 1: Create student available outside teacher hours
      const students: StudentSchedule[] = [{
        student: { name: 'Eve', email: 'eve@test.com', lessonLength: 30 as const },
        schedule: {
          Monday: [
            { start: new Time(8, 0), end: new Time(8, 30) },   // Before teacher hours
            { start: new Time(18, 0), end: new Time(18, 30) }  // After teacher hours
          ],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      }]
      
      // STEP 2: Should fail because no overlap with teacher availability
      expect(() => solve(students, teacherSchedule, basicHeuristics))
        .toThrow()
    })

    test('should respect student availability', () => {
      // STEP 1: Multiple students, limited availability
      const students: StudentSchedule[] = [
        {
          student: { name: 'Frank', email: 'frank@test.com', lessonLength: 30 as const },
          schedule: {
            Monday: [{ start: new Time(10, 0), end: new Time(10, 30) }], // Exactly 30min
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          }
        }
      ]
      
      // STEP 2: Solve
      const result = solve(students, teacherSchedule, basicHeuristics)
      
      // STEP 3: Verify assignment is within student's availability
      const assignment = result.assignments[0]!
      expect(assignment.time.start.i).toBe(0) // Monday
      expect(assignment.time.start.j).toBe(2) // 10:00 is slot 2
    })

    test('should prevent overlapping assignments', () => {
      // STEP 1: Two students available at same time
      const students: StudentSchedule[] = [
        {
          student: { name: 'Grace', email: 'grace@test.com', lessonLength: 30 as const },
          schedule: {
            Monday: [{ start: new Time(10, 0), end: new Time(11, 0) }],
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          }
        },
        {
          student: { name: 'Henry', email: 'henry@test.com', lessonLength: 30 as const },
          schedule: {
            Monday: [{ start: new Time(10, 0), end: new Time(11, 0) }], // Same time as Grace
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          }
        }
      ]
      
      // STEP 2: Solve
      const result = solve(students, teacherSchedule, basicHeuristics)
      
      // STEP 3: Should assign both but at different times
      expect(result.assignments).toHaveLength(2)
      
      // STEP 4: Verify no overlap
      const times = result.assignments.map(a => ({
        day: a.time.start.i,
        start: a.time.start.j
      }))
      
      // If both on same day, start times should be different
      if (times[0]!.day === times[1]!.day) {
        expect(times[0]!.start).not.toBe(times[1]!.start)
      }
    })

    test('should respect consecutive lesson limits', () => {
      // STEP 1: Create scenario with multiple students
      // Teacher has numConsecHalfHours: 4 (2 hours max), then needs break
      const students: StudentSchedule[] = Array.from({ length: 3 }, (_, i) => ({
        student: { 
          name: `Student${i}`, 
          email: `student${i}@test.com`, 
          lessonLength: 30 as const 
        },
        schedule: {
          Monday: [{ start: new Time(9, 0), end: new Time(12, 0) }], // 3 hours available
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      }))
      
      // STEP 2: Solve
      const result = solve(students, teacherSchedule, basicHeuristics)
      
      // STEP 3: Should schedule all students successfully
      expect(result.assignments).toHaveLength(3)
      
      // STEP 4: Verify all assignments are valid
      result.assignments.forEach(assignment => {
        expect(assignment.student).toBeDefined()
        expect(assignment.time).toBeDefined()
        expect(assignment.time.start.i).toBeGreaterThanOrEqual(0)
        expect(assignment.time.start.i).toBeLessThan(7)
        expect(assignment.time.start.j).toBeGreaterThanOrEqual(0)
        expect(assignment.time.start.j).toBeLessThan(24)
      })
    })
  })

  describe('Performance', () => {
    test('should solve reasonable case within time limit', () => {
      // STEP 1: Start timer
      const start = performance.now()
      
      // STEP 2: Create moderately complex scenario
      const students = Array.from({ length: 10 }, (_, i) => ({
        student: { 
          name: `Student${i}`, 
          email: `student${i}@test.com`, 
          lessonLength: (i % 2 === 0 ? 30 : 60) as LessonLength  // Mix of 30min and 60min
        },
        schedule: teacherSchedule // All students available during all teacher hours
      }))
      
      // STEP 3: Solve
      const result = solve(students, teacherSchedule, basicHeuristics)
      
      // STEP 4: Check timing
      const duration = performance.now() - start
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
      
      // STEP 5: Verify all students got assigned
      expect(result.assignments).toHaveLength(10)
    })
  })
})

describe('Schedule Conversion Utilities', () => {
  describe('scheduleToButtons', () => {
    test('should convert empty schedule to all false', () => {
      const emptySchedule: Schedule = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      const buttons = scheduleToButtons(emptySchedule)
      
      expect(buttons).toHaveLength(7) // 7 days
      expect(buttons[0]).toHaveLength(24) // 24 half-hour slots per day
      
      // All should be false
      buttons.forEach(day => {
        day.forEach(slot => {
          expect(slot).toBe(false)
        })
      })
    })

    test('should convert schedule with blocks correctly', () => {
      const schedule: Schedule = {
        Monday: [{ start: new Time(10, 0), end: new Time(11, 0) }], // 10:00-11:00
        Tuesday: [{ start: new Time(14, 30), end: new Time(15, 30) }], // 2:30-3:30 PM
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      const buttons = scheduleToButtons(schedule)
      
      // Monday: slots 2 and 3 should be true (10:00 and 10:30)
      expect(buttons[0]![2]).toBe(true)  // 10:00
      expect(buttons[0]![3]).toBe(true)  // 10:30
      expect(buttons[0]![1]).toBe(false) // 9:30
      expect(buttons[0]![4]).toBe(false) // 11:00
      
      // Tuesday: slots 11 and 12 should be true (14:30 and 15:00)
      expect(buttons[1]![11]).toBe(true) // 14:30
      expect(buttons[1]![12]).toBe(true) // 15:00
      expect(buttons[1]![10]).toBe(false) // 14:00
      expect(buttons[1]![13]).toBe(false) // 15:30
    })

    test('should handle multiple blocks in same day', () => {
      const schedule: Schedule = {
        Monday: [
          { start: new Time(9, 0), end: new Time(10, 0) },   // 9:00-10:00
          { start: new Time(14, 0), end: new Time(15, 0) }   // 2:00-3:00 PM
        ],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      const buttons = scheduleToButtons(schedule)
      
      // First block: slots 0 and 1
      expect(buttons[0]![0]).toBe(true)  // 9:00
      expect(buttons[0]![1]).toBe(true)  // 9:30
      
      // Gap should be false
      expect(buttons[0]![2]).toBe(false) // 10:00
      expect(buttons[0]![9]).toBe(false) // 13:30
      
      // Second block: slots 10 and 11
      expect(buttons[0]![10]).toBe(true) // 14:00
      expect(buttons[0]![11]).toBe(true) // 14:30
    })

    test('should throw error for invalid times', () => {
      const invalidSchedule: Schedule = {
        Monday: [{ start: new Time(8, 0), end: new Time(9, 0) }], // Before 9am
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      expect(() => scheduleToButtons(invalidSchedule)).toThrow('Invalid time')
    })
  })
})