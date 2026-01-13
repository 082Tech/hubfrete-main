import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Truck,
  MapPin,
  Phone,
  User,
  Navigation,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Map,
  FileText,
  MessageSquare,
  ExternalLink,
  Loader2,
  Package,
  List,
  MapPinned
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Lazy load the map component to improve initial load
const EntregasMap = lazy(() => import('@/components/maps/EntregasMap').then(m => ({ default: m.EntregasMap })));

interface EntregaComRelacoes {
  id: string;
  carga_id: string;
  status: string | null;
  latitude_atual: number | null;
  longitude_atual: number | null;
  observacoes: string | null;
  coletado_em: string | null;
  entregue_em: string | null;
  updated_at: string | null;
  cargas: {
    codigo: string;
    descricao: string;
    data_entrega_limite: string | null;
    enderecos_carga: {
      tipo: string;
      cidade: string;
      estado: string;
    }[];
  };
  motoristas: {
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculos: {
    placa: string;
    marca: string | null;
    modelo: string | null;
  } | null;
  transportadoras: {
    nome_fantasia: string | null;
    razao_social: string;
  };
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  'aguardando_coleta': { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: Package, label: 'Aguardando Coleta' },
  'em_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Truck, label: 'Em Coleta' },
  'coletado': { color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', icon: Truck, label: 'Coletado' },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: Navigation, label: 'Em Trânsito' },
  'em_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: MapPin, label: 'Em Entrega' },
  'entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle, label: 'Entregue' },
  'problema': { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: AlertCircle, label: 'Problema' },
  'devolvida': { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: AlertCircle, label: 'Devolvida' },
};

// Estimate progress based on status
const getProgressFromStatus = (status: string | null): number => {
  switch (status) {
    case 'aguardando_coleta': return 0;
    case 'em_coleta': return 10;
    case 'coletado': return 20;
    case 'em_transito': return 50;
    case 'em_entrega': return 85;
    case 'entregue': return 100;
    case 'problema': return 50;
    case 'devolvida': return 100;
    default: return 0;
  }
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeAgo = (dateString: string | null) => {
  if (!dateString) return 'Sem atualização';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffMins < 1440) return `Há ${Math.floor(diffMins / 60)} horas`;
  return `Há ${Math.floor(diffMins / 1440)} dias`;
};

export default function AcompanharEntregas() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Fetch embarcador
  const { data: embarcador } = useQuery({
    queryKey: ['embarcador', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('embarcadores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch entregas
  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['entregas_embarcador', embarcador?.id],
    queryFn: async () => {
      if (!embarcador?.id) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          carga_id,
          status,
          latitude_atual,
          longitude_atual,
          observacoes,
          coletado_em,
          entregue_em,
          updated_at,
          cargas!inner (
            codigo,
            descricao,
            data_entrega_limite,
            embarcador_id,
            enderecos_carga (
              tipo,
              cidade,
              estado
            )
          ),
          motoristas (
            nome_completo,
            telefone
          ),
          veiculos (
            placa,
            marca,
            modelo
          ),
          transportadoras (
            nome_fantasia,
            razao_social
          )
        `)
        .eq('cargas.embarcador_id', embarcador.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntregaComRelacoes[];
    },
    enabled: !!embarcador?.id,
  });

  const filteredEntregas = entregas.filter(entrega => 
    entrega.cargas.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entrega.cargas.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entrega.motoristas?.nome_completo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    emTransito: entregas.filter(e => e.status === 'em_transito').length,
    coletados: entregas.filter(e => e.status === 'coletado' || e.status === 'em_coleta').length,
    problemas: entregas.filter(e => e.status === 'problema').length,
    entregues: entregas.filter(e => e.status === 'entregue').length,
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Acompanhar Entregas</h1>
            <p className="text-muted-foreground">Rastreie suas cargas em tempo real</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Navigation className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.emTransito}</p>
                  <p className="text-xs text-muted-foreground">Em Trânsito</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.coletados}</p>
                  <p className="text-xs text-muted-foreground">Coletados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.problemas}</p>
                  <p className="text-xs text-muted-foreground">Problemas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.entregues}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código, carga ou motorista..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'list' | 'map')}
            className="border border-border rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="list" 
              aria-label="Visualização em lista"
              className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="map" 
              aria-label="Visualização em mapa"
              className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <MapPinned className="w-4 h-4" />
              <span className="hidden sm:inline">Mapa</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* View Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEntregas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-1">Nenhuma entrega encontrada</h3>
              <p className="text-sm text-muted-foreground">
                As entregas das suas cargas aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'map' ? (
          /* Map View with OpenStreetMap */
          <div className="relative">
            <Suspense fallback={
              <Card className="border-border">
                <CardContent className="p-0">
                  <div className="w-full h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            }>
              <EntregasMap 
                entregas={filteredEntregas.map(entrega => {
                  const destino = entrega.cargas.enderecos_carga?.find(e => e.tipo === 'destino');
                  return {
                    id: entrega.id,
                    latitude: entrega.latitude_atual,
                    longitude: entrega.longitude_atual,
                    status: entrega.status,
                    codigo: entrega.cargas.codigo,
                    descricao: entrega.cargas.descricao,
                    motorista: entrega.motoristas?.nome_completo || null,
                    telefone: entrega.motoristas?.telefone || null,
                    placa: entrega.veiculos?.placa || null,
                    destino: destino ? `${destino.cidade}, ${destino.estado}` : null,
                  };
                })}
              />
            </Suspense>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEntregas.map((entrega) => {
              const status = entrega.status || 'aguardando_coleta';
              const config = statusConfig[status] || statusConfig['aguardando_coleta'];
              const StatusIcon = config.icon;
              const progress = getProgressFromStatus(status);
              
              const origem = entrega.cargas.enderecos_carga?.find(e => e.tipo === 'origem');
              const destino = entrega.cargas.enderecos_carga?.find(e => e.tipo === 'destino');

              return (
                <Card key={entrega.id} className="border-border overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Main Info */}
                      <div className="flex-1 p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-foreground">{entrega.cargas.codigo}</h3>
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entrega.cargas.descricao}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground">Previsão de Entrega</p>
                              <p className="text-sm text-muted-foreground">
                                {entrega.cargas.data_entrega_limite 
                                  ? new Date(entrega.cargas.data_entrega_limite).toLocaleDateString('pt-BR')
                                  : '-'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="gap-2"
                                  onClick={() => toast.info('Abrindo mapa...')}
                                >
                                  <Map className="w-4 h-4" />
                                  Ver no Mapa
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <FileText className="w-4 h-4" />
                                  Ver Detalhes Completos
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  Enviar Mensagem
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2">
                                  <ExternalLink className="w-4 h-4" />
                                  Abrir em Nova Aba
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Route */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {origem ? `${origem.cidade}, ${origem.estado}` : '-'}
                            </span>
                          </div>
                          <div className="flex-1 h-px bg-border" />
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <span className="text-sm font-medium text-foreground">
                              {destino ? `${destino.cidade}, ${destino.estado}` : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progresso da viagem</span>
                            <span className="font-medium text-foreground">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-foreground">
                            {entrega.observacoes || 'Localização não disponível'}
                          </span>
                          <span className="text-muted-foreground">• {getTimeAgo(entrega.updated_at)}</span>
                        </div>
                      </div>

                      {/* Driver Info */}
                      <div className="lg:w-64 p-6 bg-muted/10 border-t lg:border-t-0 lg:border-l border-border/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Motorista
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {entrega.motoristas?.nome_completo || 'Não atribuído'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Placa: {entrega.veiculos?.placa || '-'}
                              </p>
                            </div>
                          </div>
                          {entrega.motoristas?.telefone && (
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <Phone className="w-4 h-4" />
                              {entrega.motoristas.telefone}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
