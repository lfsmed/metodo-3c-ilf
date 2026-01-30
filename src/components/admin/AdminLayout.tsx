import { ReactNode, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Pill, 
  MessageCircle, 
  LayoutDashboard,
  LogOut,
  ArrowLeft,
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage?: string;
}

const allNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', requiresFinancial: false },
  { icon: Users, label: 'Pacientes', path: '/admin/patients', requiresFinancial: false },
  { icon: Calendar, label: 'Aplicações', path: '/admin/applications', requiresFinancial: false },
  { icon: CreditCard, label: 'Financeiro', path: '/admin/financial', requiresFinancial: true },
  { icon: Pill, label: 'Medicações', path: '/admin/medications', requiresFinancial: false },
  { icon: Stethoscope, label: 'Avaliações', path: '/admin/evaluations', requiresFinancial: false },
  { icon: MessageCircle, label: 'Dúvidas', path: '/admin/questions', requiresFinancial: false },
];

export function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const { isAdmin, isMaster, hasFinancialAccess, loading } = useAdmin();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Filter nav items based on financial access
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if (item.requiresFinancial) {
        return hasFinancialAccess;
      }
      return true;
    });
  }, [hasFinancialAccess]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  // Redirect from financial page if no access
  useEffect(() => {
    if (!loading && currentPage === '/admin/financial' && !hasFinancialAccess) {
      navigate('/admin');
    }
  }, [hasFinancialAccess, loading, currentPage, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-lg">
                Painel Admin
                {isMaster && <span className="text-warning ml-1 text-xs">★</span>}
              </h1>
              <p className="text-xs text-primary">Método 3C Instituto</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto container px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
                <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
