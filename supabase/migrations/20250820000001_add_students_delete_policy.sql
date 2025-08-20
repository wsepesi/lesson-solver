-- Add DELETE policy for students table
-- Allow studio owners to delete students from their studios

CREATE POLICY "Enable delete for studio owners" ON "public"."students" 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."studios"
        WHERE "studios"."id" = "students"."studio_id" 
        AND "studios"."user_id" = auth.uid()
    )
);