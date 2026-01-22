// Layout is now handled by PortalLayoutWrapper in App.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Truck, 
  Users, 
  Package, 
  MapPin,
  ArrowUpRight,
  Loader2,
  Route,
  Clock,
  MessageCircle,
  Sparkles,
  Send,
  ExternalLink,
  Shield,
  Settings,
} from 'lucide-react';
import adSeguroTransporte from '@/assets/ad-seguro-transporte.jpg';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';

export default function TransportadoraDashboard() {
  const { empresa, filialAtiva } = useUserContext();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chatMessage, setChatMessage] = useState('');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = profile?.nome_completo?.split(' ')[0] || 'Usuário';

  // Fetch veículos
  const { data: veiculos = [], isLoading: loadingVeiculos } = useQuery({
    queryKey: ['dashboard_veiculos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, ativo, motorista:motoristas(nome_completo)')
        .eq('empresa_id', empresa.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch motoristas
  const { data: motoristas = [], isLoading: loadingMotoristas } = useQuery({
    queryKey: ['dashboard_motoristas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('motoristas')
        .select('id, nome_completo, ativo')
        .eq('empresa_id', empresa.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas
  const { data: entregas = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ['dashboard_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      const motoristaIds = (motoristasData || []).map((m) => m.id);
      if (motoristaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          created_at,
          carga:cargas(codigo, descricao, endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado), endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado)),
          motorista:motoristas(nome_completo),
          veiculo:veiculos(placa)
        `)
        .in('motorista_id', motoristaIds)
        .in('status', ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Stats
  const stats = useMemo(() => {
    const veiculosAtivos = veiculos.filter((v: any) => v.ativo).length;
    const motoristasAtivos = motoristas.filter((m: any) => m.ativo).length;
    const entregasEmAndamento = entregas.length;
    const aguardandoColeta = entregas.filter((e: any) => e.status === 'aguardando_coleta').length;

    return {
      veiculosAtivos,
      motoristasAtivos,
      entregasEmAndamento,
      aguardandoColeta,
      totalVeiculos: veiculos.length,
      totalMotoristas: motoristas.length,
    };
  }, [veiculos, motoristas, entregas]);

  const isLoading = loadingVeiculos || loadingMotoristas || loadingEntregas;

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      navigate('/transportadora/assistente');
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    aguardando_coleta: { label: 'Aguardando', color: 'bg-amber-500/10 text-amber-600' },
    em_coleta: { label: 'Coletando', color: 'bg-blue-500/10 text-blue-600' },
    coletado: { label: 'Coletado', color: 'bg-indigo-500/10 text-indigo-600' },
    em_transito: { label: 'Em Trânsito', color: 'bg-primary/10 text-primary' },
    em_entrega: { label: 'Entregando', color: 'bg-chart-1/10 text-chart-1' },
  };

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground">
              {filialAtiva ? `Filial: ${filialAtiva.nome}` : 'Gerencie sua frota e entregas'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/transportadora/rastreamento')}
              className="gap-2"
            >
              <MapPin className="w-4 h-4" />
              Rastreamento
            </Button>
            <Button className="gap-2" onClick={() => navigate('/transportadora/cargas')}>
              <Package className="w-4 h-4" />
              Ver Cargas
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats and Deliveries */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Veículos Ativos"
                  value={stats.veiculosAtivos}
                  icon={<Truck className="w-5 h-5" />}
                  color="primary"
                  onClick={() => navigate('/transportadora/frota')}
                />
                <StatsCard
                  title="Motoristas"
                  value={stats.motoristasAtivos}
                  icon={<Users className="w-5 h-5" />}
                  color="chart1"
                  onClick={() => navigate('/transportadora/motoristas')}
                />
                <StatsCard
                  title="Entregas Ativas"
                  value={stats.entregasEmAndamento}
                  icon={<Route className="w-5 h-5" />}
                  color="chart2"
                  onClick={() => navigate('/transportadora/entregas')}
                />
                <StatsCard
                  title="Aguardando Coleta"
                  value={stats.aguardandoColeta}
                  icon={<Clock className="w-5 h-5" />}
                  color="chart4"
                />
              </div>
            )}

            {/* Summary Cards */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/transportadora/frota')}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total de Veículos</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalVeiculos}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card className="border-border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/transportadora/motoristas')}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-chart-1/10 rounded-xl">
                      <Users className="w-6 h-6 text-chart-1" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total de Motoristas</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalMotoristas}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/20"
                    onClick={() => navigate('/transportadora/cargas')}
                  >
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-xs">Cargas</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-chart-1/5 hover:border-chart-1/20"
                    onClick={() => navigate('/transportadora/frota')}
                  >
                    <Truck className="w-5 h-5 text-chart-1" />
                    <span className="text-xs">Frota</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-chart-2/5 hover:border-chart-2/20"
                    onClick={() => navigate('/transportadora/motoristas')}
                  >
                    <Users className="w-5 h-5 text-chart-2" />
                    <span className="text-xs">Motoristas</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-chart-4/5 hover:border-chart-4/20"
                    onClick={() => navigate('/transportadora/rastreamento')}
                  >
                    <MapPin className="w-5 h-5 text-chart-4" />
                    <span className="text-xs">Rastreamento</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Assistant Card */}
          <div className="lg:col-span-1">
            <Card className="border-border h-full min-h-[400px] flex flex-col bg-gradient-to-br from-accent/30 to-transparent">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-primary rounded-lg">
                      <MessageCircle className="w-4 h-4 text-primary-foreground" />
                    </div>
                    Assistente HubFrete
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/transportadora/assistente')}
                    className="h-8 w-8"
                    title="Abrir em tela cheia"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tire dúvidas sobre sua frota e entregas
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4">
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Sou o Assistente HubFrete
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Converse comigo sobre cargas, motoristas e entregas!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                      "Cargas disponíveis"
                    </span>
                    <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                      "Status da frota"
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    className="shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  🚧 Em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Advertisement Banner */}
        <Card className="overflow-hidden border-border hover:shadow-lg transition-all cursor-pointer group">
          <a href="https://www.itau.com.br/seguros" target="_blank" rel="noopener noreferrer">
            <div className="relative">
              <img 
                src={adSeguroTransporte} 
                alt="Seguro de Transporte de Cargas" 
                className="w-full h-32 sm:h-40 md:h-[400px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
                <div className="p-6 text-white max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-chart-2" />
                    <span className="text-xs font-medium uppercase tracking-wide text-chart-2">Patrocinado</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-1">Seguro de Carga Itaú</h3>
                  <p className="text-sm text-white/80 hidden sm:block">
                    Proteja suas mercadorias com o melhor seguro do mercado. Cobertura completa para todo tipo de transporte.
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-chart-2 hover:bg-chart-2/90 text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Saiba mais
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </a>
        </Card>
      </div>
    </div>
  );
}
