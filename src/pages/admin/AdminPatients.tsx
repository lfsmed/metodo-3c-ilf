import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Mail, Phone, Calendar, MapPin } from 'lucide-react';
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
  created_at: string;
}

export default function AdminPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
      setFilteredPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
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
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display">Pacientes</h1>
          <p className="text-muted-foreground text-sm">
            {patients.length} pacientes cadastrados
          </p>
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
                <CardTitle className="font-display text-lg">{selectedPatient.full_name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  Voltar
                </Button>
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
              <div className="pt-2">
                <Badge variant="secondary">
                  Cadastrado em {format(parseISO(selectedPatient.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
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
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {patient.full_name.charAt(0).toUpperCase()}
                      </div>
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
      </div>
    </AdminLayout>
  );
}
