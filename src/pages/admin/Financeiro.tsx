import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
  ArrowDownLeft, ArrowUpRight, Landmark, Settings, Zap,
  Search, Building2, ShieldCheck, AlertTriangle, Truck, User,
} from 'lucide-react';
import { DadosBancariosDialog } from '@/components/admin/DadosBancariosDialog';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  valor_final: number | null;
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

type TabType = 'recebiveis' | 'pgt_transportadoras' | 'pgt_autonomos' | 'config';

export default function Financeiro() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<TabType>('recebiveis');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [baixaDialog, setBaixaDialog] = useState<FinanceiroEntrega | null>(null);
  const [baixaForm, setBaixaForm] = useState({ data_pagamento: format(new Date(), 'yyyy-MM-dd'), metodo_pagamento: '', observacoes: '' });
  const [uploading, setUploading] = useState(false);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [bankTarget, setBankTarget] = useState<{ type: 'motorista'; id: string; nome: string } | { type: 'empresa'; id: number; nome: string } | null>(null);

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

  const isFinancialTab = activeTab !== 'config';

  const { data: allRecebiveis, isLoading } = useQuery({
    queryKey: ['admin-recebiveis', selectedMonth, selectedYear, statusFilter],
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
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('data_vencimento', { ascending: true, nullsFirst: false });

      if (statusFilter !== 'todos') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FinanceiroEntrega[];
    },
    enabled: isFinancialTab,
  });

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

  // Filter data based on active tab
  const filtered = useMemo(() => {
    if (!allRecebiveis) return [];
    let items = allRecebiveis;

    // Tab-specific filtering
    if (activeTab === 'pgt_transportadoras') {
      items = items.filter(r => r.tipo_beneficiario === 'transportadora');
    } else if (activeTab === 'pgt_autonomos') {
      items = items.filter(r => r.tipo_beneficiario === 'autonomo');
    }
    // recebiveis tab: show all (from embarcador perspective)

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
  }, [allRecebiveis, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pagedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalBruto = filtered.reduce((s, r) => s + Number(r.valor_frete), 0);
  const totalComissao = filtered.reduce((s, r) => s + Number(r.valor_comissao), 0);
  const totalLiquido = filtered.reduce((s, r) => s + Number(r.valor_liquido), 0);
  const totalPendente = filtered.filter(r => r.status === 'pendente').length;
  const totalPago = filtered.filter(r => r.status === 'pago').length;
  const totalAntecipados = filtered.filter(r => r.antecipado).length;
  const totalVencidos = filtered.filter(r => r.status === 'pendente' && r.data_vencimento && new Date(r.data_vencimento) < new Date()).length;

  const nomeEmpresa = (emp: { nome: string | null; nome_fantasia: string | null } | null) =>
    emp?.nome_fantasia || emp?.nome || '—';

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
    if (r.status === 'pago') return <Badge className="bg-chart-2 text-white text-[10px]">Pago</Badge>;
    if (r.antecipado) return <Badge className="bg-chart-4 text-white text-[10px]">Antecipado</Badge>;
    if (r.data_vencimento && new Date(r.data_vencimento) < new Date() && r.status === 'pendente') {
      return <Badge variant="destructive" className="text-[10px]">Vencido</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
  };

  const tipoPagamentoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pre_pago': return 'Pré-pago';
      case 'pos_pago': return 'Pós-pago';
      case 'faturado': return 'Faturado';
      default: return tipo;
    }
  };

  const cicloLabel = (c: string) => {
    switch (c) {
      case 'semanal': return 'Semanal';
      case 'quinzenal': return 'Quinzenal';
      case 'mensal': return 'Mensal';
      default: return c;
    }
  };

  // Tab-specific labels
  const isRecebiveis = activeTab === 'recebiveis';
  const isPgtTransportadoras = activeTab === 'pgt_transportadoras';
  const isPgtAutonomos = activeTab === 'pgt_autonomos';

  const baixaLabel = isRecebiveis ? 'Recebimento' : 'Pagamento';
  const baixaDialogTitle = isRecebiveis ? 'Confirmar Recebimento' : 'Confirmar Pagamento Enviado';
  const baixaDialogDesc = isRecebiveis
    ? 'Confirme que o valor foi recebido do embarcador'
    : isPgtTransportadoras
      ? 'Confirme que o pagamento foi enviado à transportadora'
      : 'Confirme que o pagamento foi enviado ao motorista autônomo';

  const getKPIs = () => {
    if (isRecebiveis) {
      return [
        { label: 'Frete Bruto', value: formatCurrency(totalBruto), icon: DollarSign, color: 'text-chart-4' },
        { label: 'Taxa HubFrete', value: formatCurrency(totalComissao), icon: TrendingUp, color: 'text-primary' },
        { label: 'Total a Receber', value: formatCurrency(totalBruto), icon: ArrowDownLeft, color: 'text-chart-2' },
        { label: 'Pendentes', value: String(totalPendente), icon: Clock, color: 'text-muted-foreground' },
        { label: 'Recebidos', value: String(totalPago), icon: CheckCircle, color: 'text-chart-2' },
        { label: 'Vencidos', value: String(totalVencidos), icon: AlertTriangle, color: 'text-destructive' },
      ];
    }
    return [
      { label: 'Total a Pagar', value: formatCurrency(totalLiquido), icon: ArrowUpRight, color: 'text-destructive' },
      { label: 'Taxa Descontada', value: formatCurrency(totalComissao), icon: TrendingUp, color: 'text-primary' },
      { label: 'Pendentes', value: String(totalPendente), icon: Clock, color: 'text-muted-foreground' },
      { label: 'Pagos', value: String(totalPago), icon: CheckCircle, color: 'text-chart-2' },
      { label: 'Vencidos', value: String(totalVencidos), icon: AlertTriangle, color: 'text-destructive' },
      { label: 'Antecipados', value: String(totalAntecipados), icon: Zap, color: 'text-chart-4' },
    ];
  };

  // Table columns differ per tab
  const renderTableHead = () => (
    <thead className="bg-muted/40 sticky top-0">
      <tr className="border-b border-border">
        <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Carga</th>
        {isRecebiveis ? (
          <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Embarcador</th>
        ) : (
          <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">
            {isPgtTransportadoras ? 'Transportadora' : 'Motorista'}
          </th>
        )}
        <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">
          {isRecebiveis ? 'Valor Frete' : 'Bruto'}
        </th>
        {!isRecebiveis && (
          <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Taxa</th>
        )}
        <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">
          {isRecebiveis ? 'A Receber' : 'Líquido'}
        </th>
        <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs">Vencimento</th>
        <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs">Status</th>
        <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Ações</th>
      </tr>
    </thead>
  );

  const renderTableRow = (r: FinanceiroEntrega) => {
    const dias = r.data_vencimento ? differenceInDays(new Date(r.data_vencimento), new Date()) : null;
    return (
      <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{r.entregas?.codigo || '—'}</p>
          <p className="text-[11px] text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              isRecebiveis ? 'bg-chart-4/10' : isPgtTransportadoras ? 'bg-primary/10' : 'bg-chart-4/10'
            }`}>
              {isRecebiveis
                ? <Building2 className="w-3 h-3 text-chart-4" />
                : isPgtTransportadoras
                  ? <Truck className="w-3 h-3 text-primary" />
                  : <User className="w-3 h-3 text-chart-4" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate">
                {isRecebiveis
                  ? nomeEmpresa(r.empresa_embarcadora)
                  : isPgtTransportadoras
                    ? nomeEmpresa(r.empresa_transportadora)
                    : r.entregas?.motoristas?.nome_completo || '—'
                }
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isRecebiveis ? 'Embarcador' : isPgtTransportadoras ? 'Transportadora' : 'Autônomo'}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.valor_frete)}</td>
        {!isRecebiveis && (
          <td className="px-4 py-3 text-right text-muted-foreground">
            {r.valor_comissao > 0 ? `- ${formatCurrency(r.valor_comissao)}` : '—'}
          </td>
        )}
        <td className="px-4 py-3 text-right font-semibold text-chart-2">
          {formatCurrency(isRecebiveis ? r.valor_frete : r.valor_liquido)}
        </td>
        <td className="px-4 py-3 text-center">
          {r.data_vencimento ? (
            <div className="text-xs">
              <p className="font-medium">{format(new Date(r.data_vencimento), 'dd/MM/yy')}</p>
              {r.status === 'pendente' && dias !== null && (
                <p className={dias < 0 ? 'text-destructive font-medium' : dias <= 5 ? 'text-chart-4' : 'text-muted-foreground'}>
                  {dias < 0 ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                </p>
              )}
            </div>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-3 text-center">{statusBadge(r)}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center gap-1 justify-end">
            {!isRecebiveis && isPgtAutonomos && r.entregas?.motoristas && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setBankTarget({ type: 'motorista', id: r.motorista_id!, nome: r.entregas!.motoristas!.nome_completo })} title="Dados bancários">
                <Landmark className="w-3.5 h-3.5" />
              </Button>
            )}
            {!isRecebiveis && isPgtTransportadoras && r.empresa_transportadora_id && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setBankTarget({ type: 'empresa', id: r.empresa_transportadora_id!, nome: nomeEmpresa(r.empresa_transportadora) })} title="Dados bancários">
                <Landmark className="w-3.5 h-3.5" />
              </Button>
            )}
            {r.status === 'pendente' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                setBaixaDialog(r);
                setBaixaForm({ data_pagamento: format(new Date(), 'yyyy-MM-dd'), metodo_pagamento: '', observacoes: '' });
                setComprovante(null);
              }}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Baixa
              </Button>
            )}
            {r.status === 'pago' && r.comprovante_url && (
              <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                <a href={r.comprovante_url} target="_blank" rel="noreferrer"><Eye className="w-3.5 h-3.5" /></a>
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderFinancialTable = () => (
    <div className="space-y-5 mt-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {getKPIs().map((kpi, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-3 flex items-center gap-2.5">
              <kpi.icon className={`w-4 h-4 ${kpi.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight truncate">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <MonthYearPicker month={selectedMonth} year={selectedYear} onChangeMonth={setSelectedMonth} onChangeYear={setSelectedYear} />
        <div className="w-32">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-xs">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Código, empresa, motorista..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {renderTableHead()}
          </table>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={9} className="p-3"><Skeleton className="h-10 w-full" /></td></tr>
                  ))
                ) : pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted-foreground py-16">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                      <p>Nenhum registro encontrado no período</p>
                    </td>
                  </tr>
                ) : (
                  pagedItems.map(renderTableRow)
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
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Recebíveis e pagamentos · Modelo fintech logística</p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
          <DollarSign className="w-3.5 h-3.5" />
          {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: ptBR })}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabType); setPage(1); setStatusFilter('todos'); setSearchTerm(''); }}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="recebiveis" className="gap-2">
            <ArrowDownLeft className="w-4 h-4" /> Recebíveis
          </TabsTrigger>
          <TabsTrigger value="pgt_transportadoras" className="gap-2">
            <Truck className="w-4 h-4" /> Pgto Transportadoras
          </TabsTrigger>
          <TabsTrigger value="pgt_autonomos" className="gap-2">
            <User className="w-4 h-4" /> Pgto Autônomos
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="w-4 h-4" /> Config Embarcadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recebiveis">{renderFinancialTable()}</TabsContent>
        <TabsContent value="pgt_transportadoras">{renderFinancialTable()}</TabsContent>
        <TabsContent value="pgt_autonomos">{renderFinancialTable()}</TabsContent>

        {/* ===== CONFIG TAB ===== */}
        <TabsContent value="config" className="space-y-5 mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Regras Financeiras por Embarcador</h2>
              <p className="text-xs text-muted-foreground">Tipo de pagamento, prazo, antecipação e limite de crédito</p>
            </div>
            <Button size="sm" onClick={() => {
              setConfigDialog({ id: '', empresa_id: 0, tipo_pagamento: 'pos_pago', prazo_dias: 30, dia_fixo: null, ciclo_faturamento: 'mensal', antecipacao_permitida: false, taxa_antecipacao_percent: 2, limite_credito: 0, credito_utilizado: 0 });
              setConfigForm({ tipo_pagamento: 'pos_pago', prazo_dias: 30, dia_fixo: '', ciclo_faturamento: 'mensal', antecipacao_permitida: false, taxa_antecipacao_percent: 2, limite_credito: 0 });
            }}>
              <Settings className="w-4 h-4 mr-2" /> Nova Config
            </Button>
          </div>

          {loadingConfigs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
            </div>
          ) : !configs?.length ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="py-16 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhuma configuração cadastrada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Config" para definir regras de um embarcador</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map((cfg) => {
                const creditPercent = cfg.limite_credito > 0 ? Math.min(100, (cfg.credito_utilizado / cfg.limite_credito) * 100) : 0;
                return (
                  <Card key={cfg.id} className="border-border hover:shadow-md transition-all cursor-pointer group" onClick={() => {
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
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4.5 h-4.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{cfg.empresas?.nome_fantasia || cfg.empresas?.nome || '—'}</p>
                            <p className="text-[10px] text-muted-foreground">{cfg.empresas?.cnpj_matriz || ''}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {tipoPagamentoLabel(cfg.tipo_pagamento)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-md bg-muted/40">
                          <p className="text-sm font-bold text-foreground">D+{cfg.prazo_dias}</p>
                          <p className="text-[9px] text-muted-foreground">Prazo</p>
                        </div>
                        <div className="text-center p-2 rounded-md bg-muted/40">
                          <p className="text-sm font-bold text-foreground">
                            {cfg.antecipacao_permitida ? `${cfg.taxa_antecipacao_percent}%` : '—'}
                          </p>
                          <p className="text-[9px] text-muted-foreground">Taxa Antec.</p>
                        </div>
                        <div className="text-center p-2 rounded-md bg-muted/40">
                          <p className="text-sm font-bold text-foreground">{cicloLabel(cfg.ciclo_faturamento)}</p>
                          <p className="text-[9px] text-muted-foreground">Ciclo</p>
                        </div>
                      </div>

                      {cfg.limite_credito > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Crédito utilizado</span>
                            <span>{formatCurrency(cfg.credito_utilizado)} / {formatCurrency(cfg.limite_credito)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${creditPercent > 80 ? 'bg-destructive' : creditPercent > 50 ? 'bg-chart-4' : 'bg-chart-2'}`}
                              style={{ width: `${creditPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {cfg.antecipacao_permitida ? (
                          <Badge className="bg-chart-2/10 text-chart-2 text-[9px] border-0">
                            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Antecipação ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] border-0">Antecipação desligada</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== BAIXA DIALOG ===== */}
      <Dialog open={!!baixaDialog} onOpenChange={() => setBaixaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-chart-2" /> {baixaDialogTitle}
            </DialogTitle>
          </DialogHeader>
          {baixaDialog && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{baixaDialogDesc}</p>
              <div className="p-3 bg-muted rounded-lg space-y-1.5">
                <p className="text-sm font-medium">Carga: {baixaDialog.entregas?.codigo}</p>
                <p className="text-xs text-muted-foreground">
                  {isRecebiveis
                    ? `Embarcador: ${nomeEmpresa(baixaDialog.empresa_embarcadora)}`
                    : baixaDialog.tipo_beneficiario === 'autonomo'
                      ? `Motorista: ${baixaDialog.entregas?.motoristas?.nome_completo}`
                      : `Transportadora: ${nomeEmpresa(baixaDialog.empresa_transportadora)}`
                  }
                </p>
                {baixaDialog.data_vencimento && (
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {format(new Date(baixaDialog.data_vencimento), 'dd/MM/yyyy')}
                  </p>
                )}
                <p className="text-lg font-bold text-chart-2">
                  {formatCurrency(isRecebiveis ? baixaDialog.valor_frete : baixaDialog.valor_liquido)}
                </p>
              </div>
              <div>
                <Label>Data do {baixaLabel}</Label>
                <Input type="date" value={baixaForm.data_pagamento} onChange={(e) => setBaixaForm(f => ({ ...f, data_pagamento: e.target.value }))} />
              </div>
              <div>
                <Label>Método</Label>
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
                <label className={`flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted transition-colors ${!comprovante ? 'border-destructive/40' : 'border-chart-2'}`}>
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{comprovante ? comprovante.name : 'Clique para anexar (obrigatório)'}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setComprovante(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={baixaForm.observacoes} onChange={(e) => setBaixaForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialog(null)}>Cancelar</Button>
            <Button onClick={handleBaixa} disabled={!baixaForm.data_pagamento || !baixaForm.metodo_pagamento || !comprovante || baixaMutation.isPending || uploading}>
              {baixaMutation.isPending || uploading ? 'Processando...' : `Confirmar ${baixaLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CONFIG DIALOG ===== */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Configuração Financeira</DialogTitle></DialogHeader>
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
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Antecipação</p>
                  <p className="text-[10px] text-muted-foreground">Permitir que transportadores antecipem recebíveis deste embarcador</p>
                </div>
                <Switch checked={configForm.antecipacao_permitida} onCheckedChange={(v) => setConfigForm(f => ({ ...f, antecipacao_permitida: v }))} />
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
      {bankTarget && (
        <DadosBancariosDialog
          open={!!bankTarget}
          onOpenChange={() => setBankTarget(null)}
          target={bankTarget}
        />
      )}
    </div>
  );
}
