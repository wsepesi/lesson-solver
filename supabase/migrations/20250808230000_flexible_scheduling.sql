-- Migration: Flexible Scheduling System
-- Adds new tables for flexible lesson scheduling while maintaining backward compatibility
-- Date: 2025-08-08
-- Description: Introduces normalized scheduling tables to support variable lesson lengths,
--              custom time ranges, and complex scheduling constraints

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create schedules table - Core schedule containers
CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "owner_id" BIGINT NOT NULL,
    "owner_type" TEXT NOT NULL CHECK (owner_type IN ('student', 'studio')),
    "timezone" TEXT DEFAULT 'America/New_York',
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create time_slots table - Individual time periods for availability or lessons
CREATE TABLE IF NOT EXISTS "public"."time_slots" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schedule_id" UUID REFERENCES "public"."schedules"("id") ON DELETE CASCADE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "day_of_week" INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    "specific_date" DATE,
    "recurrence_rule" JSONB,
    "is_available" BOOLEAN DEFAULT true NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure either day_of_week OR specific_date is set, not both
    CONSTRAINT "date_or_day_check" CHECK ((day_of_week IS NULL) != (specific_date IS NULL)),
    -- Ensure start time is before end time
    CONSTRAINT "time_valid_check" CHECK (start_time < end_time)
);

-- Create lessons table - Scheduled lesson assignments
CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" BIGINT REFERENCES "public"."students"("id") ON DELETE CASCADE NOT NULL,
    "studio_id" BIGINT REFERENCES "public"."studios"("id") ON DELETE CASCADE NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    "status" TEXT DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create student_preferences table - Extended student configuration
CREATE TABLE IF NOT EXISTS "public"."student_preferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" BIGINT REFERENCES "public"."students"("id") ON DELETE CASCADE UNIQUE NOT NULL,
    "preferred_duration_minutes" INTEGER DEFAULT 30 NOT NULL CHECK (preferred_duration_minutes > 0 AND preferred_duration_minutes <= 480),
    "preferred_time_slots" JSONB,
    "minimum_notice_hours" INTEGER DEFAULT 24 NOT NULL CHECK (minimum_notice_hours >= 0),
    "max_lessons_per_day" INTEGER DEFAULT 1 NOT NULL CHECK (max_lessons_per_day > 0),
    "max_lessons_per_week" INTEGER DEFAULT 1 NOT NULL CHECK (max_lessons_per_week > 0),
    "blackout_dates" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create studio_constraints table - Studio-wide scheduling rules and limits
CREATE TABLE IF NOT EXISTS "public"."studio_constraints" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studio_id" BIGINT REFERENCES "public"."studios"("id") ON DELETE CASCADE UNIQUE NOT NULL,
    "min_lesson_minutes" INTEGER DEFAULT 15 NOT NULL,
    "max_lesson_minutes" INTEGER DEFAULT 120 NOT NULL,
    "allowed_durations" JSONB DEFAULT '[30, 60]'::jsonb,
    "break_between_lessons" INTEGER DEFAULT 0 NOT NULL CHECK (break_between_lessons >= 0),
    "max_consecutive_lessons" INTEGER DEFAULT 4 NOT NULL CHECK (max_consecutive_lessons > 0),
    "booking_window_days" INTEGER DEFAULT 30 NOT NULL CHECK (booking_window_days > 0),
    "cancellation_window_hours" INTEGER DEFAULT 24 NOT NULL CHECK (cancellation_window_hours >= 0),
    "operating_hours" JSONB DEFAULT '{
        "0": null,
        "1": {"startTime": "09:00", "endTime": "21:00"},
        "2": {"startTime": "09:00", "endTime": "21:00"},
        "3": {"startTime": "09:00", "endTime": "21:00"},
        "4": {"startTime": "09:00", "endTime": "21:00"},
        "5": {"startTime": "09:00", "endTime": "21:00"},
        "6": {"startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT "min_max_duration" CHECK (min_lesson_minutes <= max_lesson_minutes)
);

-- Add new optional columns to existing tables for migration support
-- These columns will be used to gradually transition from legacy to new system

-- Add new columns to students table (safe additions)
DO $$ 
BEGIN
    -- Add schedule_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'schedule_id'
    ) THEN
        ALTER TABLE "public"."students" 
        ADD COLUMN "schedule_id" UUID REFERENCES "public"."schedules"("id") ON DELETE SET NULL;
    END IF;

    -- Add preferred_duration_minutes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'preferred_duration_minutes'
    ) THEN
        ALTER TABLE "public"."students" 
        ADD COLUMN "preferred_duration_minutes" INTEGER DEFAULT 30;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE "public"."students" 
        ADD COLUMN "is_active" BOOLEAN DEFAULT true NOT NULL;
    END IF;

    -- Add updated_at column if it doesn't exist (created_at already exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "public"."students" 
        ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add new columns to studios table (safe additions)
DO $$ 
BEGIN
    -- Add schedule_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'studios' AND column_name = 'schedule_id'
    ) THEN
        ALTER TABLE "public"."studios" 
        ADD COLUMN "schedule_id" UUID REFERENCES "public"."schedules"("id") ON DELETE SET NULL;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'studios' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE "public"."studios" 
        ADD COLUMN "is_active" BOOLEAN DEFAULT true NOT NULL;
    END IF;

    -- Add updated_at column if it doesn't exist (created_at already exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'studios' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "public"."studios" 
        ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_schedules_owner" ON "public"."schedules" ("owner_id", "owner_type");
CREATE INDEX IF NOT EXISTS "idx_time_slots_schedule" ON "public"."time_slots" ("schedule_id");
CREATE INDEX IF NOT EXISTS "idx_time_slots_day" ON "public"."time_slots" ("day_of_week");
CREATE INDEX IF NOT EXISTS "idx_time_slots_date" ON "public"."time_slots" ("specific_date");
CREATE INDEX IF NOT EXISTS "idx_time_slots_available" ON "public"."time_slots" ("is_available");
CREATE INDEX IF NOT EXISTS "idx_lessons_student" ON "public"."lessons" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_lessons_studio" ON "public"."lessons" ("studio_id");
CREATE INDEX IF NOT EXISTS "idx_lessons_start_time" ON "public"."lessons" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_lessons_status" ON "public"."lessons" ("status");
CREATE INDEX IF NOT EXISTS "idx_student_preferences_student" ON "public"."student_preferences" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_studio_constraints_studio" ON "public"."studio_constraints" ("studio_id");

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns on new tables
CREATE TRIGGER "update_schedules_updated_at" 
    BEFORE UPDATE ON "public"."schedules"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_time_slots_updated_at" 
    BEFORE UPDATE ON "public"."time_slots"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_lessons_updated_at" 
    BEFORE UPDATE ON "public"."lessons"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_student_preferences_updated_at" 
    BEFORE UPDATE ON "public"."student_preferences"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_studio_constraints_updated_at" 
    BEFORE UPDATE ON "public"."studio_constraints"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add triggers to existing tables if updated_at column was added
CREATE TRIGGER IF NOT EXISTS "update_students_updated_at" 
    BEFORE UPDATE ON "public"."students"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER IF NOT EXISTS "update_studios_updated_at" 
    BEFORE UPDATE ON "public"."studios"
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Row Level Security (RLS) Policies for new tables

-- Schedules table policies
ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;

-- Students can read/modify their own schedules
CREATE POLICY "students_own_schedules" ON "public"."schedules"
    USING (
        owner_type = 'student' AND 
        EXISTS (
            SELECT 1 FROM "public"."students" s
            JOIN "public"."studios" st ON s.studio_id = st.id
            WHERE s.id = owner_id AND st.user_id = auth.uid()
        )
    );

-- Studio owners can read/modify their studio schedules
CREATE POLICY "studios_own_schedules" ON "public"."schedules"
    USING (
        owner_type = 'studio' AND 
        EXISTS (
            SELECT 1 FROM "public"."studios" 
            WHERE id = owner_id AND user_id = auth.uid()
        )
    );

-- Time slots table policies
ALTER TABLE "public"."time_slots" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_slots_via_schedule" ON "public"."time_slots"
    USING (
        EXISTS (
            SELECT 1 FROM "public"."schedules" s
            WHERE s.id = schedule_id AND (
                (s.owner_type = 'studio' AND EXISTS (
                    SELECT 1 FROM "public"."studios" st 
                    WHERE st.id = s.owner_id AND st.user_id = auth.uid()
                )) OR
                (s.owner_type = 'student' AND EXISTS (
                    SELECT 1 FROM "public"."students" st
                    JOIN "public"."studios" stu ON st.studio_id = stu.id
                    WHERE st.id = s.owner_id AND stu.user_id = auth.uid()
                ))
            )
        )
    );

-- Lessons table policies
ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_studio_owner" ON "public"."lessons"
    USING (
        EXISTS (
            SELECT 1 FROM "public"."studios" 
            WHERE id = studio_id AND user_id = auth.uid()
        )
    );

-- Student preferences table policies
ALTER TABLE "public"."student_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_preferences_via_student" ON "public"."student_preferences"
    USING (
        EXISTS (
            SELECT 1 FROM "public"."students" s
            JOIN "public"."studios" st ON s.studio_id = st.id
            WHERE s.id = student_id AND st.user_id = auth.uid()
        )
    );

-- Studio constraints table policies
ALTER TABLE "public"."studio_constraints" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_constraints_owner" ON "public"."studio_constraints"
    USING (
        EXISTS (
            SELECT 1 FROM "public"."studios" 
            WHERE id = studio_id AND user_id = auth.uid()
        )
    );

-- Grant permissions to all roles for new tables
GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";

GRANT ALL ON TABLE "public"."time_slots" TO "anon";
GRANT ALL ON TABLE "public"."time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."time_slots" TO "service_role";

GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";

GRANT ALL ON TABLE "public"."student_preferences" TO "anon";
GRANT ALL ON TABLE "public"."student_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."student_preferences" TO "service_role";

GRANT ALL ON TABLE "public"."studio_constraints" TO "anon";
GRANT ALL ON TABLE "public"."studio_constraints" TO "authenticated";
GRANT ALL ON TABLE "public"."studio_constraints" TO "service_role";

-- Grant permissions on the update function
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

-- Add comment for migration tracking
COMMENT ON TABLE "public"."schedules" IS 'Flexible scheduling system - v2.0 - Core schedule containers';
COMMENT ON TABLE "public"."time_slots" IS 'Flexible scheduling system - v2.0 - Individual time periods';
COMMENT ON TABLE "public"."lessons" IS 'Flexible scheduling system - v2.0 - Scheduled lesson assignments';
COMMENT ON TABLE "public"."student_preferences" IS 'Flexible scheduling system - v2.0 - Student configuration';
COMMENT ON TABLE "public"."studio_constraints" IS 'Flexible scheduling system - v2.0 - Studio rules and limits';