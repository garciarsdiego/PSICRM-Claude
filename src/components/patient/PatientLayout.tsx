import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PatientSidebar } from './PatientSidebar';
import { MobilePatientSidebar } from './MobilePatientSidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Loader2 } from 'lucide-react';

interface PatientLayoutProps {
  children: ReactNode;
}

export function PatientLayout({ children }: PatientLayoutProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/patient/auth" replace />;
  }

  if (role !== 'patient') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <PatientSidebar />
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <MobilePatientSidebar />
          <ThemeToggle />
        </header>
        
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
