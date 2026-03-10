import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Loader2,
  Package,
  Truck,
  MapPin,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { FilialFormDialog } from '@/components/admin/FilialFormDialog';
import { AddUserToCompanyDialog } from '@/components/admin/AddUserToCompanyDialog';

type Usuario = {
  id: number;
  nome: string | null;
  email: string | null;
  cargo: string | null;
  auth_user_id: string | null;
};

type Filial = {
  id: number;
  nome: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  is_matriz: boolean | null;
  ativa: boolean | null;
  usuarios: Usuario[];
};

type Empresa = {
  id: number;
  nome: string | null;
  cnpj_matriz: string | null;
  tipo: 'EMBARCADOR' | 'TRANSPORTADORA';
  classe: string;
  created_at: string;
  logo_url: string | null;
  comissao_hubfrete_percent: number | null;
  filiais: Filial[];
  _count: {
    filiais: number;
    usuarios: number;
  };
};

type TipoEmpresa = 'EMBARCADOR' | 'TRANSPORTADORA';
type ClasseEmpresa = 'INDÚSTRIA' | 'LOJA' | 'COMÉRCIO';

const ITEMS_PER_PAGE = 10;

const cargoLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
};

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filial dialog states
  const [filialDialogOpen, setFilialDialogOpen] = useState(false);
  const [selectedFilial, setSelectedFilial] = useState<Filial | null>(null);
  const [deleteFilialDialogOpen, setDeleteFilialDialogOpen] = useState(false);
  const [isDeletingFilial, setIsDeletingFilial] = useState(false);
  
  // User dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    cnpj_matriz: '',
    tipo: 'EMBARCADOR' as TipoEmpresa,
    classe: 'COMÉRCIO' as ClasseEmpresa,
    comissao_hubfrete_percent: 0,
  });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    setIsLoading(true);
    try {
      // Fetch empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (empresasError) throw empresasError;

      // Fetch all filiais and usuarios_filiais in parallel
      const empresaIds = (empresasData || []).map(e => e.id);
      
      const [filiaisRes, usuariosFiliaisRes] = await Promise.all([
        supabase.from('filiais').select('*').in('empresa_id', empresaIds),
        supabase.from('usuarios_filiais').select('*, usuarios(*)'),
      ]);

      const filiais = filiaisRes.data || [];
      const usuariosFiliais = usuariosFiliaisRes.data || [];

      // Build empresa objects with nested data
      const empresasWithData: Empresa[] = (empresasData || []).map(empresa => {
        const empresaFiliais = filiais.filter(f => f.empresa_id === empresa.id);
        const filialIds = empresaFiliais.map(f => f.id);
        
        const filiaisWithUsers: Filial[] = empresaFiliais.map(filial => {
          const filialUsuarios = usuariosFiliais
            .filter(uf => uf.filial_id === filial.id)
            .map(uf => ({
              id: uf.usuarios?.id || uf.usuario_id,
              nome: uf.usuarios?.nome || null,
              email: uf.usuarios?.email || null,
              cargo: uf.cargo_na_filial,
              auth_user_id: uf.usuarios?.auth_user_id || null,
            }));

          return {
            id: filial.id,
            nome: filial.nome,
            cnpj: filial.cnpj,
            cidade: filial.cidade,
            estado: filial.estado,
            is_matriz: filial.is_matriz,
            ativa: filial.ativa,
            usuarios: filialUsuarios,
          };
        });

        const totalUsuarios = filiaisWithUsers.reduce((sum, f) => sum + f.usuarios.length, 0);

        return {
          ...empresa,
          filiais: filiaisWithUsers,
          _count: {
            filiais: empresaFiliais.length,
            usuarios: totalUsuarios,
          },
        };
      });

      setEmpresas(empresasWithData);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmpresa = async () => {
    if (!formData.nome || !formData.cnpj_matriz) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsCreating(true);
    try {
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: formData.nome,
          cnpj_matriz: formData.cnpj_matriz.replace(/\D/g, ''),
          tipo: formData.tipo,
          classe: formData.classe,
          comissao_hubfrete_percent: formData.tipo === 'EMBARCADOR' ? formData.comissao_hubfrete_percent : 0,
        } as any)
        .select()
        .single();

      if (empresaError) throw empresaError;

      const { error: filialError } = await supabase
        .from('filiais')
        .insert({
          empresa_id: empresa.id,
          nome: 'Matriz',
          cnpj: formData.cnpj_matriz.replace(/\D/g, ''),
          is_matriz: true,
          ativa: true,
        });

      if (filialError) throw filialError;

      toast.success('Empresa criada com sucesso!');
      setCreateDialogOpen(false);
      resetForm();
      fetchEmpresas();
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
      toast.error(error.message || 'Erro ao criar empresa');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditEmpresa = async () => {
    if (!selectedEmpresa || !formData.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsEditing(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          nome: formData.nome,
          cnpj_matriz: formData.cnpj_matriz.replace(/\D/g, ''),
          tipo: formData.tipo,
          classe: formData.classe,
          comissao_hubfrete_percent: formData.tipo === 'EMBARCADOR' ? formData.comissao_hubfrete_percent : 0,
        } as any)
        .eq('id', selectedEmpresa.id);

      if (error) throw error;

      toast.success('Empresa atualizada com sucesso!');
      setEditDialogOpen(false);
      resetForm();
      fetchEmpresas();
    } catch (error: any) {
      console.error('Erro ao atualizar empresa:', error);
      toast.error(error.message || 'Erro ao atualizar empresa');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteEmpresa = async () => {
    if (!selectedEmpresa) return;

    setIsDeleting(true);
    try {
      // Delete filiais first
      await supabase.from('filiais').delete().eq('empresa_id', selectedEmpresa.id);
      
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', selectedEmpresa.id);

      if (error) throw error;

      toast.success('Empresa excluída com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedEmpresa(null);
      fetchEmpresas();
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      toast.error(error.message || 'Erro ao excluir empresa');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormData({
      nome: empresa.nome || '',
      cnpj_matriz: empresa.cnpj_matriz || '',
      tipo: empresa.tipo,
      classe: empresa.classe as ClasseEmpresa,
      comissao_hubfrete_percent: empresa.comissao_hubfrete_percent || 0,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj_matriz: '',
      tipo: 'EMBARCADOR',
      classe: 'COMÉRCIO',
      comissao_hubfrete_percent: 0,
    });
    setSelectedEmpresa(null);
  };

  const openFilialDialog = (empresa: Empresa, filial?: Filial) => {
    setSelectedEmpresa(empresa);
    setSelectedFilial(filial || null);
    setFilialDialogOpen(true);
  };

  const openDeleteFilialDialog = (empresa: Empresa, filial: Filial) => {
    setSelectedEmpresa(empresa);
    setSelectedFilial(filial);
    setDeleteFilialDialogOpen(true);
  };

  const handleDeleteFilial = async () => {
    if (!selectedFilial) return;

    setIsDeletingFilial(true);
    try {
      // First delete usuarios_filiais associations
      await supabase.from('usuarios_filiais').delete().eq('filial_id', selectedFilial.id);
      
      const { error } = await supabase
        .from('filiais')
        .delete()
        .eq('id', selectedFilial.id);

      if (error) throw error;

      toast.success('Filial excluída com sucesso!');
      setDeleteFilialDialogOpen(false);
      setSelectedFilial(null);
      fetchEmpresas();
    } catch (error: any) {
      console.error('Erro ao excluir filial:', error);
      toast.error(error.message || 'Erro ao excluir filial');
    } finally {
      setIsDeletingFilial(false);
    }
  };

  const openAddUserDialog = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setAddUserDialogOpen(true);
  };

  const toggleExpanded = (empresaId: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(empresaId)) {
        next.delete(empresaId);
      } else {
        next.add(empresaId);
      }
      return next;
    });
  };

  const filteredEmpresas = empresas.filter(empresa => {
    const matchesSearch = 
      empresa.nome?.toLowerCase().includes(search.toLowerCase()) ||
      empresa.cnpj_matriz?.includes(search.replace(/\D/g, ''));
    const matchesTipo = filterTipo === 'all' || empresa.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmpresas.length / ITEMS_PER_PAGE);
  const paginatedEmpresas = filteredEmpresas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTipo]);

  const formatCnpj = (cnpj: string | null) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const EmpresaFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome da Empresa *</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Nome fantasia ou razão social"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ *</Label>
        <Input
          id="cnpj"
          value={formData.cnpj_matriz}
          onChange={(e) => setFormData({ ...formData, cnpj_matriz: e.target.value })}
          placeholder="00.000.000/0000-00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select 
            value={formData.tipo} 
            onValueChange={(v: TipoEmpresa) => setFormData({ ...formData, tipo: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMBARCADOR">Embarcador</SelectItem>
              <SelectItem value="TRANSPORTADORA">Transportadora</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Classe *</Label>
          <Select 
            value={formData.classe} 
            onValueChange={(v: ClasseEmpresa) => setFormData({ ...formData, classe: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INDÚSTRIA">Indústria</SelectItem>
              <SelectItem value="LOJA">Loja</SelectItem>
              <SelectItem value="COMÉRCIO">Comércio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comissão HubFrete - only for Embarcadores */}
      {formData.tipo === 'EMBARCADOR' && (
        <div className="space-y-2">
          <Label htmlFor="comissao">Comissão HubFrete (%)</Label>
          <div className="relative">
            <Input
              id="comissao"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={formData.comissao_hubfrete_percent}
              onChange={(e) => setFormData({ ...formData, comissao_hubfrete_percent: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Percentual que a HubFrete retém sobre o frete das cargas deste embarcador.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Empresas
          </h1>
          <p className="text-muted-foreground">Gerenciar embarcadores e transportadoras</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Building2 className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{empresas.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Package className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {empresas.filter(e => e.tipo === 'EMBARCADOR').length}
                </p>
                <p className="text-sm text-muted-foreground">Embarcadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Truck className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {empresas.filter(e => e.tipo === 'TRANSPORTADORA').length}
                </p>
                <p className="text-sm text-muted-foreground">Transportadoras</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <MapPin className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {empresas.reduce((sum, e) => sum + (e._count?.filiais || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Filiais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="EMBARCADOR">Embarcadores</SelectItem>
            <SelectItem value="TRANSPORTADORA">Transportadoras</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                    <TableRow>
                     <TableHead className="w-[40px]"></TableHead>
                     <TableHead>Empresa</TableHead>
                     <TableHead>CNPJ</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead>Classe</TableHead>
                     <TableHead className="text-center">Comissão</TableHead>
                     <TableHead>Filiais</TableHead>
                     <TableHead>Usuários</TableHead>
                     <TableHead>Criado em</TableHead>
                     <TableHead className="w-[50px]"></TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmpresas.map((empresa) => {
                    const isExpanded = expandedRows.has(empresa.id);
                    return (
                      <>
                        <TableRow key={empresa.id} className={isExpanded ? 'border-b-0' : ''}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleExpanded(empresa.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {empresa.logo_url ? (
                                <img 
                                  src={empresa.logo_url} 
                                  alt={empresa.nome || ''} 
                                  className="w-8 h-8 rounded object-contain bg-muted"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{empresa.nome || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatCnpj(empresa.cnpj_matriz)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={empresa.tipo === 'EMBARCADOR' ? 'default' : 'secondary'}>
                                {empresa.tipo === 'EMBARCADOR' ? 'Embarcador' : 'Transportadora'}
                              </Badge>
                              {empresa.tipo === 'EMBARCADOR' && (empresa.comissao_hubfrete_percent ?? 0) > 0 && (
                                <Badge variant="outline" className="text-[10px] bg-chart-4/10 text-chart-4 border-chart-4/30">
                                  {empresa.comissao_hubfrete_percent}%
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{empresa.classe}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{empresa._count?.filiais || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{empresa._count?.usuarios || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(empresa.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(empresa)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(empresa)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {/* Expanded Row - Filiais & Users */}
                        {isExpanded && (
                          <TableRow key={`${empresa.id}-expanded`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="p-0">
                              <div className="p-4 space-y-4">
                                {/* Action buttons for company */}
                                <div className="flex gap-2 mb-4">
                                  <Button size="sm" onClick={() => openFilialDialog(empresa)}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Nova Filial
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openAddUserDialog(empresa)}>
                                    <UserPlus className="w-4 h-4 mr-1" />
                                    Adicionar Usuário
                                  </Button>
                                </div>

                                {empresa.filiais.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhuma filial cadastrada
                                  </p>
                                ) : (
                                  empresa.filiais.map(filial => (
                                    <Card key={filial.id} className="border-border">
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                              <MapPin className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">{filial.nome || 'Sem nome'}</span>
                                                {filial.is_matriz && (
                                                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                                    Matriz
                                                  </Badge>
                                                )}
                                                <Badge 
                                                  variant={filial.ativa ? 'default' : 'secondary'}
                                                  className={`text-[10px] px-1.5 py-0 ${filial.ativa ? 'bg-chart-1/10 text-chart-1' : ''}`}
                                                >
                                                  {filial.ativa ? 'Ativa' : 'Inativa'}
                                                </Badge>
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {filial.cidade && filial.estado 
                                                  ? `${filial.cidade}, ${filial.estado}`
                                                  : 'Local não informado'
                                                }
                                                {filial.cnpj && ` • ${formatCnpj(filial.cnpj)}`}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="shrink-0">
                                              <Users className="w-3 h-3 mr-1" />
                                              {filial.usuarios.length} usuário{filial.usuarios.length !== 1 ? 's' : ''}
                                            </Badge>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                  <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openFilialDialog(empresa, filial)}>
                                                  <Pencil className="w-4 h-4 mr-2" />
                                                  Editar Filial
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                  className="text-destructive"
                                                  onClick={() => openDeleteFilialDialog(empresa, filial)}
                                                >
                                                  <Trash2 className="w-4 h-4 mr-2" />
                                                  Excluir Filial
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>

                                        {/* Users table */}
                                        {filial.usuarios.length > 0 && (
                                          <div className="rounded-lg border bg-background overflow-hidden">
                                            <Table>
                                              <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                  <TableHead className="text-xs h-8">Usuário</TableHead>
                                                  <TableHead className="text-xs h-8">Email</TableHead>
                                                  <TableHead className="text-xs h-8">Cargo</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {filial.usuarios.map(usuario => (
                                                  <TableRow key={usuario.id}>
                                                    <TableCell className="py-2">
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                                          <User className="w-3 h-3 text-muted-foreground" />
                                                        </div>
                                                        <span className="text-sm">{usuario.nome || '-'}</span>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-sm text-muted-foreground">
                                                      {usuario.email || '-'}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                      <Badge variant="secondary" className="text-xs">
                                                        {cargoLabels[usuario.cargo || ''] || usuario.cargo || '-'}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredEmpresas.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Cadastrar uma nova empresa na plataforma
            </DialogDescription>
          </DialogHeader>
          <EmpresaFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEmpresa} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Atualizar dados da empresa
            </DialogDescription>
          </DialogHeader>
          <EmpresaFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditEmpresa} disabled={isEditing}>
              {isEditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteEmpresa}
        isDeleting={isDeleting}
        title="Excluir empresa?"
        description={`Tem certeza que deseja excluir a empresa "${selectedEmpresa?.nome}"? Todas as filiais associadas também serão removidas.`}
      />

      {/* Filial Form Dialog */}
      {selectedEmpresa && (
        <FilialFormDialog
          open={filialDialogOpen}
          onOpenChange={setFilialDialogOpen}
          empresaId={selectedEmpresa.id}
          empresaNome={selectedEmpresa.nome || ''}
          filial={selectedFilial}
          onSuccess={fetchEmpresas}
        />
      )}

      {/* Delete Filial Confirmation */}
      <DeleteConfirmDialog
        open={deleteFilialDialogOpen}
        onOpenChange={setDeleteFilialDialogOpen}
        onConfirm={handleDeleteFilial}
        isDeleting={isDeletingFilial}
        title="Excluir filial?"
        description={`Tem certeza que deseja excluir a filial "${selectedFilial?.nome}"? Todos os vínculos de usuários serão removidos.`}
      />

      {/* Add User to Company Dialog */}
      {selectedEmpresa && (
        <AddUserToCompanyDialog
          open={addUserDialogOpen}
          onOpenChange={setAddUserDialogOpen}
          empresaId={selectedEmpresa.id}
          empresaNome={selectedEmpresa.nome || ''}
          empresaTipo={selectedEmpresa.tipo}
          filiais={selectedEmpresa.filiais.map(f => ({ id: f.id, nome: f.nome }))}
          onSuccess={fetchEmpresas}
        />
      )}
    </div>
  );
}
