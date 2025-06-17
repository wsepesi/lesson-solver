import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import { OnboardStudentCard } from '../../components/OnboardStudentCard'
import type { FormSchema } from '../../components/enrollment'
import type { StudioSchema } from 'lib/schema'
import type { LessonLength } from 'lib/types'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => Promise.resolve({ error: null }))
  }))
}

vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock the toast hook
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock lib/utils
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    cn: (...inputs: any[]) => inputs.join(' '), // Mock cn function
  }
})

describe('OnboardStudentCard Component', () => {
  let mockSetMinutes: any
  let mockSetState: any
  let mockButtonStates: boolean[][]
  let mockStudentInfo: FormSchema
  let mockStudio: StudioSchema
  let mockMinutes: LessonLength
  
  beforeEach(() => {
    // Reset mocks before each test
    mockSetMinutes = vi.fn()
    mockSetState = vi.fn()
    mockMinutes = 30
    
    // Create sample button states (student availability)
    mockButtonStates = Array(7).fill(null).map(() => Array(24).fill(false))
    // Set some availability (Monday 10am-12pm)
    mockButtonStates[0]![2] = true  // 10:00am
    mockButtonStates[0]![3] = true  // 10:30am
    mockButtonStates[0]![4] = true  // 11:00am
    mockButtonStates[0]![5] = true  // 11:30am
    
    // Create mock student info
    mockStudentInfo = {
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice.smith@test.com'
    }
    
    // Create mock studio
    mockStudio = {
      id: 1,
      user_id: 'test-user-id',
      code: 'TEST1',
      studio_name: 'Test Music Studio',
      owner_schedule: {
        Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
        Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      },
      events: null
    }
    
    // Reset Supabase mock
    vi.clearAllMocks()
  })

  test('renders card with student welcome message', () => {
    // STEP 1: Render OnboardStudentCard component
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Check welcome message with student name
    expect(screen.getByText('Welcome Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Fill out your availability on the calendar')).toBeInTheDocument()
    
    // STEP 3: Check confirm button exists
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
  })

  test('displays lesson length radio buttons correctly', () => {
    // STEP 1: Render component
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Check lesson length options
    expect(screen.getByText('Lesson length')).toBeInTheDocument()
    expect(screen.getByText('30 mins')).toBeInTheDocument()
    expect(screen.getByText('60 mins')).toBeInTheDocument()
    
    // STEP 3: Check radio buttons exist
    expect(screen.getByRole('radio', { name: /30 mins/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /60 mins/i })).toBeInTheDocument()
  })

  test('handles lesson length selection correctly', () => {
    // STEP 1: Render component with 30min default
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={30}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Click on 60 minutes option
    const radio60 = screen.getByRole('radio', { name: /60 mins/i })
    fireEvent.click(radio60)
    
    // STEP 3: Verify setMinutes was called with 60
    expect(mockSetMinutes).toHaveBeenCalledWith(60)
    
    // STEP 4: Click on 30 minutes option  
    const radio30 = screen.getByRole('radio', { name: /30 mins/i })
    fireEvent.click(radio30)
    
    // STEP 5: Verify setMinutes was called with 30
    expect(mockSetMinutes).toHaveBeenCalledWith(30)
  })

  test('displays formatted availability schedule', () => {
    // STEP 1: Render with availability data
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Should display formatted availability
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  test('handles confirm button click with valid data', async () => {
    // STEP 1: Render component
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Click confirm button
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    fireEvent.click(confirmButton)
    
    // STEP 3: Verify state transition
    expect(mockSetState).toHaveBeenCalledWith('done')
    
    // STEP 4: Verify database insert was called
    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('students')
    })
  })

  test('prevents submission with empty availability', () => {
    // STEP 1: Create empty button states
    const emptyButtonStates = Array(7).fill(null).map(() => Array(24).fill(false))
    
    // STEP 2: Render with empty availability
    render(
      <OnboardStudentCard 
        buttonStates={emptyButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 3: Click confirm button
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    fireEvent.click(confirmButton)
    
    // STEP 4: Should NOT change state (validation failed)
    expect(mockSetState).not.toHaveBeenCalled()
    
    // STEP 5: Should NOT attempt database insert
    expect(mockSupabaseClient.from).not.toHaveBeenCalled()
  })

  test('handles null studio correctly', async () => {
    // STEP 1: Render with null studio
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={null}
      />
    )
    
    // STEP 2: Click confirm button
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    fireEvent.click(confirmButton)
    
    // STEP 3: Should still change state
    expect(mockSetState).toHaveBeenCalledWith('done')
    
    // STEP 4: Should NOT attempt database insert
    expect(mockSupabaseClient.from).not.toHaveBeenCalled()
  })

  test('creates correct database student object', async () => {
    // STEP 1: Setup mock to capture insert data
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert })
    
    // STEP 2: Render component with 60min lesson
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={60}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    // STEP 3: Click confirm
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    
    // STEP 4: Verify insert was called with correct student data
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        email: 'alice.smith@test.com',
        first_name: 'Alice',
        last_name: 'Smith',
        lesson_length: '60',
        schedule: expect.objectContaining({
          Monday: expect.any(Array),
          Tuesday: expect.any(Array),
          Wednesday: expect.any(Array),
          Thursday: expect.any(Array),
          Friday: expect.any(Array),
          Saturday: expect.any(Array),
          Sunday: expect.any(Array)
        }),
        studio_id: 1
      })
    })
  })

  test('handles database error gracefully', async () => {
    // STEP 1: Setup mock to return error
    const mockInsert = vi.fn(() => Promise.resolve({ 
      error: { message: 'Database error' } 
    }))
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert })
    
    // STEP 2: Mock console.log to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    // STEP 3: Render and click confirm
    render(
      <OnboardStudentCard 
        buttonStates={mockButtonStates}
        minutes={mockMinutes}
        setMinutes={mockSetMinutes}
        setState={mockSetState}
        studentInfo={mockStudentInfo}
        studio={mockStudio}
      />
    )
    
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    
    // STEP 4: Should still change state (error is handled internally)
    expect(mockSetState).toHaveBeenCalledWith('done')
    
    // STEP 5: Should log error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })
    
    consoleSpy.mockRestore()
  })
})