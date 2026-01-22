// Layout is now handled by PortalLayoutWrapper in App.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search,
  Mail,
  Phone,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  MapPin,
  Send,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';

type UserRole = 'ADMIN' | 'OPERADOR';

interface UsuarioComFiliais {
  id: number;
  nome: string | null;
  email: string | null;
  cargo: UserRole | null;
  auth_user_id: string | null;
  filiais: { id: number; nome: string | null }[];
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
};

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  OPERADOR: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export default function UsuariosEmpresa() {
  const { user } = useAuth();
  const { empresa, filiais: contextFiliais } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);


  // Fetch usuarios from the company
  const { data: usuarios = [], isLoading: loadingUsuarios, refetch: refetchUsuarios } = useQuery({
    queryKey: ['usuarios_empresa', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // First get all usuarios_filiais for this empresa
      const { data: usuariosFiliais, error: ufError } = await supabase
        .from('usuarios_filiais')
        .select(`
          usuario_id,
          cargo_na_filial,
          filial_id,
          filiais!inner(id, nome, empresa_id)
        `)
        .eq('filiais.empresa_id', empresa.id);

      if (ufError) throw ufError;

      // Get unique usuario_ids
      const usuarioIds = [...new Set(usuariosFiliais?.map(uf => uf.usuario_id).filter(Boolean))];
      
      if (usuarioIds.length === 0) return [];

      // Fetch usuarios data
      const { data: usuariosData, error: uError } = await supabase
        .from('usuarios')
        .select('id, nome, email, cargo, auth_user_id')
        .in('id', usuarioIds);

      if (uError) throw uError;

      // Combine data
      const result: UsuarioComFiliais[] = (usuariosData || []).map(u => {
        const userFiliais = usuariosFiliais
          ?.filter(uf => uf.usuario_id === u.id)
          .map(uf => ({
            id: (uf.filiais as any)?.id || 0,
            nome: (uf.filiais as any)?.nome || null,
          })) || [];

        // Get cargo from usuarios_filiais if not set on usuario
        const cargoFromFilial = usuariosFiliais?.find(uf => uf.usuario_id === u.id)?.cargo_na_filial;

        return {
          ...u,
          cargo: (u.cargo || cargoFromFilial) as UserRole | null,
          filiais: userFiliais,
        };
      });

      return result;
    },
    enabled: !!empresa?.id,
  });

  // Fetch pending invites
  const { data: invites = [], refetch: refetchInvites } = useQuery({
    queryKey: ['company_invites', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('company_invites')
        .select('*')
        .eq('company_id', String(empresa.id))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!empresa?.id,
  });

  const filteredUsuarios = usuarios.filter(usuario => 
    (usuario.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (usuario.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (usuario.cargo && roleLabels[usuario.cargo]?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleStatus = (userId: number) => {
    toast.info('Funcionalidade em desenvolvimento');
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    
    try {
      // Remove from usuarios_filiais first
      const { error: ufError } = await supabase
        .from('usuarios_filiais')
        .delete()
        .eq('usuario_id', userId);

      if (ufError) throw ufError;

      toast.success('Usuário removido com sucesso');
      refetchUsuarios();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast.error('Erro ao remover usuário');
    }
  };

  const getFilialNomes = (filiais: { id: number; nome: string | null }[]) => {
    if (filiais.length === contextFiliais.length && filiais.length > 0) {
      return 'Todas as filiais';
    }
    return filiais.map(f => f.nome || 'Sem nome').join(', ') || 'Nenhuma filial';
  };

  const stats = {
    total: usuarios.length,
    admins: usuarios.filter(u => u.cargo === 'ADMIN').length,
    operadores: usuarios.filter(u => u.cargo === 'OPERADOR').length,
    pendingInvites: invites.filter(i => i.status === 'pending').length,
  };

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários da Empresa</h1>
            <p className="text-muted-foreground">Gerencie os usuários e suas permissões</p>
          </div>
          <Button className="gap-2" onClick={() => setIsInviteDialogOpen(true)}>
            <Send className="w-4 h-4" />
            Convidar Usuário
          </Button>
        </div>

        {/* Invite Dialog */}
        {empresa && (
          <InviteUserDialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
            companyType="embarcador"
            companyId={String(empresa.id)}
            filiais={contextFiliais.map(f => ({ id: f.id, nome: f.nome || 'Sem nome' }))}
            onSuccess={() => {
              refetchInvites();
              refetchUsuarios();
            }}
          />
        )}

        {/* Pending Invites */}
        {invites.filter(i => i.status === 'pending').length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600" />
                Convites Pendentes
              </h3>
              <div className="space-y-2">
                {invites.filter(i => i.status === 'pending').map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{invite.email}</span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Aguardando
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.admins}</p>
                  <p className="text-xs text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.operadores}</p>
                  <p className="text-xs text-muted-foreground">Operadores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingInvites}</p>
                  <p className="text-xs text-muted-foreground">Convites Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email ou cargo..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Users List */}
        {loadingUsuarios ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredUsuarios.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-1">
                    {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm 
                      ? 'Tente ajustar os termos da busca' 
                      : 'Clique em "Convidar Usuário" para adicionar o primeiro'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredUsuarios.map((usuario) => (
                <Card key={usuario.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(usuario.nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{usuario.nome || 'Sem nome'}</h3>
                            {usuario.cargo && (
                              <Badge variant="outline" className={roleColors[usuario.cargo]}>
                                {roleLabels[usuario.cargo]}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {usuario.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {usuario.email}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{getFilialNomes(usuario.filiais)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Edit className="w-4 h-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Shield className="w-4 h-4" />
                            Alterar Permissões
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => handleDelete(usuario.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
