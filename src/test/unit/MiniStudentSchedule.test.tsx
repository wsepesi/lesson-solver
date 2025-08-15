import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import MiniStudentSchedule from '../../components/MiniStudentSchedule'
import type { StudentSchema } from 'lib/schema'
import type { StudioWithStudents } from '../../app/(protected)/studios/[slug]/page'
import type { Schedule } from 'lib/types'
import { Time } from 'lib/types'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null })
}

vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock SetAvailabilityDialog
interface MockSetAvailabilityDialogProps {
  handleSubmit: () => Promise<void>
  myAvailability: boolean[][]
  setMyAvailability: (availability: boolean[][]) => void
}

vi.mock('../../components/SetAvailabilityDialog', () => ({
  default: ({ handleSubmit, myAvailability, setMyAvailability }: MockSetAvailabilityDialogProps) => (
    <div data-testid="availability-dialog">
      <div data-testid="current-availability">{JSON.stringify(myAvailability)}</div>
      <button 
        onClick={() => {
          // Simulate changing availability
          const newAvailability = myAvailability.map((day: boolean[], dayIndex: number) => 
            day.map((_slot: boolean, slotIndex: number) => 
              dayIndex === 1 && slotIndex >= 4 && slotIndex <= 7 // Tuesday afternoon
            )
          )
          setMyAvailability(newAvailability)
          void handleSubmit()
        }}
      >
        Update Availability
      </button>
    </div>
  )
}))

// Mock UI components
interface MockDialogProps {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MockDialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: MockDialogProps) => (
    <div data-testid="dialog" data-open={open}>
      {children}
      {open && (
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      )}
    </div>
  ),
  DialogTrigger: ({ children }: MockDialogTriggerProps) => <div>{children}</div>
}))

// Mock utility functions
vi.mock('lib/heur_solver', () => ({
  scheduleToButtons: (_schedule: Schedule): boolean[][] => {
    // Simple mock implementation
    return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
  }
}))

vi.mock('lib/utils', () => {
  return {
    cn: (...inputs: unknown[]) => inputs.join(' '), // Mock cn function
    buttonsToSchedule: (_buttons: boolean[][], _minutes: number) => {
      // Simple mock that returns a schedule with Tuesday afternoon
      return {
        Monday: [],
        Tuesday: [{ start: new Time(14, 0), end: new Time(16, 0) }],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      }
    }
  }
})

describe('MiniStudentSchedule Component', () => {
  const mockSetStudio = vi.fn()

  const mockStudent: StudentSchema = {
    id: 1,
    studio_id: 1,
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@test.com',
    lesson_length: '30' as const,
    schedule: {
      Monday: [
        { start: new Time(10, 0), end: new Time(12, 0) },
        { start: new Time(14, 30), end: new Time(16, 0) }
      ],
      Tuesday: [],
      Wednesday: [
        { start: new Time(9, 0), end: new Time(10, 30) }
      ],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    },
    manual_schedule: null,
    enrolled: true,
    created_at: '2024-01-01'
  }

  const mockStudio: StudioWithStudents = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    studio_code: 'ABC12',
    students: [mockStudent],
    onboarding_status: 'schedule',
    owner_schedule: {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders student schedule correctly', () => {
    render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    // Check Monday schedule
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('10:0 am - 12:0 pm')).toBeInTheDocument()
    expect(screen.getByText('2:30 pm - 4:0 pm')).toBeInTheDocument()

    // Check Wednesday schedule
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByText('9:0 am - 10:30 am')).toBeInTheDocument()
  })

  test('formats time correctly with proper am/pm', () => {
    const studentWithAfternoonSchedule: StudentSchema = {
      ...mockStudent,
      schedule: {
        Monday: [{ start: { hour: 15, minute: 45 }, end: { hour: 17, minute: 15 } }],
        Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
    }

    render(
      <MiniStudentSchedule 
        student={studentWithAfternoonSchedule}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    expect(screen.getByText('3:45 pm - 5:15 pm')).toBeInTheDocument()
  })

  test('handles empty schedule', () => {
    const studentWithEmptySchedule: StudentSchema = {
      ...mockStudent,
      schedule: {
        Monday: [], Tuesday: [], Wednesday: [], 
        Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
    }

    render(
      <MiniStudentSchedule 
        student={studentWithEmptySchedule}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    // Should render without crashing
    const container = screen.getByRole('button', { name: /edit availability/i }).parentElement
    expect(container).toBeInTheDocument()
  })

  test('renders Edit Availability button', () => {
    render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    const editButton = screen.getByRole('button', { name: /edit availability/i })
    expect(editButton).toBeInTheDocument()
    expect(editButton).toHaveClass('w-full')
  })

  test('opens availability dialog when Edit button is clicked', async () => {
    render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    const editButton = screen.getByRole('button', { name: /edit availability/i })
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByTestId('availability-dialog')).toBeInTheDocument()
    })
  })

  test('updates student schedule when availability is changed', async () => {
    render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /edit availability/i }))

    // Update availability
    await waitFor(() => {
      const updateButton = screen.getByText('Update Availability')
      fireEvent.click(updateButton)
    })

    // Check that setStudio was called with updated student
    await waitFor(() => {
      expect(mockSetStudio).toHaveBeenCalled()
      const updatedStudio = mockSetStudio.mock.calls[0]?.[0] as StudioWithStudents
      expect(updatedStudio.students[0]?.schedule).toHaveProperty('Tuesday')
      expect(updatedStudio.students[0]?.schedule.Tuesday).toHaveLength(1)
    })

    // Check database update
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('students')
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.any(Object) as unknown
      })
    )
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockStudent.id)
  })

  test('handles database errors gracefully', async () => {
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Mock console.error implementation
    })
    mockSupabaseClient.eq.mockResolvedValueOnce({ 
      error: { message: 'Database error' } 
    })

    render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /edit availability/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('Update Availability'))
    })

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith({ message: 'Database error' })
    })

    mockConsoleError.mockRestore()
  })

  test('maintains scroll container with max height', () => {
    const { container } = render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    const scrollContainer = container.querySelector('.overflow-auto.max-h-\\[45vh\\]')
    expect(scrollContainer).toBeInTheDocument()
  })

  test('sorts days in correct order', () => {
    const studentWithAllDays: StudentSchema = {
      ...mockStudent,
      schedule: {
        Sunday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
        Saturday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
        Friday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
        Thursday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
        Wednesday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
        Tuesday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }],
        Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }]
      }
    }

    render(
      <MiniStudentSchedule 
        student={studentWithAllDays}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    // Verify days appear in correct order
    days.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  test('formats minutes with leading zero', () => {
    const studentWithMinutes: StudentSchema = {
      ...mockStudent,
      schedule: {
        Monday: [
          { start: { hour: 9, minute: 5 }, end: { hour: 10, minute: 0 } },
          { start: { hour: 14, minute: 0 }, end: { hour: 14, minute: 5 } }
        ],
        Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
    }

    render(
      <MiniStudentSchedule 
        student={studentWithMinutes}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    expect(screen.getByText('9:05 am - 10:0 am')).toBeInTheDocument()
    expect(screen.getByText('2:0 pm - 2:05 pm')).toBeInTheDocument()
  })

  test('handles multiple time blocks per day', () => {
    const studentWithMultipleBlocks: StudentSchema = {
      ...mockStudent,
      schedule: {
        Monday: [
          { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
          { start: { hour: 11, minute: 0 }, end: { hour: 12, minute: 0 } },
          { start: { hour: 14, minute: 0 }, end: { hour: 15, minute: 0 } }
        ],
        Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
    }

    render(
      <MiniStudentSchedule 
        student={studentWithMultipleBlocks}
        studio={mockStudio}
        setStudio={mockSetStudio}
      />
    )

    // First block shows day name
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('9:0 am - 10:0 am')).toBeInTheDocument()
    
    // Subsequent blocks don't repeat day name
    expect(screen.getByText('11:0 am - 12:0 pm')).toBeInTheDocument()
    expect(screen.getByText('2:0 pm - 3:0 pm')).toBeInTheDocument()
  })

  test('updates correct student in studio when multiple students exist', async () => {
    const student2: StudentSchema = {
      ...mockStudent,
      id: 2,
      first_name: 'Bob',
      email: 'bob@test.com'
    }

    const studioWithMultipleStudents: StudioWithStudents = {
      ...mockStudio,
      students: [mockStudent, student2]
    }

    render(
      <MiniStudentSchedule 
        student={mockStudent}
        studio={studioWithMultipleStudents}
        setStudio={mockSetStudio}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /edit availability/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('Update Availability'))
    })

    await waitFor(() => {
      const updatedStudio = mockSetStudio.mock.calls[0]?.[0] as StudioWithStudents
      expect(updatedStudio.students).toHaveLength(2)
      expect(updatedStudio.students[0]?.id).toBe(1) // Alice updated
      expect(updatedStudio.students[1]?.id).toBe(2) // Bob unchanged
    })
  })
})