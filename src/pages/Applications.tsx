import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, ChevronLeft } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Application {
  id: string;
  application_date: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  notes: string | null;
}

export default function Applications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('application_date', { ascending: false });

      setApplications((data as Application[]) || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = startOfToday();
  const futureApplications = applications.filter(
    app => app.status === 'scheduled' && isAfter(parseISO(app.application_date), today)
  );
  const pastApplications = applications.filter(
    app => app.status === 'completed' || (app.status !== 'missed' && app.status !== 'cancelled' && isBefore(parseISO(app.application_date), today))
  );
  const missedApplications = applications.filter(
    app => app.status === 'missed'
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  const ApplicationCard = ({ app }: { app: Application }) => (
    <div className="card-elevated p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium font-display">
              {format(parseISO(app.application_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(app.application_date), 'EEEE', { locale: ptBR })}
            </p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>
      {app.notes && (
        <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
          {app.notes}
        </p>
      )}
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
            <h1 className="text-xl font-bold font-display">Aplicações</h1>
            <p className="text-sm text-muted-foreground">Histórico e agendamentos</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="future" className="w-full">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="future" className="flex-1">
              Agendadas ({futureApplications.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              Realizadas ({pastApplications.length})
            </TabsTrigger>
            <TabsTrigger value="missed" className="flex-1">
              Faltas ({missedApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="future" className="space-y-3 mt-4">
            {futureApplications.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma aplicação agendada</p>
              </div>
            ) : (
              futureApplications.map(app => (
                <ApplicationCard key={app.id} app={app} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-4">
            {pastApplications.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma aplicação realizada</p>
              </div>
            ) : (
              pastApplications.map(app => (
                <ApplicationCard key={app.id} app={app} />
              ))
            )}
          </TabsContent>

          <TabsContent value="missed" className="space-y-3 mt-4">
            {missedApplications.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma falta registrada</p>
              </div>
            ) : (
              missedApplications.map(app => (
                <ApplicationCard key={app.id} app={app} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
