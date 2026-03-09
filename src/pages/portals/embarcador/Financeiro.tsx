import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DollarSign, CheckCircle, Clock, CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/reportExport';

export default function EmbarcadorFinanceiro() {
  const { empresa } = useUserContext();
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(today);

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

  const totalAPagar = registros?.filter(r => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_frete), 0) || 0;
  const totalPago = registros?.filter(r => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_frete), 0) || 0;
  const totalComissao = registros?.reduce((s: number, r: any) => s + Number(r.valor_comissao), 0) || 0;
  const qtdPendente = registros?.filter(r => r.status === 'pendente').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Contas a pagar e histórico de pagamentos</p>
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

      {/* Filters */}
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
        <div className="w-40">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-right">Valor do Frete</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Nenhum registro financeiro encontrado
                    </TableCell>
                  </TableRow>
                )}
                {registros?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.entregas?.codigo || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.entregas?.cargas?.codigo}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.empresa_transportadora?.nome_fantasia || r.empresa_transportadora?.nome || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{r.entregas?.motoristas?.nome_completo || '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(r.valor_frete)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {r.valor_comissao > 0 ? formatCurrency(r.valor_comissao) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={r.status === 'pago' ? 'bg-chart-2 text-white' : ''}>
                        {r.status === 'pago' ? 'Pago' : 'A Pagar'}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
