import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter,
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
} from 'lucide-react';
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

const ITEMS_PER_PAGE = 15;

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
  cargas: Package,
  entregas: Package,
  filiais: Building2,
  usuarios: User,
};

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTabela, setFilterTabela] = useState<string>('all');
  const [filterOperacao, setFilterOperacao] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const tabelas = ['empresas', 'motoristas', 'veiculos', 'cargas', 'entregas', 'filiais', 'usuarios', 'usuarios_filiais'];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('auditoria_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.tabela.toLowerCase().includes(search.toLowerCase()) ||
      log.registro_id.toLowerCase().includes(search.toLowerCase()) ||
      log.operacao.toLowerCase().includes(search.toLowerCase());
    const matchesTabela = filterTabela === 'all' || log.tabela === filterTabela;
    const matchesOperacao = filterOperacao === 'all' || log.operacao === filterOperacao;
    return matchesSearch && matchesTabela && matchesOperacao;
  });

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTabela, filterOperacao]);

  const openDetailsDialog = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  const formatJson = (data: Record<string, unknown> | null) => {
    if (!data) return 'N/A';
    return JSON.stringify(data, null, 2);
  };

  const TabelaIcon = ({ tabela }: { tabela: string }) => {
    const Icon = tabelaIcons[tabela] || FileText;
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
          <p className="text-muted-foreground">Histórico de alterações no sistema</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Plus className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.operacao === 'INSERT').length}
                </p>
                <p className="text-sm text-muted-foreground">Inserções</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Edit className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.operacao === 'UPDATE').length}
                </p>
                <p className="text-sm text-muted-foreground">Atualizações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.operacao === 'DELETE').length}
                </p>
                <p className="text-sm text-muted-foreground">Exclusões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tabela, ID ou operação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTabela} onValueChange={setFilterTabela}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Tabela" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tabelas</SelectItem>
            {tabelas.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOperacao} onValueChange={setFilterOperacao}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Operação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>ID do Registro</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => {
                    const OperacaoIcon = operacaoIcons[log.operacao] || Edit;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-muted rounded">
                              <TabelaIcon tabela={log.tabela} />
                            </div>
                            <span className="font-mono text-sm">{log.tabela}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={operacaoColors[log.operacao] || 'bg-muted'}>
                            <OperacaoIcon className="w-3 h-3 mr-1" />
                            {log.operacao}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
                          {log.registro_id}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
                          {log.usuario_id || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
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
                  totalItems={filteredLogs.length}
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
                  <p className="text-xs text-muted-foreground">Tabela</p>
                  <p className="font-mono font-medium">{selectedLog.tabela}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operação</p>
                  <Badge className={operacaoColors[selectedLog.operacao]}>
                    {selectedLog.operacao}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="text-sm">
                    {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID do Registro</p>
                  <p className="font-mono text-xs break-all">{selectedLog.registro_id}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Dados Anteriores</p>
                  <ScrollArea className="h-[250px] rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {formatJson(selectedLog.dados_anteriores)}
                    </pre>
                  </ScrollArea>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Dados Novos</p>
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
