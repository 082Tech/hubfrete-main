import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { ExportButtons } from './ExportButtons';
import { exportToPDF, exportToExcel, formatCurrency, formatNumber } from '@/lib/reportExport';

interface FinancialData {
  volumeTotal: number;
  mediaPorEntrega: number;
  crescimentoMensal: number;
  fretePorMes: { name: string; value: number }[];
}

interface FinancialReportProps {
  data: FinancialData;
  isLoading?: boolean;
}

export function FinancialReport({ data, isLoading = false }: FinancialReportProps) {
  const handleExportPDF = () => {
    const rows = data.fretePorMes.map((item) => [
      item.name,
      formatCurrency(item.value),
    ]);
    
    exportToPDF({
      title: 'Relatório Financeiro',
      subtitle: 'Volume de frete e análise financeira',
      headers: ['Mês', 'Volume de Frete'],
      rows,
      summary: [
        { label: 'Volume Total', value: formatCurrency(data.volumeTotal) },
        { label: 'Média por Entrega', value: formatCurrency(data.mediaPorEntrega) },
        { label: 'Crescimento Mensal', value: `${data.crescimentoMensal}%` },
      ],
    });
  };

  const handleExportExcel = () => {
    const rows = data.fretePorMes.map((item) => [
      item.name,
      item.value,
    ]);
    
    exportToExcel({
      title: 'Relatório Financeiro',
      subtitle: 'Volume de frete e análise financeira',
      headers: ['Mês', 'Volume de Frete (R$)'],
      rows,
      summary: [
        { label: 'Volume Total (R$)', value: data.volumeTotal },
        { label: 'Média por Entrega (R$)', value: data.mediaPorEntrega },
        { label: 'Crescimento Mensal (%)', value: data.crescimentoMensal },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatório Financeiro</h2>
          <p className="text-sm text-muted-foreground">Volume de frete e análise financeira</p>
        </div>
        <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} isLoading={isLoading} />
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(data.volumeTotal)}</p>
              <p className="text-xs text-muted-foreground">Volume Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(data.mediaPorEntrega)}</p>
              <p className="text-xs text-muted-foreground">Média por Entrega</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border col-span-2">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${data.crescimentoMensal >= 0 ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
              {data.crescimentoMensal >= 0 ? (
                <TrendingUp className="w-5 h-5 text-chart-2" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <p className={`text-2xl font-bold ${data.crescimentoMensal >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                {data.crescimentoMensal >= 0 ? '+' : ''}{data.crescimentoMensal}%
              </p>
              <p className="text-xs text-muted-foreground">Crescimento vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Volume de Frete por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.fretePorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} />
              <YAxis 
                fontSize={12} 
                tickLine={false}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Volume']}
              />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
