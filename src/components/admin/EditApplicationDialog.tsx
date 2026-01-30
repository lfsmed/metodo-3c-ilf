import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { parseISO, differenceInDays, addDays, format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Application {
  id: string;
  user_id: string;
  application_date: string;
  status: string;
  notes: string | null;
}

interface EditApplicationDialogProps {
  application: Application | null;
  allApplications: Application[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditApplicationDialog({ 
  application, 
  allApplications, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditApplicationDialogProps) {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [updateSubsequent, setUpdateSubsequent] = useState(false);
  const [subsequentApps, setSubsequentApps] = useState<Application[]>([]);

  useEffect(() => {
    if (application) {
      setSelectedPatient(application.user_id);
      setApplicationDate(application.application_date);
      setStatus(application.status);
      setNotes(application.notes || '');
      setUpdateSubsequent(false);
      
      // Find subsequent applications for the same patient
      const currentDate = parseISO(application.application_date);
      const subsequent = allApplications
        .filter(app => 
          app.user_id === application.user_id && 
          app.id !== application.id &&
          isAfter(parseISO(app.application_date), currentDate) &&
          app.status === 'scheduled'
        )
        .sort((a, b) => 
          parseISO(a.application_date).getTime() - parseISO(b.application_date).getTime()
        );
      setSubsequentApps(subsequent);
    }
  }, [application, allApplications]);

  const calculateDateDifference = () => {
    if (!application) return 0;
    const originalDate = parseISO(application.application_date);
    const newDate = parseISO(applicationDate);
    return differenceInDays(newDate, originalDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !selectedPatient || !applicationDate) return;

    setSaving(true);
    try {
      // Update the current application
      const { error } = await supabase
        .from('applications')
        .update({
          user_id: selectedPatient,
          application_date: applicationDate,
          status,
          notes: notes || null,
        })
        .eq('id', application.id);

      if (error) throw error;

      // If updateSubsequent is checked and date changed, update subsequent applications
      const dateDiff = calculateDateDifference();
      if (updateSubsequent && dateDiff !== 0 && subsequentApps.length > 0) {
        const updates = subsequentApps.map(async (app) => {
          const originalAppDate = parseISO(app.application_date);
          const newAppDate = addDays(originalAppDate, dateDiff);
          
          return supabase
            .from('applications')
            .update({
              application_date: format(newAppDate, 'yyyy-MM-dd'),
            })
            .eq('id', app.id);
        });

        await Promise.all(updates);
        toast({ title: `Aplicação e ${subsequentApps.length} datas subsequentes atualizadas!` });
      } else {
        toast({ title: 'Aplicação atualizada com sucesso!' });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({ title: 'Erro ao atualizar aplicação', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const dateDiff = calculateDateDifference();
  const showSubsequentOption = subsequentApps.length > 0 && dateDiff !== 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Aplicação</DialogTitle>
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
                    {dateDiff > 0 ? `Adiar` : `Antecipar`} {Math.abs(dateDiff)} dia(s) para {subsequentApps.length} aplicação(ões) agendada(s)
                  </p>
                </div>
              </div>
              
              {updateSubsequent && (
                <div className="max-h-24 overflow-y-auto rounded-md border bg-background p-2 flex flex-wrap gap-2">
                  {subsequentApps.map((app) => {
                    const originalDate = parseISO(app.application_date);
                    const newDate = addDays(originalDate, dateDiff);
                    return (
                      <span key={app.id} className="text-xs bg-secondary px-2 py-1 rounded">
                        {format(originalDate, "dd/MM", { locale: ptBR })} → {format(newDate, "dd/MM", { locale: ptBR })}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="completed">Realizada</SelectItem>
                <SelectItem value="missed">Faltou</SelectItem>
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
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
