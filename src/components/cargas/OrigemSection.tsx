import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Pencil, X, Check } from 'lucide-react';
import { useUserContext, type Filial } from '@/hooks/useUserContext';
import { supabase } from '@/integrations/supabase/client';
import type { LocationData } from '@/components/maps/LocationPickerMap';

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

interface FilialCompleta extends Filial {
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  responsavel?: string | null;
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

interface OrigemSectionProps {
  initialData?: Partial<LocationData>;
  onLocationChange: (data: LocationData) => void;
}

export function OrigemSection({ initialData, onLocationChange }: OrigemSectionProps) {
  const { filialAtiva } = useUserContext();
  const [isEditing, setIsEditing] = useState(false);
  const [filialData, setFilialData] = useState<FilialCompleta | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
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
  });

  // Load full filial data
  useEffect(() => {
    const loadFilialData = async () => {
      if (!filialAtiva?.id) return;

      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('id', filialAtiva.id)
        .single();

      if (!error && data) {
        setFilialData(data as FilialCompleta);
        
        // Geocode the address to get coordinates
        if (data.endereco && data.cidade) {
          const addressQuery = `${data.endereco}, ${data.cidade}, ${data.estado}, Brasil`;
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
            }

            const newData: LocationData = {
              latitude: lat,
              longitude: lng,
              cep: data.cep || '',
              logradouro: data.endereco || '',
              numero: '',
              complemento: '',
              bairro: '',
              cidade: data.cidade || '',
              estado: data.estado || '',
              contato_nome: data.responsavel || '',
              contato_telefone: data.telefone || '',
            };
            
            setFormData(newData);
            onLocationChange(newData);
          } catch (err) {
            console.error('Geocoding error:', err);
            // Still set the data without coordinates
            const newData: LocationData = {
              latitude: 0,
              longitude: 0,
              cep: data.cep || '',
              logradouro: data.endereco || '',
              numero: '',
              complemento: '',
              bairro: '',
              cidade: data.cidade || '',
              estado: data.estado || '',
              contato_nome: data.responsavel || '',
              contato_telefone: data.telefone || '',
            };
            setFormData(newData);
            onLocationChange(newData);
          }
        }
      }
    };

    loadFilialData();
  }, [filialAtiva?.id]);

  const handleInputChange = (field: keyof LocationData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    if (isEditing) {
      onLocationChange(newData);
    }
  };

  const handleSaveEdit = () => {
    onLocationChange(formData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset to original filial data
    if (filialData) {
      const resetData: LocationData = {
        latitude: position?.[0] || 0,
        longitude: position?.[1] || 0,
        cep: filialData.cep || '',
        logradouro: filialData.endereco || '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: filialData.cidade || '',
        estado: filialData.estado || '',
        contato_nome: filialData.responsavel || '',
        contato_telefone: filialData.telefone || '',
      };
      setFormData(resetData);
      onLocationChange(resetData);
    }
    setIsEditing(false);
  };

  const defaultCenter: [number, number] = [-15.7801, -47.9292];

  return (
    <div className="space-y-4">
      {/* Filial Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Origem: {filialAtiva?.nome || 'Filial Ativa'}
            </CardTitle>
            {!isEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-2"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="h-8 px-2"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {filialData?.cnpj && (
            <p className="text-sm text-muted-foreground">
              <strong>CNPJ:</strong> {filialData.cnpj}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <div className="relative">
        <div className="w-full h-[200px] rounded-lg overflow-hidden border border-border">
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
            <CenterMap center={position} />
            {position && (
              <Marker position={position} icon={createLocationIcon('#6b7280')} />
            )}
          </MapContainer>
        </div>
        
        {!position && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Carregando localização da filial...
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
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label className="text-sm">Estado</Label>
            <Input 
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              placeholder="SP"
              maxLength={2}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm">Cidade *</Label>
          <Input 
            value={formData.cidade}
            onChange={(e) => handleInputChange('cidade', e.target.value)}
            placeholder="São Paulo"
            disabled={!isEditing}
          />
        </div>

        <div>
          <Label className="text-sm">Bairro</Label>
          <Input 
            value={formData.bairro}
            onChange={(e) => handleInputChange('bairro', e.target.value)}
            placeholder="Centro"
            disabled={!isEditing}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label className="text-sm">Logradouro *</Label>
            <Input 
              value={formData.logradouro}
              onChange={(e) => handleInputChange('logradouro', e.target.value)}
              placeholder="Rua, Avenida, etc."
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label className="text-sm">Número</Label>
            <Input 
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              placeholder="123"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm">Complemento</Label>
          <Input 
            value={formData.complemento}
            onChange={(e) => handleInputChange('complemento', e.target.value)}
            placeholder="Galpão 2, Doca 5"
            disabled={!isEditing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Contato</Label>
            <Input 
              value={formData.contato_nome}
              onChange={(e) => handleInputChange('contato_nome', e.target.value)}
              placeholder="Nome do responsável"
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label className="text-sm">Telefone</Label>
            <Input 
              value={formData.contato_telefone}
              onChange={(e) => handleInputChange('contato_telefone', e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
