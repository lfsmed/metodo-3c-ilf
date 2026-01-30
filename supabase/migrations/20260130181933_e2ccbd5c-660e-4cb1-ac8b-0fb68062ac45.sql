-- Allow users to view their own permissions
CREATE POLICY "Users can view own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);