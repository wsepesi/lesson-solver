import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import SolveScheduleDialog from '../../components/SolveScheduleDialog'
// Unused import removed
import type { StudioWithStudents } from '../../app/(protected)/studios/[slug]/page'
import { Time } from 'lib/types'

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
vi.mock('lib/utils', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal()
  return {
    ...actual,
    cn: (...inputs: unknown[]) => inputs.join(' '), // Mock cn function
  }
})

// Mock UI components
vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}))

vi.mock('../../components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  FormField: ({ render }: { render: (props: { field: { onChange: () => void; value: string } }) => React.ReactNode }) => render({ field: { onChange: vi.fn(), value: '' } }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useForm: () => ({
    control: {},
    handleSubmit: (fn: (data: { consecutiveHours: string; breakLength: string }) => void) => (e?: { preventDefault?: () => void }) => {
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
  Combobox: ({ value, setValue, options }: { value: string; setValue: (value: string) => void; options: { value: string; label: string }[] }) => (
    <div data-testid="combobox">
      <button onClick={() => setValue(options[0]?.value ?? '')}>
        Current: {value}
      </button>
      {options.map((opt: { value: string; label: string }) => (
        <div key={opt.value} data-testid={`option-${opt.value}`}>
          {opt.label}
        </div>
      ))}
    </div>
  )
}))

describe('SolveScheduleDialog Component', () => {
  const mockSetStudio = vi.fn()
  const mockSetSchedule = vi.fn()
  const mockSetEvents = vi.fn()
  const mockSetTaskStatus = vi.fn()

  const validStudio: StudioWithStudents = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    code: 'ABC12',
    students: [
      {
        id: 1,
        studio_id: 1,
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@test.com',
        lesson_length: '30' as const,
        schedule: {
          Monday: [{ start: new Time(10, 0), end: new Time(12, 0) }],
          Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      }
    ],
    owner_schedule: {
      Monday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    },
    events: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders dialog content with correct elements', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[true, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    expect(screen.getByText('Schedule your bookings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
  })

  test('handles task status and renders appropriate content', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[false, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    expect(screen.getByText('Schedule your bookings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
  })

  test('renders combobox options for configuration', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[true, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    // Check that comboboxes are rendered
    const comboboxes = screen.getAllByTestId('combobox')
    expect(comboboxes.length).toBe(2) // length and break length
  })

  test('renders schedule button that can be clicked', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[true, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    const button = screen.getByRole('button', { name: /schedule/i })
    expect(button).toBeInTheDocument()
    
    // Test that button can be clicked
    fireEvent.click(button)
    // Button click should trigger schedule generation
  })

  test('displays form with consecutive hours and break length options', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[true, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    expect(screen.getByText(/Create a schedule with no more than/)).toBeInTheDocument()
    expect(screen.getByText(/hours of back-to-back events/)).toBeInTheDocument()
  })

  test('shows correct options in comboboxes', () => {
    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[true, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    // Check break length options (values are in minutes)
    expect(screen.getByTestId('option-30')).toBeInTheDocument()
    expect(screen.getByTestId('option-60')).toBeInTheDocument()
  })

  test('successfully generates schedule when button is clicked', async () => {
    const { solve } = await import('../../../lib/heur_solver')

    render(
      <SolveScheduleDialog 
        studio={validStudio}
        taskStatus={[true, true]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        schedule={null}
        setSchedule={mockSetSchedule}
        setEvents={mockSetEvents}
        setStudio={mockSetStudio}
      />
    )

    const button = screen.getByRole('button', { name: /schedule/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(solve).toHaveBeenCalled()
    })
  })
})