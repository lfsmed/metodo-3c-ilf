import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PatientSelector } from '@/components/admin/PatientSelector';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pill, Trash2 } from 'lucide-react';
import { format, parseISO, addDays, addWeeks, addMonths, isBefore, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Medication {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  patient_name?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export default function AdminMedications() {
  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('1x semana');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchMedications();
  }, []);

  // Update preview dates when recurrence settings change
  useEffect(() => {
    if (isRecurring && startDate && recurrenceEndDate) {
      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(recurrenceEndDate);
      if (isBefore(startDateObj, endDateObj) || isEqual(startDateObj, endDateObj)) {
        const dates = generateDates(startDateObj, endDateObj, recurrenceFrequency);
        setPreviewDates(dates);
      } else {
        setPreviewDates([]);
      }
    } else {
      setPreviewDates([]);
    }
  }, [isRecurring, startDate, recurrenceEndDate, recurrenceFrequency]);

  const generateDates = (start: Date, end: Date, freq: string): Date[] => {
    const dates: Date[] = [];
    let currentDate = start;

    while (isBefore(currentDate, end) || isEqual(currentDate, end)) {
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

  const fetchMedications = async () => {
    try {
      // Fetch medications
      const { data: medsData, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });

      if (medsError) throw medsError;

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

      // Combine data
      const combinedData = (medsData || []).map((med) => ({
        ...med,
        patient_name: profilesMap.get(med.user_id) || 'Paciente',
      }));

      setMedications(combinedData);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !medicationName || !dosage || !frequency || !startDate) return;
    if (isRecurring && !recurrenceEndDate) {
      toast({ title: 'Selecione a data final para recorrência', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isRecurring) {
        const startDateObj = parseISO(startDate);
        const endDateObj = parseISO(recurrenceEndDate);
        const dates = generateDates(startDateObj, endDateObj, recurrenceFrequency);

        const medicationsToInsert = dates.map(date => ({
          user_id: selectedPatient,
          medication_name: medicationName,
          dosage,
          frequency,
          start_date: format(date, 'yyyy-MM-dd'),
          end_date: endDate || null,
          notes: notes || null,
          is_active: true,
        }));

        const { error } = await supabase.from('medications').insert(medicationsToInsert);
        if (error) throw error;

        toast({ title: `${medicationsToInsert.length} medicações adicionadas com sucesso!` });
      } else {
        const { error } = await supabase.from('medications').insert({
          user_id: selectedPatient,
          medication_name: medicationName,
          dosage,
          frequency,
          start_date: startDate,
          end_date: endDate || null,
          notes: notes || null,
          is_active: true,
        });

        if (error) throw error;
        toast({ title: 'Medicação adicionada com sucesso!' });
      }

      setDialogOpen(false);
      resetForm();
      fetchMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      toast({ title: 'Erro ao adicionar medicação', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({ title: currentStatus ? 'Medicação desativada' : 'Medicação ativada' });
      fetchMedications();
    } catch (error) {
      console.error('Error updating medication:', error);
      toast({ title: 'Erro ao atualizar medicação', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta medicação?')) return;

    try {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Medicação excluída!' });
      fetchMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast({ title: 'Erro ao excluir medicação', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setIsRecurring(false);
    setRecurrenceFrequency('1x semana');
    setRecurrenceEndDate('');
    setPreviewDates([]);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({ title: currentStatus ? 'Medicação desativada' : 'Medicação ativada' });
      fetchMedications();
    } catch (error) {
      console.error('Error updating medication:', error);
      toast({ title: 'Erro ao atualizar medicação', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta medicação?')) return;

    try {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Medicação excluída!' });
      fetchMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast({ title: 'Erro ao excluir medicação', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  if (loading) {
    return (
      <AdminLayout currentPage="/admin/medications">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin/medications">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Medicações</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie as medicações dos pacientes
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="gradient-primary">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Medicação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <PatientSelector value={selectedPatient} onValueChange={setSelectedPatient} />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Medicação</Label>
                  <Input
                    value={medicationName}
                    onChange={(e) => setMedicationName(e.target.value)}
                    placeholder="Ex: Semaglutida"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dosagem</Label>
                    <Input
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="Ex: 0.5mg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Input
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      placeholder="Ex: 1x/semana"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim (opcional)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="recurring">Medicação Recorrente</Label>
                  <Switch
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>
                {isRecurring && (
                  <>
                    <div className="space-y-2">
                      <Label>Frequência de Criação</Label>
                      <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
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
                      <Label>Data Final da Recorrência</Label>
                      <Input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={startDate}
                        required={isRecurring}
                      />
                    </div>
                    {previewDates.length > 0 && (
                      <div className="space-y-2">
                        <Label>Datas que serão criadas ({previewDates.length})</Label>
                        <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2 flex flex-wrap gap-2">
                          {previewDates.map((date, index) => (
                            <span key={index} className="status-scheduled">
                              {format(date, "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções ou observações..."
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={saving}>
                  {saving ? 'Salvando...' : isRecurring ? 'Adicionar Medicações' : 'Adicionar Medicação'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {medications.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma medicação cadastrada
              </CardContent>
            </Card>
          ) : (
            medications.map((med) => (
              <Card key={med.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-secondary mt-1">
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{med.patient_name}</p>
                        <p className="text-lg font-semibold text-primary">{med.medication_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {med.dosage} • {med.frequency}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Início: {format(parseISO(med.start_date), "dd/MM/yyyy")}
                          {med.end_date && ` • Fim: ${format(parseISO(med.end_date), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={med.is_active ? "default" : "secondary"}>
                          {med.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                        <Switch
                          checked={med.is_active}
                          onCheckedChange={() => handleToggleActive(med.id, med.is_active)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(med.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {med.notes && (
                    <p className="mt-2 text-sm text-muted-foreground pl-12">{med.notes}</p>
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
