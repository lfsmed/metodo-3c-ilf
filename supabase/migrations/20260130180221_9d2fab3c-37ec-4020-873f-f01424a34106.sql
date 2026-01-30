-- Fix user_roles RLS policies to include master
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recreate with master support
CREATE POLICY "Admins and masters can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_master(auth.uid())
);

CREATE POLICY "Masters can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Masters can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (is_master(auth.uid()));

CREATE POLICY "Masters can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (is_master(auth.uid()));