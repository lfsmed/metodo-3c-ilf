-- Drop the existing check constraint
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Add a new check constraint that includes 'missed' status
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check 
CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed'));