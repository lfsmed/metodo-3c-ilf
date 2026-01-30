import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'master' | 'admin' | 'user';

interface PermissionsState {
  role: AppRole | null;
  permissions: string[];
  isMaster: boolean;
  isAdmin: boolean;
  hasFinancialAccess: boolean;
  loading: boolean;
}

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<PermissionsState>({
    role: null,
    permissions: [],
    isMaster: false,
    isAdmin: false,
    hasFinancialAccess: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setState({
        role: null,
        permissions: [],
        isMaster: false,
        isAdmin: false,
        hasFinancialAccess: false,
        loading: false,
      });
      return;
    }

    checkPermissions();
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error checking role:', roleError);
      }

      const userRole = (roleData?.role as AppRole) || 'user';
      const isMaster = userRole === 'master';
      const isAdmin = userRole === 'admin' || isMaster;

      // Get user permissions
      let permissions: string[] = [];
      if (!isMaster) {
        const { data: permData, error: permError } = await supabase
          .from('user_permissions')
          .select('permission')
          .eq('user_id', user.id);

        if (permError) {
          console.error('Error checking permissions:', permError);
        } else {
          permissions = (permData || []).map(p => p.permission);
        }
      }

      // Master has all permissions
      const hasFinancialAccess = isMaster || permissions.includes('financial');

      setState({
        role: userRole,
        permissions,
        isMaster,
        isAdmin,
        hasFinancialAccess,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (state.isMaster) return true;
    return state.permissions.includes(permission);
  };

  const refetch = () => {
    setState(prev => ({ ...prev, loading: true }));
    checkPermissions();
  };

  return {
    ...state,
    hasPermission,
    refetch,
  };
}
