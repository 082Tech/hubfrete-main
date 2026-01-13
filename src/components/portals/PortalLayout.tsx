import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import { isAuthenticated } from '@/lib/api';
import { getUserSession, UserType, getRedirectByUserType } from '@/lib/userSession';
import { AIAssistantButton } from '@/components/ai-assistant';

interface PortalLayoutProps {
  children: ReactNode;
  expectedUserType: UserType;
}

export function PortalLayout({ children, expectedUserType }: PortalLayoutProps) {
  const navigate = useNavigate();
  const session = getUserSession();
  
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    // Redirect if user type doesn't match
    if (session && session.tipo !== expectedUserType) {
      navigate(getRedirectByUserType(session.tipo));
    }
  }, [navigate, session, expectedUserType]);

  if (!isAuthenticated() || !session || session.tipo !== expectedUserType) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar userType={expectedUserType} />
      <main className="ml-64 p-8">
        {children}
      </main>
      <AIAssistantButton />
    </div>
  );
}
