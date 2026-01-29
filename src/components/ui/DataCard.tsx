import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  children?: ReactNode;
}

export function DataCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-primary',
  className,
  children 
}: DataCardProps) {
  return (
    <div className={cn("card-elevated p-4", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold font-display mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg bg-secondary", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
