import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
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
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, Clock, Landmark, Save, CreditCard, Zap,
  Calendar, AlertTriangle,
} from 'lucide-react';
import { format, endOfMonth, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { Pagination } from '@/components/admin/Pagination';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';

const ITEMS_PER_PAGE = 15;

export default function TransportadoraFinanceiro() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const now = new Date();
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [page, setPage] = useState(1);
  const [antecipacaoDialog, setAntecipacaoDialog] = useState<any | null>(null);

  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const dateTo = (() => {
    const last = endOfMonth(new Date(selectedYear, selectedMonth));
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  })();

  const [bankForm, setBankForm] = useState({ banco: '', agencia: '', conta: '', tipo_conta: 'corrente', pix: '', titular: '' });
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
        .order('data_vencimento', { ascending: true, nullsFirst: false });

      if (statusFilter !== 'todos') query = query.eq('status', statusFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch config for antecipação
  const { data: configEmbarcadores } = useQuery({
    queryKey: ['embarcador-configs-for-transportadora'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresa_config_financeira' as any)
        .select('empresa_id, antecipacao_permitida, taxa_antecipacao_percent, limite_credito, credito_utilizado');
      if (error) throw error;
      return (data as any[]).reduce((acc: Record<number, any>, c: any) => {
        acc[c.empresa_id] = c;
        return acc;
      }, {} as Record<number, any>);
    },
  });

  // Load bank details
  useQuery({
    queryKey: ['empresa-dados-bancarios', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data } = await supabase.from('empresas').select('dados_bancarios').eq('id', empresa.id).single();
      if (data?.dados_bancarios) {
        const db = data.dados_bancarios as any;
        setBankForm({ banco: db.banco || '', agencia: db.agencia || '', conta: db.conta || '', tipo_conta: db.tipo_conta || 'corrente', pix: db.pix || '', titular: db.titular || '' });
      }
      setBankLoaded(true);
      return data;
    },
    enabled: !!empresa?.id,
  });

  const saveBankMutation = useMutation({
    mutationFn: async () => {
      if (!empresa?.id) throw new Error('No empresa');
      const { error } = await supabase.from('empresas').update({ dados_bancarios: bankForm as any }).eq('id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Dados bancários salvos!'),
    onError: () => toast.error('Erro ao salvar dados bancários'),
  });

  // Antecipação mutation
  const antecipacaoMutation = useMutation({
    mutationFn: async (recebivel: any) => {
      const cfg = configEmbarcadores?.[recebivel.empresa_embarcadora_id];
      if (!cfg?.antecipacao_permitida) throw new Error('Antecipação não permitida para este embarcador');

      const diasRestantes = differenceInDays(new Date(recebivel.data_vencimento), new Date());
      if (diasRestantes <= 0) throw new Error('Recebível já vencido');

      const taxa = cfg.taxa_antecipacao_percent || 2;
      const valorTaxa = Math.round(recebivel.valor_liquido * (taxa / 100) * 100) / 100;

      const { error } = await supabase
        .from('financeiro_entregas')
        .update({
          antecipado: true,
          data_antecipacao: new Date().toISOString(),
          taxa_antecipacao_percent: taxa,
          dias_antecipados: diasRestantes,
          valor_taxa_antecipacao: valorTaxa,
        })
        .eq('id', recebivel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportadora-financeiro'] });
      toast.success('Antecipação solicitada com sucesso!');
      setAntecipacaoDialog(null);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao solicitar antecipação'),
  });

  const totalPages = Math.max(1, Math.ceil((registros?.length || 0) / ITEMS_PER_PAGE));
  const pagedItems = registros?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) || [];

  const totalAReceber = registros?.filter(r => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_liquido), 0) || 0;
  const totalRecebido = registros?.filter(r => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_liquido), 0) || 0;
  const totalComissao = registros?.reduce((s: number, r: any) => s + Number(r.valor_comissao), 0) || 0;
  const qtdPendente = registros?.filter(r => r.status === 'pendente').length || 0;
  const totalAntecipados = registros?.filter(r => r.antecipado).length || 0;

  const canAntecipar = (r: any) => {
    if (r.status !== 'pendente' || r.antecipado) return false;
    if (!r.data_vencimento || differenceInDays(new Date(r.data_vencimento), new Date()) <= 0) return false;
    const cfg = configEmbarcadores?.[r.empresa_embarcadora_id];
    return cfg?.antecipacao_permitida === true;
  };

  const vencimentoInfo = (r: any) => {
    if (!r.data_vencimento) return null;
    const dias = differenceInDays(new Date(r.data_vencimento), new Date());
    return { date: format(new Date(r.data_vencimento), 'dd/MM/yyyy'), dias, isLate: dias < 0, isClose: dias >= 0 && dias <= 5 };
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Recebíveis individuais — cada carga finalizada vence em D+30</p>
      </div>

      <Tabs defaultValue="receber" className="space-y-6">
        <TabsList>
          <TabsTrigger value="receber">Recebíveis</TabsTrigger>
          <TabsTrigger value="conta">Conta de Recebimento</TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="space-y-6 mt-0">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-chart-4/10 rounded-lg"><Clock className="w-5 h-5 text-chart-4" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalAReceber)}</p>
                  <p className="text-xs text-muted-foreground">A Receber ({qtdPendente})</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg"><CheckCircle className="w-5 h-5 text-chart-2" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalRecebido)}</p>
                  <p className="text-xs text-muted-foreground">Recebido</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg"><CreditCard className="w-5 h-5 text-destructive" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalComissao)}</p>
                  <p className="text-xs text-muted-foreground">Taxa HubFrete</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalAReceber + totalRecebido)}</p>
                  <p className="text-xs text-muted-foreground">Total líquido</p>
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

          {/* Annual Chart */}
          {empresa?.id && (
            <AnnualBarChart empresaId={empresa.id} filterColumn="empresa_transportadora_id" valueField="valor_liquido" year={selectedYear} />
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-36">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">A Receber</SelectItem>
                  <SelectItem value="pago">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <MonthYearPicker month={selectedMonth} year={selectedYear} onChangeMonth={setSelectedMonth} onChangeYear={setSelectedYear} />
          </div>

          {/* Table */}
          <Card className="border-border">
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Carga</th>
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
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8} className="p-3"><Skeleton className="h-10 w-full" /></td></tr>)
                    ) : pagedItems.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-muted-foreground py-12">Nenhum recebível encontrado no período</td></tr>
                    ) : (
                      pagedItems.map((r: any) => {
                        const v = vencimentoInfo(r);
                        return (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{r.entregas?.codigo || '—'}</p>
                              <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                            </td>
                            <td className="px-4 py-3">{r.empresa_embarcadora?.nome_fantasia || r.empresa_embarcadora?.nome || '—'}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(r.valor_frete)}</td>
                            <td className="px-4 py-3 text-right text-destructive">
                              {r.valor_comissao > 0 ? `- ${formatCurrency(r.valor_comissao)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-chart-2">
                              {formatCurrency(r.valor_liquido)}
                              {r.antecipado && r.valor_taxa_antecipacao > 0 && (
                                <p className="text-xs text-chart-4">- {formatCurrency(r.valor_taxa_antecipacao)} (antecip.)</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {v ? (
                                <div className="text-xs">
                                  <p className="font-medium">{v.date}</p>
                                  {r.status === 'pendente' && (
                                    <p className={v.isLate ? 'text-destructive' : v.isClose ? 'text-chart-4' : 'text-muted-foreground'}>
                                      {v.isLate ? `${Math.abs(v.dias)}d atraso` : v.dias === 0 ? 'Hoje' : `em ${v.dias}d`}
                                    </p>
                                  )}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.status === 'pago' ? (
                                <Badge className="bg-chart-2 text-white">Recebido</Badge>
                              ) : r.antecipado ? (
                                <Badge className="bg-chart-4 text-white">Antecipado</Badge>
                              ) : (
                                <Badge variant="secondary">Pendente</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {canAntecipar(r) && (
                                <Button size="sm" variant="outline" className="text-chart-4 border-chart-4 hover:bg-chart-4/10" onClick={() => setAntecipacaoDialog(r)}>
                                  <Zap className="w-4 h-4 mr-1" /> Antecipar
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {(registros?.length || 0) > ITEMS_PER_PAGE && (
              <div className="border-t border-border">
                <Pagination currentPage={page} totalPages={totalPages} totalItems={registros?.length || 0} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="conta" className="space-y-6 mt-0">
          <Card className="border-border max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="w-5 h-5" /> Dados Bancários para Recebimento
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

      {/* Antecipação Dialog */}
      <Dialog open={!!antecipacaoDialog} onOpenChange={() => setAntecipacaoDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-chart-4" /> Solicitar Antecipação</DialogTitle></DialogHeader>
          {antecipacaoDialog && (() => {
            const cfg = configEmbarcadores?.[antecipacaoDialog.empresa_embarcadora_id];
            const taxa = cfg?.taxa_antecipacao_percent || 2;
            const valorLiquido = Number(antecipacaoDialog.valor_liquido);
            const valorTaxa = Math.round(valorLiquido * (taxa / 100) * 100) / 100;
            const valorFinal = valorLiquido - valorTaxa;
            const diasRestantes = differenceInDays(new Date(antecipacaoDialog.data_vencimento), new Date());

            return (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Carga: {antecipacaoDialog.entregas?.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento original: {format(new Date(antecipacaoDialog.data_vencimento), 'dd/MM/yyyy')} ({diasRestantes} dias restantes)
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor líquido</span>
                    <span className="font-medium">{formatCurrency(valorLiquido)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de antecipação ({taxa}%)</span>
                    <span className="text-destructive">- {formatCurrency(valorTaxa)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Valor a receber</span>
                    <span className="text-lg font-bold text-chart-2">{formatCurrency(valorFinal)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-chart-4/10 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                  <p className="text-xs text-chart-4">
                    Ao confirmar, o valor será disponibilizado antecipadamente com desconto da taxa. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAntecipacaoDialog(null)}>Cancelar</Button>
            <Button className="bg-chart-4 hover:bg-chart-4/90 text-white" onClick={() => antecipacaoMutation.mutate(antecipacaoDialog)} disabled={antecipacaoMutation.isPending}>
              <Zap className="w-4 h-4 mr-1" />
              {antecipacaoMutation.isPending ? 'Processando...' : 'Confirmar Antecipação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
