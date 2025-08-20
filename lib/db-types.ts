/**
 * Database Types - Based on Actual Schema from Cloud Database
 * 
 * These types match the exact structure of the PostgreSQL database.
 * Verified against cloud database schema on 2025-08-15.
 * 
 * To check schema changes, use:
 * psql "postgresql://postgres:[password]@db.ufwwmolopxkhdiylsntk.supabase.co:5432/postgres" -c "\d studios"
 * psql "postgresql://postgres:[password]@db.ufwwmolopxkhdiylsntk.supabase.co:5432/postgres" -c "\d students"
 */

import type { Schedule } from "./types";

/**
 * Studios table schema
 * 
 * Database columns:
 * - id: bigint (auto-generated)
 * - created_at: timestamp with time zone
 * - user_id: uuid (FK to auth.users)
 * - code: character(5) (unique)
 * - owner_schedule: json
 * - studio_name: text (default 'My Studio')
 * - events: jsonb[]
 * - allowed_lesson_durations: jsonb (array of allowed durations in minutes)
 * - allow_custom_duration: boolean (whether students can choose custom durations)
 * - min_lesson_duration: integer (minimum allowed duration in minutes)
 * - max_lesson_duration: integer (maximum allowed duration in minutes)
 * - calendar_days: text (calendar display preference: 'weekdays' or 'full_week')
 */
export interface StudioSchema {
  id: number; // bigint in DB
  created_at: string; // timestamp with time zone
  user_id: string; // uuid
  code: string; // character(5)
  owner_schedule: Schedule | null; // json
  studio_name: string | null; // text
  events: unknown[] | null; // jsonb[] - using unknown[] to avoid Event import
  unscheduled_students: string[] | null; // jsonb array of unscheduled student IDs
  allowed_lesson_durations: number[] | null; // jsonb array of allowed durations
  allow_custom_duration: boolean | null; // boolean
  min_lesson_duration: number | null; // integer
  max_lesson_duration: number | null; // integer
  calendar_days: 'weekdays' | 'full_week' | null; // text - calendar display preference
}

/**
 * Students table schema
 * 
 * Database columns:
 * - id: bigint (auto-generated)
 * - created_at: timestamp with time zone
 * - email: text
 * - first_name: text
 * - last_name: text
 * - studio_id: bigint (FK to studios.id)
 * - schedule: json
 * - lesson_length: lesson_length enum ('30' | '60') [deprecated, use lesson_duration_minutes]
 * - lesson_duration_minutes: integer (lesson duration in minutes)
 */
export interface StudentSchema {
  id: number; // bigint in DB
  created_at: string; // timestamp with time zone
  email: string; // text
  first_name: string | null; // text
  last_name: string | null; // text
  studio_id: number; // bigint (FK)
  schedule: Schedule | null; // json
  lesson_length: "30" | "60" | null; // lesson_length enum (deprecated)
  lesson_duration_minutes: number | null; // integer - preferred lesson duration in minutes
}

/**
 * Type for inserting new students (excludes auto-generated fields)
 */
export type StudentInsertSchema = Omit<StudentSchema, 'id' | 'created_at'>;

/**
 * Type for inserting new studios (excludes auto-generated fields)
 */
export type StudioInsertSchema = Omit<StudioSchema, 'id' | 'created_at'>;

/**
 * Combined type for studios with their students (used in UI)
 */
export type StudioWithStudents = StudioSchema & {
  students: StudentSchema[];
};