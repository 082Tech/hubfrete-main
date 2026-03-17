import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DollarSign, CheckCircle, Clock, TrendingUp, Eye, Upload,
  ArrowDownLeft, ArrowUpRight, User, Landmark, Settings, Zap, Calendar as CalendarIcon,
  Search,
} from 'lucide-react';
import { DadosBancariosDialog } from '@/components/admin/DadosBancariosDialog';
import { format, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { Pagination } from '@/components/admin/Pagination';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const ITEMS_PER_PAGE = 20;

interface FinanceiroEntrega {
  id: string;
  entrega_id: string;
  empresa_transportadora_id: number | null;
  empresa_embarcadora_id: number | null;
  motorista_id: string | null;
  tipo_beneficiario: string | null;
  valor_frete: number;
  valor_comissao: number;
  valor_liquido: number;
  valor_taxa_antecipacao: number;
  antecipado: boolean;
  data_antecipacao: string | null;
  taxa_antecipacao_percent: number;
  dias_antecipados: number;
  data_vencimento: string | null;
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

interface ConfigFinanceira {
  id: string;
  empresa_id: number;
  tipo_pagamento: string;
  prazo_dias: number;
  dia_fixo: number | null;
  ciclo_faturamento: string;
  antecipacao_permitida: boolean;
  taxa_antecipacao_percent: number;
  limite_credito: number;
  credito_utilizado: number;
  empresas?: { nome: string | null; nome_fantasia: string | null; cnpj_matriz: string | null } | null;
}

export default function Financeiro() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'a_receber' | 'a_pagar' | 'config'>('a_receber');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Baixa dialog
  const [baixaDialog, setBaixaDialog] = useState<FinanceiroEntrega | null>(null);
  const [baixaForm, setBaixaForm] = useState({ data_pagamento: format(new Date(), 'yyyy-MM-dd'), metodo_pagamento: '', observacoes: '' });
  const [uploading, setUploading] = useState(false);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [bankTarget, setBankTarget] = useState<{ type: 'motorista'; id: string; nome: string } | { type: 'empresa'; id: number; nome: string } | null>(null);

  // Config dialog
  const [configDialog, setConfigDialog] = useState<ConfigFinanceira | null>(null);
  const [configForm, setConfigForm] = useState({
    tipo_pagamento: 'pos_pago',
    prazo_dias: 30,
    dia_fixo: '',
    ciclo_faturamento: 'mensal',
    antecipacao_permitida: false,
    taxa_antecipacao_percent: 2,
    limite_credito: 0,
  });

  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const dateTo = (() => {
    const d = new Date(selectedYear, selectedMonth + 1, 0);
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Fetch recebíveis
  const { data: recebiveis, isLoading } = useQuery({
    queryKey: ['admin-recebiveis', activeTab, selectedMonth, selectedYear, statusFilter],
    queryFn: async () => {
      if (activeTab === 'config') return [];
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
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('data_vencimento', { ascending: true, nullsFirst: false });

      if (statusFilter !== 'todos') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FinanceiroEntrega[];
    },
    enabled: activeTab !== 'config',
  });

  // Fetch configs
  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['admin-config-financeira'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresa_config_financeira' as any)
        .select(`*, empresas!empresa_config_financeira_empresa_id_fkey(nome, nome_fantasia, cnpj_matriz)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ConfigFinanceira[];
    },
    enabled: activeTab === 'config',
  });

  // Fetch embarcador empresas for config creation
  const { data: embarcadores } = useQuery({
    queryKey: ['embarcador-empresas-for-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, nome_fantasia, cnpj_matriz')
        .eq('tipo', 'EMBARCADOR')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: activeTab === 'config',
  });

  // Filter by tab type
  const filtered = useMemo(() => {
    if (!recebiveis) return [];
    let items = recebiveis;
    if (activeTab === 'a_receber') {
      // Embarcador side - nothing to filter specifically, all are "a receber" from embarcadores
    } else if (activeTab === 'a_pagar') {
      // Already showing all - the tab distinction is conceptual
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(r =>
        r.entregas?.codigo?.toLowerCase().includes(term) ||
        r.entregas?.cargas?.codigo?.toLowerCase().includes(term) ||
        r.entregas?.motoristas?.nome_completo?.toLowerCase().includes(term) ||
        r.empresa_transportadora?.nome_fantasia?.toLowerCase().includes(term) ||
        r.empresa_embarcadora?.nome_fantasia?.toLowerCase().includes(term)
      );
    }
    return items;
  }, [recebiveis, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pagedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalBruto = filtered.reduce((s, r) => s + Number(r.valor_frete), 0);
  const totalComissao = filtered.reduce((s, r) => s + Number(r.valor_comissao), 0);
  const totalLiquido = filtered.reduce((s, r) => s + Number(r.valor_liquido), 0);
  const totalPendente = filtered.filter(r => r.status === 'pendente').length;
  const totalAntecipados = filtered.filter(r => r.antecipado).length;

  const nomeEmpresa = (emp: { nome: string | null; nome_fantasia: string | null } | null) =>
    emp?.nome_fantasia || emp?.nome || '—';

  // Baixa mutation
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
      queryClient.invalidateQueries({ queryKey: ['admin-recebiveis'] });
      toast.success('Baixa realizada com sucesso!');
      setBaixaDialog(null);
      setComprovante(null);
    },
    onError: () => toast.error('Erro ao dar baixa'),
  });

  const handleBaixa = async () => {
    if (!baixaDialog) return;
    if (!comprovante) { toast.error('O comprovante é obrigatório.'); return; }
    setUploading(true);
    const ext = comprovante.name.split('.').pop();
    const path = `${baixaDialog.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('comprovantes-financeiro').upload(path, comprovante);
    setUploading(false);
    if (error) { toast.error('Erro ao enviar comprovante'); return; }
    const { data: urlData } = supabase.storage.from('comprovantes-financeiro').getPublicUrl(path);
    baixaMutation.mutate({ id: baixaDialog.id, ...baixaForm, comprovante_url: urlData.publicUrl });
  };

  // Config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (params: { empresa_id: number; form: typeof configForm }) => {
      const payload = {
        empresa_id: params.empresa_id,
        tipo_pagamento: params.form.tipo_pagamento,
        prazo_dias: params.form.prazo_dias,
        dia_fixo: params.form.dia_fixo ? parseInt(params.form.dia_fixo) : null,
        ciclo_faturamento: params.form.ciclo_faturamento,
        antecipacao_permitida: params.form.antecipacao_permitida,
        taxa_antecipacao_percent: params.form.taxa_antecipacao_percent,
        limite_credito: params.form.limite_credito,
      };
      const { error } = await supabase
        .from('empresa_config_financeira' as any)
        .upsert(payload as any, { onConflict: 'empresa_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config-financeira'] });
      toast.success('Configuração salva!');
      setConfigDialog(null);
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });

  const statusBadge = (r: FinanceiroEntrega) => {
    if (r.status === 'pago') return <Badge className="bg-chart-2 text-white">Pago</Badge>;
    if (r.antecipado) return <Badge className="bg-chart-4 text-white">Antecipado</Badge>;
    // Check if past due
    if (r.data_vencimento && new Date(r.data_vencimento) < new Date() && r.status === 'pendente') {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const vencimentoBadge = (r: FinanceiroEntrega) => {
    if (!r.data_vencimento) return <span className="text-xs text-muted-foreground">—</span>;
    const dias = differenceInDays(new Date(r.data_vencimento), new Date());
    return (
      <div className="text-xs">
        <p className="font-medium">{format(new Date(r.data_vencimento), 'dd/MM/yyyy')}</p>
        {r.status === 'pendente' && (
          <p className={dias < 0 ? 'text-destructive' : dias <= 5 ? 'text-chart-4' : 'text-muted-foreground'}>
            {dias < 0 ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
          </p>
        )}
      </div>
    );
  };

  const tipoPagamentoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pre_pago': return 'Pré-pago';
      case 'pos_pago': return 'Pós-pago (D+X)';
      case 'faturado': return 'Faturado';
      default: return tipo;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Recebíveis individuais D+30 — gestão completa de pagamentos</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }}>
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <TabsList>
            <TabsTrigger value="a_receber" className="gap-2">
              <ArrowDownLeft className="w-4 h-4" /> A Receber
            </TabsTrigger>
            <TabsTrigger value="a_pagar" className="gap-2">
              <ArrowUpRight className="w-4 h-4" /> A Pagar
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" /> Config Embarcadores
            </TabsTrigger>
          </TabsList>
          {activeTab !== 'config' && (
            <MonthYearPicker month={selectedMonth} year={selectedYear} onChangeMonth={setSelectedMonth} onChangeYear={setSelectedYear} />
          )}
        </div>

        {/* Recebíveis tabs */}
        {(activeTab === 'a_receber' || activeTab === 'a_pagar') && (
          <TabsContent value={activeTab} className="space-y-6 mt-4" forceMount>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-lg"><DollarSign className="w-5 h-5 text-chart-4" /></div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalBruto)}</p>
                    <p className="text-xs text-muted-foreground">Frete Bruto</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalComissao)}</p>
                    <p className="text-xs text-muted-foreground">Taxa HubFrete</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-lg"><CheckCircle className="w-5 h-5 text-chart-2" /></div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalLiquido)}</p>
                    <p className="text-xs text-muted-foreground">{activeTab === 'a_receber' ? 'Líquido' : 'A Pagar'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg"><Clock className="w-5 h-5 text-accent-foreground" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalPendente}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-lg"><Zap className="w-5 h-5 text-chart-4" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalAntecipados}</p>
                    <p className="text-xs text-muted-foreground">Antecipados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-36">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 max-w-xs">
                <Label className="text-xs text-muted-foreground">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Código, empresa, motorista..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <Card className="border-border">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Carga</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Beneficiário</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Embarcador</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Bruto</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Taxa</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Líquido</th>
                      <th className="text-center font-medium text-muted-foreground px-4 py-2.5">Vencimento</th>
                      <th className="text-center font-medium text-muted-foreground px-4 py-2.5">Status</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5"></th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[520px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i}><td colSpan={9} className="p-3"><Skeleton className="h-10 w-full" /></td></tr>
                        ))
                      ) : pagedItems.length === 0 ? (
                        <tr><td colSpan={9} className="text-center text-muted-foreground py-12">Nenhum recebível encontrado no período</td></tr>
                      ) : (
                        pagedItems.map((r) => (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{r.entregas?.codigo || '—'}</p>
                              <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm">
                                {r.tipo_beneficiario === 'autonomo'
                                  ? r.entregas?.motoristas?.nome_completo
                                  : nomeEmpresa(r.empresa_transportadora)}
                              </p>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {r.tipo_beneficiario === 'autonomo' ? 'Autônomo' : 'Transportadora'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">{nomeEmpresa(r.empresa_embarcadora)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.valor_frete)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground text-sm">
                              {r.valor_comissao > 0 ? `- ${formatCurrency(r.valor_comissao)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-chart-2">{formatCurrency(r.valor_liquido)}</td>
                            <td className="px-4 py-3 text-center">{vencimentoBadge(r)}</td>
                            <td className="px-4 py-3 text-center">{statusBadge(r)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                {r.tipo_beneficiario === 'autonomo' && r.entregas?.motoristas && (
                                  <Button size="sm" variant="ghost" onClick={() => setBankTarget({ type: 'motorista', id: r.motorista_id!, nome: r.entregas!.motoristas!.nome_completo })} title="Dados bancários">
                                    <Landmark className="w-4 h-4" />
                                  </Button>
                                )}
                                {r.tipo_beneficiario !== 'autonomo' && r.empresa_transportadora_id && (
                                  <Button size="sm" variant="ghost" onClick={() => setBankTarget({ type: 'empresa', id: r.empresa_transportadora_id!, nome: nomeEmpresa(r.empresa_transportadora) })} title="Dados bancários">
                                    <Landmark className="w-4 h-4" />
                                  </Button>
                                )}
                                {r.status === 'pendente' && (
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setBaixaDialog(r);
                                    setBaixaForm({ data_pagamento: format(new Date(), 'yyyy-MM-dd'), metodo_pagamento: '', observacoes: '' });
                                    setComprovante(null);
                                  }}>
                                    <CheckCircle className="w-4 h-4 mr-1" /> Baixa
                                  </Button>
                                )}
                                {r.status === 'pago' && r.comprovante_url && (
                                  <Button size="sm" variant="ghost" asChild>
                                    <a href={r.comprovante_url} target="_blank" rel="noreferrer"><Eye className="w-4 h-4" /></a>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {filtered.length > ITEMS_PER_PAGE && (
                <div className="border-t border-border">
                  <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} />
                </div>
              )}
            </Card>
          </TabsContent>
        )}

        {/* Config Embarcadores tab */}
        <TabsContent value="config" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Configuração Financeira por Embarcador</h2>
              <p className="text-sm text-muted-foreground">Define tipo de pagamento, prazo, antecipação e limite de crédito</p>
            </div>
            <Button onClick={() => {
              setConfigDialog({ id: '', empresa_id: 0, tipo_pagamento: 'pos_pago', prazo_dias: 30, dia_fixo: null, ciclo_faturamento: 'mensal', antecipacao_permitida: false, taxa_antecipacao_percent: 2, limite_credito: 0, credito_utilizado: 0 });
              setConfigForm({ tipo_pagamento: 'pos_pago', prazo_dias: 30, dia_fixo: '', ciclo_faturamento: 'mensal', antecipacao_permitida: false, taxa_antecipacao_percent: 2, limite_credito: 0 });
            }}>
              <Settings className="w-4 h-4 mr-2" /> Nova Config
            </Button>
          </div>

          {loadingConfigs ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : !configs?.length ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma configuração financeira cadastrada. Clique em "Nova Config" para definir condições de um embarcador.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map((cfg) => (
                <Card key={cfg.id} className="border-border hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setConfigDialog(cfg);
                  setConfigForm({
                    tipo_pagamento: cfg.tipo_pagamento,
                    prazo_dias: cfg.prazo_dias,
                    dia_fixo: cfg.dia_fixo?.toString() || '',
                    ciclo_faturamento: cfg.ciclo_faturamento,
                    antecipacao_permitida: cfg.antecipacao_permitida,
                    taxa_antecipacao_percent: cfg.taxa_antecipacao_percent,
                    limite_credito: cfg.limite_credito,
                  });
                }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{cfg.empresas?.nome_fantasia || cfg.empresas?.nome || '—'}</p>
                      <Badge variant="outline">{tipoPagamentoLabel(cfg.tipo_pagamento)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">D+{cfg.prazo_dias}</p>
                        <p>Prazo padrão</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{formatCurrency(cfg.limite_credito)}</p>
                        <p>Limite de crédito</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cfg.antecipacao_permitida ? `${cfg.taxa_antecipacao_percent}%` : 'Não'}</p>
                        <p>Antecipação</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cfg.ciclo_faturamento}</p>
                        <p>Ciclo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Baixa Dialog */}
      <Dialog open={!!baixaDialog} onOpenChange={() => setBaixaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Dar Baixa no Pagamento</DialogTitle></DialogHeader>
          {baixaDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">Carga: {baixaDialog.entregas?.codigo}</p>
                <p className="text-xs text-muted-foreground">
                  {baixaDialog.tipo_beneficiario === 'autonomo' ? baixaDialog.entregas?.motoristas?.nome_completo : nomeEmpresa(baixaDialog.empresa_transportadora)}
                </p>
                {baixaDialog.data_vencimento && (
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {format(new Date(baixaDialog.data_vencimento), 'dd/MM/yyyy')}
                  </p>
                )}
                <p className="text-lg font-bold text-chart-2">{formatCurrency(baixaDialog.valor_liquido)}</p>
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Input type="date" value={baixaForm.data_pagamento} onChange={(e) => setBaixaForm(f => ({ ...f, data_pagamento: e.target.value }))} />
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
                <label className={`flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted transition-colors ${!comprovante ? 'border-destructive/50' : 'border-border'}`}>
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{comprovante ? comprovante.name : 'Clique para anexar (obrigatório)'}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setComprovante(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={baixaForm.observacoes} onChange={(e) => setBaixaForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialog(null)}>Cancelar</Button>
            <Button onClick={handleBaixa} disabled={!baixaForm.data_pagamento || !baixaForm.metodo_pagamento || !comprovante || baixaMutation.isPending || uploading}>
              {baixaMutation.isPending || uploading ? 'Processando...' : 'Confirmar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Configuração Financeira do Embarcador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!configDialog?.id && (
              <div>
                <Label>Embarcador</Label>
                <Select value={configDialog?.empresa_id?.toString() || ''} onValueChange={(v) => setConfigDialog(prev => prev ? { ...prev, empresa_id: parseInt(v) } : null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {embarcadores?.map(e => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.nome_fantasia || e.nome || e.cnpj_matriz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Pagamento</Label>
                <Select value={configForm.tipo_pagamento} onValueChange={(v) => setConfigForm(f => ({ ...f, tipo_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_pago">Pré-pago</SelectItem>
                    <SelectItem value="pos_pago">Pós-pago (D+X)</SelectItem>
                    <SelectItem value="faturado">Faturado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo (dias)</Label>
                <Input type="number" value={configForm.prazo_dias} onChange={(e) => setConfigForm(f => ({ ...f, prazo_dias: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            {configForm.tipo_pagamento === 'faturado' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dia Fixo de Pagamento</Label>
                  <Input type="number" placeholder="Ex: 15" value={configForm.dia_fixo} onChange={(e) => setConfigForm(f => ({ ...f, dia_fixo: e.target.value }))} />
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select value={configForm.ciclo_faturamento} onValueChange={(v) => setConfigForm(f => ({ ...f, ciclo_faturamento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-3">Antecipação</h3>
              <div className="flex items-center gap-3 mb-3">
                <Label>Antecipação Permitida</Label>
                <input type="checkbox" checked={configForm.antecipacao_permitida} onChange={(e) => setConfigForm(f => ({ ...f, antecipacao_permitida: e.target.checked }))} className="h-4 w-4 rounded border-border" />
              </div>
              {configForm.antecipacao_permitida && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Taxa de Antecipação (%)</Label>
                    <Input type="number" step="0.1" value={configForm.taxa_antecipacao_percent} onChange={(e) => setConfigForm(f => ({ ...f, taxa_antecipacao_percent: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Limite de Crédito (R$)</Label>
                    <Input type="number" value={configForm.limite_credito} onChange={(e) => setConfigForm(f => ({ ...f, limite_credito: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!configDialog?.empresa_id) { toast.error('Selecione um embarcador'); return; }
              saveConfigMutation.mutate({ empresa_id: configDialog.empresa_id, form: configForm });
            }} disabled={saveConfigMutation.isPending}>
              {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Details Dialog */}
      <DadosBancariosDialog target={bankTarget} open={!!bankTarget} onOpenChange={() => setBankTarget(null)} />
    </div>
  );
}
