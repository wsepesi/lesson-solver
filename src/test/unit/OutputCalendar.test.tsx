import { describe, test, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import OutputCalendar from '../../components/OutputCalendar'
import type { FinalSchedule } from 'lib/heur_solver'
import type { Schedule } from 'lib/types'

describe('OutputCalendar Component', () => {
  test('displays assigned lessons correctly', () => {
    // STEP 1: Create sample FinalSchedule data
    const sampleSchedule: FinalSchedule = {
      assignments: [
        {
          student: {
            student: { name: 'Alice', email: 'alice@test.com', lessonLength: 30 as const },
            schedule: {
              Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 12, minute: 0 } }],
              Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: {
            start: { i: 0, j: 2 }, // Monday, 10:00am (slot 2)
            end: { i: 0, j: 3 }     // Monday, 10:30am (slot 3)
          }
        },
        {
          student: {
            student: { name: 'Bob', email: 'bob@test.com', lessonLength: 60 as const },
            schedule: {
              Monday: [], Tuesday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
              Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: {
            start: { i: 1, j: 10 }, // Tuesday, 2:00pm (slot 10)
            end: { i: 1, j: 12 }    // Tuesday, 3:00pm (slot 12)
          }
        }
      ]
    }
    
    const mockAvailSchedule: Schedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar with assignments
    render(
      <OutputCalendar 
        schedule={sampleSchedule}
        avail={mockAvailSchedule}
      />
    )
    
    // STEP 3: Verify student names appear in calendar
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getAllByText('Bob')).toHaveLength(2) // Bob appears in 2 time slots for 60min lesson
    
    // STEP 4: Check for basic calendar structure
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
  })

  test('shows empty calendar when no assignments', () => {
    // STEP 1: Create FinalSchedule with no assignments
    const emptySchedule: FinalSchedule = {
      assignments: []
    }
    
    const mockAvailSchedule: Schedule = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render with empty assignments
    render(
      <OutputCalendar 
        schedule={emptySchedule}
        avail={mockAvailSchedule}
      />
    )
    
    // STEP 3: Should show basic calendar structure but no student names
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
    
    // STEP 4: Should have time labels
    expect(screen.getByText('9:00')).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
  })

  test('renders calendar with correct time slots', () => {
    // STEP 1: Create minimal schedule
    const schedule: FinalSchedule = { assignments: [] }
    const avail: Schedule = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar
    render(
      <OutputCalendar 
        schedule={schedule}
        avail={avail}
      />
    )
    
    // STEP 3: Check for time labels (30-minute increments from 9am-9pm)
    expect(screen.getByText('9:00')).toBeInTheDocument()
    expect(screen.getByText('9:30')).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('17:00')).toBeInTheDocument()
    expect(screen.getByText('20:30')).toBeInTheDocument()
  })

  test('displays all days of week in header', () => {
    // STEP 1: Create test data
    const schedule: FinalSchedule = { assignments: [] }
    const avail: Schedule = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar
    render(
      <OutputCalendar 
        schedule={schedule}
        avail={avail}
      />
    )
    
    // STEP 3: Check that all days are shown in the header
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByText('Thursday')).toBeInTheDocument()
    expect(screen.getByText('Friday')).toBeInTheDocument()
    expect(screen.getByText('Saturday')).toBeInTheDocument()
    expect(screen.getByText('Sunday')).toBeInTheDocument()
  })

  test('handles different lesson lengths visually', () => {
    // STEP 1: Create assignments with different lesson lengths
    const schedule: FinalSchedule = {
      assignments: [
        {
          student: {
            student: { name: 'Student30', email: 'test30@test.com', lessonLength: 30 as const },
            schedule: {
              Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 10, minute: 30 } }],
              Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: {
            start: { i: 0, j: 2 }, // Monday, 10:00am
            end: { i: 0, j: 3 }    // Monday, 10:30am (1 slot)
          }
        },
        {
          student: {
            student: { name: 'Student60', email: 'test60@test.com', lessonLength: 60 as const },
            schedule: {
              Monday: [{ start: { hour: 11, minute: 0 }, end: { hour: 12, minute: 0 } }],
              Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: {
            start: { i: 0, j: 4 }, // Monday, 11:00am
            end: { i: 0, j: 6 }    // Monday, 12:00pm (2 slots)
          }
        }
      ]
    }
    
    const avail: Schedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar
    render(
      <OutputCalendar 
        schedule={schedule}
        avail={avail}
      />
    )
    
    // STEP 3: Verify both students are displayed
    expect(screen.getByText('Student30')).toBeInTheDocument()
    expect(screen.getAllByText('Student60')).toHaveLength(2) // Student60 appears in 2 slots for 60min lesson
  })

  test('renders correct number of time slots (24 blocks)', () => {
    // STEP 1: Create test data
    const schedule: FinalSchedule = { assignments: [] }
    const avail: Schedule = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar
    render(
      <OutputCalendar 
        schedule={schedule}
        avail={avail}
      />
    )
    
    // STEP 3: Check that we have the expected number of time labels
    // Each hour has 2 slots (30-min increments), 9am-9pm = 12 hours = 24 slots
    const timeLabels = screen.getAllByText(/^\d+:\d+$/)
    expect(timeLabels.length).toBe(24)
  })

  test('handles complex schedule with multiple students', () => {
    // STEP 1: Create complex schedule with multiple students
    const complexSchedule: FinalSchedule = {
      assignments: [
        {
          student: {
            student: { name: 'Alice', email: 'alice@test.com', lessonLength: 30 as const },
            schedule: {
              Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 12, minute: 0 } }],
              Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: { start: { i: 0, j: 2 }, end: { i: 0, j: 3 } }
        },
        {
          student: {
            student: { name: 'Bob', email: 'bob@test.com', lessonLength: 30 as const },
            schedule: {
              Monday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
              Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: { start: { i: 0, j: 10 }, end: { i: 0, j: 11 } }
        },
        {
          student: {
            student: { name: 'Carol', email: 'carol@test.com', lessonLength: 60 as const },
            schedule: {
              Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 11, minute: 0 } }],
              Monday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: { start: { i: 1, j: 0 }, end: { i: 1, j: 2 } }
        }
      ]
    }
    
    const avail: Schedule = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar
    render(
      <OutputCalendar 
        schedule={complexSchedule}
        avail={avail}
      />
    )
    
    // STEP 3: All students should be displayed
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getAllByText('Carol')).toHaveLength(2) // Carol has 60min lesson, appears in 2 slots
    
    // STEP 4: Calendar structure should be intact
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  test('component handles edge case with single assignment', () => {
    // STEP 1: Create schedule with just one assignment
    const singleSchedule: FinalSchedule = {
      assignments: [
        {
          student: {
            student: { name: 'OnlyStudent', email: 'only@test.com', lessonLength: 30 as const },
            schedule: {
              Wednesday: [{ start: { hour: 15, minute: 30 }, end: { hour: 16, minute: 0 } }],
              Monday: [], Tuesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            },
            bsched: Array(7).fill(null).map(() => Array(24).fill(false))
          },
          time: { start: { i: 2, j: 13 }, end: { i: 2, j: 14 } } // Wednesday 3:30pm
        }
      ]
    }
    
    const avail: Schedule = {
      Wednesday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Monday: [], Tuesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    
    // STEP 2: Render calendar
    render(
      <OutputCalendar 
        schedule={singleSchedule}
        avail={avail}
      />
    )
    
    // STEP 3: Student should be displayed
    expect(screen.getByText('OnlyStudent')).toBeInTheDocument()
    
    // STEP 4: Calendar should be functional
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })
})