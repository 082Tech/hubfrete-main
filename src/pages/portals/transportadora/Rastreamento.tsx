import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Truck,
  Loader2,
  Navigation,
  Clock,
  User,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useState, useMemo } from 'react';
import { RastreamentoMap } from '@/components/maps/RastreamentoMap';

interface MotoristaLocation {
  id: string;
  nome_completo: string;
  telefone: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean;
  veiculo: {
    id: string;
    placa: string;
  } | null;
}

export default function Rastreamento() {
  const { empresa } = useUserContext();
  const [selectedMotorista, setSelectedMotorista] = useState<string>('all');

  // Fetch motoristas com localização
  const {
    data: motoristas = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['motoristas_localizacao', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Primeiro busca os motoristas da empresa
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select(`
          id,
          nome_completo,
          telefone,
          email,
          veiculos(id, placa)
        `)
        .eq('empresa_id', empresa.id)
        .eq('ativo', true);

      if (motoristasError) throw motoristasError;

      // Depois busca as localizações
      const emails = (motoristasData || [])
        .map((m) => m.email)
        .filter(Boolean);

      if (emails.length === 0) return [];

      const { data: locData, error: locError } = await supabase
        .from('localizações')
        .select('*')
        .in('email_motorista', emails);

      if (locError) throw locError;

      // Combina os dados
      const result = (motoristasData || []).map((m) => {
        const loc = (locData || []).find((l) => l.email_motorista === m.email);
        return {
          id: m.id,
          nome_completo: m.nome_completo,
          telefone: m.telefone,
          latitude: loc?.latitude || null,
          longitude: loc?.longitude || null,
          timestamp: loc?.timestamp || null,
          status: loc?.status || false,
          veiculo: m.veiculos?.[0] || null,
        };
      });

      return result as MotoristaLocation[];
    },
    enabled: !!empresa?.id,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const filteredMotoristas = useMemo(() => {
    if (selectedMotorista === 'all') return motoristas;
    return motoristas.filter((m) => m.id === selectedMotorista);
  }, [motoristas, selectedMotorista]);

  const motoristasComLocalizacao = useMemo(() => {
    return filteredMotoristas.filter((m) => m.latitude && m.longitude);
  }, [filteredMotoristas]);

  const stats = useMemo(() => {
    const online = motoristas.filter((m) => m.status).length;
    const comLocalizacao = motoristas.filter(
      (m) => m.latitude && m.longitude
    ).length;
    return {
      total: motoristas.length,
      online,
      comLocalizacao,
    };
  }, [motoristas]);

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Sem registro';
    const date = new Date(ts);
    return date.toLocaleString('pt-BR');
  };


  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rastreamento</h1>
            <p className="text-muted-foreground">
              Acompanhe a localização dos seus motoristas em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMotorista} onValueChange={setSelectedMotorista}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os motoristas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-xl">
                <Navigation className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.online}</p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-1/10 rounded-xl">
                <MapPin className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.comLocalizacao}
                </p>
                <p className="text-sm text-muted-foreground">Com Localização</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="border-border h-[500px] overflow-hidden">
              <CardHeader className="py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mapa</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="w-2 h-2 bg-chart-2 rounded-full animate-pulse" />
                      Tempo real
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-57px)]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : motoristasComLocalizacao.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhuma localização disponível
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Os motoristas precisam estar com o app ativo para enviar a
                      localização.
                    </p>
                  </div>
                ) : (
                  <RastreamentoMap
                    drivers={motoristasComLocalizacao.map((m) => ({
                      id: m.id,
                      nome: m.nome_completo,
                      placa: m.veiculo?.placa || null,
                      latitude: m.latitude!,
                      longitude: m.longitude!,
                      isOnline: m.status,
                      lastUpdate: m.timestamp ? formatTimestamp(m.timestamp) : null,
                    }))}
                    selectedDriverId={selectedMotorista !== 'all' ? selectedMotorista : null}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Motoristas List */}
          <div className="lg:col-span-1">
            <Card className="border-border h-[500px] overflow-hidden flex flex-col">
              <CardHeader className="py-3 border-b border-border shrink-0">
                <CardTitle className="text-lg">Motoristas</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMotoristas.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum motorista encontrado.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredMotoristas.map((motorista) => (
                      <div
                        key={motorista.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                                motorista.status ? 'bg-chart-2' : 'bg-muted-foreground'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {motorista.nome_completo}
                            </p>
                            {motorista.veiculo && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Truck className="w-3 h-3" />
                                {motorista.veiculo.placa}
                              </div>
                            )}
                            {motorista.latitude && motorista.longitude ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3" />
                                {motorista.latitude.toFixed(4)},{' '}
                                {motorista.longitude.toFixed(4)}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                Sem localização
                              </p>
                            )}
                            {motorista.timestamp && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(motorista.timestamp)}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              motorista.status
                                ? 'bg-chart-2/10 text-chart-2 border-chart-2/20'
                                : 'text-muted-foreground'
                            }
                          >
                            {motorista.status ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
