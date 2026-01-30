import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { CreatePatientDialog } from '@/components/admin/CreatePatientDialog';
import { EditPatientDialog } from '@/components/admin/EditPatientDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, User, Mail, Phone, Calendar, MapPin, Pencil, Shield, KeyRound } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  isAdmin?: boolean;
}

export default function AdminPatients() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [togglingAdmin, setTogglingAdmin] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [patientToResetPassword, setPatientToResetPassword] = useState<Patient | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.cpf?.includes(searchTerm)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch admin roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      // Merge data
      const patientsWithRoles = (profilesData || []).map(p => ({
        ...p,
        isAdmin: adminUserIds.has(p.user_id),
      }));

      setPatients(patientsWithRoles);
      setFilteredPatients(patientsWithRoles);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (patient: Patient) => {
    setTogglingAdmin(true);
    try {
      if (patient.isAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', patient.user_id)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: 'Privilégio removido',
          description: `${patient.full_name} não é mais administrador.`,
        });
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: patient.user_id, role: 'admin' });

        if (error) throw error;

        toast({
          title: 'Privilégio concedido',
          description: `${patient.full_name} agora é administrador.`,
        });
      }

      // Refresh data
      await fetchPatients();
      
      // Update selected patient if viewing details
      if (selectedPatient?.id === patient.id) {
        setSelectedPatient({
          ...selectedPatient,
          isAdmin: !patient.isAdmin,
        });
      }
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o privilégio de administrador.',
        variant: 'destructive',
      });
    } finally {
      setTogglingAdmin(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout currentPage="/admin/patients">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="/admin/patients">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-display">Pacientes</h1>
            <p className="text-muted-foreground text-sm">
              {patients.length} pacientes cadastrados
            </p>
          </div>
          <CreatePatientDialog onPatientCreated={fetchPatients} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedPatient ? (
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedPatient.avatar_url || undefined} alt={selectedPatient.full_name} />
                    <AvatarFallback className="gradient-primary text-primary-foreground font-bold">
                      {selectedPatient.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="font-display text-lg">{selectedPatient.full_name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setPatientToResetPassword(selectedPatient);
                      setResetPasswordDialogOpen(true);
                    }}
                  >
                    <KeyRound className="w-4 h-4 mr-1" />
                    Senha
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setPatientToEdit(selectedPatient);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                    Voltar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{selectedPatient.email}</span>
              </div>
              {selectedPatient.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedPatient.phone}</span>
                </div>
              )}
              {selectedPatient.birth_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{format(parseISO(selectedPatient.birth_date), "dd/MM/yyyy")}</span>
                </div>
              )}
              {selectedPatient.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedPatient.address}</span>
                </div>
              )}
              {selectedPatient.cpf && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>CPF: {selectedPatient.cpf}</span>
                </div>
              )}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <Badge variant="secondary">
                  Cadastrado em {format(parseISO(selectedPatient.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
                {selectedPatient.isAdmin && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    <Shield className="w-3 h-3 mr-1" />
                    Administrador
                  </Badge>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <Label htmlFor="admin-toggle" className="font-medium">
                      Privilégios de Administrador
                    </Label>
                  </div>
                  <Switch
                    id="admin-toggle"
                    checked={selectedPatient.isAdmin}
                    onCheckedChange={() => toggleAdminRole(selectedPatient)}
                    disabled={togglingAdmin}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Administradores podem gerenciar todos os dados do sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPatients.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum paciente encontrado
                </CardContent>
              </Card>
            ) : (
              filteredPatients.map((patient) => (
                <Card 
                  key={patient.id} 
                  className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedPatient(patient)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={patient.avatar_url || undefined} alt={patient.full_name} />
                        <AvatarFallback className="gradient-primary text-primary-foreground font-bold">
                          {patient.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{patient.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{patient.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        <EditPatientDialog
          patient={patientToEdit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onPatientUpdated={() => {
            fetchPatients();
            if (patientToEdit && selectedPatient?.id === patientToEdit.id) {
              // Refresh selected patient data
              supabase
                .from('profiles')
                .select('*')
                .eq('id', patientToEdit.id)
                .single()
                .then(({ data }) => {
                  if (data) setSelectedPatient(data);
                });
            }
          }}
        />

        <ResetPasswordDialog
          patient={patientToResetPassword}
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
        />
      </div>
    </AdminLayout>
  );
}
