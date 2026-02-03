import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  MapPin,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useRemainingViewportHeight } from '@/hooks/useRemainingViewportHeight';
import { useViewModePreference } from '@/hooks/useViewModePreference';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';

const ITEMS_PER_PAGE = 12;

interface Filial {
  id: number;
  nome: string | null;
  cnpj: string | null;
  empresa_id: number | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  responsavel: string | null;
  ativa: boolean | null;
  is_matriz: boolean | null;
}

interface NewFilialForm {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  responsavel: string;
}

const initialFormState: NewFilialForm = {
  nome: '',
  cnpj: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  telefone: '',
  email: '',
  responsavel: '',
};

// Column definitions
const columns: ColumnDefinition[] = [
  { id: 'filial', label: 'Filial', minWidth: '200px', sticky: 'left', sortable: true, sortKey: 'nome' },
  { id: 'cnpj', label: 'CNPJ', minWidth: '160px' },
  { id: 'cidade', label: 'Cidade/UF', minWidth: '140px', sortable: true, sortKey: 'cidade' },
  { id: 'telefone', label: 'Telefone', minWidth: '130px' },
  { id: 'responsavel', label: 'Responsável', minWidth: '150px', sortable: true, sortKey: 'responsavel' },
  { id: 'status', label: 'Status', minWidth: '100px', sortable: true, sortKey: 'ativa' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

export default function GerenciarFiliais() {
  const { empresa, loading: contextLoading } = useUserContext();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [formData, setFormData] = useState<NewFilialForm>(initialFormState);
  const [saving, setSaving] = useState(false);

  const { ref: tableCardRef, height: tableCardHeight } = useRemainingViewportHeight<HTMLDivElement>({
    bottomOffset: 32,
    minHeight: 320,
  });

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
    persistKey: 'filiais-transportadora-columns',
  });

  const loadFiliais = async () => {
    if (!empresa?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('is_matriz', { ascending: false })
        .order('nome', { ascending: true });

      if (error) throw error;
      setFiliais((data as Filial[]) || []);
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
      toast.error('Erro ao carregar filiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresa?.id) {
      loadFiliais();
    }
  }, [empresa?.id]);

  const filteredFiliais = useMemo(() => {
    return filiais.filter(filial => 
      (filial.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (filial.cidade?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (filial.estado?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [filiais, searchTerm]);

  // Custom sort functions
  const sortFunctions = useMemo(() => ({
    nome: (a: Filial, b: Filial) =>
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR'),
    cidade: (a: Filial, b: Filial) =>
      (a.cidade || '').localeCompare(b.cidade || '', 'pt-BR'),
    responsavel: (a: Filial, b: Filial) =>
      (a.responsavel || '').localeCompare(b.responsavel || '', 'pt-BR'),
    ativa: (a: Filial, b: Filial) =>
      (a.ativa === b.ativa ? 0 : a.ativa ? -1 : 1),
  }), []);

  const { sortedData, requestSort, getSortDirection } = useTableSort({
    data: filteredFiliais,
    defaultSort: { key: 'nome', direction: 'asc' },
    persistKey: 'filiais-transportadora',
    sortFunctions,
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedFiliais = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleFormChange = (field: keyof NewFilialForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFilial = async () => {
    if (!empresa?.id) {
      toast.error('Empresa não encontrada');
      return;
    }

    if (!formData.nome.trim()) {
      toast.error('Nome da filial é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('filiais')
        .insert({
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          empresa_id: empresa.id,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          telefone: formData.telefone || null,
          email: formData.email || null,
          responsavel: formData.responsavel || null,
          ativa: true,
          is_matriz: false,
        });

      if (error) throw error;

      toast.success('Filial adicionada com sucesso!');
      setIsAddDialogOpen(false);
      setFormData(initialFormState);
      loadFiliais();
    } catch (error) {
      console.error('Erro ao adicionar filial:', error);
      toast.error('Erro ao adicionar filial');
    } finally {
      setSaving(false);
    }
  };

  const handleEditFilial = async () => {
    if (!editingFilial) return;

    if (!formData.nome.trim()) {
      toast.error('Nome da filial é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('filiais')
        .update({
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          telefone: formData.telefone || null,
          email: formData.email || null,
          responsavel: formData.responsavel || null,
        })
        .eq('id', editingFilial.id);

      if (error) throw error;

      toast.success('Filial atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setEditingFilial(null);
      setFormData(initialFormState);
      loadFiliais();
    } catch (error) {
      console.error('Erro ao atualizar filial:', error);
      toast.error('Erro ao atualizar filial');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (filial: Filial) => {
    setEditingFilial(filial);
    setFormData({
      nome: filial.nome || '',
      cnpj: filial.cnpj || '',
      endereco: filial.endereco || '',
      cidade: filial.cidade || '',
      estado: filial.estado || '',
      cep: filial.cep || '',
      telefone: filial.telefone || '',
      email: filial.email || '',
      responsavel: filial.responsavel || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleStatus = async (filial: Filial) => {
    try {
      const { error } = await supabase
        .from('filiais')
        .update({ ativa: !filial.ativa })
        .eq('id', filial.id);

      if (error) throw error;

      toast.success(filial.ativa ? 'Filial desativada' : 'Filial ativada');
      loadFiliais();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status da filial');
    }
  };

  const handleDelete = async (filial: Filial) => {
    if (filial.is_matriz) {
      toast.error('Não é possível excluir a matriz');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta filial?')) return;

    try {
      const { error } = await supabase
        .from('filiais')
        .delete()
        .eq('id', filial.id);

      if (error) throw error;

      toast.success('Filial removida com sucesso');
      loadFiliais();
    } catch (error) {
      console.error('Erro ao excluir filial:', error);
      toast.error('Erro ao excluir filial');
    }
  };

  const stats = {
    total: filiais.length,
    ativas: filiais.filter(f => f.ativa).length,
    inativas: filiais.filter(f => !f.ativa).length,
    estados: new Set(filiais.map(f => f.estado).filter(Boolean)).size,
  };

  const FormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome da Filial *</Label>
        <Input 
          id="nome" 
          placeholder="Ex: Filial Centro"
          value={formData.nome}
          onChange={(e) => handleFormChange('nome', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <MaskedInput 
          id="cnpj" 
          mask="cnpj"
          placeholder="00.000.000/0000-00"
          value={formData.cnpj}
          onChange={(value) => handleFormChange('cnpj', value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input 
            id="cidade" 
            placeholder="Cidade"
            value={formData.cidade}
            onChange={(e) => handleFormChange('cidade', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Input 
            id="estado" 
            placeholder="UF" 
            maxLength={2}
            value={formData.estado}
            onChange={(e) => handleFormChange('estado', e.target.value.toUpperCase())}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input 
          id="endereco" 
          placeholder="Rua, número, bairro"
          value={formData.endereco}
          onChange={(e) => handleFormChange('endereco', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <Input 
            id="cep" 
            placeholder="00000-000"
            value={formData.cep}
            onChange={(e) => handleFormChange('cep', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input 
            id="telefone" 
            placeholder="(00) 0000-0000"
            value={formData.telefone}
            onChange={(e) => handleFormChange('telefone', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="filial@empresa.com.br"
          value={formData.email}
          onChange={(e) => handleFormChange('email', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="responsavel">Responsável</Label>
        <Input 
          id="responsavel" 
          placeholder="Nome do responsável"
          value={formData.responsavel}
          onChange={(e) => handleFormChange('responsavel', e.target.value)}
        />
      </div>
    </div>
  );

  // Get column icon
  const getColumnIcon = (columnId: string) => {
    const icons: Record<string, React.ReactNode> = {
      filial: <Building2 className="w-3.5 h-3.5" />,
      cidade: <MapPin className="w-3.5 h-3.5" />,
      telefone: <Phone className="w-3.5 h-3.5" />,
    };
    return icons[columnId] || null;
  };

  // Render cell based on column ID
  const renderCell = (columnId: string, filial: Filial) => {
    switch (columnId) {
      case 'filial':
        return (
          <td className="p-4 align-middle sticky left-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                filial.is_matriz 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'bg-muted'
              }`}>
                <Building2 className={`w-4 h-4 ${filial.is_matriz ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-nowrap">{filial.nome || 'Sem nome'}</span>
                {filial.is_matriz && (
                  <Badge variant="default" className="text-[10px]">Matriz</Badge>
                )}
              </div>
            </div>
          </td>
        );
      case 'cnpj':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">
            {filial.cnpj || '-'}
          </td>
        );
      case 'cidade':
        return (
          <td className="p-4 align-middle text-nowrap">
            {[filial.cidade, filial.estado].filter(Boolean).join('/') || '-'}
          </td>
        );
      case 'telefone':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">
            {filial.telefone || '-'}
          </td>
        );
      case 'responsavel':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">
            {filial.responsavel || '-'}
          </td>
        );
      case 'status':
        return (
          <td className="p-4 align-middle">
            <Badge 
              variant={filial.ativa ? 'outline' : 'secondary'} 
              className={filial.ativa ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
            >
              {filial.ativa ? 'Ativa' : 'Inativa'}
            </Badge>
          </td>
        );
      case 'acoes':
        return (
          <td className="p-4 align-middle sticky right-0 bg-background z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(filial)}>
                  <Edit className="w-4 h-4 mr-2" />Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(filial)}>
                  {filial.ativa ? (
                    <><XCircle className="w-4 h-4 mr-2" />Desativar</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" />Ativar</>
                  )}
                </DropdownMenuItem>
                {!filial.is_matriz && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(filial)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  const renderFilialCard = (filial: Filial) => (
    <Card key={filial.id} className={`border-border ${!filial.ativa ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              filial.is_matriz 
                ? 'bg-primary/10 border border-primary/20' 
                : 'bg-muted'
            }`}>
              <Building2 className={`w-5 h-5 ${filial.is_matriz ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{filial.nome || 'Sem nome'}</h3>
                {filial.is_matriz && (
                  <Badge variant="default" className="text-[10px]">Matriz</Badge>
                )}
                <Badge variant={filial.ativa ? 'outline' : 'secondary'} className={
                  filial.ativa ? 'bg-green-500/10 text-green-600 border-green-500/20 text-[10px]' : 'text-[10px]'
                }>
                  {filial.ativa ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {[filial.cidade, filial.estado].filter(Boolean).join(' - ') || 'Localização não informada'}
              </p>
              {filial.cnpj && (
                <p className="text-xs text-muted-foreground truncate mt-1">CNPJ: {filial.cnpj}</p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(filial)}>
                <Edit className="w-4 h-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => handleToggleStatus(filial)}>
                {filial.ativa ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              {!filial.is_matriz && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => handleDelete(filial)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  if (contextLoading || loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col h-full gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Filiais</h1>
            <p className="text-muted-foreground">Gerencie as filiais da sua transportadora</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Filial</DialogTitle>
                <DialogDescription>
                  Preencha os dados da nova filial abaixo.
                </DialogDescription>
              </DialogHeader>
              <FormFields />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddFilial} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Filiais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.ativas}</p>
                  <p className="text-xs text-muted-foreground">Filiais Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-500/10 rounded-lg">
                  <XCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.inativas}</p>
                  <p className="text-xs text-muted-foreground">Filiais Inativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.estados}</p>
                  <p className="text-xs text-muted-foreground">Estados</p>
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
              placeholder="Buscar por nome, cidade ou estado..." 
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
        {sortedData.length === 0 ? (
          <Card className="border-border flex-1">
            <CardContent className="p-12 text-center flex flex-col items-center justify-center h-full">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma filial encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar os termos da busca' : 'Adicione uma filial para começar'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card
            ref={tableCardRef}
            style={{ height: tableCardHeight }}
            className="border-border flex flex-col"
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
                    {paginatedFiliais.map((filial) => (
                      <tr key={filial.id} className={`border-b transition-colors hover:bg-muted/30 ${!filial.ativa ? 'opacity-60' : ''}`}>
                        {orderedColumns.map((col) => (
                          <React.Fragment key={col.id}>
                            {renderCell(col.id, filial)}
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
            ref={tableCardRef}
            style={{ height: tableCardHeight }}
            className="flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-auto">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedFiliais.map(renderFilialCard)}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Filial</DialogTitle>
            <DialogDescription>
              Atualize os dados da filial abaixo.
            </DialogDescription>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditFilial} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
