import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataCard } from '@/components/ui/DataCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CreditCard, Pill, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  nextApplication: { date: string; status: string } | null;
  pendingPayments: number;
  activeMedications: number;
  pendingQuestions: number;
  userName: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    nextApplication: null,
    pendingPayments: 0,
    activeMedications: 0,
    pendingQuestions: 0,
    userName: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch next application
      const today = new Date().toISOString().split('T')[0];
      const { data: applications } = await supabase
        .from('applications')
        .select('application_date, status')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .gte('application_date', today)
        .order('application_date', { ascending: true })
        .limit(1);

      // Fetch pending payments count
      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'overdue']);

      // Fetch active medications count
      const { count: activeMedications } = await supabase
        .from('medications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Fetch pending questions count
      const { count: pendingQuestions } = await supabase
        .from('questions_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('response', null);

      setData({
        nextApplication: applications?.[0] ? {
          date: applications[0].application_date,
          status: applications[0].status,
        } : null,
        pendingPayments: pendingPayments || 0,
        activeMedications: activeMedications || 0,
        pendingQuestions: pendingQuestions || 0,
        userName: profile?.full_name 
          ? profile.full_name.split(' ').slice(0, 3).join(' ')
          : 'Paciente',
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-base text-primary font-medium">{getGreeting()}</span>
          </div>
          <h1 className="text-2xl font-bold font-display">{data.userName}</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe seu tratamento de recomposição corporal
          </p>
        </div>

        {/* Next Application Card */}
        <div 
          className="card-elevated p-5 cursor-pointer group"
          onClick={() => navigate('/applications')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Calendar className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <p className="text-base text-muted-foreground">Próxima aplicação</p>
                {data.nextApplication ? (
                  <>
                    <p className="text-xl font-semibold font-display">
                      {format(parseISO(data.nextApplication.date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <StatusBadge status="scheduled" className="mt-1" />
                  </>
                ) : (
                  <p className="text-xl font-semibold font-display text-muted-foreground">
                    Nenhuma agendada
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="cursor-pointer"
            onClick={() => navigate('/financial')}
          >
            <DataCard
              title="Pagamentos pendentes"
              value={data.pendingPayments}
              subtitle={data.pendingPayments === 0 ? 'Tudo em dia!' : 'A vencer'}
              icon={CreditCard}
              iconColor="text-warning"
            />
          </div>

          <div 
            className="cursor-pointer"
            onClick={() => navigate('/medications')}
          >
            <DataCard
              title="Medicações ativas"
              value={data.activeMedications}
              subtitle="Em uso"
              icon={Pill}
              iconColor="text-primary"
            />
          </div>
        </div>

        {/* Questions Card */}
        <div 
          className="card-elevated p-4 cursor-pointer group"
          onClick={() => navigate('/questions')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-secondary">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">Dúvidas e Relatos</p>
                <p className="text-base text-muted-foreground">
                  {data.pendingQuestions > 0 
                    ? `${data.pendingQuestions} aguardando resposta`
                    : 'Tire suas dúvidas'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
