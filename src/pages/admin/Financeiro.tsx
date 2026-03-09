import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, Clock, TrendingUp, Search,
  Eye, Receipt, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { Pagination } from '@/components/admin/Pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRemainingViewportHeight } from '@/hooks/useRemainingViewportHeight';

const ITEMS_PER_PAGE = 15;

interface FinanceiroEntrega {
  id: string;
  entrega_id: string;
  empresa_transportadora_id: number | null;
  empresa_embarcadora_id: number | null;
  valor_frete: number;
  valor_comissao: number;
  valor_liquido: number;
  status: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  baixa_por: string | null;
  created_at: string;
  entregas: {
    codigo: string | null;
    motorista_id: string | null;
    motoristas: { nome_completo: string } | null;
    carga_id: string;
    cargas: { codigo: string; descricao: string } | null;
  } | null;
  empresa_transportadora: { nome: string | null; nome_fantasia: string | null } | null;
  empresa_embarcadora: { nome: string | null; nome_fantasia: string | null } | null;
}

export default function Financeiro() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [baixaDialog, setBaixaDialog] = useState<FinanceiroEntrega | null>(null);
  const [baixaForm, setBaixaForm] = useState({
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    metodo_pagamento: '',
    observacoes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [comprovante, setComprovante] = useState<File | null>(null);

  const { ref: tableRef, height: tableHeight } = useRemainingViewportHeight({ bottomOffset: 16 });

  const { data: registros, isLoading } = useQuery({
    queryKey: ['admin-financeiro', statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('financeiro_entregas')
        .select(`
          *,
          entregas!inner(codigo, motorista_id, carga_id,
            motoristas(nome_completo),
            cargas(codigo, descricao)
          ),
          empresa_transportadora:empresas!financeiro_entregas_empresa_transportadora_id_fkey(nome, nome_fantasia),
          empresa_embarcadora:empresas!financeiro_entregas_empresa_embarcadora_id_fkey(nome, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FinanceiroEntrega[];
    },
  });

  const baixaMutation = useMutation({
    mutationFn: async (params: { id: string; data_pagamento: string; metodo_pagamento: string; observacoes: string; comprovante_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('financeiro_entregas')
        .update({
          status: 'pago',
          data_pagamento: params.data_pagamento,
          metodo_pagamento: params.metodo_pagamento,
          observacoes: params.observacoes,
          comprovante_url: params.comprovante_url || null,
          baixa_por: user?.id,
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-financeiro'] });
      toast.success('Baixa realizada com sucesso!');
      setBaixaDialog(null);
      setComprovante(null);
    },
    onError: () => toast.error('Erro ao dar baixa'),
  });

  const handleBaixa = async () => {
    if (!baixaDialog) return;

    if (!comprovante) {
      toast.error('O comprovante de pagamento é obrigatório.');
      return;
    }

    let comprovante_url: string | undefined;

    setUploading(true);
    const ext = comprovante.name.split('.').pop();
    const path = `${baixaDialog.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('comprovantes-financeiro')
      .upload(path, comprovante);
    setUploading(false);
    if (error) {
      toast.error('Erro ao enviar comprovante');
      return;
    }
    const { data: urlData } = supabase.storage
      .from('comprovantes-financeiro')
      .getPublicUrl(path);
    comprovante_url = urlData.publicUrl;

    baixaMutation.mutate({
      id: baixaDialog.id,
      ...baixaForm,
      comprovante_url,
    });
  };

  const filtered = registros?.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.entregas?.codigo?.toLowerCase().includes(term) ||
      r.entregas?.cargas?.codigo?.toLowerCase().includes(term) ||
      r.empresa_transportadora?.nome_fantasia?.toLowerCase().includes(term) ||
      r.empresa_transportadora?.nome?.toLowerCase().includes(term) ||
      r.empresa_embarcadora?.nome_fantasia?.toLowerCase().includes(term) ||
      r.empresa_embarcadora?.nome?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / ITEMS_PER_PAGE));
  const paginated = filtered?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalPendente = filtered?.filter(r => r.status === 'pendente').reduce((s, r) => s + Number(r.valor_frete), 0) || 0;
  const totalPago = filtered?.filter(r => r.status === 'pago').reduce((s, r) => s + Number(r.valor_frete), 0) || 0;
  const totalComissao = filtered?.reduce((s, r) => s + Number(r.valor_comissao), 0) || 0;
  const qtdPendente = filtered?.filter(r => r.status === 'pendente').length || 0;

  const nomeEmpresa = (emp: { nome: string | null; nome_fantasia: string | null } | null) =>
    emp?.nome_fantasia || emp?.nome || '—';

  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v);
    setCurrentPage(1);
  };

  const handleDateFromChange = (v: string) => {
    setDateFrom(v);
    setCurrentPage(1);
  };

  const handleDateToChange = (v: string) => {
    setDateTo(v);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Gestão de repasses e pagamentos da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-4/10 rounded-lg">
              <Clock className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-muted-foreground">Pendente ({qtdPendente})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalPago)}</p>
              <p className="text-xs text-muted-foreground">Pago</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalComissao)}</p>
              <p className="text-xs text-muted-foreground">Comissão HubFrete</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <Receipt className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filtered?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total de registros</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Código, empresa..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => handleDateFromChange(e.target.value)} />
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => handleDateToChange(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border flex flex-col" ref={tableRef} style={{ height: tableHeight ? `${tableHeight}px` : undefined }}>
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Embarcador</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead className="text-right">Frete Bruto</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                          Nenhum registro financeiro encontrado
                        </TableCell>
                      </TableRow>
                    )}
                    {paginated?.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.entregas?.codigo || '—'}</p>
                            <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{nomeEmpresa(r.empresa_embarcadora)}</TableCell>
                        <TableCell className="text-sm">{nomeEmpresa(r.empresa_transportadora)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(r.valor_frete)}</TableCell>
                        <TableCell className="text-right text-destructive text-sm">
                          {r.valor_comissao > 0 ? `- ${formatCurrency(r.valor_comissao)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-chart-2">{formatCurrency(r.valor_liquido)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={r.status === 'pago' ? 'bg-chart-2 text-white' : ''}>
                            {r.status === 'pago' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.data_pagamento
                            ? format(new Date(r.data_pagamento + 'T12:00:00'), 'dd/MM/yyyy')
                            : format(new Date(r.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {r.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBaixaDialog(r);
                                setBaixaForm({
                                  data_pagamento: format(new Date(), 'yyyy-MM-dd'),
                                  metodo_pagamento: '',
                                  observacoes: '',
                                });
                                setComprovante(null);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Dar Baixa
                            </Button>
                          )}
                          {r.status === 'pago' && r.comprovante_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={r.comprovante_url} target="_blank" rel="noreferrer">
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered?.length || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Baixa Dialog */}
      <Dialog open={!!baixaDialog} onOpenChange={() => setBaixaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dar Baixa no Pagamento</DialogTitle>
          </DialogHeader>
          {baixaDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">Entrega: {baixaDialog.entregas?.codigo}</p>
                <p className="text-xs text-muted-foreground">Transportadora: {nomeEmpresa(baixaDialog.empresa_transportadora)}</p>
                <p className="text-lg font-bold text-chart-2">{formatCurrency(baixaDialog.valor_liquido)}</p>
              </div>

              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={baixaForm.data_pagamento}
                  onChange={(e) => setBaixaForm(f => ({ ...f, data_pagamento: e.target.value }))}
                />
              </div>

              <div>
                <Label>Método de Pagamento</Label>
                <Select value={baixaForm.metodo_pagamento} onValueChange={(v) => setBaixaForm(f => ({ ...f, metodo_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="ted">TED</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Comprovante <span className="text-destructive">*</span></Label>
                <div className="mt-1">
                  <label className={`flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted transition-colors ${!comprovante ? 'border-destructive/50' : 'border-border'}`}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {comprovante ? comprovante.name : 'Clique para anexar (obrigatório)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={baixaForm.observacoes}
                  onChange={(e) => setBaixaForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Observações sobre o pagamento..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleBaixa}
              disabled={!baixaForm.data_pagamento || !baixaForm.metodo_pagamento || !comprovante || baixaMutation.isPending || uploading}
            >
              {baixaMutation.isPending || uploading ? 'Processando...' : 'Confirmar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
