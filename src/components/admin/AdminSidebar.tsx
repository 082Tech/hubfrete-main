import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Activity,
  Truck,
  AlertTriangle,
  Building,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

type AdminRole = 'super_admin' | 'admin' | 'suporte';

interface AdminUser {
  id: string;
  role: AdminRole;
  nome: string | null;
  email: string | null;
}

interface MenuItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles: AdminRole[];
  badge?: number;
}

interface AdminSidebarProps {
  adminUser: AdminUser;
  pendingCount?: number;
}

const roleLabels: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  suporte: 'Suporte',
};

const roleBadgeVariants: Record<AdminRole, 'destructive' | 'default' | 'secondary'> = {
  super_admin: 'destructive',
  admin: 'default',
  suporte: 'secondary',
};

export function AdminSidebar({ adminUser, pendingCount = 0 }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('hubfrete_admin_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hubfrete_admin_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/admin/torre-controle',
      roles: ['super_admin', 'admin', 'suporte'],
    },
    {
      title: 'Empresas',
      icon: Building,
      href: '/admin/empresas',
      roles: ['super_admin', 'admin'],
    },
    {
      title: 'Motoristas',
      icon: User,
      href: '/admin/motoristas',
      roles: ['super_admin', 'admin', 'suporte'],
    },
    {
      title: 'Veículos',
      icon: Truck,
      href: '/admin/veiculos',
      roles: ['super_admin', 'admin', 'suporte'],
    },
    {
      title: 'Pré-Cadastros',
      icon: UserPlus,
      href: '/admin/pre-cadastros',
      roles: ['super_admin', 'admin'],
      badge: pendingCount,
    },
    {
      title: 'Usuários Admin',
      icon: Users,
      href: '/admin/usuarios',
      roles: ['super_admin'],
    },
    {
      title: 'Monitoramento',
      icon: Activity,
      href: '/admin/monitoramento',
      roles: ['super_admin', 'admin', 'suporte'],
    },
    {
      title: 'Relatórios',
      icon: TrendingUp,
      href: '/admin/relatorios',
      roles: ['super_admin', 'admin'],
    },
    {
      title: 'Chamados',
      icon: AlertTriangle,
      href: '/admin/chamados',
      roles: ['super_admin', 'admin', 'suporte'],
    },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(adminUser.role));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-40`}
      >
        {/* Logo & Collapse Button */}
        <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between'}`}>
          <Link to="/admin/torre-controle" className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="p-2 bg-destructive rounded-lg shrink-0">
              <Shield className="w-5 h-5 text-destructive-foreground" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold text-sidebar-foreground">
                Hub<span className="text-destructive">Admin</span>
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Role Badge - Hidden when collapsed */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border bg-sidebar-accent/10">
            <div className="flex items-center gap-2">
              <Badge variant={roleBadgeVariants[adminUser.role]} className="text-[10px] py-0 px-1.5 h-5">
                <Shield className="w-2.5 h-2.5 mr-1" />
                Torre de Controle
              </Badge>
            </div>
            <p className="text-xs text-sidebar-foreground/60 mt-1">
              Gestão administrativa da plataforma
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const linkContent = (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''} ${
                  isActive
                    ? 'bg-destructive text-destructive-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="flex-1 font-medium">{item.title}</span>
                )}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-chart-4/20 text-chart-4">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="flex items-center gap-2">
                    {item.title}
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-chart-4/20 text-chart-4">
                        {item.badge}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* User */}
        <div className={`p-4 border-t border-sidebar-border ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <span className="text-destructive font-semibold">
                    {(adminUser.nome || adminUser.email || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {adminUser.nome || 'Admin'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={roleBadgeVariants[adminUser.role]} className="text-[9px] py-0 px-1 h-4">
                      {roleLabels[adminUser.role]}
                    </Badge>
                  </div>
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
