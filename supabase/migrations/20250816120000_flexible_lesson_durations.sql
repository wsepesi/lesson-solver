-- Migration: Add flexible lesson duration support
-- Date: 2025-08-16
-- Description: Enable teachers to configure allowed lesson durations for their studios

-- Step 1: Add lesson duration configuration columns to studios table
ALTER TABLE "public"."studios" 
ADD COLUMN "allowed_lesson_durations" jsonb DEFAULT '[30, 60]'::jsonb,
ADD COLUMN "allow_custom_duration" boolean DEFAULT false,
ADD COLUMN "min_lesson_duration" integer DEFAULT 15,
ADD COLUMN "max_lesson_duration" integer DEFAULT 120;

-- Step 2: Modify students table to use integer instead of enum for lesson_length
-- First, add the new column
ALTER TABLE "public"."students" 
ADD COLUMN "lesson_duration_minutes" integer;

-- Step 3: Migrate existing data from enum to integer
UPDATE "public"."students" 
SET "lesson_duration_minutes" = CASE 
    WHEN "lesson_length" = '30' THEN 30
    WHEN "lesson_length" = '60' THEN 60
    ELSE 60 -- default fallback
END;

-- Step 4: Make the new column NOT NULL after data migration
ALTER TABLE "public"."students" 
ALTER COLUMN "lesson_duration_minutes" SET NOT NULL;

-- Step 5: Drop the old enum column (keeping it for now for safety)
-- We'll do this in a separate migration after testing
-- ALTER TABLE "public"."students" DROP COLUMN "lesson_length";

-- Step 6: Add comments for documentation
COMMENT ON COLUMN "public"."studios"."allowed_lesson_durations" IS 'Array of allowed lesson durations in minutes (e.g., [30, 45, 60, 90])';
COMMENT ON COLUMN "public"."studios"."allow_custom_duration" IS 'Whether students can choose custom lesson durations within min/max bounds';
COMMENT ON COLUMN "public"."studios"."min_lesson_duration" IS 'Minimum allowed lesson duration in minutes';
COMMENT ON COLUMN "public"."studios"."max_lesson_duration" IS 'Maximum allowed lesson duration in minutes';
COMMENT ON COLUMN "public"."students"."lesson_duration_minutes" IS 'Student preferred lesson duration in minutes';

-- Step 7: Add check constraints for data integrity
ALTER TABLE "public"."studios" 
ADD CONSTRAINT "studios_min_duration_check" CHECK ("min_lesson_duration" >= 5 AND "min_lesson_duration" <= 240),
ADD CONSTRAINT "studios_max_duration_check" CHECK ("max_lesson_duration" >= 5 AND "max_lesson_duration" <= 240),
ADD CONSTRAINT "studios_duration_range_check" CHECK ("min_lesson_duration" <= "max_lesson_duration");

ALTER TABLE "public"."students" 
ADD CONSTRAINT "students_lesson_duration_check" CHECK ("lesson_duration_minutes" >= 5 AND "lesson_duration_minutes" <= 240);