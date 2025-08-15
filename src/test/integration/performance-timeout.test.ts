import { describe, test, expect, vi, beforeEach } from 'vitest'
import { solve } from '../../../lib/heur_solver'
import type { StudentSchedule, Schedule } from '../../../lib/types'
import type { Heuristics } from '../../../lib/solver'
import { scheduleToButtons } from '../../../lib/heur_solver'

/**
 * Performance and Timeout Testing
 * 
 * These tests ensure the solver behaves correctly under stress conditions,
 * times out appropriately on impossible problems, and maintains bounded
 * memory usage.
 */

// Helper to generate student data
const generateStudent = (
  name: string,
  email: string,
  lessonLength: 30 | 60,
  schedule: Schedule
): StudentSchedule => ({
  student: { name, email, lessonLength },
  schedule,
  bsched: scheduleToButtons(schedule)
})

// Helper to create teacher grid
const createTeacherGrid = (schedule: Schedule): boolean[][] => {
  return scheduleToButtons(schedule)
}

describe('Performance and Timeout Tests', () => {
  const strictHeuristics: Heuristics = {
    numConsecHalfHours: 4, // 2 hours max consecutive
    breakLenInHalfHours: 2  // 1 hour break required
  }

  beforeEach(() => {
    vi.clearAllTimers()
  })

  test('times out on impossible scheduling problem', () => {
    // Create impossible scenario: 50 students all want same single time slot
    const students: StudentSchedule[] = []
    const impossibleSchedule: Schedule = {
      Monday: [{ start: { hour: 15, minute: 0 }, end: { hour: 15, minute: 30 } }], // Only 30-min slot
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    for (let i = 0; i < 50; i++) {
      students.push(generateStudent(
        `Student${i + 1}`,
        `student${i + 1}@test.com`,
        30,
        impossibleSchedule
      ))
    }
    
    const teacherGrid = createTeacherGrid(impossibleSchedule)
    
    const startTime = Date.now()
    const result = solve(students, teacherGrid, strictHeuristics)
    const duration = Date.now() - startTime
    
    // Should fail within reasonable time (not run forever)
    expect(duration).toBeLessThan(30000) // 30 seconds max
    expect(result).toBeNull() // Should return null for impossible problems
  }, 45000)

  test('handles pathological backtracking case efficiently', () => {
    // Create scenario that forces maximum backtracking
    const students: StudentSchedule[] = []
    
    // Create students with overlapping but incompatible constraints
    for (let i = 0; i < 20; i++) {
      const schedule: Schedule = {
        Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } }],
        Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } }],
        Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } }],
        Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
      
      students.push(generateStudent(
        `Overlap${i + 1}`,
        `overlap${i + 1}@test.com`,
        60, // 60-minute lessons in 60-minute window
        schedule
      ))
    }
    
    const teacherGrid = createTeacherGrid({
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } }],
      Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } }],
      Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } }],
      Thursday: [], Friday: [], Saturday: [], Sunday: []
    })
    
    const startTime = Date.now()
    const result = solve(students, teacherGrid, strictHeuristics)
    const duration = Date.now() - startTime
    
    // Should complete quickly even with backtracking
    expect(duration).toBeLessThan(10000) // 10 seconds max
    
    if (result) {
      // Can only fit 3 students (one per day)
      expect(result.assignments.length).toBeLessThanOrEqual(3)
    }
  }, 15000)

  test('memory usage stays bounded during large problem solving', () => {
    // Monitor memory usage during solving
    const initialMemory = process.memoryUsage()
    
    const students: StudentSchedule[] = []
    const flexibleSchedule: Schedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Thursday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Friday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Saturday: [],
      Sunday: []
    }
    
    // Generate 30 students
    for (let i = 0; i < 30; i++) {
      students.push(generateStudent(
        `MemTest${i + 1}`,
        `memtest${i + 1}@test.com`,
        30,
        flexibleSchedule
      ))
    }
    
    const teacherGrid = createTeacherGrid(flexibleSchedule)
    
    const result = solve(students, teacherGrid, strictHeuristics)
    
    const finalMemory = process.memoryUsage()
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
    
    expect(result).not.toBeNull()
    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
  }, 30000)

  test('solver performance scales predictably', () => {
    const performanceResults: Array<{ studentCount: number; time: number; success: boolean }> = []
    
    const baseCounts = [5, 10, 15, 20, 25, 30]
    
    for (const count of baseCounts) {
      const students: StudentSchedule[] = []
      
      // Create students with moderate overlap to ensure solvability
      for (let i = 0; i < count; i++) {
        const dayIndex = i % 5 // Distribute across weekdays
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
        const targetDay = days[dayIndex]
        
        const schedule: Schedule = {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [],
          [targetDay]: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }]
        }
        
        // Add secondary availability for some flexibility
        if (i % 3 === 0) {
          const secondDay = days[(dayIndex + 1) % 5]
          schedule[secondDay] = [{ start: { hour: 10, minute: 0 }, end: { hour: 16, minute: 0 } }]
        }
        
        students.push(generateStudent(
          `Perf${i + 1}`,
          `perf${i + 1}@test.com`,
          30,
          schedule
        ))
      }
      
      const teacherGrid = createTeacherGrid({
        Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Thursday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Friday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Saturday: [],
        Sunday: []
      })
      
      const startTime = Date.now()
      const result = solve(students, teacherGrid, strictHeuristics)
      const duration = Date.now() - startTime
      
      performanceResults.push({
        studentCount: count,
        time: duration,
        success: result !== null
      })
      
      // Each individual test should complete quickly
      expect(duration).toBeLessThan(20000) // 20 seconds max per test
    }
    
    // Analyze performance scaling
    const successfulRuns = performanceResults.filter(r => r.success)
    expect(successfulRuns.length).toBeGreaterThan(3) // Most should succeed
    
    // Performance should not grow exponentially
    const timeForFive = successfulRuns.find(r => r.studentCount === 5)?.time ?? 0
    const timeForThirty = successfulRuns.find(r => r.studentCount === 30)?.time ?? 0
    
    if (timeForFive > 0 && timeForThirty > 0) {
      const scalingFactor = timeForThirty / timeForFive
      expect(scalingFactor).toBeLessThan(50) // Should not be more than 50x slower
    }
  }, 180000) // 3 minute total timeout

  test('handles rapid successive solve calls', async () => {
    // Test that solver can handle multiple calls without interference
    const students: StudentSchedule[] = []
    const simpleSchedule: Schedule = {
      Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 16, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    for (let i = 0; i < 5; i++) {
      students.push(generateStudent(
        `Rapid${i + 1}`,
        `rapid${i + 1}@test.com`,
        30,
        simpleSchedule
      ))
    }
    
    const teacherGrid = createTeacherGrid(simpleSchedule)
    
    // Launch multiple solve operations concurrently
    const promises = Array.from({ length: 5 }, (_, index) => {
      const studentsSubset = students.slice(0, index + 1)
      return Promise.resolve(solve(studentsSubset, teacherGrid, strictHeuristics))
    })
    
    const results = await Promise.all(promises)
    
    // All should complete successfully
    results.forEach((result, index) => {
      expect(result).not.toBeNull()
      if (result) {
        expect(result.assignments.length).toBe(index + 1)
      }
    })
  }, 30000)

  test('solver handles edge case with single time slot correctly', () => {
    const students: StudentSchedule[] = []
    const singleSlotSchedule: Schedule = {
      Monday: [{ start: { hour: 15, minute: 0 }, end: { hour: 15, minute: 30 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // Only 2 students for 1 slot - should pick one
    for (let i = 0; i < 2; i++) {
      students.push(generateStudent(
        `Single${i + 1}`,
        `single${i + 1}@test.com`,
        30,
        singleSlotSchedule
      ))
    }
    
    const teacherGrid = createTeacherGrid(singleSlotSchedule)
    
    const startTime = Date.now()
    const result = solve(students, teacherGrid, strictHeuristics)
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(1000) // Should be very fast
    expect(result).not.toBeNull()
    if (result) {
      expect(result.assignments.length).toBe(1) // Only one can fit
    }
  })

  test('solver handles empty input gracefully', () => {
    const emptyStudents: StudentSchedule[] = []
    const teacherGrid = createTeacherGrid({
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    })
    
    const result = solve(emptyStudents, teacherGrid, strictHeuristics)
    
    expect(result).not.toBeNull()
    if (result) {
      expect(result.assignments).toHaveLength(0)
    }
  })

  test('solver handles teacher with no availability', () => {
    const students: StudentSchedule[] = [
      generateStudent(
        'Student1',
        'student1@test.com',
        30,
        {
          Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      )
    ]
    
    const emptyTeacherGrid: boolean[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    
    const result = solve(students, emptyTeacherGrid, strictHeuristics)
    
    expect(result).toBeNull() // Should return null when teacher has no availability
  })

  test('break requirements affect performance predictably', () => {
    const students: StudentSchedule[] = []
    
    // Create 15 students all wanting consecutive slots
    for (let i = 0; i < 15; i++) {
      students.push(generateStudent(
        `Break${i + 1}`,
        `break${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherGrid = createTeacherGrid({
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    })
    
    // Test with different break requirements
    const noBreakHeuristics: Heuristics = { numConsecHalfHours: 18, breakLenInHalfHours: 0 }
    const strictBreakHeuristics: Heuristics = { numConsecHalfHours: 2, breakLenInHalfHours: 2 }
    
    const noBreakStart = Date.now()
    const noBreakResult = solve(students, teacherGrid, noBreakHeuristics)
    const noBreakTime = Date.now() - noBreakStart
    
    const strictBreakStart = Date.now()
    const strictBreakResult = solve(students, teacherGrid, strictBreakHeuristics)
    const strictBreakTime = Date.now() - strictBreakStart
    
    // Both should complete in reasonable time
    expect(noBreakTime).toBeLessThan(10000)
    expect(strictBreakTime).toBeLessThan(10000)
    
    // No break should allow more students to be scheduled
    expect(noBreakResult?.assignments.length ?? 0).toBeGreaterThanOrEqual(
      strictBreakResult?.assignments.length ?? 0
    )
  }, 30000)
})