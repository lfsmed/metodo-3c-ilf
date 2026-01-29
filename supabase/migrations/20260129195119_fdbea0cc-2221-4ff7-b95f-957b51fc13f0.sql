-- Fix applications table RLS: Convert RESTRICTIVE to PERMISSIVE policies and add user DELETE policy

-- Drop existing RESTRICTIVE policies on applications
DROP POLICY IF EXISTS "Admins can delete applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;

-- Create PERMISSIVE policies for applications table

-- SELECT: Users can view their own OR admins can view all
CREATE POLICY "Users can view own applications"
ON public.applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- INSERT: Users can insert their own OR admins can insert any
CREATE POLICY "Users can insert own applications"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: Users can update their own OR admins can update any
CREATE POLICY "Users can update own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- DELETE: Users can delete their own OR admins can delete any
CREATE POLICY "Users can delete own applications"
ON public.applications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));