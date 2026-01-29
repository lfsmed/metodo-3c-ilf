import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Patient {
  user_id: string;
  full_name: string;
  email: string;
}

interface PatientSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function PatientSelector({ value, onValueChange, placeholder = "Selecione um paciente" }: PatientSelectorProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {patients.map((patient) => (
          <SelectItem key={patient.user_id} value={patient.user_id}>
            {patient.full_name} ({patient.email})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
