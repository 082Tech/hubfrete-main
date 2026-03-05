import { useState, useEffect, useMemo } from 'react';
import { Activity, Users, Truck, Signal, Filter, RefreshCw, CircleOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MonitoramentoLeafletMap,
  type DriverWithLocation,
  type TrackingPoint,
} from '@/components/admin/monitoring';

const statusColors: Record<string, string> = {
  aguardando: 'bg-amber-500',
  saiu_para_coleta: 'bg-cyan-500',
  saiu_para_entrega: 'bg-purple-500',
  entregue: 'bg-green-500',
  cancelada: 'bg-red-500',
};
const statusLabels: Record<string, string> = {
  aguardando: 'Aguardando',
  saiu_para_coleta: 'Em Coleta',
  saiu_para_entrega: 'Em Rota',
  entregue: 'Concluída',
  cancelada: 'Cancelada',
};

export default function Monitoramento() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverWithLocation[]>([]);
  const [trackingHistory, setTrackingHistory] = useState<TrackingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [empresas, setEmpresas] = useState<{ nome: string }[]>([]);

  const motoristaIds = useMemo(() => drivers.map(d => d.motorista_id), [drivers]);

  const { localizacaoMap, isConnected, refetch: refetchLocations } = useRealtimeLocalizacoes({
    motoristaIds,
    enabled: motoristaIds.length > 0,
  });

  const driversWithLocation = useMemo(() => {
    return drivers.map(driver => {
      const loc = localizacaoMap.get(driver.motorista_id);
      if (loc) {
        return { ...driver, latitude: loc.latitude, longitude: loc.longitude, timestamp: loc.timestamp, velocidade: loc.speed, heading: loc.heading };
      }
      return driver;
    });
  }, [drivers, localizacaoMap]);

  const filteredDrivers = useMemo(() => {
    let result = driversWithLocation;
    if (filterEmpresa !== 'all') {
      result = result.filter(d => filterEmpresa === 'autonomo' ? !d.empresa_nome : d.empresa_nome === filterEmpresa);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.nome?.toLowerCase().includes(q) ||
        d.empresa_nome?.toLowerCase().includes(q) ||
        d.entrega_codigo?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [driversWithLocation, filterEmpresa, searchQuery]);

  const stats = useMemo(() => {
    const online = filteredDrivers.filter(d => d.timestamp && Date.now() - d.timestamp < 5 * 60 * 1000).length;
    const withDelivery = filteredDrivers.filter(d => d.entrega_ativa).length;
    return { total: filteredDrivers.length, online, withDelivery };
  }, [filteredDrivers]);

  useEffect(() => {
    async function fetchDrivers() {
      setIsLoading(true);
      try {
        const { data: motoristas, error } = await supabase
          .from('motoristas')
          .select('id, nome_completo, foto_url, telefone, empresa_id, empresas (nome)')
          .eq('ativo', true);
        if (error) throw error;

        const { data: entregas } = await (supabase as any)
          .from('entregas')
          .select('id, codigo, status, motorista_id, tracking_code')
          .in('status', ['aguardando', 'saiu_para_coleta', 'em_transito', 'saiu_para_entrega'])
          .not('motorista_id', 'is', null);

        const entregaByMotorista = new Map((entregas || []).map((e: any) => [e.motorista_id, e]));
        const motoristaIdsList = motoristas?.map(m => m.id) || [];
        const { data: locations } = await supabase.from('locations').select('*').in('motorista_id', motoristaIdsList);
        const locationMap = new Map((locations || []).map((l: any) => [l.motorista_id, l]));

        const driverList: DriverWithLocation[] = (motoristas || []).map(m => {
          const entrega = entregaByMotorista.get(m.id) as any;
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
            velocidade: loc?.speed || null,
            heading: loc?.heading || null,
            entrega_ativa: !!entrega,
            entrega_codigo: entrega?.codigo || null,
            tracking_code: entrega?.tracking_code || null,
            entrega_status: entrega?.status || null,
          };
        });

        setDrivers(driverList);
        const uniqueEmpresas = Array.from(new Set(driverList.map(d => d.empresa_nome).filter(Boolean))).map(nome => ({ nome: nome as string }));
        setEmpresas(uniqueEmpresas);
      } catch (err) {
        console.error('Error fetching drivers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDrivers();
  }, []);

  useEffect(() => {
    async function fetchHistory() {
      if (!selectedDriverId) { setTrackingHistory([]); return; }
      const driver = drivers.find(d => d.motorista_id === selectedDriverId);
      if (!driver?.entrega_ativa) { setTrackingHistory([]); return; }

      const { data: entregas } = await supabase
        .from('entregas')
        .select('id')
        .eq('motorista_id', selectedDriverId)
        .in('status', ['aguardando', 'saiu_para_coleta', 'em_transito', 'saiu_para_entrega'] as any)
        .limit(1);

      if (!entregas?.[0]?.id) { setTrackingHistory([]); return; }

      const { data: ve } = await supabase
        .from('viagem_entregas')
        .select('viagem_id')
        .eq('entrega_id', entregas[0].id)
        .limit(1)
        .maybeSingle();

      if (!ve?.viagem_id) { setTrackingHistory([]); return; }

      const { data: history } = await supabase
        .from('tracking_historico')
        .select('*')
        .eq('viagem_id', ve.viagem_id)
        .order('tracked_at', { ascending: true });

      setTrackingHistory((history || []).map(h => ({
        id: h.id,
        latitude: h.latitude || 0,
        longitude: h.longitude || 0,
        timestamp: h.tracked_at || h.created_at || '',
        status: h.status,
        velocidade: h.speed,
      })));
    }
    fetchHistory();
  }, [selectedDriverId, drivers]);

  const selectedDriver = useMemo(
    () => filteredDrivers.find(d => d.motorista_id === selectedDriverId) || null,
    [filteredDrivers, selectedDriverId]
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-3 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">Monitoramento em Tempo Real</h1>
            <p className="text-xs text-muted-foreground">Rastreamento de motoristas e entregas</p>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={`ml-1 text-xs ${isConnected ? 'bg-emerald-500 text-white border-emerald-500' : ''}`}
          >
            <Signal className="w-2.5 h-2.5 mr-1" />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats pills */}
          <div className="flex items-center divide-x divide-border">
            <span className="flex items-center gap-1.5 text-sm pr-4 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-bold text-foreground">{stats.total}</span> motoristas
            </span>
            <span className="flex items-center gap-1.5 text-sm px-4 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-foreground">{stats.online}</span> online
            </span>
            <span className="flex items-center gap-1.5 text-sm pl-4 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span className="font-bold text-foreground">{stats.withDelivery}</span> em entrega
            </span>
          </div>

          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="w-[165px] h-8 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              <SelectItem value="autonomo">Autônomos</SelectItem>
              {empresas.map(e => (
                <SelectItem key={e.nome} value={e.nome}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={refetchLocations}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden py-3 gap-3">

        {/* Sidebar card */}
        <div className="w-72 shrink-0 rounded-xl border bg-background shadow-sm flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar motorista..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/40"
              />
            </div>
          </div>

          {/* Online / offline count */}
          <div className="px-3 pb-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground">
                {filteredDrivers.filter(d => d.timestamp && Date.now() - d.timestamp < 5 * 60 * 1000).length}
              </span>
              online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="font-semibold text-foreground">
                {filteredDrivers.filter(d => !d.timestamp || Date.now() - d.timestamp >= 5 * 60 * 1000).length}
              </span>
              offline
            </span>
          </div>

          <div className="h-px bg-border mx-3 mb-1" />

          {/* Driver list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Carregando motoristas...
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                <CircleOff className="w-8 h-8 opacity-30" />
                <p>Nenhum motorista encontrado</p>
              </div>
            ) : (
              <div className="px-2 py-1 space-y-0.5">
                {filteredDrivers.map(driver => {
                  const isOnline = driver.timestamp ? Date.now() - driver.timestamp < 5 * 60 * 1000 : false;
                  const isSelected = driver.motorista_id === selectedDriverId;
                  const lastSeenText = driver.timestamp
                    ? formatDistanceToNow(new Date(driver.timestamp), { locale: ptBR, addSuffix: false })
                    : null;

                  return (
                    <button
                      key={driver.motorista_id}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-muted/60'
                        }`}
                      onClick={() => setSelectedDriverId(isSelected ? null : driver.motorista_id)}
                    >
                      {/* Avatar with online indicator */}
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8">
                          {driver.foto_url && <AvatarImage src={driver.foto_url} />}
                          <AvatarFallback className="text-[10px] font-bold bg-muted">
                            {driver.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                        />
                      </div>

                      {/* Text info — truncate is applied via flex+min-w-0 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{driver.nome}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight truncate">
                          {driver.empresa_nome || 'Autônomo'}
                        </p>
                        {driver.entrega_ativa && driver.entrega_status && (
                          <div className="flex items-center gap-1 mt-0.5 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors[driver.entrega_status] || 'bg-gray-400'}`} />
                            <span className="text-[10px] text-muted-foreground truncate">
                              {statusLabels[driver.entrega_status] || driver.entrega_status}
                              {driver.entrega_codigo && ` · ${driver.entrega_codigo}`}
                            </span>
                          </div>
                        )}
                        {!isOnline && lastSeenText && (
                          <p className="text-[10px] text-muted-foreground/70 truncate">há {lastSeenText}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected driver footer */}
          {selectedDriver && (
            <div className="mx-3 mb-3 mt-1 p-2.5 rounded-lg bg-primary/8 border border-primary/20 shrink-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Selecionado</p>
              <p className="text-xs font-semibold truncate">{selectedDriver.nome}</p>
              {selectedDriver.entrega_ativa ? (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {statusLabels[selectedDriver.entrega_status || ''] || selectedDriver.entrega_status}
                  {trackingHistory.length > 0 && ` · ${trackingHistory.length} pontos`}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">Sem entrega ativa</p>
              )}
            </div>
          )}
        </div>

        {/* Map card */}
        <div className="flex-1 relative rounded-xl overflow-hidden border shadow-sm">
          <MonitoramentoLeafletMap
            drivers={filteredDrivers}
            selectedDriverId={selectedDriverId}
            onSelectDriver={setSelectedDriverId}
            trackingHistory={trackingHistory}
          />

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-background/95 backdrop-blur border border-border rounded-xl p-3 text-xs space-y-1.5 shadow-lg">
            <p className="font-semibold text-foreground">Legenda</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Online (últimos 5 min)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
              <span className="text-muted-foreground">Offline</span>
            </div>
            {selectedDriverId && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">Selecionado</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
