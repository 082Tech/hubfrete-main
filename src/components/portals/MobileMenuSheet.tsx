import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Package,
  Truck,
  Users,
  Route,
  History,
  BarChart3,
  MessageSquare,
  Bell,
  Sparkles,
  Building,
  Settings,
  LogOut,
  Building2,
  MapPin,
  User,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Link2,
  Container,
  Send,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const embarcadorMenuItems: MenuItem[] = [
  { icon: Home, label: 'Home', href: '/embarcador' },
  { icon: Send, label: 'Minhas Ofertas', href: '/embarcador/ofertas' },
  { icon: Package, label: 'Em andamento', href: '/embarcador/cargas' },
  { icon: History, label: 'Histórico de Cargas', href: '/embarcador/cargas/historico' },
  { icon: BarChart3, label: 'Relatórios', href: '/embarcador/relatorios' },
  { icon: MessageSquare, label: 'Mensagens', href: '/embarcador/mensagens' },
  { icon: Bell, label: 'Notificações', href: '/embarcador/notificacoes' },
  { icon: Sparkles, label: 'Assistente IA', href: '/embarcador/assistente' },
  { icon: Building, label: 'Gerenciar Filiais', href: '/embarcador/filiais', adminOnly: true },
  { icon: Users, label: 'Usuários da Empresa', href: '/embarcador/usuarios', adminOnly: true },
  { icon: Settings, label: 'Configurações', href: '/embarcador/configuracoes' },
];

const transportadoraMenuItems: MenuItem[] = [
  { icon: Home, label: 'Home', href: '/transportadora' },
  { icon: DollarSign, label: 'Ofertas de Carga', href: '/transportadora/ofertas' },
  { icon: Package, label: 'Em andamento', href: '/transportadora/cargas' },
  { icon: History, label: 'Histórico de Cargas', href: '/transportadora/cargas/historico' },
  { icon: Truck, label: 'Veículos', href: '/transportadora/frota' },
  { icon: Container, label: 'Carrocerias', href: '/transportadora/frota/carrocerias' },
  { icon: Link2, label: 'Vínculos', href: '/transportadora/frota/vinculos' },
  { icon: User, label: 'Motoristas', href: '/transportadora/motoristas' },
  { icon: BarChart3, label: 'Relatórios', href: '/transportadora/relatorios' },
  { icon: MessageSquare, label: 'Mensagens', href: '/transportadora/mensagens' },
  { icon: Bell, label: 'Notificações', href: '/transportadora/notificacoes' },
  { icon: Sparkles, label: 'Assistente IA', href: '/transportadora/assistente' },
  { icon: Building, label: 'Gerenciar Filiais', href: '/transportadora/filiais', adminOnly: true },
  { icon: Users, label: 'Usuários da Empresa', href: '/transportadora/usuarios', adminOnly: true },
  { icon: Settings, label: 'Configurações', href: '/transportadora/configuracoes' },
];

const portalConfig = {
  embarcador: { title: 'Embarcador', icon: Building2 },
  transportadora: { title: 'Transportadora', icon: Truck },
};

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'embarcador' | 'transportadora';
}

export function MobileMenuSheet({ open, onOpenChange, userType }: MobileMenuSheetProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { empresa, filiais, filialAtiva, setFilialAtiva, cargo, switchingFilial } = useUserContext();
  
  const menuItems = userType === 'embarcador' ? embarcadorMenuItems : transportadoraMenuItems;
  const filteredItems = menuItems.filter(item => !item.adminOnly || cargo === 'ADMIN');
  const config = portalConfig[userType];
  const PortalIcon = config.icon;

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('hubfrete_filial_ativa');
    navigate('/');
    onOpenChange(false);
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.nome_completo || 'Perfil'}
                className="w-12 h-12 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-base truncate">
                {profile?.nome_completo || 'Usuário'}
              </SheetTitle>
              <p className="text-sm text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Company Info */}
        <div className="px-4 py-0 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            {empresa?.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={empresa.nome || 'Logo'}
                className="w-10 h-10 rounded-lg object-contain bg-background border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PortalIcon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Badge variant="secondary" className="text-[10px] mb-1">
                <PortalIcon className="w-2.5 h-2.5 mr-1" />
                {config.title}
              </Badge>
              <p className="text-sm font-medium truncate">
                {empresa?.nome || config.title}
              </p>
              {filialAtiva && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {filialAtiva.nome}
                </p>
              )}
            </div>
          </div>

          {/* Branch Selector */}
          {filiais.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Filial Ativa
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between h-9 px-3 text-xs"
                    disabled={switchingFilial}
                  >
                    <span className="flex items-center gap-2">
                      {switchingFilial ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span className="font-medium truncate">
                        {switchingFilial ? 'Carregando...' : (filialAtiva?.nome || 'Selecionar filial')}
                      </span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
                        className={`flex items-center gap-2 py-2.5 ${
                          isDisabled 
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
                        onClick={() => {
                          navigate(`/${userType}/filiais`);
                          onOpenChange(false);
                        }}
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

        <Separator className="shrink-0" />

        {/* Menu Items - Scrollable */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronRight className={cn('w-4 h-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Logout - Fixed at bottom */}
        <div className="p-4 border-t border-border shrink-0 bg-background">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
