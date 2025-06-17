import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import { ResultsTable } from '../../components/ResultsTable'
import type { Scheduled, BlockOfTime } from 'lib/types'

// Mock utility functions
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    cn: (...inputs: any[]) => inputs.join(' '), // Mock cn function
    blockOfTimeToSchedule: (interval: BlockOfTime) => {
      // Mock implementation that converts BlockOfTime to Schedule format
      const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][interval.start.i]
      return {
        [day]: [{
          start: { 
            hour: 9 + Math.floor(interval.start.j / 2), 
            minute: (interval.start.j % 2) * 30 
          },
          end: { 
            hour: 9 + Math.floor(interval.end.j / 2), 
            minute: (interval.end.j % 2) * 30 
          }
        }]
      }
    }
  }
})

vi.mock('lib/types', () => ({
  blockOfTimeToString: (time: any) => {
    // Mock implementation that formats time
    const formatTime = (h: number, m: number) => {
      const hour = h > 12 ? h - 12 : h
      const minute = m === 0 ? '00' : m
      const ampm = h >= 12 ? 'PM' : 'AM'
      return `${hour}:${minute} ${ampm}`
    }
    return `${formatTime(time.start.hour, time.start.minute)} - ${formatTime(time.end.hour, time.end.minute)}`
  }
}))

describe('ResultsTable Component', () => {
  const mockScheduled: Scheduled[] = [
    {
      student: {
        student: { name: 'Alice Smith', email: 'alice@test.com', lessonLength: 30 },
        schedule: {
          Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 12, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        },
        bsched: []
      },
      interval: {
        start: { i: 0, j: 2 }, // Monday, 10:00 AM
        end: { i: 0, j: 3 }     // Monday, 10:30 AM
      }
    },
    {
      student: {
        student: { name: 'Bob Johnson', email: 'bob@test.com', lessonLength: 60 },
        schedule: {
          Tuesday: [{ start: { hour: 14, minute: 0 }, end: { hour: 16, minute: 0 } }],
          Monday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        },
        bsched: []
      },
      interval: {
        start: { i: 1, j: 10 }, // Tuesday, 2:00 PM
        end: { i: 1, j: 12 }    // Tuesday, 3:00 PM
      }
    },
    {
      student: {
        student: { name: 'Carol White', email: 'carol@test.com', lessonLength: 30 },
        schedule: {
          Wednesday: [{ start: { hour: 9, minute: 30 }, end: { hour: 11, minute: 0 } }],
          Monday: [], Tuesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        },
        bsched: []
      },
      interval: {
        start: { i: 2, j: 1 }, // Wednesday, 9:30 AM
        end: { i: 2, j: 2 }    // Wednesday, 10:00 AM
      }
    }
  ]

  test('renders table with correct headers', () => {
    render(<ResultsTable scheduled={mockScheduled} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Day')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  test('renders table caption', () => {
    render(<ResultsTable scheduled={mockScheduled} />)

    expect(screen.getByText('Final schedules')).toBeInTheDocument()
  })

  test('displays all scheduled students', () => {
    render(<ResultsTable scheduled={mockScheduled} />)

    // Check student names
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    expect(screen.getByText('Carol White')).toBeInTheDocument()

    // Check emails
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
    expect(screen.getByText('carol@test.com')).toBeInTheDocument()
  })

  test('displays correct days for each student', () => {
    render(<ResultsTable scheduled={mockScheduled} />)

    const rows = screen.getAllByRole('row')
    
    // Skip header row, check data rows
    expect(rows[1]).toHaveTextContent('Monday')
    expect(rows[2]).toHaveTextContent('Tuesday')
    expect(rows[3]).toHaveTextContent('Wednesday')
  })

  test('displays formatted time for each student', () => {
    render(<ResultsTable scheduled={mockScheduled} />)

    // Based on our mock implementation
    expect(screen.getByText('10:00 AM - 10:30 AM')).toBeInTheDocument()
    expect(screen.getByText('2:00 PM - 3:00 PM')).toBeInTheDocument()
    expect(screen.getByText('9:30 AM - 10:00 AM')).toBeInTheDocument()
  })

  test('renders empty table when no students scheduled', () => {
    render(<ResultsTable scheduled={[]} />)

    expect(screen.getByText('Final schedules')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    
    // Table body should be empty
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(1) // Only header row
  })

  test('handles single scheduled student', () => {
    const singleStudent: Scheduled[] = [mockScheduled[0]]
    
    render(<ResultsTable scheduled={singleStudent} />)

    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(2) // Header + 1 data row
  })

  test('applies correct CSS classes', () => {
    const { container } = render(<ResultsTable scheduled={mockScheduled} />)

    // Check table positioning classes
    const table = container.querySelector('.mx-\\[25vw\\]')
    expect(table).toBeInTheDocument()
    expect(table).toHaveClass('max-w-[50vw]')
    expect(table).toHaveClass('my-[25vh]')

    // Check header width class
    const nameHeader = screen.getByText('Name').closest('th')
    expect(nameHeader).toHaveClass('w-[100px]')

    // Check text alignment
    const timeHeader = screen.getByText('Time').closest('th')
    expect(timeHeader).toHaveClass('text-right')
  })

  test('renders time cells with right alignment', () => {
    render(<ResultsTable scheduled={mockScheduled} />)

    const timeCells = screen.getAllByText(/\d+:\d+ [AP]M - \d+:\d+ [AP]M/)
    timeCells.forEach(cell => {
      expect(cell.closest('td')).toHaveClass('text-right')
    })
  })

  test('uses student name as row key', () => {
    const { container } = render(<ResultsTable scheduled={mockScheduled} />)

    // Check that rows have unique keys based on student names
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(3)
    
    // In React, keys aren't directly accessible in DOM, but we can verify
    // that each row contains unique student data
    expect(rows[0]).toHaveTextContent('Alice Smith')
    expect(rows[1]).toHaveTextContent('Bob Johnson')
    expect(rows[2]).toHaveTextContent('Carol White')
  })

  test('handles students with same lesson length correctly', () => {
    const sameLength: Scheduled[] = [
      {
        student: {
          student: { name: 'Student A', email: 'a@test.com', lessonLength: 30 },
          schedule: {
            Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 9, minute: 30 } }],
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          },
          bsched: []
        },
        interval: { start: { i: 0, j: 0 }, end: { i: 0, j: 1 } }
      },
      {
        student: {
          student: { name: 'Student B', email: 'b@test.com', lessonLength: 30 },
          schedule: {
            Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 10, minute: 30 } }],
            Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
          },
          bsched: []
        },
        interval: { start: { i: 0, j: 2 }, end: { i: 0, j: 3 } }
      }
    ]

    render(<ResultsTable scheduled={sameLength} />)

    expect(screen.getByText('Student A')).toBeInTheDocument()
    expect(screen.getByText('Student B')).toBeInTheDocument()
    
    // Both should show Monday
    const mondayElements = screen.getAllByText('Monday')
    expect(mondayElements).toHaveLength(2)
  })

  test('handles different days of the week', () => {
    const allDays: Scheduled[] = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ].map((day, index) => ({
      student: {
        student: { name: `${day} Student`, email: `${day.toLowerCase()}@test.com`, lessonLength: 30 },
        schedule: {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [],
          [day]: [{ start: { hour: 10, minute: 0 }, end: { hour: 10, minute: 30 } }]
        },
        bsched: []
      },
      interval: { start: { i: index, j: 2 }, end: { i: index, j: 3 } }
    }))

    render(<ResultsTable scheduled={allDays} />)

    // Verify all days are displayed
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
      expect(screen.getByText(`${day} Student`)).toBeInTheDocument()
    })
  })

  test('maintains table structure with special characters in names', () => {
    const specialNames: Scheduled[] = [{
      student: {
        student: { name: "O'Brien, Mary-Jane", email: 'mary.jane@test.com', lessonLength: 30 },
        schedule: {
          Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 10, minute: 30 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        },
        bsched: []
      },
      interval: { start: { i: 0, j: 2 }, end: { i: 0, j: 3 } }
    }]

    render(<ResultsTable scheduled={specialNames} />)

    expect(screen.getByText("O'Brien, Mary-Jane")).toBeInTheDocument()
  })
})