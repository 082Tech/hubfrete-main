
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ChevronsLeft,
  ChevronsRight,
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
import { useState, useMemo } from 'react';
import { useViewModePreference } from '@/hooks/useViewModePreference';
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
          veiculos(id, placa, tipo, marca, modelo, uf, antt_rntrc, documento_veiculo_url, comprovante_endereco_proprietario_url, proprietario_nome, proprietario_cpf_cnpj, motorista_id, carroceria_integrada, capacidade_kg, capacidade_m3),
          carrocerias(id, placa, tipo, marca, modelo, capacidade_kg, capacidade_m3, motorista_id),
          ajudantes(id, nome, cpf, telefone, tipo_cadastro, comprovante_vinculo_url, ativo)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MotoristaCompleto[];
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
        .select('id, placa, tipo, marca, modelo, uf, antt_rntrc, documento_veiculo_url, comprovante_endereco_proprietario_url, proprietario_nome, proprietario_cpf_cnpj, motorista_id')
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
        .select('id, placa, tipo, marca, modelo, capacidade_kg, capacidade_m3, motorista_id')
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
      // Use Edge Function to delete motorista and auth user
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

  // Reset page when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredMotoristas.length / ITEMS_PER_PAGE);
  const paginatedMotoristas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMotoristas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMotoristas, currentPage]);

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

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col h-full gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
            <ToggleGroupItem value="list" aria-label="Visualização em lista">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Visualização em cards">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMotoristas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
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
          <Card className="border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CNH</TableHead>
                    <TableHead>Validade CNH</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Equipamentos</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMotoristas.map((motorista) => {
                    const cnhStatus = getCNHStatus(motorista.validade_cnh);
                    const isDeleting = deletingMotoristaId === motorista.id;
                    const isAtivo = motorista.ativo !== false;
                    return (
                      <TableRow key={motorista.id} className={`${!isAtivo ? 'opacity-60' : ''} ${isDeleting ? 'pointer-events-none' : ''}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={motorista.foto_url || undefined} alt={motorista.nome_completo} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {motorista.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{motorista.nome_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatCPF(motorista.cpf)}</TableCell>
                        <TableCell className="text-muted-foreground">{motorista.telefone || '-'}</TableCell>
                        <TableCell><Badge variant="secondary">{motorista.categoria_cnh}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={cnhStatus === 'expired' ? 'destructive' : cnhStatus === 'expiring' ? 'outline' : 'secondary'} className={cnhStatus === 'expiring' ? 'bg-chart-4/10 text-chart-4 border-chart-4/20' : ''}>
                            {formatValidadeCNH(motorista.validade_cnh)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isAtivo ? 'outline' : 'destructive'} className={isAtivo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
                            {isAtivo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
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
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(motorista)}>
                                <Edit className="w-4 h-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVinculos(motorista)}>
                                <Link2 className="w-4 h-4 mr-2" />Gerenciar Vínculos
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleAtivo.mutate({ id: motorista.id, ativo: !isAtivo })}>
                                {isAtivo ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                {isAtivo ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteMotorista.mutate(motorista.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          /* Grid View - no Card wrapper */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedMotoristas.map((motorista) => {
              const cnhStatus = getCNHStatus(motorista.validade_cnh);
              const isDeleting = deletingMotoristaId === motorista.id;
              const isAtivo = motorista.ativo !== false;
              return (
                <Card key={motorista.id} className={`border-border transition-all relative h-full flex flex-col ${!isAtivo ? 'opacity-60' : 'hover:shadow-md'} ${isDeleting ? 'pointer-events-none' : ''}`}>
                  {isDeleting && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-destructive" />
                        <span className="text-sm text-muted-foreground">Removendo...</span>
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={motorista.foto_url || undefined} alt={motorista.nome_completo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {motorista.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-semibold">{motorista.nome_completo}</CardTitle>
                          <p className="text-sm text-muted-foreground">CPF: {formatCPF(motorista.cpf)}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(motorista)}>
                            <Edit className="w-4 h-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVinculos(motorista)}>
                            <Link2 className="w-4 h-4 mr-2" />Gerenciar Vínculos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleAtivo.mutate({ id: motorista.id, ativo: !isAtivo })}>
                            {isAtivo ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            {isAtivo ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMotorista.mutate(motorista.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={isAtivo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''} variant={isAtivo ? 'outline' : 'destructive'}>
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant="secondary">CNH {motorista.categoria_cnh}</Badge>
                      <Badge variant="secondary">{motorista.tipo_cadastro === 'frota' ? 'Frota' : 'Autônomo'}</Badge>
                      {cnhStatus === 'expiring' && <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">CNH Vencendo</Badge>}
                      {cnhStatus === 'expired' && <Badge variant="destructive">CNH Vencida</Badge>}
                    </div>

                    <div className="space-y-2 text-sm mt-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {motorista.telefone || 'Não informado'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Validade CNH: {formatValidadeCNH(motorista.validade_cnh)}
                      </div>
                    </div>

                    <div className="flex-1 min-h-4" />

                    <div className="pt-3 border-t border-border space-y-2 mt-4">
                      {motorista.veiculos?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {motorista.veiculos.map((v) => (
                            <Badge key={v.id} variant="outline" className="text-xs gap-1">
                              <Car className="w-3 h-3" />{v.placa}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Nenhum veículo vinculado</div>
                      )}
                      {motorista.carrocerias?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {motorista.carrocerias.map((c) => (
                            <Badge key={c.id} variant="outline" className="text-xs gap-1">
                              <Container className="w-3 h-3" />{c.placa}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-3 mt-4 bg-card rounded-lg border px-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredMotoristas.length)} de {filteredMotoristas.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <MotoristaFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        empresaId={empresa?.id || 0}
      />
      
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

      <DriverInviteLinksDialog
        open={isInviteLinksDialogOpen}
        onOpenChange={setIsInviteLinksDialogOpen}
        empresaId={empresa?.id || 0}
      />
    </div>
  );
}
