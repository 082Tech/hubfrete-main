import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Building2, BookmarkPlus, Users, Home, Factory, Settings, Pencil, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  
  // Manage contacts dialog state
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ContatoDestino | null>(null);
  const [editingContato, setEditingContato] = useState<ContatoDestino | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContatoDestino>>({});
  
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

  // Delete contact
  const handleDeleteContato = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contatos_destino')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setContatos(prev => prev.filter(c => c.id !== id));
      toast.success('Contato removido com sucesso');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting contact:', err);
      toast.error('Erro ao remover contato');
    }
  };

  // Update contact
  const handleUpdateContato = async () => {
    if (!editingContato) return;
    try {
      const { error } = await supabase
        .from('contatos_destino')
        .update(editForm)
        .eq('id', editingContato.id);
      if (error) throw error;

      // Reload contacts
      const { data: newContatos } = await supabase
        .from('contatos_destino')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('razao_social');

      if (newContatos) {
        setContatos(newContatos as ContatoDestino[]);
      }

      toast.success('Contato atualizado com sucesso');
      setEditingContato(null);
      setEditForm({});
    } catch (err) {
      console.error('Error updating contact:', err);
      toast.error('Erro ao atualizar contato');
    }
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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
                      <SelectValue placeholder={contatos.length > 0 ? "Escolha um destinatário salvo..." : "Nenhum contato salvo"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-[10000]">
                      {contatos.map((contato) => (
                        <SelectItem key={contato.id} value={contato.id}>
                          {contato.nome_fantasia || contato.razao_social} - {contato.cidade}/{contato.estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => window.location.href = '/embarcador/contatos'}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Gerenciar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CNPJ Search */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-sm mb-1.5 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Buscar por CNPJ
                  </Label>
                  <MaskedInput
                    mask="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpjInput}
                    onChange={(value) => setCnpjInput(value)}
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

        <div>
          <Label className="text-sm">Inscrição Estadual (IE)</Label>
          <Input 
            value={(formData as any).inscricao_estadual || ''}
            onChange={(e) => handleInputChange('inscricao_estadual' as any, e.target.value)}
            placeholder="Opcional - IE do destinatário"
          />
        </div>
      </div>

      {/* Manage Contacts Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gerenciar Contatos Salvos
            </DialogTitle>
            <DialogDescription>
              Edite ou remova contatos de remetentes e destinatários
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {contatos.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum contato salvo</h3>
                <p className="text-muted-foreground">
                  Contatos são salvos ao buscar por CNPJ e clicar em "Salvar contato"
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden sm:table-cell">Localização</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contatos.map((contato) => (
                      <TableRow key={contato.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{contato.nome_fantasia || contato.razao_social}</p>
                            <p className="text-xs text-muted-foreground">{formatCNPJ(contato.cnpj)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {contato.cidade ? `${contato.cidade}/${contato.estado}` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingContato(contato);
                                setEditForm({
                                  contato_nome: contato.contato_nome || '',
                                  contato_telefone: contato.contato_telefone || '',
                                  logradouro: contato.logradouro || '',
                                  numero: contato.numero || '',
                                  complemento: contato.complemento || '',
                                  bairro: contato.bairro || '',
                                  cidade: contato.cidade || '',
                                  estado: contato.estado || '',
                                  cep: contato.cep || '',
                                });
                              }}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(contato)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteConfirm?.razao_social}</strong> da sua lista de contatos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteContato(deleteConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContato} onOpenChange={() => setEditingContato(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              {editingContato?.razao_social}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Contato</Label>
                <Input
                  value={editForm.contato_nome || ''}
                  onChange={(e) => setEditForm({ ...editForm, contato_nome: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editForm.contato_telefone || ''}
                  onChange={(e) => setEditForm({ ...editForm, contato_telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={editForm.logradouro || ''}
                  onChange={(e) => setEditForm({ ...editForm, logradouro: e.target.value })}
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input
                  value={editForm.numero || ''}
                  onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bairro</Label>
                <Input
                  value={editForm.bairro || ''}
                  onChange={(e) => setEditForm({ ...editForm, bairro: e.target.value })}
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input
                  value={editForm.complemento || ''}
                  onChange={(e) => setEditForm({ ...editForm, complemento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input
                  value={editForm.cidade || ''}
                  onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={editForm.estado || ''}
                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  value={editForm.cep || ''}
                  onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingContato(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateContato}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}