import { integer, json, jsonb, pgEnum, pgTable, serial, text, uuid, varchar } from "drizzle-orm/pg-core";
import { type Schedule } from "./types";
import { createInsertSchema } from 'drizzle-zod'
import { type Event } from "../src/components/InteractiveCalendar";

export const lessonLengthEnum = pgEnum('lesson_length', ['30', '60'])

export const students = pgTable('students', {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    first_name: text('first_name'),
    last_name: text('last_name'),
    studio_id: integer('studio_id').references(() => studios.id),
    schedule: json('schedule'),
    lesson_length: lessonLengthEnum('lesson_length'),
})

export const studios = pgTable('studios', {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id'),
    code: varchar('code', { length: 5 }).unique().notNull(),
    owner_schedule: json('owner_schedule'),
    studio_name: text('studio_name'),
    events: jsonb('events').$type<Event[]>()
})

// export const schedules = pgTable('schedules', {
//     id: serial('id').primaryKey(),
//     student_id: integer('student_id').references(() => students.id),
//     studio_id: integer('studio_id').references(() => studios.id),
//     schedule: json('schedule'),
//     lesson_length: lessonLengthEnum('lesson_length'),
// })

export type StudioSchema = Omit<typeof studios.$inferSelect, 'owner_schedule'> & { owner_schedule: Schedule }
export type StudentSchema = Omit<typeof students.$inferSelect, 'schedule'> & { schedule: Schedule }
export type StudentInsertSchema = typeof students.$inferInsert

export const insertStudentSchema = createInsertSchema(students)