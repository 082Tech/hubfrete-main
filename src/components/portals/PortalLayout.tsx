import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type UserType = 'embarcador' | 'transportadora' | 'motorista';

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
  expectedUserType: UserType;
}

export function PortalLayout({ children, expectedUserType }: PortalLayoutProps) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [checkingType, setCheckingType] = useState(false);

  const isBusy = useMemo(() => loading || checkingType, [loading, checkingType]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    let cancelled = false;

    const loadUserType = async () => {
      setCheckingType(true);
      try {
        // Determine user type by membership tables
        const [{ data: embarcador }, { data: transportadora }, { data: motorista }] = await Promise.all([
          supabase.from('embarcadores').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('transportadoras').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('motoristas').select('id').eq('user_id', user.id).maybeSingle(),
        ]);

        const found: UserType | null = embarcador
          ? 'embarcador'
          : transportadora
            ? 'transportadora'
            : motorista
              ? 'motorista'
              : null;

        if (!cancelled) setUserType(found);
      } finally {
        if (!cancelled) setCheckingType(false);
      }
    };

    loadUserType();

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isBusy) return;
    if (!user || !userType) return;

    if (userType !== expectedUserType) {
      navigate(getRedirectByUserType(userType));
    }
  }, [isBusy, user, userType, expectedUserType, navigate]);

  if (isBusy) {
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

