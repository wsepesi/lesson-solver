# Priority 5: Data Model Redesign & Solver Architecture Overhaul

**Status:** Major Refactoring - Long-term Project
**Estimated Time:** 20-30 hours (multiple sprints)
**Prerequisites:** Priorities 1-4 completed, comprehensive test suite in place
**Goal:** Replace boolean grid system with flexible time representation supporting minute-level precision and variable lesson lengths

## Overview

The current boolean grid approach (`bool[][]`) severely limits the application's real-world usability:
- Fixed 30/60 minute lesson lengths
- Half-hour start times only
- 9am-9pm time window restriction
- Memory inefficient for sparse schedules
- Difficult to represent complex availability patterns

This plan redesigns the core data model and solver algorithm to be flexible, efficient, and realistic.

## Phase 1: New Data Model Design (4-6 hours)

### Task 5.1: Time Representation System

**Replace current `Time` class with more flexible system:**

**Create `lib/types/time.ts`:**
```typescript
// ISO 8601 time string: "HH:MM" (24-hour format)
export type TimeString = string & { __brand: 'TimeString' }

// Date-time string: "YYYY-MM-DDTHH:MM:SS"
export type DateTimeString = string & { __brand: 'DateTimeString' }

export class TimeRange {
  constructor(
    public readonly start: TimeString,
    public readonly end: TimeString,
    public readonly date?: string // ISO date string "YYYY-MM-DD"
  ) {
    if (!this.isValid()) {
      throw new Error(`Invalid time range: ${start} to ${end}`)
    }
  }

  static fromMinutes(startMinutes: number, endMinutes: number): TimeRange {
    return new TimeRange(
      minutesToTimeString(startMinutes),
      minutesToTimeString(endMinutes)
    )
  }

  static parse(timeString: string): TimeRange {
    // Parse formats like "09:00-17:30", "9am-5:30pm"
    // Implementation details...
  }

  duration(): number {
    return timeStringToMinutes(this.end) - timeStringToMinutes(this.start)
  }

  contains(other: TimeRange): boolean {
    return (
      timeStringToMinutes(this.start) <= timeStringToMinutes(other.start) &&
      timeStringToMinutes(this.end) >= timeStringToMinutes(other.end)
    )
  }

  overlaps(other: TimeRange): boolean {
    return (
      timeStringToMinutes(this.start) < timeStringToMinutes(other.end) &&
      timeStringToMinutes(this.end) > timeStringToMinutes(other.start)
    )
  }

  split(intervalMinutes: number): TimeRange[] {
    // Split into smaller intervals for scheduling
  }

  private isValid(): boolean {
    const startMinutes = timeStringToMinutes(this.start)
    const endMinutes = timeStringToMinutes(this.end)
    return startMinutes < endMinutes && startMinutes >= 0 && endMinutes <= 1440
  }
}

// Utility functions
export function timeStringToMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTimeString(minutes: number): TimeString {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}` as TimeString
}

export function parseUserTime(input: string): TimeString {
  // Handle various formats: "9am", "14:30", "2:30 PM", etc.
  // Implementation details...
}
```

### Task 5.2: Flexible Schedule Representation

**Create `lib/types/schedule.ts`:**
```typescript
import { TimeRange, TimeString } from './time'

export interface ScheduleItem {
  id: string
  timeRange: TimeRange
  metadata?: {
    description?: string
    recurring?: RecurrencePattern
    priority?: 'high' | 'medium' | 'low'
  }
}

export interface RecurrencePattern {
  type: 'weekly' | 'daily' | 'custom'
  interval: number // Every N weeks/days
  daysOfWeek?: number[] // 0-6, Sunday = 0
  endDate?: string // ISO date string
  exceptions?: string[] // ISO date strings to skip
}

export interface Schedule {
  items: ScheduleItem[]
  timezone: string // e.g., "America/New_York"
  metadata?: {
    name?: string
    description?: string
    created: string // ISO datetime
    modified: string // ISO datetime
  }
}

// Helper class for schedule operations
export class ScheduleManager {
  constructor(private schedule: Schedule) {}

  // Get availability for a specific date
  getAvailabilityForDate(date: string): TimeRange[] {
    // Implementation
  }

  // Find free slots of specific duration
  findFreeSlots(date: string, durationMinutes: number, minDuration?: number): TimeRange[] {
    // Implementation
  }

  // Add new availability
  addAvailability(timeRange: TimeRange, recurring?: RecurrencePattern): void {
    // Implementation
  }

  // Remove availability
  removeAvailability(itemId: string): void {
    // Implementation
  }

  // Check for conflicts
  hasConflicts(): { conflicting: ScheduleItem[], severity: 'warning' | 'error' }[] {
    // Implementation
  }

  // Merge overlapping time ranges
  optimize(): Schedule {
    // Combine adjacent/overlapping ranges
  }

  // Convert to legacy boolean grid (for gradual migration)
  toBooleanGrid(startHour = 9, endHour = 21): boolean[][] {
    // Implementation for backward compatibility
  }
}
```

### Task 5.3: Enhanced Student and Studio Models

**Update `lib/types/entities.ts`:**
```typescript
import { Schedule, TimeRange } from './schedule'

export interface Student {
  id: string
  email: string
  firstName: string
  lastName: string
  preferences: {
    lessonDuration: number // minutes, any value
    preferredTimes?: TimeRange[] // preferred time slots
    minimumNotice?: number // hours before lesson
    maxLessonsPerDay?: number
    maxLessonsPerWeek?: number
    blackoutDates?: string[] // ISO date strings
  }
  schedule: Schedule
  metadata?: {
    instruments?: string[]
    level?: 'beginner' | 'intermediate' | 'advanced'
    notes?: string
  }
}

export interface Studio {
  id: string
  name: string
  code: string
  ownerId: string
  schedule: Schedule
  constraints: {
    minLessonDuration: number // minutes
    maxLessonDuration: number // minutes
    allowedDurations?: number[] // specific allowed durations
    bookingWindow: number // days in advance students can book
    cancellationWindow: number // hours before lesson
    breakBetweenLessons: number // minutes
    maxConsecutiveLessons: number
  }
  students: Student[]
  metadata?: {
    description?: string
    timezone: string
    created: string
    modified: string
  }
}

export interface Assignment {
  id: string
  studentId: string
  studioId: string
  timeRange: TimeRange
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  metadata?: {
    duration: number // minutes
    notes?: string
    createdAt: string
    modifiedAt: string
  }
}
```

## Phase 2: Database Schema Migration (3-4 hours)

### Task 5.4: New Database Schema

**Create migration `supabase/migrations/002_flexible_scheduling.sql`:**
```sql
-- Enhanced schedule representation
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL, -- student or studio ID
    owner_type TEXT NOT NULL CHECK (owner_type IN ('student', 'studio')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced students table
ALTER TABLE students 
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN schedule_id UUID REFERENCES schedules(id),
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Enhanced studios table  
ALTER TABLE studios
ADD COLUMN constraints JSONB DEFAULT '{}'::jsonb,
ADD COLUMN schedule_id UUID REFERENCES schedules(id),
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Assignment tracking
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INTEGER REFERENCES students(id),
    studio_id INTEGER REFERENCES studios(id),
    time_range JSONB NOT NULL, -- {start: "HH:MM", end: "HH:MM", date: "YYYY-MM-DD"}
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'confirmed', 'cancelled', 'completed')
    ),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_schedules_owner ON schedules(owner_id, owner_type);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_studio ON assignments(studio_id);
CREATE INDEX idx_assignments_time ON assignments USING GIN (time_range);

-- Migration script to convert existing data
-- This would be implemented as a data migration
-- TODO: Convert existing JSON schedules to new format
```

### Task 5.5: Data Migration Strategy

**Create migration script `scripts/migrate-schedules.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'
import { ScheduleManager, TimeRange } from '../lib/types/schedule'

async function migrateSchedules() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  // 1. Migrate student schedules
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .not('schedule', 'is', null)
  
  for (const student of students || []) {
    const legacySchedule = student.schedule
    const newSchedule = convertLegacySchedule(legacySchedule)
    
    // Create new schedule record
    const { data: scheduleRecord } = await supabase
      .from('schedules')
      .insert({
        owner_id: student.id.toString(),
        owner_type: 'student',
        items: newSchedule.items,
        timezone: 'UTC', // Default, should be updated
        metadata: { migrated_from: 'legacy_format' }
      })
      .single()
    
    // Update student record
    await supabase
      .from('students')
      .update({ 
        schedule_id: scheduleRecord.id,
        preferences: {
          lessonDuration: student.lesson_length === '30' ? 30 : 60
        }
      })
      .eq('id', student.id)
  }
  
  // 2. Migrate studio schedules (similar process)
  // 3. Create assignments from existing data
}

function convertLegacySchedule(legacySchedule: any): Schedule {
  // Convert old {Monday: [{start: {hour: 9, minute: 0}, end: {...}}]} format
  // to new TimeRange-based format
}
```

## Phase 3: New Solver Algorithm (8-10 hours)

### Task 5.6: Constraint Satisfaction Framework

**Create `lib/solver/constraints.ts`:**
```typescript
import { TimeRange, Student, Studio, Assignment } from '../types'

export interface Constraint {
  id: string
  name: string
  description: string
  validate(assignment: Assignment, context: SolverContext): ConstraintViolation[]
  priority: 'hard' | 'soft' | 'preference'
}

export interface ConstraintViolation {
  constraintId: string
  severity: 'error' | 'warning' | 'info'
  message: string
  affectedEntities: string[]
}

export interface SolverContext {
  studio: Studio
  students: Student[]
  existingAssignments: Assignment[]
  dateRange: { start: string, end: string }
}

// Built-in constraints
export class AvailabilityConstraint implements Constraint {
  id = 'availability'
  name = 'Availability Constraint'
  description = 'Students and teachers must be available at scheduled times'
  priority = 'hard' as const

  validate(assignment: Assignment, context: SolverContext): ConstraintViolation[] {
    const student = context.students.find(s => s.id === assignment.studentId)!
    const studio = context.studio
    
    const violations: ConstraintViolation[] = []
    
    // Check student availability
    const studentAvailable = this.isAvailable(student.schedule, assignment.timeRange)
    if (!studentAvailable) {
      violations.push({
        constraintId: this.id,
        severity: 'error',
        message: `Student ${student.firstName} is not available at ${assignment.timeRange.start}-${assignment.timeRange.end}`,
        affectedEntities: [assignment.studentId]
      })
    }
    
    // Check studio availability
    const studioAvailable = this.isAvailable(studio.schedule, assignment.timeRange)
    if (!studioAvailable) {
      violations.push({
        constraintId: this.id,
        severity: 'error', 
        message: `Studio is not available at ${assignment.timeRange.start}-${assignment.timeRange.end}`,
        affectedEntities: [assignment.studioId]
      })
    }
    
    return violations
  }

  private isAvailable(schedule: Schedule, timeRange: TimeRange): boolean {
    // Implementation
  }
}

export class ConflictConstraint implements Constraint {
  id = 'conflict'
  name = 'No Overlapping Assignments'
  description = 'No two students can be assigned the same time slot'
  priority = 'hard' as const

  validate(assignment: Assignment, context: SolverContext): ConstraintViolation[] {
    const conflicts = context.existingAssignments.filter(existing => 
      existing.timeRange.overlaps(assignment.timeRange)
    )
    
    return conflicts.map(conflict => ({
      constraintId: this.id,
      severity: 'error' as const,
      message: `Assignment conflicts with existing assignment at ${conflict.timeRange.start}-${conflict.timeRange.end}`,
      affectedEntities: [assignment.studentId, conflict.studentId]
    }))
  }
}

export class LessonDurationConstraint implements Constraint {
  id = 'lesson_duration'
  name = 'Lesson Duration'
  description = 'Lessons must match student preferences and studio constraints'
  priority = 'hard' as const

  validate(assignment: Assignment, context: SolverContext): ConstraintViolation[] {
    const student = context.students.find(s => s.id === assignment.studentId)!
    const studio = context.studio
    const duration = assignment.timeRange.duration()
    
    const violations: ConstraintViolation[] = []
    
    // Check against student preference
    if (duration !== student.preferences.lessonDuration) {
      violations.push({
        constraintId: this.id,
        severity: 'warning',
        message: `Lesson duration ${duration}min doesn't match student preference ${student.preferences.lessonDuration}min`,
        affectedEntities: [assignment.studentId]
      })
    }
    
    // Check against studio constraints
    if (duration < studio.constraints.minLessonDuration || 
        duration > studio.constraints.maxLessonDuration) {
      violations.push({
        constraintId: this.id,
        severity: 'error',
        message: `Lesson duration ${duration}min outside studio limits (${studio.constraints.minLessonDuration}-${studio.constraints.maxLessonDuration}min)`,
        affectedEntities: [assignment.studentId, assignment.studioId]
      })
    }
    
    return violations
  }
}
```

### Task 5.7: Advanced Solver Implementation

**Create `lib/solver/advanced-solver.ts`:**
```typescript
import { Student, Studio, Assignment, TimeRange } from '../types'
import { Constraint, SolverContext, ConstraintViolation } from './constraints'

export interface SolverOptions {
  constraints: Constraint[]
  objectives: Objective[]
  timeouts: {
    maxIterations: number
    maxTimeMs: number
  }
  preferences: {
    allowPartialSolutions: boolean
    prioritizeStudentPreferences: boolean
    balanceWorkload: boolean
  }
}

export interface Objective {
  id: string
  name: string
  calculate(assignments: Assignment[], context: SolverContext): number
  weight: number
}

export interface SolverResult {
  assignments: Assignment[]
  violations: ConstraintViolation[]
  score: number
  metadata: {
    iterations: number
    timeMs: number
    coverage: number // percentage of students scheduled
    status: 'optimal' | 'good' | 'partial' | 'failed'
  }
}

export class AdvancedScheduleSolver {
  constructor(private options: SolverOptions) {}

  async solve(studio: Studio, students: Student[], dateRange: { start: string, end: string }): Promise<SolverResult> {
    const context: SolverContext = {
      studio,
      students,
      existingAssignments: [],
      dateRange
    }

    const startTime = performance.now()
    let iterations = 0
    let bestSolution: Assignment[] = []
    let bestScore = -Infinity

    // Generate initial candidate slots
    const candidateSlots = this.generateCandidateSlots(context)
    
    // Use multiple solution strategies
    const strategies = [
      this.greedyScheduling.bind(this),
      this.constraintPropagation.bind(this),
      this.geneticAlgorithm.bind(this),
      this.simulatedAnnealing.bind(this)
    ]

    for (const strategy of strategies) {
      if (performance.now() - startTime > this.options.timeouts.maxTimeMs) break
      
      const solution = await strategy(context, candidateSlots)
      const score = this.evaluateSolution(solution, context)
      
      if (score > bestScore) {
        bestScore = score
        bestSolution = solution
      }
      
      iterations++
    }

    const violations = this.validateSolution(bestSolution, context)
    
    return {
      assignments: bestSolution,
      violations,
      score: bestScore,
      metadata: {
        iterations,
        timeMs: performance.now() - startTime,
        coverage: bestSolution.length / students.length,
        status: this.determineStatus(bestSolution, violations, students.length)
      }
    }
  }

  private generateCandidateSlots(context: SolverContext): TimeRange[] {
    // Generate all possible time slots based on:
    // 1. Studio availability
    // 2. Student availability overlaps
    // 3. Lesson duration requirements
    // 4. Break constraints
  }

  private async greedyScheduling(context: SolverContext, candidates: TimeRange[]): Promise<Assignment[]> {
    // Greedy algorithm: assign students to best available slots
    const assignments: Assignment[] = []
    const remainingStudents = [...context.students]
    
    // Sort students by constraint difficulty (fewer options first)
    remainingStudents.sort((a, b) => 
      this.getViableSlots(a, candidates, context).length - 
      this.getViableSlots(b, candidates, context).length
    )

    for (const student of remainingStudents) {
      const viableSlots = this.getViableSlots(student, candidates, context)
      if (viableSlots.length === 0) continue

      // Score each slot
      const scoredSlots = viableSlots.map(slot => ({
        slot,
        score: this.scoreSlotForStudent(slot, student, context)
      }))

      // Pick best slot
      scoredSlots.sort((a, b) => b.score - a.score)
      const bestSlot = scoredSlots[0].slot

      const assignment: Assignment = {
        id: `${student.id}-${bestSlot.start}`,
        studentId: student.id,
        studioId: context.studio.id,
        timeRange: bestSlot,
        status: 'scheduled'
      }

      assignments.push(assignment)
      // Remove conflicting slots from candidates
      this.removeConflictingSlots(candidates, bestSlot)
    }

    return assignments
  }

  private async constraintPropagation(context: SolverContext, candidates: TimeRange[]): Promise<Assignment[]> {
    // CSP-based approach with constraint propagation
    // Implementation of arc consistency, forward checking, etc.
  }

  private async geneticAlgorithm(context: SolverContext, candidates: TimeRange[]): Promise<Assignment[]> {
    // Genetic algorithm for optimization
    // Population of solutions, crossover, mutation, selection
  }

  private async simulatedAnnealing(context: SolverContext, candidates: TimeRange[]): Promise<Assignment[]> {
    // Simulated annealing for local optimization
    // Random perturbations with decreasing acceptance probability
  }

  private evaluateSolution(assignments: Assignment[], context: SolverContext): number {
    // Combine objective function scores
    return this.options.objectives.reduce((total, objective) => 
      total + objective.calculate(assignments, context) * objective.weight, 0
    )
  }

  private validateSolution(assignments: Assignment[], context: SolverContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []
    
    for (const assignment of assignments) {
      for (const constraint of this.options.constraints) {
        violations.push(...constraint.validate(assignment, { ...context, existingAssignments: assignments }))
      }
    }
    
    return violations
  }
}
```

### Task 5.8: Objective Functions

**Create `lib/solver/objectives.ts`:**
```typescript
import { Assignment, SolverContext } from './types'

export class StudentPreferenceObjective implements Objective {
  id = 'student_preference'
  name = 'Student Preference Satisfaction'
  weight = 1.0

  calculate(assignments: Assignment[], context: SolverContext): number {
    let totalScore = 0
    
    for (const assignment of assignments) {
      const student = context.students.find(s => s.id === assignment.studentId)!
      
      // Score based on preferred times
      if (student.preferences.preferredTimes) {
        const matchesPreference = student.preferences.preferredTimes.some(
          preferred => preferred.overlaps(assignment.timeRange)
        )
        totalScore += matchesPreference ? 10 : 0
      }
      
      // Score based on lesson duration preference
      const durationMatch = assignment.timeRange.duration() === student.preferences.lessonDuration
      totalScore += durationMatch ? 5 : -2
    }
    
    return totalScore
  }
}

export class WorkloadBalanceObjective implements Objective {
  id = 'workload_balance'
  name = 'Teacher Workload Balance'
  weight = 0.5

  calculate(assignments: Assignment[], context: SolverContext): number {
    // Prefer even distribution across days
    const dailyLoad = new Map<string, number>()
    
    for (const assignment of assignments) {
      const date = assignment.timeRange.date || 'unknown'
      dailyLoad.set(date, (dailyLoad.get(date) || 0) + 1)
    }
    
    const loads = Array.from(dailyLoad.values())
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length
    
    return -variance // Lower variance is better
  }
}

export class CompactnessObjective implements Objective {
  id = 'compactness'
  name = 'Schedule Compactness'
  weight = 0.3

  calculate(assignments: Assignment[], context: SolverContext): number {
    // Prefer fewer, longer blocks of consecutive lessons
    // Group by date and calculate gaps
    // Implementation details...
  }
}
```

## Phase 4: UI Components Update (4-6 hours)

### Task 5.9: Enhanced Calendar Component

**Create `src/components/FlexibleCalendar.tsx`:**
```typescript
import React, { useState, useCallback } from 'react'
import { TimeRange, parseUserTime } from 'lib/types/time'

interface FlexibleCalendarProps {
  schedule: Schedule
  onScheduleChange: (schedule: Schedule) => void
  constraints?: {
    minDuration: number // minutes
    maxDuration: number // minutes
    granularity: number // minutes (e.g., 15, 30, 60)
  }
  mode: 'select' | 'view'
}

export const FlexibleCalendar: React.FC<FlexibleCalendarProps> = ({
  schedule,
  onScheduleChange,
  constraints = { minDuration: 30, maxDuration: 180, granularity: 15 },
  mode
}) => {
  const [selectedRange, setSelectedRange] = useState<Partial<TimeRange> | null>(null)
  const [customTimeInput, setCustomTimeInput] = useState('')

  const handleTimeSlotClick = useCallback((time: string) => {
    if (mode === 'view') return

    if (!selectedRange?.start) {
      setSelectedRange({ start: time as TimeString })
    } else {
      const newRange = new TimeRange(selectedRange.start, time as TimeString)
      
      // Validate duration
      if (newRange.duration() >= constraints.minDuration && 
          newRange.duration() <= constraints.maxDuration) {
        
        const newSchedule = {
          ...schedule,
          items: [...schedule.items, {
            id: generateId(),
            timeRange: newRange
          }]
        }
        
        onScheduleChange(newSchedule)
      }
      
      setSelectedRange(null)
    }
  }, [selectedRange, constraints, schedule, onScheduleChange, mode])

  const handleCustomTimeAdd = useCallback(() => {
    try {
      // Parse input like "9:00-10:30", "9am-10:30am", etc.
      const range = TimeRange.parse(customTimeInput)
      
      const newSchedule = {
        ...schedule,
        items: [...schedule.items, {
          id: generateId(),
          timeRange: range
        }]
      }
      
      onScheduleChange(newSchedule)
      setCustomTimeInput('')
    } catch (error) {
      // Handle invalid input
    }
  }, [customTimeInput, schedule, onScheduleChange])

  const renderTimeSlots = () => {
    // Render interactive time grid with minute-level precision
    // Support different granularities (15min, 30min, etc.)
  }

  const renderScheduleItems = () => {
    // Render existing schedule items with edit/delete functionality
  }

  return (
    <div className="flexible-calendar">
      {/* Time grid with minute precision */}
      <div className="time-grid">
        {renderTimeSlots()}
      </div>
      
      {/* Schedule items overlay */}
      <div className="schedule-overlay">
        {renderScheduleItems()}
      </div>
      
      {/* Custom time input */}
      {mode === 'select' && (
        <div className="custom-time-input">
          <input
            type="text"
            value={customTimeInput}
            onChange={(e) => setCustomTimeInput(e.target.value)}
            placeholder="e.g., 9:00-10:30, 2pm-3:30pm"
          />
          <button onClick={handleCustomTimeAdd}>Add Time</button>
        </div>
      )}
    </div>
  )
}
```

### Task 5.10: Enhanced Solver Configuration

**Create `src/components/AdvancedSolverDialog.tsx`:**
```typescript
interface AdvancedSolverDialogProps {
  studio: Studio
  students: Student[]
  onSolve: (options: SolverOptions) => void
}

export const AdvancedSolverDialog: React.FC<AdvancedSolverDialogProps> = ({
  studio,
  students,
  onSolve
}) => {
  const [constraints, setConstraints] = useState<string[]>(['availability', 'conflict'])
  const [objectives, setObjectives] = useState([
    { id: 'student_preference', weight: 1.0 },
    { id: 'workload_balance', weight: 0.5 }
  ])
  const [dateRange, setDateRange] = useState({
    start: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 8), 'yyyy-MM-dd')
  })

  const handleSolve = () => {
    const solverOptions: SolverOptions = {
      constraints: availableConstraints.filter(c => constraints.includes(c.id)),
      objectives,
      timeouts: { maxIterations: 1000, maxTimeMs: 30000 },
      preferences: {
        allowPartialSolutions: true,
        prioritizeStudentPreferences: true,
        balanceWorkload: true
      }
    }
    
    onSolve(solverOptions)
  }

  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Advanced Schedule Solver</DialogTitle>
        </DialogHeader>
        
        {/* Date range selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Start Date</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div>
            <label>End Date</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>

        {/* Constraint selection */}
        <div>
          <h3>Constraints</h3>
          {availableConstraints.map(constraint => (
            <label key={constraint.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={constraints.includes(constraint.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConstraints(prev => [...prev, constraint.id])
                  } else {
                    setConstraints(prev => prev.filter(id => id !== constraint.id))
                  }
                }}
              />
              <span>{constraint.name}</span>
              <span className="text-sm text-gray-500">({constraint.priority})</span>
            </label>
          ))}
        </div>

        {/* Objective configuration */}
        <div>
          <h3>Optimization Objectives</h3>
          {objectives.map((objective, index) => (
            <div key={objective.id} className="flex items-center space-x-2">
              <span>{objective.id}</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={objective.weight}
                onChange={(e) => {
                  const newObjectives = [...objectives]
                  newObjectives[index].weight = parseFloat(e.target.value)
                  setObjectives(newObjectives)
                }}
              />
              <span>{objective.weight.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleSolve}>Generate Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Phase 5: Migration and Testing (3-4 hours)

### Task 5.11: Gradual Migration Strategy

**Create migration utilities `lib/migration/legacy-adapter.ts`:**
```typescript
// Adapter to maintain compatibility during migration
export class LegacyScheduleAdapter {
  // Convert new TimeRange-based schedules to old boolean grid format
  static toBooleanGrid(schedule: Schedule, startHour = 9, endHour = 21): boolean[][] {
    // Implementation for backward compatibility
  }

  // Convert old boolean grid to new TimeRange format
  static fromBooleanGrid(grid: boolean[][], startHour = 9): Schedule {
    // Implementation for migration
  }

  // Detect which format is being used
  static isLegacyFormat(data: any): boolean {
    // Implementation
  }
}

// Feature flag system for gradual rollout
export class FeatureFlags {
  static useNewScheduleFormat(): boolean {
    return process.env.NEXT_PUBLIC_USE_NEW_SCHEDULE_FORMAT === 'true'
  }

  static useAdvancedSolver(): boolean {
    return process.env.NEXT_PUBLIC_USE_ADVANCED_SOLVER === 'true'
  }
}
```

### Task 5.12: Comprehensive Testing

**Test coverage for new system:**
1. **Time representation tests** - TimeRange operations, parsing, validation
2. **Schedule management tests** - ScheduleManager functionality
3. **Constraint tests** - All constraint implementations
4. **Solver tests** - Algorithm correctness and performance
5. **Migration tests** - Legacy format conversion
6. **Integration tests** - Full system with new components
7. **Performance tests** - Large-scale scheduling scenarios

### Task 5.13: Performance Benchmarking

**Create performance test suite:**
```typescript
describe('Advanced Solver Performance', () => {
  test('should handle 50 students within 10 seconds', async () => {
    const studio = createTestStudio()
    const students = Array.from({ length: 50 }, createTestStudent)
    
    const start = performance.now()
    const result = await solver.solve(studio, students, { start: '2024-01-01', end: '2024-01-07' })
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(10000)
    expect(result.metadata.coverage).toBeGreaterThan(0.8) // 80% success rate
  })

  test('should find optimal solution for simple cases', () => {
    // Test known optimal cases
  })

  test('should gracefully handle impossible constraints', () => {
    // Test error handling
  })
})
```

## Success Criteria

### Functionality
- [ ] Support any lesson duration (not just 30/60 minutes)
- [ ] Support minute-level scheduling precision
- [ ] Flexible time windows (not limited to 9am-9pm)
- [ ] Complex availability patterns (recurring, exceptions)
- [ ] Multiple optimization objectives
- [ ] Graceful handling of impossible constraints

### Performance
- [ ] Memory usage reduced by 70%+ for sparse schedules
- [ ] Solver handles 50+ students in <10 seconds
- [ ] UI responsive for minute-level interactions
- [ ] Database queries optimized for new schema

### User Experience
- [ ] Intuitive time selection interface
- [ ] Clear constraint violation feedback
- [ ] Advanced solver configuration options
- [ ] Smooth migration from old system
- [ ] No regression in existing workflows

### Technical Quality
- [ ] 90%+ test coverage for new components
- [ ] Type-safe implementation throughout
- [ ] Comprehensive constraint validation
- [ ] Extensible architecture for future needs
- [ ] Proper error handling and recovery

## Migration Timeline

**Phase 1 (Weeks 1-2):** Core data model and time representation
**Phase 2 (Week 3):** Database schema and migration scripts  
**Phase 3 (Weeks 4-6):** Advanced solver implementation
**Phase 4 (Weeks 7-8):** UI components and user experience
**Phase 5 (Week 9):** Migration, testing, and deployment

**Rollout Strategy:**
1. Feature flags to enable new system gradually
2. A/B testing with subset of users
3. Parallel running of old and new systems
4. Gradual migration of existing data
5. Full cutover after validation

This represents a significant architectural improvement that will make the lesson scheduling system much more practical and flexible for real-world use cases.