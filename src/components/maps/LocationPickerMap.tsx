import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Search, Building2 } from 'lucide-react';
import { useReverseGeocode, GeocodedAddress } from '@/hooks/useReverseGeocode';
import { useCnpjLookup, CnpjData } from '@/hooks/useCnpjLookup';
import { toast } from 'sonner';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createLocationIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-location-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

function MapClickHandler({ onLocationSelect }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface CenterMapProps {
  center: [number, number] | null;
}

function CenterMap({ center }: CenterMapProps) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  
  return null;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contato_nome: string;
  contato_telefone: string;
  cnpj?: string;
  razao_social?: string;
}

interface LocationPickerMapProps {
  tipo: 'origem' | 'destino';
  initialData?: Partial<LocationData>;
  onLocationChange: (data: LocationData) => void;
}

export function LocationPickerMap({ tipo, initialData, onLocationChange }: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialData?.latitude && initialData?.longitude 
      ? [initialData.latitude, initialData.longitude] 
      : null
  );
  const [centerTo, setCenterTo] = useState<[number, number] | null>(null);
  const [cnpjInput, setCnpjInput] = useState('');
  const [formData, setFormData] = useState<LocationData>({
    latitude: initialData?.latitude || 0,
    longitude: initialData?.longitude || 0,
    cep: initialData?.cep || '',
    logradouro: initialData?.logradouro || '',
    numero: initialData?.numero || '',
    complemento: initialData?.complemento || '',
    bairro: initialData?.bairro || '',
    cidade: initialData?.cidade || '',
    estado: initialData?.estado || '',
    contato_nome: initialData?.contato_nome || '',
    contato_telefone: initialData?.contato_telefone || '',
    cnpj: initialData?.cnpj || '',
    razao_social: initialData?.razao_social || '',
  });

  const { reverseGeocode, isLoading: isGeocodingLoading } = useReverseGeocode();
  const { lookup: lookupCnpj, isLoading: isCnpjLoading } = useCnpjLookup();

  // Default center (Brazil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  const markerColor = tipo === 'origem' ? '#6b7280' : '#3b82f6';

  const handleLocationSelect = useCallback(async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    
    const geocoded = await reverseGeocode(lat, lng);
    if (geocoded) {
      const newData: LocationData = {
        ...formData,
        latitude: lat,
        longitude: lng,
        cep: geocoded.cep || formData.cep,
        logradouro: geocoded.logradouro || formData.logradouro,
        bairro: geocoded.bairro || formData.bairro,
        cidade: geocoded.cidade || formData.cidade,
        estado: geocoded.estado || formData.estado,
      };
      setFormData(newData);
      onLocationChange(newData);
      toast.success('Endereço capturado do mapa');
    }
  }, [formData, onLocationChange, reverseGeocode]);

  const handleCnpjSearch = async () => {
    if (!cnpjInput) {
      toast.error('Digite um CNPJ');
      return;
    }

    const data = await lookupCnpj(cnpjInput);
    if (data) {
      // Try to geocode the address from CNPJ
      const addressQuery = `${data.logradouro}, ${data.numero}, ${data.municipio}, ${data.uf}, Brasil`;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`,
          { headers: { 'User-Agent': 'HubFrete/1.0' } }
        );
        const results = await response.json();
        
        let lat = 0, lng = 0;
        if (results.length > 0) {
          lat = parseFloat(results[0].lat);
          lng = parseFloat(results[0].lon);
          setPosition([lat, lng]);
          setCenterTo([lat, lng]);
        }

        const newData: LocationData = {
          latitude: lat,
          longitude: lng,
          cep: data.cep.replace(/\D/g, ''),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.municipio,
          estado: data.uf,
          contato_nome: formData.contato_nome,
          contato_telefone: data.telefone || formData.contato_telefone,
          cnpj: data.cnpj,
          razao_social: data.razao_social,
        };
        
        setFormData(newData);
        onLocationChange(newData);
        toast.success(`Dados da empresa "${data.nome_fantasia || data.razao_social}" carregados`);
      } catch (err) {
        // Still update with CNPJ data even if geocoding fails
        const newData: LocationData = {
          ...formData,
          cep: data.cep.replace(/\D/g, ''),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.municipio,
          estado: data.uf,
          contato_telefone: data.telefone || formData.contato_telefone,
          cnpj: data.cnpj,
          razao_social: data.razao_social,
        };
        setFormData(newData);
        onLocationChange(newData);
        toast.success('Dados do CNPJ carregados (selecione o local no mapa)');
      }
    } else {
      toast.error('CNPJ não encontrado');
    }
  };

  const handleInputChange = (field: keyof LocationData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onLocationChange(newData);
  };

  return (
    <div className="space-y-4">
      {/* CNPJ Search */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-sm mb-1.5 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Buscar por CNPJ
              </Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCnpjSearch()}
              />
            </div>
            <Button 
              type="button"
              onClick={handleCnpjSearch}
              disabled={isCnpjLoading}
              size="default"
            >
              {isCnpjLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
          {formData.razao_social && (
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Empresa:</strong> {formData.razao_social}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <div className="relative">
        <div className="w-full h-[250px] rounded-lg overflow-hidden border border-border">
          <MapContainer
            center={position || defaultCenter}
            zoom={position ? 15 : 4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={handleLocationSelect} />
            <CenterMap center={centerTo} />
            {position && (
              <Marker position={position} icon={createLocationIcon(markerColor)} />
            )}
          </MapContainer>
        </div>
        
        {isGeocodingLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Buscando endereço...</span>
            </div>
          </div>
        )}
        
        {!position && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Clique no mapa para selecionar o local
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Address Fields */}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">CEP</Label>
            <Input 
              value={formData.cep}
              onChange={(e) => handleInputChange('cep', e.target.value)}
              placeholder="00000-000"
            />
          </div>
          <div>
            <Label className="text-sm">Estado</Label>
            <Input 
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              placeholder="SP"
              maxLength={2}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm">Cidade *</Label>
          <Input 
            value={formData.cidade}
            onChange={(e) => handleInputChange('cidade', e.target.value)}
            placeholder="São Paulo"
          />
        </div>

        <div>
          <Label className="text-sm">Bairro</Label>
          <Input 
            value={formData.bairro}
            onChange={(e) => handleInputChange('bairro', e.target.value)}
            placeholder="Centro"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label className="text-sm">Logradouro *</Label>
            <Input 
              value={formData.logradouro}
              onChange={(e) => handleInputChange('logradouro', e.target.value)}
              placeholder="Rua, Avenida, etc."
            />
          </div>
          <div>
            <Label className="text-sm">Número</Label>
            <Input 
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              placeholder="123"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm">Complemento</Label>
          <Input 
            value={formData.complemento}
            onChange={(e) => handleInputChange('complemento', e.target.value)}
            placeholder="Galpão 2, Doca 5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Contato</Label>
            <Input 
              value={formData.contato_nome}
              onChange={(e) => handleInputChange('contato_nome', e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>
          <div>
            <Label className="text-sm">Telefone</Label>
            <Input 
              value={formData.contato_telefone}
              onChange={(e) => handleInputChange('contato_telefone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
