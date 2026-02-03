
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Separator } from '@/components/ui/separator';
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
  FileText,
  CheckCircle,
  ImageOff,
  LayoutGrid,
  List,
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
import { useViewModePreference } from '@/hooks/useViewModePreference';
import { toast } from 'sonner';
import { VeiculoEditDialog, CarroceriaEditDialog } from '@/components/frota';

const ITEMS_PER_PAGE = 12;

const ESTADOS_BRASIL = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

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
  uf: string | null;
  antt_rntrc: string | null;
  documento_veiculo_url: string | null;
  comprovante_endereco_proprietario_url: string | null;
  proprietario_nome: string | null;
  proprietario_cpf_cnpj: string | null;
  tipo_propriedade: 'pf' | 'pj' | null;
  ativo: boolean;
  seguro_ativo: boolean;
  rastreador: boolean;
  foto_url: string | null;
  carroceria_integrada: boolean;
  motorista: {
    id: string;
    nome_completo: string;
    foto_url: string | null;
  } | null;
}

// Tipos de veículo que tipicamente têm carroceria integrada
const VEICULOS_COM_CARROCERIA_INTEGRADA = ['vuc', 'tres_quartos', 'toco', 'truck', 'bitruck'];

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
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPageVeiculos, setCurrentPageVeiculos] = useState(1);
  const [currentPageCarrocerias, setCurrentPageCarrocerias] = useState(1);
  const [isVeiculoDialogOpen, setIsVeiculoDialogOpen] = useState(false);
  const [isCarroceriaDialogOpen, setIsCarroceriaDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [editingCarroceria, setEditingCarroceria] = useState<Carroceria | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentoInputRef = useRef<HTMLInputElement>(null);
  const enderecoProprietarioInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  const [newVeiculo, setNewVeiculo] = useState({
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    ano: '',
    renavam: '',
    uf: '',
    antt_rntrc: '',
    documento_veiculo_url: null as string | null,
    comprovante_endereco_proprietario_url: null as string | null,
    proprietario_nome: '',
    proprietario_cpf_cnpj: '',
    tipo_propriedade: 'pf' as 'pf' | 'pj',
    carroceria_integrada: false,
    carroceria: 'apenas_cavalo' as string,
    capacidade_kg: '',
    capacidade_m3: '',
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
          uf,
          antt_rntrc,
          documento_veiculo_url,
          comprovante_endereco_proprietario_url,
          proprietario_nome,
          proprietario_cpf_cnpj,
          tipo_propriedade,
          ativo,
          seguro_ativo,
          rastreador,
          foto_url,
          carroceria_integrada,
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
        .from('fotos-frota')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('fotos-frota')
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
        .from('fotos-frota')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('fotos-frota')
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

  // Handle photo removal for vehicle
  const handleRemoveVehiclePhoto = async (veiculoId: string, fotoUrl: string | null) => {
    if (!fotoUrl) return;
    
    try {
      // Extract file path from URL
      const urlParts = fotoUrl.split('/fotos-frota/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('fotos-frota').remove([filePath]);
      }

      const { error } = await supabase
        .from('veiculos')
        .update({ foto_url: null })
        .eq('id', veiculoId);

      if (error) throw error;

      toast.success('Foto removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    }
  };

  // Handle photo removal for carroceria
  const handleRemoveCarroceriaPhoto = async (carroceriaId: string, fotoUrl: string | null) => {
    if (!fotoUrl) return;
    
    try {
      // Extract file path from URL
      const urlParts = fotoUrl.split('/fotos-frota/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('fotos-frota').remove([filePath]);
      }

      const { error } = await supabase
        .from('carrocerias')
        .update({ foto_url: null })
        .eq('id', carroceriaId);

      if (error) throw error;

      toast.success('Foto removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    }
  };

  // Handle document upload for new vehicle
  const handleDocumentUpload = async (
    file: File,
    folder: string,
    fieldName: 'documento_veiculo_url' | 'comprovante_endereco_proprietario_url'
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5MB');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `veiculos/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(filePath);

      setNewVeiculo(prev => ({ ...prev, [fieldName]: urlData.publicUrl }));
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar arquivo');
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
          .from('fotos-frota')
          .upload(filePath, selectedPhoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('fotos-frota')
          .getPublicUrl(filePath);

        fotoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('veiculos').insert({
        placa: data.placa.toUpperCase(),
        tipo: data.tipo as any,
        carroceria: data.carroceria_integrada ? (data.carroceria as any) : ('apenas_cavalo' as any),
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ? parseInt(data.ano) : null,
        renavam: data.renavam || null,
        uf: data.uf || null,
        antt_rntrc: data.antt_rntrc || null,
        documento_veiculo_url: data.documento_veiculo_url,
        comprovante_endereco_proprietario_url: data.comprovante_endereco_proprietario_url,
        proprietario_nome: data.proprietario_nome || null,
        proprietario_cpf_cnpj: data.proprietario_cpf_cnpj || null,
        tipo_propriedade: data.tipo_propriedade as any,
        empresa_id: empresa?.id,
        ativo: true,
        foto_url: fotoUrl,
        carroceria_integrada: data.carroceria_integrada,
        capacidade_kg: data.carroceria_integrada && data.capacidade_kg ? parseFloat(data.capacidade_kg) : null,
        capacidade_m3: data.carroceria_integrada && data.capacidade_m3 ? parseFloat(data.capacidade_m3) : null,
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
        uf: '',
        antt_rntrc: '',
        documento_veiculo_url: null,
        comprovante_endereco_proprietario_url: null,
        proprietario_nome: '',
        proprietario_cpf_cnpj: '',
        tipo_propriedade: 'pf',
        carroceria_integrada: false,
        carroceria: 'apenas_cavalo',
        capacidade_kg: '',
        capacidade_m3: '',
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
          .from('fotos-frota')
          .upload(filePath, selectedPhoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('fotos-frota')
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

  // Reset pages when search changes
  useMemo(() => {
    setCurrentPageVeiculos(1);
    setCurrentPageCarrocerias(1);
  }, [searchTerm]);

  // Pagination for vehicles
  const totalPagesVeiculos = Math.ceil(filteredVeiculos.length / ITEMS_PER_PAGE);
  const paginatedVeiculos = useMemo(() => {
    const start = (currentPageVeiculos - 1) * ITEMS_PER_PAGE;
    return filteredVeiculos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVeiculos, currentPageVeiculos]);

  // Pagination for carrocerias
  const totalPagesCarrocerias = Math.ceil(filteredCarrocerias.length / ITEMS_PER_PAGE);
  const paginatedCarrocerias = useMemo(() => {
    const start = (currentPageCarrocerias - 1) * ITEMS_PER_PAGE;
    return filteredCarrocerias.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCarrocerias, currentPageCarrocerias]);

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
    <div className="p-4 md:p-8">
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
                      <MaskedInput
                        mask="plate"
                        placeholder="ABC-1234"
                        value={newVeiculo.placa}
                        onChange={(value) =>
                          setNewVeiculo({ ...newVeiculo, placa: value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Renavam</Label>
                      <MaskedInput
                        mask="renavam"
                        placeholder="00000000000"
                        value={newVeiculo.renavam}
                        onChange={(value) =>
                          setNewVeiculo({ ...newVeiculo, renavam: value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Veículo *</Label>
                    <Select
                      value={newVeiculo.tipo}
                      onValueChange={(v) => {
                        // Auto-set carroceria_integrada based on vehicle type
                        const hasIntegrated = VEICULOS_COM_CARROCERIA_INTEGRADA.includes(v);
                        setNewVeiculo({ 
                          ...newVeiculo, 
                          tipo: v,
                          carroceria_integrada: hasIntegrated,
                          carroceria: hasIntegrated ? newVeiculo.carroceria : 'apenas_cavalo',
                        });
                      }}
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

                  {/* Carroceria Integrada Switch */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label>Carroceria Integrada</Label>
                      <p className="text-xs text-muted-foreground">
                        Marque se o veículo já possui carroceria própria (ex: Toco, Truck com baú)
                      </p>
                    </div>
                    <Switch
                      checked={newVeiculo.carroceria_integrada}
                      onCheckedChange={(checked) => setNewVeiculo({ 
                        ...newVeiculo, 
                        carroceria_integrada: checked,
                        carroceria: checked ? (newVeiculo.carroceria === 'apenas_cavalo' ? 'fechada_bau' : newVeiculo.carroceria) : 'apenas_cavalo',
                        capacidade_kg: checked ? newVeiculo.capacidade_kg : '',
                        capacidade_m3: checked ? newVeiculo.capacidade_m3 : '',
                      })}
                    />
                  </div>

                  {/* Campos de carroceria integrada */}
                  {newVeiculo.carroceria_integrada && (
                    <>
                      <div className="space-y-2">
                        <Label>Tipo de Carroceria *</Label>
                        <Select
                          value={newVeiculo.carroceria}
                          onValueChange={(v) => setNewVeiculo({ ...newVeiculo, carroceria: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(tipoCarroceriaLabels)
                              .filter(([value]) => value !== 'apenas_cavalo')
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Capacidade (kg) *</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 8000"
                            value={newVeiculo.capacidade_kg}
                            onChange={(e) => setNewVeiculo({ ...newVeiculo, capacidade_kg: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Capacidade (m³)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 45"
                            value={newVeiculo.capacidade_m3}
                            onChange={(e) => setNewVeiculo({ ...newVeiculo, capacidade_m3: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

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

                  <Separator />

                  {/* ANTT e UF */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <FileText className="w-4 h-4" />
                      ANTT e Documentação
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ANTT / RNTRC *</Label>
                        <Input
                          placeholder="Número do RNTRC"
                          value={newVeiculo.antt_rntrc}
                          onChange={(e) =>
                            setNewVeiculo({ ...newVeiculo, antt_rntrc: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UF do Veículo</Label>
                        <Select
                          value={newVeiculo.uf}
                          onValueChange={(v) =>
                            setNewVeiculo({ ...newVeiculo, uf: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BRASIL.map((estado) => (
                              <SelectItem key={estado.value} value={estado.value}>
                                {estado.value} - {estado.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Documento do Veículo (CRLV)</Label>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => documentoInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          {newVeiculo.documento_veiculo_url ? 'Substituir' : 'Enviar Documento'}
                        </Button>
                        {newVeiculo.documento_veiculo_url && (
                          <span className="text-sm text-chart-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Documento enviado
                          </span>
                        )}
                        <input
                          ref={documentoInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload(file, 'documento', 'documento_veiculo_url');
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Proprietário */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <User className="w-4 h-4" />
                      Dados do Proprietário
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Propriedade</Label>
                      <Select
                        value={newVeiculo.tipo_propriedade}
                        onValueChange={(v) =>
                          setNewVeiculo({ ...newVeiculo, tipo_propriedade: v as 'pf' | 'pj' })
                        }
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pf">Pessoa Física</SelectItem>
                          <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Proprietário</Label>
                        <Input
                          placeholder={newVeiculo.tipo_propriedade === 'pj' ? 'Razão Social' : 'Nome completo'}
                          value={newVeiculo.proprietario_nome}
                          onChange={(e) =>
                            setNewVeiculo({ ...newVeiculo, proprietario_nome: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{newVeiculo.tipo_propriedade === 'pj' ? 'CNPJ' : 'CPF'}</Label>
                        <MaskedInput
                          mask={newVeiculo.tipo_propriedade === 'pj' ? 'cnpj' : 'cpf'}
                          placeholder={newVeiculo.tipo_propriedade === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                          value={newVeiculo.proprietario_cpf_cnpj}
                          onChange={(value) =>
                            setNewVeiculo({ ...newVeiculo, proprietario_cpf_cnpj: value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Comprovante de Endereço do Proprietário</Label>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => enderecoProprietarioInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          {newVeiculo.comprovante_endereco_proprietario_url ? 'Substituir' : 'Enviar Comprovante'}
                        </Button>
                        {newVeiculo.comprovante_endereco_proprietario_url && (
                          <span className="text-sm text-chart-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Comprovante enviado
                          </span>
                        )}
                        <input
                          ref={enderecoProprietarioInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload(file, 'proprietario', 'comprovante_endereco_proprietario_url');
                          }}
                        />
                      </div>
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
                      <MaskedInput
                        mask="plate"
                        placeholder="ABC-1234"
                        value={newCarroceria.placa}
                        onChange={(value) =>
                          setNewCarroceria({ ...newCarroceria, placa: value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Renavam</Label>
                      <MaskedInput
                        mask="renavam"
                        placeholder="00000000000"
                        value={newCarroceria.renavam}
                        onChange={(value) =>
                          setNewCarroceria({ ...newCarroceria, renavam: value })
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

            {/* Search + View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, motorista, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
                <ToggleGroupItem value="list" aria-label="Visualização em lista">
                  <List className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Visualização em cards">
                  <LayoutGrid className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
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
            ) : viewMode === 'list' ? (
              /* List View */
              <Card className="border-border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Placa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Carroceria</TableHead>
                        <TableHead>Marca/Modelo</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVeiculos.map((veiculo) => (
                        <TableRow key={veiculo.id} className={!veiculo.ativo ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{veiculo.placa}</TableCell>
                          <TableCell><Badge variant="secondary">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</Badge></TableCell>
                          <TableCell>
                            {veiculo.carroceria_integrada ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20">{tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Apenas Cavalo</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}</TableCell>
                          <TableCell>
                            {veiculo.motorista ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={veiculo.motorista.foto_url || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getDriverInitials(veiculo.motorista.nome_completo)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{veiculo.motorista.nome_completo}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={veiculo.ativo ? 'outline' : 'destructive'} className={veiculo.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
                                {veiculo.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                              {veiculo.seguro_ativo && <Badge variant="outline" className="text-xs"><Shield className="w-3 h-3" /></Badge>}
                              {veiculo.rastreador && <Badge variant="outline" className="text-xs"><Gauge className="w-3 h-3" /></Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingVeiculo(veiculo)}>
                                  <Edit className="w-4 h-4 mr-2" />Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteVeiculo.mutate(veiculo.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              /* Card View - with larger photo */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedVeiculos.map((veiculo) => (
                  <Card
                    key={veiculo.id}
                    className={`border-border transition-all overflow-hidden ${
                      !veiculo.ativo ? 'opacity-60' : 'hover:shadow-md'
                    }`}
                  >
                    {/* Vehicle Photo Section - Larger (aspect-video) */}
                    <div 
                      className="relative aspect-video bg-muted/50 group cursor-pointer"
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
                            {veiculo.foto_url && (
                              <DropdownMenuItem onClick={() => handleRemoveVehiclePhoto(veiculo.id, veiculo.foto_url)}>
                                <ImageOff className="w-4 h-4 mr-2" />
                                Remover Foto
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditingVeiculo(veiculo)}>
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
                        {veiculo.carroceria_integrada ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Apenas Cavalo
                          </Badge>
                        )}
                        {veiculo.ativo ? (
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inativo</Badge>
                        )}
                      </div>

                      {/* Capacidade integrada ou carroceria separada */}
                      {veiculo.carroceria_integrada ? (
                        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                          <Weight className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Carroceria Integrada</p>
                            <p className="text-xs text-muted-foreground">
                              {veiculo.capacidade_kg ? `${(veiculo.capacidade_kg / 1000).toLocaleString('pt-BR')}t` : 'Capacidade não informada'}
                              {veiculo.capacidade_m3 && ` • ${veiculo.capacidade_m3}m³`}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Carroceria atrelada ao veículo (mesmo motorista_id)
                        (() => {
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
                        })()
                      )}

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

            {/* Pagination */}
            {totalPagesVeiculos > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPageVeiculos(p => Math.max(1, p - 1))}
                      className={currentPageVeiculos === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPagesVeiculos }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPageVeiculos === page}
                        onClick={() => setCurrentPageVeiculos(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPageVeiculos(p => Math.min(totalPagesVeiculos, p + 1))}
                      className={currentPageVeiculos === totalPagesVeiculos ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
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

            {/* Search + View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, motorista, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
                <ToggleGroupItem value="list" aria-label="Visualização em lista">
                  <List className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Visualização em cards">
                  <LayoutGrid className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
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
            ) : viewMode === 'list' ? (
              /* List View */
              <Card className="border-border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Placa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Marca/Modelo</TableHead>
                        <TableHead>Capacidade</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCarrocerias.map((carroceria) => {
                        const veiculoAtrelado = veiculos.find(
                          (v) => v.motorista?.id === carroceria.motorista?.id && carroceria.motorista?.id
                        );
                        return (
                          <TableRow key={carroceria.id} className={!carroceria.ativo ? 'opacity-60' : ''}>
                            <TableCell className="font-medium">{carroceria.placa}</TableCell>
                            <TableCell><Badge variant="secondary">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{carroceria.marca} {carroceria.modelo} {carroceria.ano && `(${carroceria.ano})`}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {carroceria.capacidade_kg ? `${(carroceria.capacidade_kg / 1000).toLocaleString('pt-BR')}t` : '-'}
                              {carroceria.capacidade_m3 && ` / ${carroceria.capacidade_m3}m³`}
                            </TableCell>
                            <TableCell>
                              {veiculoAtrelado ? (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Car className="w-3 h-3" />{veiculoAtrelado.placa}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {carroceria.motorista ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={carroceria.motorista.foto_url || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getDriverInitials(carroceria.motorista.nome_completo)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{carroceria.motorista.nome_completo}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={carroceria.ativo ? 'outline' : 'destructive'} className={carroceria.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
                                {carroceria.ativo ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingCarroceria(carroceria)}>
                                    <Edit className="w-4 h-4 mr-2" />Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteCarroceria.mutate(carroceria.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCarrocerias.map((carroceria) => (
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
                            {carroceria.foto_url && (
                              <DropdownMenuItem onClick={() => handleRemoveCarroceriaPhoto(carroceria.id, carroceria.foto_url)}>
                                <ImageOff className="w-4 h-4 mr-2" />
                                Remover Foto
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditingCarroceria(carroceria)}>
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

            {/* Pagination */}
            {totalPagesCarrocerias > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPageCarrocerias(p => Math.max(1, p - 1))}
                      className={currentPageCarrocerias === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPagesCarrocerias }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPageCarrocerias === page}
                        onClick={() => setCurrentPageCarrocerias(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPageCarrocerias(p => Math.min(totalPagesCarrocerias, p + 1))}
                      className={currentPageCarrocerias === totalPagesCarrocerias ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialogs */}
        <VeiculoEditDialog
          veiculo={editingVeiculo}
          open={!!editingVeiculo}
          onOpenChange={(open) => !open && setEditingVeiculo(null)}
        />
        <CarroceriaEditDialog
          carroceria={editingCarroceria}
          open={!!editingCarroceria}
          onOpenChange={(open) => !open && setEditingCarroceria(null)}
        />
      </div>
    </div>
  );
}
