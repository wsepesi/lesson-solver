import { pgTable, uuid, text, varchar, jsonb, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { type WeekSchedule, type SchedulingConstraints } from "./types";

// New simplified schema without backward compatibility
export const teachers = pgTable('teachers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id'), // Note: users table reference would need to be added if it exists
  studioName: text('studio_name'),
  studioCode: varchar('studio_code', { length: 5 }).unique(),
  availability: jsonb('availability').$type<WeekSchedule>(),
  constraints: jsonb('constraints').$type<SchedulingConstraints>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey(),
  teacherId: uuid('teacher_id').references(() => teachers.id),
  email: text('email').notNull(),
  name: text('name'),
  availability: jsonb('availability').$type<WeekSchedule>(),
  preferredDuration: integer('preferred_duration').default(60),
  maxLessonsPerWeek: integer('max_lessons_per_week').default(1),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').references(() => students.id),
  teacherId: uuid('teacher_id').references(() => teachers.id),
  dayOfWeek: integer('day_of_week').notNull(),
  startMinute: integer('start_minute').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow()
});

// Type inference for the new schema
export type Teacher = typeof teachers.$inferSelect;
export type TeacherInsert = typeof teachers.$inferInsert;
export type Student = typeof students.$inferSelect;
export type StudentInsert = typeof students.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentInsert = typeof assignments.$inferInsert;