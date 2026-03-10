import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FileText, Settings, LogOut, Truck, Building2,
  User, Users, MapPin, Calendar, BarChart3, Bell, ChevronDown, Check,
  Sparkles, Loader2, ChevronLeft, ChevronRight, Home, History, Send,
  Route, Pin, Building, MessageSquare, MoreVertical, ArrowRightLeft,
  Link2, Container, Boxes, DollarSign, Plug,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';
import { useTheme } from 'next-themes';
import { useNotificacoesContext } from '@/contexts/NotificacoesContext';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

interface SubMenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface MenuGroup {
  icon: React.ElementType;
  label: string;
  subItems: SubMenuItem[];
}

type SidebarUserType = 'embarcador' | 'transportadora' | 'motorista';

// Submenu for Cargas (embarcador only)
const cargasSubmenu: MenuGroup = {
  icon: Package,
  label: 'Cargas',
  subItems: [
    { icon: MapPin, label: 'Em andamento', href: '/embarcador/cargas' },
    { icon: History, label: 'Histórico', href: '/embarcador/cargas/historico' },
  ],
};

// Cargas submenu for transportadora (was entregas)
const transportadoraCargasSubmenu: MenuGroup = {
  icon: Package,
  label: 'Minhas Cargas',
  subItems: [
    { icon: MapPin, label: 'Em andamento', href: '/transportadora/cargas' },
    { icon: History, label: 'Histórico', href: '/transportadora/cargas/historico' },
  ],
};

// Frota submenu for transportadora
const frotaSubmenu: MenuGroup = {
  icon: Truck,
  label: 'Minha Frota',
  subItems: [
    { icon: Truck, label: 'Veículos', href: '/transportadora/frota' },
    { icon: Container, label: 'Carrocerias', href: '/transportadora/frota/carrocerias' },
    { icon: Link2, label: 'Vínculos', href: '/transportadora/frota/vinculos' },
  ],
};

// "Minha Empresa" submenu for embarcador
const embarcadorEmpresaSubmenu: MenuGroup = {
  icon: Building2,
  label: 'Minha Empresa',
  subItems: [
    { icon: Building2, label: 'Dados da Empresa', href: '/embarcador/dados-empresa' },
    { icon: Users, label: 'Contatos', href: '/embarcador/contatos' },
    { icon: Plug, label: 'Integrações', href: '/embarcador/integracoes' },
    { icon: Building, label: 'Gerenciar Filiais', href: '/embarcador/filiais', adminOnly: true } as SubMenuItem & { adminOnly?: boolean },
    { icon: Users, label: 'Usuários', href: '/embarcador/usuarios', adminOnly: true } as SubMenuItem & { adminOnly?: boolean },
  ],
};

// "Minha Empresa" submenu for transportadora
const transportadoraEmpresaSubmenu: MenuGroup = {
  icon: Building2,
  label: 'Minha Empresa',
  subItems: [
    { icon: Building2, label: 'Dados da Empresa', href: '/transportadora/dados-empresa' },
    { icon: Plug, label: 'Integrações', href: '/transportadora/integracoes' },
    { icon: Building, label: 'Gerenciar Filiais', href: '/transportadora/filiais', adminOnly: true } as SubMenuItem & { adminOnly?: boolean },
    { icon: Users, label: 'Usuários', href: '/transportadora/usuarios', adminOnly: true } as SubMenuItem & { adminOnly?: boolean },
  ],
};

const menusByType: Record<SidebarUserType, MenuItem[]> = {
  embarcador: [
    { icon: Home, label: 'Home', href: '/embarcador' },
    { icon: Boxes, label: 'Minhas Ofertas', href: '/embarcador/ofertas' },
    // Cargas is a submenu
    { icon: DollarSign, label: 'Financeiro', href: '/embarcador/financeiro' },
    { icon: BarChart3, label: 'Relatórios', href: '/embarcador/relatorios' },
    { icon: MessageSquare, label: 'Mensagens', href: '/embarcador/mensagens' },
    { icon: Sparkles, label: 'Assistente', href: '/embarcador/assistente' },
    // Minha Empresa is a submenu
    { icon: Settings, label: 'Configurações', href: '/embarcador/configuracoes' },
  ],
  transportadora: [
    { icon: Home, label: 'Home', href: '/transportadora' },
    { icon: Boxes, label: 'Ofertas de Carga', href: '/transportadora/ofertas' },
    // Cargas + Frota are submenus
    { icon: User, label: 'Motoristas', href: '/transportadora/motoristas' },
    { icon: DollarSign, label: 'Financeiro', href: '/transportadora/financeiro' },
    { icon: BarChart3, label: 'Relatórios', href: '/transportadora/relatorios' },
    { icon: MessageSquare, label: 'Mensagens', href: '/transportadora/mensagens' },
    { icon: Sparkles, label: 'Assistente', href: '/transportadora/assistente' },
    // Minha Empresa is a submenu
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
  width?: number;
}

export function PortalSidebar({ userType, collapsed = false, onToggleCollapse, width }: PortalSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { empresa, companyInfo, filiais, filialAtiva, setFilialAtiva, cargo, switchingFilial, availableEmpresas, switchEmpresa } = useUserContext();
  const darkMode = useTheme().theme === 'dark';
  const allMenuItems = menusByType[userType];
  const menuItems = allMenuItems;
  const config = portalConfig[userType];
  const PortalIcon = config.icon;

  // Check if any submenu item is active
  const isCargasSubmenuActive = cargasSubmenu.subItems.some(
    (sub) => location.pathname === sub.href
  );
  const [cargasOpen, setCargasOpen] = useState(isCargasSubmenuActive);

  const isTranspCargasSubmenuActive = transportadoraCargasSubmenu.subItems.some(
    (sub) => location.pathname === sub.href
  );
  const [transpCargasOpen, setTranspCargasOpen] = useState(isTranspCargasSubmenuActive);

  const isFrotaSubmenuActive = frotaSubmenu.subItems.some(
    (sub) => location.pathname === sub.href
  );
  const [frotaOpen, setFrotaOpen] = useState(isFrotaSubmenuActive);

  const empresaSubmenu = userType === 'embarcador' ? embarcadorEmpresaSubmenu : transportadoraEmpresaSubmenu;
  const empresaSubItems = cargo === 'ADMIN' ? empresaSubmenu.subItems : empresaSubmenu.subItems.filter(s => !(s as any).adminOnly);
  const isEmpresaSubmenuActive = empresaSubItems.some(
    (sub) => location.pathname === sub.href
  );
  const [empresaOpen, setEmpresaOpen] = useState(isEmpresaSubmenuActive);

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('hubfrete_filial_ativa');
    navigate('/');
  };

  const companyName = companyInfo?.nome_fantasia || companyInfo?.razao_social || config.title;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`bg-sidebar border-r border-sidebar-border h-full shrink-0 flex flex-col transition-all duration-300`}
        style={{ width: collapsed ? 64 : (width || 256) }}
      >
        {/* Logo & Collapse Button */}
        <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between'}`}>
          <Link to={`/${userType}`} className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
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
              {availableEmpresas.length > 1 ? (
                <div className="flex items-start gap-3 w-full">
                  {empresa?.logo_url ? (
                    <img
                      src={empresa.logo_url}
                      alt={empresa.nome || 'Logo'}
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-sidebar-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-sidebar-primary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <Badge variant={config.badgeVariant} className="text-[10px] py-0 px-1.5 h-5 mb-1">
                      <PortalIcon className="w-2.5 h-2.5 mr-1" />
                      {config.title}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                        {empresa?.nome || companyName}
                      </p>
                    </div>
                    {empresa?.cnpj_matriz && (
                      <p className="text-[10px] text-sidebar-foreground/60">
                        CNPJ: {empresa.cnpj_matriz}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground border hover:bg-sidebar-accent"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        Trocar Empresa
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Trocar Empresa
                        </p>
                      </div>
                      {availableEmpresas.map((emp) => {
                        const isSelected = empresa?.id === emp.id;

                        return (
                          <DropdownMenuItem
                            key={emp.id}
                            onClick={() => switchEmpresa(emp)}
                            className={`flex items-center gap-2 py-2.5 cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                          >
                            {emp.logo_url ? (
                              <img src={emp.logo_url} alt="" className="w-6 h-6 rounded object-contain bg-white border border-border" />
                            ) : (
                              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Building2 className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                                {emp.nome}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {emp.tipo === 'EMBARCADOR' ? 'Embarcador' : 'Transportadora'}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <>
                  {empresa?.logo_url ? (
                    <img
                      src={empresa.logo_url}
                      alt={empresa.nome || 'Logo'}
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-sidebar-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-sidebar-primary" />
                    </div>
                  )}
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
                </>
              )}
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
                    {filiais.map((filial) => {
                      const isSelected = filialAtiva?.id === filial.id;
                      const isDisabled = !filial.hasAccess;

                      return (
                        <DropdownMenuItem
                          key={filial.id}
                          onClick={() => !isDisabled && setFilialAtiva(filial)}
                          disabled={isDisabled}
                          className={`flex items-center gap-2 py-2.5 ${isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                            } ${isSelected ? 'bg-accent' : ''}`}
                        >
                          <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                              {filial.nome || 'Filial'}
                              {isDisabled && <span className="text-xs text-muted-foreground ml-1">(Sem acesso)</span>}
                            </p>
                            {filial.cnpj && (
                              <p className="text-[10px] text-muted-foreground">{filial.cnpj}</p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
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
          {/* Home link - first item for embarcador */}
          {userType === 'embarcador' && (
            (() => {
              const homeItem = menuItems.find(item => item.href === '/embarcador');
              if (!homeItem) return null;
              const isActive = location.pathname === homeItem.href;
              const linkContent = (
                <Link
                  to={homeItem.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''
                    } ${isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                    }`}
                >
                  <homeItem.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="font-medium">{homeItem.label}</span>}
                </Link>
              );
              if (collapsed) {
                return (
                  <Tooltip key={homeItem.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>{homeItem.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return linkContent;
            })()
          )}

          {/* Ofertas de Carga - only for embarcador */}
          {userType === 'embarcador' && (
            (() => {
              const ofertasItem = menuItems.find(item => item.href === '/embarcador/ofertas');
              if (!ofertasItem) return null;
              const isActive = location.pathname === ofertasItem.href;
              const linkContent = (
                <Link
                  to={ofertasItem.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''
                    } ${isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                    }`}
                >
                  <ofertasItem.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="font-medium">{ofertasItem.label}</span>}
                </Link>
              );
              if (collapsed) {
                return (
                  <Tooltip key={ofertasItem.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>{ofertasItem.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return linkContent;
            })()
          )}

          {/* Cargas Submenu - only for embarcador */}
          {userType === 'embarcador' && (
            collapsed ? (
              // Collapsed: show dropdown on hover/click
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`flex items-center justify-center w-full px-3 py-2 rounded-lg transition-colors ${isCargasSubmenuActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                          }`}
                      >
                        <Package className="w-5 h-5 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>Minhas Cargas</TooltipContent>
                </Tooltip>
                <DropdownMenuContent side="right" align="start" className="w-48">
                  {cargasSubmenu.subItems.map((sub) => (
                    <DropdownMenuItem
                      key={sub.href}
                      onClick={() => navigate(sub.href)}
                      className={location.pathname === sub.href ? 'bg-accent' : ''}
                    >
                      <sub.icon className="w-4 h-4 mr-2" />
                      {sub.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Expanded: show collapsible submenu
              <Collapsible open={cargasOpen} onOpenChange={setCargasOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${isCargasSubmenuActive
                      ? 'bg-sidebar-primary/10 text-sidebar-primary'
                      : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                      }`}
                  >
                    <Package className="w-5 h-5 shrink-0" />
                    <span className="font-medium flex-1 text-left">Cargas</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${cargasOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {cargasSubmenu.subItems.map((sub) => {
                    const isSubActive = location.pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSubActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                          }`}
                      >
                        <sub.icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{sub.label}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          )}

          {/* Regular menu items - with custom ordering for transportadora */}
          {userType === 'transportadora' ? (
            // Transportadora: Home -> Cargas Disponíveis -> Gestão de Entregas -> Histórico -> Rest
            <>
              {/* Home */}
              {(() => {
                const homeItem = menuItems.find(item => item.href === '/transportadora');
                if (!homeItem) return null;
                const isActive = location.pathname === homeItem.href;
                const linkContent = (
                  <Link
                    to={homeItem.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''
                      } ${isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                      }`}
                  >
                    <homeItem.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium">{homeItem.label}</span>}
                  </Link>
                );
                if (collapsed) {
                  return (
                    <Tooltip key={homeItem.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>{homeItem.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return linkContent;
              })()}

              {/* Ofertas de Carga */}
              {(() => {
                const ofertasItem = menuItems.find(item => item.href === '/transportadora/ofertas');
                if (!ofertasItem) return null;
                const isActive = location.pathname === ofertasItem.href;
                const linkContent = (
                  <Link
                    to={ofertasItem.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''
                      } ${isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                      }`}
                  >
                    <ofertasItem.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium">{ofertasItem.label}</span>}
                  </Link>
                );
                if (collapsed) {
                  return (
                    <Tooltip key={ofertasItem.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>{ofertasItem.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return linkContent;
              })()}

              {/* Cargas Submenu (Gestão Diária + Histórico) */}
              {collapsed ? (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`flex items-center justify-center w-full px-3 py-2 rounded-lg transition-colors ${isTranspCargasSubmenuActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                            }`}
                        >
                          <Package className="w-5 h-5 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>Minhas Cargas</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start" className="w-48">
                    {transportadoraCargasSubmenu.subItems.map((sub) => (
                      <DropdownMenuItem
                        key={sub.href}
                        onClick={() => navigate(sub.href)}
                        className={location.pathname === sub.href ? 'bg-accent' : ''}
                      >
                        <sub.icon className="w-4 h-4 mr-2" />
                        {sub.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Collapsible open={transpCargasOpen} onOpenChange={setTranspCargasOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${isTranspCargasSubmenuActive
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                        }`}
                    >
                      <Package className="w-5 h-5 shrink-0" />
                      <span className="font-medium flex-1 text-left">Minhas Cargas</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${transpCargasOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-1">
                    {transportadoraCargasSubmenu.subItems.map((sub) => {
                      const isSubActive = location.pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSubActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                            }`}
                        >
                          <sub.icon className="w-4 h-4 shrink-0" />
                          <span className="text-sm">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Frota Submenu */}
              {collapsed ? (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`flex items-center justify-center w-full px-3 py-2 rounded-lg transition-colors ${isFrotaSubmenuActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                            }`}
                        >
                          <Truck className="w-5 h-5 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>Minha Frota</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start" className="w-48">
                    {frotaSubmenu.subItems.map((sub) => (
                      <DropdownMenuItem
                        key={sub.href}
                        onClick={() => navigate(sub.href)}
                        className={location.pathname === sub.href ? 'bg-accent' : ''}
                      >
                        <sub.icon className="w-4 h-4 mr-2" />
                        {sub.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Collapsible open={frotaOpen} onOpenChange={setFrotaOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${isFrotaSubmenuActive
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                        }`}
                    >
                      <Truck className="w-5 h-5 shrink-0" />
                      <span className="font-medium flex-1 text-left">Minha Frota</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${frotaOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-1">
                    {frotaSubmenu.subItems.map((sub) => {
                      const isSubActive = location.pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSubActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                            }`}
                        >
                          <sub.icon className="w-4 h-4 shrink-0" />
                          <span className="text-sm">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Rest of transportadora menu items (excluding empresa submenu items and configurações) */}
              {menuItems
                .filter(item =>
                  item.href !== '/transportadora' &&
                  item.href !== '/transportadora/ofertas' &&
                  item.href !== '/transportadora/configuracoes'
                )
                .map((item) => {
                  const isActive = location.pathname === item.href;
                  const linkContent = (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''
                        } ${isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
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

              {/* Minha Empresa Submenu */}
              {empresaSubItems.length > 0 && (
                collapsed ? (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`flex items-center justify-center w-full px-3 py-2 rounded-lg transition-colors ${isEmpresaSubmenuActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                              }`}
                          >
                            <Building2 className="w-5 h-5 shrink-0" />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>Minha Empresa</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      {empresaSubItems.map((sub) => (
                        <DropdownMenuItem
                          key={sub.href}
                          onClick={() => navigate(sub.href)}
                          className={location.pathname === sub.href ? 'bg-accent' : ''}
                        >
                          <sub.icon className="w-4 h-4 mr-2" />
                          {sub.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Collapsible open={empresaOpen} onOpenChange={setEmpresaOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${isEmpresaSubmenuActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary'
                          : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                          }`}
                      >
                        <Building2 className="w-5 h-5 shrink-0" />
                        <span className="font-medium flex-1 text-left">Minha Empresa</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${empresaOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      {empresaSubItems.map((sub) => {
                        const isSubActive = location.pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSubActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                              }`}
                          >
                            <sub.icon className="w-4 h-4 shrink-0" />
                            <span className="text-sm">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )
              )}
            </>
          ) : (
            // Embarcador + other user types
            <>
              {menuItems
                .filter(item => (userType !== 'embarcador' || (item.href !== '/embarcador' && item.href !== '/embarcador/ofertas')))
                .map((item) => {
                  const isActive = location.pathname === item.href;
                  const linkContent = (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''
                        } ${isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
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

              {/* Minha Empresa Submenu - for embarcador */}
              {userType === 'embarcador' && empresaSubItems.length > 0 && (
                collapsed ? (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`flex items-center justify-center w-full px-3 py-2 rounded-lg transition-colors ${isEmpresaSubmenuActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                              }`}
                          >
                            <Building2 className="w-5 h-5 shrink-0" />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>Minha Empresa</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      {empresaSubItems.map((sub) => (
                        <DropdownMenuItem
                          key={sub.href}
                          onClick={() => navigate(sub.href)}
                          className={location.pathname === sub.href ? 'bg-accent' : ''}
                        >
                          <sub.icon className="w-4 h-4 mr-2" />
                          {sub.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Collapsible open={empresaOpen} onOpenChange={setEmpresaOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${isEmpresaSubmenuActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary'
                          : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                          }`}
                      >
                        <Building2 className="w-5 h-5 shrink-0" />
                        <span className="font-medium flex-1 text-left">Minha Empresa</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${empresaOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      {empresaSubItems.map((sub) => {
                        const isSubActive = location.pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSubActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : `text-sidebar-foreground hover:bg-sidebar-accent ${darkMode ? 'hover:text-primary-foreground' : 'hover:text-primary'}`
                              }`}
                          >
                            <sub.icon className="w-4 h-4 shrink-0" />
                            <span className="text-sm">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )
              )}
            </>
          )}
        </nav>

        {/* User Footer with 3 dots menu */}
        <UserFooter
          collapsed={collapsed}
          profile={profile}
          cargo={cargo}
          userType={userType}
          onLogout={handleLogout}
        />
      </aside>
    </TooltipProvider>
  );
}

interface UserFooterProps {
  collapsed: boolean;
  profile: any;
  cargo: string | null;
  userType: SidebarUserType;
  onLogout: () => void;
}

function UserFooter({ collapsed, profile, cargo, userType, onLogout }: UserFooterProps) {
  const navigate = useNavigate();
  const { unreadCount } = useNotificacoesContext();

  const handleNotificacoesClick = () => {
    navigate(`/${userType}/notificacoes`);
  };

  if (collapsed) {
    return (
      <div className="p-2 border-t border-sidebar-border flex flex-col items-center gap-2">
        {/* Avatar as dropdown trigger with notification badge */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="relative cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.nome_completo || 'Logo'}
                      className="w-8 h-8 rounded-full object-contain bg-white border border-sidebar-border shrink-0 hover:ring-2 hover:ring-sidebar-primary/40 transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sidebar-primary/10 flex items-center justify-center shrink-0 hover:ring-2 hover:ring-sidebar-primary/40 transition-all">
                      <span className="text-sidebar-primary font-semibold text-sm">
                        {(profile?.nome_completo || profile?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 px-1 py-0 text-[10px] min-w-[16px] h-4 pointer-events-none"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {profile?.nome_completo || 'Usuário'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuItem onClick={handleNotificacoesClick} className="gap-2">
              <Bell className="w-4 h-4" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-[10px] h-5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-sidebar-border">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.nome_completo || 'Logo'}
            className="w-10 h-10 rounded-full object-contain bg-white border border-sidebar-border shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-sidebar-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary font-semibold">
              {(profile?.nome_completo || profile?.email || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* User info */}
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

        {/* 3 dots menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent relative shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 px-1 py-0 text-[10px] min-w-[16px] h-4"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleNotificacoesClick} className="gap-2">
              <Bell className="w-4 h-4" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-[10px] h-5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
