import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Unlock, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UnlockRequest {
  id: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  responded_at: string | null;
}

interface FinancialUnlockBannerProps {
  onUnlockStatusChange: (isUnlocked: boolean) => void;
}

export function FinancialUnlockBanner({ onUnlockStatusChange }: FinancialUnlockBannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<UnlockRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnlockRequest();
    }
  }, [user]);

  useEffect(() => {
    onUnlockStatusChange(request?.status === 'approved');
  }, [request, onUnlockStatusChange]);

  const fetchUnlockRequest = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('financial_unlock_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching unlock request:', error);
      }

      setRequest(data as UnlockRequest | null);
    } catch (error) {
      console.error('Error fetching unlock request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!user) return;

    setRequesting(true);
    try {
      const { error } = await supabase
        .from('financial_unlock_requests')
        .insert({
          requester_id: user.id,
          status: 'pending',
        });

      if (error) throw error;

      toast({ title: 'Solicitação enviada!', description: 'Aguarde a aprovação de um administrador master.' });
      fetchUnlockRequest();
    } catch (error) {
      console.error('Error requesting unlock:', error);
      toast({ title: 'Erro ao enviar solicitação', variant: 'destructive' });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return null;
  }

  // If approved, show success banner briefly or just return null
  if (request?.status === 'approved') {
    return (
      <Card className="border-success/30 bg-success/10">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Unlock className="w-5 h-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">Edição habilitada</p>
            <p className="text-xs text-muted-foreground">Você tem permissão para editar itens financeiros.</p>
          </div>
          <CheckCircle className="w-5 h-5 text-success" />
        </CardContent>
      </Card>
    );
  }

  // If pending, show waiting state
  if (request?.status === 'pending') {
    return (
      <Card className="border-warning/30 bg-warning/10">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning">Aguardando aprovação</p>
            <p className="text-xs text-muted-foreground">Sua solicitação de desbloqueio foi enviada e está aguardando aprovação de um master.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If denied or no request, show lock state
  return (
    <Card className="border-destructive/30 bg-destructive/10">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Lock className="w-5 h-5 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">Edição bloqueada</p>
          <p className="text-xs text-muted-foreground">
            {request?.status === 'denied' 
              ? 'Sua solicitação foi negada. Você pode solicitar novamente.' 
              : 'Solicite desbloqueio para editar itens financeiros.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={handleRequestUnlock}
          disabled={requesting}
        >
          {requesting ? 'Enviando...' : 'Solicitar Desbloqueio'}
        </Button>
      </CardContent>
    </Card>
  );
}
