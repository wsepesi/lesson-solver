import { describe, test, expect, beforeEach } from 'vitest'
import { solve } from '../../../lib/heur_solver'
import type { StudentSchedule, Schedule, Heuristics } from '../../../lib/types'
import { scheduleToButtons } from '../../../lib/heur_solver'

/**
 * Complex Scheduling Scenarios
 * 
 * These tests validate the solver's ability to handle realistic scenarios
 * with up to 30 students, complex availability patterns, and edge cases
 * that might have only one valid solution.
 */

// Helper function to generate student data
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

// Helper function to create teacher availability grid
const createTeacherGrid = (schedule: Schedule): boolean[][] => {
  return scheduleToButtons(schedule) as boolean[][]
}

// Realistic teacher schedule - Monday through Friday, 9am-6pm with lunch break
const realisticTeacherSchedule: Schedule = {
  Monday: [
    { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
    { start: { hour: 13, minute: 0 }, end: { hour: 18, minute: 0 } }
  ],
  Tuesday: [
    { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
    { start: { hour: 13, minute: 0 }, end: { hour: 18, minute: 0 } }
  ],
  Wednesday: [
    { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
    { start: { hour: 13, minute: 0 }, end: { hour: 18, minute: 0 } }
  ],
  Thursday: [
    { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
    { start: { hour: 13, minute: 0 }, end: { hour: 18, minute: 0 } }
  ],
  Friday: [
    { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
    { start: { hour: 13, minute: 0 }, end: { hour: 18, minute: 0 } }
  ],
  Saturday: [],
  Sunday: []
}

describe('Complex Scheduling Scenarios - Scale Testing', () => {
  const defaultHeuristics: Heuristics = {
    numConsecHalfHours: 6, // 3 hours max consecutive
    breakLenInHalfHours: 1 // 30 min break
  }

  beforeEach(() => {
    // Each test should complete within reasonable time
  })

  test('handles 30 students with varied availability - realistic scenario', async () => {
    // Generate 30 students with realistic but varied availability
    const students: StudentSchedule[] = []
    
    for (let i = 0; i < 30; i++) {
      const dayPreferences = Math.floor(i % 5) // Cycle through weekdays
      const timePreference = i % 3 // Morning (0), afternoon (1), or flexible (2)
      const lessonLength = i % 4 === 0 ? 60 : 30 // 25% want 60-min lessons
      
      let schedule: Schedule = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
      const targetDay = days[dayPreferences]
      
      if (timePreference === 0) {
        // Morning preference
        schedule[targetDay] = [{ start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } }]
      } else if (timePreference === 1) {
        // Afternoon preference
        schedule[targetDay] = [{ start: { hour: 14, minute: 0 }, end: { hour: 17, minute: 0 } }]
      } else {
        // Flexible - available both morning and afternoon
        schedule[targetDay] = [
          { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
          { start: { hour: 14, minute: 0 }, end: { hour: 17, minute: 0 } }
        ]
        
        // Add secondary day for flexible students
        const secondDay = days[(dayPreferences + 1) % 5]
        schedule[secondDay] = [{ start: { hour: 10, minute: 0 }, end: { hour: 16, minute: 0 } }]
      }
      
      students.push(generateStudent(
        `Student${i + 1}`,
        `student${i + 1}@test.com`,
        lessonLength,
        schedule
      ))
    }
    
    const teacherGrid = createTeacherGrid(realisticTeacherSchedule)
    
    // Solve with realistic heuristics
    const startTime = Date.now()
    const result = await solve(students, teacherGrid, defaultHeuristics)
    const solveTime = Date.now() - startTime
    
    // Should find a solution within reasonable time
    expect(solveTime).toBeLessThan(30000) // 30 seconds max
    expect(result).not.toBeNull()
    expect(result!.assignments).toHaveLength(30)
    
    // Verify no scheduling conflicts
    const timeSlotUsage = new Map<string, number>()
    result!.assignments.forEach(assignment => {
      const key = `${assignment.time.start.i}-${assignment.time.start.j}`
      timeSlotUsage.set(key, (timeSlotUsage.get(key) || 0) + 1)
    })
    
    // No time slot should be used more than once
    Array.from(timeSlotUsage.values()).forEach(count => {
      expect(count).toBe(1)
    })
  }, 60000) // 60 second timeout

  test('single solution puzzle - 25 students with minimal overlap', async () => {
    // Create a scenario designed to have exactly one valid solution
    const students: StudentSchedule[] = []
    
    // Strategy: Create students with very specific, non-overlapping windows
    // that collectively fill the teacher's entire available time
    
    // Monday morning students (9am-12pm = 6 slots)
    for (let i = 0; i < 6; i++) {
      const startSlot = i
      const endSlot = i + 1
      const startHour = 9 + Math.floor(startSlot / 2)
      const startMin = (startSlot % 2) * 30
      const endHour = 9 + Math.floor(endSlot / 2)
      const endMin = (endSlot % 2) * 30
      
      students.push(generateStudent(
        `MondayMorning${i + 1}`,
        `mm${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: startHour, minute: startMin }, end: { hour: endHour, minute: endMin } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    // Monday afternoon students (1pm-6pm = 10 slots)
    for (let i = 0; i < 10; i++) {
      const startSlot = i
      const endSlot = i + 1
      const startHour = 13 + Math.floor(startSlot / 2)
      const startMin = (startSlot % 2) * 30
      const endHour = 13 + Math.floor(endSlot / 2)
      const endMin = (endSlot % 2) * 30
      
      students.push(generateStudent(
        `MondayAfternoon${i + 1}`,
        `ma${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: startHour, minute: startMin }, end: { hour: endHour, minute: endMin } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    // Tuesday students - 9 students for remaining 16 slots
    for (let i = 0; i < 9; i++) {
      // Give each student a 2-hour window that overlaps with others
      const baseHour = 9 + (i % 8)
      
      students.push(generateStudent(
        `Tuesday${i + 1}`,
        `tue${i + 1}@test.com`,
        30,
        {
          Tuesday: [{ start: { hour: baseHour, minute: 0 }, end: { hour: baseHour + 2, minute: 0 } }],
          Monday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherGrid = createTeacherGrid(realisticTeacherSchedule)
    
    const result = await solve(students, teacherGrid, defaultHeuristics)
    
    expect(result).not.toBeNull()
    expect(result!.assignments).toHaveLength(25)
    
    // Verify the solution uses all Monday slots and some Tuesday slots
    const mondaySlots = result!.assignments.filter(a => a.time.start.i === 0).length
    const tuesdaySlots = result!.assignments.filter(a => a.time.start.i === 1).length
    
    expect(mondaySlots).toBe(16) // All Monday slots filled
    expect(tuesdaySlots).toBe(9)  // Remaining students on Tuesday
  }, 60000)

  test('stress test with competing peak time preferences', async () => {
    // 20 students all wanting the same popular time slots
    const students: StudentSchedule[] = []
    const popularTimes: Schedule = {
      Monday: [{ start: { hour: 16, minute: 0 }, end: { hour: 18, minute: 0 } }], // 4-6pm
      Wednesday: [{ start: { hour: 16, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Friday: [{ start: { hour: 16, minute: 0 }, end: { hour: 18, minute: 0 } }],
      Tuesday: [], Thursday: [], Saturday: [], Sunday: []
    }
    
    for (let i = 0; i < 20; i++) {
      students.push(generateStudent(
        `PopularTime${i + 1}`,
        `popular${i + 1}@test.com`,
        30,
        popularTimes
      ))
    }
    
    const teacherGrid = createTeacherGrid(realisticTeacherSchedule)
    
    const result = await solve(students, teacherGrid, defaultHeuristics)
    
    // Should still find a solution, but only some students get their preferred times
    expect(result).not.toBeNull()
    expect(result!.assignments.length).toBeGreaterThan(0)
    
    // Count how many got their preferred times (Mon/Wed/Fri 4-6pm)
    const preferredSlots = result!.assignments.filter(assignment => {
      const day = assignment.time.start.i
      const hour = 9 + Math.floor(assignment.time.start.j / 2)
      return (day === 0 || day === 2 || day === 4) && hour >= 16 && hour < 18
    })
    
    // Should be limited by available slots in preferred times
    expect(preferredSlots.length).toBeLessThanOrEqual(12) // 3 days × 4 slots = 12 max
  }, 60000)

  test('mixed lesson lengths with complex packing', async () => {
    const students: StudentSchedule[] = []
    
    // 15 students wanting 60-minute lessons
    for (let i = 0; i < 15; i++) {
      const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i % 5] as keyof Schedule
      
      students.push(generateStudent(
        `LongLesson${i + 1}`,
        `long${i + 1}@test.com`,
        60,
        {
          [day]: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Monday: day === 'Monday' ? [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }] : [],
          Tuesday: day === 'Tuesday' ? [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }] : [],
          Wednesday: day === 'Wednesday' ? [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }] : [],
          Thursday: day === 'Thursday' ? [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }] : [],
          Friday: day === 'Friday' ? [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }] : [],
          Saturday: [],
          Sunday: []
        }
      ))
    }
    
    // 15 students wanting 30-minute lessons (can fill gaps)
    for (let i = 0; i < 15; i++) {
      const flexibleSchedule: Schedule = {
        Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Thursday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Friday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
        Saturday: [],
        Sunday: []
      }
      
      students.push(generateStudent(
        `ShortLesson${i + 1}`,
        `short${i + 1}@test.com`,
        30,
        flexibleSchedule
      ))
    }
    
    const teacherGrid = createTeacherGrid(realisticTeacherSchedule)
    
    const result = await solve(students, teacherGrid, defaultHeuristics)
    
    expect(result).not.toBeNull()
    
    // Verify lesson length constraints are respected
    result!.assignments.forEach(assignment => {
      const duration = assignment.time.end.j - assignment.time.start.j
      const expectedDuration = assignment.student.student.lessonLength === 60 ? 2 : 1
      expect(duration).toBe(expectedDuration)
    })
    
    // Should achieve good packing efficiency
    expect(result!.assignments.length).toBeGreaterThan(20)
  }, 60000)

  test('edge case - insufficient teacher availability', async () => {
    // 20 students, but teacher only available 2 hours per day
    const limitedTeacherSchedule: Schedule = {
      Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
      Tuesday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
      Wednesday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
      Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    const students: StudentSchedule[] = []
    for (let i = 0; i < 20; i++) {
      students.push(generateStudent(
        `Student${i + 1}`,
        `student${i + 1}@test.com`,
        30,
        {
          Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
          Tuesday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
          Wednesday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
          Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      ))
    }
    
    const teacherGrid = createTeacherGrid(limitedTeacherSchedule)
    
    const result = await solve(students, teacherGrid, defaultHeuristics)
    
    if (result) {
      // If a solution is found, it should fit within available slots
      // 3 days × 2 hours × 2 slots = 12 maximum slots
      expect(result.assignments.length).toBeLessThanOrEqual(12)
    } else {
      // It's acceptable for this to return null (no solution)
      expect(result).toBeNull()
    }
  }, 30000)

  test('performance degrades linearly with student count', async () => {
    const times: number[] = []
    const studentCounts = [10, 20, 30]
    
    for (const count of studentCounts) {
      const students: StudentSchedule[] = []
      
      for (let i = 0; i < count; i++) {
        const flexibleSchedule: Schedule = {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Thursday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Friday: [{ start: { hour: 9, minute: 0 }, end: { hour: 18, minute: 0 } }],
          Saturday: [],
          Sunday: []
        }
        
        students.push(generateStudent(
          `Student${i + 1}`,
          `student${i + 1}@test.com`,
          30,
          flexibleSchedule
        ))
      }
      
      const teacherGrid = createTeacherGrid(realisticTeacherSchedule)
      
      const startTime = Date.now()
      const result = await solve(students, teacherGrid, defaultHeuristics)
      const endTime = Date.now()
      
      times.push(endTime - startTime)
      
      expect(result).not.toBeNull()
      expect(result!.assignments.length).toBe(count)
    }
    
    // Performance should not explode exponentially
    // Allow some variance, but 30 students shouldn't take >10x longer than 10 students
    const ratio30to10 = times[2] / times[0]
    expect(ratio30to10).toBeLessThan(10)
    
    // All tests should complete within reasonable time
    times.forEach(time => {
      expect(time).toBeLessThan(15000) // 15 seconds
    })
  }, 120000) // 2 minute total timeout for all runs
})