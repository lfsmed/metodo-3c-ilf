import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, ChevronLeft, Plus, Send, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface QuestionReport {
  id: string;
  type: 'question' | 'report';
  title: string;
  content: string;
  response: string | null;
  responded_at: string | null;
  created_at: string;
}

export default function Questions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'question' as 'question' | 'report',
    title: '',
    content: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('questions_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setItems((data as QuestionReport[]) || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('questions_reports').insert({
        user_id: user.id,
        type: formData.type,
        title: formData.title,
        content: formData.content,
      });

      if (error) throw error;

      toast({
        title: 'Enviado com sucesso!',
        description: formData.type === 'question' 
          ? 'Sua dúvida foi registrada'
          : 'Seu relato foi registrado',
      });

      setFormData({ type: 'question', title: '', content: '' });
      setDialogOpen(false);
      fetchItems();
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  const ItemCard = ({ item }: { item: QuestionReport }) => (
    <div className="card-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              item.type === 'question' 
                ? "bg-primary/20 text-primary"
                : "bg-warning/20 text-warning"
            )}>
              {item.type === 'question' ? 'Dúvida' : 'Relato'}
            </span>
            {item.response ? (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle className="w-3 h-3" />
                Respondida
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Aguardando
              </span>
            )}
          </div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {format(parseISO(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      {item.response && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-primary mb-1">Resposta:</p>
          <p className="text-sm text-muted-foreground">{item.response}</p>
          {item.responded_at && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(parseISO(item.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold font-display">Dúvidas e Relatos</h1>
              <p className="text-sm text-muted-foreground">Tire suas dúvidas</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full gradient-primary shadow-glow">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Nova mensagem</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'question' | 'report') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="question">Dúvida</SelectItem>
                      <SelectItem value="report">Relato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Resumo da sua mensagem"
                    className="input-field"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Descreva sua dúvida ou relato em detalhes..."
                    className="input-field min-h-[120px] resize-none"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-primary"
                  disabled={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="text-center py-12 card-elevated">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique no botão + para enviar uma dúvida ou relato
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
