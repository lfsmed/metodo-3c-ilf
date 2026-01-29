import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PatientSelector } from '@/components/admin/PatientSelector';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Application {
  id: string;
  user_id: string;
  application_date: string;
  status: string;
  notes: string | null;
  profiles?: { full_name: string };
}

export default function AdminApplications() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, profiles!applications_user_id_fkey(full_name)')
        .order('application_date', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !applicationDate) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('applications').insert({
        user_id: selectedPatient,
        application_date: applicationDate,
        status,
        notes: notes || null,
      });

      if (error) throw error;

      toast({ title: 'Aplicação adicionada com sucesso!' });
      setDialogOpen(false);
      resetForm();
      fetchApplications();
    } catch (error) {
      console.error('Error adding application:', error);
      toast({ title: 'Erro ao adicionar aplicação', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta aplicação?')) return;

    try {
      const { error } = await supabase.from('applications').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Aplicação excluída com sucesso!' });
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({ title: 'Erro ao excluir aplicação', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setApplicationDate('');
    setStatus('scheduled');
    setNotes('');
  };

  if (loading) {
    return (
      <AdminLayout currentPage="/admin/applications">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin/applications">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Aplicações</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie as aplicações dos pacientes
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
                <DialogTitle>Nova Aplicação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <PatientSelector value={selectedPatient} onValueChange={setSelectedPatient} />
                </div>
                <div className="space-y-2">
                  <Label>Data da Aplicação</Label>
                  <Input
                    type="date"
                    value={applicationDate}
                    onChange={(e) => setApplicationDate(e.target.value)}
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
                      <SelectItem value="scheduled">Agendada</SelectItem>
                      <SelectItem value="completed">Realizada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações..."
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Adicionar Aplicação'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {applications.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma aplicação cadastrada
              </CardContent>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{app.profiles?.full_name || 'Paciente'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(app.application_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(app.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {app.notes && (
                    <p className="mt-2 text-sm text-muted-foreground pl-12">{app.notes}</p>
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
