import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Pill, ChevronLeft, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Medication {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function Medications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMedications();
    }
  }, [user]);

  const fetchMedications = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });

      setMedications((data as Medication[]) || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeMedications = medications.filter(m => m.is_active);
  const inactiveMedications = medications.filter(m => !m.is_active);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  const MedicationCard = ({ medication }: { medication: Medication }) => (
    <div className={cn(
      "card-elevated p-4",
      !medication.is_active && "opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          medication.is_active ? "gradient-primary" : "bg-secondary"
        )}>
          <Pill className={cn(
            "w-6 h-6",
            medication.is_active ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium font-display">{medication.medication_name}</p>
              <p className="text-lg font-semibold text-primary">{medication.dosage}</p>
            </div>
            {medication.is_active && (
              <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">
                Ativo
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-base text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span>{medication.frequency}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <p>
              Início: {format(parseISO(medication.start_date), "dd/MM/yyyy", { locale: ptBR })}
              {medication.end_date && (
                <> • Fim: {format(parseISO(medication.end_date), "dd/MM/yyyy", { locale: ptBR })}</>
              )}
            </p>
          </div>

          {medication.notes && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-secondary/50">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{medication.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display">Medicações</h1>
            <p className="text-sm text-muted-foreground">Dosagem e frequência</p>
          </div>
        </div>

        {/* Active Medications */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Em uso ({activeMedications.length})
          </h2>
          
          {activeMedications.length === 0 ? (
            <div className="text-center py-12 card-elevated">
              <Pill className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma medicação ativa</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMedications.map(medication => (
                <MedicationCard key={medication.id} medication={medication} />
              ))}
            </div>
          )}
        </div>

        {/* Inactive Medications */}
        {inactiveMedications.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Anteriores ({inactiveMedications.length})
            </h2>
            <div className="space-y-3">
              {inactiveMedications.map(medication => (
                <MedicationCard key={medication.id} medication={medication} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
