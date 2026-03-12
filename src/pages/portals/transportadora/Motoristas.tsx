
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  User,
  Plus,
  Search,
  Loader2,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Truck,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Car,
  Container,
  Link2,
  Share2,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useViewModePreference } from '@/hooks/useViewModePreference';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';
import { toast } from 'sonner';
import { format, isValid, parseISO } from 'date-fns';

import { MotoristaFormDialog } from '@/components/motoristas/MotoristaFormDialog';
import { MotoristaEditDialog } from '@/components/motoristas/MotoristaEditDialog';
import { MotoristaVinculosDialog } from '@/components/motoristas/MotoristaVinculosDialog';
import { DriverInviteLinksDialog } from '@/components/motoristas/DriverInviteLinksDialog';
import { 
  MotoristaCompleto, 
  VeiculoSimples, 
  CarroceriaSimples, 
  tipoVeiculoLabels, 
  tipoCarroceriaLabels 
} from '@/components/motoristas/types';

const ITEMS_PER_PAGE = 12;

// Column definitions
const columns: ColumnDefinition[] = [
  { id: 'motorista', label: 'Motorista', minWidth: '200px', sticky: 'left', sortable: true, sortKey: 'nome' },
  { id: 'cpf', label: 'CPF', minWidth: '140px', sortable: true, sortKey: 'cpf' },
  { id: 'telefone', label: 'Telefone', minWidth: '130px' },
  { id: 'cnh', label: 'CNH', minWidth: '60px', sortable: true, sortKey: 'categoria_cnh' },
  { id: 'validade_cnh', label: 'Validade CNH', minWidth: '120px', sortable: true, sortKey: 'validade_cnh' },
  { id: 'tipo', label: 'Tipo', minWidth: '100px', sortable: true, sortKey: 'tipo_cadastro' },
  { id: 'status', label: 'Status', minWidth: '80px', sortable: true, sortKey: 'ativo' },
  { id: 'equipamentos', label: 'Equipamentos', minWidth: '200px' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

export default function Motoristas() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVinculosDialogOpen, setIsVinculosDialogOpen] = useState(false);
  const [isInviteLinksDialogOpen, setIsInviteLinksDialogOpen] = useState(false);
  const [deletingMotoristaId, setDeletingMotoristaId] = useState<string | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<MotoristaCompleto | null>(null);


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
    persistKey: 'motoristas-columns',
  });

  // Fetch motoristas
  const { data: motoristas = [], isLoading } = useQuery({
    queryKey: ['motoristas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          id, nome_completo, cpf, email, telefone, uf, tipo_cadastro,
          cnh, categoria_cnh, validade_cnh, cnh_tem_qrcode, cnh_digital_url,
          comprovante_endereco_url, comprovante_endereco_titular_nome,
          comprovante_endereco_titular_doc_url, comprovante_vinculo_url,
          possui_ajudante, ativo, foto_url,
          veiculos:veiculos!veiculos_motorista_padrao_id_fkey(id, placa, tipo, marca, modelo, uf, antt_rntrc, documento_veiculo_url, comprovante_endereco_proprietario_url, proprietario_nome, proprietario_cpf_cnpj, carroceria_integrada, capacidade_kg, capacidade_m3, carrocerias:carrocerias!carrocerias_veiculo_id_fkey(id, placa, tipo, marca, modelo, capacidade_kg, capacidade_m3)),
          ajudantes(id, nome, cpf, telefone, tipo_cadastro, comprovante_vinculo_url, ativo)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Flatten carrocerias from nested veiculos into top-level field
      return (data || []).map((m: any) => ({
        ...m,
        carrocerias: (m.veiculos || []).flatMap((v: any) => v.carrocerias || []),
        veiculos: (m.veiculos || []).map((v: any) => {
          const { carrocerias, ...rest } = v;
          return rest;
        }),
      })) as MotoristaCompleto[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch veículos disponíveis
  const { data: veiculosDisponiveis = [] } = useQuery({
    queryKey: ['veiculos_disponiveis', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, marca, modelo, uf, antt_rntrc, documento_veiculo_url, comprovante_endereco_proprietario_url, proprietario_nome, proprietario_cpf_cnpj')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('placa');
      if (error) throw error;
      return (data || []) as VeiculoSimples[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch carrocerias disponíveis
  const { data: carroceriasDisponiveis = [] } = useQuery({
    queryKey: ['carrocerias_disponiveis', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('carrocerias')
        .select('id, placa, tipo, marca, modelo, capacidade_kg, capacidade_m3')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('placa');
      if (error) throw error;
      return (data || []) as CarroceriaSimples[];
    },
    enabled: !!empresa?.id,
  });

  // Mutations
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('motoristas').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const deleteMotorista = useMutation({
    mutationFn: async (id: string) => {
      setDeletingMotoristaId(id);
      const { data, error } = await supabase.functions.invoke('delete-driver-auth', {
        body: { motorista_id: id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao excluir motorista');
    },
    onSuccess: () => {
      toast.success('Motorista removido!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos_disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['carrocerias_disponiveis'] });
      setDeletingMotoristaId(null);
    },
    onError: () => {
      toast.error('Erro ao remover motorista');
      setDeletingMotoristaId(null);
    },
  });

  const filteredMotoristas = useMemo(() => {
    return motoristas.filter(
      (m) =>
        m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cpf?.includes(searchTerm) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [motoristas, searchTerm]);

  // Custom sort functions
  const sortFunctions = useMemo(() => ({
    nome: (a: MotoristaCompleto, b: MotoristaCompleto) =>
      a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'),
    cpf: (a: MotoristaCompleto, b: MotoristaCompleto) =>
      (a.cpf || '').localeCompare(b.cpf || '', 'pt-BR'),
    categoria_cnh: (a: MotoristaCompleto, b: MotoristaCompleto) =>
      a.categoria_cnh.localeCompare(b.categoria_cnh, 'pt-BR'),
    validade_cnh: (a: MotoristaCompleto, b: MotoristaCompleto) =>
      new Date(a.validade_cnh || 0).getTime() - new Date(b.validade_cnh || 0).getTime(),
    ativo: (a: MotoristaCompleto, b: MotoristaCompleto) =>
      (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1),
    tipo_cadastro: (a: MotoristaCompleto, b: MotoristaCompleto) =>
      (a.tipo_cadastro || '').localeCompare(b.tipo_cadastro || '', 'pt-BR'),
  }), []);

  const { sortedData, requestSort, getSortDirection } = useTableSort({
    data: filteredMotoristas,
    defaultSort: { key: 'nome', direction: 'asc' },
    persistKey: 'motoristas-transportadora',
    sortFunctions,
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedMotoristas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatValidadeCNH = (validade: string | null | undefined): string => {
    if (!validade) return 'Não informada';
    try {
      const date = parseISO(validade);
      if (!isValid(date)) return 'Data inválida';
      return format(date, 'dd/MM/yyyy');
    } catch { return 'Data inválida'; }
  };

  const getCNHStatus = (validade: string | null | undefined) => {
    if (!validade) return 'unknown';
    try {
      const date = parseISO(validade);
      if (!isValid(date)) return 'unknown';
      const dias = (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      if (dias < 0) return 'expired';
      if (dias <= 30) return 'expiring';
      return 'valid';
    } catch { return 'unknown'; }
  };

  const formatCPF = (cpf: string | null | undefined) => {
    if (!cpf) return 'Não informado';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const stats = useMemo(() => ({
    total: motoristas.length,
    ativos: motoristas.filter((m) => m.ativo).length,
    comVeiculo: motoristas.filter((m) => m.veiculos?.length > 0).length,
    cnhVencendo: motoristas.filter((m) => getCNHStatus(m.validade_cnh) === 'expiring').length,
    cnhVencida: motoristas.filter((m) => getCNHStatus(m.validade_cnh) === 'expired').length,
  }), [motoristas]);

  const handleEdit = (motorista: MotoristaCompleto) => {
    setSelectedMotorista(motorista);
    setIsEditDialogOpen(true);
  };

  const handleVinculos = (motorista: MotoristaCompleto) => {
    setSelectedMotorista(motorista);
    setIsVinculosDialogOpen(true);
  };

  // Get column icon
  const getColumnIcon = (columnId: string) => {
    const icons: Record<string, React.ReactNode> = {
      motorista: <User className="w-3.5 h-3.5" />,
      cpf: <CreditCard className="w-3.5 h-3.5" />,
      telefone: <Phone className="w-3.5 h-3.5" />,
      cnh: null,
      validade_cnh: <Calendar className="w-3.5 h-3.5" />,
      tipo: null,
      status: null,
      equipamentos: <Truck className="w-3.5 h-3.5" />,
    };
    return icons[columnId] || null;
  };

  // Render cell based on column ID
  const renderCell = (columnId: string, motorista: MotoristaCompleto) => {
    const cnhStatus = getCNHStatus(motorista.validade_cnh);
    const isDeleting = deletingMotoristaId === motorista.id;
    const isAtivo = motorista.ativo !== false;

    switch (columnId) {
      case 'motorista':
        return (
          <td className="p-4 align-middle sticky left-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={motorista.foto_url || undefined} alt={motorista.nome_completo} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {motorista.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-nowrap">{motorista.nome_completo}</span>
            </div>
          </td>
        );
      case 'cpf':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">
            {formatCPF(motorista.cpf)}
          </td>
        );
      case 'telefone':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">
            {motorista.telefone || '-'}
          </td>
        );
      case 'cnh':
        return (
          <td className="p-4 align-middle">
            <Badge variant="secondary">{motorista.categoria_cnh}</Badge>
          </td>
        );
      case 'validade_cnh':
        return (
          <td className="p-4 align-middle">
            <Badge 
              variant={cnhStatus === 'expired' ? 'destructive' : cnhStatus === 'expiring' ? 'outline' : 'secondary'} 
              className={cnhStatus === 'expiring' ? 'bg-chart-4/10 text-chart-4 border-chart-4/20' : ''}
            >
              {formatValidadeCNH(motorista.validade_cnh)}
            </Badge>
          </td>
        );
      case 'tipo': {
        const tipoLabels: Record<string, string> = { frota: 'Frota', autonomo: 'Autônomo' };
        const tipo = motorista.tipo_cadastro || 'frota';
        return (
          <td className="p-4 align-middle">
            <Badge variant="outline" className={
              tipo === 'autonomo' ? 'bg-chart-5/10 text-chart-5 border-chart-5/20' :
              'bg-primary/10 text-primary border-primary/20'
            }>
              {tipoLabels[tipo] || tipo}
            </Badge>
          </td>
        );
      }
      case 'status':
        return (
          <td className="p-4 align-middle">
            <Badge 
              variant={isAtivo ? 'outline' : 'destructive'} 
              className={isAtivo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}
            >
              {isAtivo ? 'Ativo' : 'Inativo'}
            </Badge>
          </td>
        );
      case 'equipamentos':
        return (
          <td className="p-4 align-middle">
            <div className="flex gap-1 flex-wrap">
              {motorista.veiculos?.map((v) => (
                <Badge key={v.id} variant="outline" className="text-xs gap-1">
                  <Car className="w-3 h-3" />{v.placa}
                </Badge>
              ))}
              {motorista.carrocerias?.map((c) => (
                <Badge key={c.id} variant="outline" className="text-xs gap-1">
                  <Container className="w-3 h-3" />{c.placa}
                </Badge>
              ))}
              {(!motorista.veiculos || motorista.veiculos.length === 0) && (!motorista.carrocerias || motorista.carrocerias.length === 0) && (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </div>
          </td>
        );
      case 'acoes':
        return (
          <td className="p-4 align-middle sticky right-0 bg-background z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(motorista)}>
                  <Edit className="w-4 h-4 mr-2" />Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toggleAtivo.mutate({ id: motorista.id, ativo: !isAtivo })}>
                  {isAtivo ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {isAtivo ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteMotorista.mutate(motorista.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  // Render Card for Grid view
  const renderMotoristaCard = (motorista: MotoristaCompleto) => {
    const cnhStatus = getCNHStatus(motorista.validade_cnh);
    const isDeleting = deletingMotoristaId === motorista.id;
    const isAtivo = motorista.ativo !== false;
    
    return (
      <Card key={motorista.id} className={`border-border ${!isAtivo ? 'opacity-60' : ''} ${isDeleting ? 'pointer-events-none' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={motorista.foto_url || undefined} alt={motorista.nome_completo} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {motorista.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">{motorista.nome_completo}</h3>
                  <Badge 
                    variant={isAtivo ? 'outline' : 'destructive'} 
                    className={`text-[10px] ${isAtivo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}`}
                  >
                    {isAtivo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{formatCPF(motorista.cpf)}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{motorista.categoria_cnh}</Badge>
                  <Badge 
                    variant={cnhStatus === 'expired' ? 'destructive' : cnhStatus === 'expiring' ? 'outline' : 'secondary'} 
                    className={`text-[10px] ${cnhStatus === 'expiring' ? 'bg-chart-4/10 text-chart-4 border-chart-4/20' : ''}`}
                  >
                    {formatValidadeCNH(motorista.validade_cnh)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" disabled={isDeleting}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(motorista)}>
                  <Edit className="w-4 h-4 mr-2" />Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toggleAtivo.mutate({ id: motorista.id, ativo: !isAtivo })}>
                  {isAtivo ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {isAtivo ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteMotorista.mutate(motorista.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Equipamentos */}
          <div className="flex gap-1 mt-3 flex-wrap">
            {motorista.veiculos?.map((v) => (
              <Badge key={v.id} variant="outline" className="text-xs gap-1">
                <Car className="w-3 h-3" />{v.placa}
              </Badge>
            ))}
            {motorista.carrocerias?.map((c) => (
              <Badge key={c.id} variant="outline" className="text-xs gap-1">
                <Container className="w-3 h-3" />{c.placa}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col h-full gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Motoristas</h1>
            <p className="text-muted-foreground">Gerencie os motoristas da sua transportadora</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsInviteLinksDialogOpen(true)}>
              <Share2 className="w-4 h-4" />
              Link de Convite
            </Button>
            <Button className="gap-2" onClick={() => setIsFormDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Novo Motorista
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
          {[
            { icon: User, value: stats.total, label: 'Total', color: 'primary' },
            { icon: CheckCircle, value: stats.ativos, label: 'Ativos', color: 'chart-2' },
            { icon: Truck, value: stats.comVeiculo, label: 'Com Veículo', color: 'chart-1' },
            { icon: Calendar, value: stats.cnhVencendo, label: 'CNH Vencendo', color: 'chart-4' },
            { icon: XCircle, value: stats.cnhVencida, label: 'CNH Vencida', color: 'destructive' },
          ].map((stat, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 bg-${stat.color}/10 rounded-xl`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shrink-0">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
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
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedData.length === 0 ? (
          <Card className="border-border flex-1">
            <CardContent className="p-12 text-center flex flex-col items-center justify-center h-full">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum motorista encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhum motorista corresponde à busca.' : 'Adicione motoristas à sua equipe.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsFormDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Motorista
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          /* List View */
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
                    {paginatedMotoristas.map((motorista) => (
                      <tr key={motorista.id} className={`border-b transition-colors hover:bg-muted/30 ${motorista.ativo === false ? 'opacity-60' : ''}`}>
                        {orderedColumns.map((col) => (
                          <React.Fragment key={col.id}>
                            {renderCell(col.id, motorista)}
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
                {paginatedMotoristas.map(renderMotoristaCard)}
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

      {/* Dialogs */}
      <MotoristaFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        empresaId={empresa?.id}
      />

      {selectedMotorista && (
        <>
          <MotoristaEditDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            motorista={selectedMotorista}
          />
          <MotoristaVinculosDialog
            open={isVinculosDialogOpen}
            onOpenChange={setIsVinculosDialogOpen}
            motorista={selectedMotorista}
            veiculosDisponiveis={veiculosDisponiveis}
            carroceriasDisponiveis={carroceriasDisponiveis}
          />
        </>
      )}

      {empresa?.id && (
        <DriverInviteLinksDialog
          open={isInviteLinksDialogOpen}
          onOpenChange={setIsInviteLinksDialogOpen}
          empresaId={empresa.id}
        />
      )}
    </div>
  );
}
