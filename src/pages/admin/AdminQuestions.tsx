import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Send, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  patient_name?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export default function AdminQuestions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const fetchAdminProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.full_name) {
        setAdminName(data.full_name);
      }
    };
    fetchAdminProfile();
  }, [user]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      // Create a map
      const profilesMap = new Map<string, string>();
      (profilesData || []).forEach((p: Profile) => {
        profilesMap.set(p.user_id, p.full_name);
      });

      // Combine data
      const combinedData = (questionsData || []).map((q) => ({
        ...q,
        patient_name: profilesMap.get(q.user_id) || 'Paciente',
      }));

      setQuestions(combinedData);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedQuestion || !response.trim()) return;

    setSaving(true);
    try {
      // Add signature with admin name
      const signedResponse = adminName 
        ? `${response.trim()}\n\n— ${adminName}`
        : response.trim();

      const { error } = await supabase
        .from('questions_reports')
        .update({
          response: signedResponse,
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedQuestion.id);

      if (error) throw error;

      toast({ title: 'Resposta enviada com sucesso!' });
      setSelectedQuestion(null);
      setResponse('');
      fetchQuestions();
    } catch (error) {
      console.error('Error responding:', error);
      toast({ title: 'Erro ao enviar resposta', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const pendingQuestions = questions.filter((q) => !q.response);
  const answeredQuestions = questions.filter((q) => q.response);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'question':
        return 'Dúvida';
      case 'report':
        return 'Relato';
      case 'complaint':
        return 'Reclamação';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <AdminLayout currentPage="/admin/questions">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (selectedQuestion) {
    return (
      <AdminLayout currentPage="/admin/questions">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display">Responder</h1>
              <p className="text-muted-foreground text-sm">
                {selectedQuestion.patient_name}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
              Voltar
            </Button>
          </div>

          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg">{selectedQuestion.title}</CardTitle>
                <Badge variant="secondary">{getTypeLabel(selectedQuestion.type)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(selectedQuestion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm">{selectedQuestion.content}</p>
              </div>

              {selectedQuestion.response ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary">Sua resposta:</p>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm">{selectedQuestion.response}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Digite sua resposta..."
                    rows={4}
                  />
                  <Button 
                    className="w-full gradient-primary" 
                    onClick={handleRespond}
                    disabled={saving || !response.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {saving ? 'Enviando...' : 'Enviar Resposta'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin/questions">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold font-display">Dúvidas e Relatos</h1>
          <p className="text-muted-foreground text-sm">
            Responda às dúvidas dos pacientes
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              Pendentes
              {pendingQuestions.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs justify-center">
                  {pendingQuestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="answered">Respondidas</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingQuestions.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma dúvida pendente 🎉
                </CardContent>
              </Card>
            ) : (
              pendingQuestions.map((question) => (
                <Card 
                  key={question.id} 
                  className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedQuestion(question)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-secondary mt-1">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {question.patient_name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(question.type)}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{question.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{question.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(question.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="answered" className="space-y-3 mt-4">
            {answeredQuestions.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma dúvida respondida ainda
                </CardContent>
              </Card>
            ) : (
              answeredQuestions.map((question) => (
                <Card 
                  key={question.id} 
                  className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedQuestion(question)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/20 mt-1">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {question.patient_name}
                          </span>
                          <Badge variant="default" className="text-xs bg-success">
                            Respondida
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{question.title}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Respondida em {format(parseISO(question.responded_at!), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
