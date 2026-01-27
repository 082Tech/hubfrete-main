import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Building2, 
  Truck,
  User,
  Package,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Activity,
  MapPin,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Stats = {
  empresasEmbarcador: number;
  empresasTransportadora: number;
  motoristas: number;
  cargasPublicadas: number;
  entregasEmAndamento: number;
  entregasConcluidas: number;
  preCadastrosPendentes: number;
};

export default function TorreControle() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        empresasRes,
        motoristasRes,
        cargasRes,
        entregasRes,
        preCadastrosRes
      ] = await Promise.all([
        supabase.from('empresas').select('tipo', { count: 'exact' }),
        supabase.from('motoristas').select('id', { count: 'exact' }),
        supabase.from('cargas').select('status', { count: 'exact' }).eq('status', 'publicada'),
        supabase.from('entregas').select('status'),
        supabase.from('pre_cadastros').select('id', { count: 'exact' }).eq('status', 'pendente'),
      ]);

      const empresas = empresasRes.data || [];
      const entregas = entregasRes.data || [];

      setStats({
        empresasEmbarcador: empresas.filter(e => e.tipo === 'EMBARCADOR').length,
        empresasTransportadora: empresas.filter(e => e.tipo === 'TRANSPORTADORA').length,
        motoristas: motoristasRes.count || 0,
        cargasPublicadas: cargasRes.count || 0,
        entregasEmAndamento: entregas.filter(e => ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'].includes(e.status || '')).length,
        entregasConcluidas: entregas.filter(e => e.status === 'entregue').length,
        preCadastrosPendentes: preCadastrosRes.count || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    {
      title: 'Pré-Cadastros',
      description: 'Aprovar solicitações de acesso',
      icon: UserPlus,
      href: '/admin/pre-cadastros',
      badge: stats?.preCadastrosPendentes,
      badgeColor: 'bg-yellow-500/10 text-yellow-600',
    },
    {
      title: 'Usuários Admin',
      description: 'Gerenciar equipe de administração',
      icon: Shield,
      href: '/admin/usuarios',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Torre de Controle
            </h1>
            <p className="text-muted-foreground">Visão geral do sistema e gestão administrativa</p>
          </div>
        </div>

        {/* Quick Stats */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Pendências Alert */}
            {stats && stats.preCadastrosPendentes > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {stats.preCadastrosPendentes} pré-cadastro{stats.preCadastrosPendentes > 1 ? 's' : ''} pendente{stats.preCadastrosPendentes > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">Aguardando análise e aprovação</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/admin/pre-cadastros')}>
                    Analisar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats?.empresasEmbarcador || 0}</p>
                  <p className="text-sm text-muted-foreground">Embarcadores</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats?.empresasTransportadora || 0}</p>
                  <p className="text-sm text-muted-foreground">Transportadoras</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats?.motoristas || 0}</p>
                  <p className="text-sm text-muted-foreground">Motoristas</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats?.cargasPublicadas || 0}</p>
                  <p className="text-sm text-muted-foreground">Cargas Publicadas</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Truck className="w-5 h-5 text-cyan-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats?.entregasEmAndamento || 0}</p>
                  <p className="text-sm text-muted-foreground">Em Andamento</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats?.entregasConcluidas || 0}</p>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </CardContent>
              </Card>
            </div>

            {/* Menu Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <Card 
                  key={item.title}
                  className="border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate(item.href)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge className={item.badgeColor}>
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-4">{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardHeader>
                </Card>
              ))}

              {/* Placeholder cards for future features */}
              <Card className="border-border border-dashed opacity-50">
                <CardHeader>
                  <div className="p-3 bg-muted rounded-xl w-fit">
                    <Activity className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-4">Monitoramento</CardTitle>
                  <p className="text-sm text-muted-foreground">Em breve: Rastreamento em tempo real</p>
                </CardHeader>
              </Card>

              <Card className="border-border border-dashed opacity-50">
                <CardHeader>
                  <div className="p-3 bg-muted rounded-xl w-fit">
                    <TrendingUp className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-4">Relatórios</CardTitle>
                  <p className="text-sm text-muted-foreground">Em breve: Análises e métricas</p>
                </CardHeader>
              </Card>

              <Card className="border-border border-dashed opacity-50">
                <CardHeader>
                  <div className="p-3 bg-muted rounded-xl w-fit">
                    <AlertTriangle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-4">Chamados</CardTitle>
                  <p className="text-sm text-muted-foreground">Em breve: Suporte e tickets</p>
                </CardHeader>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
