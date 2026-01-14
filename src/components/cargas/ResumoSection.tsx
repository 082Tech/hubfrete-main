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
  FileText
} from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface FitBoundsProps {
  origem: [number, number] | null;
  destino: [number, number] | null;
}

function FitBounds({ origem, destino }: FitBoundsProps) {
  const map = useMap();
  
  useEffect(() => {
    if (origem && destino && origem[0] !== 0 && destino[0] !== 0) {
      const bounds = L.latLngBounds([origem, destino]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (origem && origem[0] !== 0) {
      map.setView(origem, 12);
    } else if (destino && destino[0] !== 0) {
      map.setView(destino, 12);
    }
  }, [origem, destino, map]);
  
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
    quantidade?: number;
    valor_mercadoria?: number;
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
  notaFiscalUrl
}: ResumoSectionProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const origemPosition: [number, number] | null = 
    origemData.latitude && origemData.longitude 
      ? [origemData.latitude, origemData.longitude] 
      : null;
  
  const destinoPosition: [number, number] | null = 
    destinoData.latitude && destinoData.longitude 
      ? [destinoData.latitude, destinoData.longitude] 
      : null;

  const defaultCenter: [number, number] = [-15.7801, -47.9292];

  // Fetch route from OSRM
  useEffect(() => {
    const fetchRoute = async () => {
      if (!origemPosition || !destinoPosition || origemPosition[0] === 0 || destinoPosition[0] === 0) {
        setRouteCoords([]);
        return;
      }

      setIsLoadingRoute(true);
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origemPosition[1]},${origemPosition[0]};${destinoPosition[1]},${destinoPosition[0]}?overview=full&geometries=geojson`
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
  }, [origemPosition?.[0], origemPosition?.[1], destinoPosition?.[0], destinoPosition?.[1]]);

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
  const hasValidRoute = origemPosition && destinoPosition && origemPosition[0] !== 0 && destinoPosition[0] !== 0;

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
            <FitBounds origem={origemPosition} destino={destinoPosition} />
            
            {/* Route line */}
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
            
            {/* Origin marker */}
            {origemPosition && origemPosition[0] !== 0 && (
              <Marker position={origemPosition} icon={originIcon} />
            )}
            
            {/* Destination marker */}
            {destinoPosition && destinoPosition[0] !== 0 && (
              <Marker position={destinoPosition} icon={destinoIcon} />
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
            {cargaData.quantidade && cargaData.quantidade > 1 && (
              <Badge variant="secondary">
                Qtd: {cargaData.quantidade}
              </Badge>
            )}
            {cargaData.valor_mercadoria && (
              <Badge variant="secondary">
                R$ {cargaData.valor_mercadoria.toLocaleString('pt-BR')}
              </Badge>
            )}
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
              Coleta: {cargaData.data_coleta_de ? new Date(cargaData.data_coleta_de).toLocaleDateString('pt-BR') : 'Não definida'}
              {cargaData.data_coleta_ate && ` até ${new Date(cargaData.data_coleta_ate).toLocaleDateString('pt-BR')}`}
            </span>
            {cargaData.data_entrega_limite && (
              <span>
                Entrega até: {new Date(cargaData.data_entrega_limite).toLocaleDateString('pt-BR')}
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
