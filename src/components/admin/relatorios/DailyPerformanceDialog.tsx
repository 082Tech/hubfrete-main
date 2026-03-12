import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatWeight } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  XCircle,
  TrendingUp,
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
    endereco_origem?: { cidade: string } | null;
    endereco_destino?: { cidade: string } | null;
  };
}

interface DailyPerformanceDialogProps {
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

const STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando',
  saiu_para_coleta: 'Saiu p/ Coleta',
  em_transito: 'Em Trânsito',
  saiu_para_entrega: 'Saiu p/ Entrega',
  entregue: 'Concluída',
  cancelada: 'Cancelada',
};

export function DailyPerformanceDialog({
  open,
  onOpenChange,
  entregas,
}: DailyPerformanceDialogProps) {
  // Calcular métricas
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

    const taxaEntrega = total > 0 ? ((entregues / total) * 100).toFixed(1) : '0';

    // Motoristas únicos
    const motoristasUnicos = new Set(entregas.map(e => e.motorista?.id).filter(Boolean)).size;

    return {
      total,
      aguardando,
      coleta,
      emRota,
      entregues,
      canceladas,
      valorTotal,
      valorEntregue,
      pesoTotal,
      taxaEntrega,
      motoristasUnicos,
    };
  }, [entregas]);

  // Dados para gráfico de pizza
  const statusData = useMemo(() => {
    const data = [
      { name: 'Aguardando', value: metrics.aguardando, color: STATUS_COLORS.aguardando },
      { name: 'Saiu p/ Coleta', value: metrics.coleta, color: STATUS_COLORS.saiu_para_coleta },
      { name: 'Em Rota', value: metrics.emRota, color: STATUS_COLORS.saiu_para_entrega },
      { name: 'Concluída', value: metrics.entregues, color: STATUS_COLORS.entregue },
      { name: 'Cancelada', value: metrics.canceladas, color: STATUS_COLORS.cancelada },
    ].filter(d => d.value > 0);
    return data;
  }, [metrics]);

  // Dados por motorista
  const motoristaData = useMemo(() => {
    const groups: Record<string, { nome: string; entregas: number; valor: number }> = {};
    
    entregas.forEach(e => {
      if (!e.motorista) return;
      const id = e.motorista.id;
      if (!groups[id]) {
        groups[id] = { nome: e.motorista.nome_completo, entregas: 0, valor: 0 };
      }
      groups[id].entregas++;
      groups[id].valor += e.valor_frete || 0;
    });

    return Object.values(groups)
      .sort((a, b) => b.entregas - a.entregas)
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
                  Valor Total
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
                  Valor Concluído
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
                <p className="text-2xl font-bold">{metrics.taxaEntrega}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-5 gap-2">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3 text-center">
                <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-800">{metrics.aguardando}</p>
                <p className="text-[10px] text-amber-700">Aguardando</p>
              </CardContent>
            </Card>

            <Card className="border-cyan-200 bg-cyan-50">
              <CardContent className="p-3 text-center">
                <Truck className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-cyan-800">{metrics.coleta}</p>
                <p className="text-[10px] text-cyan-700">Saiu p/ Coleta</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-3 text-center">
                <Truck className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-800">{metrics.emRota}</p>
                <p className="text-[10px] text-purple-700">Em Rota</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-3 text-center">
                <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-800">{metrics.entregues}</p>
                <p className="text-[10px] text-green-700">Concluída</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 text-center">
                <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-800">{metrics.canceladas}</p>
                <p className="text-[10px] text-red-700">Cancelada</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pie Chart - Distribuição por Status */}
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

            {/* Bar Chart - Entregas por Motorista */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top 5 Motoristas (Cargas)</CardTitle>
              </CardHeader>
              <CardContent>
                {motoristaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={motoristaData} layout="vertical">
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
                        formatter={(value: number, name: string) => {
                          if (name === 'entregas') return [value, 'Cargas'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="entregas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
                  <Truck className="w-3.5 h-3.5" />
                  Motoristas Ativos
                </div>
                <p className="text-xl font-bold">{metrics.motoristasUnicos}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Package className="w-3.5 h-3.5" />
                  Peso Total
                </div>
                <p className="text-xl font-bold">
                  {formatWeight(metrics.pesoTotal)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Em Andamento
                </div>
                <p className="text-xl font-bold text-amber-600">
                  {metrics.aguardando + metrics.coleta + metrics.emRota}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
