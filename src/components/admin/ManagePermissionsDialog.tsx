import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Crown, CreditCard, Loader2 } from 'lucide-react';

interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface ManagePermissionsDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionsUpdated: () => void;
  isMasterUser: boolean;
}

type RoleType = 'user' | 'admin' | 'master';

export function ManagePermissionsDialog({
  patient,
  open,
  onOpenChange,
  onPermissionsUpdated,
  isMasterUser,
}: ManagePermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleType>('user');
  const [hasFinancialPermission, setHasFinancialPermission] = useState(false);

  useEffect(() => {
    if (open && patient) {
      fetchCurrentPermissions();
    }
  }, [open, patient]);

  const fetchCurrentPermissions = async () => {
    if (!patient) return;
    setLoading(true);

    try {
      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', patient.user_id)
        .maybeSingle();

      if (roleError) throw roleError;
      setCurrentRole((roleData?.role as RoleType) || 'user');

      // Fetch financial permission
      const { data: permData, error: permError } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', patient.user_id)
        .eq('permission', 'financial')
        .maybeSingle();

      if (permError && permError.code !== 'PGRST116') throw permError;
      setHasFinancialPermission(!!permData);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!patient) return;
    setSaving(true);

    try {
      // Update role
      if (currentRole === 'user') {
        // Remove any existing role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', patient.user_id);
      } else {
        // Check if role exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', patient.user_id)
          .maybeSingle();

        if (existingRole) {
          // Update existing role
          await supabase
            .from('user_roles')
            .update({ role: currentRole })
            .eq('user_id', patient.user_id);
        } else {
          // Insert new role
          await supabase
            .from('user_roles')
            .insert({ user_id: patient.user_id, role: currentRole });
        }
      }

      // Update financial permission
      if (currentRole !== 'master') {
        if (hasFinancialPermission) {
          // Check if permission exists
          const { data: existingPerm } = await supabase
            .from('user_permissions')
            .select('id')
            .eq('user_id', patient.user_id)
            .eq('permission', 'financial')
            .maybeSingle();

          if (!existingPerm) {
            await supabase
              .from('user_permissions')
              .insert({ user_id: patient.user_id, permission: 'financial' });
          }
        } else {
          // Remove permission
          await supabase
            .from('user_permissions')
            .delete()
            .eq('user_id', patient.user_id)
            .eq('permission', 'financial');
        }
      }

      toast({
        title: 'Permissões atualizadas',
        description: `As permissões de ${patient.full_name} foram atualizadas com sucesso.`,
      });

      onPermissionsUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gerenciar Permissões
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="font-medium">{patient.full_name}</p>
              <p className="text-sm text-muted-foreground">{patient.email}</p>
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Nível de Acesso
              </Label>
              <Select
                value={currentRole}
                onValueChange={(value: RoleType) => setCurrentRole(value)}
                disabled={!isMasterUser}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <span>Usuário</span>
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <span>Administrador</span>
                      <Badge className="bg-primary/20 text-primary text-xs">Admin</Badge>
                    </div>
                  </SelectItem>
                  {isMasterUser && (
                    <SelectItem value="master">
                      <div className="flex items-center gap-2">
                        <span>Master</span>
                        <Badge className="bg-warning/20 text-warning text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Master
                        </Badge>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {currentRole === 'master' && 'Acesso total ao sistema, incluindo gerenciamento de permissões.'}
                {currentRole === 'admin' && 'Acesso ao painel administrativo (exceto financeiro, a menos que habilitado).'}
                {currentRole === 'user' && 'Apenas acesso às suas próprias informações.'}
              </p>
            </div>

            {/* Financial Permission */}
            {currentRole !== 'master' && (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <Label htmlFor="financial-toggle" className="font-medium">
                      Acesso ao Financeiro
                    </Label>
                  </div>
                  <Switch
                    id="financial-toggle"
                    checked={hasFinancialPermission}
                    onCheckedChange={setHasFinancialPermission}
                    disabled={!isMasterUser}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Permite visualizar e gerenciar todos os pagamentos dos pacientes.
                </p>
              </div>
            )}

            {currentRole === 'master' && (
              <div className="p-4 rounded-lg border border-warning/30 bg-warning/10">
                <p className="text-sm text-warning flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Usuários Master têm acesso total automaticamente.
                </p>
              </div>
            )}

            {!isMasterUser && (
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Apenas usuários Master podem alterar permissões.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gradient-primary"
                onClick={handleSave}
                disabled={saving || !isMasterUser}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
