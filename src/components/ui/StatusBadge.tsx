import { cn } from '@/lib/utils';

type StatusType = 'completed' | 'scheduled' | 'cancelled' | 'pending' | 'paid' | 'overdue' | 'missed';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  completed: { label: 'Realizada', className: 'status-completed' },
  scheduled: { label: 'Agendada', className: 'status-scheduled' },
  cancelled: { label: 'Cancelada', className: 'status-overdue' },
  missed: { label: 'Faltou', className: 'status-pending' },
  pending: { label: 'A Vencer', className: 'status-pending' },
  paid: { label: 'Pago', className: 'status-completed' },
  overdue: { label: 'Vencido', className: 'status-overdue' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || { label: status, className: 'status-pending' };
  
  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  );
}
