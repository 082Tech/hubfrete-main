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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Container,
  Car,
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

interface Carroceria {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  renavam: string | null;
  ativo: boolean;
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
  bitruck: 'Bitruck',
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
  graneleiro: 'Graneleiro',
  grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba',
  plataforma: 'Plataforma',
  bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico',
  bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo',
  gaiola: 'Gaiola',
  bug_porta_container: 'Bug Porta Container',
  munk: 'Munk',
  apenas_cavalo: 'Apenas Cavalo',
  cavaqueira: 'Cavaqueira',
  hopper: 'Hopper',
};

export default function MinhaFrota() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'veiculos' | 'carrocerias'>('veiculos');
  const [isVeiculoDialogOpen, setIsVeiculoDialogOpen] = useState(false);
  const [isCarroceriaDialogOpen, setIsCarroceriaDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  const [newVeiculo, setNewVeiculo] = useState({
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    ano: '',
    renavam: '',
  });

  const [newCarroceria, setNewCarroceria] = useState({
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    ano: '',
    renavam: '',
    capacidade_kg: '',
    capacidade_m3: '',
  });

  // Fetch veículos
  const { data: veiculos = [], isLoading: isLoadingVeiculos } = useQuery({
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

  // Fetch carrocerias
  const { data: carrocerias = [], isLoading: isLoadingCarrocerias } = useQuery({
    queryKey: ['carrocerias_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('carrocerias')
        .select(`
          id,
          placa,
          tipo,
          marca,
          modelo,
          ano,
          capacidade_kg,
          capacidade_m3,
          renavam,
          ativo,
          foto_url,
          motorista:motoristas(id, nome_completo, foto_url)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Carroceria[];
    },
    enabled: !!empresa?.id,
  });

  // Handle photo selection for new vehicle/carroceria
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

      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(filePath);

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

  // Handle photo upload for existing carroceria
  const handleCarroceriaPhotoUpload = async (carroceriaId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingPhoto(carroceriaId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${carroceriaId}-${Date.now()}.${fileExt}`;
      const filePath = `carrocerias/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('carrocerias')
        .update({ foto_url: urlData.publicUrl })
        .eq('id', carroceriaId);

      if (updateError) throw updateError;

      toast.success('Foto da carroceria atualizada!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
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
        carroceria: 'apenas_cavalo' as any, // Veículos agora são apenas cavalos
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ? parseInt(data.ano) : null,
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
      setIsVeiculoDialogOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setNewVeiculo({
        placa: '',
        tipo: '',
        marca: '',
        modelo: '',
        ano: '',
        renavam: '',
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar veículo:', error);
      toast.error('Erro ao cadastrar veículo');
    },
  });

  // Mutation para criar carroceria
  const createCarroceria = useMutation({
    mutationFn: async (data: typeof newCarroceria) => {
      let fotoUrl: string | null = null;

      if (selectedPhoto) {
        const fileExt = selectedPhoto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `carrocerias/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('notas-fiscais')
          .upload(filePath, selectedPhoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('notas-fiscais')
          .getPublicUrl(filePath);

        fotoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('carrocerias').insert({
        placa: data.placa.toUpperCase(),
        tipo: data.tipo,
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ? parseInt(data.ano) : null,
        renavam: data.renavam || null,
        capacidade_kg: data.capacidade_kg ? parseFloat(data.capacidade_kg) : null,
        capacidade_m3: data.capacidade_m3 ? parseFloat(data.capacidade_m3) : null,
        empresa_id: empresa?.id,
        ativo: true,
        foto_url: fotoUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Carroceria cadastrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
      setIsCarroceriaDialogOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setNewCarroceria({
        placa: '',
        tipo: '',
        marca: '',
        modelo: '',
        ano: '',
        renavam: '',
        capacidade_kg: '',
        capacidade_m3: '',
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar carroceria:', error);
      toast.error('Erro ao cadastrar carroceria');
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

  // Mutation para deletar carroceria
  const deleteCarroceria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('carrocerias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Carroceria removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
    },
    onError: (error) => {
      console.error('Erro ao remover carroceria:', error);
      toast.error('Erro ao remover carroceria');
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

  const filteredCarrocerias = useMemo(() => {
    return carrocerias.filter(
      (c) =>
        c.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [carrocerias, searchTerm]);

  const veiculoStats = useMemo(() => {
    const ativos = veiculos.filter((v) => v.ativo).length;
    const comSeguro = veiculos.filter((v) => v.seguro_ativo).length;
    const comRastreador = veiculos.filter((v) => v.rastreador).length;
    return { total: veiculos.length, ativos, comSeguro, comRastreador };
  }, [veiculos]);

  const carroceriaStats = useMemo(() => {
    const ativos = carrocerias.filter((c) => c.ativo).length;
    return { total: carrocerias.length, ativos };
  }, [carrocerias]);

  const handleVeiculoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVeiculo.placa || !newVeiculo.tipo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createVeiculo.mutate(newVeiculo);
  };

  const handleCarroceriaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarroceria.placa || !newCarroceria.tipo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createCarroceria.mutate(newCarroceria);
  };

  const getDriverInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isLoading = activeTab === 'veiculos' ? isLoadingVeiculos : isLoadingCarrocerias;

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minha Frota</h1>
            <p className="text-muted-foreground">
              Gerencie veículos e carrocerias da sua transportadora
            </p>
          </div>
          <div className="flex gap-2">
            {/* Dialog Novo Veículo */}
            <Dialog open={isVeiculoDialogOpen} onOpenChange={(open) => {
              setIsVeiculoDialogOpen(open);
              if (!open) {
                setSelectedPhoto(null);
                setPhotoPreview(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" variant="outline">
                  <Car className="w-4 h-4" />
                  Novo Veículo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Cadastrar Veículo (Cavalo)
                  </DialogTitle>
                  <DialogDescription>
                    Adicione um novo veículo trator à sua frota
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleVeiculoSubmit} className="space-y-4">
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

                  <div className="space-y-2">
                    <Label>Tipo de Veículo *</Label>
                    <Select
                      value={newVeiculo.tipo}
                      onValueChange={(v) =>
                        setNewVeiculo({ ...newVeiculo, tipo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
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

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsVeiculoDialogOpen(false)}
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

            {/* Dialog Nova Carroceria */}
            <Dialog open={isCarroceriaDialogOpen} onOpenChange={(open) => {
              setIsCarroceriaDialogOpen(open);
              if (!open) {
                setSelectedPhoto(null);
                setPhotoPreview(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Container className="w-4 h-4" />
                  Nova Carroceria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Container className="w-5 h-5" />
                    Cadastrar Carroceria (Implemento)
                  </DialogTitle>
                  <DialogDescription>
                    Adicione uma nova carroceria/implemento à sua frota
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCarroceriaSubmit} className="space-y-4">
                  {/* Photo Upload Section */}
                  <div className="space-y-2">
                    <Label>Foto da Carroceria</Label>
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
                        <p>Clique para adicionar uma foto da carroceria</p>
                        <p className="text-xs">PNG, JPG até 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Placa *</Label>
                      <Input
                        placeholder="ABC-1234"
                        value={newCarroceria.placa}
                        onChange={(e) =>
                          setNewCarroceria({ ...newCarroceria, placa: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Renavam</Label>
                      <Input
                        placeholder="00000000000"
                        value={newCarroceria.renavam}
                        onChange={(e) =>
                          setNewCarroceria({ ...newCarroceria, renavam: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Carroceria *</Label>
                    <Select
                      value={newCarroceria.tipo}
                      onValueChange={(v) =>
                        setNewCarroceria({ ...newCarroceria, tipo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoCarroceriaLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Input
                        placeholder="Ex: Randon"
                        value={newCarroceria.marca}
                        onChange={(e) =>
                          setNewCarroceria({ ...newCarroceria, marca: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Input
                        placeholder="Ex: SR GR"
                        value={newCarroceria.modelo}
                        onChange={(e) =>
                          setNewCarroceria({ ...newCarroceria, modelo: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Input
                        type="number"
                        placeholder="2024"
                        value={newCarroceria.ano}
                        onChange={(e) =>
                          setNewCarroceria({ ...newCarroceria, ano: e.target.value })
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
                        value={newCarroceria.capacidade_kg}
                        onChange={(e) =>
                          setNewCarroceria({
                            ...newCarroceria,
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
                        value={newCarroceria.capacidade_m3}
                        onChange={(e) =>
                          setNewCarroceria({
                            ...newCarroceria,
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
                      onClick={() => setIsCarroceriaDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createCarroceria.isPending}>
                      {createCarroceria.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Cadastrar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'veiculos' | 'carrocerias')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="veiculos" className="gap-2">
              <Car className="w-4 h-4" />
              Veículos ({veiculos.length})
            </TabsTrigger>
            <TabsTrigger value="carrocerias" className="gap-2">
              <Container className="w-4 h-4" />
              Carrocerias ({carrocerias.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="veiculos" className="space-y-6 mt-6">
            {/* Veículos Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Car className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{veiculoStats.total}</p>
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
                    <p className="text-2xl font-bold text-foreground">{veiculoStats.ativos}</p>
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
                    <p className="text-2xl font-bold text-foreground">{veiculoStats.comSeguro}</p>
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
                    <p className="text-2xl font-bold text-foreground">{veiculoStats.comRastreador}</p>
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
            {isLoadingVeiculos ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVeiculos.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-12 text-center">
                  <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum veículo encontrado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm
                      ? 'Nenhum veículo corresponde à busca.'
                      : 'Adicione veículos à sua frota.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsVeiculoDialogOpen(true)} className="gap-2">
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
                        {veiculo.ativo ? (
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inativo</Badge>
                        )}
                      </div>

                      {/* Carroceria atrelada ao veículo (mesmo motorista_id) */}
                      {(() => {
                        const carroceriaAtrelada = carrocerias.find(
                          (c) => c.motorista?.id === veiculo.motorista?.id && veiculo.motorista?.id
                        );
                        return carroceriaAtrelada ? (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                            <Container className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {carroceriaAtrelada.placa}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tipoCarroceriaLabels[carroceriaAtrelada.tipo] || carroceriaAtrelada.tipo} 
                                {carroceriaAtrelada.capacidade_kg && ` • ${(carroceriaAtrelada.capacidade_kg / 1000).toLocaleString('pt-BR')}t`}
                              </p>
                            </div>
                          </div>
                        ) : veiculo.motorista ? (
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-dashed border-border">
                            <Container className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">Sem carroceria atrelada</p>
                          </div>
                        ) : null;
                      })()}

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
          </TabsContent>

          <TabsContent value="carrocerias" className="space-y-6 mt-6">
            {/* Carrocerias Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Container className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{carroceriaStats.total}</p>
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
                    <p className="text-2xl font-bold text-foreground">{carroceriaStats.ativos}</p>
                    <p className="text-sm text-muted-foreground">Ativas</p>
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

            {/* Carrocerias List */}
            {isLoadingCarrocerias ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCarrocerias.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-12 text-center">
                  <Container className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma carroceria encontrada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm
                      ? 'Nenhuma carroceria corresponde à busca.'
                      : 'Adicione carrocerias à sua frota.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCarroceriaDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nova Carroceria
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCarrocerias.map((carroceria) => (
                  <Card
                    key={carroceria.id}
                    className={`border-border transition-all overflow-hidden ${
                      !carroceria.ativo ? 'opacity-60' : 'hover:shadow-md'
                    }`}
                  >
                    {/* Carroceria Photo Section */}
                    <div 
                      className="relative h-40 bg-muted/50 group cursor-pointer"
                      onClick={() => cardFileInputRefs.current[carroceria.id]?.click()}
                    >
                      {uploadingPhoto === carroceria.id ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : carroceria.foto_url ? (
                        <>
                          <img 
                            src={carroceria.foto_url} 
                            alt={`${carroceria.marca} ${carroceria.modelo}`}
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
                          <span className="text-sm">Adicionar foto da carroceria</span>
                          <span className="text-xs">Clique para fazer upload</span>
                        </div>
                      )}
                      <input
                        ref={(el) => cardFileInputRefs.current[carroceria.id] = el}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCarroceriaPhotoUpload(carroceria.id, file);
                        }}
                        className="hidden"
                      />
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">
                            {carroceria.placa}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {carroceria.marca} {carroceria.modelo} {carroceria.ano && `(${carroceria.ano})`}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => cardFileInputRefs.current[carroceria.id]?.click()}>
                              <Upload className="w-4 h-4 mr-2" />
                              {carroceria.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteCarroceria.mutate(carroceria.id)}
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
                          {tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}
                        </Badge>
                        {carroceria.ativo ? (
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inativa</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {carroceria.capacidade_kg && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Weight className="w-4 h-4" />
                            {carroceria.capacidade_kg.toLocaleString('pt-BR')} kg
                          </div>
                        )}
                        {carroceria.capacidade_m3 && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Boxes className="w-4 h-4" />
                            {carroceria.capacidade_m3} m³
                          </div>
                        )}
                      </div>

                      {/* Veículo atrelado à carroceria (mesmo motorista_id) */}
                      {(() => {
                        const veiculoAtrelado = veiculos.find(
                          (v) => v.motorista?.id === carroceria.motorista?.id && carroceria.motorista?.id
                        );
                        return veiculoAtrelado ? (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                            <Car className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {veiculoAtrelado.placa}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tipoVeiculoLabels[veiculoAtrelado.tipo] || veiculoAtrelado.tipo}
                                {veiculoAtrelado.marca && ` • ${veiculoAtrelado.marca}`}
                              </p>
                            </div>
                          </div>
                        ) : carroceria.motorista ? (
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-dashed border-border">
                            <Car className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">Sem veículo atrelado</p>
                          </div>
                        ) : null;
                      })()}

                      {carroceria.motorista && (
                        <div className="flex items-center gap-3 pt-3 border-t border-border">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={carroceria.motorista.foto_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getDriverInitials(carroceria.motorista.nome_completo)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {carroceria.motorista.nome_completo}
                            </p>
                            <p className="text-xs text-muted-foreground">Motorista</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
