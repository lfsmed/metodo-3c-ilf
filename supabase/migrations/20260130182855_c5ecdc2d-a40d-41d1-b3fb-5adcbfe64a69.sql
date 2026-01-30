-- Add expires_at column for automatic expiration
ALTER TABLE public.financial_unlock_requests 
ADD COLUMN expires_at timestamp with time zone;