import { describe, test, expect } from 'vitest'
import { solve } from '../../../lib/heur_solver'
import type { StudentSchedule, Schedule, Heuristics } from '../../../lib/types'
import { scheduleToButtons } from '../../../lib/heur_solver'

/**
 * Break Requirements Edge Case Testing
 * 
 * These tests ensure the solver correctly enforces teacher break requirements
 * in various edge cases and complex scenarios.
 */

// Helper functions
const generateStudent = (
  name: string,
  email: string,
  lessonLength: 30 | 60,
  schedule: Schedule
): StudentSchedule => ({
  student: { name, email, lessonLength },
  schedule,
  bsched: scheduleToButtons(schedule) as boolean[][]
})

const createTeacherGrid = (schedule: Schedule): boolean[][] => {
  return scheduleToButtons(schedule) as boolean[][]
}

describe('Break Requirements Edge Cases', () => {
  
  test('enforces minimum break between lesson groups', async () => {
    const students: StudentSchedule[] = []
    
    // Create 8 students all available Monday 9am-5pm
    for (let i = 0; i < 8; i++) {
      students.push(generateStudent(
        `Student${i + 1}`,
        `student${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // Require 1-hour break after 2 hours of teaching
    const strictBreakHeuristics: Heuristics = {
      numConsecHalfHours: 4, // 2 hours max consecutive
      breakLenInHalfHours: 2  // 1 hour break required
    }
    
    const result = await solve(students, teacherSchedule, strictBreakHeuristics)
    
    expect(result).not.toBeNull()
    
    // Verify break requirements are enforced
    const assignments = result!.assignments.sort((a, b) => a.time.start.j - b.time.start.j)
    
    let consecutiveCount = 0
    let lastEndSlot = -1
    
    for (const assignment of assignments) {
      const startSlot = assignment.time.start.j
      const endSlot = assignment.time.end.j
      
      if (lastEndSlot === -1) {
        // First lesson
        consecutiveCount = endSlot - startSlot
      } else if (startSlot === lastEndSlot) {
        // Consecutive lesson
        consecutiveCount += endSlot - startSlot
        
        // Should not exceed max consecutive
        expect(consecutiveCount).toBeLessThanOrEqual(4)
      } else {
        // Gap between lessons
        const gap = startSlot - lastEndSlot
        
        if (consecutiveCount >= 4) {
          // If we hit the max, gap should be at least break length
          expect(gap).toBeGreaterThanOrEqual(2)
        }
        
        consecutiveCount = endSlot - startSlot
      }
      
      lastEndSlot = endSlot
    }
    
    // Should fit fewer students due to break requirements
    // 8 hours = 16 slots, with breaks should fit less than 8 students
    expect(result!.assignments.length).toBeLessThan(8)
  })

  test('handles impossible break requirements gracefully', async () => {
    const students: StudentSchedule[] = []
    
    // 10 students wanting short window
    for (let i = 0; i < 10; i++) {
      students.push(generateStudent(
        `Student${i + 1}`,
        `student${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }], // Only 2 hours available
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // Impossible: require 2-hour break after 1 hour teaching, but only 2 hours total
    const impossibleHeuristics: Heuristics = {
      numConsecHalfHours: 2, // 1 hour max consecutive
      breakLenInHalfHours: 4  // 2 hour break required (impossible in 2-hour window)
    }
    
    const result = await solve(students, teacherSchedule, impossibleHeuristics)
    
    if (result) {
      // If any solution is found, it should respect the constraints
      expect(result.assignments.length).toBeLessThanOrEqual(1) // At most 1 lesson possible
    } else {
      // It's acceptable to return null for impossible constraints
      expect(result).toBeNull()
    }
  })

  test('optimizes break placement for natural times', async () => {
    const students: StudentSchedule[] = []
    
    // Create students available all day
    for (let i = 0; i < 12; i++) {
      students.push(generateStudent(
        `AllDay${i + 1}`,
        `allday${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // Reasonable break requirements
    const naturalBreakHeuristics: Heuristics = {
      numConsecHalfHours: 6, // 3 hours max consecutive
      breakLenInHalfHours: 2  // 1 hour break
    }
    
    const result = await solve(students, teacherSchedule, naturalBreakHeuristics)
    
    expect(result).not.toBeNull()
    
    // Check if breaks occur at natural times (e.g., around lunch)
    const assignments = result!.assignments.sort((a, b) => a.time.start.j - b.time.start.j)
    
    let foundLunchBreak = false
    for (let i = 0; i < assignments.length - 1; i++) {
      const current = assignments[i]
      const next = assignments[i + 1]
      
      const currentEndHour = 9 + Math.floor(current.time.end.j / 2)
      const nextStartHour = 9 + Math.floor(next.time.start.j / 2)
      
      // Check if there's a break around lunch time (12-1pm)
      if (currentEndHour <= 12 && nextStartHour >= 13) {
        foundLunchBreak = true
        break
      }
    }
    
    // Natural scheduling should create a lunch break when possible
    expect(foundLunchBreak).toBe(true)
  })

  test('handles different break requirements per day', async () => {
    const students: StudentSchedule[] = []
    
    // Students available Monday and Tuesday
    for (let i = 0; i < 8; i++) {
      students.push(generateStudent(
        `TwoDay${i + 1}`,
        `twoday${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    const heuristics: Heuristics = {
      numConsecHalfHours: 4, // 2 hours max consecutive
      breakLenInHalfHours: 1  // 30 min break
    }
    
    const result = await solve(students, teacherSchedule, heuristics)
    
    expect(result).not.toBeNull()
    
    // Verify breaks are enforced consistently across days
    const mondayAssignments = result!.assignments.filter(a => a.time.start.i === 0)
    const tuesdayAssignments = result!.assignments.filter(a => a.time.start.i === 1)
    
    // Both days should have some assignments
    expect(mondayAssignments.length).toBeGreaterThan(0)
    expect(tuesdayAssignments.length).toBeGreaterThan(0)
    
    // Each day should respect break requirements independently
    for (const dayAssignments of [mondayAssignments, tuesdayAssignments]) {
      const sorted = dayAssignments.sort((a, b) => a.time.start.j - b.time.start.j)
      
      let consecutiveCount = 0
      let lastEndSlot = -1
      
      for (const assignment of sorted) {
        const startSlot = assignment.time.start.j
        const endSlot = assignment.time.end.j
        
        if (lastEndSlot === -1 || startSlot === lastEndSlot) {
          consecutiveCount += endSlot - startSlot
          expect(consecutiveCount).toBeLessThanOrEqual(4)
        } else {
          const gap = startSlot - lastEndSlot
          if (consecutiveCount >= 4) {
            expect(gap).toBeGreaterThanOrEqual(1)
          }
          consecutiveCount = endSlot - startSlot
        }
        
        lastEndSlot = endSlot
      }
    }
  })

  test('60-minute lessons with break requirements', async () => {
    const students: StudentSchedule[] = []
    
    // 6 students wanting 60-minute lessons
    for (let i = 0; i < 6; i++) {
      students.push(generateStudent(
        `LongLesson${i + 1}`,
        `long${i + 1}@test.com`,
        60,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // 2 hours consecutive max, 1 hour break
    const heuristics: Heuristics = {
      numConsecHalfHours: 4, // 2 hours max (2 x 60-min lessons)
      breakLenInHalfHours: 2  // 1 hour break
    }
    
    const result = await solve(students, teacherSchedule, heuristics)
    
    expect(result).not.toBeNull()
    
    // Verify 60-minute lesson constraints
    result!.assignments.forEach(assignment => {
      const duration = assignment.time.end.j - assignment.time.start.j
      expect(duration).toBe(2) // 60 minutes = 2 slots
    })
    
    // With break requirements, should fit fewer than 6 lessons
    // 8 hours = 4 lessons max without breaks, fewer with breaks
    expect(result!.assignments.length).toBeLessThan(6)
  })

  test('mixed lesson lengths with complex break patterns', async () => {
    const students: StudentSchedule[] = []
    
    // Mix of 30 and 60 minute lessons
    for (let i = 0; i < 4; i++) {
      students.push(generateStudent(
        `Short${i + 1}`,
        `short${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    for (let i = 0; i < 4; i++) {
      students.push(generateStudent(
        `Long${i + 1}`,
        `long${i + 1}@test.com`,
        60,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    const heuristics: Heuristics = {
      numConsecHalfHours: 3, // 1.5 hours max consecutive
      breakLenInHalfHours: 1  // 30 min break
    }
    
    const result = await solve(students, teacherSchedule, heuristics)
    
    expect(result).not.toBeNull()
    
    // Verify mixed lengths work with break requirements
    const shortLessons = result!.assignments.filter(a => 
      a.student.student.lessonLength === 30
    )
    const longLessons = result!.assignments.filter(a => 
      a.student.student.lessonLength === 60
    )
    
    expect(shortLessons.length).toBeGreaterThan(0)
    expect(longLessons.length).toBeGreaterThan(0)
    
    // Verify break requirements with mixed lengths
    const assignments = result!.assignments.sort((a, b) => a.time.start.j - b.time.start.j)
    
    let consecutiveSlots = 0
    let lastEndSlot = -1
    
    for (const assignment of assignments) {
      const startSlot = assignment.time.start.j
      const endSlot = assignment.time.end.j
      const duration = endSlot - startSlot
      
      if (lastEndSlot === -1 || startSlot === lastEndSlot) {
        consecutiveSlots += duration
        expect(consecutiveSlots).toBeLessThanOrEqual(3) // Max 1.5 hours
      } else {
        const gap = startSlot - lastEndSlot
        if (consecutiveSlots >= 3) {
          expect(gap).toBeGreaterThanOrEqual(1) // 30 min break required
        }
        consecutiveSlots = duration
      }
      
      lastEndSlot = endSlot
    }
  })

  test('break requirements with minimal teacher availability', async () => {
    const students: StudentSchedule[] = []
    
    // 4 students, teacher only available 3 hours with break requirements
    for (let i = 0; i < 4; i++) {
      students.push(generateStudent(
        `Limited${i + 1}`,
        `limited${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 17, minute: 0 } }], // 3 hours only
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    const heuristics: Heuristics = {
      numConsecHalfHours: 2, // 1 hour max consecutive
      breakLenInHalfHours: 1  // 30 min break
    }
    
    const result = await solve(students, teacherSchedule, heuristics)
    
    if (result) {
      // With these constraints, can fit at most 2 lessons
      // (1 hour + 30 min break + 1 hour = 2.5 hours minimum)
      expect(result.assignments.length).toBeLessThanOrEqual(2)
      
      // Verify the break requirement is met
      if (result.assignments.length === 2) {
        const sorted = result.assignments.sort((a, b) => a.time.start.j - b.time.start.j)
        const gap = sorted[1].time.start.j - sorted[0].time.end.j
        expect(gap).toBeGreaterThanOrEqual(1) // 30 min break
      }
    }
  })

  test('no break requirements allows maximum packing', async () => {
    const students: StudentSchedule[] = []
    
    // 16 students for 8-hour day (should all fit without breaks)
    for (let i = 0; i < 16; i++) {
      students.push(generateStudent(
        `NoBrk${i + 1}`,
        `nobrk${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherSchedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    const noBreakHeuristics: Heuristics = {
      numConsecHalfHours: 16, // No limit on consecutive
      breakLenInHalfHours: 0   // No break required
    }
    
    const result = await solve(students, teacherSchedule, noBreakHeuristics)
    
    expect(result).not.toBeNull()
    expect(result!.assignments.length).toBe(16) // All should fit
    
    // Verify they're scheduled consecutively
    const assignments = result!.assignments.sort((a, b) => a.time.start.j - b.time.start.j)
    
    for (let i = 0; i < assignments.length - 1; i++) {
      const current = assignments[i]
      const next = assignments[i + 1]
      
      expect(next.time.start.j).toBe(current.time.end.j) // No gaps
    }
  })
})