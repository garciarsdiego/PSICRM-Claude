-- Add meet_link column to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS meet_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.meet_link IS 'Google Meet link for the session';