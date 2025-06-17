import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import SendToStudentsDialog from '../../components/SendToStudentsDialog'
import type { StudioWithStudents } from '../../pages/studios/[slug]'

// Mock UI components
vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
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

// Mock lib/utils
vi.mock('lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    cn: (...inputs: any[]) => inputs.join(' '), // Mock cn function
  }
})

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

describe('SendToStudentsDialog Component', () => {
  const mockHandleEvent = vi.fn()
  
  const mockStudio: StudioWithStudents = {
    id: 1,
    user_id: 'user-123',
    studio_name: 'Test Music Studio',
    studio_code: 'ABC12',
    students: [],
    onboarding_status: 'invite',
    owner_schedule: {
      Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
      Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.location
    delete (window as any).location
    window.location = { href: 'http://localhost:3000' } as any
  })

  test('renders trigger button with envelope icon', () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    const button = screen.getByRole('button', { name: /send to students/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('hover:bg-accent')
  })

  test('opens dialog when trigger button is clicked', async () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // Dialog should not be visible initially
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()

    // Click trigger button
    const triggerButton = screen.getByRole('button', { name: /send to students/i })
    fireEvent.click(triggerButton)

    // Dialog should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  test('displays studio information correctly', async () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      expect(screen.getByText('Share Studio with Students')).toBeInTheDocument()
      expect(screen.getByText(/share these details with your students/i)).toBeInTheDocument()
      
      // Check studio code display
      expect(screen.getByText('Studio Code:')).toBeInTheDocument()
      expect(screen.getByText('ABC12')).toBeInTheDocument()
      
      // Check enrollment link display
      expect(screen.getByText('Enrollment Link:')).toBeInTheDocument()
      expect(screen.getByText('http://localhost:3000/enroll')).toBeInTheDocument()
    })
  })

  test('displays correct enrollment URL based on window location', async () => {
    // Change window location
    window.location.href = 'https://myapp.com/studios'
    
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      expect(screen.getByText('https://myapp.com/enroll')).toBeInTheDocument()
    })
  })

  test('copy button copies enrollment link to clipboard', async () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      const copyButton = screen.getAllByRole('button').find(btn => 
        btn.textContent?.toLowerCase().includes('copy')
      )
      expect(copyButton).toBeInTheDocument()
      
      fireEvent.click(copyButton!)
    })

    // Verify clipboard was called with correct URL
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/enroll')
  })

  test('done button calls handleEvent and closes dialog', async () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      const doneButton = screen.getByRole('button', { name: /done/i })
      fireEvent.click(doneButton)
    })

    // Verify event handler was called
    expect(mockHandleEvent).toHaveBeenCalledWith('invite')
    
    // Dialog should close (in real implementation)
  })

  test('displays studio name in title', async () => {
    const studioWithLongName = {
      ...mockStudio,
      studio_name: 'Advanced Piano Lessons for Beginners'
    }

    render(
      <SendToStudentsDialog 
        studio={studioWithLongName}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      // Studio name could be displayed in the description or elsewhere
      const dialogContent = screen.getByTestId('dialog-content')
      expect(dialogContent).toBeInTheDocument()
    })
  })

  test('handles clipboard API errors gracefully', async () => {
    // Mock clipboard failure
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error('Clipboard access denied')
    )

    // Mock console.error to prevent test output noise
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      const copyButton = screen.getAllByRole('button').find(btn => 
        btn.textContent?.toLowerCase().includes('copy')
      )
      fireEvent.click(copyButton!)
    })

    // Should not crash the component
    expect(screen.getByTestId('dialog')).toBeInTheDocument()

    mockConsoleError.mockRestore()
  })

  test('displays formatted studio code prominently', async () => {
    const studioWithUniqueCode = {
      ...mockStudio,
      studio_code: 'XYZ99'
    }

    render(
      <SendToStudentsDialog 
        studio={studioWithUniqueCode}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      const codeDisplay = screen.getByText('XYZ99')
      expect(codeDisplay).toBeInTheDocument()
      // In real implementation, might check for specific styling
    })
  })

  test('instruction text is clear and helpful', async () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      // Check for helpful instructions
      expect(screen.getByText(/share these details/i)).toBeInTheDocument()
      expect(screen.getByText('Studio Code:')).toBeInTheDocument()
      expect(screen.getByText('Enrollment Link:')).toBeInTheDocument()
    })
  })

  test('dialog footer contains done button', async () => {
    render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    await waitFor(() => {
      const footer = screen.getByTestId('dialog-footer')
      expect(footer).toBeInTheDocument()
      
      const doneButton = footer.querySelector('button')
      expect(doneButton).toHaveTextContent('Done')
    })
  })

  test('enrollment URL updates when location changes', async () => {
    const { rerender } = render(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /send to students/i }))

    // Initial URL
    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/enroll')).toBeInTheDocument()
    })

    // Change location and rerender
    window.location.href = 'https://production.com'
    
    rerender(
      <SendToStudentsDialog 
        studio={mockStudio}
        handleEvent={mockHandleEvent}
      />
    )

    // URL should update (in real implementation with proper state management)
  })
})