import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Route, Search, Loader2, RefreshCw, User, Truck, Package, MapPin,
  ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, Clock,
  CheckCircle2, Play, Pause,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRangePicker } from '@/components/relatorios/DateRangePicker';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planejada: { label: 'Planejada', color: 'bg-muted text-muted-foreground', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Play },
  pausada: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Pause },
  finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
};

const ITEMS_PER_PAGE = 20;

export default function ViagensAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState(() => ({
    start: subDays(new Date(), 30),
    end: new Date(),
  }));

  const { data: viagens = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-viagens', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viagens')
        .select(`
          id, codigo, status, created_at, iniciada_em, finalizada_em,
          motorista:motoristas!viagens_motorista_id_fkey(id, nome_completo, telefone),
          veiculo:veiculos!viagens_veiculo_id_fkey(id, placa, tipo, marca, modelo),
          empresa:empresas!viagens_empresa_id_fkey(id, nome),
          entrega_ids
        `)
        .gte('created_at', startOfDay(dateRange.start).toISOString())
        .lte('created_at', endOfDay(dateRange.end).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filteredViagens = useMemo(() => {
    return viagens.filter((v: any) => {
      const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
      const matchesSearch = !searchTerm.trim() ||
        v.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.veiculo?.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.empresa?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [viagens, filterStatus, searchTerm]);

  const totalPages = Math.ceil(filteredViagens.length / ITEMS_PER_PAGE);
  const paginatedViagens = filteredViagens.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    const planejadas = viagens.filter((v: any) => v.status === 'planejada').length;
    const emAndamento = viagens.filter((v: any) => v.status === 'em_andamento').length;
    const finalizadas = viagens.filter((v: any) => v.status === 'finalizada').length;
    return { total: viagens.length, planejadas, emAndamento, finalizadas };
  }, [viagens]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Route className="w-8 h-8 text-primary" />
            Viagens
          </h1>
          <p className="text-muted-foreground">
            Gestão de viagens da plataforma
            {stats.total > 0 && <span className="ml-1">• {stats.total} viagens no período</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }} />
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Route className="w-5 h-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg"><Clock className="w-5 h-5 text-muted-foreground" /></div>
              <div><p className="text-2xl font-bold">{stats.planejadas}</p><p className="text-xs text-muted-foreground">Planejadas</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Play className="w-5 h-5 text-blue-500" /></div>
              <div><p className="text-2xl font-bold">{stats.emAndamento}</p><p className="text-xs text-muted-foreground">Em Andamento</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
              <div><p className="text-2xl font-bold">{stats.finalizadas}</p><p className="text-xs text-muted-foreground">Finalizadas</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, motorista, veículo ou empresa..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading && viagens.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Entregas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Iniciada em</TableHead>
                    <TableHead>Finalizada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedViagens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        Nenhuma viagem encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedViagens.map((viagem: any) => {
                      const cfg = statusConfig[viagem.status] || statusConfig.planejada;
                      const StatusIcon = cfg.icon;
                      const entregaCount = viagem.entrega_ids?.length || 0;

                      return (
                        <TableRow key={viagem.id}>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{viagem.codigo || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{viagem.empresa?.nome || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{viagem.motorista?.nome_completo || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{viagem.veiculo?.placa || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{entregaCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${cfg.color} border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(viagem.created_at)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(viagem.iniciada_em)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(viagem.finalizada_em)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredViagens.length)} de {filteredViagens.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
