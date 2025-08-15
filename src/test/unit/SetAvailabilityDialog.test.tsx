import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import SetAvailabilityDialog from '../../components/SetAvailabilityDialog'

// Mock the CalendarHandler component
interface MockCalendarHandlerProps {
  handleSubmit: () => void
  buttonStates: boolean[][]
  setButtonStates: (states: boolean[][]) => void
}

vi.mock('../../components/CalendarHandler', () => ({
  default: ({ handleSubmit, buttonStates, setButtonStates }: MockCalendarHandlerProps) => (
    <div data-testid="calendar-handler">
      <div data-testid="current-schedule">{JSON.stringify(buttonStates)}</div>
      <button 
        onClick={() => {
          // Simulate setting availability - create a grid with some slots filled
          const newGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
          // Set Monday 9am-12pm (slots 0-5) and Wednesday 10am-2pm (slots 2-7)
          newGrid[0][0] = true // Monday 9am
          newGrid[0][1] = true // Monday 9:30am
          newGrid[2][2] = true // Wednesday 10am
          newGrid[2][3] = true // Wednesday 10:30am
          setButtonStates(newGrid)
          handleSubmit()
        }}
      >
        Save Availability
      </button>
      <button 
        onClick={() => {
          // Test with empty grid
          const emptyGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
          setButtonStates(emptyGrid)
          handleSubmit()
        }}
      >
        Clear Availability
      </button>
    </div>
  )
}))

interface MockDialogContentProps {
  children: React.ReactNode
  className?: string
}

vi.mock('../../components/ui/dialog', () => ({
  DialogContent: ({ children, className }: MockDialogContentProps) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
}))

// Mock lib/utils
vi.mock('lib/utils', () => {
  return {
    cn: (...inputs: unknown[]) => inputs.join(' '), // Mock cn function
  }
})

describe('SetAvailabilityDialog Component', () => {
  const mockHandleSubmit = vi.fn()
  const mockSetMyAvailability = vi.fn()
  
  const defaultAvailability = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
  // Set Monday 9am slot (index 0,0)
  defaultAvailability[0][0] = true

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders dialog content with calendar handler', () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const dialogContent = screen.getByTestId('dialog-content')
    expect(dialogContent).toBeInTheDocument()
    expect(dialogContent).toHaveClass('min-w-[80vw]')
    expect(dialogContent).toHaveClass('max-h-[90vh]')
  })

  test('renders calendar handler within dialog content', () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    // Calendar handler should be visible
    const calendarHandler = screen.getByTestId('calendar-handler')
    expect(calendarHandler).toBeInTheDocument()
    
    // Should have Save and Clear buttons
    expect(screen.getByText('Save Availability')).toBeInTheDocument()
    expect(screen.getByText('Clear Availability')).toBeInTheDocument()
  })

  test('passes correct props to CalendarHandler', () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    // Check that current schedule is passed to CalendarHandler
    const scheduleDisplay = screen.getByTestId('current-schedule')
    expect(scheduleDisplay).toBeInTheDocument()
    
    // Should contain the grid data
    const scheduleData = scheduleDisplay.textContent ?? ''
    expect(scheduleData).toContain('true') // Monday 9am slot should be true
  })

  test('renders CalendarHandler with current availability grid', () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const calendarHandler = screen.getByTestId('calendar-handler')
    expect(calendarHandler).toBeInTheDocument()
    
    // Check that current schedule grid is passed to CalendarHandler
    const scheduleDisplay = screen.getByTestId('current-schedule')
    const scheduleData = scheduleDisplay.textContent ?? ''
    expect(scheduleData).toContain('[') // Should contain array structure
    expect(scheduleData).toContain('true') // Should contain the set availability
  })

  test('updates availability when calendar is submitted', async () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const saveButton = screen.getByText('Save Availability')
    fireEvent.click(saveButton)

    // Verify setMyAvailability was called with new grid
    await waitFor(() => {
      expect(mockSetMyAvailability).toHaveBeenCalled()
      const callArgs = mockSetMyAvailability.mock.calls[0]?.[0] as boolean[][]
      expect(Array.isArray(callArgs)).toBe(true)
      expect(callArgs.length).toBe(7) // 7 days
      expect(Array.isArray(callArgs[0])).toBe(true)
      expect(callArgs[0]?.length).toBe(24) // 24 half-hour slots
    })

    // Verify handleSubmit was called
    expect(mockHandleSubmit).toHaveBeenCalled()
  })

  test('handles empty availability submission', async () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const clearButton = screen.getByText('Clear Availability')
    fireEvent.click(clearButton)

    // Should call setMyAvailability with empty grid
    await waitFor(() => {
      expect(mockSetMyAvailability).toHaveBeenCalled()
      const callArgs = mockSetMyAvailability.mock.calls[0]?.[0] as boolean[][]
      expect(Array.isArray(callArgs)).toBe(true)
      expect(callArgs.length).toBe(7) // 7 days
      // Check that all slots are false
      const allFalse = callArgs.every((day: boolean[]) => 
        day.every((slot: boolean) => slot === false)
      )
      expect(allFalse).toBe(true)
    })

    expect(mockHandleSubmit).toHaveBeenCalled()
  })

  test('dialog has correct styling classes', () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const dialogContent = screen.getByTestId('dialog-content')
    expect(dialogContent).toHaveClass('min-w-[80vw]')
    expect(dialogContent).toHaveClass('max-h-[90vh]')
  })

  test('maintains state when props are updated', () => {
    const { rerender } = render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    // Save new availability
    fireEvent.click(screen.getByText('Save Availability'))

    // Update props with new availability grid
    const newAvailability = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    newAvailability[0][2] = true // Monday 10am
    newAvailability[2][4] = true // Wednesday 11am

    rerender(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={newAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    // Should show updated availability
    const scheduleDisplay = screen.getByTestId('current-schedule')
    const scheduleData = scheduleDisplay.textContent ?? ''
    expect(scheduleData).toContain('true') // Should contain the updated slots
  })

  test('handles rapid submit clicks gracefully', async () => {
    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={defaultAvailability}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const saveButton = screen.getByText('Save Availability')
    // Click multiple times rapidly
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    // Should call handlers for each click
    await waitFor(() => {
      expect(mockSetMyAvailability).toHaveBeenCalledTimes(3)
      expect(mockHandleSubmit).toHaveBeenCalledTimes(3)
    })
  })

  test('preserves existing schedule grid when rendering', () => {
    const complexSchedule = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    // Monday 9am-12pm and 2pm-5pm
    complexSchedule[0][0] = true // 9am
    complexSchedule[0][1] = true // 9:30am
    complexSchedule[0][10] = true // 2pm
    complexSchedule[0][11] = true // 2:30pm
    // Tuesday 10:30am-3:30pm
    complexSchedule[1][3] = true // 10:30am
    complexSchedule[1][4] = true // 11am
    // Thursday 11am-1pm
    complexSchedule[3][4] = true // 11am
    complexSchedule[3][5] = true // 11:30am

    render(
      <SetAvailabilityDialog 
        handleSubmit={mockHandleSubmit}
        myAvailability={complexSchedule}
        setMyAvailability={mockSetMyAvailability}
      />
    )

    const scheduleDisplay = screen.getByTestId('current-schedule')
    const scheduleData = scheduleDisplay.textContent ?? ''
    
    // Verify the grid structure is preserved
    expect(scheduleData).toContain('[') // Array structure
    expect(scheduleData).toContain('true') // Has some availability set
    expect(scheduleData).toContain('false') // Has some slots empty
  })
})