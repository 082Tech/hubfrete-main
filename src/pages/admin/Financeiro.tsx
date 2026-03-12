import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, Clock, TrendingUp, Search, Eye, Upload,
  ChevronDown, ChevronRight, Calendar, Lock, LockOpen, ArrowDownLeft, ArrowUpRight, User,
} from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { Pagination } from '@/components/admin/Pagination';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const ITEMS_PER_PAGE = 15;

interface FaturaRow {
  id: string;
  empresa_id: number;
  tipo: 'a_receber' | 'a_pagar';
  quinzena: number;
  mes: number;
  ano: number;
  periodo_inicio: string;
  periodo_fim: string;
  valor_bruto: number;
  valor_comissao: number;
  valor_liquido: number;
  qtd_entregas: number;
  status: string;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  created_at: string;
  empresas: { nome: string | null; nome_fantasia: string | null } | null;
}

interface FinanceiroEntrega {
  id: string;
  entrega_id: string;
  empresa_transportadora_id: number | null;
  empresa_embarcadora_id: number | null;
  valor_frete: number;
  valor_comissao: number;
  valor_liquido: number;
  status: string;
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
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'a_receber' | 'a_pagar'>('a_receber');
  const [openFatura, setOpenFatura] = useState<string | null>(null);
  const [faturaPages, setFaturaPages] = useState<Record<string, number>>({});
  const [baixaDialog, setBaixaDialog] = useState<FinanceiroEntrega | null>(null);
  const [baixaForm, setBaixaForm] = useState({
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    metodo_pagamento: '',
    observacoes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [baixaQuinzenaDialog, setBaixaQuinzenaDialog] = useState<FaturaRow | null>(null);
  const [baixaQuinzenaForm, setBaixaQuinzenaForm] = useState({
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    metodo_pagamento: '',
    observacoes: '',
  });
  const [comprovanteQuinzena, setComprovanteQuinzena] = useState<File | null>(null);

  // Fetch faturas for selected month
  const { data: faturas, isLoading: loadingFaturas } = useQuery({
    queryKey: ['admin-faturas', activeTab, selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturas')
        .select(`*, empresas!faturas_empresa_id_fkey(nome, nome_fantasia)`)
        .eq('tipo', activeTab)
        .eq('mes', selectedMonth + 1)
        .eq('ano', selectedYear)
        .order('quinzena', { ascending: true });
      if (error) throw error;
      return data as unknown as FaturaRow[];
    },
  });

  // Fetch items for expanded fatura
  const { data: faturaItems, isLoading: loadingItems } = useQuery({
    queryKey: ['admin-fatura-items', openFatura],
    queryFn: async () => {
      if (!openFatura) return [];
      const column = activeTab === 'a_receber' ? 'fatura_embarcador_id' : 'fatura_transportadora_id';
      const { data, error } = await supabase
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
        .eq(column, openFatura)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FinanceiroEntrega[];
    },
    enabled: !!openFatura,
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
      queryClient.invalidateQueries({ queryKey: ['admin-faturas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-fatura-items'] });
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
    setUploading(true);
    const ext = comprovante.name.split('.').pop();
    const path = `${baixaDialog.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('comprovantes-financeiro').upload(path, comprovante);
    setUploading(false);
    if (error) { toast.error('Erro ao enviar comprovante'); return; }
    const { data: urlData } = supabase.storage.from('comprovantes-financeiro').getPublicUrl(path);

    baixaMutation.mutate({
      id: baixaDialog.id,
      ...baixaForm,
      comprovante_url: urlData.publicUrl,
    });
  };

  const baixaQuinzenaMutation = useMutation({
    mutationFn: async (params: { faturaId: string; faturaType: 'a_receber' | 'a_pagar'; data_pagamento: string; metodo_pagamento: string; observacoes: string; comprovante_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const column = params.faturaType === 'a_receber' ? 'fatura_embarcador_id' : 'fatura_transportadora_id';
      const { error: errItems } = await supabase
        .from('financeiro_entregas')
        .update({
          status: 'pago',
          data_pagamento: params.data_pagamento,
          metodo_pagamento: params.metodo_pagamento,
          observacoes: params.observacoes,
          comprovante_url: params.comprovante_url || null,
          baixa_por: user?.id,
        })
        .eq(column, params.faturaId)
        .eq('status', 'pendente');
      if (errItems) throw errItems;
      const { error: errFatura } = await supabase
        .from('faturas')
        .update({
          status: 'paga',
          data_pagamento: params.data_pagamento,
          metodo_pagamento: params.metodo_pagamento,
          observacoes: params.observacoes,
          comprovante_url: params.comprovante_url || null,
          baixa_por: user?.id,
        })
        .eq('id', params.faturaId);
      if (errFatura) throw errFatura;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faturas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-fatura-items'] });
      toast.success('Baixa da quinzena realizada com sucesso!');
      setBaixaQuinzenaDialog(null);
      setComprovanteQuinzena(null);
    },
    onError: () => toast.error('Erro ao dar baixa na quinzena'),
  });

  const handleBaixaQuinzena = async () => {
    if (!baixaQuinzenaDialog) return;
    if (!comprovanteQuinzena) {
      toast.error('O comprovante de pagamento é obrigatório.');
      return;
    }
    setUploading(true);
    const ext = comprovanteQuinzena.name.split('.').pop();
    const path = `quinzena-${baixaQuinzenaDialog.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('comprovantes-financeiro').upload(path, comprovanteQuinzena);
    setUploading(false);
    if (error) { toast.error('Erro ao enviar comprovante'); return; }
    const { data: urlData } = supabase.storage.from('comprovantes-financeiro').getPublicUrl(path);

    baixaQuinzenaMutation.mutate({
      faturaId: baixaQuinzenaDialog.id,
      faturaType: activeTab,
      ...baixaQuinzenaForm,
      comprovante_url: urlData.publicUrl,
    });
  };

  const nomeEmpresa = (emp: { nome: string | null; nome_fantasia: string | null } | null) =>
    emp?.nome_fantasia || emp?.nome || '—';

  const totalBruto = faturas?.reduce((s, f) => s + Number(f.valor_bruto), 0) || 0;
  const totalComissao = faturas?.reduce((s, f) => s + Number(f.valor_comissao), 0) || 0;
  const totalLiquido = faturas?.reduce((s, f) => s + Number(f.valor_liquido), 0) || 0;
  const totalEntregas = faturas?.reduce((s, f) => s + Number(f.qtd_entregas), 0) || 0;

  const toggleFatura = (id: string) => {
    setOpenFatura(prev => prev === id ? null : id);
    if (!faturaPages[id]) setFaturaPages(p => ({ ...p, [id]: 1 }));
  };

  const getPagedItems = () => {
    if (!faturaItems || !openFatura) return [];
    const page = faturaPages[openFatura] || 1;
    return faturaItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  };

  const faturaStatusBadge = (status: string) => {
    switch (status) {
      case 'paga': return <Badge className="bg-chart-2 text-white">Paga</Badge>;
      case 'fechada': return <Badge variant="outline" className="border-chart-4 text-chart-4">Fechada</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const isClosed = (f: FaturaRow) => {
    const endDate = new Date(f.periodo_fim + 'T23:59:59');
    return new Date() > endDate;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Gestão de faturas, repasses e pagamentos da plataforma</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setOpenFatura(null); }}>
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <TabsList>
            <TabsTrigger value="a_receber" className="gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              A Receber (Embarcadores)
            </TabsTrigger>
            <TabsTrigger value="a_pagar" className="gap-2">
              <ArrowUpRight className="w-4 h-4" />
              A Pagar (Transportadoras)
            </TabsTrigger>
          </TabsList>
          <MonthYearPicker
            month={selectedMonth}
            year={selectedYear}
            onChangeMonth={setSelectedMonth}
            onChangeYear={setSelectedYear}
          />
        </div>

        <TabsContent value={activeTab} className="space-y-6 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalBruto)}</p>
                  <p className="text-xs text-muted-foreground">Frete Bruto</p>
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
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalLiquido)}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'a_receber' ? 'Líquido Transportadora' : 'A Pagar'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-accent rounded-lg">
                  <Clock className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEntregas}</p>
                  <p className="text-xs text-muted-foreground">Entregas no período</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Faturas (Quinzenas) */}
          <div className="space-y-3 pb-10">
            {loadingFaturas ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : !faturas?.length ? (
              <Card className="border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma fatura encontrada para este período
                </CardContent>
              </Card>
            ) : (
              faturas.map((fatura) => {
                const isOpen = openFatura === fatura.id;
                const closed = isClosed(fatura);
                const page = faturaPages[fatura.id] || 1;
                const totalPages = Math.max(1, Math.ceil((faturaItems?.length || 0) / ITEMS_PER_PAGE));
                const pagedItems = isOpen ? getPagedItems() : [];

                return (
                  <Collapsible key={fatura.id} open={isOpen} onOpenChange={() => toggleFatura(fatura.id)}>
                    <Card className="border-border">
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">
                                  {fatura.quinzena === 1 ? '1ª' : '2ª'} Quinzena
                                </p>
                                {faturaStatusBadge(fatura.status)}
                                {closed ? (
                                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground gap-1">
                                    <Lock className="w-3 h-3" /> Fechada
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-chart-1 text-chart-1 gap-1">
                                    <LockOpen className="w-3 h-3" /> Aberta
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(fatura.periodo_inicio + 'T12:00:00'), 'dd/MM')} a{' '}
                                {format(new Date(fatura.periodo_fim + 'T12:00:00'), 'dd/MM/yyyy')} — {fatura.qtd_entregas} entrega(s)
                                {' · '}{nomeEmpresa(fatura.empresas)}
                              </p>
                            </div>
                            {fatura.status !== 'paga' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="hidden sm:flex shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBaixaQuinzenaDialog(fatura);
                                  setBaixaQuinzenaForm({
                                    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
                                    metodo_pagamento: '',
                                    observacoes: '',
                                  });
                                  setComprovanteQuinzena(null);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Baixa Quinzena
                              </Button>
                            )}
                            <div className="text-right mr-4 hidden sm:block">
                              <p className="text-lg font-bold text-foreground">
                                {formatCurrency(activeTab === 'a_pagar' ? fatura.valor_liquido : fatura.valor_bruto)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Comissão: {formatCurrency(fatura.valor_comissao)}
                              </p>
                            </div>
                            {isOpen ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                          </CardContent>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border">
                          {loadingItems && isOpen ? (
                            <div className="p-6 space-y-3">
                              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                          ) : (
                            <>
                              <div className="overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50">
                                    <tr className="border-b border-border">
                                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-[16%]">Entrega</th>
                                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-[16%]">Embarcador</th>
                                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-[16%]">Transportadora</th>
                                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[12%]">Bruto</th>
                                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[10%]">Comissão</th>
                                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[10%]">Líquido</th>
                                      <th className="text-center font-medium text-muted-foreground px-4 py-2.5 w-[8%]">Status</th>
                                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[6%]"></th>
                                    </tr>
                                  </thead>
                                </table>
                                <div className="max-h-[400px] overflow-y-auto">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      {pagedItems.map((r) => (
                                        <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                          <td className="px-4 py-3 w-[16%]">
                                            <p className="font-medium">{r.entregas?.codigo || '—'}</p>
                                            <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                                            {r.entregas?.motoristas?.nome_completo && (
                                              <p className="text-xs text-muted-foreground">🚛 {r.entregas.motoristas.nome_completo}</p>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 w-[16%] text-sm">{nomeEmpresa(r.empresa_embarcadora)}</td>
                                          <td className="px-4 py-3 w-[16%] text-sm">{nomeEmpresa(r.empresa_transportadora)}</td>
                                          <td className="px-4 py-3 text-right font-medium w-[12%]">{formatCurrency(r.valor_frete)}</td>
                                          <td className="px-4 py-3 text-right text-muted-foreground text-sm w-[10%]">
                                            {r.valor_comissao > 0 ? `- ${formatCurrency(r.valor_comissao)}` : '—'}
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-chart-2 w-[10%]">{formatCurrency(r.valor_liquido)}</td>
                                          <td className="px-4 py-3 text-center w-[8%]">
                                            <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={r.status === 'pago' ? 'bg-chart-2 text-white' : ''}>
                                              {r.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </Badge>
                                          </td>
                                          <td className="px-4 py-3 w-[6%]">
                                            {r.status === 'pendente' && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
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
                                                Baixa
                                              </Button>
                                            )}
                                            {r.status === 'pago' && r.comprovante_url && (
                                              <Button size="sm" variant="ghost" asChild>
                                                <a href={r.comprovante_url} target="_blank" rel="noreferrer">
                                                  <Eye className="w-4 h-4" />
                                                </a>
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                      {pagedItems.length === 0 && (
                                        <tr>
                                          <td colSpan={8} className="text-center text-muted-foreground py-8">
                                            Nenhum registro nesta fatura
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              {(faturaItems?.length || 0) > ITEMS_PER_PAGE && (
                                <div className="border-t border-border">
                                  <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={faturaItems?.length || 0}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={(p) => setFaturaPages(prev => ({ ...prev, [fatura.id]: p }))}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

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

      {/* Baixa Quinzena Dialog */}
      <Dialog open={!!baixaQuinzenaDialog} onOpenChange={() => setBaixaQuinzenaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dar Baixa na Quinzena Inteira</DialogTitle>
          </DialogHeader>
          {baixaQuinzenaDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">
                  {baixaQuinzenaDialog.quinzena === 1 ? '1ª' : '2ª'} Quinzena — {nomeEmpresa(baixaQuinzenaDialog.empresas)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(baixaQuinzenaDialog.periodo_inicio + 'T12:00:00'), 'dd/MM')} a{' '}
                  {format(new Date(baixaQuinzenaDialog.periodo_fim + 'T12:00:00'), 'dd/MM/yyyy')} — {baixaQuinzenaDialog.qtd_entregas} entrega(s)
                </p>
                <p className="text-lg font-bold text-chart-2">
                  {formatCurrency(activeTab === 'a_pagar' ? baixaQuinzenaDialog.valor_liquido : baixaQuinzenaDialog.valor_bruto)}
                </p>
              </div>

              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={baixaQuinzenaForm.data_pagamento}
                  onChange={(e) => setBaixaQuinzenaForm(f => ({ ...f, data_pagamento: e.target.value }))}
                />
              </div>

              <div>
                <Label>Método de Pagamento</Label>
                <Select value={baixaQuinzenaForm.metodo_pagamento} onValueChange={(v) => setBaixaQuinzenaForm(f => ({ ...f, metodo_pagamento: v }))}>
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
                  <label className={`flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted transition-colors ${!comprovanteQuinzena ? 'border-destructive/50' : 'border-border'}`}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {comprovanteQuinzena ? comprovanteQuinzena.name : 'Clique para anexar (obrigatório)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => setComprovanteQuinzena(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={baixaQuinzenaForm.observacoes}
                  onChange={(e) => setBaixaQuinzenaForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Observações sobre o pagamento da quinzena..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaQuinzenaDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleBaixaQuinzena}
              disabled={!baixaQuinzenaForm.data_pagamento || !baixaQuinzenaForm.metodo_pagamento || !comprovanteQuinzena || baixaQuinzenaMutation.isPending || uploading}
            >
              {baixaQuinzenaMutation.isPending || uploading ? 'Processando...' : 'Confirmar Baixa Quinzena'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
