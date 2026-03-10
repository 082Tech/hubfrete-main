import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, Clock, CreditCard, ChevronDown, ChevronRight, Calendar, Lock, LockOpen,
} from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/reportExport';
import { Pagination } from '@/components/admin/Pagination';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';

const ITEMS_PER_PAGE = 10;

interface QuinzenaGroup {
  key: string;
  label: string;
  period: string;
  registros: any[];
  totalFrete: number;
  totalComissao: number;
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
      const endDate = new Date(year, month, lastDay, 23, 59, 59);
      const closed = new Date() > endDate;

      const totalFrete = items.reduce((s, r) => s + Number(r.valor_frete), 0);
      const totalComissao = items.reduce((s, r) => s + Number(r.valor_comissao), 0);
      const qtdPendente = items.filter(r => r.status === 'pendente').length;
      const qtdPago = items.filter(r => r.status === 'pago').length;

      return {
        key,
        label: `${quinzena === 1 ? '1ª' : '2ª'} Quinzena — ${monthNames[month]} ${year}`,
        period: `${String(firstDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')} a ${String(lastDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`,
        registros: items,
        totalFrete,
        totalComissao,
        qtdPendente,
        qtdPago,
        status: (qtdPendente === 0 ? 'pago' : qtdPago === 0 ? 'pendente' : 'parcial') as QuinzenaGroup['status'],
        closed,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export default function EmbarcadorFinanceiro() {
  const { empresa } = useUserContext();
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});

  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const dateTo = (() => {
    const last = endOfMonth(new Date(selectedYear, selectedMonth));
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  })();
  const { data: registros, isLoading } = useQuery({
    queryKey: ['embarcador-financeiro', empresa?.id, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      if (!empresa?.id) return [];
      let query = supabase
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

  const quinzenas = useMemo(() => getQuinzenaGroups(registros || []), [registros]);

  const totalAPagar = registros?.filter(r => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_frete), 0) || 0;
  const totalPago = registros?.filter(r => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_frete), 0) || 0;
  const totalComissao = registros?.reduce((s: number, r: any) => s + Number(r.valor_comissao), 0) || 0;
  const qtdPendente = registros?.filter(r => r.status === 'pendente').length || 0;

  const toggleGroup = (key: string) => {
    setOpenGroup(prev => prev === key ? null : key);
    if (!groupPages[key]) setGroupPages(p => ({ ...p, [key]: 1 }));
  };

  const statusBadge = (status: string) => {
    if (status === 'pago') return <Badge className="bg-chart-2 text-white">Pago</Badge>;
    if (status === 'parcial') return <Badge variant="outline" className="border-chart-4 text-chart-4">Parcial</Badge>;
    return <Badge variant="secondary">A Pagar</Badge>;
  };

  const getPagedRegistros = (group: QuinzenaGroup) => {
    const page = groupPages[group.key] || 1;
    return group.registros.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Contas a pagar agrupadas por quinzena (15 em 15 dias)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-4/10 rounded-lg">
              <Clock className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalAPagar)}</p>
              <p className="text-xs text-muted-foreground">A Pagar ({qtdPendente})</p>
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
              <CreditCard className="w-5 h-5 text-primary" />
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
              <DollarSign className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalAPagar + totalPago)}</p>
              <p className="text-xs text-muted-foreground">Total geral</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Annual Chart */}
      {empresa?.id && (
        <AnnualBarChart
          empresaId={empresa.id}
          filterColumn="empresa_embarcadora_id"
          valueField="valor_frete"
          year={selectedYear}
        />
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-36">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">A Pagar</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <MonthYearPicker
          month={selectedMonth}
          year={selectedYear}
          onChangeMonth={setSelectedMonth}
          onChangeYear={setSelectedYear}
        />
      </div>

      {/* Quinzena Groups */}
      <div className="space-y-3 pb-10">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : quinzenas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum registro financeiro encontrado no período
            </CardContent>
          </Card>
        ) : (
          quinzenas.map((group) => {
            const isOpen = openGroup === group.key;
            const page = groupPages[group.key] || 1;
            const totalPages = Math.max(1, Math.ceil(group.registros.length / ITEMS_PER_PAGE));
            const pagedItems = getPagedRegistros(group);

            return (
              <Collapsible key={group.key} open={isOpen} onOpenChange={() => toggleGroup(group.key)}>
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
                          <p className="text-lg font-bold text-foreground">{formatCurrency(group.totalFrete)}</p>
                          <p className="text-xs text-muted-foreground">
                            Comissão: {formatCurrency(group.totalComissao)}
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
                      <div className="overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr className="border-b border-border">
                              <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-[18%]">Carga</th>
                              <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-[18%]">Transportadora</th>
                              <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-[16%]">Motorista</th>
                              <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[14%]">Valor do Frete</th>
                              <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[10%]">Comissão</th>
                              <th className="text-center font-medium text-muted-foreground px-4 py-2.5 w-[10%]">Status</th>
                              <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-[14%]">Data</th>
                            </tr>
                          </thead>
                        </table>
                        <div className="max-h-[380px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <tbody>
                              {pagedItems.map((r: any) => (
                                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3 w-[18%]">
                                    <p className="font-medium">{r.entregas?.codigo || '—'}</p>
                                    <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                                  </td>
                                  <td className="px-4 py-3 w-[18%]">
                                    {r.empresa_transportadora?.nome_fantasia || r.empresa_transportadora?.nome || '—'}
                                  </td>
                                  <td className="px-4 py-3 w-[16%]">{r.entregas?.motoristas?.nome_completo || '—'}</td>
                                  <td className="px-4 py-3 text-right font-semibold w-[14%]">{formatCurrency(r.valor_frete)}</td>
                                  <td className="px-4 py-3 text-right text-xs text-muted-foreground w-[10%]">
                                    {r.valor_comissao > 0 ? formatCurrency(r.valor_comissao) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center w-[10%]">
                                    <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={r.status === 'pago' ? 'bg-chart-2 text-white' : ''}>
                                      {r.status === 'pago' ? 'Pago' : 'A Pagar'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right text-xs text-muted-foreground w-[14%]">
                                    {r.data_pagamento
                                      ? format(new Date(r.data_pagamento), 'dd/MM/yyyy')
                                      : format(new Date(r.created_at), 'dd/MM/yyyy')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {group.registros.length > ITEMS_PER_PAGE && (
                        <div className="border-t border-border">
                          <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={group.registros.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={(p) => setGroupPages(prev => ({ ...prev, [group.key]: p }))}
                          />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
