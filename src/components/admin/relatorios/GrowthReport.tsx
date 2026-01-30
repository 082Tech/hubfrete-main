import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Users, Building, Truck, TrendingUp } from 'lucide-react';
import { ExportButtons } from './ExportButtons';
import { exportToPDF, exportToExcel, formatNumber } from '@/lib/reportExport';

interface GrowthData {
  totalEmpresas: number;
  totalMotoristas: number;
  totalVeiculos: number;
  crescimentoMensal: number;
  cadastrosPorMes: { name: string; empresas: number; motoristas: number }[];
}

interface GrowthReportProps {
  data: GrowthData;
  isLoading?: boolean;
}

export function GrowthReport({ data, isLoading = false }: GrowthReportProps) {
  const handleExportPDF = () => {
    const rows = data.cadastrosPorMes.map((item) => [
      item.name,
      item.empresas.toString(),
      item.motoristas.toString(),
    ]);
    
    exportToPDF({
      title: 'Relatório de Crescimento',
      subtitle: 'Evolução de cadastros e adesão à plataforma',
      headers: ['Mês', 'Empresas', 'Motoristas'],
      rows,
      summary: [
        { label: 'Total de Empresas', value: formatNumber(data.totalEmpresas) },
        { label: 'Total de Motoristas', value: formatNumber(data.totalMotoristas) },
        { label: 'Total de Veículos', value: formatNumber(data.totalVeiculos) },
        { label: 'Crescimento Mensal', value: `${data.crescimentoMensal}%` },
      ],
    });
  };

  const handleExportExcel = () => {
    const rows = data.cadastrosPorMes.map((item) => [
      item.name,
      item.empresas,
      item.motoristas,
    ]);
    
    exportToExcel({
      title: 'Relatório de Crescimento',
      subtitle: 'Evolução de cadastros e adesão à plataforma',
      headers: ['Mês', 'Empresas', 'Motoristas'],
      rows,
      summary: [
        { label: 'Total de Empresas', value: data.totalEmpresas },
        { label: 'Total de Motoristas', value: data.totalMotoristas },
        { label: 'Total de Veículos', value: data.totalVeiculos },
        { label: 'Crescimento Mensal (%)', value: data.crescimentoMensal },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatório de Crescimento</h2>
          <p className="text-sm text-muted-foreground">Evolução de cadastros na plataforma</p>
        </div>
        <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} isLoading={isLoading} />
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.totalEmpresas)}</p>
              <p className="text-xs text-muted-foreground">Empresas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <Users className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.totalMotoristas)}</p>
              <p className="text-xs text-muted-foreground">Motoristas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <Truck className="w-5 h-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.totalVeiculos)}</p>
              <p className="text-xs text-muted-foreground">Veículos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.crescimentoMensal}%</p>
              <p className="text-xs text-muted-foreground">Crescimento Mensal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Evolução de Cadastros</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.cadastrosPorMes}>
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
              <Area
                type="monotone"
                dataKey="empresas"
                stackId="1"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                name="Empresas"
              />
              <Area
                type="monotone"
                dataKey="motoristas"
                stackId="2"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.3}
                name="Motoristas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
