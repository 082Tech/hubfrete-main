import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Pencil, X, Check, Loader2 } from 'lucide-react';
import { useUserContext, type Filial } from '@/hooks/useUserContext';
import { supabase } from '@/integrations/supabase/client';
import type { LocationData } from '@/components/maps/LocationPickerMap';

interface FilialCompleta extends Filial {
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  responsavel?: string | null;
}

interface OrigemSectionProps {
  initialData?: Partial<LocationData>;
  onLocationChange: (data: LocationData) => void;
}

export function OrigemSection({ initialData, onLocationChange }: OrigemSectionProps) {
  const { filialAtiva } = useUserContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filialData, setFilialData] = useState<FilialCompleta | null>(null);
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

  // Load full filial data and geocode
  useEffect(() => {
    const loadFilialData = async () => {
      if (!filialAtiva?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('filiais')
          .select('*')
          .eq('id', filialAtiva.id)
          .single();

        if (!error && data) {
          setFilialData(data as FilialCompleta);
          
          // Build address for geocoding
          const addressParts = [
            data.endereco,
            data.cidade,
            data.estado,
            'Brasil'
          ].filter(Boolean);
          
          const addressQuery = addressParts.join(', ');
          
          let lat = 0, lng = 0;
          
          if (addressQuery && data.cidade) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`,
                { headers: { 'User-Agent': 'HubFrete/1.0' } }
              );
              const results = await response.json();
              
              if (results.length > 0) {
                lat = parseFloat(results[0].lat);
                lng = parseFloat(results[0].lon);
              }
            } catch (err) {
              console.error('Geocoding error:', err);
            }
          }

          // Build the location data with all fields filled
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
        }
      } catch (err) {
        console.error('Error loading filial:', err);
      } finally {
        setIsLoading(false);
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

  const handleSaveEdit = async () => {
    // Re-geocode if address changed
    const addressParts = [
      formData.logradouro,
      formData.numero,
      formData.bairro,
      formData.cidade,
      formData.estado,
      'Brasil'
    ].filter(Boolean);
    
    const addressQuery = addressParts.join(', ');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`,
        { headers: { 'User-Agent': 'HubFrete/1.0' } }
      );
      const results = await response.json();
      
      if (results.length > 0) {
        const newData = {
          ...formData,
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon),
        };
        setFormData(newData);
        onLocationChange(newData);
      } else {
        onLocationChange(formData);
      }
    } catch {
      onLocationChange(formData);
    }
    
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset to original filial data
    if (filialData) {
      const resetData: LocationData = {
        latitude: formData.latitude,
        longitude: formData.longitude,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando dados da filial...</span>
      </div>
    );
  }

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

      {/* Address Fields - Always filled, disabled unless editing */}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">CEP</Label>
            <Input 
              value={formData.cep}
              onChange={(e) => handleInputChange('cep', e.target.value)}
              placeholder="00000-000"
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
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
              className={!isEditing ? 'bg-muted' : ''}
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
            className={!isEditing ? 'bg-muted' : ''}
          />
        </div>

        <div>
          <Label className="text-sm">Bairro</Label>
          <Input 
            value={formData.bairro}
            onChange={(e) => handleInputChange('bairro', e.target.value)}
            placeholder="Centro"
            disabled={!isEditing}
            className={!isEditing ? 'bg-muted' : ''}
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
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>
          <div>
            <Label className="text-sm">Número</Label>
            <Input 
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              placeholder="123"
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
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
            className={!isEditing ? 'bg-muted' : ''}
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
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>
          <div>
            <Label className="text-sm">Telefone</Label>
            <Input 
              value={formData.contato_telefone}
              onChange={(e) => handleInputChange('contato_telefone', e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
