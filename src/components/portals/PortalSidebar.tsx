import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { clearUserSession, getUserSession, UserType } from '@/lib/userSession';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

// Mock data - será substituído por dados reais da API
const mockEmpresa = {
  id: '1',
  nome: 'Carajás Mineração S.A.',
  cnpj: '12.345.678/0001-99',
  filiais: [
    { id: 'f1', nome: 'Matriz - Parauapebas', cidade: 'Parauapebas', estado: 'PA' },
    { id: 'f2', nome: 'Filial São Luís', cidade: 'São Luís', estado: 'MA' },
    { id: 'f3', nome: 'Filial Marabá', cidade: 'Marabá', estado: 'PA' },
    { id: 'f4', nome: 'Centro de Distribuição SP', cidade: 'São Paulo', estado: 'SP' },
  ],
};

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const menusByType: Record<UserType, MenuItem[]> = {
  embarcador: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/embarcador' },
    { icon: Package, label: 'Minhas Cargas', href: '/embarcador/cargas' },
    { icon: Truck, label: 'Acompanhar Entregas', href: '/embarcador/entregas' },
    { icon: FileText, label: 'Cotações', href: '/embarcador/cotacoes' },
    { icon: BarChart3, label: 'Relatórios', href: '/embarcador/relatorios' },
    { icon: MapPin, label: 'Gerenciar Filiais', href: '/embarcador/filiais' },
    { icon: User, label: 'Usuários da Empresa', href: '/embarcador/usuarios' },
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

const portalConfig: Record<UserType, { title: string; icon: React.ElementType; badgeVariant: 'default' | 'secondary' | 'outline' }> = {
  embarcador: { title: 'Embarcador', icon: Building2, badgeVariant: 'default' },
  transportadora: { title: 'Transportadora', icon: Truck, badgeVariant: 'secondary' },
  motorista: { title: 'Motorista Autônomo', icon: User, badgeVariant: 'outline' },
};

interface PortalSidebarProps {
  userType: UserType;
}

export function PortalSidebar({ userType }: PortalSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const userSession = getUserSession();
  const menuItems = menusByType[userType];
  const config = portalConfig[userType];
  const PortalIcon = config.icon;
  
  // Estado para filial ativa (usar mockEmpresa por enquanto)
  const [filialAtiva, setFilialAtiva] = useState(mockEmpresa.filiais[0]);

  const handleLogout = async () => {
    await signOut();
    clearUserSession();
    navigate('/');
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <Truck className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">
            Hub<span className="text-sidebar-primary">Frete</span>
          </span>
        </Link>
      </div>

      {/* Company & Branch Section - Estilo iFood */}
      <div className="px-4 py-4 border-b border-sidebar-border bg-sidebar-accent/10">
        {/* Company Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant={config.badgeVariant} className="text-[10px] py-0 px-1.5 h-5">
                <PortalIcon className="w-2.5 h-2.5 mr-1" />
                {config.title}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
              {mockEmpresa.nome}
            </p>
            <p className="text-[10px] text-sidebar-foreground/60">
              CNPJ: {mockEmpresa.cnpj}
            </p>
          </div>
        </div>
        
        {/* Branch Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between h-9 px-3 text-xs bg-sidebar border-sidebar-border hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-2 text-sidebar-foreground">
                <MapPin className="w-3.5 h-3.5 text-sidebar-primary" />
                <span className="font-medium truncate">{filialAtiva.nome}</span>
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
            {mockEmpresa.filiais.map((filial) => (
              <DropdownMenuItem 
                key={filial.id}
                onClick={() => setFilialAtiva(filial)}
                className={`flex items-center gap-2 py-2.5 cursor-pointer ${
                  filialAtiva.id === filial.id ? 'bg-accent' : ''
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${filialAtiva.id === filial.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${filialAtiva.id === filial.id ? 'text-primary' : ''}`}>
                    {filial.nome}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{filial.cidade}, {filial.estado}</p>
                </div>
                {filialAtiva.id === filial.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-muted-foreground text-xs">
              <Settings className="w-3.5 h-3.5" />
              Gerenciar filiais
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary font-semibold">
              {(profile?.nome_completo || userSession?.nome || profile?.email || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.nome_completo || userSession?.nome || 'Usuário'}
            </p>
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
      </div>
    </aside>
  );
}
