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
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';

type StatusCarga = 'entregue' | 'cancelada';

const statusConfig: Record<StatusCarga, { label: string; color: string; icon: React.ElementType }> = {
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function HistoricoCargas() {
  const { filialAtiva, filiais } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCarga, setSelectedCarga] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filialIds = filialAtiva ? [filialAtiva.id] : filiais.map(f => f.id);

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['historico-cargas', filialIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargas')
        .select(`
          *,
          endereco_origem:enderecos_carga!cargas_endereco_origem_fkey (
            cidade, estado, logradouro, bairro
          ),
          endereco_destino:enderecos_carga!cargas_endereco_destino_fkey (
            cidade, estado, logradouro, bairro
          ),
          entregas (
            id,
            status,
            entregue_em,
            motorista:motoristas (nome_completo),
            veiculo:veiculos (placa, modelo)
          )
        `)
        .in('filial_id', filialIds)
        .in('status', ['entregue', 'cancelada'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: filialIds.length > 0,
  });

  // Calculate stats
  const stats = {
    totalEntregues: cargas.filter(c => c.status === 'entregue').length,
    totalCanceladas: cargas.filter(c => c.status === 'cancelada').length,
    pesoTotal: cargas.filter(c => c.status === 'entregue').reduce((acc, c) => acc + (c.peso_kg || 0), 0),
    valorTotal: cargas.filter(c => c.status === 'entregue').reduce((acc, c) => acc + (c.valor_mercadoria || 0), 0),
  };

  // Filter cargas
  const filteredCargas = cargas.filter(carga => {
    const matchesSearch =
      carga.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.endereco_origem?.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.endereco_destino?.cidade?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || carga.status === statusFilter;

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

  const handleViewDetails = (carga: any) => {
    setSelectedCarga(carga);
    setDetailsOpen(true);
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <TooltipProvider>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-7 h-7 text-primary" />
                Histórico de Cargas
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize todas as cargas entregues e canceladas
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
                  <div className="p-2 rounded-lg bg-red-100">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Canceladas</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalCanceladas}</p>
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
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.valorTotal)}</p>
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
                    placeholder="Buscar por código, descrição ou cidade..."
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
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {filteredCargas.length} {filteredCargas.length === 1 ? 'carga encontrada' : 'cargas encontradas'}
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
                      <TableHead className="font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Data Conclusão</TableHead>
                      <TableHead className="font-semibold text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredCargas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          Nenhuma carga encontrada no histórico
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCargas.map((carga) => {
                        const status = carga.status as StatusCarga;
                        const config = statusConfig[status];
                        const StatusIcon = config?.icon || Package;
                        const entrega = carga.entregas?.[0];
                        const dataFinal = entrega?.entregue_em || carga.updated_at;

                        return (
                          <TableRow key={carga.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium text-primary">
                              {carga.codigo}
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
                                      {carga.endereco_origem?.cidade || '-'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {carga.endereco_origem?.logradouro}, {carga.endereco_origem?.bairro}<br />
                                  {carga.endereco_origem?.cidade}/{carga.endereco_origem?.estado}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 cursor-help">
                                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                                    <span className="truncate max-w-[120px]">
                                      {carga.endereco_destino?.cidade || '-'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {carga.endereco_destino?.logradouro}, {carga.endereco_destino?.bairro}<br />
                                  {carga.endereco_destino?.cidade}/{carga.endereco_destino?.estado}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatWeight(carga.peso_kg)}
                            </TableCell>
                            <TableCell className="font-medium text-emerald-600">
                              {formatCurrency(carga.valor_mercadoria)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {dataFinal ? format(new Date(dataFinal), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(carga)}
                                className="gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Ver
                              </Button>
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

        {/* Details Dialog */}
        <CargaDetailsDialog
          carga={selectedCarga}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </TooltipProvider>
    </PortalLayout>
  );
}
