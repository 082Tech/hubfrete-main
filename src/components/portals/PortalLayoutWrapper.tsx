import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import { BottomNavigation } from './BottomNavigation';
import { MobileMenuSheet } from './MobileMenuSheet';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificacoesProvider } from '@/contexts/NotificacoesContext';
import { NotificationToast } from '@/components/notificacoes';
import { ChatViewProvider, useChatView } from '@/contexts/ChatViewContext';
import { Clock, ShieldCheck } from 'lucide-react';

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

function EmAnaliseOverlay() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto p-4 bg-amber-100 rounded-full w-fit mb-6">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Conta em Análise</h2>
        <p className="text-muted-foreground mb-4">
          Sua empresa está sendo analisada pela nossa equipe. Você será notificado 
          assim que a aprovação for concluída.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Tempo médio de aprovação: até 24 horas úteis
        </div>
      </div>
    </div>
  );
}

function PortalLayoutContent({ expectedUserType }: PortalLayoutWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { userType, empresa, loading: contextLoading } = useUserContext();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('hubfrete_sidebar_collapsed');
    return saved === 'true';
  });

  const { isInChatView } = useChatView();

  const isLoading = authLoading || contextLoading;

  // Check if empresa is in analysis mode
  const isEmAnalise = empresa?.status === 'em_analise';
  const basePath = `/${expectedUserType}`;
  const isOnHomePage = location.pathname === basePath || location.pathname === `${basePath}/`;

  // Block navigation to non-home pages when em_analise
  useEffect(() => {
    if (!isLoading && isEmAnalise && !isOnHomePage) {
      navigate(basePath, { replace: true });
    }
  }, [isLoading, isEmAnalise, isOnHomePage, basePath, navigate]);

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
        {isEmAnalise && !isOnHomePage ? (
          <EmAnaliseOverlay />
        ) : isEmAnalise && isOnHomePage ? (
          <div className="h-full flex flex-col">
            {/* Banner at top of home */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Conta em análise</strong> — Seu acesso está limitado até a aprovação da sua empresa.
              </p>
            </div>
            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
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
