import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import { BottomNavigation } from './BottomNavigation';
import { MobileMenuSheet } from './MobileMenuSheet';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificacoesProvider } from '@/contexts/NotificacoesContext';
import { NotificationToast } from '@/components/notificacoes';
import { ChatViewProvider, useChatView } from '@/contexts/ChatViewContext';

export type { UserType };

const SIDEBAR_WIDTH = 256;
const COLLAPSED_WIDTH = 64;

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

interface PortalLayoutWrapperProps {
  expectedUserType: 'embarcador' | 'transportadora';
}

function PortalLayoutContent({ expectedUserType }: PortalLayoutWrapperProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userType, loading: contextLoading } = useUserContext();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('hubfrete_sidebar_collapsed');
    return saved === 'true';
  });

  const { isInChatView } = useChatView();

  const isLoading = authLoading || contextLoading;

  useEffect(() => {
    localStorage.setItem('hubfrete_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

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
    <div className="h-dvh bg-background flex overflow-hidden">
      {/* Global notification toast */}
      <NotificationToast />
      
      {/* Desktop: Show sidebar */}
      {!isMobile && (
        <PortalSidebar 
          userType={expectedUserType} 
          collapsed={collapsed} 
          onToggleCollapse={() => setCollapsed(!collapsed)}
          width={collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH}
        />
      )}
      
      {/* Main content */}
      <main 
        className={`flex-1 min-w-0 h-full overflow-hidden transition-all duration-300 ${
          isMobile 
            ? isInChatView ? '' : 'pb-20'
            : ''
        }`}
      >
        <Outlet />
      </main>

      {/* Mobile: Show bottom navigation - hidden when in chat view */}
      {isMobile && (
        <>
          <BottomNavigation 
            userType={expectedUserType} 
            onMenuClick={() => setMobileMenuOpen(true)}
            hidden={isInChatView}
          />
          <MobileMenuSheet
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            userType={expectedUserType}
          />
        </>
      )}
    </div>
  );
}

export function PortalLayoutWrapper({ expectedUserType }: PortalLayoutWrapperProps) {
  return (
    <NotificacoesProvider>
      <ChatViewProvider>
        <PortalLayoutContent expectedUserType={expectedUserType} />
      </ChatViewProvider>
    </NotificacoesProvider>
  );
}
