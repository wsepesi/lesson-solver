-- Add calendar_days preference to studios table
-- This allows teachers to choose between weekdays (Mon-Fri) or full week (Mon-Sun) display

-- Step 1: Add calendar_days column to studios table
ALTER TABLE "public"."studios" 
ADD COLUMN "calendar_days" text DEFAULT 'full_week'::text;

-- Step 2: Add constraint to ensure only valid values
ALTER TABLE "public"."studios" 
ADD CONSTRAINT "studios_calendar_days_check" 
CHECK ("calendar_days" IN ('weekdays', 'full_week'));

-- Step 3: Add comment for documentation
COMMENT ON COLUMN "public"."studios"."calendar_days" IS 'Calendar display preference: weekdays (Mon-Fri) or full_week (Mon-Sun)';

-- Step 4: Create index for performance on common queries
CREATE INDEX IF NOT EXISTS "idx_studios_calendar_days" ON "public"."studios" ("calendar_days");