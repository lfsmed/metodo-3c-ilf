import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataCard } from '@/components/ui/DataCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Pill, 
  MessageCircle, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Stethoscope,
  CalendarClock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminStats {
  totalPatients: number;
  scheduledApplications: number;
  pendingPayments: number;
  activeMedications: number;
  pendingQuestions: number;
}

interface FinancialStats {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  completedApplications: number;
}

interface MedicalEvaluation {
  id: string;
  user_id: string;
  evaluation_date: string;
  evaluation_time: string;
  notes: string | null;
  status: string;
  patientName?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { hasFinancialAccess } = useAdmin();
  const [stats, setStats] = useState<AdminStats>({
    totalPatients: 0,
    scheduledApplications: 0,
    pendingPayments: 0,
    activeMedications: 0,
    pendingQuestions: 0,
  });
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    completedApplications: 0,
  });
  const [upcomingEvaluations, setUpcomingEvaluations] = useState<MedicalEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    if (hasFinancialAccess) {
      fetchFinancialStats();
    }
    fetchUpcomingEvaluations();
  }, [hasFinancialAccess]);

  const fetchStats = async () => {
    try {
      const [patients, applications, payments, medications, questions] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).in('status', ['pending', 'overdue']),
        supabase.from('medications').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('questions_reports').select('*', { count: 'exact', head: true }).is('response', null),
      ]);

      setStats({
        totalPatients: patients.count || 0,
        scheduledApplications: applications.count || 0,
        pendingPayments: payments.count || 0,
        activeMedications: medications.count || 0,
        pendingQuestions: questions.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialStats = async () => {
    try {
      // Fetch all payments for financial statistics
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status');

      // Fetch completed applications count
      const { count: completedCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      if (payments) {
        const totalReceived = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        
        const totalPending = payments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        
        const totalOverdue = payments
          .filter(p => p.status === 'overdue')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        setFinancialStats({
          totalReceived,
          totalPending,
          totalOverdue,
          completedApplications: completedCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching financial stats:', error);
    }
  };

  const fetchUpcomingEvaluations = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: evaluations } = await supabase
        .from('medical_evaluations')
        .select('*')
        .gte('evaluation_date', today)
        .eq('status', 'scheduled')
        .order('evaluation_date', { ascending: true })
        .order('evaluation_time', { ascending: true })
        .limit(5);

      if (evaluations && evaluations.length > 0) {
        // Fetch patient names
        const userIds = [...new Set(evaluations.map(e => e.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        const evaluationsWithNames = evaluations.map(e => ({
          ...e,
          patientName: profileMap.get(e.user_id) || 'Paciente'
        }));

        setUpcomingEvaluations(evaluationsWithNames);
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <AdminLayout currentPage="/admin">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin">
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm text-primary font-medium">Visão Geral</span>
          </div>
          <h1 className="text-2xl font-bold font-display">Dashboard Admin</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie todos os pacientes e dados do instituto
          </p>
        </div>

        {/* Statistics Section */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Aplicações Realizadas</span>
                </div>
                <p className="text-xl font-bold font-display">{financialStats.completedApplications}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Atendimentos</span>
                </div>
                <p className="text-xl font-bold font-display">{financialStats.completedApplications}</p>
              </div>
            </div>

            {hasFinancialAccess && (
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Valores Recebidos</span>
                    </div>
                    <p className="text-lg font-bold font-display text-green-500">
                      {formatCurrency(financialStats.totalReceived)}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Valores a Receber</span>
                    </div>
                    <p className="text-lg font-bold font-display text-yellow-500">
                      {formatCurrency(financialStats.totalPending)}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Valores Atrasados</span>
                    </div>
                    <p className="text-lg font-bold font-display text-red-500">
                      {formatCurrency(financialStats.totalOverdue)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Medical Evaluations Section */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Próximas Avaliações Médicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvaluations.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvaluations.map((evaluation) => (
                  <div 
                    key={evaluation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CalendarClock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {evaluation.patientName?.split(' ').slice(0, 3).join(' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evaluation.notes || 'Avaliação médica'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseISO(evaluation.evaluation_date), "dd/MM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {evaluation.evaluation_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma avaliação agendada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="cursor-pointer" onClick={() => navigate('/admin/patients')}>
            <DataCard
              title="Total de Pacientes"
              value={stats.totalPatients}
              subtitle="Cadastrados"
              icon={Users}
              iconColor="text-primary"
            />
          </div>

          <div className="cursor-pointer" onClick={() => navigate('/admin/applications')}>
            <DataCard
              title="Aplicações"
              value={stats.scheduledApplications}
              subtitle="Agendadas"
              icon={Calendar}
              iconColor="text-success"
            />
          </div>

          <div className="cursor-pointer" onClick={() => navigate('/admin/financial')}>
            <DataCard
              title="Pagamentos"
              value={stats.pendingPayments}
              subtitle="Pendentes"
              icon={CreditCard}
              iconColor="text-warning"
            />
          </div>

          <div className="cursor-pointer" onClick={() => navigate('/admin/medications')}>
            <DataCard
              title="Medicações"
              value={stats.activeMedications}
              subtitle="Ativas"
              icon={Pill}
              iconColor="text-primary"
            />
          </div>
        </div>

        <div className="cursor-pointer" onClick={() => navigate('/admin/questions')}>
          <DataCard
            title="Dúvidas Pendentes"
            value={stats.pendingQuestions}
            subtitle="Aguardando resposta"
            icon={MessageCircle}
            iconColor="text-error"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
