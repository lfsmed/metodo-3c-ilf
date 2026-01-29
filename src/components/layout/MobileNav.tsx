import { Calendar, CreditCard, Pill, MessageCircle, User, Home, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { icon: Home, label: 'Início', path: '/dashboard' },
  { icon: Calendar, label: 'Aplicações', path: '/applications' },
  { icon: CreditCard, label: 'Financeiro', path: '/financial' },
  { icon: Pill, label: 'Medicação', path: '/medications' },
  { icon: MessageCircle, label: 'Dúvidas', path: '/questions' },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
