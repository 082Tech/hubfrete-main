import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Package,
  DollarSign,
  Truck,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useState } from 'react';

const dadosMensais = [
  { mes: 'Jul', cargas: 35, valor: 125000 },
  { mes: 'Ago', cargas: 42, valor: 148000 },
  { mes: 'Set', cargas: 38, valor: 132000 },
  { mes: 'Out', cargas: 51, valor: 178000 },
  { mes: 'Nov', cargas: 45, valor: 156000 },
  { mes: 'Dez', cargas: 58, valor: 198000 },
  { mes: 'Jan', cargas: 47, valor: 165000 },
];

const dadosStatus = [
  { name: 'Entregues', value: 47, color: 'hsl(var(--chart-1))' },
  { name: 'Em Trânsito', value: 8, color: 'hsl(var(--chart-2))' },
  { name: 'Aguardando', value: 4, color: 'hsl(var(--chart-4))' },
  { name: 'Em Cotação', value: 3, color: 'hsl(var(--chart-3))' },
];

const transportadorasTop = [
  { nome: 'TransNorte Logística', entregas: 23, avaliacao: 4.8, pontualidade: '98%' },
  { nome: 'LogBrasil Cargas', entregas: 18, avaliacao: 4.5, pontualidade: '95%' },
  { nome: 'Rápido Pará Transportes', entregas: 15, avaliacao: 4.6, pontualidade: '97%' },
  { nome: 'Expresso Minas', entregas: 12, avaliacao: 4.3, pontualidade: '92%' },
];

export default function Relatorios() {
  const [periodo, setPeriodo] = useState('7dias');

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Analise o desempenho das suas operações</p>
          </div>
          <div className="flex gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                <SelectItem value="ano">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Cargas</p>
                  <p className="text-2xl font-bold text-foreground">316</p>
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +12%
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-foreground">R$ 1.1M</p>
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +8%
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Pontualidade</p>
                  <p className="text-2xl font-bold text-foreground">94.5%</p>
                </div>
                <div className="flex items-center text-red-600 text-sm">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  -2%
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold text-foreground">3.2 dias</p>
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  -5%
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cargas por Mês */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Cargas por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosMensais}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="cargas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status das Cargas */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Status das Cargas (Mês Atual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dadosStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {dadosStatus.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Valor por Mês */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Valor Movimentado por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `R$ ${value / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Transportadoras */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Top Transportadoras Parceiras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transportadorasTop.map((transp, index) => (
                <div 
                  key={transp.nome}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{transp.nome}</p>
                      <p className="text-sm text-muted-foreground">{transp.entregas} entregas realizadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-foreground">⭐ {transp.avaliacao}</p>
                      <p className="text-muted-foreground">Avaliação</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{transp.pontualidade}</p>
                      <p className="text-muted-foreground">Pontualidade</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}