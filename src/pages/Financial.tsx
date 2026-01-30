import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataCard } from '@/components/ui/DataCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  description: string | null;
}

export default function Financial() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      setPayments((data as Payment[]) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const paidPayments = payments.filter(p => p.status === 'paid');

  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  const PaymentCard = ({ payment }: { payment: Payment }) => {
    const getDateText = () => {
      try {
        if (payment.status === 'paid' && payment.paid_date) {
          return `Pago em ${format(parseISO(payment.paid_date), "dd/MM/yyyy", { locale: ptBR })}`;
        }
        return `Vence em ${format(parseISO(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'Data indisponível';
      }
    };

    return (
      <div className="card-elevated p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium font-display">
              {formatCurrency(Number(payment.amount))}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {payment.description || 'Pagamento'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {getDateText()}
            </p>
          </div>
          <StatusBadge status={payment.status} />
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Pagamentos e faturas</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <DataCard
            title="A pagar"
            value={formatCurrency(totalPending)}
            icon={TrendingDown}
            iconColor="text-warning"
          />
          <DataCard
            title="Total pago"
            value={formatCurrency(totalPaid)}
            icon={TrendingUp}
            iconColor="text-success"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="pending" className="flex-1">
              Pendentes ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex-1">
              Pagos ({paidPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum pagamento pendente</p>
                <p className="text-sm text-success mt-1">Tudo em dia! 🎉</p>
              </div>
            ) : (
              pendingPayments.map(payment => (
                <PaymentCard key={payment.id} payment={payment} />
              ))
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-3 mt-4">
            {paidPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum pagamento realizado</p>
              </div>
            ) : (
              paidPayments.map(payment => (
                <PaymentCard key={payment.id} payment={payment} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
