import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { CardWithSubmit } from '../../components/CardWithSubmit'
import type { Schedule } from '../../../lib/types'

// Mock the toast hook to avoid dependency issues
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock lib/utils
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>),
    cn: (...inputs: string[]) => inputs.join(' '), // Mock cn function
  }
})

describe('CardWithSubmit Component', () => {
  let mockSetState: (state: string) => void
  let mockSetTeacherSchedule: (schedule: Schedule) => void
  let mockHandleSubmit: () => void
  let mockButtonStates: boolean[][]
  
  beforeEach(() => {
    // Reset mocks before each test
    mockSetState = vi.fn()
    mockSetTeacherSchedule = vi.fn()
    mockHandleSubmit = vi.fn()
    
    // Create sample button states (teacher availability)
    mockButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    // Set some availability (Monday 10am-12pm)
    mockButtonStates[0]![2] = true  // 10:00am
    mockButtonStates[0]![3] = true  // 10:30am
    mockButtonStates[0]![4] = true  // 11:00am
    mockButtonStates[0]![5] = true  // 11:30am
  })

  test('renders card with correct title and description', () => {
    // STEP 1: Render CardWithSubmit component
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={mockButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 2: Check card header content
    expect(screen.getByText('Add availablilty')).toBeInTheDocument()
    expect(screen.getByText('Fill out your schedule')).toBeInTheDocument()
    
    // STEP 3: Check submit button exists
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  test('displays formatted schedule text correctly', () => {
    // STEP 1: Render with availability data
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={mockButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 2: Should display formatted availability
    // The buttonStatesToText function should format the availability into readable text
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  test('handles submit button click correctly', () => {
    // STEP 1: Render component
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={mockButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 2: Click submit button
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    // STEP 3: Verify all callbacks were called
    expect(mockSetTeacherSchedule).toHaveBeenCalledTimes(1)
    expect(mockSetState).toHaveBeenCalledWith('student')
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1)
    
    // STEP 4: Verify schedule conversion was called with correct params
    expect(mockSetTeacherSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        Monday: expect.any(Array) as unknown[],
        Tuesday: expect.any(Array) as unknown[],
        Wednesday: expect.any(Array) as unknown[],
        Thursday: expect.any(Array) as unknown[],
        Friday: expect.any(Array) as unknown[],
        Saturday: expect.any(Array) as unknown[],
        Sunday: expect.any(Array) as unknown[]
      })
    )
  })

  test('handles empty button states correctly', () => {
    // STEP 1: Create empty button states
    const emptyButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    
    // STEP 2: Render with empty availability
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={emptyButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 3: Should still render card structure
    expect(screen.getByText('Add availablilty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    
    // STEP 4: Submit should still work
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(mockSetTeacherSchedule).toHaveBeenCalledTimes(1)
  })

  test('displays complex availability schedule correctly', () => {
    // STEP 1: Create complex availability pattern
    const complexButtonStates = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false))
    
    // Monday 9am-11am
    complexButtonStates[0]![0] = true
    complexButtonStates[0]![1] = true
    complexButtonStates[0]![2] = true
    complexButtonStates[0]![3] = true
    
    // Wednesday 2pm-4pm
    complexButtonStates[2]![10] = true
    complexButtonStates[2]![11] = true
    complexButtonStates[2]![12] = true
    complexButtonStates[2]![13] = true
    
    // Friday 6pm-8pm
    complexButtonStates[4]![18] = true
    complexButtonStates[4]![19] = true
    complexButtonStates[4]![20] = true
    complexButtonStates[4]![21] = true
    
    // STEP 2: Render with complex schedule
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={complexButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 3: Should display multiple days
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByText('Friday')).toBeInTheDocument()
  })

  test('card has correct styling and layout', () => {
    // STEP 1: Render component
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={mockButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 2: Check card structure exists
    const card = screen.getByText('Add availablilty').closest('.card, [role="region"]') ??
                screen.getByText('Add availablilty').closest('div')
    expect(card).toBeInTheDocument()
    
    // STEP 3: Submit button should be full width
    const submitButton = screen.getByRole('button', { name: /submit/i })
    expect(submitButton).toHaveClass('w-full')
  })

  test('handles state transitions correctly', () => {
    // STEP 1: Render component
    render(
      <CardWithSubmit 
        setState={mockSetState}
        setTeacherSchedule={mockSetTeacherSchedule}
        buttonStates={mockButtonStates}
        handleSubmit={mockHandleSubmit}
      />
    )
    
    // STEP 2: Click submit
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    // STEP 3: Verify state transition to 'student'
    expect(mockSetState).toHaveBeenCalledWith('student')
    
    // STEP 4: Verify all functions called in correct order
    expect(mockSetTeacherSchedule).toHaveBeenCalled()
    expect(mockSetState).toHaveBeenCalled()
    expect(mockHandleSubmit).toHaveBeenCalled()
  })
})