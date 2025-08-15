import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import Calendar from '../../components/Calendar'

describe('Calendar Component', () => {
  test('renders calendar grid correctly', () => {
    // STEP 1: Create test props based on actual component interface
    const mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    const mockSetButtonStates = vi.fn()
    
    // STEP 2: Render the component with required props
    render(
      <Calendar 
        minutes={30}
        buttonStates={mockButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={24}
      />
    )
    
    // STEP 3: Check that the calendar structure exists
    // Look for day headers (Monday, Tuesday, etc.)
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByText('Thursday')).toBeInTheDocument()
    expect(screen.getByText('Friday')).toBeInTheDocument()
    expect(screen.getByText('Saturday')).toBeInTheDocument()
    expect(screen.getByText('Sunday')).toBeInTheDocument()
    
    // STEP 4: Check for calendar caption
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  test('displays time labels correctly', () => {
    // STEP 1: Create test props
    const mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    const mockSetButtonStates = vi.fn()
    
    // STEP 2: Render calendar
    render(
      <Calendar 
        minutes={30}
        buttonStates={mockButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={24}
      />
    )
    
    // STEP 3: Check for time labels (should show 30-min increments from 9am to 9pm)
    expect(screen.getByText('9:00')).toBeInTheDocument()
    expect(screen.getByText('9:30')).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('17:00')).toBeInTheDocument()
    expect(screen.getByText('20:30')).toBeInTheDocument()
  })

  test('handles time slot click correctly', () => {
    // STEP 1: Create a mock function to track state changes
    const mockSetButtonStates = vi.fn()
    const mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    
    // STEP 2: Render calendar with the state handler
    render(
      <Calendar 
        minutes={30}
        buttonStates={mockButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={24}
      />
    )
    
    // STEP 3: Find and trigger mouseDown on a time slot toggle button
    // Toggle buttons have aria-pressed attribute, so filter for those
    const toggleButtons = screen.getAllByRole('button').filter(button => 
      button.hasAttribute('aria-pressed')
    )
    const firstTimeSlot = toggleButtons[0]!
    fireEvent.mouseDown(firstTimeSlot)
    
    // STEP 4: Verify the state setter was called
    expect(mockSetButtonStates).toHaveBeenCalledTimes(1)
    
    // STEP 5: Verify the state change is correct (button state should be toggled)
    const call = mockSetButtonStates.mock.calls[0]![0] as boolean[][]
    expect(call[0]![0]).toBe(true) // First day, first time slot should be true
  })

  test('displays availability correctly when provided', () => {
    // STEP 1: Create sample availability data
    const sampleButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    // Make Monday 10am-12pm available (slots 2-5: 10:00, 10:30, 11:00, 11:30)
    sampleButtonStates[0]![2] = true  // Monday 10:00
    sampleButtonStates[0]![3] = true  // Monday 10:30
    sampleButtonStates[0]![4] = true  // Monday 11:00
    sampleButtonStates[0]![5] = true  // Monday 11:30
    
    const mockSetButtonStates = vi.fn()
    
    // STEP 2: Render calendar with availability
    render(
      <Calendar 
        minutes={30}
        buttonStates={sampleButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={24}
      />
    )
    
    // STEP 3: Check that available slots are marked as pressed
    const toggleButtons = screen.getAllByRole('button')
    
    // Find toggle buttons that should be pressed (data-state="on")
    const pressedButtons = toggleButtons.filter(button => 
      button.getAttribute('data-state') === 'on'
    )
    
    expect(pressedButtons.length).toBe(4) // Should have 4 available slots
  })

  test('supports mouse drag selection', () => {
    // STEP 1: Create test props
    const mockSetButtonStates = vi.fn()
    const mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    
    // STEP 2: Render calendar
    render(
      <Calendar 
        minutes={30}
        buttonStates={mockButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={24}
      />
    )
    
    // STEP 3: Get toggle buttons
    const toggleButtons = screen.getAllByRole('button')
    const firstSlot = toggleButtons[0]!
    const secondSlot = toggleButtons[1]!
    
    // STEP 4: Simulate drag operation
    // Start with mouseDown on first slot
    fireEvent.mouseDown(firstSlot)
    expect(mockSetButtonStates).toHaveBeenCalledTimes(1)
    
    // Move over second slot while selecting
    fireEvent.mouseOver(secondSlot)
    expect(mockSetButtonStates).toHaveBeenCalledTimes(2)
    
    // End drag
    fireEvent.mouseUp(firstSlot)
    
    // STEP 5: Verify both slots were toggled
    expect(mockSetButtonStates).toHaveBeenCalledTimes(2)
  })

  test('renders correct number of time slots based on blocks prop', () => {
    // STEP 1: Test with different block counts
    const mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 12 }, () => false))
    const mockSetButtonStates = vi.fn()
    
    // STEP 2: Render with 12 blocks (6 hours)
    render(
      <Calendar 
        minutes={30}
        buttonStates={mockButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={12}
      />
    )
    
    // STEP 3: Check that we have 12 time rows (each block creates a row)
    const timeLabels = screen.getAllByText(/\d+:\d+/)
    expect(timeLabels.length).toBe(12) // Should have 12 time labels for 12 blocks
  })

  test('handles edge case with empty button states', () => {
    // STEP 1: Create minimal button states
    const mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 1 }, () => false))
    const mockSetButtonStates = vi.fn()
    
    // STEP 2: Render with minimal data
    render(
      <Calendar 
        minutes={30}
        buttonStates={mockButtonStates}
        setButtonStates={mockSetButtonStates}
        blocks={1}
      />
    )
    
    // STEP 3: Should still render basic structure
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    
    // STEP 4: Should have at least one toggle button
    const toggleButtons = screen.getAllByRole('button')
    expect(toggleButtons.length).toBeGreaterThan(0)
  })
})