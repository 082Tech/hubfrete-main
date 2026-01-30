import { useState, useEffect, useMemo } from 'react';
import { Activity, Users, Truck, MapPin, Signal, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader';
import {
  MonitoringMap,
  DriverListPanel,
  DriverWithLocation,
  Geofence,
  TrackingPoint,
} from '@/components/admin/monitoring';

export default function Monitoramento() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverWithLocation[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [trackingHistory, setTrackingHistory] = useState<TrackingPoint[]>([]);
  const [showPlayback, setShowPlayback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [empresas, setEmpresas] = useState<{ id: number; nome: string }[]>([]);

  // Get all motorista IDs for realtime subscription
  const motoristaIds = useMemo(() => drivers.map((d) => d.motorista_id), [drivers]);

  // Realtime locations
  const { localizacaoMap, isConnected, refetch: refetchLocations } = useRealtimeLocalizacoes({
    motoristaIds,
    enabled: motoristaIds.length > 0,
  });

  // Merge realtime locations with driver data
  const driversWithLocation = useMemo(() => {
    return drivers.map((driver) => {
      const loc = localizacaoMap.get(driver.motorista_id);
      if (loc) {
        return {
          ...driver,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          velocidade: loc.velocidade,
          heading: loc.bussola_pos,
        };
      }
      return driver;
    });
  }, [drivers, localizacaoMap]);

  // Filter drivers by empresa
  const filteredDrivers = useMemo(() => {
    if (filterEmpresa === 'all') return driversWithLocation;
    return driversWithLocation.filter(
      (d) => d.empresa_nome === filterEmpresa || (!d.empresa_nome && filterEmpresa === 'autonomo')
    );
  }, [driversWithLocation, filterEmpresa]);

  // Stats
  const stats = useMemo(() => {
    const online = filteredDrivers.filter((d) => {
      if (!d.timestamp) return false;
      return Date.now() - d.timestamp < 5 * 60 * 1000; // 5 minutes
    }).length;
    const withDelivery = filteredDrivers.filter((d) => d.entrega_ativa).length;
    const total = filteredDrivers.length;

    return { total, online, withDelivery };
  }, [filteredDrivers]);

  // Fetch drivers with their latest entrega info
  useEffect(() => {
    async function fetchDrivers() {
      setIsLoading(true);
      try {
        // Fetch motoristas with empresa info
        const { data: motoristas, error: motoristasError } = await supabase
          .from('motoristas')
          .select(`
            id,
            nome_completo,
            foto_url,
            telefone,
            empresa_id,
            empresas (nome)
          `)
          .eq('ativo', true);

        if (motoristasError) throw motoristasError;

        // Fetch active entregas
        const { data: entregas, error: entregasError } = await supabase
          .from('entregas')
          .select('id, codigo, status, motorista_id')
          .in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'] as any)
          .not('motorista_id', 'is', null);

        if (entregasError) throw entregasError;

        // Map entregas by motorista
        const entregaByMotorista = new Map(
          entregas?.map((e) => [e.motorista_id, e]) || []
        );

        // Fetch initial locations
        const motoristaIdsList = motoristas?.map((m) => m.id) || [];
        const { data: locations } = await supabase
          .from('localizacoes')
          .select('*')
          .in('motorista_id', motoristaIdsList);

        const locationMap = new Map<string, any>(
          (locations || []).map((l: any) => [l.motorista_id, l])
        );

        // Build driver list
        const driverList: DriverWithLocation[] =
          motoristas?.map((m) => {
            const entrega = entregaByMotorista.get(m.id);
            const loc = locationMap.get(m.id) as any;
            return {
              motorista_id: m.id,
              nome: m.nome_completo,
              foto_url: m.foto_url,
              empresa_nome: (m.empresas as any)?.nome || null,
              telefone: m.telefone,
              latitude: loc?.latitude || null,
              longitude: loc?.longitude || null,
              timestamp: loc?.timestamp ? new Date(loc.timestamp).getTime() : null,
              velocidade: loc?.velocidade || null,
              heading: loc?.bussola_pos || null,
              entrega_ativa: !!entrega,
              entrega_codigo: entrega?.codigo || null,
              entrega_status: entrega?.status || null,
            };
          }) || [];

        setDrivers(driverList);

        // Get unique empresas for filter
        const uniqueEmpresas = Array.from(
          new Set(driverList.map((d) => d.empresa_nome).filter(Boolean))
        ).map((nome) => ({ id: 0, nome: nome as string }));
        setEmpresas(uniqueEmpresas);
      } catch (error) {
        console.error('Error fetching drivers:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDrivers();
  }, []);

  // Fetch geofences
  useEffect(() => {
    async function fetchGeofences() {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('ativo', true);

      if (!error && data) {
        setGeofences(
          data.map((g) => ({
            id: g.id,
            nome: g.nome,
            latitude: g.latitude,
            longitude: g.longitude,
            raio_metros: g.raio_metros,
            tipo: g.tipo as Geofence['tipo'],
            ativo: g.ativo,
            entrega_id: g.entrega_id,
          }))
        );
      }
    }

    fetchGeofences();
  }, []);

  // Fetch tracking history when driver is selected
  useEffect(() => {
    async function fetchTrackingHistory() {
      if (!selectedDriverId) {
        setTrackingHistory([]);
        setShowPlayback(false);
        return;
      }

      // Find if driver has active entrega
      const driver = drivers.find((d) => d.motorista_id === selectedDriverId);
      if (!driver?.entrega_ativa) {
        setTrackingHistory([]);
        return;
      }

      // Get entrega ID
      const { data: entregas } = await supabase
        .from('entregas')
        .select('id')
        .eq('motorista_id', selectedDriverId)
        .in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'] as any)
        .limit(1);

      if (!entregas?.[0]?.id) {
        setTrackingHistory([]);
        return;
      }

      // Fetch tracking history
      const { data: history, error } = await supabase
        .from('tracking_historico')
        .select('*')
        .eq('entrega_id', entregas[0].id)
        .order('created_at', { ascending: true });

      if (!error && history) {
        setTrackingHistory(
          history.map((h) => ({
            id: h.id,
            latitude: h.latitude || 0,
            longitude: h.longitude || 0,
            timestamp: h.created_at || '',
            status: h.status,
            velocidade: h.velocidade,
          }))
        );
      }
    }

    fetchTrackingHistory();
  }, [selectedDriverId, drivers]);

  const handleRefresh = () => {
    refetchLocations();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-7 h-7 text-primary" />
              Monitoramento em Tempo Real
            </h1>
            <p className="text-sm text-muted-foreground">
              Rastreamento de motoristas e entregas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className={isConnected ? 'bg-chart-2 text-white' : ''}
            >
              <Signal className="w-3 h-3 mr-1" />
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>

            {/* Filter */}
            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                <SelectItem value="autonomo">Autônomos</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.nome} value={e.nome}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Signal className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.online}</p>
                <p className="text-xs text-muted-foreground">Online agora</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Truck className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withDelivery}</p>
                <p className="text-xs text-muted-foreground">Em entrega</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Driver list sidebar */}
        <div className="w-80 shrink-0 border-r border-border overflow-hidden">
          <DriverListPanel
            drivers={filteredDrivers}
            selectedDriverId={selectedDriverId}
            onSelectDriver={setSelectedDriverId}
            isLoading={isLoading}
          />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <GoogleMapsLoader>
            <MonitoringMap
              drivers={filteredDrivers}
              geofences={geofences}
              selectedDriverId={selectedDriverId}
              onSelectDriver={setSelectedDriverId}
              trackingHistory={trackingHistory}
              showPlayback={showPlayback}
              onTogglePlayback={() => setShowPlayback(!showPlayback)}
            />
          </GoogleMapsLoader>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-2">
            <p className="font-medium text-foreground">Legenda</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-chart-2" />
              <span className="text-muted-foreground">Online (últimos 5 min)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-chart-1" />
              <span className="text-muted-foreground">Selecionado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
