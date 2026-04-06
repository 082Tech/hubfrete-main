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
  Shield,
  Database,
  MapPin,
  CreditCard,
  Route,
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
import { TooltipProvider } from '@/components/ui/tooltip';
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

  const getEmpresaFromLog = (log: AuditLog): string => {
    const data = log.dados_novos || log.dados_anteriores;
    if (!data) return '—';
    const nome = data.nome_fantasia || data.razao_social || data.nome;
    if (nome && typeof nome === 'string') return nome;
    return '—';
  };

  const getUserDisplay = (log: AuditLog): string => {
    if (log.usuario_nome) return log.usuario_nome;
    if (log.usuario_id) return log.usuario_id.slice(0, 8) + '…';
    return 'Sistema';
  };

  const getSummary = (log: AuditLog): string => {
    if (log.descricao) return log.descricao;
    const op = operacaoLabels[log.operacao] || log.operacao;
    const table = tabelaLabels[log.tabela] || log.tabela;
    return `${op} em ${table}`;
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
                      <TableHead>Empresa</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead className="w-[40%]">Descrição</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const OperacaoIcon = operacaoIcons[log.operacao] || Edit;
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm max-w-[120px] truncate">
                                {getEmpresaFromLog(log)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {getSummary(log)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.timestamp), 'dd/MM/yy', { locale: ptBR })}
                              <br />
                              {format(new Date(log.timestamp), 'HH:mm:ss', { locale: ptBR })}
                            </span>
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
      </div>
    </TooltipProvider>
  );
}
