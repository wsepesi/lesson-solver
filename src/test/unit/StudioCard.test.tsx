import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import StudioCard from '../../components/StudioCard'
import type { StudioWithStudents } from '@/app/(protected)/studios/page'
import { Time } from 'lib/types'

describe('StudioCard Component', () => {
  let mockStudio: StudioWithStudents
  
  beforeEach(() => {
    // Create basic mock studio
    mockStudio = {
      id: 1,
      user_id: 'test-user-id',
      code: 'MUSIC',
      studio_name: 'Music Lessons Studio',
      owner_schedule: {
        Monday: [{ start: new Time(9, 0), end: new Time(17, 0) }],
        Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      },
      events: null,
      students: [
        { id: '1' },
        { id: '2' }
      ]
    }
  })

  test('renders studio name and basic information', () => {
    // STEP 1: Render StudioCard
    render(<StudioCard studio={mockStudio} />)
    
    // STEP 2: Check studio name is displayed
    expect(screen.getByText('Music Lessons Studio')).toBeInTheDocument()
    
    // STEP 3: Check studio code is displayed
    expect(screen.getByText('Studio Code: MUSIC')).toBeInTheDocument()
    
    // STEP 4: Check student count is displayed
    expect(screen.getByText('Students Enrolled: 2')).toBeInTheDocument()
  })

  test('displays correct link to studio detail page', () => {
    // STEP 1: Render StudioCard
    render(<StudioCard studio={mockStudio} />)
    
    // STEP 2: Check link has correct href
    const link = screen.getByText('Music Lessons Studio').closest('a')
    expect(link).toHaveAttribute('href', '/studios/MUSIC')
  })

  test('shows "In Progress" status when owner_schedule exists but no events', () => {
    // STEP 1: Ensure studio has schedule but no events
    const studioInProgress = {
      ...mockStudio,
      events: null // No events yet
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={studioInProgress} />)
    
    // STEP 3: Should show "In Progress" badge
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  test('shows "Done" status when studio has events', () => {
    // STEP 1: Create studio with events
    const studioDone = {
      ...mockStudio,
      events: [
        {
          id: '1',
          name: 'Alice',
          booking: {
            day: 'M',
            time_start: '10:00am',
            time_end: '10:30am'
          },
          other_avail_times: [],
          student_id: 1
        }
      ]
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={studioDone} />)
    
    // STEP 3: Should show "Done" badge
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  test('shows "Not Started" status when no schedule and no events', () => {
    // STEP 1: Create studio with no schedule (empty schedule)
    const studioNotStarted = {
      ...mockStudio,
      owner_schedule: {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      },
      events: null
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={studioNotStarted} />)
    
    // STEP 3: Should show "Not Started" badge
    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })

  test('handles studio with no students', () => {
    // STEP 1: Create studio with empty students array
    const studioNoStudents = {
      ...mockStudio,
      students: []
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={studioNoStudents} />)
    
    // STEP 3: Should show 0 students enrolled
    expect(screen.getByText('Students Enrolled: 0')).toBeInTheDocument()
    
    // STEP 4: Other information should still display
    expect(screen.getByText('Music Lessons Studio')).toBeInTheDocument()
    expect(screen.getByText('Studio Code: MUSIC')).toBeInTheDocument()
  })

  test('handles studio with many students', () => {
    // STEP 1: Create studio with many students
    const manyStudents = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`
    }))
    
    const studioManyStudents = {
      ...mockStudio,
      students: manyStudents
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={studioManyStudents} />)
    
    // STEP 3: Should show correct count
    expect(screen.getByText('Students Enrolled: 15')).toBeInTheDocument()
  })

  test('applies correct styling classes', () => {
    // STEP 1: Render card
    render(<StudioCard studio={mockStudio} />)
    
    // STEP 2: Check card has cursor-pointer class
    const card = screen.getByText('Music Lessons Studio').closest('.cursor-pointer')
    expect(card).toBeInTheDocument()
    
    // STEP 3: Check content has hover effect
    const content = screen.getByText('Music Lessons Studio').closest('.hover\\:bg-gray-100')
    expect(content).toBeInTheDocument()
  })

  test('renders badge component correctly', () => {
    // STEP 1: Render card
    render(<StudioCard studio={mockStudio} />)
    
    // STEP 2: Badge should be visible
    const badge = screen.getByText('In Progress')
    expect(badge).toBeInTheDocument()
    
    // STEP 3: Badge should have outline variant class
    expect(badge).toHaveClass('border')
  })

  test('handles studio with different code formats', () => {
    // STEP 1: Create studio with different code format
    const studioDifferentCode = {
      ...mockStudio,
      code: 'ABC123',
      studio_name: 'ABC Music School'
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={studioDifferentCode} />)
    
    // STEP 3: Should display code correctly
    expect(screen.getByText('Studio Code: ABC123')).toBeInTheDocument()
    
    // STEP 4: Link should use the code
    const link = screen.getByText('ABC Music School').closest('a')
    expect(link).toHaveAttribute('href', '/studios/ABC123')
  })

  test('handles studio with long name', () => {
    // STEP 1: Create studio with very long name
    const longNameStudio = {
      ...mockStudio,
      studio_name: 'This is a Very Long Studio Name That Might Cause Layout Issues'
    }
    
    // STEP 2: Render card
    render(<StudioCard studio={longNameStudio} />)
    
    // STEP 3: Should still render the full name
    expect(screen.getByText('This is a Very Long Studio Name That Might Cause Layout Issues')).toBeInTheDocument()
  })

  test('handles complex progress determination logic', () => {
    // STEP 1: Test studio with empty events array (should still be "Done")
    const studioEmptyEvents = {
      ...mockStudio,
      events: [] // Empty array, not null
    }
    
    render(<StudioCard studio={studioEmptyEvents} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument() // Empty array should be "In Progress"
    
    // STEP 2: Test studio with schedule and events
    const studioComplete = {
      ...mockStudio,
      events: [{ id: '1', name: 'Test', booking: { day: 'M', time_start: '10:00am', time_end: '10:30am' }, other_avail_times: [], student_id: 1 }]
    }
    
    render(<StudioCard studio={studioComplete} />)
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})