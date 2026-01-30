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
  expires_at: string | null;
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

  // Check if unlock is valid (approved and not expired)
  const isUnlockValid = () => {
    if (request?.status !== 'approved') return false;
    if (!request.expires_at) return true; // Legacy approvals without expiration
    return new Date(request.expires_at) > new Date();
  };

  useEffect(() => {
    onUnlockStatusChange(isUnlockValid());
  }, [request, onUnlockStatusChange]);

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!request?.expires_at) return null;
    const expiresAt = new Date(request.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}min restantes`;
    }
    return `${minutes}min restantes`;
  };

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

  // If approved and valid, show success banner with remaining time
  if (isUnlockValid()) {
    const remainingTime = getRemainingTime();
    return (
      <Card className="border-success/30 bg-success/10">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Unlock className="w-5 h-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">Edição de valores habilitada</p>
            <p className="text-xs text-muted-foreground">
              Você pode editar valores. {remainingTime && <span className="text-warning">({remainingTime})</span>}
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-success" />
        </CardContent>
      </Card>
    );
  }

  // If approved but expired, show expired state
  if (request?.status === 'approved' && !isUnlockValid()) {
    return (
      <Card className="border-warning/30 bg-warning/10">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning">Acesso expirado</p>
            <p className="text-xs text-muted-foreground">O tempo de edição expirou. Solicite novamente.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-warning/50 text-warning hover:bg-warning/10"
            onClick={handleRequestUnlock}
            disabled={requesting}
          >
            {requesting ? 'Enviando...' : 'Solicitar Novamente'}
          </Button>
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
    <Card className="border-muted/50 bg-muted/20">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Lock className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">Edição de valores bloqueada</p>
          <p className="text-xs text-muted-foreground">
            {request?.status === 'denied' 
              ? 'Solicitação negada. Você pode criar, excluir e alterar status normalmente.' 
              : 'Solicite desbloqueio para editar valores. Outras funções estão liberadas.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRequestUnlock}
          disabled={requesting}
        >
          {requesting ? 'Enviando...' : 'Solicitar Desbloqueio'}
        </Button>
      </CardContent>
    </Card>
  );
}
