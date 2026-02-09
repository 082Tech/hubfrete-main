import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Package, 
  Calendar, 
  Truck, 
  Building2, 
  Phone, 
  User,
  Loader2,
  Route,
  Weight,
  Box,
  AlertTriangle,
  Snowflake,
  FileText,
  Container,
  CheckCircle2
} from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import { VEICULOS_CONFIG, CARROCERIAS_CONFIG, ALL_VEICULOS, ALL_CARROCERIAS } from './VeiculoCarroceriaSelect';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Circular icon for origin (green with O)
const createOriginIcon = () => new L.DivIcon({
  className: 'origin-marker',
  html: `
    <div style="
      background-color: #22c55e;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">
      O
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Circular icon for destination (red with D)
const createDestinoIcon = () => new L.DivIcon({
  className: 'destino-marker',
  html: `
    <div style="
      background-color: #ef4444;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">
      D
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

interface FitBoundsProps {
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
}

function FitBounds({ origemLat, origemLng, destinoLat, destinoLng }: FitBoundsProps) {
  const map = useMap();
  
  useEffect(() => {
    const hasOrigem = origemLat !== 0 && origemLng !== 0;
    const hasDestino = destinoLat !== 0 && destinoLng !== 0;
    
    if (hasOrigem && hasDestino) {
      const bounds = L.latLngBounds(
        [origemLat, origemLng],
        [destinoLat, destinoLng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (hasOrigem) {
      map.setView([origemLat, origemLng], 12);
    } else if (hasDestino) {
      map.setView([destinoLat, destinoLng], 12);
    }
  }, [origemLat, origemLng, destinoLat, destinoLng, map]);
  
  return null;
}

interface ResumoSectionProps {
  origemData: LocationData;
  destinoData: LocationData;
  cargaData: {
    descricao: string;
    tipo: string;
    peso_kg: number;
    volume_m3?: number;
    valor_mercadoria?: number;
    tipo_precificacao?: string;
    valor_frete_tonelada?: number;
    valor_frete_m3?: number;
    valor_frete_fixo?: number;
    valor_frete_km?: number;
    data_coleta_de: string;
    data_coleta_ate?: string;
    data_entrega_limite?: string;
    carga_fragil?: boolean;
    carga_perigosa?: boolean;
    carga_viva?: boolean;
    empilhavel?: boolean;
    requer_refrigeracao?: boolean;
    temperatura_min?: number;
    temperatura_max?: number;
    numero_onu?: string;
    regras_carregamento?: string;
  };
  necessidadesEspeciais: string[];
  notaFiscalUrl: string | null;
  veiculosSelecionados?: string[];
  carroceriasSelecionadas?: string[];
}

const tipoCargaLabels: Record<string, string> = {
  'carga_seca': 'Carga Seca',
  'granel_solido': 'Granel Sólido',
  'granel_liquido': 'Granel Líquido',
  'refrigerada': 'Refrigerada',
  'congelada': 'Congelada',
  'perigosa': 'Perigosa',
  'viva': 'Carga Viva',
  'indivisivel': 'Indivisível',
  'container': 'Container',
};

export function ResumoSection({ 
  origemData, 
  destinoData, 
  cargaData,
  necessidadesEspeciais,
  notaFiscalUrl,
  veiculosSelecionados = [],
  carroceriasSelecionadas = [],
}: ResumoSectionProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // Use stable primitive values for coordinates
  const origemLat = Number(origemData.latitude) || 0;
  const origemLng = Number(origemData.longitude) || 0;
  const destinoLat = Number(destinoData.latitude) || 0;
  const destinoLng = Number(destinoData.longitude) || 0;

  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  
  // Debug logging
  useEffect(() => {
    console.log('ResumoSection coords:', { origemLat, origemLng, destinoLat, destinoLng });
    console.log('origemData:', origemData);
    console.log('destinoData:', destinoData);
  }, [origemLat, origemLng, destinoLat, destinoLng, origemData, destinoData]);

  // Fetch route from OSRM
  useEffect(() => {
    const fetchRoute = async () => {
      // Check if we have valid coordinates
      if (origemLat === 0 || origemLng === 0 || destinoLat === 0 || destinoLng === 0) {
        setRouteCoords([]);
        setDistance(null);
        setDuration(null);
        return;
      }

      setIsLoadingRoute(true);
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
          );
          setRouteCoords(coords);
          setDistance(data.routes[0].distance / 1000); // km
          setDuration(data.routes[0].duration / 3600); // hours
        }
      } catch (err) {
        console.error('Error fetching route:', err);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [origemLat, origemLng, destinoLat, destinoLng]);

  const formatAddress = (data: LocationData) => {
    const parts = [
      data.logradouro,
      data.numero && `nº ${data.numero}`,
      data.bairro,
      data.cidade && data.estado && `${data.cidade}/${data.estado}`,
      data.cep && `CEP: ${data.cep}`,
    ].filter(Boolean);
    return parts.join(', ') || 'Endereço não informado';
  };

  const hasValidOrigin = origemData.cidade && origemData.logradouro;
  const hasValidDestino = destinoData.cidade && destinoData.logradouro;
  const hasValidRoute = origemLat !== 0 && origemLng !== 0 && destinoLat !== 0 && destinoLng !== 0;

  return (
    <div className="space-y-4">
      {/* Map with route */}
      <div className="relative">
        <div className="w-full h-[280px] rounded-lg overflow-hidden border border-border">
          <MapContainer
            center={defaultCenter}
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds 
              origemLat={origemLat}
              origemLng={origemLng}
              destinoLat={destinoLat}
              destinoLng={destinoLng}
            />
            
            {/* Route line - render when we have both coordinates */}
            {routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '10, 6',
                }}
              />
            )}
            
            {/* Fallback straight line when route is loading or failed but we have coordinates */}
            {routeCoords.length === 0 && origemLat !== 0 && destinoLat !== 0 && (
              <Polyline
                positions={[[origemLat, origemLng], [destinoLat, destinoLng]]}
                pathOptions={{
                  color: '#94a3b8',
                  weight: 3,
                  opacity: 0.5,
                  dashArray: '5, 10',
                }}
              />
            )}
            
            {/* Origin marker with circular O icon */}
            {origemLat !== 0 && origemLng !== 0 && (
              <Marker position={[origemLat, origemLng]} icon={createOriginIcon()} />
            )}
            
            {/* Destination marker with circular D icon */}
            {destinoLat !== 0 && destinoLng !== 0 && (
              <Marker position={[destinoLat, destinoLng]} icon={createDestinoIcon()} />
            )}
          </MapContainer>
        </div>
        
        {isLoadingRoute && (
          <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Calculando rota...</span>
          </div>
        )}

        {!hasValidRoute && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Configure origem e destino para visualizar a rota
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Route info */}
      {distance && duration && (
        <div className="flex gap-4 justify-center">
          <Badge variant="secondary" className="px-4 py-2">
            <Route className="w-4 h-4 mr-2" />
            {distance.toFixed(0)} km
          </Badge>
          <Badge variant="secondary" className="px-4 py-2">
            <Truck className="w-4 h-4 mr-2" />
            ~{duration.toFixed(1)} horas
          </Badge>
        </div>
      )}

      {/* Origin and Destination summary */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Origin Card */}
        <Card className={`${hasValidOrigin ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                O
              </div>
              Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hasValidOrigin ? (
              <>
                <p className="text-muted-foreground">{formatAddress(origemData)}</p>
                {origemData.contato_nome && (
                  <p className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {origemData.contato_nome}
                  </p>
                )}
                {origemData.contato_telefone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {origemData.contato_telefone}
                  </p>
                )}
              </>
            ) : (
              <p className="text-destructive">⚠️ Origem não configurada</p>
            )}
          </CardContent>
        </Card>

        {/* Destination Card */}
        <Card className={`${hasValidDestino ? 'border-red-500/30 bg-red-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                D
              </div>
              Destino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hasValidDestino ? (
              <>
                {destinoData.razao_social && (
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    {destinoData.razao_social}
                  </p>
                )}
                <p className="text-muted-foreground">{formatAddress(destinoData)}</p>
                {destinoData.contato_nome && (
                  <p className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {destinoData.contato_nome}
                  </p>
                )}
                {destinoData.contato_telefone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {destinoData.contato_telefone}
                  </p>
                )}
              </>
            ) : (
              <p className="text-destructive">⚠️ Destino não configurado</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Cargo details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Dados da Carga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">{cargaData.descricao || 'Sem descrição'}</p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {tipoCargaLabels[cargaData.tipo] || cargaData.tipo}
            </Badge>
            <Badge variant="secondary">
              <Weight className="w-3 h-3 mr-1" />
              {cargaData.peso_kg} kg
            </Badge>
            {cargaData.volume_m3 && (
              <Badge variant="secondary">
                <Box className="w-3 h-3 mr-1" />
                {cargaData.volume_m3} m³
              </Badge>
            )}
            {cargaData.valor_mercadoria && (
              <Badge variant="secondary">
                R$ {cargaData.valor_mercadoria.toLocaleString('pt-BR')}
              </Badge>
            )}
            {(() => {
              const tp = cargaData.tipo_precificacao || 'por_tonelada';
              const labels: Record<string, string> = {
                por_tonelada: '/ton',
                por_m3: '/m³',
                fixo: ' (fixo)',
                por_km: '/km',
              };
              const values: Record<string, number | undefined> = {
                por_tonelada: cargaData.valor_frete_tonelada,
                por_m3: cargaData.valor_frete_m3,
                fixo: cargaData.valor_frete_fixo,
                por_km: cargaData.valor_frete_km,
              };
              const val = values[tp];
              if (!val) return null;
              return (
                <>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Frete: R$ {val.toLocaleString('pt-BR')}{labels[tp]}
                  </Badge>
                  {tp === 'por_tonelada' && cargaData.peso_kg > 0 && (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Total: R$ {((cargaData.peso_kg / 1000) * val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                  {tp === 'por_m3' && (cargaData.volume_m3 ?? 0) > 0 && (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Total: R$ {((cargaData.volume_m3 ?? 0) * val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                  {tp === 'fixo' && (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Total: R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                </>
              );
            })()}
          </div>

          {/* Special characteristics */}
          <div className="flex flex-wrap gap-2">
            {cargaData.carga_fragil && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Frágil
              </Badge>
            )}
            {cargaData.carga_perigosa && (
              <Badge variant="outline" className="border-red-500 text-red-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Perigosa {cargaData.numero_onu && `(${cargaData.numero_onu})`}
              </Badge>
            )}
            {cargaData.carga_viva && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                Carga Viva
              </Badge>
            )}
            {cargaData.requer_refrigeracao && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                <Snowflake className="w-3 h-3 mr-1" />
                Refrigerada
                {cargaData.temperatura_min !== undefined && cargaData.temperatura_max !== undefined && 
                  ` (${cargaData.temperatura_min}°C ~ ${cargaData.temperatura_max}°C)`
                }
              </Badge>
            )}
            {cargaData.empilhavel === false && (
              <Badge variant="outline">Não empilhável</Badge>
            )}
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Coleta: {cargaData.data_coleta_de ? new Date(cargaData.data_coleta_de + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
              {cargaData.data_coleta_ate && ` até ${new Date(cargaData.data_coleta_ate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
            </span>
            {cargaData.data_entrega_limite && (
              <span>
                Entrega até: {new Date(cargaData.data_entrega_limite + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Special needs */}
          {necessidadesEspeciais.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Necessidades Especiais:</p>
              <div className="flex flex-wrap gap-1">
                {necessidadesEspeciais.map((item) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Loading rules */}
          {cargaData.regras_carregamento && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Regras de Carregamento:</p>
              <p className="text-sm bg-muted/50 p-2 rounded">{cargaData.regras_carregamento}</p>
            </div>
          )}

          {/* Vehicle requirements */}
          {veiculosSelecionados.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Veículos Aceitos:
              </p>
              <div className="flex flex-wrap gap-1">
                {veiculosSelecionados.length === ALL_VEICULOS.length ? (
                  <Badge variant="default" className="text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Todos os veículos
                  </Badge>
                ) : (
                  veiculosSelecionados.map((v) => {
                    const item = Object.values(VEICULOS_CONFIG).flatMap(c => c.items).find(i => i.value === v);
                    return item ? (
                      <Badge key={v} variant="outline" className="text-xs">
                        {item.label}
                      </Badge>
                    ) : null;
                  })
                )}
              </div>
            </div>
          )}

          {/* Body type requirements */}
          {carroceriasSelecionadas.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Container className="w-3 h-3" />
                Carrocerias Aceitas:
              </p>
              <div className="flex flex-wrap gap-1">
                {carroceriasSelecionadas.length === ALL_CARROCERIAS.length ? (
                  <Badge variant="default" className="text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Todas as carrocerias
                  </Badge>
                ) : (
                  carroceriasSelecionadas.map((c) => {
                    const item = Object.values(CARROCERIAS_CONFIG).flatMap(cat => cat.items).find(i => i.value === c);
                    return item ? (
                      <Badge key={c} variant="outline" className="text-xs">
                        {item.label}
                      </Badge>
                    ) : null;
                  })
                )}
              </div>
            </div>
          )}

          {/* Invoice */}
          {notaFiscalUrl && (
            <div className="flex items-center gap-2 text-green-600">
              <FileText className="w-4 h-4" />
              <span>Nota fiscal anexada</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
