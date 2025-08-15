import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { TeacherDashboard } from '../../components/teacher-dashboard'
import type { User } from '@supabase/auth-helpers-react'
import type { StudioWithStudents } from '@/app/(protected)/studios/page'
import { Time } from '../../../lib/types'

// Define proper interfaces for mock data to avoid 'any' types
interface MockUserMetadata {
  first_name?: string
  last_name?: string
}

interface MockUser extends User {
  user_metadata: MockUserMetadata
  app_metadata: Record<string, unknown>
}

interface MockBlockOfTime {
  start: { hour: number; minute: number }
  end: { hour: number; minute: number }
}

interface MockSchedule {
  Monday: MockBlockOfTime[]
  Tuesday: MockBlockOfTime[]
  Wednesday: MockBlockOfTime[]
  Thursday: MockBlockOfTime[]
  Friday: MockBlockOfTime[]
  Saturday: MockBlockOfTime[]
  Sunday: MockBlockOfTime[]
}

interface MockStudent {
  id: string
  email: string
  first_name: string
  last_name: string
  studio_id: number
  lesson_length: string
  schedule: MockSchedule
}

interface MockStudio extends Omit<StudioWithStudents, 'students'> {
  students: MockStudent[]
}

describe('TeacherDashboard Component', () => {
  let mockUser: MockUser
  let mockStudios: MockStudio[]
  
  beforeEach(() => {
    // Create mock user
    mockUser = {
      id: 'test-user-id',
      email: 'teacher@test.com',
      user_metadata: {
        first_name: 'John',
        last_name: 'Teacher'
      },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    } as MockUser
    
    // Create mock studios
    mockStudios = [
      {
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
          {
            id: '1',
            email: 'student1@test.com',
            first_name: 'Alice',
            last_name: 'Student',
            studio_id: 1,
            lesson_length: '30',
            schedule: {
              Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
            }
          }
        ]
      },
      {
        id: 2,
        user_id: 'test-user-id',
        code: 'PIANO',
        studio_name: 'Piano Studio',
        owner_schedule: {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        },
        events: null,
        students: []
      }
    ]
  })

  test('renders welcome message with user name', () => {
    // STEP 1: Render TeacherDashboard with user
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Check welcome message includes user's first name
    expect(screen.getByText('Welcome John!')).toBeInTheDocument()
  })

  test('renders welcome message without name when user has no first_name', () => {
    // STEP 1: Create user without first_name
    const userWithoutName: MockUser = {
      ...mockUser,
      user_metadata: {}
    }
    
    // STEP 2: Render dashboard
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={userWithoutName}
      />
    )
    
    // STEP 3: Should show just "Welcome" without name
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.queryByText('Welcome !')).not.toBeInTheDocument()
  })

  test('displays correct studio count', () => {
    // STEP 1: Render dashboard with 2 studios
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Should show "2 / 50 Studios Created" (assuming paid user)
    expect(screen.getByText('2 / 50 Studios Created')).toBeInTheDocument()
  })

  test('renders create new studio card', () => {
    // STEP 1: Render dashboard
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Should have "Create New Studio" card
    expect(screen.getByText('Create New Studio')).toBeInTheDocument()
    
    // STEP 3: Should be a link to /studios/new
    const createLink = screen.getByText('Create New Studio').closest('a')
    expect(createLink).toHaveAttribute('href', '/studios/new')
  })

  test('renders StudioCard components for each studio', () => {
    // STEP 1: Render dashboard with studios
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Should render studio names
    expect(screen.getByText('Music Lessons Studio')).toBeInTheDocument()
    expect(screen.getByText('Piano Studio')).toBeInTheDocument()
    
    // STEP 3: Should render studio codes (look for text content including parent)
    expect(screen.getByText(/Studio Code:.*MUSIC/)).toBeInTheDocument()
    expect(screen.getByText(/Studio Code:.*PIANO/)).toBeInTheDocument()
  })

  test('handles empty studios list', () => {
    // STEP 1: Render with no studios
    render(
      <TeacherDashboard 
        studios={[]}
        user={mockUser}
      />
    )
    
    // STEP 2: Should still show welcome message
    expect(screen.getByText('Welcome John!')).toBeInTheDocument()
    
    // STEP 3: Should show 0 studios created
    expect(screen.getByText('0 / 50 Studios Created')).toBeInTheDocument()
    
    // STEP 4: Should still show create new studio option
    expect(screen.getByText('Create New Studio')).toBeInTheDocument()
  })

  test('renders plus icon in create studio card', () => {
    // STEP 1: Render dashboard
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Should have plus icon (SVG with path elements)
    const plusIcon = screen.getByText('Create New Studio').closest('a')?.querySelector('svg')
    expect(plusIcon).toBeInTheDocument()
    
    // STEP 3: Check SVG has correct paths for plus icon - use nullish coalescing
    const paths = plusIcon?.querySelectorAll('path') ?? []
    expect(paths).toHaveLength(2) // Plus icon has 2 path elements
  })

  test('applies correct styling classes', () => {
    // STEP 1: Render dashboard
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Check main container has correct classes (adjusted for actual CSS)
    const mainElement = screen.getByRole('main')
    expect(mainElement).toHaveClass('flex', 'flex-1', 'flex-col')
    
    // STEP 3: Check create studio card has black background
    const createCard = screen.getByText('Create New Studio').closest('.bg-black')
    expect(createCard).toBeInTheDocument()
  })

  test('displays grid layout for studios', () => {
    // STEP 1: Render dashboard
    render(
      <TeacherDashboard 
        studios={mockStudios}
        user={mockUser}
      />
    )
    
    // STEP 2: Check grid container has correct classes (find actual grid container)
    const gridContainer = screen.getByText('Create New Studio').closest('div')?.closest('.grid')
    expect(gridContainer).toHaveClass('grid', 'gap-6', 'md:grid-cols-2', 'lg:grid-cols-3')
  })

  test('handles large number of studios', () => {
    // STEP 1: Create many studios with proper typing
    const manyStudios: MockStudio[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      user_id: 'test-user-id',
      code: `STU${i}`,
      studio_name: `Studio ${i + 1}`,
      owner_schedule: {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      },
      events: null,
      students: []
    }))
    
    // STEP 2: Render with many studios
    render(
      <TeacherDashboard 
        studios={manyStudios}
        user={mockUser}
      />
    )
    
    // STEP 3: Should show correct count
    expect(screen.getByText('10 / 50 Studios Created')).toBeInTheDocument()
    
    // STEP 4: Should render all studio names
    expect(screen.getByText('Studio 1')).toBeInTheDocument()
    expect(screen.getByText('Studio 10')).toBeInTheDocument()
  })
})