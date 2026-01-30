import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'master' | 'admin' | 'user';

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [hasFinancialAccess, setHasFinancialAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsAdmin(false);
      setIsMaster(false);
      setHasFinancialAccess(false);
      setLoading(false);
      return;
    }

    checkAdminRole();
  }, [user, authLoading]);

  const checkAdminRole = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsMaster(false);
      setHasFinancialAccess(false);
      setLoading(false);
      return;
    }

    try {
      // Check for admin or master role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error checking admin role:', roleError);
        setIsAdmin(false);
        setIsMaster(false);
        setHasFinancialAccess(false);
      } else {
        const role = roleData?.role as AppRole | undefined;
        const userIsMaster = role === 'master';
        const userIsAdmin = role === 'admin' || userIsMaster;
        
        setIsMaster(userIsMaster);
        setIsAdmin(userIsAdmin);

        // Master has all permissions
        if (userIsMaster) {
          setHasFinancialAccess(true);
        } else {
          // Check for financial permission
          const { data: permData, error: permError } = await supabase
            .from('user_permissions')
            .select('permission')
            .eq('user_id', user.id)
            .eq('permission', 'financial')
            .maybeSingle();

          if (permError && permError.code !== 'PGRST116') {
            console.error('Error checking financial permission:', permError);
          }
          setHasFinancialAccess(!!permData);
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
      setIsMaster(false);
      setHasFinancialAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, isMaster, hasFinancialAccess, loading: loading || authLoading };
}
