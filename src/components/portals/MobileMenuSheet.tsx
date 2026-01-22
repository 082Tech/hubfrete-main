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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext, type UserType } from '@/hooks/useUserContext';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const embarcadorMenuItems: MenuItem[] = [
  { icon: Home, label: 'Home', href: '/embarcador' },
  { icon: Package, label: 'Cargas Publicadas', href: '/embarcador/cargas' },
  { icon: Route, label: 'Cargas Em Rota', href: '/embarcador/cargas/em-rota' },
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
  { icon: Package, label: 'Cargas Disponíveis', href: '/transportadora/cargas' },
  { icon: Truck, label: 'Minha Frota', href: '/transportadora/frota' },
  { icon: User, label: 'Motoristas', href: '/transportadora/motoristas' },
  { icon: Route, label: 'Gestão de Entregas', href: '/transportadora/entregas' },
  { icon: History, label: 'Histórico de Entregas', href: '/transportadora/entregas/historico' },
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
  const { empresa, filialAtiva, cargo } = useUserContext();
  
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
      <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="p-4 border-b border-border">
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
        <div className="p-4 bg-muted/30">
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
        </div>

        <Separator />

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-2">
          <nav className="space-y-1">
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
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-border">
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
