import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { PatientSelector } from '@/components/admin/PatientSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  status: string;
  description: string | null;
  paid_date: string | null;
}

interface EditPaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPaymentDialog({ payment, open, onOpenChange, onSuccess }: EditPaymentDialogProps) {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setSelectedPatient(payment.user_id);
      setAmount(payment.amount.toString());
      setDueDate(payment.due_date);
      setStatus(payment.status);
      setDescription(payment.description || '');
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment || !selectedPatient || !amount || !dueDate) return;

    setSaving(true);
    try {
      const updateData: {
        user_id: string;
        amount: number;
        due_date: string;
        status: string;
        description: string | null;
        paid_date?: string | null;
      } = {
        user_id: selectedPatient,
        amount: parseFloat(amount),
        due_date: dueDate,
        status,
        description: description || null,
      };

      if (status === 'paid' && !payment.paid_date) {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else if (status !== 'paid') {
        updateData.paid_date = null;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', payment.id);

      if (error) throw error;

      toast({ title: 'Pagamento atualizado com sucesso!' });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({ title: 'Erro ao atualizar pagamento', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <PatientSelector value={selectedPatient} onValueChange={setSelectedPatient} />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">A Vencer</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do pagamento..."
            />
          </div>
          <Button type="submit" className="w-full gradient-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
