-- Create medical_evaluations table for tracking medical appointments
CREATE TABLE public.medical_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  evaluation_date DATE NOT NULL,
  evaluation_time TIME NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medical_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all evaluations" 
ON public.medical_evaluations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert evaluations" 
ON public.medical_evaluations 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update evaluations" 
ON public.medical_evaluations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete evaluations" 
ON public.medical_evaluations 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own evaluations
CREATE POLICY "Users can view own evaluations" 
ON public.medical_evaluations 
FOR SELECT 
USING (auth.uid() = user_id);