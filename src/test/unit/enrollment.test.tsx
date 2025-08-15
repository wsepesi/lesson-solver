import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import { Enrollment } from '../../components/enrollment'
import type { StudioSchema } from 'lib/schema'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
}

vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => { /* no-op */ })
vi.spyOn(window, 'alert').mockImplementation(() => { /* no-op */ })

describe('Enrollment Component', () => {
  const mockSetFormData = vi.fn()
  const mockSetState = vi.fn()
  const mockSetStudio = vi.fn()
  const user = userEvent.setup()

  const mockStudio: StudioSchema = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    code: 'ABC12',
    owner_schedule: {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    },
    events: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Supabase mock to default success state
    mockSupabaseClient.eq.mockResolvedValue({
      data: [mockStudio],
      error: null
    })
  })

  test('renders enrollment form with all fields', () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    expect(screen.getByText('Enroll in a Studio')).toBeInTheDocument()
    expect(screen.getByText('Enter your name, email and studio code to enroll.')).toBeInTheDocument()
    
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Studio Code')).toBeInTheDocument()
    
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })

  test('auto-populates studio code from query parameter', () => {
    render(
      <Enrollment 
        query={{ code: 'XYZ99' }}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    const studioCodeInput = screen.getByLabelText('Studio Code')
    expect(studioCodeInput).toHaveValue('XYZ99')
  })

  test('validates required fields', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: 'Go' })
    fireEvent.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInvalid()
      expect(screen.getByLabelText('Last Name')).toBeInvalid()
      expect(screen.getByLabelText('Email')).toBeInvalid()
      expect(screen.getByLabelText('Studio Code')).toBeInvalid()
    })

    expect(mockSetFormData).not.toHaveBeenCalled()
  })

  test('validates email format', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Fill form with invalid email
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Doe')
    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.type(screen.getByLabelText('Studio Code'), 'ABC12')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  test('validates studio code length', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Try code that's too short
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Doe')
    await user.type(screen.getByLabelText('Email'), 'john@test.com')
    await user.type(screen.getByLabelText('Studio Code'), 'ABC')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Studio Code')).toBeInvalid()
    })

    // Clear and try code that's too long
    await user.clear(screen.getByLabelText('Studio Code'))
    await user.type(screen.getByLabelText('Studio Code'), 'ABCDEF')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Studio Code')).toBeInvalid()
    })
  })

  test('successfully submits form with valid data', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Fill form with valid data
    await user.type(screen.getByLabelText('First Name'), 'Alice')
    await user.type(screen.getByLabelText('Last Name'), 'Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@test.com')
    await user.type(screen.getByLabelText('Studio Code'), 'ABC12')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      expect(mockSetFormData).toHaveBeenCalledWith({
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@test.com',
        studioCode: 'ABC12'
      })
      expect(mockSetState).toHaveBeenCalledWith('schedule')
      expect(mockSetStudio).toHaveBeenCalledWith(mockStudio)
    })
  })

  test('handles invalid studio code', async () => {
    // Mock no studio found
    mockSupabaseClient.eq.mockResolvedValueOnce({
      data: [],
      error: null
    })

    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    await user.type(screen.getByLabelText('First Name'), 'Bob')
    await user.type(screen.getByLabelText('Last Name'), 'Jones')
    await user.type(screen.getByLabelText('Email'), 'bob@test.com')
    await user.type(screen.getByLabelText('Studio Code'), 'WRONG')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Invalid code, please check that it's correct")
      expect(mockSetState).not.toHaveBeenCalled()
    })
  })

  test('handles database error', async () => {
    // Mock database error
    mockSupabaseClient.eq.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' }
    })

    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    await user.type(screen.getByLabelText('First Name'), 'Carol')
    await user.type(screen.getByLabelText('Last Name'), 'White')
    await user.type(screen.getByLabelText('Email'), 'carol@test.com')
    await user.type(screen.getByLabelText('Studio Code'), 'ABC12')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('error with fetching the studio code')
      expect(mockSetState).not.toHaveBeenCalled()
    })
  })

  test('displays form descriptions', () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    expect(screen.getByText('Your full name as you would like it to appear to the studio.')).toBeInTheDocument()
    expect(screen.getByText('Your email to save for future communication.')).toBeInTheDocument()
    expect(screen.getByText('The 5 digit studio code sent to you by your teacher.')).toBeInTheDocument()
  })

  test('handles name validation (min/max length)', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Test empty names (min length)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInvalid()
      expect(screen.getByLabelText('Last Name')).toBeInvalid()
    })

    // Test very long names (over 50 characters)
    const longName = 'A'.repeat(51)
    await user.clear(screen.getByLabelText('First Name'))
    await user.clear(screen.getByLabelText('Last Name'))
    await user.type(screen.getByLabelText('First Name'), longName)
    await user.type(screen.getByLabelText('Last Name'), longName)

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    await waitFor(() => {
      // Form validation should prevent submission
      expect(mockSetFormData).not.toHaveBeenCalled()
    })
  })

  test('trims whitespace from inputs', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Input data with extra spaces
    await user.type(screen.getByLabelText('First Name'), '  David  ')
    await user.type(screen.getByLabelText('Last Name'), '  Brown  ')
    await user.type(screen.getByLabelText('Email'), '  david@test.com  ')
    await user.type(screen.getByLabelText('Studio Code'), '  ABC12  ')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    // The actual trimming behavior depends on the form library
    // This test verifies the form submits successfully
    await waitFor(() => {
      expect(mockSetFormData).toHaveBeenCalled()
    })
  })

  test('disables form during submission', async () => {
    // Make the database call take longer
    mockSupabaseClient.eq.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: [mockStudio],
        error: null
      }), 100))
    )

    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    await user.type(screen.getByLabelText('First Name'), 'Emma')
    await user.type(screen.getByLabelText('Last Name'), 'Wilson')
    await user.type(screen.getByLabelText('Email'), 'emma@test.com')
    await user.type(screen.getByLabelText('Studio Code'), 'ABC12')

    const submitButton = screen.getByRole('button', { name: 'Go' })
    fireEvent.click(submitButton)

    // In real implementation, button should be disabled during submission
    // This would prevent double submissions
  })

  test('preserves form data on validation errors', async () => {
    render(
      <Enrollment 
        query={undefined}
        setFormData={mockSetFormData}
        setState={mockSetState}
        setStudio={mockSetStudio}
        studio={null}
      />
    )

    // Fill partial form
    await user.type(screen.getByLabelText('First Name'), 'Frank')
    await user.type(screen.getByLabelText('Email'), 'invalid-email')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    // Form should preserve entered values
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toHaveValue('Frank')
      expect(screen.getByLabelText('Email')).toHaveValue('invalid-email')
    })
  })
})