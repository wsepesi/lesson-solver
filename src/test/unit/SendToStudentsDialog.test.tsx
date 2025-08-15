import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import SendToStudentsDialog from '../../components/SendToStudentsDialog'
import type { StudioWithStudents } from '../../app/(protected)/studios/[slug]/page'

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  asChild?: boolean
}

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: string
}

// Mock UI components
vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: DialogProps) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: DialogProps) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: DialogProps) => <div>{children}</div>,
  DialogHeader: ({ children }: DialogProps) => <div>{children}</div>,
  DialogTitle: ({ children }: DialogProps) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: DialogProps) => <div>{children}</div>,
  DialogFooter: ({ children }: DialogProps) => <div data-testid="dialog-footer">{children}</div>,
}))

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: ButtonProps) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={variant}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

describe('SendToStudentsDialog Component', () => {
  const mockSetTaskStatus = vi.fn()
  const mockSetOpen = vi.fn()
  
  const mockStudio: StudioWithStudents = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    code: 'ABC12',
    students: [],
    onboarding_status: 'invite',
    owner_schedule: {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders dialog content correctly', () => {
    render(
      <SendToStudentsDialog 
        taskStatus={[false, false, false]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={1}
        setOpen={mockSetOpen}
        studio={mockStudio}
      />
    )

    expect(screen.getByText('Send out an availability survey')).toBeInTheDocument()
    expect(screen.getByText(/The studio code is already included in the link/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /lesson-solver.vercel.app\/enroll\?code=ABC12/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  test('calls setOpen and setTaskStatus when done button is clicked', () => {
    render(
      <SendToStudentsDialog 
        taskStatus={[false, false, false]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={1}
        setOpen={mockSetOpen}
        studio={mockStudio}
      />
    )

    const doneButton = screen.getByRole('button', { name: /done/i })
    fireEvent.click(doneButton)

    expect(mockSetTaskStatus).toHaveBeenCalledWith([false, true, false])
    expect(mockSetOpen).toHaveBeenCalledWith(false)
  })

  test('displays studio code correctly', () => {
    const studioWithDifferentCode: StudioWithStudents = {
      ...mockStudio,
      code: 'XYZ99'
    }

    render(
      <SendToStudentsDialog 
        taskStatus={[false, false, false]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={0}
        setOpen={mockSetOpen}
        studio={studioWithDifferentCode}
      />
    )

    expect(screen.getByRole('link', { name: /lesson-solver.vercel.app\/enroll\?code=XYZ99/ })).toBeInTheDocument()
  })

  test('updates task status correctly for different task indices', () => {
    render(
      <SendToStudentsDialog 
        taskStatus={[false, false, false, false]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={2}
        setOpen={mockSetOpen}
        studio={mockStudio}
      />
    )

    const doneButton = screen.getByRole('button', { name: /done/i })
    fireEvent.click(doneButton)

    expect(mockSetTaskStatus).toHaveBeenCalledWith([false, false, true, false])
  })

  test('contains enrollment link', () => {
    render(
      <SendToStudentsDialog 
        taskStatus={[false, false, false]}
        setTaskStatus={mockSetTaskStatus}
        taskIdx={1}
        setOpen={mockSetOpen}
        studio={mockStudio}
      />
    )

    const enrollmentLink = screen.getByRole('link', { name: /lesson-solver.vercel.app\/enroll\?code=ABC12/ })
    expect(enrollmentLink).toHaveAttribute('href', 'https://lesson-solver.vercel.app/enroll?code=ABC12')
  })
})