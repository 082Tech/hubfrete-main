import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  History,
  Search,
  DollarSign,
  Loader2,
  MapPin,
  Building2,
  Calendar,
  Truck,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  User,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Package,
  Weight,
} from 'lucide-react';

// Types
interface EnderecoData {
  id: string;
  cidade: string;
  estado: string;
}

interface EntregaData {
  id: string;
  codigo: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  status: string;
  coletado_em: string | null;
  entregue_em: string | null;
  motoristas: {
    id: string;
    nome_completo: string;
  } | null;
}

interface CargaData {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  valor_mercadoria: number | null;
  status: string;
  created_at: string;
  remetente_nome_fantasia: string | null;
  remetente_razao_social: string | null;
  destinatario_nome_fantasia: string | null;
  destinatario_razao_social: string | null;
  endereco_origem: EnderecoData | null;
  endereco_destino: EnderecoData | null;
  entregas: EntregaData[];
  empresa: {
    id: number;
    nome: string | null;
  } | null;
}

const statusEntregaConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  cancelada: { label: 'Cancelada', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
};

const ITEMS_PER_PAGE = 15;

export default function CargasHistoricoAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch only finalized cargas (all entregas are entregue/cancelada/problema)
  const { data: cargas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-cargas-historico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          tipo,
          peso_kg,
          valor_mercadoria,
          status,
          created_at,
          remetente_razao_social,
          remetente_nome_fantasia,
          destinatario_razao_social,
          destinatario_nome_fantasia,
          endereco_origem:enderecos_carga!cargas_endereco_origem_fkey (
            id,
            cidade,
            estado
          ),
          endereco_destino:enderecos_carga!cargas_endereco_destino_fkey (
            id,
            cidade,
            estado
          ),
          entregas (
            id,
            codigo,
            peso_alocado_kg,
            valor_frete,
            status,
            coletado_em,
            entregue_em,
            motoristas:motoristas (
              id,
              nome_completo
            )
          ),
          empresa:empresas (
            id,
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only include cargas where ALL entregas are finalized
      const mapped = (data || []).map(item => ({
        ...item,
        entregas: Array.isArray(item.entregas) ? item.entregas : (item.entregas ? [item.entregas] : [])
      })) as CargaData[];

      return mapped.filter(carga => {
        if (carga.entregas.length === 0) return false;
        return carga.entregas.every(e => ['entregue', 'cancelada', 'problema'].includes(e.status));
      });
    },
  });

  // Apply search filter
  const filteredCargas = useMemo(() => {
    return cargas.filter(carga =>
      carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.empresa?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cargas, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredCargas.length / ITEMS_PER_PAGE);
  const paginatedCargas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCargas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCargas, currentPage]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasProblems = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'problema' || e.status === 'cancelada');
  };

  const getStatusBadge = (carga: CargaData) => {
    if (hasProblems(carga)) {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Com Problemas</Badge>;
    }
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Concluída</Badge>;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Stats
  const stats = useMemo(() => {
    const concluidas = cargas.filter(c => !hasProblems(c)).length;
    const comProblemas = cargas.filter(c => hasProblems(c)).length;
    const totalFrete = cargas.reduce((acc, c) => {
      return acc + c.entregas.reduce((sum, e) => sum + (e.valor_frete || 0), 0);
    }, 0);

    return { total: cargas.length, concluidas, comProblemas, totalFrete };
  }, [cargas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <History className="w-8 h-8 text-primary" />
            Histórico de Cargas
          </h1>
          <p className="text-muted-foreground">
            Cargas finalizadas da plataforma
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Histórico</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.concluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.comProblemas}</p>
                <p className="text-xs text-muted-foreground">Com Problemas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalFrete)}</p>
                <p className="text-xs text-muted-foreground">Total Fretes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição ou empresa..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Frete Total</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedCargas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Nenhuma carga finalizada encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCargas.map((carga) => {
                  const isExpanded = expandedRows.has(carga.id);
                  const totalFrete = carga.entregas.reduce((sum, e) => sum + (e.valor_frete || 0), 0);

                  return (
                    <>
                      <TableRow
                        key={carga.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(carga.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="font-mono font-medium">{carga.codigo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 max-w-[150px]">
                                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="truncate">{carga.empresa?.nome || '-'}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{carga.empresa?.nome || '-'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <span>{carga.endereco_origem?.cidade}/{carga.endereco_origem?.estado}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{carga.endereco_destino?.cidade}/{carga.endereco_destino?.estado}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Weight className="w-4 h-4 text-muted-foreground" />
                            {formatWeight(carga.peso_kg)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{carga.entregas.length}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(carga)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(totalFrete)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(carga.created_at)}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded entregas */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Entregas desta carga:
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead>Código</TableHead>
                                    <TableHead>Motorista</TableHead>
                                    <TableHead>Peso</TableHead>
                                    <TableHead>Frete</TableHead>
                                    <TableHead>Coletado</TableHead>
                                    <TableHead>Entregue</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {carga.entregas.map(entrega => {
                                    const statusConfig = statusEntregaConfig[entrega.status] || statusEntregaConfig.entregue;
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                      <TableRow key={entrega.id}>
                                        <TableCell className="font-mono text-sm">
                                          {entrega.codigo || '-'}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            {entrega.motoristas?.nome_completo || '-'}
                                          </div>
                                        </TableCell>
                                        <TableCell>{entrega.peso_alocado_kg ? formatWeight(entrega.peso_alocado_kg) : '-'}</TableCell>
                                        <TableCell>{formatCurrency(entrega.valor_frete)}</TableCell>
                                        <TableCell>{formatDate(entrega.coletado_em)}</TableCell>
                                        <TableCell>{formatDate(entrega.entregue_em)}</TableCell>
                                        <TableCell>
                                          <Badge className={`${statusConfig.color} border`}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {statusConfig.label}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCargas.length)} de {filteredCargas.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
