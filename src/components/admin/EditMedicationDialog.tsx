import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PatientSelector } from '@/components/admin/PatientSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseISO, differenceInDays, addDays, format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

interface EditMedicationDialogProps {
  medication: Medication | null;
  allMedications: Medication[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditMedicationDialog({ 
  medication, 
  allMedications, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditMedicationDialogProps) {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updateSubsequent, setUpdateSubsequent] = useState(false);
  const [subsequentMeds, setSubsequentMeds] = useState<Medication[]>([]);

  useEffect(() => {
    if (medication) {
      setSelectedPatient(medication.user_id);
      setMedicationName(medication.medication_name);
      setDosage(medication.dosage);
      setFrequency(medication.frequency);
      setStartDate(medication.start_date);
      setEndDate(medication.end_date || '');
      setNotes(medication.notes || '');
      setIsActive(medication.is_active);
      setUpdateSubsequent(false);
      
      // Find subsequent medications for the same patient with same medication name
      const currentDate = parseISO(medication.start_date);
      const subsequent = allMedications
        .filter(med => 
          med.user_id === medication.user_id && 
          med.id !== medication.id &&
          med.medication_name === medication.medication_name &&
          isAfter(parseISO(med.start_date), currentDate) &&
          med.is_active
        )
        .sort((a, b) => 
          parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
        );
      setSubsequentMeds(subsequent);
    }
  }, [medication, allMedications]);

  const calculateDateDifference = () => {
    if (!medication) return 0;
    const originalDate = parseISO(medication.start_date);
    const newDate = parseISO(startDate);
    return differenceInDays(newDate, originalDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medication || !selectedPatient || !medicationName || !dosage || !frequency || !startDate) return;

    setSaving(true);
    try {
      // Update the current medication
      const { error } = await supabase
        .from('medications')
        .update({
          user_id: selectedPatient,
          medication_name: medicationName,
          dosage,
          frequency,
          start_date: startDate,
          end_date: endDate || null,
          notes: notes || null,
          is_active: isActive,
        })
        .eq('id', medication.id);

      if (error) throw error;

      // If updateSubsequent is checked and date changed, update subsequent medications
      const dateDiff = calculateDateDifference();
      if (updateSubsequent && dateDiff !== 0 && subsequentMeds.length > 0) {
        const updates = subsequentMeds.map(async (med) => {
          const originalMedDate = parseISO(med.start_date);
          const newMedDate = addDays(originalMedDate, dateDiff);
          
          return supabase
            .from('medications')
            .update({
              start_date: format(newMedDate, 'yyyy-MM-dd'),
            })
            .eq('id', med.id);
        });

        await Promise.all(updates);
        toast({ title: `Medicação e ${subsequentMeds.length} datas subsequentes atualizadas!` });
      } else {
        toast({ title: 'Medicação atualizada com sucesso!' });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating medication:', error);
      toast({ title: 'Erro ao atualizar medicação', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const dateDiff = calculateDateDifference();
  const showSubsequentOption = subsequentMeds.length > 0 && dateDiff !== 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Medicação</DialogTitle>
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

          {showSubsequentOption && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="updateSubsequent"
                  checked={updateSubsequent}
                  onCheckedChange={(checked) => setUpdateSubsequent(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="updateSubsequent" className="cursor-pointer">
                    Atualizar datas subsequentes automaticamente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {dateDiff > 0 ? `Adiar` : `Antecipar`} {Math.abs(dateDiff)} dia(s) para {subsequentMeds.length} medicação(ões) ativa(s)
                  </p>
                </div>
              </div>
              
              {updateSubsequent && (
                <div className="max-h-24 overflow-y-auto rounded-md border bg-background p-2 flex flex-wrap gap-2">
                  {subsequentMeds.map((med) => {
                    const originalDate = parseISO(med.start_date);
                    const newDate = addDays(originalDate, dateDiff);
                    return (
                      <span key={med.id} className="text-xs bg-secondary px-2 py-1 rounded">
                        {format(originalDate, "dd/MM", { locale: ptBR })} → {format(newDate, "dd/MM", { locale: ptBR })}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="isActive">Status:</Label>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções ou observações..."
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
