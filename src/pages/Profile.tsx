import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, User, Mail, Phone, Calendar, MapPin, FileText, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChangePasswordSection } from '@/components/profile/ChangePasswordSection';

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setFormData(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          cpf: formData.cpf,
          birth_date: formData.birth_date,
          address: formData.address,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas',
      });

      setEditing(false);
      fetchProfile();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    field,
    type = 'text'
  }: { 
    icon: any; 
    label: string; 
    value: string | null; 
    field: keyof Profile;
    type?: string;
  }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="p-2 rounded-lg bg-secondary">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {editing ? (
          <Input
            type={type}
            value={formData[field] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
            className="input-field mt-1 h-9"
          />
        ) : (
          <p className="text-sm font-medium mt-0.5">{value || '-'}</p>
        )}
      </div>
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
              <h1 className="text-xl font-bold font-display">Meu Perfil</h1>
              <p className="text-sm text-muted-foreground">Suas informações</p>
            </div>
          </div>

          {!editing ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Salvar
            </Button>
          )}
        </div>

        {/* Profile Card */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold font-display">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                Paciente desde {profile?.created_at && format(parseISO(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <InfoRow icon={User} label="Nome completo" value={profile?.full_name || null} field="full_name" />
            <InfoRow icon={Mail} label="Email" value={profile?.email || null} field="email" />
            <InfoRow icon={Phone} label="Telefone" value={profile?.phone || null} field="phone" type="tel" />
            <InfoRow icon={FileText} label="CPF" value={profile?.cpf || null} field="cpf" />
            <InfoRow icon={Calendar} label="Data de nascimento" value={profile?.birth_date || null} field="birth_date" type="date" />
            <InfoRow icon={MapPin} label="Endereço" value={profile?.address || null} field="address" />
          </div>
        </div>

        {/* Change Password Section */}
        <ChangePasswordSection />

        {editing && (
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => {
              setEditing(false);
              setFormData(profile || {});
            }}
          >
            Cancelar
          </Button>
        )}
      </div>
    </AppLayout>
  );
}
