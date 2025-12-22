-- Create storage bucket for patient attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-attachments', 'patient-attachments', false);

-- Create policies for storage bucket
CREATE POLICY "Professionals can upload patient attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'patient-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Professionals can view their patient attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'patient-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Professionals can delete their patient attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'patient-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table to track patient attachments metadata
CREATE TABLE public.patient_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Professionals can manage their patient attachments"
ON public.patient_attachments
FOR ALL
USING (auth.uid() = professional_id);

-- Create trigger for updated_at
CREATE TRIGGER update_patient_attachments_updated_at
BEFORE UPDATE ON public.patient_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();