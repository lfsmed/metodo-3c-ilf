import { cn } from '@/lib/utils';

type StatusType = 'completed' | 'scheduled' | 'cancelled' | 'pending' | 'paid' | 'overdue';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  completed: { label: 'Realizada', className: 'status-completed' },
  scheduled: { label: 'Agendada', className: 'status-scheduled' },
  cancelled: { label: 'Cancelada', className: 'status-overdue' },
  pending: { label: 'Pendente', className: 'status-pending' },
  paid: { label: 'Pago', className: 'status-completed' },
  overdue: { label: 'Atrasado', className: 'status-overdue' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  );
}
