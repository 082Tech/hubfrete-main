import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  LogOut,
  Truck,
  Building2,
  User,
  MapPin,
  Calendar,
  BarChart3,
  Bell,
  ChevronDown,
  Check,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

type SidebarUserType = 'embarcador' | 'transportadora' | 'motorista';

const menusByType: Record<SidebarUserType, MenuItem[]> = {
  embarcador: [
    { icon: Home, label: 'Home', href: '/embarcador' },
    { icon: Package, label: 'Cargas Publicadas', href: '/embarcador/cargas-publicadas' },
    { icon: Truck, label: 'Cargas em Rota', href: '/embarcador/cargas' },
    { icon: Building2, label: 'Destinatários', href: '/embarcador/destinatarios' },
    { icon: BarChart3, label: 'Relatórios', href: '/embarcador/relatorios' },
    { icon: MessageCircle, label: 'Assistente', href: '/embarcador/assistente' },
    { icon: MapPin, label: 'Gerenciar Filiais', href: '/embarcador/filiais', adminOnly: true },
    { icon: User, label: 'Usuários da Empresa', href: '/embarcador/usuarios', adminOnly: true },
    { icon: Settings, label: 'Configurações', href: '/embarcador/configuracoes' },
  ],
  transportadora: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/transportadora' },
    { icon: Truck, label: 'Minha Frota', href: '/transportadora/frota' },
    { icon: User, label: 'Motoristas', href: '/transportadora/motoristas' },
    { icon: Package, label: 'Cargas Disponíveis', href: '/transportadora/cargas' },
    { icon: MapPin, label: 'Rastreamento', href: '/transportadora/rastreamento' },
    { icon: BarChart3, label: 'Relatórios', href: '/transportadora/relatorios' },
    { icon: Settings, label: 'Configurações', href: '/transportadora/configuracoes' },
  ],
  motorista: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/motorista' },
    { icon: Package, label: 'Cargas Disponíveis', href: '/motorista/cargas' },
    { icon: Truck, label: 'Minhas Viagens', href: '/motorista/viagens' },
    { icon: Calendar, label: 'Agenda', href: '/motorista/agenda' },
    { icon: Bell, label: 'Notificações', href: '/motorista/notificacoes' },
    { icon: Settings, label: 'Configurações', href: '/motorista/configuracoes' },
  ],
};

const portalConfig: Record<SidebarUserType, { title: string; icon: React.ElementType; badgeVariant: 'default' | 'secondary' | 'outline' }> = {
  embarcador: { title: 'Embarcador', icon: Building2, badgeVariant: 'default' },
  transportadora: { title: 'Transportadora', icon: Truck, badgeVariant: 'secondary' },
  motorista: { title: 'Motorista Autônomo', icon: User, badgeVariant: 'outline' },
};

interface PortalSidebarProps {
  userType: SidebarUserType;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PortalSidebar({ userType, collapsed = false, onToggleCollapse }: PortalSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { empresa, companyInfo, filiais, filialAtiva, setFilialAtiva, cargo, switchingFilial } = useUserContext();
  
  const allMenuItems = menusByType[userType];
  const menuItems = allMenuItems.filter(item => !item.adminOnly || cargo === 'ADMIN');
  const config = portalConfig[userType];
  const PortalIcon = config.icon;

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('hubfrete_filial_ativa');
    navigate('/');
  };

  const companyName = companyInfo?.nome_fantasia || companyInfo?.razao_social || config.title;

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 flex flex-col transition-all duration-300`}>
        {/* Logo & Collapse Button */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-sidebar-primary rounded-lg shrink-0">
              <Truck className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold text-sidebar-foreground">
                Hub<span className="text-sidebar-primary">Frete</span>
              </span>
            )}
          </Link>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onToggleCollapse}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Company & Branch Section - Hidden when collapsed */}
        {!collapsed && (
          <div className="px-4 py-4 border-b border-sidebar-border bg-sidebar-accent/10">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-sidebar-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant={config.badgeVariant} className="text-[10px] py-0 px-1.5 h-5 mb-1">
                  <PortalIcon className="w-2.5 h-2.5 mr-1" />
                  {config.title}
                </Badge>
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {empresa?.nome || companyName}
                </p>
                {empresa?.cnpj_matriz && (
                  <p className="text-[10px] text-sidebar-foreground/60">
                    CNPJ: {empresa.cnpj_matriz}
                  </p>
                )}
              </div>
            </div>
            
            {filiais.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                  Filial Ativa
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-between h-9 px-3 text-xs bg-sidebar border-sidebar-border hover:bg-sidebar-accent"
                      disabled={switchingFilial}
                    >
                      <span className="flex items-center gap-2 text-sidebar-foreground">
                        {switchingFilial ? (
                          <Loader2 className="w-3.5 h-3.5 text-sidebar-primary animate-spin" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-sidebar-primary" />
                        )}
                        <span className="font-medium truncate">
                          {switchingFilial ? 'Carregando...' : (filialAtiva?.nome || 'Selecionar filial')}
                        </span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/60 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Selecionar Filial
                      </p>
                    </div>
                    {filiais.map((filial) => (
                      <DropdownMenuItem 
                        key={filial.id}
                        onClick={() => setFilialAtiva(filial)}
                        className={`flex items-center gap-2 py-2.5 cursor-pointer ${
                          filialAtiva?.id === filial.id ? 'bg-accent' : ''
                        }`}
                      >
                        <MapPin className={`w-3.5 h-3.5 ${filialAtiva?.id === filial.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${filialAtiva?.id === filial.id ? 'text-primary' : ''}`}>
                            {filial.nome || 'Filial'}
                          </p>
                          {filial.cnpj && (
                            <p className="text-[10px] text-muted-foreground">{filial.cnpj}</p>
                          )}
                        </div>
                        {filialAtiva?.id === filial.id && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    {cargo === 'ADMIN' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 text-muted-foreground text-xs"
                          onClick={() => navigate(`/${userType}/filiais`)}
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Gerenciar filiais
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}
        
        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const linkContent = (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
        
        {/* User */}
        <div className={`p-4 border-t border-sidebar-border ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-sidebar-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sidebar-primary font-semibold">
                    {(profile?.nome_completo || profile?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile?.nome_completo || 'Usuário'}
                    </p>
                    {cargo && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 shrink-0">
                        {cargo}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-sidebar-foreground/60 truncate" title={profile?.email || ''}>
                    {profile?.email || ''}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Sair
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
