import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirme a senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface ResetPasswordDialogProps {
  patient: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({ patient, open, onOpenChange }: ResetPasswordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setLoading(true);

    try {
      const validated = passwordSchema.parse(formData);

      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: patient.user_id,
          password: validated.password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Senha alterada!',
        description: `A senha de ${patient.full_name} foi atualizada.`,
      });

      setFormData({ password: '', confirmPassword: '' });
      onOpenChange(false);

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Dados inválidos',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao alterar senha',
          description: error instanceof Error ? error.message : 'Tente novamente',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        setFormData({ password: '', confirmPassword: '' });
      }, 300);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para {patient.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
          <p className="text-xs text-warning">
            Essa ação irá substituir a senha atual do usuário. Certifique-se de informar a nova senha ao paciente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-new-password">Nova senha *</Label>
            <div className="relative">
              <Input
                id="admin-new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova senha"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-confirm-password">Confirmar senha *</Label>
            <div className="relative">
              <Input
                id="admin-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirme a nova senha"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salvar Senha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
