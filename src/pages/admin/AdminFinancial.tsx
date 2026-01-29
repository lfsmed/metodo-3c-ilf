import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PatientSelector } from '@/components/admin/PatientSelector';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { format, parseISO, addDays, addWeeks, addMonths, isBefore, isEqual, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  status: string;
  description: string | null;
  paid_date: string | null;
  patient_name?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export default function AdminFinancial() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('1x semana');
  const [endDate, setEndDate] = useState('');
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  // Update preview dates when recurrence settings change
  useEffect(() => {
    if (isRecurring && dueDate && endDate) {
      const startDateObj = parseISO(dueDate);
      const endDateObj = parseISO(endDate);
      if (isBefore(startDateObj, endDateObj) || isEqual(startDateObj, endDateObj)) {
        const dates = generateDates(startDateObj, endDateObj, frequency);
        setPreviewDates(dates);
      } else {
        setPreviewDates([]);
      }
    } else {
      setPreviewDates([]);
    }
  }, [isRecurring, dueDate, endDate, frequency]);

  const generateDates = (startDate: Date, endDateParam: Date, freq: string): Date[] => {
    const dates: Date[] = [];
    let currentDate = startDate;

    while (isBefore(currentDate, endDateParam) || isEqual(currentDate, endDateParam)) {
      dates.push(new Date(currentDate));
      
      switch (freq) {
        case '1x semana':
          currentDate = addWeeks(currentDate, 1);
          break;
        case '2x semana':
          currentDate = addDays(currentDate, 3);
          break;
        case '1x quinzena':
          currentDate = addWeeks(currentDate, 2);
          break;
        case '1x 3 semanas':
          currentDate = addWeeks(currentDate, 3);
          break;
        case '1x mês':
          currentDate = addMonths(currentDate, 1);
          break;
        default:
          currentDate = addWeeks(currentDate, 1);
      }
    }

    return dates;
  };

  const fetchPayments = async () => {
    try {
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      // Create a map
      const profilesMap = new Map<string, string>();
      (profilesData || []).forEach((p: Profile) => {
        profilesMap.set(p.user_id, p.full_name);
      });

      // Check for overdue payments and update them
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const paymentsToUpdate = (paymentsData || []).filter(payment => {
        if (payment.status === 'pending') {
          const paymentDueDate = parseISO(payment.due_date);
          return isAfter(today, paymentDueDate);
        }
        return false;
      });

      // Update overdue payments in the database
      if (paymentsToUpdate.length > 0) {
        for (const payment of paymentsToUpdate) {
          await supabase
            .from('payments')
            .update({ status: 'overdue' })
            .eq('id', payment.id);
        }
      }

      // Combine data with updated status
      const combinedData = (paymentsData || []).map((payment) => {
        let finalStatus = payment.status;
        if (payment.status === 'pending') {
          const paymentDueDate = parseISO(payment.due_date);
          if (isAfter(today, paymentDueDate)) {
            finalStatus = 'overdue';
          }
        }
        return {
          ...payment,
          status: finalStatus,
          patient_name: profilesMap.get(payment.user_id) || 'Paciente',
        };
      });

      setPayments(combinedData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !amount || !dueDate) return;
    if (isRecurring && !endDate) {
      toast({ title: 'Selecione a data final para recorrência', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isRecurring) {
        const startDateObj = parseISO(dueDate);
        const endDateObj = parseISO(endDate);
        const dates = generateDates(startDateObj, endDateObj, frequency);

        const paymentsToInsert = dates.map(date => ({
          user_id: selectedPatient,
          amount: parseFloat(amount),
          due_date: format(date, 'yyyy-MM-dd'),
          status,
          description: description || null,
        }));

        const { error } = await supabase.from('payments').insert(paymentsToInsert);
        if (error) throw error;

        toast({ title: `${paymentsToInsert.length} pagamentos adicionados com sucesso!` });
      } else {
        const { error } = await supabase.from('payments').insert({
          user_id: selectedPatient,
          amount: parseFloat(amount),
          due_date: dueDate,
          status,
          description: description || null,
        });

        if (error) throw error;
        toast({ title: 'Pagamento adicionado com sucesso!' });
      }

      setDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({ title: 'Erro ao adicionar pagamento', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updateData: { status: string; paid_date?: string | null } = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.paid_date = null;
      }

      const { error } = await supabase.from('payments').update(updateData).eq('id', id);
      if (error) throw error;

      toast({ title: 'Status atualizado!' });
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;

    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Pagamento excluído!' });
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({ title: 'Erro ao excluir pagamento', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setAmount('');
    setDueDate('');
    setStatus('pending');
    setDescription('');
    setIsRecurring(false);
    setFrequency('1x semana');
    setEndDate('');
    setPreviewDates([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <AdminLayout currentPage="/admin/financial">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin/financial">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Financeiro</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie os pagamentos dos pacientes
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="gradient-primary">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Pagamento</DialogTitle>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="recurring">Pagamento Recorrente</Label>
                  <Switch
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>
                {isRecurring && (
                  <>
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2x semana">2x por semana</SelectItem>
                          <SelectItem value="1x semana">1x por semana</SelectItem>
                          <SelectItem value="1x quinzena">1x por quinzena</SelectItem>
                          <SelectItem value="1x 3 semanas">1x a cada 3 semanas</SelectItem>
                          <SelectItem value="1x mês">1x por mês</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data Final</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={dueDate}
                        required={isRecurring}
                      />
                    </div>
                    {previewDates.length > 0 && (
                      <div className="space-y-2">
                        <Label>Datas que serão criadas ({previewDates.length})</Label>
                        <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2 flex flex-wrap gap-2">
                          {previewDates.map((date, index) => (
                            <span key={index} className="status-pending">
                              {format(date, "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
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
                  {saving ? 'Salvando...' : isRecurring ? 'Adicionar Pagamentos' : 'Adicionar Pagamento'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {payments.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum pagamento cadastrado
              </CardContent>
            </Card>
          ) : (
            payments.map((payment) => (
              <Card key={payment.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.patient_name}</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Select value={payment.status} onValueChange={(value) => handleStatusChange(payment.id, value)}>
                        <SelectTrigger className="w-32 h-8">
                          <StatusBadge status={payment.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="overdue">Atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(payment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {payment.description && (
                    <p className="mt-2 text-sm text-muted-foreground pl-12">{payment.description}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
