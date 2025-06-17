import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import StudentSchedule from '../../components/StudentSchedule'
import type { FormSchema } from '../../components/enrollment'
import type { OnboardingState } from '../../pages/enroll'
import type { StudioSchema } from 'lib/schema'
import type { LessonLength } from 'lib/types'

// Mock child components
vi.mock('../../components/Calendar', () => ({
  default: ({ minutes, buttonStates, setButtonStates, blocks }: any) => (
    <div data-testid="calendar">
      <div data-testid="calendar-minutes">{minutes}</div>
      <div data-testid="calendar-blocks">{blocks}</div>
      <div data-testid="calendar-button-states">{JSON.stringify(buttonStates)}</div>
      <button 
        onClick={() => {
          // Simulate toggling a time slot
          const newStates = [...buttonStates]
          newStates[0][0] = !newStates[0][0]
          setButtonStates(newStates)
        }}
      >
        Toggle Slot
      </button>
    </div>
  )
}))

vi.mock('../../components/OnboardStudentCard', () => ({
  OnboardStudentCard: ({ buttonStates, minutes, setMinutes, setState, studentInfo, studio }: any) => (
    <div data-testid="onboard-student-card">
      <div data-testid="student-name">{studentInfo.first_name} {studentInfo.last_name}</div>
      <div data-testid="student-email">{studentInfo.email}</div>
      <div data-testid="studio-name">{studio?.studio_name}</div>
      <div data-testid="lesson-length">{minutes}</div>
      <button onClick={() => setMinutes(minutes === 30 ? 60 : 30)}>
        Change Lesson Length
      </button>
      <button onClick={() => setState('done')}>
        Submit Schedule
      </button>
    </div>
  )
}))

describe('StudentSchedule Component', () => {
  const mockSetState = vi.fn()
  const mockSetButtonStates = vi.fn()
  const mockSetMinutes = vi.fn()

  const defaultStudentInfo: FormSchema = {
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@test.com',
    studioCode: 'ABC12'
  }

  const mockStudio: StudioSchema = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    code: 'ABC12',
    students_have_schedules: false,
    schedule: null,
    created_at: '2024-01-01'
  }

  const defaultButtonStates = Array(7).fill(null).map(() => Array(24).fill(false))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders both Calendar and OnboardStudentCard components', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    expect(screen.getByTestId('calendar')).toBeInTheDocument()
    expect(screen.getByTestId('onboard-student-card')).toBeInTheDocument()
  })

  test('passes correct props to Calendar component', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    // Check Calendar receives correct minutes
    expect(screen.getByTestId('calendar-minutes')).toHaveTextContent('30')
    
    // Check Calendar receives correct blocks (12 hours * 60 minutes / 30 minutes = 24 blocks)
    expect(screen.getByTestId('calendar-blocks')).toHaveTextContent('24')
    
    // Check Calendar receives buttonStates
    const buttonStatesEl = screen.getByTestId('calendar-button-states')
    expect(buttonStatesEl.textContent).toContain('false')
  })

  test('passes correct props to OnboardStudentCard', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    expect(screen.getByTestId('student-name')).toHaveTextContent('Alice Smith')
    expect(screen.getByTestId('student-email')).toHaveTextContent('alice@test.com')
    expect(screen.getByTestId('studio-name')).toHaveTextContent('Test Music Studio')
    expect(screen.getByTestId('lesson-length')).toHaveTextContent('30')
  })

  test('calculates blocks correctly for 60 minute lessons', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={60}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    // 12 hours * 60 minutes / 60 minutes = 12 blocks
    expect(screen.getByTestId('calendar-blocks')).toHaveTextContent('12')
  })

  test('handles button state updates from Calendar', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    const toggleButton = screen.getByText('Toggle Slot')
    fireEvent.click(toggleButton)

    expect(mockSetButtonStates).toHaveBeenCalled()
    
    // Verify the new state has the first slot toggled
    const newStates = mockSetButtonStates.mock.calls[0][0]
    expect(newStates[0][0]).toBe(true)
  })

  test('handles lesson length changes from OnboardStudentCard', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    const changeLengthButton = screen.getByText('Change Lesson Length')
    fireEvent.click(changeLengthButton)

    expect(mockSetMinutes).toHaveBeenCalledWith(60)
  })

  test('handles state changes from OnboardStudentCard', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    const submitButton = screen.getByText('Submit Schedule')
    fireEvent.click(submitButton)

    expect(mockSetState).toHaveBeenCalledWith('done')
  })

  test('renders with null studio', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={null}
      />
    )

    expect(screen.getByTestId('studio-name')).toHaveTextContent('')
  })

  test('maintains flex row layout', () => {
    const { container } = render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    const flexContainer = container.querySelector('.flex.flex-row.w-full')
    expect(flexContainer).toBeInTheDocument()
  })

  test('handles different lesson lengths correctly', () => {
    const lessonLengths: LessonLength[] = [30, 60]
    
    lessonLengths.forEach(length => {
      const { rerender } = render(
        <StudentSchedule 
          setState={mockSetState}
          buttonStates={defaultButtonStates}
          setButtonStates={mockSetButtonStates}
          minutes={length}
          setMinutes={mockSetMinutes}
          studentInfo={defaultStudentInfo}
          studio={mockStudio}
        />
      )

      expect(screen.getByTestId('lesson-length')).toHaveTextContent(length.toString())
      expect(screen.getByTestId('calendar-minutes')).toHaveTextContent(length.toString())
      
      const expectedBlocks = 720 / length // 720 = 12 hours * 60 minutes
      expect(screen.getByTestId('calendar-blocks')).toHaveTextContent(expectedBlocks.toString())
    })
  })

  test('passes buttonStates array with correct dimensions', () => {
    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    const buttonStatesEl = screen.getByTestId('calendar-button-states')
    const states = JSON.parse(buttonStatesEl.textContent || '[]')
    
    expect(states).toHaveLength(7) // 7 days
    expect(states[0]).toHaveLength(24) // 24 half-hour slots
  })

  test('handles complex button states', () => {
    const complexButtonStates = Array(7).fill(null).map((_, dayIndex) => 
      Array(24).fill(false).map((_, slotIndex) => 
        dayIndex === 0 && slotIndex < 4 // Monday morning slots
      )
    )

    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={complexButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={defaultStudentInfo}
        studio={mockStudio}
      />
    )

    const buttonStatesEl = screen.getByTestId('calendar-button-states')
    const states = JSON.parse(buttonStatesEl.textContent || '[]')
    
    // Verify Monday morning slots are true
    expect(states[0][0]).toBe(true)
    expect(states[0][1]).toBe(true)
    expect(states[0][2]).toBe(true)
    expect(states[0][3]).toBe(true)
    expect(states[0][4]).toBe(false)
    
    // Verify other days are false
    expect(states[1][0]).toBe(false)
  })

  test('integrates student info with studio info correctly', () => {
    const differentStudio: StudioSchema = {
      ...mockStudio,
      studio_name: 'Advanced Piano Studio',
      code: 'XYZ99'
    }

    const differentStudent: FormSchema = {
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@test.com',
      studioCode: 'XYZ99'
    }

    render(
      <StudentSchedule 
        setState={mockSetState}
        buttonStates={defaultButtonStates}
        setButtonStates={mockSetButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        studentInfo={differentStudent}
        studio={differentStudio}
      />
    )

    expect(screen.getByTestId('student-name')).toHaveTextContent('Bob Johnson')
    expect(screen.getByTestId('studio-name')).toHaveTextContent('Advanced Piano Studio')
    
    // Verify studio code matches
    expect(differentStudent.studioCode).toBe(differentStudio.code)
  })
})