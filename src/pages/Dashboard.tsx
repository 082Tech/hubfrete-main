import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, Building2, Users, TrendingUp, Clock } from 'lucide-react';
import { getUsers, getEmpresas, User, Empresa } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const monthlyData = [
  { name: 'Jan', cargas: 400, entregas: 380 },
  { name: 'Fev', cargas: 300, entregas: 290 },
  { name: 'Mar', cargas: 520, entregas: 510 },
  { name: 'Abr', cargas: 450, entregas: 430 },
  { name: 'Mai', cargas: 600, entregas: 580 },
  { name: 'Jun', cargas: 750, entregas: 720 },
];

const pieData = [
  { name: 'Entregues', value: 720, color: 'hsl(var(--chart-1))' },
  { name: 'Em Trânsito', value: 85, color: 'hsl(var(--chart-2))' },
  { name: 'Pendentes', value: 45, color: 'hsl(var(--chart-4))' },
  { name: 'Atrasados', value: 15, color: 'hsl(var(--destructive))' },
];

const recentDeliveries = [
  { id: 1, origem: 'São Paulo, SP', destino: 'Rio de Janeiro, RJ', status: 'Entregue', motorista: 'João Silva' },
  { id: 2, origem: 'Curitiba, PR', destino: 'Florianópolis, SC', status: 'Em Trânsito', motorista: 'Maria Santos' },
  { id: 3, origem: 'Belo Horizonte, MG', destino: 'Brasília, DF', status: 'Pendente', motorista: 'Carlos Oliveira' },
  { id: 4, origem: 'Porto Alegre, RS', destino: 'Curitiba, PR', status: 'Entregue', motorista: 'Ana Costa' },
];

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersData, empresasData] = await Promise.all([
          getUsers().catch(() => []),
          getEmpresas().catch(() => []),
        ]);
        setUsers(usersData);
        setEmpresas(empresasData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Entregue': return 'bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))]';
      case 'Em Trânsito': return 'bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]';
      case 'Pendente': return 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das operações</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total de Cargas"
            value="865"
            change={12.5}
            changeLabel="vs mês anterior"
            icon={<Package className="w-6 h-6" />}
            color="primary"
          />
          <StatsCard
            title="Embarcadores"
            value={empresas.filter(e => e.tipo === 'EMBARCADOR').length || 156}
            change={8.2}
            changeLabel="vs mês anterior"
            icon={<Building2 className="w-6 h-6" />}
            color="chart1"
          />
          <StatsCard
            title="Transportadoras"
            value={empresas.filter(e => e.tipo === 'TRANSPORTADORA').length || 89}
            change={5.1}
            changeLabel="vs mês anterior"
            icon={<Truck className="w-6 h-6" />}
            color="chart2"
          />
          <StatsCard
            title="Usuários Ativos"
            value={users.length || 324}
            change={15.3}
            changeLabel="vs mês anterior"
            icon={<Users className="w-6 h-6" />}
            color="chart3"
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Cargas x Entregas por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="cargas" fill="hsl(var(--chart-1))" name="Cargas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="entregas" fill="hsl(var(--chart-2))" name="Entregas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Status das Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deliveries */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Últimas Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Origem</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Destino</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Motorista</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveries.map((delivery) => (
                    <tr key={delivery.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 text-sm text-foreground">{delivery.origem}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{delivery.destino}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{delivery.motorista}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                          {delivery.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
