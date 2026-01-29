import { ReactNode } from 'react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto container px-4 py-6 pb-24">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
