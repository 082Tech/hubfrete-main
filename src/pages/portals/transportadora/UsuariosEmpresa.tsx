import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  RotateCcw,
} from 'lucide-react';
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

import { useViewModePreference } from '@/hooks/useViewModePreference';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';

type UserRole = 'ADMIN' | 'OPERADOR';

const ITEMS_PER_PAGE = 12;

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

// Column definitions
const columns: ColumnDefinition[] = [
  { id: 'usuario', label: 'Usuário', minWidth: '200px', sticky: 'left', sortable: true, sortKey: 'nome' },
  { id: 'email', label: 'E-mail', minWidth: '200px', sortable: true, sortKey: 'email' },
  { id: 'cargo', label: 'Cargo', minWidth: '120px', sortable: true, sortKey: 'cargo' },
  { id: 'filiais', label: 'Filiais', minWidth: '180px' },
  { id: 'status', label: 'Status', minWidth: '100px' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

export default function UsuariosEmpresa() {
  const { user } = useAuth();
  const { empresa, filiais: contextFiliais } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPage, setCurrentPage] = useState(1);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioComFiliais | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);


  // Draggable columns hook
  const {
    orderedColumns,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetColumnOrder,
  } = useDraggableColumns({
    columns,
    persistKey: 'usuarios-empresa-transportadora-columns',
  });

  // Fetch usuarios from the company
  const { data: usuarios = [], isLoading: loadingUsuarios, refetch: refetchUsuarios } = useQuery({
    queryKey: ['usuarios_empresa_transportadora', empresa?.id],
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
    queryKey: ['company_invites_transportadora', empresa?.id],
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
      id: -(idx + 1),
      nome: inv.email.split('@')[0],
      email: inv.email,
      cargo: inv.role as UserRole,
      auth_user_id: null,
      filiais: inv.filial_id 
        ? contextFiliais.filter(f => f.id === inv.filial_id).map(f => ({ id: f.id, nome: f.nome || 'Sem nome' }))
        : contextFiliais.map(f => ({ id: f.id, nome: f.nome || 'Sem nome' })),
      isPending: true,
    }));

  const allUsuarios = [...usuarios, ...pendingInviteUsers];

  const filteredUsuarios = useMemo(() => {
    const filtered = allUsuarios.filter(usuario => 
      (usuario.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (usuario.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (usuario.cargo && roleLabels[usuario.cargo]?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return filtered;
  }, [allUsuarios, searchTerm]);

  // Custom sort functions
  const sortFunctions = useMemo(() => ({
    nome: (a: UsuarioComFiliais, b: UsuarioComFiliais) =>
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR'),
    email: (a: UsuarioComFiliais, b: UsuarioComFiliais) =>
      (a.email || '').localeCompare(b.email || '', 'pt-BR'),
    cargo: (a: UsuarioComFiliais, b: UsuarioComFiliais) =>
      (a.cargo || '').localeCompare(b.cargo || '', 'pt-BR'),
  }), []);

  const { sortedData, requestSort, getSortDirection } = useTableSort({
    data: filteredUsuarios,
    defaultSort: { key: 'nome', direction: 'asc' },
    persistKey: 'usuarios-empresa-transportadora',
    sortFunctions,
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  // Get column icon
  const getColumnIcon = (columnId: string) => {
    const icons: Record<string, React.ReactNode> = {
      usuario: <Users className="w-3.5 h-3.5" />,
      email: <Mail className="w-3.5 h-3.5" />,
      cargo: <Shield className="w-3.5 h-3.5" />,
      filiais: <MapPin className="w-3.5 h-3.5" />,
    };
    return icons[columnId] || null;
  };

  // Render cell based on column ID
  const renderCell = (columnId: string, usuario: UsuarioComFiliais) => {
    switch (columnId) {
      case 'usuario':
        return (
          <td className="p-4 align-middle sticky left-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(usuario.nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-nowrap">{usuario.nome || 'Sem nome'}</span>
            </div>
          </td>
        );
      case 'email':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">
            {usuario.email || '-'}
          </td>
        );
      case 'cargo':
        return (
          <td className="p-4 align-middle">
            {usuario.cargo && !usuario.isPending && (
              <Badge variant="outline" className={roleColors[usuario.cargo]}>
                {roleLabels[usuario.cargo]}
              </Badge>
            )}
            {usuario.isPending && usuario.cargo && (
              <Badge variant="outline" className={roleColors[usuario.cargo]}>
                {roleLabels[usuario.cargo]}
              </Badge>
            )}
          </td>
        );
      case 'filiais':
        return (
          <td className="p-4 align-middle text-muted-foreground">
            <span className="truncate max-w-[180px] block">{getFilialNomes(usuario.filiais)}</span>
          </td>
        );
      case 'status':
        return (
          <td className="p-4 align-middle">
            {usuario.isPending ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                <Clock className="w-3 h-3" />
                Pendente
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                Ativo
              </Badge>
            )}
          </td>
        );
      case 'acoes':
        return (
          <td className="p-4 align-middle sticky right-0 bg-background z-10">
            {!usuario.isPending && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingUser(usuario)}>
                    <Edit className="w-4 h-4 mr-2" />Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeletingUserId(usuario.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  const renderUserCard = (usuario: UsuarioComFiliais) => (
    <Card key={usuario.id} className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {(usuario.nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{usuario.nome || 'Sem nome'}</h3>
                {usuario.isPending && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px]">
                    <Clock className="w-3 h-3" />
                    Pendente
                  </Badge>
                )}
                {usuario.cargo && !usuario.isPending && (
                  <Badge variant="outline" className={`${roleColors[usuario.cargo]} text-[10px]`}>
                    {roleLabels[usuario.cargo]}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">{getFilialNomes(usuario.filiais)}</p>
            </div>
          </div>
          
          {!usuario.isPending && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onClick={() => setEditingUser(usuario)}>
                  <Edit className="w-4 h-4" />
                  Editar
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
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col h-full gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
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
            companyType="transportadora"
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
        <div className="shrink-0">
          <ManageInvitesCard invites={invites} onRefresh={refetchInvites} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
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
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shrink-0">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, email ou cargo..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetColumnOrder}
                title="Restaurar ordem das colunas"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
              <ToggleGroupItem value="list" aria-label="Visualização em lista">
                <List className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Visualização em cards">
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Content */}
        {loadingUsuarios ? (
          <Card className="flex-1 flex items-center justify-center border-border">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </Card>
        ) : sortedData.length === 0 ? (
          <Card className="flex-1 flex items-center justify-center border-border">
            <CardContent className="text-center">
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
        ) : viewMode === 'list' ? (
          <Card
            className="border-border flex flex-col flex-1 min-h-0"
          >
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                    <tr className="border-b transition-colors bg-muted/50">
                      {orderedColumns.map((col) => (
                        <DraggableTableHead
                          key={col.id}
                          columnId={col.id}
                          isDragging={draggedColumn === col.id}
                          isDragOver={dragOverColumn === col.id}
                          isSticky={!!col.sticky}
                          sortable={col.sortable}
                          sortDirection={col.sortKey ? getSortDirection(col.sortKey) : null}
                          onSort={col.sortKey ? () => requestSort(col.sortKey!) : undefined}
                          onColumnDragStart={handleDragStart}
                          onColumnDragEnd={handleDragEnd}
                          onColumnDragOver={handleDragOver}
                          onColumnDragLeave={handleDragLeave}
                          onColumnDrop={handleDrop}
                          className={`min-w-[${col.minWidth}] ${
                            col.sticky === 'left' ? 'sticky left-0 bg-muted/50 z-10' :
                            col.sticky === 'right' ? 'sticky right-0 bg-muted/50 z-10' : ''
                          }`}
                        >
                          {getColumnIcon(col.id)}
                          {col.label}
                        </DraggableTableHead>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {paginatedUsuarios.map((usuario) => (
                      <tr key={usuario.id} className="border-b transition-colors hover:bg-muted/30">
                        {orderedColumns.map((col) => (
                          <React.Fragment key={col.id}>
                            {renderCell(col.id, usuario)}
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Grid View */
          <div 
            className="flex flex-col flex-1 min-h-0 overflow-auto"
          >
            <div className="flex-1 overflow-auto">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedUsuarios.map(renderUserCard)}
              </div>
            </div>
            
            {/* Pagination for Grid */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
