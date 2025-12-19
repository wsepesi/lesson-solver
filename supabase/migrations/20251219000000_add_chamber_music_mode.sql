-- Migration: Add Chamber Music Mode Support
-- Backwards compatible - existing studios default to 'individual_lessons'

-- Add studio_mode column with default value for existing rows
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS studio_mode TEXT DEFAULT 'individual_lessons';

-- Add check constraint for valid values
ALTER TABLE studios
ADD CONSTRAINT studio_mode_check
CHECK (studio_mode IN ('individual_lessons', 'chamber_music'));

-- Add rehearsal_duration_minutes for chamber music mode (nullable, only used in chamber mode)
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS rehearsal_duration_minutes INTEGER;

-- Add check constraint for valid rehearsal duration range
ALTER TABLE studios
ADD CONSTRAINT rehearsal_duration_check
CHECK (rehearsal_duration_minutes IS NULL OR (rehearsal_duration_minutes >= 15 AND rehearsal_duration_minutes <= 240));

-- Add comment explaining the columns
COMMENT ON COLUMN studios.studio_mode IS 'Studio type: individual_lessons (default) for one-on-one scheduling, chamber_music for group rehearsal scheduling';
COMMENT ON COLUMN studios.rehearsal_duration_minutes IS 'Fixed rehearsal duration for chamber_music mode (in minutes). NULL for individual_lessons mode.';
