import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { isAuthenticated } from '@/lib/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
