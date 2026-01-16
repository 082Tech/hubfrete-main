import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Building2, BookmarkPlus, Users, Home, Factory } from 'lucide-react';
import { useCnpjLookup } from '@/hooks/useCnpjLookup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext, type Filial } from '@/hooks/useUserContext';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilialCompleta extends Filial {
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  responsavel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_matriz?: boolean | null;
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
  dialogOpen?: boolean;
}

export function DestinoSection({ initialData, onLocationChange, dialogOpen = true }: DestinoSectionProps) {
  if (import.meta.env.DEV) console.count('render: DestinoSection');

  const { empresa } = useUserContext();
  const [sourceType, setSourceType] = useState<'filial' | 'cnpj'>('cnpj');
  const [selectedFilialId, setSelectedFilialId] = useState<string>('');
  const [cnpjInput, setCnpjInput] = useState('');
  const [contatos, setContatos] = useState<ContatoDestino[]>([]);
  const [savingContato, setSavingContato] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filiaisCompletas, setFiliaisCompletas] = useState<FilialCompleta[]>([]);
  
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

  const { lookup: lookupCnpj, isLoading: isCnpjLoading } = useCnpjLookup();

  // Fetch filiais when empresa changes
  useEffect(() => {
    const fetchFiliais = async () => {
      if (!empresa?.id) return;
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('ativa', true)
        .order('nome');
      
      if (!error && data) {
        setFiliaisCompletas(data as FilialCompleta[]);
      }
    };
    fetchFiliais();
  }, [empresa?.id]);

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

  const geocodeAddress = async (logradouro: string, numero: string, cidade: string, estado: string): Promise<{lat: number, lng: number}> => {
    const queries = [
      `${logradouro}, ${numero}, ${cidade}, ${estado}, Brasil`,
      `${logradouro}, ${cidade}, ${estado}, Brasil`,
      `${cidade}, ${estado}, Brasil`,
    ];

    for (const query of queries) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
          { headers: { 'User-Agent': 'HubFrete/1.0' } }
        );
        const results = await response.json();
        
        if (results.length > 0) {
          console.log('Geocoded:', query, results[0].lat, results[0].lon);
          return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        }
      } catch (err) {
        console.error('Geocoding error for query:', query, err);
      }
    }
    return { lat: 0, lng: 0 };
  };

  // Load filial data when selected
  const loadFilialData = async (filialId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('id', parseInt(filialId))
        .single();

      if (!error && data) {
        const filialData = data as FilialCompleta;
        
        let lat = filialData.latitude ? Number(filialData.latitude) : 0;
        let lng = filialData.longitude ? Number(filialData.longitude) : 0;
        
        // Geocode if no coords
        if ((lat === 0 || lng === 0) && filialData.cidade) {
          const coords = await geocodeAddress(
            filialData.endereco || '',
            '',
            filialData.cidade,
            filialData.estado || ''
          );
          lat = coords.lat;
          lng = coords.lng;
        }

        const newData: LocationData = {
          latitude: lat,
          longitude: lng,
          cep: filialData.cep || '',
          logradouro: filialData.endereco || '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: filialData.cidade || '',
          estado: filialData.estado || '',
          contato_nome: filialData.responsavel || '',
          contato_telefone: filialData.telefone || '',
          cnpj: filialData.cnpj || '',
          razao_social: filialData.nome || empresa?.nome || '',
        };

        setFormData(newData);
        onLocationChange(newData);
        toast.success(`Filial "${filialData.nome}" selecionada como destinatário`);
      }
    } catch (err) {
      console.error('Error loading filial:', err);
      toast.error('Erro ao carregar dados da filial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilialSelect = (filialId: string) => {
    setSelectedFilialId(filialId);
    loadFilialData(filialId);
  };

  const handleCnpjSearch = async () => {
    if (!cnpjInput) {
      toast.error('Digite um CNPJ');
      return;
    }

    const data = await lookupCnpj(cnpjInput);
    if (data) {
      const { lat, lng } = await geocodeAddress(data.logradouro, data.numero, data.municipio, data.uf);

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
      
      if (lat === 0 && lng === 0) {
        toast.warning(`Dados carregados, mas não foi possível geocodificar o endereço`);
      } else {
        toast.success(`Dados da empresa "${data.nome_fantasia || data.razao_social}" carregados`);
      }
    } else {
      toast.error('CNPJ não encontrado');
    }
  };

  const handleSelectContato = async (contatoId: string) => {
    const contato = contatos.find(c => c.id === contatoId);
    if (!contato) return;

    let lat = contato.latitude || 0;
    let lng = contato.longitude || 0;
    
    if (lat === 0 && lng === 0 && contato.cidade && contato.estado) {
      const coords = await geocodeAddress(
        contato.logradouro || '', 
        contato.numero || '', 
        contato.cidade, 
        contato.estado
      );
      lat = coords.lat;
      lng = coords.lng;
    }

    const newData: LocationData = {
      latitude: lat,
      longitude: lng,
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

  return (
    <div className="space-y-4">
      {/* Source Type Selection */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-3 block">Origem do Destinatário</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceType === 'filial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSourceType('filial')}
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              Minhas Filiais
            </Button>
            <Button
              type="button"
              variant={sourceType === 'cnpj' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSourceType('cnpj')}
              className="flex-1 gap-2"
            >
              <Factory className="w-4 h-4" />
              Buscar CNPJ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filial Selection */}
      {sourceType === 'filial' && (
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Selecionar Filial como Destinatário
              </Label>
              <Select value={selectedFilialId} onValueChange={handleFilialSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma filial..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-[10000]">
                  {filiaisCompletas.map((filial) => (
                    <SelectItem key={filial.id} value={String(filial.id)}>
                      {filial.nome} {filial.is_matriz ? '(Matriz)' : ''} {filial.cidade ? `- ${filial.cidade}/${filial.estado}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando dados...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CNPJ Search + Saved Contacts */}
      {sourceType === 'cnpj' && (
        <>
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
                        <SelectValue placeholder="Escolha um destinatário salvo..." />
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
        </>
      )}

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