import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const statusLabels: Record<string, { label: string; color: string }> = {
  'rascunho': { label: 'Rascunho', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  'publicada': { label: 'Publicada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'em_cotacao': { label: 'Em Cotação', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  'aceita': { label: 'Aceita', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  'em_coleta': { label: 'Em Coleta', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  'em_transito': { label: 'Em Trânsito', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  'entregue': { label: 'Entregue', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  'cancelada': { label: 'Cancelada', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function EmbarcadorDashboard() {
  const { empresa } = useUserContext();
  const navigate = useNavigate();

  // Fetch cargas
  const { data: cargas = [], isLoading: loadingCargas } = useQuery({
    queryKey: ['dashboard_cargas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          status,
          created_at,
          enderecos_carga (
            tipo,
            cidade,
            estado
          )
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas
  const { data: entregas = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ['dashboard_entregas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          cargas!inner (
            empresa_id
          )
        `)
        .eq('cargas.empresa_id', empresa.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Calculate stats
  const activeCargas = cargas.filter(c => 
    c.status && !['entregue', 'cancelada'].includes(c.status)
  );
  const emTransito = entregas.filter(e => e.status === 'em_transito').length;
  const aguardandoColeta = entregas.filter(e => e.status === 'aguardando_coleta' || e.status === 'em_coleta').length;
  const entreguesMes = entregas.filter(e => e.status === 'entregue').length;

  const stats = [
    { label: 'Cargas Ativas', value: activeCargas.length, icon: Package, color: 'chart-2' },
    { label: 'Em Trânsito', value: emTransito, icon: Truck, color: 'chart-1' },
    { label: 'Aguardando Coleta', value: aguardandoColeta, icon: Clock, color: 'chart-4' },
    { label: 'Entregues (mês)', value: entreguesMes, icon: CheckCircle, color: 'chart-3' },
  ];

  // Get recent cargas (last 5)
  const recentCargas = cargas.slice(0, 5).map(carga => {
    const destino = carga.enderecos_carga?.find((e: any) => e.tipo === 'destino');
    return {
      id: carga.codigo,
      destino: destino ? `${destino.cidade}, ${destino.estado}` : '-',
      status: carga.status || 'rascunho',
      data: new Date(carga.created_at).toLocaleDateString('pt-BR'),
    };
  });

  const isLoading = loadingCargas || loadingEntregas;

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Gerencie suas cargas e acompanhe entregas</p>
          </div>
          <NovaCargaDialog />
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 bg-[hsl(var(--${stat.color}))]/10 rounded-xl`}>
                    <stat.icon className={`w-6 h-6 text-[hsl(var(--${stat.color}))]`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Loads */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cargas Recentes</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => navigate('/embarcador/minhas-cargas')}
            >
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentCargas.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma carga cadastrada ainda</p>
                <p className="text-sm text-muted-foreground">Clique em "Nova Carga" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCargas.map((load) => {
                  const statusInfo = statusLabels[load.status] || statusLabels['rascunho'];
                  return (
                    <div key={load.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-medium text-foreground">{load.id}</p>
                        <p className="text-sm text-muted-foreground">{load.destino}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{load.data}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
