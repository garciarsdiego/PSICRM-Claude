import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: 'professional' | 'patient';
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to appropriate auth page
        if (allowedRole === 'patient') {
          navigate('/patient/auth');
        } else {
          navigate('/auth');
        }
        return;
      }

      // Check role if specified
      if (allowedRole && role && role !== allowedRole) {
        // Redirect to correct portal
        if (role === 'patient') {
          navigate('/patient/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    }
  }, [user, loading, role, allowedRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If role check is required but role hasn't loaded yet, show loading
  if (allowedRole && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // If role doesn't match, return null (redirect will happen in useEffect)
  if (allowedRole && role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
