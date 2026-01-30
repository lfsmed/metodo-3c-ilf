-- Create table for financial unlock requests
CREATE TABLE public.financial_unlock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_unlock_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.financial_unlock_requests
FOR SELECT
USING (auth.uid() = requester_id);

-- Masters can view all requests
CREATE POLICY "Masters can view all requests"
ON public.financial_unlock_requests
FOR SELECT
USING (is_master(auth.uid()));

-- Admins can insert their own requests
CREATE POLICY "Admins can insert requests"
ON public.financial_unlock_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Masters can update requests (approve/deny)
CREATE POLICY "Masters can update requests"
ON public.financial_unlock_requests
FOR UPDATE
USING (is_master(auth.uid()));

-- Masters can delete requests
CREATE POLICY "Masters can delete requests"
ON public.financial_unlock_requests
FOR DELETE
USING (is_master(auth.uid()));