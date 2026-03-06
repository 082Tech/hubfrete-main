import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Package, Calendar, Truck, Building2, Phone, User, Loader2, Route,
  Weight, Box, AlertTriangle, Snowflake, FileText, Container, CheckCircle2
} from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import { VEICULOS_CONFIG, CARROCERIAS_CONFIG, ALL_VEICULOS, ALL_CARROCERIAS } from './VeiculoCarroceriaSelect';

// Leaflet icon setup
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createOriginIcon = () => new L.DivIcon({
  className: 'origin-marker',
  html: `<div style="background-color:#22c55e;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">O</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
});

const createDestinoIcon = () => new L.DivIcon({
  className: 'destino-marker',
  html: `<div style="background-color:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">D</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
});

interface FitBoundsProps { origemLat: number; origemLng: number; destinoLat: number; destinoLng: number; }

function FitBounds({ origemLat, origemLng, destinoLat, destinoLng }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    const hasOrigem = origemLat !== 0 && origemLng !== 0;
    const hasDestino = destinoLat !== 0 && destinoLng !== 0;
    if (hasOrigem && hasDestino) {
      map.fitBounds(L.latLngBounds([origemLat, origemLng], [destinoLat, destinoLng]), { padding: [50, 50] });
    } else if (hasOrigem) { map.setView([origemLat, origemLng], 12); }
    else if (hasDestino) { map.setView([destinoLat, destinoLng], 12); }
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
    // New NF-e pricing
    unidade_precificacao?: string;
    quantidade_precificacao?: number;
    valor_unitario_precificacao?: number;
    // Legacy
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
  'carga_seca': 'Carga Seca', 'granel_solido': 'Granel Sólido', 'granel_liquido': 'Granel Líquido',
  'refrigerada': 'Refrigerada', 'congelada': 'Congelada', 'perigosa': 'Perigosa',
  'viva': 'Carga Viva', 'indivisivel': 'Indivisível', 'container': 'Container',
};

export function ResumoSection({ 
  origemData, destinoData, cargaData, necessidadesEspeciais, notaFiscalUrl,
  veiculosSelecionados = [], carroceriasSelecionadas = [],
}: ResumoSectionProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const origemLat = Number(origemData.latitude) || 0;
  const origemLng = Number(origemData.longitude) || 0;
  const destinoLat = Number(destinoData.latitude) || 0;
  const destinoLng = Number(destinoData.longitude) || 0;
  const defaultCenter: [number, number] = [-15.7801, -47.9292];

  useEffect(() => {
    const fetchRoute = async () => {
      if (origemLat === 0 || origemLng === 0 || destinoLat === 0 || destinoLng === 0) {
        setRouteCoords([]); setDistance(null); setDuration(null); return;
      }
      setIsLoadingRoute(true);
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`);
        const data = await response.json();
        if (data.routes?.length > 0) {
          setRouteCoords(data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]));
          setDistance(data.routes[0].distance / 1000);
          setDuration(data.routes[0].duration / 3600);
        }
      } catch (err) { console.error('Error fetching route:', err); }
      finally { setIsLoadingRoute(false); }
    };
    fetchRoute();
  }, [origemLat, origemLng, destinoLat, destinoLng]);

  const formatAddress = (data: LocationData) => {
    return [data.logradouro, data.numero && `nº ${data.numero}`, data.bairro, data.cidade && data.estado && `${data.cidade}/${data.estado}`, data.cep && `CEP: ${data.cep}`].filter(Boolean).join(', ') || 'Endereço não informado';
  };

  const hasValidOrigin = origemData.cidade && origemData.logradouro;
  const hasValidDestino = destinoData.cidade && destinoData.logradouro;
  const hasValidRoute = origemLat !== 0 && origemLng !== 0 && destinoLat !== 0 && destinoLng !== 0;

  // NF-e pricing
  const unidade = cargaData.unidade_precificacao;
  const qtdPrec = cargaData.quantidade_precificacao;
  const vlrUnit = cargaData.valor_unitario_precificacao;
  const freteTotal = (qtdPrec ?? 0) > 0 && (vlrUnit ?? 0) > 0
    ? Math.round((qtdPrec ?? 0) * (vlrUnit ?? 0) * 100) / 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative">
        <div className="w-full h-[200px] rounded-lg overflow-hidden border border-border relative z-0">
          <MapContainer center={defaultCenter} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds origemLat={origemLat} origemLng={origemLng} destinoLat={destinoLat} destinoLng={destinoLng} />
            {routeCoords.length > 0 && <Polyline positions={routeCoords} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '10, 6' }} />}
            {routeCoords.length === 0 && origemLat !== 0 && destinoLat !== 0 && <Polyline positions={[[origemLat, origemLng], [destinoLat, destinoLng]]} pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.5, dashArray: '5, 10' }} />}
            {origemLat !== 0 && origemLng !== 0 && <Marker position={[origemLat, origemLng]} icon={createOriginIcon()} />}
            {destinoLat !== 0 && destinoLng !== 0 && <Marker position={[destinoLat, destinoLng]} icon={createDestinoIcon()} />}
          </MapContainer>
        </div>
        {isLoadingRoute && (
          <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded-md shadow-lg flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /><span className="text-[11px]">Calculando rota...</span>
          </div>
        )}
        {!hasValidRoute && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 px-3 py-1.5 rounded-lg shadow-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3 h-3" />Configure origem e destino</p>
            </div>
          </div>
        )}
      </div>

      {distance && duration && (
        <div className="flex gap-2 justify-center">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs"><Route className="w-3 h-3 mr-1" />{distance.toFixed(0)} km</Badge>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs"><Truck className="w-3 h-3 mr-1" />~{duration.toFixed(1)}h</Badge>
        </div>
      )}

      {/* Origin / Destination cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className={`${hasValidOrigin ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">O</div>
              Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hasValidOrigin ? (
              <>
                <p className="text-muted-foreground">{formatAddress(origemData)}</p>
                {origemData.contato_nome && <p className="flex items-center gap-2"><User className="w-3 h-3" />{origemData.contato_nome}</p>}
                {origemData.contato_telefone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{origemData.contato_telefone}</p>}
              </>
            ) : <p className="text-destructive">⚠️ Origem não configurada</p>}
          </CardContent>
        </Card>

        <Card className={`${hasValidDestino ? 'border-red-500/30 bg-red-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">D</div>
              Destino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hasValidDestino ? (
              <>
                {destinoData.razao_social && <p className="font-medium flex items-center gap-2"><Building2 className="w-3 h-3" />{destinoData.razao_social}</p>}
                <p className="text-muted-foreground">{formatAddress(destinoData)}</p>
                {destinoData.contato_nome && <p className="flex items-center gap-2"><User className="w-3 h-3" />{destinoData.contato_nome}</p>}
                {destinoData.contato_telefone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{destinoData.contato_telefone}</p>}
              </>
            ) : <p className="text-destructive">⚠️ Destino não configurada</p>}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Cargo details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" />Dados da Carga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">{cargaData.descricao || 'Sem descrição'}</p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{tipoCargaLabels[cargaData.tipo] || cargaData.tipo}</Badge>
            <Badge variant="secondary"><Weight className="w-3 h-3 mr-1" />{cargaData.peso_kg} kg</Badge>
            {cargaData.volume_m3 && <Badge variant="secondary"><Box className="w-3 h-3 mr-1" />{cargaData.volume_m3} m³</Badge>}
            {cargaData.valor_mercadoria && <Badge variant="secondary">R$ {cargaData.valor_mercadoria.toLocaleString('pt-BR')}</Badge>}

            {/* New NF-e pricing display */}
            {unidade && (vlrUnit ?? 0) > 0 && (
              <>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Frete: R$ {(vlrUnit ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{unidade}
                </Badge>
                {freteTotal > 0 && (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Total: R$ {freteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Special characteristics */}
          <div className="flex flex-wrap gap-2">
            {cargaData.carga_fragil && <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertTriangle className="w-3 h-3 mr-1" />Frágil</Badge>}
            {cargaData.carga_perigosa && <Badge variant="outline" className="border-red-500 text-red-600"><AlertTriangle className="w-3 h-3 mr-1" />Perigosa</Badge>}
            {cargaData.carga_viva && <Badge variant="outline" className="border-green-500 text-green-600">Carga Viva</Badge>}
            {cargaData.empilhavel && <Badge variant="outline" className="border-blue-500 text-blue-600"><Container className="w-3 h-3 mr-1" />Empilhável</Badge>}
            {cargaData.requer_refrigeracao && (
              <Badge variant="outline" className="border-cyan-500 text-cyan-600">
                <Snowflake className="w-3 h-3 mr-1" />
                Refrigerada {cargaData.temperatura_min !== undefined && cargaData.temperatura_max !== undefined && `(${cargaData.temperatura_min}°C a ${cargaData.temperatura_max}°C)`}
              </Badge>
            )}
            {cargaData.numero_onu && <Badge variant="outline" className="border-orange-500 text-orange-600">ONU: {cargaData.numero_onu}</Badge>}
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            {cargaData.data_coleta_de && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Coleta: {new Date(cargaData.data_coleta_de + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            )}
            {cargaData.data_coleta_ate && (
              <span className="flex items-center gap-1">até {new Date(cargaData.data_coleta_ate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            )}
            {cargaData.data_entrega_limite && (
              <span className="flex items-center gap-1"><Truck className="w-3 h-3" />Entrega limite: {new Date(cargaData.data_entrega_limite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            )}
          </div>

          {/* Veículos e Carrocerias */}
          {(veiculosSelecionados.length > 0 || carroceriasSelecionadas.length > 0) && (
            <div className="space-y-2 pt-2">
              {veiculosSelecionados.length > 0 && veiculosSelecionados.length < ALL_VEICULOS.length && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Veículos aceitos:</p>
                  <div className="flex flex-wrap gap-1">
                    {veiculosSelecionados.map(v => {
                      const item = Object.values(VEICULOS_CONFIG).flatMap(c => c.items).find(i => i.value === v);
                      return <Badge key={v} variant="secondary" className="text-xs">{item?.label || v}</Badge>;
                    })}
                  </div>
                </div>
              )}
              {carroceriasSelecionadas.length > 0 && carroceriasSelecionadas.length < ALL_CARROCERIAS.length && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Carrocerias aceitas:</p>
                  <div className="flex flex-wrap gap-1">
                    {carroceriasSelecionadas.map(c => {
                      const item = Object.values(CARROCERIAS_CONFIG).flatMap(cat => cat.items).find(i => i.value === c);
                      return <Badge key={c} variant="secondary" className="text-xs">{item?.label || c}</Badge>;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {necessidadesEspeciais.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Necessidades especiais:</p>
              <div className="flex flex-wrap gap-1">
                {necessidadesEspeciais.map(n => <Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
              </div>
            </div>
          )}

          {cargaData.regras_carregamento && (
            <div className="pt-2 p-3 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Regras de carregamento:</p>
              <p className="text-sm">{cargaData.regras_carregamento}</p>
            </div>
          )}

          {notaFiscalUrl && (
            <div className="flex items-center gap-2 pt-2">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Nota fiscal anexada</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

