import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Truck, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  ChevronDown,
  UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearAuth, getAuthUser } from '@/lib/api';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';

const menuItems = [
  { 
    icon: LayoutDashboard, 
    label: 'Dashboard', 
    href: '/dashboard' 
  },
  { 
    icon: Package, 
    label: 'Cargas', 
    href: '/dashboard/cargas' 
  },
  { 
    icon: Building2, 
    label: 'Embarcadores', 
    href: '/dashboard/embarcadores' 
  },
  { 
    icon: Truck, 
    label: 'Transportadoras', 
    href: '/dashboard/transportadoras' 
  },
  { 
    icon: BarChart3, 
    label: 'Relatórios', 
    href: '/dashboard/relatorios' 
  },
];

const adminItems = [
  { 
    icon: Users, 
    label: 'Usuários', 
    href: '/admin/usuarios' 
  },
  { 
    icon: Shield, 
    label: 'Torre de Controle', 
    href: '/admin/torre-controle' 
  },
  { 
    icon: Settings, 
    label: 'Configurações', 
    href: '/admin/configuracoes' 
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const userEmail = getAuthUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <>
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
          
          {/* Admin Section */}
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="pt-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
              Administração
              <ChevronDown className={`w-4 h-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {adminItems.map((item) => {
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
            </CollapsibleContent>
          </Collapsible>
        </nav>
        
        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 mb-3 w-full p-2 -m-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-full bg-sidebar-primary/10 flex items-center justify-center">
              <span className="text-sidebar-primary font-semibold">
                {userEmail?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userEmail || 'Admin'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                <UserCog className="w-3 h-3" />
                Configurações
              </p>
            </div>
          </button>
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

      <ProfileSettingsDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
