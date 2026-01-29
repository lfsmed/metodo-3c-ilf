import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';

const editPatientSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().max(20).optional(),
  cpf: z.string().max(14).optional(),
  birth_date: z.string().optional(),
  address: z.string().max(255).optional(),
});

type EditPatientFormData = z.infer<typeof editPatientSchema>;

interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  avatar_url?: string | null;
}

interface EditPatientDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: () => void;
}

export function EditPatientDialog({ patient, open, onOpenChange, onPatientUpdated }: EditPatientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditPatientFormData>({
    resolver: zodResolver(editPatientSchema),
  });

  useEffect(() => {
    if (patient && open) {
      reset({
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone || '',
        cpf: patient.cpf || '',
        birth_date: patient.birth_date || '',
        address: patient.address || '',
      });
      setAvatarUrl(patient.avatar_url || null);
    }
  }, [patient, open, reset]);

  const onSubmit = async (data: EditPatientFormData) => {
    if (!patient) return;
    
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: patient.user_id,
            email: data.email,
            full_name: data.full_name,
            phone: data.phone || undefined,
            cpf: data.cpf || undefined,
            birth_date: data.birth_date || undefined,
            address: data.address || undefined,
            avatar_url: avatarUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar paciente');
      }

      toast({
        title: 'Sucesso',
        description: 'Cadastro atualizado com sucesso!',
      });

      onOpenChange(false);
      onPatientUpdated();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar cadastro',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>
            Atualize os dados do paciente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            userName={patient?.full_name || ''}
            userId={patient?.user_id}
            onAvatarChange={setAvatarUrl}
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nome Completo *</Label>
            <Input
              id="edit_full_name"
              {...register('full_name')}
              placeholder="Nome do paciente"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Email *</Label>
            <Input
              id="edit_email"
              type="email"
              {...register('email')}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone">Telefone</Label>
            <Input
              id="edit_phone"
              {...register('phone')}
              placeholder="(00) 00000-0000"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_cpf">CPF</Label>
            <Input
              id="edit_cpf"
              {...register('cpf')}
              placeholder="000.000.000-00"
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
            <Input
              id="edit_birth_date"
              type="date"
              {...register('birth_date')}
            />
            {errors.birth_date && (
              <p className="text-sm text-destructive">{errors.birth_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_address">Endereço</Label>
            <Input
              id="edit_address"
              {...register('address')}
              placeholder="Rua, número, bairro, cidade"
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
