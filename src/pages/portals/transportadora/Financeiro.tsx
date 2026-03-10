import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, Clock, Landmark, Save, CreditCard,
  ChevronDown, ChevronRight, Calendar, Lock, LockOpen,
} from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { useRemainingViewportHeight } from '@/hooks/useRemainingViewportHeight';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QuinzenaGroup {
  key: string;
  label: string;
  period: string;
  registros: any[];
  totalBruto: number;
  totalComissao: number;
  totalLiquido: number;
  qtdPendente: number;
  qtdPago: number;
  status: 'pendente' | 'parcial' | 'pago';
  closed: boolean;
}

function getQuinzenaGroups(registros: any[]): QuinzenaGroup[] {
  const groups: Record<string, any[]> = {};

  for (const r of registros) {
    const date = new Date(r.created_at);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const quinzena = day <= 15 ? 1 : 2;
    const key = `${year}-${String(month + 1).padStart(2, '0')}-Q${quinzena}`;

    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return Object.entries(groups)
    .map(([key, items]) => {
      const [yearStr, monthStr, q] = key.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1;
      const quinzena = q === 'Q1' ? 1 : 2;
      const lastDay = quinzena === 1 ? 15 : endOfMonth(new Date(year, month)).getDate();
      const firstDay = quinzena === 1 ? 1 : 16;

      // Quinzena is closed if the end date has already passed
      const endDate = new Date(year, month, lastDay, 23, 59, 59);
      const closed = new Date() > endDate;

      const totalBruto = items.reduce((s, r) => s + Number(r.valor_frete), 0);
      const totalComissao = items.reduce((s, r) => s + Number(r.valor_comissao), 0);
      const totalLiquido = items.reduce((s, r) => s + Number(r.valor_liquido), 0);
      const qtdPendente = items.filter(r => r.status === 'pendente').length;
      const qtdPago = items.filter(r => r.status === 'pago').length;

      return {
        key,
        label: `${quinzena === 1 ? '1ª' : '2ª'} Quinzena — ${monthNames[month]} ${year}`,
        period: `${String(firstDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')} a ${String(lastDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`,
        registros: items,
        totalBruto,
        totalComissao,
        totalLiquido,
        qtdPendente,
        qtdPago,
        status: (qtdPendente === 0 ? 'pago' : qtdPago === 0 ? 'pendente' : 'parcial') as QuinzenaGroup['status'],
        closed,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export default function TransportadoraFinanceiro() {
  const { empresa } = useUserContext();
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const dateTo = (() => {
    const last = endOfMonth(new Date(selectedYear, selectedMonth));
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  })();

  const { ref: tableRef, height: tableHeight } = useRemainingViewportHeight({ bottomOffset: 16 });

  // Bank details
  const [bankForm, setBankForm] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: 'corrente',
    pix: '',
    titular: '',
  });
  const [bankLoaded, setBankLoaded] = useState(false);

  const { data: registros, isLoading } = useQuery({
    queryKey: ['transportadora-financeiro', empresa?.id, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      if (!empresa?.id) return [];
      let query = supabase
        .from('financeiro_entregas')
        .select(`
          *,
          entregas!inner(codigo, carga_id,
            cargas(codigo, descricao)
          ),
          empresa_embarcadora:empresas!financeiro_entregas_empresa_embarcadora_id_fkey(nome, nome_fantasia)
        `)
        .eq('empresa_transportadora_id', empresa.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') query = query.eq('status', statusFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresa?.id,
  });

  // Load bank details
  useQuery({
    queryKey: ['empresa-dados-bancarios', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data } = await supabase
        .from('empresas')
        .select('dados_bancarios')
        .eq('id', empresa.id)
        .single();
      if (data?.dados_bancarios) {
        const db = data.dados_bancarios as any;
        setBankForm({
          banco: db.banco || '',
          agencia: db.agencia || '',
          conta: db.conta || '',
          tipo_conta: db.tipo_conta || 'corrente',
          pix: db.pix || '',
          titular: db.titular || '',
        });
      }
      setBankLoaded(true);
      return data;
    },
    enabled: !!empresa?.id,
  });

  const saveBankMutation = useMutation({
    mutationFn: async () => {
      if (!empresa?.id) throw new Error('No empresa');
      const { error } = await supabase
        .from('empresas')
        .update({ dados_bancarios: bankForm as any })
        .eq('id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Dados bancários salvos!'),
    onError: () => toast.error('Erro ao salvar dados bancários'),
  });

  const quinzenas = useMemo(() => getQuinzenaGroups(registros || []), [registros]);

  const totalAReceber = registros?.filter(r => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_liquido), 0) || 0;
  const totalRecebido = registros?.filter(r => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_liquido), 0) || 0;
  const totalComissao = registros?.reduce((s: number, r: any) => s + Number(r.valor_comissao), 0) || 0;
  const qtdPendente = registros?.filter(r => r.status === 'pendente').length || 0;

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const statusBadge = (status: string) => {
    if (status === 'pago') return <Badge className="bg-chart-2 text-white">Recebido</Badge>;
    if (status === 'parcial') return <Badge variant="outline" className="border-chart-4 text-chart-4">Parcial</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Valores a receber agrupados por quinzena (15 em 15 dias)</p>
      </div>

      <Tabs defaultValue="receber" className="space-y-6">
        <TabsList>
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="conta">Conta de Recebimento</TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="space-y-6 mt-0">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <Clock className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalAReceber)}</p>
                  <p className="text-xs text-muted-foreground">A Receber ({qtdPendente})</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalRecebido)}</p>
                  <p className="text-xs text-muted-foreground">Recebido</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalComissao)}</p>
                  <p className="text-xs text-muted-foreground">Comissão HubFrete</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalAReceber + totalRecebido)}</p>
                  <p className="text-xs text-muted-foreground">Total líquido</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-36">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground">Ano</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quinzena Groups */}
          <div ref={tableRef} style={{ height: tableHeight }} className="overflow-auto space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : quinzenas.length === 0 ? (
              <Card className="border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum registro financeiro encontrado no período
                </CardContent>
              </Card>
            ) : (
              quinzenas.map((group) => (
                <Collapsible key={group.key} open={expandedGroups.has(group.key)} onOpenChange={() => toggleGroup(group.key)}>
                  <Card className="border-border">
                    <CollapsibleTrigger asChild>
                      <button className="w-full text-left">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground">{group.label}</p>
                              {statusBadge(group.status)}
                              {group.closed ? (
                                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground gap-1">
                                  <Lock className="w-3 h-3" /> Fechada
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-chart-1 text-chart-1 gap-1">
                                  <LockOpen className="w-3 h-3" /> Aberta
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{group.period} — {group.registros.length} carga(s)</p>
                          </div>
                          <div className="text-right mr-4 hidden sm:block">
                            <p className="text-lg font-bold text-chart-2">{formatCurrency(group.totalLiquido)}</p>
                            <p className="text-xs text-muted-foreground">
                              Bruto: {formatCurrency(group.totalBruto)} | Comissão: {formatCurrency(group.totalComissao)}
                            </p>
                          </div>
                          {expandedGroups.has(group.key) ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                        </CardContent>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entrega</TableHead>
                              <TableHead>Embarcador</TableHead>
                              <TableHead className="text-right">Frete Bruto</TableHead>
                              <TableHead className="text-right">Comissão</TableHead>
                              <TableHead className="text-right">Valor Líquido</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.registros.map((r: any) => (
                              <TableRow key={r.id}>
                                <TableCell>
                                  <p className="font-medium text-sm">{r.entregas?.codigo || '—'}</p>
                                  <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                                </TableCell>
                                <TableCell className="text-sm">{r.empresa_embarcadora?.nome_fantasia || r.empresa_embarcadora?.nome || '—'}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.valor_frete)}</TableCell>
                                <TableCell className="text-right text-sm text-destructive">
                                  {r.valor_comissao > 0 ? `- ${formatCurrency(r.valor_comissao)}` : '—'}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-chart-2">{formatCurrency(r.valor_liquido)}</TableCell>
                                <TableCell>
                                  <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={r.status === 'pago' ? 'bg-chart-2 text-white' : ''}>
                                    {r.status === 'pago' ? 'Recebido' : 'Pendente'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {r.data_pagamento
                                    ? format(new Date(r.data_pagamento), 'dd/MM/yyyy')
                                    : format(new Date(r.created_at), 'dd/MM/yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="conta" className="space-y-6 mt-0">
          <Card className="border-border max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="w-5 h-5" />
                Dados Bancários para Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titular da Conta</Label>
                <Input value={bankForm.titular} onChange={(e) => setBankForm(f => ({ ...f, titular: e.target.value }))} placeholder="Nome completo ou razão social" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banco</Label>
                  <Input value={bankForm.banco} onChange={(e) => setBankForm(f => ({ ...f, banco: e.target.value }))} placeholder="Ex: Bradesco" />
                </div>
                <div>
                  <Label>Tipo de Conta</Label>
                  <Select value={bankForm.tipo_conta} onValueChange={(v) => setBankForm(f => ({ ...f, tipo_conta: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agência</Label>
                  <Input value={bankForm.agencia} onChange={(e) => setBankForm(f => ({ ...f, agencia: e.target.value }))} placeholder="0001" />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input value={bankForm.conta} onChange={(e) => setBankForm(f => ({ ...f, conta: e.target.value }))} placeholder="12345-6" />
                </div>
              </div>
              <div>
                <Label>Chave PIX (preferencial)</Label>
                <Input value={bankForm.pix} onChange={(e) => setBankForm(f => ({ ...f, pix: e.target.value }))} placeholder="CPF, CNPJ, e-mail ou chave aleatória" />
              </div>
              <Button onClick={() => saveBankMutation.mutate()} disabled={saveBankMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveBankMutation.isPending ? 'Salvando...' : 'Salvar Dados Bancários'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
