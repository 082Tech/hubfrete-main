import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Search, Building2, BookmarkPlus, Users } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { useCnpjLookup } from '@/hooks/useCnpjLookup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  zoom?: number;
}

function CenterMap({ center, zoom = 15 }: CenterMapProps) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  
  return null;
}

interface ContatoDestino {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  contato_nome: string | null;
  contato_telefone: string | null;
}

interface DestinoSectionProps {
  initialData?: Partial<LocationData>;
  onLocationChange: (data: LocationData) => void;
}

export function DestinoSection({ initialData, onLocationChange }: DestinoSectionProps) {
  const { empresa } = useUserContext();
  const [position, setPosition] = useState<[number, number] | null>(
    initialData?.latitude && initialData?.longitude 
      ? [initialData.latitude, initialData.longitude] 
      : null
  );
  const [centerTo, setCenterTo] = useState<[number, number] | null>(null);
  const [cnpjInput, setCnpjInput] = useState('');
  const [contatos, setContatos] = useState<ContatoDestino[]>([]);
  const [savingContato, setSavingContato] = useState(false);
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

  const defaultCenter: [number, number] = [-15.7801, -47.9292];

  // Load saved contacts
  useEffect(() => {
    const loadContatos = async () => {
      if (!empresa?.id) return;

      const { data, error } = await supabase
        .from('contatos_destino')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('razao_social');

      if (!error && data) {
        setContatos(data as ContatoDestino[]);
      }
    };

    loadContatos();
  }, [empresa?.id]);

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

  const handleSelectContato = (contatoId: string) => {
    const contato = contatos.find(c => c.id === contatoId);
    if (!contato) return;

    const newData: LocationData = {
      latitude: contato.latitude || 0,
      longitude: contato.longitude || 0,
      cep: contato.cep || '',
      logradouro: contato.logradouro || '',
      numero: contato.numero || '',
      complemento: contato.complemento || '',
      bairro: contato.bairro || '',
      cidade: contato.cidade || '',
      estado: contato.estado || '',
      contato_nome: contato.contato_nome || '',
      contato_telefone: contato.contato_telefone || '',
      cnpj: contato.cnpj,
      razao_social: contato.razao_social,
    };

    setFormData(newData);
    onLocationChange(newData);
    setCnpjInput(contato.cnpj);

    // Set position and center map if coordinates exist
    if (contato.latitude && contato.longitude) {
      const pos: [number, number] = [contato.latitude, contato.longitude];
      setPosition(pos);
      setCenterTo(pos);
    }

    toast.success(`Contato "${contato.nome_fantasia || contato.razao_social}" selecionado`);
  };

  const handleSaveContato = async () => {
    if (!empresa?.id || !formData.cnpj || !formData.razao_social) {
      toast.error('Preencha os dados do destinatário para salvar');
      return;
    }

    setSavingContato(true);
    try {
      const { error } = await supabase
        .from('contatos_destino')
        .upsert({
          empresa_id: empresa.id,
          cnpj: formData.cnpj,
          razao_social: formData.razao_social,
          nome_fantasia: formData.razao_social,
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          latitude: formData.latitude || null,
          longitude: formData.longitude || null,
          contato_nome: formData.contato_nome,
          contato_telefone: formData.contato_telefone,
        }, {
          onConflict: 'empresa_id,cnpj',
        });

      if (error) throw error;

      // Reload contacts
      const { data: newContatos } = await supabase
        .from('contatos_destino')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('razao_social');

      if (newContatos) {
        setContatos(newContatos as ContatoDestino[]);
      }

      toast.success('Contato salvo com sucesso!');
    } catch (err) {
      console.error('Error saving contact:', err);
      toast.error('Erro ao salvar contato');
    } finally {
      setSavingContato(false);
    }
  };

  const handleInputChange = (field: keyof LocationData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onLocationChange(newData);
  };

  // Determine map center and zoom
  const mapCenter = position && position[0] !== 0 ? position : defaultCenter;
  const mapZoom = position && position[0] !== 0 ? 15 : 4;

  return (
    <div className="space-y-4">
      {/* Saved Contacts */}
      {contatos.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-sm mb-1.5 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Selecionar contato salvo
                </Label>
                <Select onValueChange={handleSelectContato}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um destinatário..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-[10000]">
                    {contatos.map((contato) => (
                      <SelectItem key={contato.id} value={contato.id}>
                        {contato.razao_social} - {contato.cidade}/{contato.estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCnpjSearch())}
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
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>Empresa:</strong> {formData.razao_social}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveContato}
                disabled={savingContato}
                className="h-7"
              >
                {savingContato ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <BookmarkPlus className="w-3 h-3 mr-1" />
                    Salvar contato
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <div className="relative">
        <div className="w-full h-[250px] rounded-lg overflow-hidden border border-border">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={handleLocationSelect} />
            <CenterMap center={centerTo} zoom={15} />
            {position && position[0] !== 0 && (
              <Marker position={position} icon={createLocationIcon('#3b82f6')} />
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
