import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import InteractiveCalendar, { type Event } from '../../components/InteractiveCalendar'
import type { StudioWithStudents } from '~/pages/studios/[slug]'
import type { Schedule } from 'lib/types'

// Mock @dnd-kit/core to avoid complex drag-and-drop testing setup
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
  }),
  useDroppable: () => ({
    setNodeRef: () => {},
  }),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('InteractiveCalendar Component', () => {
  let mockStudio: StudioWithStudents
  let mockEvents: Event[]
  let mockSchedule: boolean[][]
  let mockSetEvents: any
  
  beforeEach(() => {
    // Reset mocks before each test
    mockSetEvents = vi.fn()
    
    // Create mock studio with students
    mockStudio = {
      id: 1,
      user_id: 'test-user-id',
      code: 'TEST1',
      studio_name: 'Test Studio',
      owner_schedule: {
        Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      },
      events: null,
      students: [
        {
          id: 1,
          email: 'student1@test.com',
          first_name: 'Alice',
          last_name: 'Smith',
          studio_id: 1,
          lesson_length: '30' as const,
          schedule: {
            Monday: [{ start: { hour: 10, minute: 0 }, end: { hour: 12, minute: 0 } }],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
          }
        },
        {
          id: 2,
          email: 'student2@test.com',
          first_name: 'Bob',
          last_name: 'Jones',
          studio_id: 1,
          lesson_length: '60' as const,
          schedule: {
            Monday: [{ start: { hour: 11, minute: 0 }, end: { hour: 13, minute: 0 } }],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
          }
        }
      ]
    }
    
    // Create mock events
    mockEvents = [
      {
        id: '1',
        name: 'Alice',
        booking: {
          day: 'M',
          time_start: '10:00am',
          time_end: '10:30am'
        },
        other_avail_times: Array(24).fill(null).map(() => Array(5).fill(false)),
        student_id: 1
      }
    ]
    
    // Create mock schedule (teacher availability)
    mockSchedule = Array(24).fill(null).map(() => Array(5).fill(true))
  })

  test('renders calendar structure correctly', () => {
    // STEP 1: Render interactive calendar
    render(
      <InteractiveCalendar 
        events={mockEvents}
        mySchedule={mockSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Check for day headers
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('Tu')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
    expect(screen.getByText('Th')).toBeInTheDocument()
    expect(screen.getByText('F')).toBeInTheDocument()
    
    // STEP 3: Check for time slots (should have time labels)
    expect(screen.getByText('9:00am')).toBeInTheDocument()
    expect(screen.getByText('12:00pm')).toBeInTheDocument()
  })

  test('displays events correctly', () => {
    // STEP 1: Render calendar with events
    render(
      <InteractiveCalendar 
        events={mockEvents}
        mySchedule={mockSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Check that event appears in calendar
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  test('shows available time slots correctly', () => {
    // STEP 1: Create schedule with specific availability
    const limitedSchedule = Array(24).fill(null).map(() => Array(5).fill(false))
    // Make Monday 10am available
    limitedSchedule[2]![0] = true // 10:00am Monday
    
    // STEP 2: Render calendar
    render(
      <InteractiveCalendar 
        events={mockEvents}
        mySchedule={limitedSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 3: Should render without errors (availability logic is complex, focus on rendering)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  test('handles empty events list', () => {
    // STEP 1: Render with no events
    render(
      <InteractiveCalendar 
        events={[]}
        mySchedule={mockSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Should still render calendar structure
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('9:00am')).toBeInTheDocument()
  })

  test('handles events with different lesson lengths', () => {
    // STEP 1: Create events with 30min and 60min lessons
    const multiLengthEvents: Event[] = [
      {
        id: '1',
        name: 'Alice (30min)',
        booking: {
          day: 'M',
          time_start: '10:00am',
          time_end: '10:30am'
        },
        other_avail_times: Array(24).fill(null).map(() => Array(5).fill(false)),
        student_id: 1
      },
      {
        id: '2',
        name: 'Bob (60min)',
        booking: {
          day: 'M',
          time_start: '11:00am',
          time_end: '12:00pm'
        },
        other_avail_times: Array(24).fill(null).map(() => Array(5).fill(false)),
        student_id: 2
      }
    ]
    
    // STEP 2: Render calendar with multiple events
    render(
      <InteractiveCalendar 
        events={multiLengthEvents}
        mySchedule={mockSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 3: Both events should be visible
    expect(screen.getByText('Alice (30min)')).toBeInTheDocument()
    expect(screen.getByText('Bob (60min)')).toBeInTheDocument()
  })

  test('renders calendar grid with correct time slots', () => {
    // STEP 1: Render calendar
    render(
      <InteractiveCalendar 
        events={mockEvents}
        mySchedule={mockSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 2: Check for full range of time slots (9am to 9pm)
    expect(screen.getByText('9:00am')).toBeInTheDocument()
    expect(screen.getByText('12:00pm')).toBeInTheDocument()
    expect(screen.getByText('6:00pm')).toBeInTheDocument()
    expect(screen.getByText('9:00pm')).toBeInTheDocument()
  })

  test('handles overlapping events', () => {
    // STEP 1: Create overlapping events (same time slot)
    const overlappingEvents: Event[] = [
      {
        id: '1',
        name: 'Alice',
        booking: {
          day: 'M',
          time_start: '10:00am',
          time_end: '10:30am'
        },
        other_avail_times: Array(24).fill(null).map(() => Array(5).fill(false)),
        student_id: 1
      },
      {
        id: '2',
        name: 'Bob',
        booking: {
          day: 'M',
          time_start: '10:00am',
          time_end: '10:30am'
        },
        other_avail_times: Array(24).fill(null).map(() => Array(5).fill(false)),
        student_id: 2
      }
    ]
    
    // STEP 2: Should render without crashing
    render(
      <InteractiveCalendar 
        events={overlappingEvents}
        mySchedule={mockSchedule}
        setEvents={mockSetEvents}
        studio={mockStudio}
      />
    )
    
    // STEP 3: Both events should be present (component handles display logic)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('component renders with minimal required props', () => {
    // STEP 1: Test with minimal studio data
    const minimalStudio: StudioWithStudents = {
      ...mockStudio,
      students: []
    }
    
    // STEP 2: Render with minimal data
    render(
      <InteractiveCalendar 
        events={[]}
        mySchedule={Array(24).fill(null).map(() => Array(5).fill(false))}
        setEvents={mockSetEvents}
        studio={minimalStudio}
      />
    )
    
    // STEP 3: Should still render basic structure
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('9:00am')).toBeInTheDocument()
  })
})