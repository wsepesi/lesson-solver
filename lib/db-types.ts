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
 */
export interface StudioSchema {
  id: number; // bigint in DB
  created_at: string; // timestamp with time zone
  user_id: string; // uuid
  code: string; // character(5)
  owner_schedule: Schedule | null; // json
  studio_name: string | null; // text
  events: unknown[] | null; // jsonb[] - using unknown[] to avoid Event import
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
 * - lesson_length: lesson_length enum ('30' | '60')
 */
export interface StudentSchema {
  id: number; // bigint in DB
  created_at: string; // timestamp with time zone
  email: string; // text
  first_name: string | null; // text
  last_name: string | null; // text
  studio_id: number; // bigint (FK)
  schedule: Schedule | null; // json
  lesson_length: "30" | "60" | null; // lesson_length enum
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