/**
 * Flexible Database Schema V2 for Lesson Scheduling
 * 
 * This schema provides a normalized, flexible approach to scheduling that
 * supports variable time ranges, lesson lengths, and complex constraints.
 */

import { 
  pgTable, 
  uuid, 
  integer, 
  text, 
  time, 
  date, 
  timestamp, 
  boolean, 
  jsonb,
  serial,
  varchar,
  check,
  index
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { students as legacyStudents, studios as legacyStudios } from "./schema";
import { type TimeString, type DateString } from "./time-utils";

// New flexible schedule tables

/**
 * Schedules - Core schedule containers
 * Links to students or studios and manages their time availability/assignments
 */
export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: integer('owner_id').notNull(),
  ownerType: text('owner_type').notNull(),
  timezone: text('timezone').default('America/New_York'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  ownerTypeCheck: check('owner_type_check', sql`owner_type IN ('student', 'studio')`),
  ownerIndex: index('idx_schedules_owner').on(table.ownerId, table.ownerType),
}));

/**
 * Time Slots - Individual time periods for availability or lessons
 * Supports both recurring patterns and specific dates
 */
export const timeSlots = pgTable('time_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduleId: uuid('schedule_id').references(() => schedules.id, { onDelete: 'cascade' }).notNull(),
  startTime: time('start_time').notNull(), // TIME type for "HH:MM" format
  endTime: time('end_time').notNull(),
  dayOfWeek: integer('day_of_week'), // 0-6, Sunday = 0, null for specific dates
  specificDate: date('specific_date'), // DATE type for "YYYY-MM-DD" format
  recurrenceRule: jsonb('recurrence_rule').$type<{
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: DateString;
    exceptions?: DateString[];
  }>(),
  isAvailable: boolean('is_available').default(true).notNull(),
  metadata: jsonb('metadata')
}, (table) => ({
  dayOfWeekCheck: check('day_of_week_check', sql`day_of_week BETWEEN 0 AND 6`),
  timeValidCheck: check('time_valid_check', sql`start_time < end_time`),
  dateOrDayCheck: check('date_or_day_check', sql`(day_of_week IS NULL) != (specific_date IS NULL)`),
  scheduleIndex: index('idx_time_slots_schedule').on(table.scheduleId),
  dayIndex: index('idx_time_slots_day').on(table.dayOfWeek),
  dateIndex: index('idx_time_slots_date').on(table.specificDate),
  availableIndex: index('idx_time_slots_available').on(table.isAvailable),
}));

/**
 * Lessons - Scheduled lesson assignments
 * Links students to specific time slots with full timestamp precision
 */
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: integer('student_id').references(() => legacyStudents.id).notNull(),
  studioId: integer('studio_id').references(() => legacyStudios.id).notNull(),
  startTime: timestamp('start_time').notNull(), // TIMESTAMPTZ for full datetime
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status').default('scheduled').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  statusCheck: check('status_check', sql`status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')`),
  durationCheck: check('duration_check', sql`duration_minutes > 0 AND duration_minutes <= 480`), // Max 8 hours
  studentIndex: index('idx_lessons_student').on(table.studentId),
  studioIndex: index('idx_lessons_studio').on(table.studioId),
  startTimeIndex: index('idx_lessons_start_time').on(table.startTime),
  statusIndex: index('idx_lessons_status').on(table.status),
}));

/**
 * Student Preferences - Extended student configuration
 * Stores preferences and constraints for each student
 */
export const studentPreferences = pgTable('student_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: integer('student_id').references(() => legacyStudents.id).unique().notNull(),
  preferredDurationMinutes: integer('preferred_duration_minutes').default(30).notNull(),
  preferredTimeSlots: jsonb('preferred_time_slots').$type<{
    startTime: TimeString;
    endTime: TimeString;
    daysOfWeek: number[];
    priority: 'high' | 'medium' | 'low';
  }[]>(),
  minimumNoticeHours: integer('minimum_notice_hours').default(24).notNull(),
  maxLessonsPerDay: integer('max_lessons_per_day').default(1).notNull(),
  maxLessonsPerWeek: integer('max_lessons_per_week').default(1).notNull(),
  blackoutDates: jsonb('blackout_dates').$type<DateString[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  durationCheck: check('duration_check', sql`preferred_duration_minutes > 0 AND preferred_duration_minutes <= 480`),
  noticeCheck: check('notice_check', sql`minimum_notice_hours >= 0`),
  maxLessonsCheck: check('max_lessons_check', sql`max_lessons_per_day > 0 AND max_lessons_per_week > 0`),
  studentIndex: index('idx_student_preferences_student').on(table.studentId),
}));

/**
 * Studio Constraints - Studio-wide scheduling rules and limits
 */
export const studioConstraints = pgTable('studio_constraints', {
  id: uuid('id').defaultRandom().primaryKey(),
  studioId: integer('studio_id').references(() => legacyStudios.id).unique().notNull(),
  minLessonMinutes: integer('min_lesson_minutes').default(15).notNull(),
  maxLessonMinutes: integer('max_lesson_minutes').default(120).notNull(),
  allowedDurations: jsonb('allowed_durations').$type<number[]>().default([30, 60]), // Minutes
  breakBetweenLessons: integer('break_between_lessons').default(0).notNull(), // Minutes
  maxConsecutiveLessons: integer('max_consecutive_lessons').default(4).notNull(),
  bookingWindowDays: integer('booking_window_days').default(30).notNull(),
  cancellationWindowHours: integer('cancellation_window_hours').default(24).notNull(),
  operatingHours: jsonb('operating_hours').$type<Record<number, {
    startTime: TimeString;
    endTime: TimeString;
  } | null>>().default({
    0: null, // Sunday - closed
    1: { startTime: '09:00', endTime: '21:00' }, // Monday
    2: { startTime: '09:00', endTime: '21:00' }, // Tuesday
    3: { startTime: '09:00', endTime: '21:00' }, // Wednesday
    4: { startTime: '09:00', endTime: '21:00' }, // Thursday
    5: { startTime: '09:00', endTime: '21:00' }, // Friday
    6: { startTime: '09:00', endTime: '17:00' }, // Saturday
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  durationCheck: check('min_max_duration', sql`min_lesson_minutes <= max_lesson_minutes`),
  breakCheck: check('break_check', sql`break_between_lessons >= 0`),
  consecutiveCheck: check('consecutive_check', sql`max_consecutive_lessons > 0`),
  bookingCheck: check('booking_check', sql`booking_window_days > 0`),
  cancellationCheck: check('cancellation_check', sql`cancellation_window_hours >= 0`),
  studioIndex: index('idx_studio_constraints_studio').on(table.studioId),
}));

// Extend existing tables with new optional columns for migration support

/**
 * Enhanced Students table - Add references to new schema
 * These columns are optional to support gradual migration
 */
export const studentsV2 = pgTable('students', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  studioId: integer('studio_id').references(() => legacyStudios.id),
  // Legacy columns - will be deprecated
  schedule: jsonb('schedule'),
  lessonLength: text('lesson_length'), // Changed from enum to allow migration
  // New columns for flexible scheduling
  scheduleId: uuid('schedule_id').references(() => schedules.id),
  preferredDurationMinutes: integer('preferred_duration_minutes').default(30),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

/**
 * Enhanced Studios table - Add references to new schema
 */
export const studiosV2 = pgTable('studios', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id'),
  code: varchar('code', { length: 5 }).unique().notNull(),
  // Legacy columns - will be deprecated
  ownerSchedule: jsonb('owner_schedule'),
  studioName: text('studio_name'),
  events: jsonb('events'),
  // New columns for flexible scheduling
  scheduleId: uuid('schedule_id').references(() => schedules.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Type definitions for the new schema

export type Schedule = typeof schedules.$inferSelect;
export type ScheduleInsert = typeof schedules.$inferInsert;

export type TimeSlot = typeof timeSlots.$inferSelect;
export type TimeSlotInsert = typeof timeSlots.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type LessonInsert = typeof lessons.$inferInsert;

export type StudentPreferences = typeof studentPreferences.$inferSelect;
export type StudentPreferencesInsert = typeof studentPreferences.$inferInsert;

export type StudioConstraints = typeof studioConstraints.$inferSelect;
export type StudioConstraintsInsert = typeof studioConstraints.$inferInsert;

export type StudentV2 = typeof studentsV2.$inferSelect;
export type StudentV2Insert = typeof studentsV2.$inferInsert;

export type StudioV2 = typeof studiosV2.$inferSelect;
export type StudioV2Insert = typeof studiosV2.$inferInsert;

// Composite types for complex queries

export type StudentWithPreferences = StudentV2 & {
  preferences?: StudentPreferences;
  schedule?: Schedule;
  timeSlots?: TimeSlot[];
}

export interface StudioWithConstraints extends StudioV2 {
  constraints?: StudioConstraints;
  schedule?: Schedule;
  timeSlots?: TimeSlot[];
}

export interface LessonWithDetails extends Lesson {
  student: StudentV2;
  studio: StudioV2;
}

export interface ScheduleWithSlots extends Schedule {
  timeSlots: TimeSlot[];
}

/**
 * Helper type for migration tracking
 * Indicates which system (legacy/new) a record is using
 */
export interface MigrationStatus {
  hasLegacyData: boolean;
  hasNewData: boolean;
  migrationComplete: boolean;
  migrationDate?: Date;
}