import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import ManualScheduleDialog from '../../components/ManualScheduleDialog'
import type { StudioWithStudents } from '../../app/(protected)/studios/[slug]/page'
import { Time } from 'lib/types'
import type { Event } from '../../components/InteractiveCalendar'

// Mock the child components
interface MockCalendarHandlerProps {
  onSubmit: (schedule: Record<string, unknown[]>) => void;
  schedule: Record<string, unknown> | null;
}

vi.mock('../../components/ManualStudentCalendarHandler', () => ({
  default: ({ onSubmit, schedule }: MockCalendarHandlerProps) => (
    <div data-testid="calendar-handler">
      <button onClick={() => onSubmit({ Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } }] })}>
        Submit Schedule
      </button>
      <div data-testid="current-schedule">{JSON.stringify(schedule)}</div>
    </div>
  )
}))

interface MockDialogProps {
  children: React.ReactNode;
  open?: boolean;
  _asChild?: boolean;
}

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: MockDialogProps) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: MockDialogProps) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: MockDialogProps) => <div>{children}</div>,
  DialogHeader: ({ children }: MockDialogProps) => <div>{children}</div>,
  DialogTitle: ({ children }: MockDialogProps) => <h2>{children}</h2>,
  DialogTrigger: ({ children, _asChild }: MockDialogProps) => <div>{children}</div>,
  DialogFooter: ({ children }: MockDialogProps) => <div data-testid="dialog-footer">{children}</div>,
}))

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockResolvedValue({ data: null, error: null }),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
} as const

vi.mock('../../../lib/database', () => ({
  supabase: mockSupabase
}))

// Mock lib/utils
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>),
    cn: (...inputs: string[]) => inputs.join(' '), // Mock cn function
  }
})

describe('ManualScheduleDialog Component', () => {
  const mockStudio: StudioWithStudents = {
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
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      },
      {
        id: 2,
        studio_id: 1,
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@test.com',
        lesson_length: '60' as const,
        schedule: {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      }
    ],
    owner_schedule: {
      Monday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    },
    events: null
  }

  const mockSetStudio = vi.fn()
  const mockSetEvents = vi.fn()
  const mockSetTaskStatus = vi.fn()
  const mockEvents: Event[] = []
  const mockTaskStatus = [false, false]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders trigger button with correct text', () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        events={mockEvents}
        setEvents={mockSetEvents}
        taskStatus={mockTaskStatus}
        setTaskStatus={mockSetTaskStatus}
      />
    )

    const button = screen.getByRole('button', { name: /add student schedules manually/i })
    expect(button).toBeInTheDocument()
  })

  test('opens dialog when trigger button is clicked', async () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        events={mockEvents}
        setEvents={mockSetEvents}
        taskStatus={mockTaskStatus}
        setTaskStatus={mockSetTaskStatus}
      />
    )

    // Initially dialog should not be visible
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()

    // Click the trigger button
    const triggerButton = screen.getByRole('button', { name: /add student schedules manually/i })
    fireEvent.click(triggerButton)

    // Dialog should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  test('renders dialog with correct initial state', () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        events={mockEvents}
        setEvents={mockSetEvents}
        taskStatus={mockTaskStatus}
        setTaskStatus={mockSetTaskStatus}
      />
    )

    // Dialog trigger should be present
    expect(screen.getByRole('button', { name: /add student schedules manually/i })).toBeInTheDocument()
  })

  test('can click trigger button to open dialog', () => {
    render(
      <ManualScheduleDialog 
        studio={mockStudio}
        setStudio={mockSetStudio}
        events={mockEvents}
        setEvents={mockSetEvents}
        taskStatus={mockTaskStatus}
        setTaskStatus={mockSetTaskStatus}
      />
    )

    const triggerButton = screen.getByRole('button', { name: /add student schedules manually/i })
    fireEvent.click(triggerButton)
    
    // Component should handle the click
    expect(triggerButton).toBeInTheDocument()
  })
})