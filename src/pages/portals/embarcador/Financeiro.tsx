import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, Clock, Calendar,
} from 'lucide-react';
import { format, endOfMonth, differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/reportExport';
import { Pagination } from '@/components/admin/Pagination';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';

const ITEMS_PER_PAGE = 15;

export default function EmbarcadorFinanceiro() {
  const { empresa } = useUserContext();
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [page, setPage] = useState(1);

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

  // Fetch empresa config
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

  const totalPages = Math.max(1, Math.ceil((registros?.length || 0) / ITEMS_PER_PAGE));
  const pagedItems = registros?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) || [];

  const totalAPagar = registros?.filter(r => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_frete), 0) || 0;
  const totalPago = registros?.filter(r => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_frete), 0) || 0;
  const qtdPendente = registros?.filter(r => r.status === 'pendente').length || 0;

  const tipoPagamentoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pre_pago': return 'Pré-pago';
      case 'pos_pago': return 'Pós-pago';
      case 'faturado': return 'Faturado';
      default: return 'Padrão (D+30)';
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Pagamentos individuais por carga finalizada</p>
        </div>
        {configFinanceira && (
          <Badge variant="outline" className="text-sm gap-1.5 px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {tipoPagamentoLabel(configFinanceira.tipo_pagamento)} · D+{configFinanceira.prazo_dias}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-4/10 rounded-lg"><Clock className="w-5 h-5 text-chart-4" /></div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalAPagar)}</p>
              <p className="text-xs text-muted-foreground">A Pagar ({qtdPendente})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg"><CheckCircle className="w-5 h-5 text-chart-2" /></div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalPago)}</p>
              <p className="text-xs text-muted-foreground">Pago</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg"><DollarSign className="w-5 h-5 text-accent-foreground" /></div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalAPagar + totalPago)}</p>
              <p className="text-xs text-muted-foreground">Total geral</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Annual Chart */}
      {empresa?.id && (
        <AnnualBarChart empresaId={empresa.id} filterColumn="empresa_embarcadora_id" valueField="valor_frete" year={selectedYear} />
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-36">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">A Pagar</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
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
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Transportadora</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Motorista</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Valor do Frete</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-2.5">Vencimento</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-2.5">Status</th>
              </tr>
            </thead>
          </table>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-10 w-full" /></td></tr>)
                ) : pagedItems.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-12">Nenhum registro financeiro encontrado no período</td></tr>
                ) : (
                  pagedItems.map((r: any) => {
                    const v = r.data_vencimento ? {
                      date: format(new Date(r.data_vencimento), 'dd/MM/yyyy'),
                      dias: differenceInDays(new Date(r.data_vencimento), new Date()),
                    } : null;
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.entregas?.codigo || '—'}</p>
                          <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                        </td>
                        <td className="px-4 py-3">{r.empresa_transportadora?.nome_fantasia || r.empresa_transportadora?.nome || '—'}</td>
                        <td className="px-4 py-3">{r.entregas?.motoristas?.nome_completo || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.valor_frete)}</td>
                        <td className="px-4 py-3 text-center">
                          {v ? (
                            <div className="text-xs">
                              <p className="font-medium">{v.date}</p>
                              {r.status === 'pendente' && (
                                <p className={v.dias < 0 ? 'text-destructive' : v.dias <= 5 ? 'text-chart-4' : 'text-muted-foreground'}>
                                  {v.dias < 0 ? `${Math.abs(v.dias)}d atraso` : v.dias === 0 ? 'Hoje' : `em ${v.dias}d`}
                                </p>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={r.status === 'pago' ? 'bg-chart-2 text-white' : ''}>
                            {r.status === 'pago' ? 'Pago' : 'A Pagar'}
                          </Badge>
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
    </div>
  );
}
