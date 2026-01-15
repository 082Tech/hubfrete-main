import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  Truck,
  MapPin,
  Weight,
  DollarSign,
  RotateCcw,
  MoreHorizontal,
} from 'lucide-react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';

type StatusEntrega = 'entregue' | 'devolvida' | 'problema';

const statusConfig: Record<StatusEntrega, { label: string; color: string; icon: React.ElementType }> = {
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  devolvida: { label: 'Devolvida', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

interface EntregaHistorico {
  id: string;
  status: string;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  entregue_em: string | null;
  created_at: string | null;
  motorista: { nome_completo: string } | null;
  veiculo: { placa: string; modelo: string | null } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    tipo: string;
    peso_kg: number;
    valor_mercadoria: number | null;
    valor_frete_tonelada: number | null;
    filial_id: number | null;
    endereco_origem: {
      cidade: string;
      estado: string;
      logradouro: string;
      bairro: string | null;
    } | null;
    endereco_destino: {
      cidade: string;
      estado: string;
      logradouro: string;
      bairro: string | null;
    } | null;
  } | null;
}

export default function HistoricoCargas() {
  const { filialAtiva, filiais } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaHistorico | null>(null);

  const filialIds = filialAtiva ? [filialAtiva.id] : filiais.map(f => f.id);

  // Buscar entregas finalizadas (entregue, devolvida, problema)
  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['historico-entregas', filialIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          peso_alocado_kg,
          valor_frete,
          entregue_em,
          created_at,
          motorista:motoristas (nome_completo),
          veiculo:veiculos (placa, modelo),
          carga:cargas!inner (
            id,
            codigo,
            descricao,
            tipo,
            peso_kg,
            valor_mercadoria,
            valor_frete_tonelada,
            filial_id,
            endereco_origem:enderecos_carga!cargas_endereco_origem_fkey (
              cidade, estado, logradouro, bairro
            ),
            endereco_destino:enderecos_carga!cargas_endereco_destino_fkey (
              cidade, estado, logradouro, bairro
            )
          )
        `)
        .in('status', ['entregue', 'devolvida', 'problema'])
        .order('entregue_em', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Filtrar por filial
      const filtered = (data || []).filter((entrega: any) => 
        filialIds.includes(entrega.carga?.filial_id)
      );
      
      return filtered as EntregaHistorico[];
    },
    enabled: filialIds.length > 0,
  });

  // Calculate stats
  const stats = {
    totalEntregues: entregas.filter(e => e.status === 'entregue').length,
    totalDevolvidas: entregas.filter(e => e.status === 'devolvida' || e.status === 'problema').length,
    pesoTotal: entregas.filter(e => e.status === 'entregue').reduce((acc, e) => acc + (e.peso_alocado_kg || 0), 0),
    valorFrete: entregas.filter(e => e.status === 'entregue').reduce((acc, e) => acc + (e.valor_frete || 0), 0),
  };

  // Filter entregas
  const filteredEntregas = entregas.filter(entrega => {
    const matchesSearch =
      entrega.carga?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.carga?.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.carga?.endereco_origem?.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.carga?.endereco_destino?.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || entrega.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatWeight = (kg: number | null) => {
    if (!kg) return '-';
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-7 h-7 text-primary" />
                Histórico de Entregas
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize todas as entregas finalizadas
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Relatório
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entregues</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalEntregues}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Devolvidas</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalDevolvidas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Weight className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Transportado</p>
                    <p className="text-2xl font-bold text-foreground">{formatWeight(stats.pesoTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Frete</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.valorFrete)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, descrição, cidade ou motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="entregue">Entregues</SelectItem>
                    <SelectItem value="devolvida">Devolvidas</SelectItem>
                    <SelectItem value="problema">Com Problema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {filteredEntregas.length} {filteredEntregas.length === 1 ? 'entrega encontrada' : 'entregas encontradas'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Código</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Origem</TableHead>
                      <TableHead className="font-semibold">Destino</TableHead>
                      <TableHead className="font-semibold">Peso</TableHead>
                      <TableHead className="font-semibold">Frete</TableHead>
                      <TableHead className="font-semibold">Motorista</TableHead>
                      <TableHead className="font-semibold">Data Conclusão</TableHead>
                      <TableHead className="font-semibold w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredEntregas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          Nenhuma entrega encontrada no histórico
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntregas.map((entrega) => {
                        const status = entrega.status as StatusEntrega;
                        const config = statusConfig[status] || statusConfig.entregue;
                        const StatusIcon = config?.icon || Package;
                        const dataFinal = entrega.entregue_em || entrega.created_at;

                        return (
                          <TableRow key={entrega.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium text-primary">
                              {entrega.carga?.codigo || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${config?.color} border gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {config?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 cursor-help">
                                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                                    <span className="truncate max-w-[120px]">
                                      {entrega.carga?.endereco_origem?.cidade || '-'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {entrega.carga?.endereco_origem?.logradouro}, {entrega.carga?.endereco_origem?.bairro}<br />
                                  {entrega.carga?.endereco_origem?.cidade}/{entrega.carga?.endereco_origem?.estado}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 cursor-help">
                                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                                    <span className="truncate max-w-[120px]">
                                      {entrega.carga?.endereco_destino?.cidade || '-'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {entrega.carga?.endereco_destino?.logradouro}, {entrega.carga?.endereco_destino?.bairro}<br />
                                  {entrega.carga?.endereco_destino?.cidade}/{entrega.carga?.endereco_destino?.estado}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatWeight(entrega.peso_alocado_kg)}
                            </TableCell>
                            <TableCell className="font-medium text-emerald-600">
                              {formatCurrency(entrega.valor_frete)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="truncate max-w-[100px]">
                                  {entrega.motorista?.nome_completo || '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {dataFinal ? format(new Date(dataFinal), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="gap-2 cursor-pointer"
                                    onClick={() => setSelectedEntrega(entrega)}
                                  >
                                    <Eye className="w-4 h-4" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Details Dialog */}
      {selectedEntrega?.carga && (
        <CargaDetailsDialog
          carga={{
            id: selectedEntrega.carga.id,
            codigo: selectedEntrega.carga.codigo,
            descricao: selectedEntrega.carga.descricao,
            tipo: selectedEntrega.carga.tipo,
            peso_kg: selectedEntrega.peso_alocado_kg || selectedEntrega.carga.peso_kg,
            volume_m3: null,
            valor_mercadoria: selectedEntrega.carga.valor_mercadoria,
            status: selectedEntrega.status as any,
            data_coleta_de: null,
            data_coleta_ate: null,
            data_entrega_limite: null,
            created_at: selectedEntrega.created_at,
            remetente: selectedEntrega.carga.endereco_origem ? {
              nome: selectedEntrega.carga.endereco_origem.cidade,
              cidade: selectedEntrega.carga.endereco_origem.cidade,
              estado: selectedEntrega.carga.endereco_origem.estado,
              endereco: selectedEntrega.carga.endereco_origem.logradouro,
            } : null,
            destinatario: selectedEntrega.carga.endereco_destino ? {
              nome: selectedEntrega.carga.endereco_destino.cidade,
              cidade: selectedEntrega.carga.endereco_destino.cidade,
              estado: selectedEntrega.carga.endereco_destino.estado,
              endereco: selectedEntrega.carga.endereco_destino.logradouro,
            } : null,
            entregas: {
              status: selectedEntrega.status as any,
              motoristas: selectedEntrega.motorista ? {
                nome_completo: selectedEntrega.motorista.nome_completo,
                telefone: null,
              } : null,
              veiculos: selectedEntrega.veiculo ? {
                placa: selectedEntrega.veiculo.placa,
                marca: null,
                modelo: selectedEntrega.veiculo.modelo,
                tipo: null,
              } : null,
            },
          }}
          open={!!selectedEntrega}
          onOpenChange={(open) => !open && setSelectedEntrega(null)}
        />
      )}
    </PortalLayout>
  );
}