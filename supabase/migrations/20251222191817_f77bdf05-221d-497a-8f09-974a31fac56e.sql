-- Create patient invites table
CREATE TABLE public.patient_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL,
    patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    token uuid NOT NULL DEFAULT gen_random_uuid(),
    email text,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(token)
);

-- Enable RLS
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

-- Professionals can manage their invites
CREATE POLICY "Professionals can manage their invites"
ON public.patient_invites
FOR ALL
USING (auth.uid() = professional_id);

-- Anyone can view valid invites by token (for signup flow)
CREATE POLICY "Anyone can view invite by token"
ON public.patient_invites
FOR SELECT
USING (used_at IS NULL AND expires_at > now());