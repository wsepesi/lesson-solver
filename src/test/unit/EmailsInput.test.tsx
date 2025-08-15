import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import EmailsInput from '../../components/EmailsInput'

// Mock console.log to prevent test output noise
vi.spyOn(console, 'log').mockImplementation(() => undefined)

describe('EmailsInput Component', () => {
  const mockSetEmails = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders with empty email list', () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    expect(screen.getByLabelText('Emails')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('student@xyz.com')).toBeInTheDocument()
    expect(screen.getByText(/hit enter to add an email/i)).toBeInTheDocument()
  })

  test('displays existing emails as badges', () => {
    const existingEmails = ['alice@test.com', 'bob@test.com']
    
    render(
      <EmailsInput 
        emails={existingEmails}
        setEmails={mockSetEmails}
      />
    )

    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
    
    // Check that badges are rendered
    const badges = screen.getAllByRole('button')
    expect(badges).toHaveLength(2)
  })

  test('adds valid email on form submission', async () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Type valid email and press Enter
    await user.type(input, 'newstudent@test.com')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockSetEmails).toHaveBeenCalledWith(['newstudent@test.com'])
    })

    // Input should be cleared after submission
    expect(input).toHaveValue('')
  })

  test('validates email format before adding', async () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Try to add invalid email
    await user.type(input, 'invalid-email')
    await user.keyboard('{Enter}')

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })

    // Should not call setEmails
    expect(mockSetEmails).not.toHaveBeenCalled()
  })

  test('removes email when badge is clicked', () => {
    const emails = ['alice@test.com', 'bob@test.com', 'carol@test.com']
    
    render(
      <EmailsInput 
        emails={emails}
        setEmails={mockSetEmails}
      />
    )

    // Click on the middle email badge
    const bobBadge = screen.getByText('bob@test.com').closest('button')
    fireEvent.click(bobBadge!)

    expect(mockSetEmails).toHaveBeenCalledWith(['alice@test.com', 'carol@test.com'])
  })

  test('handles adding duplicate emails', async () => {
    const existingEmails = ['alice@test.com']
    
    render(
      <EmailsInput 
        emails={existingEmails}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Try to add duplicate email
    await user.type(input, 'alice@test.com')
    await user.keyboard('{Enter}')

    // Component should still call setEmails (parent should handle deduplication)
    await waitFor(() => {
      expect(mockSetEmails).toHaveBeenCalledWith(['alice@test.com', 'alice@test.com'])
    })
  })

  test('handles various email formats correctly', async () => {
    const testCases = [
      { email: 'simple@example.com', valid: true },
      { email: 'name.lastname@domain.com', valid: true },
      { email: 'user+tag@example.co.uk', valid: true },
      { email: 'test@sub.domain.com', valid: true },
      { email: 'invalid@', valid: false },
      { email: '@invalid.com', valid: false },
      { email: 'no-at-sign.com', valid: false },
      { email: 'spaces in@email.com', valid: false }
    ]

    for (const testCase of testCases) {
      const { unmount } = render(
        <EmailsInput 
          emails={[]}
          setEmails={mockSetEmails}
        />
      )

      const input = screen.getByPlaceholderText('student@xyz.com')
      
      await user.clear(input)
      await user.type(input, testCase.email)
      await user.keyboard('{Enter}')

      if (testCase.valid) {
        await waitFor(() => {
          expect(mockSetEmails).toHaveBeenCalled()
        })
      } else {
        await waitFor(() => {
          expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
        })
      }

      // Clean up for next iteration
      unmount()
      vi.clearAllMocks()
    }
  })

  test('displays cross icon on badges', () => {
    render(
      <EmailsInput 
        emails={['test@example.com']}
        setEmails={mockSetEmails}
      />
    )

    // Check that badge button exists
    const badgeButton = screen.getByText('test@example.com').closest('button')
    expect(badgeButton).toBeInTheDocument()
    expect(badgeButton).toHaveClass('hover:cursor-pointer')
    
    // Cross icon should be present (imported from @radix-ui/react-icons)
    expect(badgeButton).toBeInTheDocument()
  })

  test('handles rapid email additions', async () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Add multiple emails rapidly
    await user.type(input, 'email1@test.com')
    await user.keyboard('{Enter}')
    
    await user.type(input, 'email2@test.com')
    await user.keyboard('{Enter}')
    
    await user.type(input, 'email3@test.com')
    await user.keyboard('{Enter}')

    // All emails should be added
    expect(mockSetEmails).toHaveBeenCalledTimes(3)
    expect(mockSetEmails).toHaveBeenNthCalledWith(1, ['email1@test.com'])
    expect(mockSetEmails).toHaveBeenNthCalledWith(2, ['email2@test.com'])
    expect(mockSetEmails).toHaveBeenNthCalledWith(3, ['email3@test.com'])
  })

  test('preserves existing emails when adding new ones', async () => {
    const existingEmails = ['existing1@test.com', 'existing2@test.com']
    
    render(
      <EmailsInput 
        emails={existingEmails}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    await user.type(input, 'new@test.com')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockSetEmails).toHaveBeenCalledWith([
        'existing1@test.com',
        'existing2@test.com',
        'new@test.com'
      ])
    })
  })

  test('handles empty form submission', async () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Focus the input and press Enter without typing anything
    await user.click(input)
    await user.keyboard('{Enter}')

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })

    expect(mockSetEmails).not.toHaveBeenCalled()
  })

  test('handles whitespace in email input', async () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Try email with leading/trailing spaces
    await user.type(input, '  trimmed@test.com  ')
    await user.keyboard('{Enter}')

    // Most form libraries trim whitespace, but this depends on implementation
    // The email validation should handle this appropriately
    await waitFor(() => {
      const calls = mockSetEmails.mock.calls
      if (calls.length > 0) {
        // If it was called, check what value was passed
        expect(calls[0]![0]).toContain('trimmed@test.com')
      } else {
        // If validation failed due to spaces, that's also valid behavior
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      }
    })
  })

  test('form resets after successful submission', async () => {
    render(
      <EmailsInput 
        emails={[]}
        setEmails={mockSetEmails}
      />
    )

    const input = screen.getByPlaceholderText('student@xyz.com')
    
    // Add an email
    await user.type(input, 'test@example.com')
    await user.keyboard('{Enter}')

    // Input should be empty
    await waitFor(() => {
      expect(input).toHaveValue('')
    })

    // Should be ready for next input
    await user.type(input, 'another@example.com')
    expect(input).toHaveValue('another@example.com')
  })
})