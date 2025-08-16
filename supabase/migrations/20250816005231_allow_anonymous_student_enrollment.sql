-- Allow anonymous users to insert students when enrolling
-- This enables student self-enrollment through the enrollment page

-- Create a new policy that allows anonymous users to insert their own student records
-- The foreign key constraint on studio_id ensures the studio exists
CREATE POLICY "Allow anonymous student self-enrollment"
ON public.students 
FOR INSERT
TO anon
WITH CHECK (true);

-- Note: Security is maintained through:
-- 1. Foreign key constraint ensures studio_id references valid studio
-- 2. Students can only insert, not update/delete existing records
-- 3. The existing policies still protect reads and updates (only studio owners can modify)