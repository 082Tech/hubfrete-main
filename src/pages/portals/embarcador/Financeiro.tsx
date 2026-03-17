import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart3, DollarSign, Clock, CheckCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { endOfMonth, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FinanceCalendar } from '@/components/financeiro/FinanceCalendar';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';
import { formatCurrency } from '@/lib/reportExport';

export default function EmbarcadorFinanceiro() {
  const { empresa } = useUserContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: registros = [] } = useQuery({
    queryKey: ['embarcador-financeiro', empresa?.id, monthStart.toISOString()],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('financeiro_entregas')
        .select(`
          *,
          entregas!inner(codigo, carga_id,
            cargas(codigo, descricao),
            motoristas(nome_completo)
          ),
          empresa_transportadora:empresas!financeiro_entregas_empresa_transportadora_id_fkey(nome, nome_fantasia)
        `)
        .eq('empresa_embarcadora_id', empresa.id)
        .gte('data_vencimento', monthStart.toISOString().slice(0, 10))
        .lte('data_vencimento', monthEnd.toISOString().slice(0, 10))
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresa?.id,
  });

  const { data: configFinanceira } = useQuery({
    queryKey: ['embarcador-config-financeira', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data, error } = await supabase
        .from('empresa_config_financeira' as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!empresa?.id,
  });

  const isFaturado = configFinanceira?.tipo_pagamento === 'faturado';

  const tipoPagamentoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pos_pago': return 'Pós-pago';
      case 'faturado': return 'Faturado';
      default: return 'Padrão (D+30)';
    }
  };

  const totalPendente = registros.filter((r: any) => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_frete), 0);
  const totalPago = registros.filter((r: any) => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_frete), 0);
  const countPendente = registros.filter((r: any) => r.status === 'pendente').length;

  // Group by period for faturado view
  const faturaGroups = useMemo(() => {
    if (!isFaturado || registros.length === 0) return [];
    const ciclo = configFinanceira?.ciclo_faturamento || 'mensal';
    const groups: Record<string, { label: string; items: any[] }> = {};

    for (const r of registros) {
      let key: string;
      let label: string;
      const d = r.data_vencimento ? new Date(r.data_vencimento) : new Date();
      const monthLabel = format(monthStart, 'MMM/yyyy', { locale: ptBR });

      if (ciclo === 'quinzenal') {
        const day = d.getDate();
        const q = day <= 15 ? '1' : '2';
        key = `${q}`;
        label = q === '1' ? `1ª Quinzena · ${monthLabel}` : `2ª Quinzena · ${monthLabel}`;
      } else {
        key = 'mensal';
        label = `Fatura · ${monthLabel}`;
      }

      if (!groups[key]) groups[key] = { label, items: [] };
      groups[key].items.push(r);
    }

    return Object.entries(groups).map(([key, val]) => ({ key, ...val }));
  }, [registros, isFaturado, configFinanceira]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {isFaturado ? 'Acompanhe suas faturas por período' : 'Acompanhe seus pagamentos por carga finalizada'}
          </p>
        </div>
        {configFinanceira && (
          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {tipoPagamentoLabel(configFinanceira.tipo_pagamento)}
            {configFinanceira.tipo_pagamento === 'faturado' && configFinanceira.dia_fixo
              ? ` · Venc. dia ${configFinanceira.dia_fixo}`
              : ` · D+${configFinanceira.prazo_dias}`
            }
          </Badge>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-chart-4/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPendente)}</p>
              <p className="text-[10px] text-muted-foreground">{countPendente} pagamento{countPendente !== 1 ? 's' : ''} pendente{countPendente !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-chart-2" />
            </div>
            <div>
              <p className="text-lg font-bold text-chart-2">{formatCurrency(totalPago)}</p>
              <p className="text-[10px] text-muted-foreground">Pagos no mês</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPendente + totalPago)}</p>
              <p className="text-[10px] text-muted-foreground">Total do mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isFaturado ? (
        /* ===== FATURADO VIEW ===== */
        <Tabs defaultValue="faturas" className="space-y-3">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="faturas" className="gap-2">
              <FileText className="w-4 h-4" /> Faturas
            </TabsTrigger>
            <TabsTrigger value="anual" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Visão Anual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faturas" className="mt-0 space-y-3">
            {faturaGroups.length === 0 ? (
              <Card className="border-dashed border-2 border-border">
                <CardContent className="py-16 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Nenhuma fatura neste mês</p>
                </CardContent>
              </Card>
            ) : (
              faturaGroups.map(group => {
                const isExpanded = expandedGroups.has(group.key);
                const groupTotal = group.items.reduce((s: number, r: any) => s + Number(r.valor_frete), 0);
                const allPaid = group.items.every((r: any) => r.status === 'pago');
                const pendingCount = group.items.filter((r: any) => r.status === 'pendente').length;
                const diaFixo = configFinanceira?.dia_fixo;

                return (
                  <Card key={group.key} className="border-border overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{group.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.items.length} {group.items.length === 1 ? 'entrega' : 'entregas'}
                            {diaFixo && ` · Venc. dia ${diaFixo}`}
                            {pendingCount > 0 && <span className="text-chart-4 ml-2">({pendingCount} pendente{pendingCount > 1 ? 's' : ''})</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(groupTotal)}</p>
                        {allPaid
                          ? <Badge className="bg-chart-2 text-white text-[10px]">Paga</Badge>
                          : <Badge variant="secondary" className="text-[10px]">Em aberto</Badge>
                        }
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40">
                            <tr className="border-b border-border">
                              <th className="text-left font-medium text-muted-foreground px-4 py-2 text-xs">Carga</th>
                              <th className="text-left font-medium text-muted-foreground px-4 py-2 text-xs">Transportadora</th>
                              <th className="text-right font-medium text-muted-foreground px-4 py-2 text-xs">Valor</th>
                              <th className="text-center font-medium text-muted-foreground px-4 py-2 text-xs">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((r: any) => (
                              <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                                <td className="px-4 py-2.5">
                                  <p className="font-medium text-foreground text-sm">{r.entregas?.codigo || '—'}</p>
                                  <p className="text-[10px] text-muted-foreground">{r.entregas?.cargas?.descricao}</p>
                                </td>
                                <td className="px-4 py-2.5 text-sm">
                                  {r.empresa_transportadora?.nome_fantasia || r.empresa_transportadora?.nome || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(r.valor_frete)}</td>
                                <td className="px-4 py-2.5 text-center">
                                  {r.status === 'pago'
                                    ? <Badge className="bg-chart-2 text-white text-[10px]">Pago</Badge>
                                    : <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="anual" className="mt-0">
            {empresa?.id && (
              <AnnualBarChart
                empresaId={empresa.id}
                filterColumn="empresa_embarcadora_id"
                valueField="valor_frete"
                year={currentMonth.getFullYear()}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* ===== PÓS-PAGO VIEW (calendar) ===== */
        <Tabs defaultValue="calendario" className="space-y-3">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="calendario" className="gap-2">
              <Calendar className="w-4 h-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="anual" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Visão Anual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="mt-0">
            <FinanceCalendar
              recebiveis={registros}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              perspective="embarcador"
            />
          </TabsContent>

          <TabsContent value="anual" className="mt-0">
            {empresa?.id && (
              <AnnualBarChart
                empresaId={empresa.id}
                filterColumn="empresa_embarcadora_id"
                valueField="valor_frete"
                year={currentMonth.getFullYear()}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
