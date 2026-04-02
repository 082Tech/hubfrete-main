import { useState, useCallback } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '@/components/relatorios/DateRangePicker';
import {
  FileText,
  Search,
  Loader2,
  RefreshCw,
  User,
  Building2,
  Truck,
  Package,
  Edit,
  Trash2,
  Plus,
  Eye,
  Shield,
  Database,
  MapPin,
  CreditCard,
  Route,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';
import { useQuery } from '@tanstack/react-query';

type AuditLog = {
  id: string;
  tabela: string;
  operacao: string;
  registro_id: string;
  usuario_id: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  timestamp: string;
};

const ITEMS_PER_PAGE = 25;

const operacaoIcons: Record<string, React.ElementType> = {
  INSERT: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
};

const operacaoColors: Record<string, string> = {
  INSERT: 'bg-chart-1/10 text-chart-1',
  UPDATE: 'bg-chart-2/10 text-chart-2',
  DELETE: 'bg-destructive/10 text-destructive',
};

const tabelaIcons: Record<string, React.ElementType> = {
  empresas: Building2,
  motoristas: User,
  veiculos: Truck,
  carrocerias: Truck,
  cargas: Package,
  entregas: Package,
  filiais: Building2,
  usuarios: User,
  usuarios_filiais: Shield,
  financeiro_entregas: CreditCard,
  empresa_config_financeira: CreditCard,
  chats: FileText,
  ctes: FileText,
  documentos_validacao: FileText,
  geofences: MapPin,
  viagens: Route,
};

const AUDITED_TABLES = [
  'empresas', 'motoristas', 'veiculos', 'carrocerias',
  'cargas', 'entregas', 'filiais', 'usuarios',
  'usuarios_filiais', 'financeiro_entregas', 'empresa_config_financeira',
  'chats', 'ctes', 'documentos_validacao', 'geofences', 'viagens',
];

const tabelaLabels: Record<string, string> = {
  empresas: 'Empresas',
  motoristas: 'Motoristas',
  veiculos: 'Veículos',
  carrocerias: 'Carrocerias',
  cargas: 'Cargas',
  entregas: 'Entregas',
  filiais: 'Filiais',
  usuarios: 'Usuários',
  usuarios_filiais: 'Vínculos Filial',
  financeiro_entregas: 'Financeiro',
  empresa_config_financeira: 'Config Financeira',
  chats: 'Chats',
  ctes: 'CT-es',
  documentos_validacao: 'Documentos',
  geofences: 'Geofences',
  viagens: 'Viagens',
};

export default function Logs() {
  const [search, setSearch] = useState('');
  const [filterTabela, setFilterTabela] = useState<string>('all');
  const [filterOperacao, setFilterOperacao] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Build query key with all server-side params
  const queryKey = ['admin-audit-logs', currentPage, filterTabela, filterOperacao, search];

  const fetchLogs = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('auditoria_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false });

    if (filterTabela !== 'all') {
      query = query.eq('tabela', filterTabela);
    }
    if (filterOperacao !== 'all') {
      query = query.eq('operacao', filterOperacao);
    }
    if (search.trim()) {
      // Search by registro_id or usuario_id
      query = query.or(`registro_id.ilike.%${search.trim()}%,usuario_id.ilike.%${search.trim()}%`);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { logs: (data as AuditLog[]) || [], totalCount: count || 0 };
  }, [currentPage, filterTabela, filterOperacao, search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: fetchLogs,
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const openDetailsDialog = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  const formatJson = (data: Record<string, unknown> | null) => {
    if (!data) return 'N/A';
    return JSON.stringify(data, null, 2);
  };

  // Compute changed fields for UPDATE operations
  const getChangedFields = (log: AuditLog): string[] => {
    if (log.operacao !== 'UPDATE' || !log.dados_anteriores || !log.dados_novos) return [];
    const changed: string[] = [];
    for (const key of Object.keys(log.dados_novos)) {
      if (key === 'updated_at') continue;
      if (JSON.stringify(log.dados_anteriores[key]) !== JSON.stringify(log.dados_novos[key])) {
        changed.push(key);
      }
    }
    return changed;
  };

  const TabelaIcon = ({ tabela }: { tabela: string }) => {
    const Icon = tabelaIcons[tabela] || Database;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Histórico de alterações no sistema
            {totalCount > 0 && <span className="ml-1">• {totalCount.toLocaleString('pt-BR')} registros</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID do registro ou usuário..."
            value={search}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <Select value={filterTabela} onValueChange={handleFilterChange(setFilterTabela)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Tabela" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tabelas</SelectItem>
            {AUDITED_TABLES.map(t => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  <TabelaIcon tabela={t} />
                  {tabelaLabels[t] || t}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOperacao} onValueChange={handleFilterChange(setFilterOperacao)}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Operação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="INSERT">
              <span className="flex items-center gap-2"><Plus className="w-3 h-3" /> Inserção</span>
            </SelectItem>
            <SelectItem value="UPDATE">
              <span className="flex items-center gap-2"><Edit className="w-3 h-3" /> Atualização</span>
            </SelectItem>
            <SelectItem value="DELETE">
              <span className="flex items-center gap-2"><Trash2 className="w-3 h-3" /> Exclusão</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading && logs.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum log encontrado</p>
              <p className="text-sm mt-1">As alterações no sistema aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead className="hidden lg:table-cell">Campos Alterados</TableHead>
                    <TableHead>ID do Registro</TableHead>
                    <TableHead className="hidden md:table-cell">Usuário</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const OperacaoIcon = operacaoIcons[log.operacao] || Edit;
                    const changedFields = getChangedFields(log);
                    return (
                      <TableRow key={log.id} className="group">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.timestamp), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-muted rounded">
                              <TabelaIcon tabela={log.tabela} />
                            </div>
                            <span className="text-sm font-medium">{tabelaLabels[log.tabela] || log.tabela}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={operacaoColors[log.operacao] || 'bg-muted'}>
                            <OperacaoIcon className="w-3 h-3 mr-1" />
                            {log.operacao === 'INSERT' ? 'Inserção' : log.operacao === 'UPDATE' ? 'Atualização' : log.operacao === 'DELETE' ? 'Exclusão' : log.operacao}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {changedFields.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                              {changedFields.slice(0, 3).map(f => (
                                <Badge key={f} variant="outline" className="text-[10px] font-mono">
                                  {f}
                                </Badge>
                              ))}
                              {changedFields.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{changedFields.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                          {log.registro_id}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                          {log.usuario_id ? log.usuario_id.slice(0, 8) + '...' : <span className="text-muted-foreground/50">sistema</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openDetailsDialog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tabela</p>
                  <div className="flex items-center gap-2">
                    <TabelaIcon tabela={selectedLog.tabela} />
                    <span className="font-medium text-sm">{tabelaLabels[selectedLog.tabela] || selectedLog.tabela}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Operação</p>
                  <Badge className={operacaoColors[selectedLog.operacao]}>
                    {selectedLog.operacao}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data/Hora</p>
                  <p className="text-sm">
                    {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                  <p className="font-mono text-xs break-all">
                    {selectedLog.usuario_id || <span className="text-muted-foreground">Sistema</span>}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">ID do Registro</p>
                <p className="font-mono text-xs break-all bg-muted px-2 py-1 rounded">{selectedLog.registro_id}</p>
              </div>

              {selectedLog.operacao === 'UPDATE' && (() => {
                const changed = getChangedFields(selectedLog);
                return changed.length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Campos alterados</p>
                    <div className="flex flex-wrap gap-1">
                      {changed.map(f => (
                        <Badge key={f} variant="outline" className="text-xs font-mono">{f}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">
                    {selectedLog.operacao === 'DELETE' ? 'Dados Removidos' : 'Dados Anteriores'}
                  </p>
                  <ScrollArea className="h-[250px] rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {formatJson(selectedLog.dados_anteriores)}
                    </pre>
                  </ScrollArea>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">
                    {selectedLog.operacao === 'INSERT' ? 'Dados Inseridos' : 'Dados Novos'}
                  </p>
                  <ScrollArea className="h-[250px] rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {formatJson(selectedLog.dados_novos)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
