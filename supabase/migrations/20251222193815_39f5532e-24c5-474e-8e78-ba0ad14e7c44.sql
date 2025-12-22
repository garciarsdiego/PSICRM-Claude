-- Create table for professional availability (days and hours)
CREATE TABLE public.professional_availability (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_professional_day UNIQUE (professional_id, day_of_week),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create table for blocked specific time slots
CREATE TABLE public.blocked_slots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID NOT NULL,
    blocked_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_blocked_time_range CHECK (end_time > start_time)
);

-- Create table for Google Calendar integration tokens
CREATE TABLE public.google_calendar_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    calendar_id TEXT DEFAULT 'primary',
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_availability
CREATE POLICY "Professionals can manage their availability"
ON public.professional_availability
FOR ALL
USING (auth.uid() = professional_id);

CREATE POLICY "Anyone can view availability for booking"
ON public.professional_availability
FOR SELECT
USING (is_active = true);

-- RLS policies for blocked_slots
CREATE POLICY "Professionals can manage their blocked slots"
ON public.blocked_slots
FOR ALL
USING (auth.uid() = professional_id);

CREATE POLICY "Anyone can view blocked slots for booking"
ON public.blocked_slots
FOR SELECT
USING (true);

-- RLS policies for google_calendar_tokens (only owner can see/manage)
CREATE POLICY "Professionals can manage their Google tokens"
ON public.google_calendar_tokens
FOR ALL
USING (auth.uid() = professional_id);

-- Create triggers for updated_at
CREATE TRIGGER update_professional_availability_updated_at
BEFORE UPDATE ON public.professional_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();