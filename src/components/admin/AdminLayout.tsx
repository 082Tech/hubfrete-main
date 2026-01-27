import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Users, 
  UserPlus, 
  LogOut, 
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: ReactNode;
}

type AdminRole = 'super_admin' | 'admin' | 'suporte';

interface AdminUser {
  id: string;
  role: AdminRole;
  nome: string | null;
  email: string | null;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAdminAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin');
        return;
      }

      const { data: torreUser, error } = await supabase
        .from('torre_users')
        .select('id, role, nome, email')
        .eq('user_id', session.user.id)
        .eq('ativo', true)
        .single();

      if (error || !torreUser) {
        await supabase.auth.signOut();
        toast.error('Acesso não autorizado à área administrativa');
        navigate('/admin');
        return;
      }

      setAdminUser(torreUser);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const menuItems = [
    {
      title: 'Torre de Controle',
      icon: Shield,
      href: '/admin/torre-controle',
      roles: ['super_admin', 'admin', 'suporte'] as AdminRole[],
    },
    {
      title: 'Pré-Cadastros',
      icon: UserPlus,
      href: '/admin/pre-cadastros',
      roles: ['super_admin', 'admin'] as AdminRole[],
    },
    {
      title: 'Usuários Admin',
      icon: Users,
      href: '/admin/usuarios',
      roles: ['super_admin'] as AdminRole[],
    },
  ];

  const visibleMenuItems = menuItems.filter(
    item => adminUser && item.roles.includes(adminUser.role)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  const roleLabels: Record<AdminRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    suporte: 'Suporte',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-destructive rounded-lg">
            <Shield className="w-4 h-4 text-destructive-foreground" />
          </div>
          <span className="font-semibold text-foreground">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-destructive rounded-lg">
                <Shield className="w-5 h-5 text-destructive-foreground" />
              </div>
              <div>
                <span className="font-bold text-foreground">HubFrete</span>
                <span className="text-destructive ml-1 text-sm">Admin</span>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium text-foreground truncate">
              {adminUser.nome || adminUser.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {roleLabels[adminUser.role]}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-destructive/10 text-destructive" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
