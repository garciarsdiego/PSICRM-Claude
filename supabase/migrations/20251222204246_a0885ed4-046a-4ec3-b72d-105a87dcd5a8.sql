-- Add event_type column to google_calendar_events for categorization
ALTER TABLE public.google_calendar_events 
ADD COLUMN event_type TEXT DEFAULT 'default';

-- Add color column for custom event colors from Google
ALTER TABLE public.google_calendar_events 
ADD COLUMN color_id TEXT;