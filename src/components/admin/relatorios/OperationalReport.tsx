import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Package, Truck, TrendingUp, Clock } from 'lucide-react';
import { ExportButtons } from './ExportButtons';
import { exportToPDF, exportToExcel, formatNumber } from '@/lib/reportExport';

interface OperationalData {
  totalCargas: number;
  totalEntregas: number;
  entregasPorStatus: { name: string; value: number }[];
  cargasPorMes: { name: string; value: number }[];
  tempoMedioEntrega: number;
}

interface OperationalReportProps {
  data: OperationalData;
  isLoading?: boolean;
}

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#3b82f6', '#8b5cf6'];

export function OperationalReport({ data, isLoading = false }: OperationalReportProps) {
  const handleExportPDF = () => {
    const rows = data.entregasPorStatus.map((item) => [item.name, item.value.toString()]);
    
    exportToPDF({
      title: 'Relatório Operacional',
      subtitle: 'Volume de cargas, entregas e performance operacional',
      headers: ['Status', 'Quantidade'],
      rows,
      summary: [
        { label: 'Total de Cargas', value: formatNumber(data.totalCargas) },
        { label: 'Total de Cargas', value: formatNumber(data.totalEntregas) },
        { label: 'Tempo Médio de Entrega', value: `${data.tempoMedioEntrega} horas` },
      ],
    });
  };

  const handleExportExcel = () => {
    const rows = data.entregasPorStatus.map((item) => [item.name, item.value]);
    
    exportToExcel({
      title: 'Relatório Operacional',
      subtitle: 'Volume de cargas, entregas e performance operacional',
      headers: ['Status', 'Quantidade'],
      rows,
      summary: [
        { label: 'Total de Cargas', value: data.totalCargas },
        { label: 'Total de Cargas', value: data.totalEntregas },
        { label: 'Tempo Médio de Entrega (horas)', value: data.tempoMedioEntrega },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatório Operacional</h2>
          <p className="text-sm text-muted-foreground">Volume de cargas e entregas</p>
        </div>
        <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} isLoading={isLoading} />
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.totalCargas)}</p>
              <p className="text-xs text-muted-foreground">Total de Cargas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <Truck className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.totalEntregas)}</p>
              <p className="text-xs text-muted-foreground">Total de Entregas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <Clock className="w-5 h-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.tempoMedioEntrega}h</p>
              <p className="text-xs text-muted-foreground">Tempo Médio</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {data.totalEntregas > 0 
                  ? Math.round((data.entregasPorStatus.find(s => s.name === 'Entregue')?.value || 0) / data.totalEntregas * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cargas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.cargasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entregas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.entregasPorStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.entregasPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
