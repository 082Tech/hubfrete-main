import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  Search,
  MoreHorizontal,
  Eye,
  Loader2,
  Plus,
  User,
  Building2,
  ArrowUpCircle,
  XCircle,
  Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';

type Chamado = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_tipo: string;
  empresa_id: number | null;
  atribuido_a: string | null;
  resolucao: string | null;
  created_at: string;
  updated_at: string;
};

type Mensagem = {
  id: string;
  chamado_id: string;
  sender_id: string;
  sender_nome: string;
  sender_tipo: string;
  conteudo: string;
  created_at: string;
};

const ITEMS_PER_PAGE = 10;

const statusLabels: Record<string, { label: string; color: string }> = {
  'aberto': { label: 'Aberto', color: 'bg-yellow-500/10 text-yellow-600' },
  'em_andamento': { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600' },
  'aguardando_resposta': { label: 'Aguardando', color: 'bg-purple-500/10 text-purple-600' },
  'resolvido': { label: 'Resolvido', color: 'bg-green-500/10 text-green-600' },
  'fechado': { label: 'Fechado', color: 'bg-muted text-muted-foreground' },
};

const prioridadeLabels: Record<string, { label: string; color: string }> = {
  'baixa': { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  'media': { label: 'Média', color: 'bg-blue-500/10 text-blue-600' },
  'alta': { label: 'Alta', color: 'bg-orange-500/10 text-orange-600' },
  'urgente': { label: 'Urgente', color: 'bg-destructive/10 text-destructive' },
};

const categoriaLabels: Record<string, string> = {
  'suporte_tecnico': 'Suporte Técnico',
  'financeiro': 'Financeiro',
  'operacional': 'Operacional',
  'reclamacao': 'Reclamação',
  'sugestao': 'Sugestão',
  'outros': 'Outros',
};

export default function Chamados() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchChamados();
  }, []);

  const fetchChamados = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChamados((data || []) as Chamado[]);
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      toast.error('Erro ao carregar chamados');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMensagens = async (chamadoId: string) => {
    try {
      const { data, error } = await supabase
        .from('chamado_mensagens')
        .select('*')
        .eq('chamado_id', chamadoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMensagens((data || []) as Mensagem[]);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleOpenDetails = async (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setDetailsSheetOpen(true);
    await fetchMensagens(chamado.id);
  };

  const handleSendMessage = async () => {
    if (!selectedChamado || !novaMensagem.trim()) return;

    setIsSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('chamado_mensagens')
        .insert({
          chamado_id: selectedChamado.id,
          sender_id: user.id,
          sender_nome: 'Suporte',
          sender_tipo: 'admin',
          conteudo: novaMensagem.trim(),
        });

      if (error) throw error;

      setNovaMensagem('');
      await fetchMensagens(selectedChamado.id);
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedChamado) return;

    setIsUpdatingStatus(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'resolvido') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolvido_em = new Date().toISOString();
        updateData.resolvido_por = user?.id;
      }

      const { error } = await supabase
        .from('chamados')
        .update(updateData)
        .eq('id', selectedChamado.id);

      if (error) throw error;

      toast.success('Status atualizado!');
      fetchChamados();
      setSelectedChamado({ ...selectedChamado, status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredChamados = chamados.filter(c => {
    const matchesSearch = 
      c.codigo.toLowerCase().includes(search.toLowerCase()) ||
      c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      c.solicitante_nome.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesPrioridade = filterPrioridade === 'all' || c.prioridade === filterPrioridade;
    return matchesSearch && matchesStatus && matchesPrioridade;
  });

  // Pagination
  const totalPages = Math.ceil(filteredChamados.length / ITEMS_PER_PAGE);
  const paginatedChamados = filteredChamados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterPrioridade]);

  // Stats
  const stats = {
    abertos: chamados.filter(c => c.status === 'aberto').length,
    emAndamento: chamados.filter(c => c.status === 'em_andamento').length,
    resolvidos: chamados.filter(c => c.status === 'resolvido').length,
    urgentes: chamados.filter(c => c.prioridade === 'urgente' && c.status !== 'resolvido' && c.status !== 'fechado').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-chart-4" />
            Chamados
          </h1>
          <p className="text-muted-foreground">Suporte e tickets de atendimento</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Clock className="w-5 h-5 text-chart-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.abertos}</p>
            <p className="text-sm text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-chart-2" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.emAndamento}</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-chart-1" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.resolvidos}</p>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.urgentes}</p>
            <p className="text-sm text-muted-foreground">Urgentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, título ou solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando_resposta">Aguardando</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="fechado">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
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
          ) : filteredChamados.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum chamado encontrado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedChamados.map((chamado) => (
                    <TableRow key={chamado.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{chamado.codigo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{chamado.titulo}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{chamado.solicitante_nome}</p>
                          <p className="text-muted-foreground text-xs">{chamado.solicitante_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{categoriaLabels[chamado.categoria] || chamado.categoria}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={prioridadeLabels[chamado.prioridade]?.color}>
                          {prioridadeLabels[chamado.prioridade]?.label || chamado.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusLabels[chamado.status]?.color}>
                          {statusLabels[chamado.status]?.label || chamado.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(chamado.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetails(chamado)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredChamados.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="font-mono">{selectedChamado?.codigo}</span>
              {selectedChamado && (
                <Badge className={statusLabels[selectedChamado.status]?.color}>
                  {statusLabels[selectedChamado.status]?.label}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedChamado && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Info */}
              <div className="space-y-3 py-4 border-b">
                <h3 className="font-semibold">{selectedChamado.titulo}</h3>
                <p className="text-sm text-muted-foreground">{selectedChamado.descricao}</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge className={prioridadeLabels[selectedChamado.prioridade]?.color}>
                    {prioridadeLabels[selectedChamado.prioridade]?.label}
                  </Badge>
                  <Badge variant="outline">
                    {categoriaLabels[selectedChamado.categoria]}
                  </Badge>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Solicitante</p>
                  <p>{selectedChamado.solicitante_nome} ({selectedChamado.solicitante_tipo})</p>
                  <p className="text-muted-foreground">{selectedChamado.solicitante_email}</p>
                </div>

                {/* Status update */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Status:</Label>
                  <Select 
                    value={selectedChamado.status} 
                    onValueChange={handleUpdateStatus}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 py-4">
                <div className="space-y-3">
                  {mensagens.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_tipo === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_tipo === 'admin' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-xs opacity-70 mb-1">{msg.sender_nome}</p>
                        <p className="text-sm">{msg.conteudo}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {mensagens.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm">
                      Nenhuma mensagem ainda
                    </p>
                  )}
                </div>
              </ScrollArea>

              {/* Message input */}
              <div className="border-t pt-4 flex gap-2">
                <Textarea
                  placeholder="Digite sua resposta..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  className="min-h-[60px]"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isSendingMessage || !novaMensagem.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
