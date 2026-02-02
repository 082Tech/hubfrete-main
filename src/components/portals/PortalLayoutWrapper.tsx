import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
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

const MIN_SIDEBAR_WIDTH = 64;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 256;
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
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('hubfrete_sidebar_width');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const { isInChatView } = useChatView();

  const isLoading = authLoading || contextLoading;

  useEffect(() => {
    localStorage.setItem('hubfrete_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed) {
      localStorage.setItem('hubfrete_sidebar_width', String(sidebarWidth));
    }
  }, [sidebarWidth, collapsed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
        // Auto-collapse if dragged too small
        if (newWidth <= COLLAPSED_WIDTH + 20) {
          setCollapsed(true);
        } else if (collapsed && newWidth > COLLAPSED_WIDTH + 20) {
          setCollapsed(false);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, collapsed]);

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
      {/* Global notification toast */}
      <NotificationToast />
      
      {/* Desktop: Show sidebar with resize handle */}
      {!isMobile && (
        <div className="relative">
          <PortalSidebar 
            userType={expectedUserType} 
            collapsed={collapsed} 
            onToggleCollapse={() => setCollapsed(!collapsed)}
            width={collapsed ? COLLAPSED_WIDTH : sidebarWidth}
          />
          {/* Resize handle */}
          {!collapsed && (
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              className={`fixed top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors hover:bg-primary/50 ${
                isResizing ? 'bg-primary/50' : 'bg-transparent'
              }`}
              style={{ left: sidebarWidth - 2 }}
            />
          )}
        </div>
      )}
      
      {/* Main content */}
      <main 
        className={`transition-all duration-300 ${
          isMobile 
            ? isInChatView ? '' : 'pb-20'
            : ''
        }`}
        style={!isMobile ? { marginLeft: collapsed ? COLLAPSED_WIDTH : sidebarWidth } : undefined}
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
