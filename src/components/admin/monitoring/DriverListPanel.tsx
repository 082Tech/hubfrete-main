import { useState, useMemo } from 'react';
import { Search, Signal, SignalZero, Truck, Clock, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface DriverWithLocation {
  motorista_id: string;
  nome: string;
  foto_url: string | null;
  empresa_nome: string | null;
  telefone: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  velocidade: number | null;
  heading: number | null;
  entrega_ativa: boolean;
  entrega_codigo: string | null;
  entrega_status: string | null;
}

interface DriverListPanelProps {
  drivers: DriverWithLocation[];
  selectedDriverId: string | null;
  onSelectDriver: (id: string | null) => void;
  isLoading?: boolean;
}

export function DriverListPanel({
  drivers,
  selectedDriverId,
  onSelectDriver,
  isLoading = false,
}: DriverListPanelProps) {
  const [search, setSearch] = useState('');

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers;
    const term = search.toLowerCase();
    return drivers.filter(
      (d) =>
        d.nome.toLowerCase().includes(term) ||
        d.empresa_nome?.toLowerCase().includes(term) ||
        d.entrega_codigo?.toLowerCase().includes(term)
    );
  }, [drivers, search]);

  const onlineDrivers = filteredDrivers.filter((d) => d.latitude !== null);
  const offlineDrivers = filteredDrivers.filter((d) => d.latitude === null);

  const isOnline = (timestamp: number | null) => {
    if (!timestamp) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return timestamp > fiveMinutesAgo;
  };

  const getTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Sem localização';
    return formatDistanceToNow(new Date(timestamp), { locale: ptBR, addSuffix: true });
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground mb-3">Motoristas</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Signal className="w-3 h-3 text-chart-2" />
            <span>{onlineDrivers.length} online</span>
          </div>
          <div className="flex items-center gap-1">
            <SignalZero className="w-3 h-3 text-muted-foreground" />
            <span>{offlineDrivers.length} offline</span>
          </div>
        </div>
      </div>

      {/* Driver List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Carregando motoristas...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nenhum motorista encontrado
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Online drivers first */}
            {onlineDrivers.map((driver) => (
              <DriverCard
                key={driver.motorista_id}
                driver={driver}
                isSelected={selectedDriverId === driver.motorista_id}
                isOnline={isOnline(driver.timestamp)}
                timeAgo={getTimeAgo(driver.timestamp)}
                onClick={() => onSelectDriver(driver.motorista_id)}
              />
            ))}
            
            {/* Separator if both groups exist */}
            {onlineDrivers.length > 0 && offlineDrivers.length > 0 && (
              <div className="py-2">
                <div className="border-t border-border" />
                <p className="text-xs text-muted-foreground mt-2 px-2">Offline</p>
              </div>
            )}
            
            {/* Offline drivers */}
            {offlineDrivers.map((driver) => (
              <DriverCard
                key={driver.motorista_id}
                driver={driver}
                isSelected={selectedDriverId === driver.motorista_id}
                isOnline={false}
                timeAgo={getTimeAgo(driver.timestamp)}
                onClick={() => onSelectDriver(driver.motorista_id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface DriverCardProps {
  driver: DriverWithLocation;
  isSelected: boolean;
  isOnline: boolean;
  timeAgo: string;
  onClick: () => void;
}

function DriverCard({ driver, isSelected, isOnline, timeAgo, onClick }: DriverCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/50 border border-transparent'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {driver.foto_url ? (
          <img
            src={driver.foto_url}
            alt={driver.nome}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
        )}
        {/* Online indicator */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
            isOnline ? 'bg-chart-2' : 'bg-muted-foreground'
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{driver.nome}</p>
        <p className="text-xs text-muted-foreground truncate">
          {driver.empresa_nome || 'Autônomo'}
        </p>
        {driver.entrega_ativa && driver.entrega_codigo && (
          <Badge variant="secondary" className="mt-1 text-[10px] h-5">
            {driver.entrega_codigo}
          </Badge>
        )}
      </div>

      {/* Time & Arrow */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
        {driver.velocidade !== null && driver.velocidade > 0 && (
          <span className="text-[10px] text-chart-2 font-medium">
            {Math.round(driver.velocidade)} km/h
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}
