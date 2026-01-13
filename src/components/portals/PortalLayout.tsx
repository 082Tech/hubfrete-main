import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';

export type { UserType };

function getRedirectByUserType(tipo: UserType): string {
  switch (tipo) {
    case 'embarcador':
      return '/embarcador';
    case 'transportadora':
      return '/transportadora';
    case 'motorista':
      return '/motorista';
    default:
      return '/login';
  }
}

interface PortalLayoutProps {
  children: ReactNode;
  expectedUserType: 'embarcador' | 'transportadora' | 'motorista';
}

export function PortalLayout({ children, expectedUserType }: PortalLayoutProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userType, loading: contextLoading } = useUserContext();

  const isLoading = authLoading || contextLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (userType && userType !== expectedUserType) {
      navigate(getRedirectByUserType(userType));
    }
  }, [user, userType, isLoading, expectedUserType, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !userType || userType !== expectedUserType) return null;

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar userType={expectedUserType} />
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
