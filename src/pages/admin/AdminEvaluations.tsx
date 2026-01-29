import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Stethoscope, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  CheckCircle2,
  CalendarClock,
  User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicalEvaluation {
  id: string;
  user_id: string;
  evaluation_date: string;
  evaluation_time: string;
  notes: string | null;
  status: string;
  created_at: string;
  patientName?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export default function AdminEvaluations() {
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<MedicalEvaluation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteEvaluation, setDeleteEvaluation] = useState<MedicalEvaluation | null>(null);
  
  // Form state
  const [selectedPatient, setSelectedPatient] = useState('');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [evaluationTime, setEvaluationTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [evaluationsRes, profilesRes] = await Promise.all([
        supabase
          .from('medical_evaluations')
          .select('*')
          .order('evaluation_date', { ascending: true })
          .order('evaluation_time', { ascending: true }),
        supabase
          .from('profiles')
          .select('user_id, full_name')
          .order('full_name', { ascending: true })
      ]);

      if (evaluationsRes.error) throw evaluationsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.full_name]) || []);

      const evaluationsWithNames = (evaluationsRes.data || []).map(e => ({
        ...e,
        patientName: profileMap.get(e.user_id) || 'Paciente'
      }));

      setEvaluations(evaluationsWithNames);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvaluation = async () => {
    if (!selectedPatient || !evaluationDate || !evaluationTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('medical_evaluations')
        .insert({
          user_id: selectedPatient,
          evaluation_date: evaluationDate,
          evaluation_time: evaluationTime,
          notes: notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Avaliação agendada com sucesso",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating evaluation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar a avaliação",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!deleteEvaluation) return;

    try {
      const { error } = await supabase
        .from('medical_evaluations')
        .delete()
        .eq('id', deleteEvaluation.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Avaliação excluída com sucesso",
      });

      setDeleteEvaluation(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a avaliação",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (evaluation: MedicalEvaluation) => {
    const newStatus = evaluation.status === 'scheduled' ? 'completed' : 'scheduled';

    try {
      const { error } = await supabase
        .from('medical_evaluations')
        .update({ status: newStatus })
        .eq('id', evaluation.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Avaliação marcada como ${newStatus === 'completed' ? 'concluída' : 'agendada'}`,
      });

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setEvaluationDate('');
    setEvaluationTime('');
    setNotes('');
  };

  const scheduledEvaluations = evaluations.filter(e => e.status === 'scheduled');
  const completedEvaluations = evaluations.filter(e => e.status === 'completed');

  if (loading) {
    return (
      <AdminLayout currentPage="/admin/evaluations">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin/evaluations">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium">Gestão</span>
            </div>
            <h1 className="text-2xl font-bold font-display">Avaliações Médicas</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie as avaliações médicas dos pacientes
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Avaliação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Avaliação Médica</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={evaluationDate}
                      onChange={(e) => setEvaluationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário *</Label>
                    <Input
                      type="time"
                      value={evaluationTime}
                      onChange={(e) => setEvaluationTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações sobre a avaliação..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateEvaluation} disabled={saving}>
                  {saving ? 'Salvando...' : 'Agendar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scheduled Evaluations */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              Agendadas ({scheduledEvaluations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledEvaluations.length > 0 ? (
              <div className="space-y-3">
                {scheduledEvaluations.map((evaluation) => (
                  <div 
                    key={evaluation.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{evaluation.patientName}</p>
                        {evaluation.notes && (
                          <p className="text-xs text-muted-foreground">{evaluation.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(parseISO(evaluation.evaluation_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {evaluation.evaluation_time.slice(0, 5)}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        Agendada
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={() => handleToggleStatus(evaluation)}
                          title="Marcar como concluída"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteEvaluation(evaluation)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma avaliação agendada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Evaluations */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Concluídas ({completedEvaluations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedEvaluations.length > 0 ? (
              <div className="space-y-3">
                {completedEvaluations.map((evaluation) => (
                  <div 
                    key={evaluation.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border opacity-75"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <User className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{evaluation.patientName}</p>
                        {evaluation.notes && (
                          <p className="text-xs text-muted-foreground">{evaluation.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(parseISO(evaluation.evaluation_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {evaluation.evaluation_time.slice(0, 5)}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Concluída
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
                          onClick={() => handleToggleStatus(evaluation)}
                          title="Voltar para agendada"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteEvaluation(evaluation)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma avaliação concluída</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEvaluation} onOpenChange={() => setDeleteEvaluation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação de {deleteEvaluation?.patientName}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvaluation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
