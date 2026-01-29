import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataCard } from '@/components/ui/DataCard';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, CreditCard, Pill, MessageCircle, TrendingUp } from 'lucide-react';

interface AdminStats {
  totalPatients: number;
  scheduledApplications: number;
  pendingPayments: number;
  activeMedications: number;
  pendingQuestions: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalPatients: 0,
    scheduledApplications: 0,
    pendingPayments: 0,
    activeMedications: 0,
    pendingQuestions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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
