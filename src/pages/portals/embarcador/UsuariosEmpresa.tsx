import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search,
  Mail,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  Shield,
  MapPin,
  Send,
  Loader2,
  Clock,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useViewModePreference } from '@/hooks/useViewModePreference';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { ManageInvitesCard } from '@/components/users/ManageInvitesCard';
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
  isPending?: boolean;
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
};

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  OPERADOR: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const ITEMS_PER_PAGE = 12;

export default function UsuariosEmpresa() {
  const { user } = useAuth();
  const { empresa, filiais: contextFiliais } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioComFiliais | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPage, setCurrentPage] = useState(1);

  const { ref: contentRef, height: contentHeight } = useRemainingViewportHeight<HTMLDivElement>({
    bottomOffset: 32,
    minHeight: 300,
  });

  // Fetch usuarios from the company
  const { data: usuarios = [], isLoading: loadingUsuarios, refetch: refetchUsuarios } = useQuery({
    queryKey: ['usuarios_empresa', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

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

      const usuarioIds = [...new Set(usuariosFiliais?.map(uf => uf.usuario_id).filter(Boolean))];
      
      if (usuarioIds.length === 0) return [];

      const { data: usuariosData, error: uError } = await supabase
        .from('usuarios')
        .select('id, nome, email, cargo, auth_user_id')
        .in('id', usuarioIds);

      if (uError) throw uError;

      const result: UsuarioComFiliais[] = (usuariosData || []).map(u => {
        const userFiliais = usuariosFiliais
          ?.filter(uf => uf.usuario_id === u.id)
          .map(uf => ({
            id: (uf.filiais as any)?.id || 0,
            nome: (uf.filiais as any)?.nome || null,
          })) || [];

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
        .eq('company_id', empresa.id as unknown as number)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(inv => ({ ...inv, id: String(inv.id) }));
    },
    enabled: !!empresa?.id,
  });

  // Combine usuarios with pending invites for display
  const pendingInviteUsers: UsuarioComFiliais[] = invites
    .filter(inv => inv.status === 'pending')
    .map((inv, idx) => ({
      id: -(idx + 1), // Negative ID to avoid collision
      nome: inv.email.split('@')[0], // Use email prefix as name
      email: inv.email,
      cargo: inv.role as UserRole,
      auth_user_id: null,
      filiais: inv.filial_id 
        ? contextFiliais.filter(f => f.id === inv.filial_id).map(f => ({ id: f.id, nome: f.nome || 'Sem nome' }))
        : contextFiliais.map(f => ({ id: f.id, nome: f.nome || 'Sem nome' })),
      isPending: true,
    }));

  const allUsuarios = [...usuarios, ...pendingInviteUsers];

  const filteredUsuarios = useMemo(() => 
    allUsuarios.filter(usuario => 
      (usuario.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (usuario.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (usuario.cargo && roleLabels[usuario.cargo]?.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [allUsuarios, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsuarios.length / ITEMS_PER_PAGE);
  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsuarios.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsuarios, currentPage]);

  const handleDelete = async () => {
    if (!deletingUserId) return;
    
    try {
      const { error: ufError } = await supabase
        .from('usuarios_filiais')
        .delete()
        .eq('usuario_id', deletingUserId);

      if (ufError) throw ufError;

      toast.success('Usuário removido com sucesso');
      refetchUsuarios();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast.error('Erro ao remover usuário');
    } finally {
      setDeletingUserId(null);
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

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: (number | 'ellipsis')[] = [];
      
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push('ellipsis');
        
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = start; i <= end; i++) pages.push(i);
        
        if (currentPage < totalPages - 2) pages.push('ellipsis');
        pages.push(totalPages);
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
        <div className="text-sm text-muted-foreground">
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsuarios.length)} de {filteredUsuarios.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, idx) => 
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const UserCard = ({ usuario }: { usuario: UsuarioComFiliais }) => (
    <Card className="border-border">
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
                {usuario.isPending && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                    <Clock className="w-3 h-3" />
                    Convite Pendente
                  </Badge>
                )}
                {usuario.cargo && !usuario.isPending && (
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
          
          {!usuario.isPending && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="gap-2"
                  onClick={() => setEditingUser(usuario)}
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="gap-2"
                  onClick={() => setEditingUser(usuario)}
                >
                  <Shield className="w-4 h-4" />
                  Alterar Permissões
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => setDeletingUserId(usuario.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <div className="flex flex-col gap-6 flex-1 min-h-0">
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

        {/* Edit Dialog */}
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          usuario={editingUser}
          filiais={contextFiliais.map(f => ({ id: f.id, nome: f.nome || 'Sem nome' }))}
          onSuccess={() => {
            refetchUsuarios();
            setEditingUser(null);
          }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este usuário da empresa? 
                Ele perderá acesso a todas as filiais associadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pending Invites */}
        <ManageInvitesCard 
          invites={invites} 
          onRefresh={refetchInvites} 
        />

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

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, email ou cargo..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content with fixed height */}
        <Card ref={contentRef} className="flex-1 flex flex-col overflow-hidden" style={{ height: contentHeight }}>
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            {loadingUsuarios ? (
              <div className="flex items-center justify-center h-32 flex-1">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-4">
                  {paginatedUsuarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium text-foreground mb-1">
                        {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm 
                          ? 'Tente ajustar os termos da busca' 
                          : 'Clique em "Convidar Usuário" para adicionar o primeiro'}
                      </p>
                    </div>
                  ) : viewMode === 'list' ? (
                    <div className="space-y-4">
                      {paginatedUsuarios.map((usuario) => (
                        <UserCard key={usuario.id} usuario={usuario} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedUsuarios.map((usuario) => (
                        <UserCard key={usuario.id} usuario={usuario} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {renderPagination()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
