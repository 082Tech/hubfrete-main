import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatWeight } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  DollarSign,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  TrendingUp,
  Building2,
  MapPin,
} from 'lucide-react';

interface Entrega {
  id: string;
  codigo: string;
  status: string;
  valor_frete: number | null;
  peso_alocado_kg: number | null;
  motorista?: { id: string; nome_completo: string } | null;
  carga: {
    peso_kg: number;
    destinatario_nome_fantasia?: string | null;
    destinatario_razao_social?: string | null;
    endereco_origem?: { cidade: string } | null;
    endereco_destino?: { cidade: string } | null;
  };
}

interface EmbarcadorDailyPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregas: Entrega[];
}

const STATUS_COLORS: Record<string, string> = {
  aguardando: '#f59e0b',
  saiu_para_coleta: '#06b6d4',
  em_transito: '#6366f1',
  saiu_para_entrega: '#a855f7',
  entregue: '#22c55e',
  cancelada: '#ef4444',
};

export function EmbarcadorDailyPerformanceDialog({
  open,
  onOpenChange,
  entregas,
}: EmbarcadorDailyPerformanceDialogProps) {
  const metrics = useMemo(() => {
    const total = entregas.length;
    const aguardando = entregas.filter(e => e.status === 'aguardando').length;
    const coleta = entregas.filter(e => e.status === 'saiu_para_coleta').length;
    const emRota = entregas.filter(e => e.status === 'saiu_para_entrega').length;
    const entregues = entregas.filter(e => e.status === 'entregue').length;
    const canceladas = entregas.filter(e => e.status === 'cancelada').length;

    const valorTotal = entregas
      .filter(e => e.valor_frete)
      .reduce((sum, e) => sum + (e.valor_frete || 0), 0);

    const valorEntregue = entregas
      .filter(e => e.status === 'entregue' && e.valor_frete)
      .reduce((sum, e) => sum + (e.valor_frete || 0), 0);

    const pesoTotal = entregas.reduce((sum, e) => sum + (e.peso_alocado_kg || e.carga.peso_kg || 0), 0);
    const pesoConcluido = entregas
      .filter(e => e.status === 'entregue')
      .reduce((sum, e) => sum + (e.peso_alocado_kg || e.carga.peso_kg || 0), 0);

    const taxaConclusao = total > 0 ? ((entregues / total) * 100).toFixed(1) : '0';

    const transportadorasUnicas = new Set(entregas.map(e => e.motorista?.id).filter(Boolean)).size;

    return {
      total, aguardando, coleta, emRota, entregues, canceladas,
      valorTotal, valorEntregue, pesoTotal, pesoConcluido, taxaConclusao, transportadorasUnicas,
    };
  }, [entregas]);

  const statusData = useMemo(() => {
    return [
      { name: 'Aguardando', value: metrics.aguardando, color: STATUS_COLORS.aguardando },
      { name: 'Saiu p/ Coleta', value: metrics.coleta, color: STATUS_COLORS.saiu_para_coleta },
      { name: 'Saiu p/ Entrega', value: metrics.emRota, color: STATUS_COLORS.saiu_para_entrega },
      { name: 'Concluída', value: metrics.entregues, color: STATUS_COLORS.entregue },
      { name: 'Cancelada', value: metrics.canceladas, color: STATUS_COLORS.cancelada },
    ].filter(d => d.value > 0);
  }, [metrics]);

  // Top 5 Destinatários
  const destinatarioData = useMemo(() => {
    const groups: Record<string, { nome: string; cargas: number; valor: number }> = {};
    entregas.forEach(e => {
      const nome = e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || 'Sem destinatário';
      if (!groups[nome]) {
        groups[nome] = { nome, cargas: 0, valor: 0 };
      }
      groups[nome].cargas++;
      groups[nome].valor += e.valor_frete || 0;
    });
    return Object.values(groups)
      .sort((a, b) => b.cargas - a.cargas)
      .slice(0, 5);
  }, [entregas]);

  // Top 5 Rotas (Origem → Destino)
  const rotaData = useMemo(() => {
    const groups: Record<string, { nome: string; cargas: number }> = {};
    entregas.forEach(e => {
      const origem = e.carga.endereco_origem?.cidade || '?';
      const destino = e.carga.endereco_destino?.cidade || '?';
      const rota = `${origem} → ${destino}`;
      if (!groups[rota]) {
        groups[rota] = { nome: rota, cargas: 0 };
      }
      groups[rota].cargas++;
    });
    return Object.values(groups)
      .sort((a, b) => b.cargas - a.cargas)
      .slice(0, 5);
  }, [entregas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Desempenho do Dia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Package className="w-3.5 h-3.5" />
                  Total de Cargas
                </div>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Frete Total
                </div>
                <p className="text-2xl font-bold text-primary">
                  R$ {metrics.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Frete Concluído
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {metrics.valorEntregue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Taxa de Conclusão
                </div>
                <p className="text-2xl font-bold">{metrics.taxaConclusao}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-5 gap-2">
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10">
              <CardContent className="p-3 text-center">
                <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{metrics.aguardando}</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">Aguardando</p>
              </CardContent>
            </Card>

            <Card className="border-cyan-200 bg-cyan-50 dark:border-cyan-800/40 dark:bg-cyan-900/10">
              <CardContent className="p-3 text-center">
                <Truck className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-cyan-800 dark:text-cyan-200">{metrics.coleta}</p>
                <p className="text-[10px] text-cyan-700 dark:text-cyan-300">Saiu p/ Coleta</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50 dark:border-purple-800/40 dark:bg-purple-900/10">
              <CardContent className="p-3 text-center">
                <Truck className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{metrics.emRota}</p>
                <p className="text-[10px] text-purple-700 dark:text-purple-300">Saiu p/ Entrega</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10">
              <CardContent className="p-3 text-center">
                <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{metrics.entregues}</p>
                <p className="text-[10px] text-green-700 dark:text-green-300">Concluída</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/10">
              <CardContent className="p-3 text-center">
                <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-800 dark:text-red-200">{metrics.canceladas}</p>
                <p className="text-[10px] text-red-700 dark:text-red-300">Cancelada</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Top Destinatários */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Top 5 Destinatários
                </CardTitle>
              </CardHeader>
              <CardContent>
                {destinatarioData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={destinatarioData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={100}
                        fontSize={10}
                        tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value, 'Cargas']}
                      />
                      <Bar dataKey="cargas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid md:grid-cols-3 gap-3">
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Package className="w-3.5 h-3.5" />
                  Peso Total Alocado
                </div>
                <p className="text-xl font-bold">{formatWeight(metrics.pesoTotal)}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Peso Concluído
                </div>
                <p className="text-xl font-bold text-green-600">{formatWeight(metrics.pesoConcluido)}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Rotas Ativas
                </div>
                <p className="text-xl font-bold text-amber-600">
                  {rotaData.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Routes */}
          {rotaData.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Rotas Mais Frequentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rotaData.map((rota, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{rota.nome}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {rota.cargas} carga{rota.cargas !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
