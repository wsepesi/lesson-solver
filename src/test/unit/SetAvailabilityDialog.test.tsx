import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import SetAvailabilityDialog from '../../components/SetAvailabilityDialog'
import type { Schedule } from '../../../lib/types'

// Mock the CalendarHandler component
vi.mock('../../components/CalendarHandler', () => ({
  default: ({ onSubmit, schedule }: any) => (
    <div data-testid="calendar-handler">
      <div data-testid="current-schedule">{JSON.stringify(schedule)}</div>
      <button 
        onClick={() => {
          // Simulate setting availability for Monday 9-5 and Wednesday 10-2
          const newSchedule = {
            Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
            Tuesday: [],
            Wednesday: [{ start: { hour: 10, minute: 0 }, end: { hour: 14, minute: 0 } }],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
          }
          onSubmit(newSchedule)
        }}
      >
        Save Availability
      </button>
      <button 
        onClick={() => {
          // Test with empty schedule
          const emptySchedule = {
            Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
            Friday: [], Saturday: [], Sunday: []
          }
          onSubmit(emptySchedule)
        }}
      >
        Clear Availability
      </button>
    </div>
  )
}))

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div>{children}</div>,
}))

// Mock lib/utils
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    cn: (...inputs: any[]) => inputs.join(' '), // Mock cn function
  }
})

describe('SetAvailabilityDialog Component', () => {
  const mockHandleEvent = vi.fn()
  const mockSetEditAvailability = vi.fn()
  
  const defaultAvailability: Schedule = {
    Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } }],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders trigger button with correct icon and text', () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    const button = screen.getByRole('button', { name: /set availability/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('hover:bg-accent')
  })

  test('opens dialog when trigger button is clicked', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    // Dialog should not be visible initially
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()

    // Click trigger button
    const triggerButton = screen.getByRole('button', { name: /set availability/i })
    fireEvent.click(triggerButton)

    // Dialog should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  test('displays dialog header and description', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      expect(screen.getByText('Set Your Availability')).toBeInTheDocument()
      expect(screen.getByText(/click on the calendar to select your available time slots/i)).toBeInTheDocument()
    })
  })

  test('renders CalendarHandler with current availability', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      const calendarHandler = screen.getByTestId('calendar-handler')
      expect(calendarHandler).toBeInTheDocument()
      
      // Check that current schedule is passed to CalendarHandler
      const scheduleDisplay = screen.getByTestId('current-schedule')
      expect(scheduleDisplay.textContent).toContain('Monday')
      expect(scheduleDisplay.textContent).toContain('"hour":9')
      expect(scheduleDisplay.textContent).toContain('"hour":12')
    })
  })

  test('updates availability when calendar is submitted', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      const saveButton = screen.getByText('Save Availability')
      fireEvent.click(saveButton)
    })

    // Verify setEditAvailability was called with new schedule
    await waitFor(() => {
      expect(mockSetEditAvailability).toHaveBeenCalledWith({
        Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
        Tuesday: [],
        Wednesday: [{ start: { hour: 10, minute: 0 }, end: { hour: 14, minute: 0 } }],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      })
    })

    // Verify event was triggered
    expect(mockHandleEvent).toHaveBeenCalledWith('availability')
  })

  test('handles empty availability submission', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      const clearButton = screen.getByText('Clear Availability')
      fireEvent.click(clearButton)
    })

    // Should still call setEditAvailability even with empty schedule
    await waitFor(() => {
      expect(mockSetEditAvailability).toHaveBeenCalledWith({
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
        Friday: [], Saturday: [], Sunday: []
      })
    })

    expect(mockHandleEvent).toHaveBeenCalledWith('availability')
  })

  test('dialog has correct max width class', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      const dialogContent = screen.getByTestId('dialog-content')
      expect(dialogContent).toHaveClass('max-w-3xl')
    })
  })

  test('maintains state between dialog open/close', async () => {
    const { rerender } = render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    // Save new availability
    await waitFor(() => {
      fireEvent.click(screen.getByText('Save Availability'))
    })

    // Update props with new availability
    const newAvailability = {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [],
      Wednesday: [{ start: { hour: 10, minute: 0 }, end: { hour: 14, minute: 0 } }],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }

    rerender(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={newAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    // Open dialog again
    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    // Should show updated availability
    await waitFor(() => {
      const scheduleDisplay = screen.getByTestId('current-schedule')
      expect(scheduleDisplay.textContent).toContain('"hour":17')
      expect(scheduleDisplay.textContent).toContain('Wednesday')
    })
  })

  test('handles rapid submit clicks gracefully', async () => {
    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={defaultAvailability}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      const saveButton = screen.getByText('Save Availability')
      // Click multiple times rapidly
      fireEvent.click(saveButton)
      fireEvent.click(saveButton)
      fireEvent.click(saveButton)
    })

    // Should only call handlers once per submit
    await waitFor(() => {
      expect(mockSetEditAvailability).toHaveBeenCalledTimes(3)
      expect(mockHandleEvent).toHaveBeenCalledTimes(3)
    })
  })

  test('preserves existing schedule when reopening dialog', async () => {
    const complexSchedule: Schedule = {
      Monday: [
        { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
        { start: { hour: 14, minute: 0 }, end: { hour: 17, minute: 0 } }
      ],
      Tuesday: [{ start: { hour: 10, minute: 30 }, end: { hour: 15, minute: 30 } }],
      Wednesday: [],
      Thursday: [{ start: { hour: 11, minute: 0 }, end: { hour: 13, minute: 0 } }],
      Friday: [],
      Saturday: [],
      Sunday: []
    }

    render(
      <SetAvailabilityDialog 
        handleEvent={mockHandleEvent}
        editAvailability={complexSchedule}
        setEditAvailability={mockSetEditAvailability}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /set availability/i }))

    await waitFor(() => {
      const scheduleDisplay = screen.getByTestId('current-schedule')
      const scheduleData = scheduleDisplay.textContent || ''
      
      // Verify all time blocks are preserved
      expect(scheduleData).toContain('Monday')
      expect(scheduleData).toContain('Tuesday')
      expect(scheduleData).toContain('Thursday')
      expect(scheduleData).toContain('"hour":14')
      expect(scheduleData).toContain('"minute":30')
    })
  })
})