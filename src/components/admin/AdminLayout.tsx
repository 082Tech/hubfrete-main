import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from './AdminSidebar';

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
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('hubfrete_admin_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    checkAdminAuth();
    fetchPendingCount();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('hubfrete_admin_sidebar_collapsed');
      setSidebarCollapsed(saved === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin');
        return;
      }

      const { data: torreUser, error } = await (supabase as any)
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

      setAdminUser(torreUser as AdminUser);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    const { count } = await (supabase as any)
      .from('pre_cadastros')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente');
    
    setPendingCount(count || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-destructive" />
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar adminUser={adminUser} pendingCount={pendingCount} />
      
      {/* Main content */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
