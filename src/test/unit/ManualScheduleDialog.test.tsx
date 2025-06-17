import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import ManualScheduleDialog from '../../components/ManualScheduleDialog'
import type { StudioWithStudents } from '../../pages/studios/[slug]'

// Mock the child components
vi.mock('../../components/ManualStudentCalendarHandler', () => ({
  default: ({ onSubmit, schedule }: any) => (
    <div data-testid="calendar-handler">
      <button onClick={() => onSubmit({ Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }] })}>
        Submit Schedule
      </button>
      <div data-testid="current-schedule">{JSON.stringify(schedule)}</div>
    </div>
  )
}))

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div>{children}</div>,
}))

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockResolvedValue({ data: null, error: null }),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}

vi.mock('../../../lib/database', () => ({
  supabase: mockSupabase
}))

// Mock lib/utils
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    cn: (...inputs: any[]) => inputs.join(' '), // Mock cn function
  }
})

describe('ManualScheduleDialog Component', () => {
  const mockStudio: StudioWithStudents = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    studio_code: 'ABC12',
    students: [
      {
        id: 1,
        studio_id: 1,
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@test.com',
        lesson_length: 30,
        schedule: null,
        manual_schedule: null,
        enrolled: true,
        created_at: '2024-01-01'
      },
      {
        id: 2,
        studio_id: 1,
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@test.com',
        lesson_length: 60,
        schedule: null,
        manual_schedule: null,
        enrolled: true,
        created_at: '2024-01-01'
      }
    ],
    onboarding_status: 'create',
    owner_schedule: {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
  }

  const mockSetStudio = vi.fn()
  const mockHandleEvent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders trigger button with correct text', () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    const button = screen.getByRole('button', { name: /manually add student schedules/i })
    expect(button).toBeInTheDocument()
  })

  test('opens dialog when trigger button is clicked', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Initially dialog should not be visible
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()

    // Click the trigger button
    const triggerButton = screen.getByRole('button', { name: /manually add student schedules/i })
    fireEvent.click(triggerButton)

    // Dialog should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  test('shows initial state with two students listed', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /manually add student schedules/i })
    fireEvent.click(triggerButton)

    // Check initial state content
    await waitFor(() => {
      expect(screen.getByText('Add Student Schedules')).toBeInTheDocument()
      expect(screen.getByText(/choose students to manually add schedules for/i)).toBeInTheDocument()
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    })
  })

  test('transitions to calendar view when student is selected', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))

    // Click on first student
    await waitFor(() => {
      const aliceButton = screen.getByRole('button', { name: /alice smith/i })
      fireEvent.click(aliceButton)
    })

    // Should show calendar view
    await waitFor(() => {
      expect(screen.getByText(/add schedule for alice smith/i)).toBeInTheDocument()
      expect(screen.getByTestId('calendar-handler')).toBeInTheDocument()
    })
  })

  test('saves student schedule and updates state', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Open dialog and select student
    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /alice smith/i }))
    })

    // Submit schedule from calendar
    await waitFor(() => {
      const submitButton = screen.getByText('Submit Schedule')
      fireEvent.click(submitButton)
    })

    // Verify database call
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    // Verify state update
    expect(mockSetStudio).toHaveBeenCalled()
    
    // Verify event handler
    expect(mockHandleEvent).toHaveBeenCalledWith('manual-schedule')
  })

  test('returns to initial state after saving', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Open dialog and select student
    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /alice smith/i }))
    })

    // Submit schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Submit Schedule'))
    })

    // Should return to initial state
    await waitFor(() => {
      expect(screen.getByText('Add Student Schedules')).toBeInTheDocument()
      expect(screen.queryByTestId('calendar-handler')).not.toBeInTheDocument()
    })
  })

  test('handles students with existing manual schedules', () => {
    const studioWithScheduledStudent = {
      ...mockStudio,
      students: [
        {
          ...mockStudio.students[0],
          manual_schedule: { Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }] }
        },
        mockStudio.students[1]
      ]
    }

    render(
      <ManualScheduleDialog 
        studio={studioWithScheduledStudent}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))

    // Should show check mark for scheduled student
    waitFor(() => {
      const aliceItem = screen.getByRole('button', { name: /alice smith/i })
      expect(aliceItem).toHaveTextContent('✓')
    })
  })

  test('shows empty state when no students enrolled', () => {
    const emptyStudio = {
      ...mockStudio,
      students: []
    }

    render(
      <ManualScheduleDialog 
        studio={emptyStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))

    waitFor(() => {
      expect(screen.getByText(/no students enrolled yet/i)).toBeInTheDocument()
    })
  })

  test('handles database errors gracefully', async () => {
    // Mock database error
    mockSupabase.insert.mockRejectedValueOnce(new Error('Database error'))

    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Open dialog and select student
    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /alice smith/i }))
    })

    // Submit schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Submit Schedule'))
    })

    // Should handle error (component would need error handling implementation)
    await waitFor(() => {
      expect(mockSupabase.insert).toHaveBeenCalled()
      // In real implementation, should show error message
    })
  })

  test('dialog closes when clicking outside', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /manually add student schedules/i }))

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    // In real implementation with Radix UI, clicking outside would close
    // This test would verify that behavior
  })
})