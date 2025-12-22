-- Create a table to store imported Google Calendar events
CREATE TABLE public.google_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(professional_id, google_event_id)
);

-- Enable Row Level Security
ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Professionals can manage their imported events" 
ON public.google_calendar_events 
FOR ALL 
USING (auth.uid() = professional_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_google_calendar_events_updated_at
BEFORE UPDATE ON public.google_calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();