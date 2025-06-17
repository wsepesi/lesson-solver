import { describe, test, expect } from 'vitest'
import { Time, blockOfTimeToString } from '../types'
import type { BlockOfTime, Schedule, Student, StudentSchedule } from '../types'

describe('Time Class', () => {
  describe('Constructor and Basic Properties', () => {
    test('should create Time object with correct hour and minute', () => {
      const time = new Time(14, 30)
      expect(time.hour).toBe(14)
      expect(time.minute).toBe(30)
    })

    test('should handle edge case times', () => {
      const midnight = new Time(0, 0)
      expect(midnight.hour).toBe(0)
      expect(midnight.minute).toBe(0)

      const endOfDay = new Time(23, 59)
      expect(endOfDay.hour).toBe(23)
      expect(endOfDay.minute).toBe(59)
    })
  })

  describe('Comparison Methods', () => {
    test('greaterThan should work correctly', () => {
      const time1 = new Time(10, 30)
      const time2 = new Time(10, 0)
      const time3 = new Time(9, 30)
      const time4 = new Time(10, 30)

      expect(time1.greaterThan(time2)).toBe(true)  // Same hour, later minute
      expect(time1.greaterThan(time3)).toBe(true)  // Later hour
      expect(time1.greaterThan(time4)).toBe(false) // Same time
      expect(time2.greaterThan(time1)).toBe(false) // Earlier
    })

    test('lessThan should work correctly', () => {
      const time1 = new Time(10, 0)
      const time2 = new Time(10, 30)
      const time3 = new Time(11, 0)
      const time4 = new Time(10, 0)

      expect(time1.lessThan(time2)).toBe(true)  // Same hour, earlier minute
      expect(time1.lessThan(time3)).toBe(true)  // Earlier hour
      expect(time1.lessThan(time4)).toBe(false) // Same time
      expect(time2.lessThan(time1)).toBe(false) // Later
    })

    test('geq (greater than or equal) should work correctly', () => {
      const time1 = new Time(10, 30)
      const time2 = new Time(10, 0)
      const time3 = new Time(10, 30)
      const time4 = new Time(11, 0)

      expect(time1.geq(time2)).toBe(true)  // Greater
      expect(time1.geq(time3)).toBe(true)  // Equal
      expect(time1.geq(time4)).toBe(false) // Less
    })

    test('leq (less than or equal) should work correctly', () => {
      const time1 = new Time(10, 0)
      const time2 = new Time(10, 30)
      const time3 = new Time(10, 0)
      const time4 = new Time(9, 30)

      expect(time1.leq(time2)).toBe(true)  // Less
      expect(time1.leq(time3)).toBe(true)  // Equal
      expect(time1.leq(time4)).toBe(false) // Greater
    })

    test('equals should work correctly', () => {
      const time1 = new Time(10, 30)
      const time2 = new Time(10, 30)
      const time3 = new Time(10, 0)
      const time4 = new Time(11, 30)

      expect(time1.equals(time2)).toBe(true)  // Same time
      expect(time1.equals(time3)).toBe(false) // Different minute
      expect(time1.equals(time4)).toBe(false) // Different hour
    })
  })

  describe('Utility Methods', () => {
    test('toStr should format time correctly', () => {
      const time1 = new Time(9, 0)
      const time2 = new Time(14, 30)
      const time3 = new Time(0, 0)

      expect(Time.toStr(time1)).toBe('9:0')
      expect(Time.toStr(time2)).toBe('14:30')
      expect(Time.toStr(time3)).toBe('0:0')
    })

    test('valueOf should return total minutes', () => {
      const time1 = new Time(0, 0)
      const time2 = new Time(1, 0)
      const time3 = new Time(1, 30)
      const time4 = new Time(10, 45)

      expect(time1.valueOf()).toBe(0)     // 0 minutes
      expect(time2.valueOf()).toBe(60)    // 1 hour = 60 minutes
      expect(time3.valueOf()).toBe(90)    // 1.5 hours = 90 minutes
      expect(time4.valueOf()).toBe(645)   // 10 hours 45 minutes = 645 minutes
    })

    test('fromValue should create Time from minutes', () => {
      const time1 = Time.fromValue(0)
      const time2 = Time.fromValue(60)
      const time3 = Time.fromValue(90)
      const time4 = Time.fromValue(645)

      expect(time1.hour).toBe(0)
      expect(time1.minute).toBe(0)

      expect(time2.hour).toBe(1)
      expect(time2.minute).toBe(0)

      expect(time3.hour).toBe(1)
      expect(time3.minute).toBe(30)

      expect(time4.hour).toBe(10)
      expect(time4.minute).toBe(45)
    })

    test('valueOf and fromValue should be inverses', () => {
      const originalTimes = [
        new Time(0, 0),
        new Time(9, 30),
        new Time(12, 0),
        new Time(17, 45),
        new Time(23, 59)
      ]

      originalTimes.forEach(original => {
        const value = original.valueOf()
        const reconstructed = Time.fromValue(value)
        expect(reconstructed.hour).toBe(original.hour)
        expect(reconstructed.minute).toBe(original.minute)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle boundary times correctly', () => {
      const startOfDay = new Time(0, 0)
      const almostEndOfDay = new Time(23, 59)

      expect(startOfDay.hour).toBe(0)
      expect(startOfDay.minute).toBe(0)
      expect(almostEndOfDay.hour).toBe(23)
      expect(almostEndOfDay.minute).toBe(59)
    })

    test('should handle comparison with same object', () => {
      const time = new Time(10, 30)

      expect(time.equals(time)).toBe(true)
      expect(time.greaterThan(time)).toBe(false)
      expect(time.lessThan(time)).toBe(false)
      expect(time.geq(time)).toBe(true)
      expect(time.leq(time)).toBe(true)
    })
  })
})

describe('Block of Time Utilities', () => {
  describe('blockOfTimeToString', () => {
    test('should format AM times correctly', () => {
      const block: BlockOfTime = {
        start: new Time(9, 0),
        end: new Time(10, 30)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('9:00 AM - 10:30 AM')
    })

    test('should format PM times correctly', () => {
      const block: BlockOfTime = {
        start: new Time(14, 30),
        end: new Time(16, 0)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('2:30 PM - 4:00 PM')
    })

    test('should format noon correctly', () => {
      const block: BlockOfTime = {
        start: new Time(12, 0),
        end: new Time(13, 0)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('12:00 PM - 1:00 PM')
    })

    test('should format midnight correctly', () => {
      const block: BlockOfTime = {
        start: new Time(0, 0),
        end: new Time(1, 0)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('12:00 AM - 1:00 AM')
    })

    test('should handle minutes correctly', () => {
      const block: BlockOfTime = {
        start: new Time(9, 30),
        end: new Time(10, 0)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('9:30 AM - 10:00 AM')
    })

    test('should handle AM to PM transition', () => {
      const block: BlockOfTime = {
        start: new Time(11, 30),
        end: new Time(12, 30)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('11:30 AM - 12:30 PM')
    })

    test('should handle zero minutes correctly', () => {
      const block: BlockOfTime = {
        start: new Time(15, 0),
        end: new Time(16, 0)
      }

      const result = blockOfTimeToString(block)
      expect(result).toBe('3:00 PM - 4:00 PM')
    })
  })
})

describe('Type System Validation', () => {
  describe('Schedule Type', () => {
    test('should accept valid schedule with all days', () => {
      const schedule: Schedule = {
        Monday: [{ start: new Time(9, 0), end: new Time(10, 0) }],
        Tuesday: [{ start: new Time(10, 0), end: new Time(11, 0) }],
        Wednesday: [],
        Thursday: [{ start: new Time(14, 0), end: new Time(15, 0) }],
        Friday: [],
        Saturday: [],
        Sunday: []
      }

      expect(schedule.Monday).toHaveLength(1)
      expect(schedule.Wednesday).toHaveLength(0)
      expect(schedule.Tuesday?.[0]?.start.hour).toBe(10)
    })

    test('should accept schedule with missing days', () => {
      const partialSchedule: Schedule = {
        Monday: [{ start: new Time(9, 0), end: new Time(10, 0) }]
      }

      expect(partialSchedule.Monday).toHaveLength(1)
      expect(partialSchedule.Tuesday).toBeUndefined()
    })

    test('should accept schedule with multiple blocks per day', () => {
      const schedule: Schedule = {
        Monday: [
          { start: new Time(9, 0), end: new Time(10, 0) },
          { start: new Time(14, 0), end: new Time(15, 0) }
        ],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }

      expect(schedule.Monday).toHaveLength(2)
      expect(schedule.Monday?.[0]?.start.hour).toBe(9)
      expect(schedule.Monday?.[1]?.start.hour).toBe(14)
    })
  })

  describe('Student and StudentSchedule Types', () => {
    test('should accept valid student with 30min lesson', () => {
      const student: Student = {
        name: 'Alice',
        email: 'alice@test.com',
        lessonLength: 30
      }

      expect(student.lessonLength).toBe(30)
      expect(typeof student.lessonLength).toBe('number')
    })

    test('should accept valid student with 60min lesson', () => {
      const student: Student = {
        name: 'Bob',
        email: 'bob@test.com',
        lessonLength: 60
      }

      expect(student.lessonLength).toBe(60)
      expect(typeof student.lessonLength).toBe('number')
    })

    test('should accept valid StudentSchedule', () => {
      const studentSchedule: StudentSchedule = {
        student: {
          name: 'Charlie',
          email: 'charlie@test.com',
          lessonLength: 30
        },
        schedule: {
          Monday: [{ start: new Time(10, 0), end: new Time(11, 0) }],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: []
        }
      }

      expect(studentSchedule.student.name).toBe('Charlie')
      expect(studentSchedule.schedule.Monday).toHaveLength(1)
    })
  })

  describe('Type Constraints', () => {
    test('should ensure lesson lengths are constrained to 30 or 60', () => {
      // This test validates TypeScript compilation more than runtime behavior
      const validLengths = [30, 60] as const
      
      validLengths.forEach(length => {
        const student: Student = {
          name: 'Test',
          email: 'test@test.com',
          lessonLength: length
        }
        expect([30, 60]).toContain(student.lessonLength)
      })
    })

    test('should ensure days are constrained to valid day names', () => {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
      
      const schedule: Schedule = {}
      
      validDays.forEach(day => {
        schedule[day] = [{ start: new Time(9, 0), end: new Time(10, 0) }]
      })

      expect(Object.keys(schedule)).toHaveLength(7)
      expect(schedule.Monday).toBeDefined()
      expect(schedule.Sunday).toBeDefined()
    })
  })

  describe('Time Validation for Schedule Context', () => {
    test('should handle valid scheduling time ranges', () => {
      // Test times within the expected 9am-9pm range
      const validTimes = [
        new Time(9, 0),    // 9:00 AM
        new Time(9, 30),   // 9:30 AM
        new Time(12, 0),   // 12:00 PM
        new Time(17, 30),  // 5:30 PM
        new Time(20, 30)   // 8:30 PM
      ]

      validTimes.forEach(time => {
        expect(time.hour).toBeGreaterThanOrEqual(9)
        expect(time.hour).toBeLessThan(21)
        expect([0, 30]).toContain(time.minute)
      })
    })

    test('should create valid BlockOfTime objects', () => {
      const block: BlockOfTime = {
        start: new Time(10, 0),
        end: new Time(11, 30)
      }

      expect(block.start.lessThan(block.end)).toBe(true)
      expect(block.end.greaterThan(block.start)).toBe(true)
    })

    test('should handle edge case where start equals end', () => {
      const block: BlockOfTime = {
        start: new Time(10, 0),
        end: new Time(10, 0)
      }

      expect(block.start.equals(block.end)).toBe(true)
      expect(block.start.lessThan(block.end)).toBe(false)
      expect(block.start.greaterThan(block.end)).toBe(false)
    })
  })
})