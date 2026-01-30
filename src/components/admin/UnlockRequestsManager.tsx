import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, User, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnlockRequest {
  id: string;
  requester_id: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  notes: string | null;
  requester_name?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export function UnlockRequestsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('financial_unlock_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      const profilesMap = new Map<string, string>();
      (profilesData || []).forEach((p: Profile) => {
        profilesMap.set(p.user_id, p.full_name);
      });

      const combinedData = (requestsData || []).map((request) => ({
        ...request,
        requester_name: profilesMap.get(request.requester_id) || 'Usuário',
      })) as UnlockRequest[];

      setRequests(combinedData);
    } catch (error) {
      console.error('Error fetching unlock requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;

    try {
      // Set expiration to 12 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      const { error } = await supabase
        .from('financial_unlock_requests')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Solicitação aprovada!', description: 'O acesso expira em 12 horas.' });
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: 'Erro ao aprovar solicitação', variant: 'destructive' });
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('financial_unlock_requests')
        .update({
          status: 'denied',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Solicitação negada!' });
      fetchRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({ title: 'Erro ao negar solicitação', variant: 'destructive' });
    }
  };

  const handleBlock = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('financial_unlock_requests')
        .update({
          status: 'denied',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Acesso bloqueado com sucesso!' });
      fetchRequests();
    } catch (error) {
      console.error('Error blocking request:', error);
      toast({ title: 'Erro ao bloquear acesso', variant: 'destructive' });
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-8">
          <div className="w-8 h-8 rounded-lg gradient-primary animate-pulse mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingRequests.length > 0 && (
        <Card className="card-elevated border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Solicitações Pendentes ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{request.requester_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado em {format(parseISO(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-success border-success/50 hover:bg-success/10"
                    onClick={() => handleApprove(request.id)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={() => handleDeny(request.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Negar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {approvedRequests.length > 0 && (
        <Card className="card-elevated border-success/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              Acessos Liberados ({approvedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{request.requester_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Aprovado em {request.responded_at && format(parseISO(request.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={() => handleBlock(request.id)}
                >
                  <Lock className="w-4 h-4 mr-1" />
                  Bloquear
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {resolvedRequests.filter(r => r.status === 'denied').length > 0 && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Histórico de Negados/Bloqueados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolvedRequests.filter(r => r.status === 'denied').slice(0, 10).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{request.requester_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.responded_at && format(parseISO(request.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive">Bloqueado</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma solicitação de desbloqueio encontrada.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
