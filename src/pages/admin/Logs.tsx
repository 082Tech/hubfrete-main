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
  ChevronDown,
  ChevronRight,
  Globe,
  Clock,
  UserCheck,
  Ticket,
  Lock,
  Bell,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';
import { useQuery } from '@tanstack/react-query';
import { getFieldLabel, formatAuditValue, hiddenFields } from '@/lib/auditLabels';

type AuditLog = {
  id: string;
  tabela: string;
  operacao: string;
  registro_id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  registro_codigo: string | null;
  ip_address: string | null;
  descricao: string | null;
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

const operacaoLabels: Record<string, string> = {
  INSERT: 'Inserção',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
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
  company_invites: Ticket,
  cargo_permissoes: Lock,
  entrega_eventos: Bell,
};

const AUDITED_TABLES = [
  'empresas', 'motoristas', 'veiculos', 'carrocerias',
  'cargas', 'entregas', 'filiais', 'usuarios',
  'usuarios_filiais', 'financeiro_entregas', 'empresa_config_financeira',
  'chats', 'ctes', 'documentos_validacao', 'geofences', 'viagens',
  'company_invites', 'cargo_permissoes', 'entrega_eventos',
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
  company_invites: 'Convites',
  cargo_permissoes: 'Permissões',
  entrega_eventos: 'Eventos Entrega',
};

export default function Logs() {
  const [search, setSearch] = useState('');
  const [filterTabela, setFilterTabela] = useState<string>('all');
  const [filterOperacao, setFilterOperacao] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return { start: startOfDay(today), end: endOfDay(today) };
  });

  const queryKey = ['admin-audit-logs', currentPage, filterTabela, filterOperacao, search, dateRange.start.toISOString(), dateRange.end.toISOString()];

  const fetchLogs = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('auditoria_logs')
      .select('*', { count: 'exact' })
      .gte('timestamp', startOfDay(dateRange.start).toISOString())
      .lte('timestamp', endOfDay(dateRange.end).toISOString())
      .order('timestamp', { ascending: false });

    if (filterTabela !== 'all') {
      query = query.eq('tabela', filterTabela);
    }
    if (filterOperacao !== 'all') {
      query = query.eq('operacao', filterOperacao);
    }
    if (search.trim()) {
      query = query.or(`registro_id.ilike.%${search.trim()}%,usuario_nome.ilike.%${search.trim()}%,registro_codigo.ilike.%${search.trim()}%,descricao.ilike.%${search.trim()}%`);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { logs: (data as AuditLog[]) || [], totalCount: count || 0 };
  }, [currentPage, filterTabela, filterOperacao, search, dateRange]);

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: fetchLogs,
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  // Compute changed fields for UPDATE operations
  const getChangedFields = (log: AuditLog): string[] => {
    if (log.operacao !== 'UPDATE' || !log.dados_anteriores || !log.dados_novos) return [];
    const changed: string[] = [];
    for (const key of Object.keys(log.dados_novos)) {
      if (hiddenFields.has(key)) continue;
      if (JSON.stringify(log.dados_anteriores[key]) !== JSON.stringify(log.dados_novos[key])) {
        changed.push(key);
      }
    }
    return changed;
  };

  // Build a short summary for the list
  const getSummary = (log: AuditLog): string => {
    if (log.descricao) return log.descricao;
    const op = operacaoLabels[log.operacao] || log.operacao;
    const table = tabelaLabels[log.tabela] || log.tabela;
    return `${op} em ${table}`;
  };

  const getUserDisplay = (log: AuditLog): string => {
    if (log.usuario_nome) return log.usuario_nome;
    if (log.usuario_id) return log.usuario_id.slice(0, 8) + '…';
    return 'Sistema';
  };

  const getRegistroDisplay = (log: AuditLog): string => {
    return log.registro_codigo || log.registro_id.slice(0, 8) + '…';
  };

  const TabelaIcon = ({ tabela }: { tabela: string }) => {
    const Icon = tabelaIcons[tabela] || Database;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <TooltipProvider>
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
          <div className="flex items-center gap-3">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={(range) => { setDateRange(range); setCurrentPage(1); }} />
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código, descrição..."
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
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead className="hidden lg:table-cell">Resumo</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const OperacaoIcon = operacaoIcons[log.operacao] || Edit;
                      return (
                        <TableRow key={log.id} className="group cursor-pointer" onClick={() => openDetailsDialog(log)}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.timestamp), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium max-w-[140px] truncate">
                                {getUserDisplay(log)}
                              </span>
                            </div>
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
                              {operacaoLabels[log.operacao] || log.operacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground max-w-[260px] truncate block">
                              {getSummary(log)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-xs text-muted-foreground cursor-help">
                                  {getRegistroDisplay(log)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs">{log.registro_id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); openDetailsDialog(log); }}
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
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detalhes do Log
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="flex-1 min-h-0 pr-4">
                <div className="space-y-5">
                  {/* Header Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Usuário
                      </p>
                      <p className="text-sm font-medium">
                        {selectedLog.usuario_nome || <span className="text-muted-foreground">Sistema</span>}
                      </p>
                      {selectedLog.usuario_id && (
                        <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                          {selectedLog.usuario_id}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Data/Hora
                      </p>
                      <p className="text-sm">
                        {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Operação</p>
                      <Badge className={operacaoColors[selectedLog.operacao]}>
                        {operacaoLabels[selectedLog.operacao] || selectedLog.operacao}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tabela</p>
                      <div className="flex items-center gap-2">
                        <TabelaIcon tabela={selectedLog.tabela} />
                        <span className="font-medium text-sm">{tabelaLabels[selectedLog.tabela] || selectedLog.tabela}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Registro</p>
                      <p className="text-sm font-medium">
                        {selectedLog.registro_codigo || '—'}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                        {selectedLog.registro_id}
                      </p>
                    </div>
                    {selectedLog.ip_address && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> IP
                        </p>
                        <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedLog.descricao && (
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-sm">{selectedLog.descricao}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Visual Diff Table */}
                  {selectedLog.operacao === 'UPDATE' && selectedLog.dados_anteriores && selectedLog.dados_novos && (
                    <DiffTable
                      tabela={selectedLog.tabela}
                      anterior={selectedLog.dados_anteriores}
                      novo={selectedLog.dados_novos}
                    />
                  )}

                  {/* INSERT: show new data as table */}
                  {selectedLog.operacao === 'INSERT' && selectedLog.dados_novos && (
                    <DataTable
                      title="Dados Inseridos"
                      tabela={selectedLog.tabela}
                      data={selectedLog.dados_novos}
                    />
                  )}

                  {/* DELETE: show removed data as table */}
                  {selectedLog.operacao === 'DELETE' && selectedLog.dados_anteriores && (
                    <DataTable
                      title="Dados Removidos"
                      tabela={selectedLog.tabela}
                      data={selectedLog.dados_anteriores}
                    />
                  )}

                  {/* Raw JSON fallback */}
                  <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full justify-start gap-1">
                        {showRawJson ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Ver JSON bruto
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-xs font-medium mb-1 text-muted-foreground">Anterior</p>
                          <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-muted/50 p-3 rounded-lg border max-h-[200px] overflow-auto">
                            {selectedLog.dados_anteriores ? JSON.stringify(selectedLog.dados_anteriores, null, 2) : 'N/A'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1 text-muted-foreground">Novo</p>
                          <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-muted/50 p-3 rounded-lg border max-h-[200px] overflow-auto">
                            {selectedLog.dados_novos ? JSON.stringify(selectedLog.dados_novos, null, 2) : 'N/A'}
                          </pre>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

/** Visual diff table for UPDATE operations */
function DiffTable({
  tabela,
  anterior,
  novo,
}: {
  tabela: string;
  anterior: Record<string, unknown>;
  novo: Record<string, unknown>;
}) {
  const allKeys = new Set([...Object.keys(anterior), ...Object.keys(novo)]);
  const changedFields: { key: string; before: unknown; after: unknown }[] = [];
  const unchangedFields: { key: string; value: unknown }[] = [];

  for (const key of allKeys) {
    if (hiddenFields.has(key)) continue;
    const before = anterior[key];
    const after = novo[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changedFields.push({ key, before, after });
    } else {
      unchangedFields.push({ key, value: after });
    }
  }

  const [showUnchanged, setShowUnchanged] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Campos Alterados ({changedFields.length})</p>
      {changedFields.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma alteração significativa detectada.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[35%] text-xs">Campo</TableHead>
                <TableHead className="w-[32.5%] text-xs">Antes</TableHead>
                <TableHead className="w-[32.5%] text-xs">Depois</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changedFields.map(({ key, before, after }) => (
                <TableRow key={key}>
                  <TableCell className="text-sm font-medium py-2">
                    {getFieldLabel(tabela, key)}
                  </TableCell>
                  <TableCell className="text-sm py-2 text-destructive/80">
                    {formatAuditValue(before)}
                  </TableCell>
                  <TableCell className="text-sm py-2 text-chart-1">
                    {formatAuditValue(after)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {unchangedFields.length > 0 && (
        <Collapsible open={showUnchanged} onOpenChange={setShowUnchanged}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              {showUnchanged ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {unchangedFields.length} campos sem alteração
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border rounded-lg overflow-hidden mt-2">
              <Table>
                <TableBody>
                  {unchangedFields.map(({ key, value }) => (
                    <TableRow key={key}>
                      <TableCell className="text-sm text-muted-foreground py-1.5 w-[35%]">
                        {getFieldLabel(tabela, key)}
                      </TableCell>
                      <TableCell className="text-sm py-1.5 text-muted-foreground">
                        {formatAuditValue(value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/** Data table for INSERT/DELETE — shows field-value pairs */
function DataTable({
  title,
  tabela,
  data,
}: {
  title: string;
  tabela: string;
  data: Record<string, unknown>;
}) {
  const entries = Object.entries(data).filter(([key]) => !hiddenFields.has(key));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[40%] text-xs">Campo</TableHead>
              <TableHead className="text-xs">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="text-sm font-medium py-2">
                  {getFieldLabel(tabela, key)}
                </TableCell>
                <TableCell className="text-sm py-2">
                  {formatAuditValue(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
