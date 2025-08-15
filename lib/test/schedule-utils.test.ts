import { describe, test, expect } from 'vitest'
import { scheduleToButtons } from '../heur_solver'
import type { Schedule } from '../types'
import { Time } from '../types'

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

    test('should handle all days of week correctly', () => {
      const schedule: Schedule = {
        Monday: [{ start: new Time(9, 0), end: new Time(9, 30) }],
        Tuesday: [{ start: new Time(10, 0), end: new Time(10, 30) }],
        Wednesday: [{ start: new Time(11, 0), end: new Time(11, 30) }],
        Thursday: [{ start: new Time(12, 0), end: new Time(12, 30) }],
        Friday: [{ start: new Time(13, 0), end: new Time(13, 30) }],
        Saturday: [{ start: new Time(14, 0), end: new Time(14, 30) }],
        Sunday: [{ start: new Time(15, 0), end: new Time(15, 30) }]
      }
      
      const buttons = scheduleToButtons(schedule)
      
      // Check each day has one true slot at the correct position
      expect(buttons[0]![0]).toBe(true)  // Monday 9:00
      expect(buttons[1]![2]).toBe(true)  // Tuesday 10:00
      expect(buttons[2]![4]).toBe(true)  // Wednesday 11:00
      expect(buttons[3]![6]).toBe(true)  // Thursday 12:00
      expect(buttons[4]![8]).toBe(true)  // Friday 13:00
      expect(buttons[5]![10]).toBe(true) // Saturday 14:00
      expect(buttons[6]![12]).toBe(true) // Sunday 15:00
      
      // Check that other slots are false
      expect(buttons[0]![1]).toBe(false) // Monday 9:30
      expect(buttons[1]![3]).toBe(false) // Tuesday 10:30
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

    test('should throw error for times after 9pm', () => {
      const invalidSchedule: Schedule = {
        Monday: [{ start: new Time(21, 30), end: new Time(22, 0) }], // After 9pm
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      expect(() => scheduleToButtons(invalidSchedule)).toThrow('Invalid time')
    })

    test('should throw error for invalid minutes', () => {
      const invalidSchedule: Schedule = {
        Monday: [{ start: new Time(10, 15), end: new Time(10, 45) }], // 15 and 45 minutes not allowed
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      expect(() => scheduleToButtons(invalidSchedule)).toThrow('Invalid time (min)')
    })

    test('should handle 30-minute slots correctly', () => {
      const schedule: Schedule = {
        Monday: [{ start: new Time(9, 30), end: new Time(10, 0) }], // 9:30-10:00
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      const buttons = scheduleToButtons(schedule)
      
      expect(buttons[0]![0]).toBe(false) // 9:00
      expect(buttons[0]![1]).toBe(true)  // 9:30
      expect(buttons[0]![2]).toBe(false) // 10:00
    })

    test('should handle edge case times at boundaries', () => {
      const schedule: Schedule = {
        Monday: [
          { start: new Time(9, 0), end: new Time(9, 30) },   // First possible slot
          { start: new Time(20, 30), end: new Time(21, 0) }  // Last possible slot
        ],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      const buttons = scheduleToButtons(schedule)
      
      expect(buttons[0]![0]).toBe(true)  // 9:00 (first slot)
      expect(buttons[0]![23]).toBe(true) // 20:30 (last slot)
      expect(buttons[0]![1]).toBe(false) // 9:30
      expect(buttons[0]![22]).toBe(false) // 20:00
    })

    test('should handle undefined schedule days gracefully', () => {
      const scheduleWithUndefined: Schedule = {
        Monday: [{ start: new Time(10, 0), end: new Time(11, 0) }],
        Tuesday: undefined,
        Wednesday: undefined,
        Thursday: undefined,
        Friday: undefined,
        Saturday: undefined,
        Sunday: undefined
      }
      
      const buttons = scheduleToButtons(scheduleWithUndefined)
      
      expect(buttons).toHaveLength(7) // Should still have 7 days
      
      // Monday should have the scheduled time
      expect(buttons[0]![2]).toBe(true)  // 10:00
      expect(buttons[0]![3]).toBe(true)  // 10:30
      
      // Other days should be all false
      for (let day = 1; day < 7; day++) {
        buttons[day]!.forEach(slot => {
          expect(slot).toBe(false)
        })
      }
    })
  })

  describe('Time Index Conversion', () => {
    test('should correctly map various times to indices', () => {
      // Test the internal timeToIndex logic through scheduleToButtons
      const testCases = [
        { time: new Time(9, 0), expectedIndex: 0 },
        { time: new Time(9, 30), expectedIndex: 1 },
        { time: new Time(10, 0), expectedIndex: 2 },
        { time: new Time(12, 0), expectedIndex: 6 },
        { time: new Time(15, 30), expectedIndex: 13 },
        { time: new Time(20, 30), expectedIndex: 23 }
      ]

      testCases.forEach(({ time, expectedIndex }) => {
        const endTime = time.minute === 30 
          ? new Time(time.hour + 1, 0) 
          : new Time(time.hour, time.minute + 30)
        
        const schedule: Schedule = {
          Monday: [{ start: time, end: endTime }],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: []
        }
        
        const buttons = scheduleToButtons(schedule)
        
        // Check that only the expected index is true
        buttons[0]!.forEach((slot, index) => {
          if (index === expectedIndex) {
            expect(slot).toBe(true)
          } else {
            expect(slot).toBe(false)
          }
        })
      })
    })

    test('should handle hour overflow correctly', () => {
      // End time that goes to next hour
      const schedule: Schedule = {
        Monday: [{ start: new Time(10, 30), end: new Time(11, 30) }], // 10:30-11:30
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
      
      const buttons = scheduleToButtons(schedule)
      
      expect(buttons[0]![3]).toBe(true)  // 10:30
      expect(buttons[0]![4]).toBe(true)  // 11:00
      expect(buttons[0]![2]).toBe(false) // 10:00
      expect(buttons[0]![5]).toBe(false) // 11:30
    })
  })
})