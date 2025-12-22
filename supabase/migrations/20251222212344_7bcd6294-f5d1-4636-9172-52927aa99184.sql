-- Add scheduling configuration columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN allow_parallel_sessions boolean DEFAULT false,
ADD COLUMN buffer_between_sessions integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.allow_parallel_sessions IS 'Whether the professional can have overlapping sessions';
COMMENT ON COLUMN public.profiles.buffer_between_sessions IS 'Minutes of buffer time between sessions';