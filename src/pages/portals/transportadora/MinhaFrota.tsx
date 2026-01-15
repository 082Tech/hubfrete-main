import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Truck,
  Plus,
  Search,
  Loader2,
  Shield,
  Gauge,
  User,
  Weight,
  Boxes,
  MoreVertical,
  Edit,
  Trash2,
  Camera,
  Upload,
  Image,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  carroceria: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  renavam: string | null;
  ativo: boolean;
  seguro_ativo: boolean;
  rastreador: boolean;
  foto_url: string | null;
  motorista: {
    id: string;
    nome_completo: string;
    foto_url: string | null;
  } | null;
}

const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck',
  toco: 'Toco',
  tres_quartos: '3/4',
  vuc: 'VUC',
  carreta: 'Carreta',
  carreta_ls: 'Carreta LS',
  bitrem: 'Bitrem',
  rodotrem: 'Rodotrem',
  vanderleia: 'Vanderleia',
};

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta',
  fechada_bau: 'Baú',
  graneleira: 'Graneleira',
  tanque: 'Tanque',
  sider: 'Sider',
  frigorifico: 'Frigorífico',
  cegonha: 'Cegonha',
  prancha: 'Prancha',
  container: 'Container',
};

export default function MinhaFrota() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  const [newVeiculo, setNewVeiculo] = useState({
    placa: '',
    tipo: '',
    carroceria: '',
    marca: '',
    modelo: '',
    ano: '',
    capacidade_kg: '',
    capacidade_m3: '',
    renavam: '',
  });

  // Fetch veículos
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ['veiculos_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          id,
          placa,
          tipo,
          carroceria,
          marca,
          modelo,
          ano,
          capacidade_kg,
          capacidade_m3,
          renavam,
          ativo,
          seguro_ativo,
          rastreador,
          foto_url,
          motorista:motoristas(id, nome_completo, foto_url)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Veiculo[];
    },
    enabled: !!empresa?.id,
  });

  // Handle photo selection for new vehicle
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo upload for existing vehicle
  const handleVehiclePhotoUpload = async (veiculoId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingPhoto(veiculoId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${veiculoId}-${Date.now()}.${fileExt}`;
      const filePath = `veiculos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(filePath);

      // Update vehicle record
      const { error: updateError } = await supabase
        .from('veiculos')
        .update({ foto_url: urlData.publicUrl })
        .eq('id', veiculoId);

      if (updateError) throw updateError;

      toast.success('Foto do veículo atualizada!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploadingPhoto(null);
    }
  };

  // Mutation para criar veículo
  const createVeiculo = useMutation({
    mutationFn: async (data: typeof newVeiculo) => {
      let fotoUrl: string | null = null;

      // Upload photo if selected
      if (selectedPhoto) {
        const fileExt = selectedPhoto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `veiculos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('notas-fiscais')
          .upload(filePath, selectedPhoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('notas-fiscais')
          .getPublicUrl(filePath);

        fotoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('veiculos').insert({
        placa: data.placa.toUpperCase(),
        tipo: data.tipo as any,
        carroceria: data.carroceria as any,
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ? parseInt(data.ano) : null,
        capacidade_kg: data.capacidade_kg ? parseFloat(data.capacidade_kg) : null,
        capacidade_m3: data.capacidade_m3 ? parseFloat(data.capacidade_m3) : null,
        renavam: data.renavam || null,
        empresa_id: empresa?.id,
        ativo: true,
        foto_url: fotoUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Veículo cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
      setIsDialogOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setNewVeiculo({
        placa: '',
        tipo: '',
        carroceria: '',
        marca: '',
        modelo: '',
        ano: '',
        capacidade_kg: '',
        capacidade_m3: '',
        renavam: '',
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar veículo:', error);
      toast.error('Erro ao cadastrar veículo');
    },
  });

  // Mutation para deletar veículo
  const deleteVeiculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('veiculos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Veículo removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
    },
    onError: (error) => {
      console.error('Erro ao remover veículo:', error);
      toast.error('Erro ao remover veículo');
    },
  });

  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(
      (v) =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [veiculos, searchTerm]);

  const stats = useMemo(() => {
    const ativos = veiculos.filter((v) => v.ativo).length;
    const comSeguro = veiculos.filter((v) => v.seguro_ativo).length;
    const comRastreador = veiculos.filter((v) => v.rastreador).length;
    return { total: veiculos.length, ativos, comSeguro, comRastreador };
  }, [veiculos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVeiculo.placa || !newVeiculo.tipo || !newVeiculo.carroceria) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createVeiculo.mutate(newVeiculo);
  };

  const getDriverInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minha Frota</h1>
            <p className="text-muted-foreground">
              Gerencie os veículos da sua transportadora
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSelectedPhoto(null);
              setPhotoPreview(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Veículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Veículo</DialogTitle>
                <DialogDescription>
                  Adicione um novo veículo à sua frota
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo Upload Section */}
                <div className="space-y-2">
                  <Label>Foto do Veículo</Label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative w-32 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden bg-muted/50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Camera className="w-6 h-6 mb-1" />
                          <span className="text-xs">Adicionar foto</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>Clique para adicionar uma foto do veículo</p>
                      <p className="text-xs">PNG, JPG até 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Placa *</Label>
                    <Input
                      placeholder="ABC-1234"
                      value={newVeiculo.placa}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, placa: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Renavam</Label>
                    <Input
                      placeholder="00000000000"
                      value={newVeiculo.renavam}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, renavam: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Veículo *</Label>
                    <Select
                      value={newVeiculo.tipo}
                      onValueChange={(v) =>
                        setNewVeiculo({ ...newVeiculo, tipo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoVeiculoLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Carroceria *</Label>
                    <Select
                      value={newVeiculo.carroceria}
                      onValueChange={(v) =>
                        setNewVeiculo({ ...newVeiculo, carroceria: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoCarroceriaLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input
                      placeholder="Ex: Volvo"
                      value={newVeiculo.marca}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, marca: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      placeholder="Ex: FH 540"
                      value={newVeiculo.modelo}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, modelo: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={newVeiculo.ano}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, ano: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidade (kg)</Label>
                    <Input
                      type="number"
                      placeholder="30000"
                      value={newVeiculo.capacidade_kg}
                      onChange={(e) =>
                        setNewVeiculo({
                          ...newVeiculo,
                          capacidade_kg: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (m³)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={newVeiculo.capacidade_m3}
                      onChange={(e) =>
                        setNewVeiculo({
                          ...newVeiculo,
                          capacidade_m3: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createVeiculo.isPending}>
                    {createVeiculo.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Cadastrar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-xl">
                <Gauge className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ativos}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-1/10 rounded-xl">
                <Shield className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.comSeguro}
                </p>
                <p className="text-sm text-muted-foreground">Com Seguro</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-4/10 rounded-xl">
                <Gauge className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.comRastreador}
                </p>
                <p className="text-sm text-muted-foreground">Rastreador</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, motorista, marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Veículos List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredVeiculos.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum veículo encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Nenhum veículo corresponde à busca.'
                  : 'Adicione veículos à sua frota.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Veículo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVeiculos.map((veiculo) => (
              <Card
                key={veiculo.id}
                className={`border-border transition-all overflow-hidden ${
                  !veiculo.ativo ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                {/* Vehicle Photo Section */}
                <div 
                  className="relative h-40 bg-muted/50 group cursor-pointer"
                  onClick={() => cardFileInputRefs.current[veiculo.id]?.click()}
                >
                  {uploadingPhoto === veiculo.id ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : veiculo.foto_url ? (
                    <>
                      <img 
                        src={veiculo.foto_url} 
                        alt={`${veiculo.marca} ${veiculo.modelo}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-sm flex items-center gap-2">
                          <Camera className="w-5 h-5" />
                          Alterar foto
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground group-hover:text-primary transition-colors">
                      <Image className="w-10 h-10 mb-2" />
                      <span className="text-sm">Adicionar foto do veículo</span>
                      <span className="text-xs">Clique para fazer upload</span>
                    </div>
                  )}
                  <input
                    ref={(el) => cardFileInputRefs.current[veiculo.id] = el}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVehiclePhotoUpload(veiculo.id, file);
                    }}
                    className="hidden"
                  />
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {veiculo.placa}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => cardFileInputRefs.current[veiculo.id]?.click()}>
                          <Upload className="w-4 h-4 mr-2" />
                          {veiculo.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteVeiculo.mutate(veiculo.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}
                    </Badge>
                    <Badge variant="outline">
                      {tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}
                    </Badge>
                    {veiculo.ativo ? (
                      <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Inativo</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {veiculo.capacidade_kg && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Weight className="w-4 h-4" />
                        {veiculo.capacidade_kg.toLocaleString('pt-BR')} kg
                      </div>
                    )}
                    {veiculo.capacidade_m3 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Boxes className="w-4 h-4" />
                        {veiculo.capacidade_m3} m³
                      </div>
                    )}
                  </div>

                  {veiculo.motorista && (
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={veiculo.motorista.foto_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getDriverInitials(veiculo.motorista.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {veiculo.motorista.nome_completo}
                        </p>
                        <p className="text-xs text-muted-foreground">Motorista</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {veiculo.seguro_ativo && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="w-3 h-3" />
                        Seguro
                      </Badge>
                    )}
                    {veiculo.rastreador && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Gauge className="w-3 h-3" />
                        Rastreador
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
