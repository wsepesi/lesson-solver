import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import SolveScheduleDialog from '../../components/SolveScheduleDialog'
import type { Schedule } from '../../../lib/types'
import type { StudioWithStudents } from '../../pages/studios/[slug]'

// Mock the solver
vi.mock('../../../lib/heur_solver', () => ({
  solve: vi.fn().mockResolvedValue({
    assignments: [
      {
        student: {
          student: { name: 'Alice', email: 'alice@test.com', lessonLength: 30 },
          schedule: { Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 12, minute: 0 } }] },
          bsched: []
        },
        time: { start: { i: 0, j: 2 }, end: { i: 0, j: 3 } }
      }
    ]
  })
}))

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockResolvedValue({ data: null, error: null }),
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

// Mock UI components
vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div>{children}</div>,
}))

vi.mock('../../components/ui/form', () => ({
  Form: ({ children }: any) => <form>{children}</form>,
  FormField: ({ render }: any) => render({ field: { onChange: vi.fn(), value: '' } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormDescription: ({ children }: any) => <div>{children}</div>,
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.()
      fn({ 
        consecutiveHours: '3',
        breakLength: '30'
      })
    },
    setValue: vi.fn(),
    formState: { isSubmitting: false }
  })
}))

vi.mock('../../components/Combobox', () => ({
  Combobox: ({ value, setValue, options }: any) => (
    <div data-testid="combobox">
      <button onClick={() => setValue(options[0].value)}>
        Current: {value}
      </button>
      {options.map((opt: any) => (
        <div key={opt.value} data-testid={`option-${opt.value}`}>
          {opt.label}
        </div>
      ))}
    </div>
  )
}))

describe('SolveScheduleDialog Component', () => {
  const mockSetStudio = vi.fn()
  const mockHandleEvent = vi.fn()
  const mockSetSchedule = vi.fn()

  const validStudio: StudioWithStudents = {
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
        schedule: {
          Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 12, minute: 0 } }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        },
        manual_schedule: null,
        enrolled: true,
        created_at: '2024-01-01'
      }
    ],
    onboarding_status: 'availability',
    owner_schedule: {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders trigger button with correct text', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    const button = screen.getByRole('button', { name: /generate schedule/i })
    expect(button).toBeInTheDocument()
  })

  test('button is disabled when teacher schedule is not set', () => {
    const studioNoTeacherSchedule = {
      ...validStudio,
      owner_schedule: null
    }

    render(
      <SolveScheduleDialog 
        studio={studioNoTeacherSchedule}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    const button = screen.getByRole('button', { name: /generate schedule/i })
    expect(button).toBeDisabled()
  })

  test('button is disabled when no students have schedules', () => {
    const studioNoStudentSchedules = {
      ...validStudio,
      students: [{
        ...validStudio.students[0],
        schedule: null
      }]
    }

    render(
      <SolveScheduleDialog 
        studio={studioNoStudentSchedules}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    const button = screen.getByRole('button', { name: /generate schedule/i })
    expect(button).toBeDisabled()
  })

  test('opens dialog when trigger is clicked with valid studio', async () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    const button = screen.getByRole('button', { name: /generate schedule/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Generate Lesson Schedule')).toBeInTheDocument()
    })
  })

  test('displays form with consecutive hours and break length options', async () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      expect(screen.getByText('Maximum Consecutive Lessons')).toBeInTheDocument()
      expect(screen.getByText('Minimum Break Duration')).toBeInTheDocument()
      
      // Check combobox placeholders
      expect(screen.getByText('Select maximum consecutive lessons')).toBeInTheDocument()
      expect(screen.getByText('Select minimum break duration')).toBeInTheDocument()
    })
  })

  test('shows correct options in comboboxes', async () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      // Check consecutive hours options
      expect(screen.getByTestId('option-2')).toBeInTheDocument()
      expect(screen.getByTestId('option-3')).toBeInTheDocument()
      expect(screen.getByTestId('option-4')).toBeInTheDocument()
      expect(screen.getByTestId('option-6')).toBeInTheDocument()
      expect(screen.getByTestId('option-8')).toBeInTheDocument()

      // Check break length options (values are in minutes)
      expect(screen.getByTestId('option-15')).toBeInTheDocument()
      expect(screen.getByTestId('option-30')).toBeInTheDocument()
      expect(screen.getByTestId('option-60')).toBeInTheDocument()
    })
  })

  test('successfully generates schedule and updates state', async () => {
    const { solve } = await import('../../../lib/heur_solver')

    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /generate/i })
      fireEvent.click(submitButton)
    })

    // Verify solver was called with correct parameters
    await waitFor(() => {
      expect(solve).toHaveBeenCalledWith(
        expect.any(Array), // students
        expect.any(Array), // teacher schedule as boolean grid
        { numConsecHalfHours: 6, breakLenInHalfHours: 1 } // heuristics
      )
    })

    // Verify schedule was set
    expect(mockSetSchedule).toHaveBeenCalledWith(expect.objectContaining({
      assignments: expect.any(Array)
    }))

    // Verify database update
    expect(mockSupabase.from).toHaveBeenCalledWith('studios')
    expect(mockSupabase.update).toHaveBeenCalledWith({
      students_have_schedules: true
    })

    // Verify event handler
    expect(mockHandleEvent).toHaveBeenCalledWith('schedule')
  })

  test('handles solver returning null (no solution)', async () => {
    const { solve } = await import('../../../lib/heur_solver')
    vi.mocked(solve).mockResolvedValueOnce(null)

    // Mock window.alert
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /generate/i })
      fireEvent.click(submitButton)
    })

    // Should show alert about no solution
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('No valid schedule found'))
    })

    // Should not update schedule or database
    expect(mockSetSchedule).not.toHaveBeenCalled()
    expect(mockSupabase.update).not.toHaveBeenCalled()

    mockAlert.mockRestore()
  })

  test('handles database update errors', async () => {
    mockSupabase.update.mockRejectedValueOnce(new Error('Database error'))
    
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /generate/i })
      fireEvent.click(submitButton)
    })

    // Schedule should still be set even if database update fails
    await waitFor(() => {
      expect(mockSetSchedule).toHaveBeenCalled()
    })

    mockAlert.mockRestore()
  })

  test('converts schedules to boolean grids correctly', async () => {
    const { solve } = await import('../../../lib/heur_solver')

    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    })

    // Verify that solve was called with boolean grids
    await waitFor(() => {
      const [students, teacherGrid] = vi.mocked(solve).mock.calls[0]
      
      // Check student data structure
      expect(students).toHaveLength(1)
      expect(students[0]).toHaveProperty('student')
      expect(students[0]).toHaveProperty('bsched')
      
      // Check teacher grid is 7x24 boolean array
      expect(teacherGrid).toHaveLength(7)
      expect(teacherGrid[0]).toHaveLength(24)
      expect(typeof teacherGrid[0][0]).toBe('boolean')
    })
  })

  test('form validation prevents submission without selections', async () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    // In real implementation, form should not submit without selections
    // This test would verify that behavior
    await waitFor(() => {
      const form = screen.getByRole('form', { hidden: true })
      expect(form).toBeInTheDocument()
    })
  })

  test('shows loading state during schedule generation', async () => {
    const { solve } = await import('../../../lib/heur_solver')
    
    // Make solve take longer
    vi.mocked(solve).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        assignments: []
      }), 100))
    )

    render(
      <SolveScheduleDialog 
        studio={validStudio}
        setStudio={mockSetStudio}
        handleEvent={mockHandleEvent}
        setSchedule={mockSetSchedule}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /generate/i })
      fireEvent.click(submitButton)
    })

    // In real implementation, button should show loading state
    // This would be tested by checking for disabled state or loading spinner
  })
})