import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Progress } from '@/components/ui/progress';
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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
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
import { useViewModePreference } from '@/hooks/useViewModePreference';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';
import { toast } from 'sonner';
import { VeiculoEditDialog, CarroceriaEditDialog, VeiculoDetailDialog, CarroceriaDetailDialog } from '@/components/frota';

const ITEMS_PER_PAGE = 12;

// Column definitions for Veículos table
const veiculoColumns: ColumnDefinition[] = [
  { id: 'placa', label: 'Placa', minWidth: '100px', sticky: 'left', sortable: true, sortKey: 'placa' },
  { id: 'tipo', label: 'Tipo', minWidth: '100px', sortable: true, sortKey: 'tipo' },
  { id: 'carroceria', label: 'Carroceria', minWidth: '120px', sortable: true, sortKey: 'carroceria' },
  { id: 'marca_modelo', label: 'Marca/Modelo', minWidth: '180px', sortable: true, sortKey: 'marca' },
  { id: 'motorista', label: 'Motorista', minWidth: '180px' },
  { id: 'status', label: 'Status', minWidth: '100px', sortable: true, sortKey: 'ativo' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

// Column definitions for Carrocerias table
const carroceriaColumns: ColumnDefinition[] = [
  { id: 'placa', label: 'Placa', minWidth: '100px', sticky: 'left', sortable: true, sortKey: 'placa' },
  { id: 'tipo', label: 'Tipo', minWidth: '100px', sortable: true, sortKey: 'tipo' },
  { id: 'marca_modelo', label: 'Marca/Modelo', minWidth: '180px', sortable: true, sortKey: 'marca' },
  { id: 'capacidade', label: 'Capacidade', minWidth: '120px', sortable: true, sortKey: 'capacidade_kg' },
  { id: 'veiculo', label: 'Veículo', minWidth: '100px' },
  { id: 'motorista', label: 'Motorista', minWidth: '180px' },
  { id: 'status', label: 'Status', minWidth: '80px', sortable: true, sortKey: 'ativo' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

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
  veiculo_id: string | null;
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
  const [viewingVeiculo, setViewingVeiculo] = useState<Veiculo | null>(null);
  const [viewingCarroceria, setViewingCarroceria] = useState<Carroceria | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentoInputRef = useRef<HTMLInputElement>(null);
  const enderecoProprietarioInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Height is now managed by CSS flexbox (flex-1 min-h-0) instead of JS calculation

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

  // Fetch active viagens (to know which vehicles/carrocerias are on trips)
  const { data: viagensAtivas = [] } = useQuery({
    queryKey: ['viagens_ativas_frota', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('viagens')
        .select('id, codigo, status, veiculo_id, carroceria_id')
        .in('status', ['aguardando', 'programada', 'em_andamento']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch peso alocado from entregas for active viagens
  const { data: entregasAlocadas = [] } = useQuery({
    queryKey: ['entregas_alocadas_frota', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('entregas')
        .select('id, veiculo_id, carroceria_id, peso_alocado_kg, carrocerias_alocadas, status')
        .not('status', 'in', '("entregue","cancelada")')
        .not('veiculo_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Build lookup maps for trip status and weight usage
  const veiculoTripMap = useMemo(() => {
    const map: Record<string, { codigo: string; status: string }> = {};
    viagensAtivas.forEach((v) => {
      if (v.veiculo_id) map[v.veiculo_id] = { codigo: v.codigo, status: v.status };
    });
    return map;
  }, [viagensAtivas]);

  const carroceriaTripMap = useMemo(() => {
    const map: Record<string, { codigo: string; status: string }> = {};
    viagensAtivas.forEach((v) => {
      if (v.carroceria_id) map[v.carroceria_id] = { codigo: v.codigo, status: v.status };
    });
    return map;
  }, [viagensAtivas]);

  // Calculate peso alocado per veículo (for integrated bodywork) and per carroceria
  const pesoAlocadoPorVeiculo = useMemo(() => {
    const map: Record<string, number> = {};
    entregasAlocadas.forEach((e) => {
      if (e.veiculo_id && e.peso_alocado_kg) {
        map[e.veiculo_id] = (map[e.veiculo_id] || 0) + e.peso_alocado_kg;
      }
    });
    return map;
  }, [entregasAlocadas]);

  const pesoAlocadoPorCarroceria = useMemo(() => {
    const map: Record<string, number> = {};
    entregasAlocadas.forEach((e) => {
      // Check carrocerias_alocadas JSON for detailed per-carroceria weights
      if (e.carrocerias_alocadas && Array.isArray(e.carrocerias_alocadas)) {
        (e.carrocerias_alocadas as Array<{ carroceria_id: string; peso_kg: number }>).forEach((ca) => {
          if (ca.carroceria_id && ca.peso_kg) {
            map[ca.carroceria_id] = (map[ca.carroceria_id] || 0) + ca.peso_kg;
          }
        });
      } else if (e.carroceria_id && e.peso_alocado_kg) {
        map[e.carroceria_id] = (map[e.carroceria_id] || 0) + e.peso_alocado_kg;
      }
    });
    return map;
  }, [entregasAlocadas]);

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
        .from('documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos')
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

  // Draggable columns for veículos
  const {
    orderedColumns: orderedVeiculoColumns,
    draggedColumn: draggedVeiculoCol,
    dragOverColumn: dragOverVeiculoCol,
    handleDragStart: handleVeiculoDragStart,
    handleDragEnd: handleVeiculoDragEnd,
    handleDragOver: handleVeiculoDragOver,
    handleDragLeave: handleVeiculoDragLeave,
    handleDrop: handleVeiculoDrop,
    resetColumnOrder: resetVeiculoColumnOrder,
  } = useDraggableColumns({ columns: veiculoColumns, persistKey: 'frota-veiculos-columns' });

  // Draggable columns for carrocerias
  const {
    orderedColumns: orderedCarroceriaColumns,
    draggedColumn: draggedCarroceriaCol,
    dragOverColumn: dragOverCarroceriaCol,
    handleDragStart: handleCarroceriaDragStart,
    handleDragEnd: handleCarroceriaDragEnd,
    handleDragOver: handleCarroceriaDragOver,
    handleDragLeave: handleCarroceriaDragLeave,
    handleDrop: handleCarroceriaDrop,
    resetColumnOrder: resetCarroceriaColumnOrder,
  } = useDraggableColumns({ columns: carroceriaColumns, persistKey: 'frota-carrocerias-columns' });

  // Sort functions for veículos
  const veiculoSortFunctions = useMemo(() => ({
    placa: (a: Veiculo, b: Veiculo) => a.placa.localeCompare(b.placa, 'pt-BR'),
    tipo: (a: Veiculo, b: Veiculo) => (tipoVeiculoLabels[a.tipo] || a.tipo).localeCompare(tipoVeiculoLabels[b.tipo] || b.tipo, 'pt-BR'),
    carroceria: (a: Veiculo, b: Veiculo) => (tipoCarroceriaLabels[a.carroceria] || a.carroceria).localeCompare(tipoCarroceriaLabels[b.carroceria] || b.carroceria, 'pt-BR'),
    marca: (a: Veiculo, b: Veiculo) => (a.marca || '').localeCompare(b.marca || '', 'pt-BR'),
    ativo: (a: Veiculo, b: Veiculo) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1),
  }), []);

  const { sortedData: sortedVeiculos, requestSort: requestVeiculoSort, getSortDirection: getVeiculoSortDirection } = useTableSort({
    data: filteredVeiculos,
    defaultSort: { key: 'placa', direction: 'asc' },
    persistKey: 'frota-veiculos',
    sortFunctions: veiculoSortFunctions,
  });

  // Sort functions for carrocerias
  const carroceriaSortFunctions = useMemo(() => ({
    placa: (a: Carroceria, b: Carroceria) => a.placa.localeCompare(b.placa, 'pt-BR'),
    tipo: (a: Carroceria, b: Carroceria) => (tipoCarroceriaLabels[a.tipo] || a.tipo).localeCompare(tipoCarroceriaLabels[b.tipo] || b.tipo, 'pt-BR'),
    marca: (a: Carroceria, b: Carroceria) => (a.marca || '').localeCompare(b.marca || '', 'pt-BR'),
    capacidade_kg: (a: Carroceria, b: Carroceria) => (a.capacidade_kg || 0) - (b.capacidade_kg || 0),
    ativo: (a: Carroceria, b: Carroceria) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1),
  }), []);

  const { sortedData: sortedCarrocerias, requestSort: requestCarroceriaSort, getSortDirection: getCarroceriaSortDirection } = useTableSort({
    data: filteredCarrocerias,
    defaultSort: { key: 'placa', direction: 'asc' },
    persistKey: 'frota-carrocerias',
    sortFunctions: carroceriaSortFunctions,
  });

  // Reset pages when search changes
  useEffect(() => {
    setCurrentPageVeiculos(1);
    setCurrentPageCarrocerias(1);
  }, [searchTerm]);

  // Pagination for vehicles
  const totalPagesVeiculos = Math.ceil(sortedVeiculos.length / ITEMS_PER_PAGE);
  const paginatedVeiculos = useMemo(() => {
    const start = (currentPageVeiculos - 1) * ITEMS_PER_PAGE;
    return sortedVeiculos.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedVeiculos, currentPageVeiculos]);

  // Pagination for carrocerias
  const totalPagesCarrocerias = Math.ceil(sortedCarrocerias.length / ITEMS_PER_PAGE);
  const paginatedCarrocerias = useMemo(() => {
    const start = (currentPageCarrocerias - 1) * ITEMS_PER_PAGE;
    return sortedCarrocerias.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedCarrocerias, currentPageCarrocerias]);

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

  // Render veículo cell based on column ID
  const renderVeiculoCell = (columnId: string, veiculo: Veiculo) => {
    switch (columnId) {
      case 'placa':
        return (
          <td className="p-4 align-middle font-medium sticky left-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                {veiculo.foto_url ? (
                  <img src={veiculo.foto_url} alt={veiculo.placa} className="w-full h-full object-cover" />
                ) : (
                  <Truck className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {veiculo.placa}
            </div>
          </td>
        );
      case 'tipo':
        return (
          <td className="p-4 align-middle"><Badge variant="secondary">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</Badge></td>
        );
      case 'carroceria':
        return (
          <td className="p-4 align-middle">
            {veiculo.carroceria_integrada ? (
              <Badge className="bg-primary/10 text-primary border-primary/20">{tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}</Badge>
            ) : (
              <span className="text-muted-foreground">Apenas Cavalo</span>
            )}
          </td>
        );
      case 'marca_modelo':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">{veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}</td>
        );
      case 'motorista':
        return (
          <td className="p-4 align-middle">
            {veiculo.motorista ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={veiculo.motorista.foto_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getDriverInitials(veiculo.motorista.nome_completo)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-nowrap">{veiculo.motorista.nome_completo}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </td>
        );
      case 'status':
        return (
          <td className="p-4 align-middle">
            <div className="flex gap-1">
              <Badge variant={veiculo.ativo ? 'outline' : 'destructive'} className={veiculo.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
                {veiculo.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {veiculo.seguro_ativo && <Badge variant="outline" className="text-xs"><Shield className="w-3 h-3" /></Badge>}
              {veiculo.rastreador && <Badge variant="outline" className="text-xs"><Gauge className="w-3 h-3" /></Badge>}
            </div>
          </td>
        );
      case 'acoes':
        return (
          <td className="p-4 align-middle sticky right-0 bg-background z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingVeiculo(veiculo)}>
                  <Search className="w-4 h-4 mr-2" />Ver mais
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingVeiculo(veiculo)}>
                  <Edit className="w-4 h-4 mr-2" />Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteVeiculo.mutate(veiculo.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  // Render carroceria cell based on column ID
  const renderCarroceriaCell = (columnId: string, carroceria: Carroceria) => {
    const veiculoAtrelado = veiculos.find(
      (v) => v.motorista?.id === carroceria.motorista?.id && carroceria.motorista?.id
    );
    switch (columnId) {
      case 'placa':
        return (
          <td className="p-4 align-middle font-medium sticky left-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                {carroceria.foto_url ? (
                  <img src={carroceria.foto_url} alt={carroceria.placa} className="w-full h-full object-cover" />
                ) : (
                  <Container className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {carroceria.placa}
            </div>
          </td>
        );
      case 'tipo':
        return (
          <td className="p-4 align-middle"><Badge variant="secondary">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</Badge></td>
        );
      case 'marca_modelo':
        return (
          <td className="p-4 align-middle text-muted-foreground text-nowrap">{carroceria.marca} {carroceria.modelo} {carroceria.ano && `(${carroceria.ano})`}</td>
        );
      case 'capacidade':
        return (
          <td className="p-4 align-middle text-muted-foreground">
            {carroceria.capacidade_kg ? `${(carroceria.capacidade_kg / 1000).toLocaleString('pt-BR')}t` : '-'}
            {carroceria.capacidade_m3 && ` / ${carroceria.capacidade_m3}m³`}
          </td>
        );
      case 'veiculo':
        return (
          <td className="p-4 align-middle">
            {veiculoAtrelado ? (
              <Badge variant="outline" className="text-xs gap-1">
                <Car className="w-3 h-3" />{veiculoAtrelado.placa}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </td>
        );
      case 'motorista':
        return (
          <td className="p-4 align-middle">
            {carroceria.motorista ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={carroceria.motorista.foto_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getDriverInitials(carroceria.motorista.nome_completo)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-nowrap">{carroceria.motorista.nome_completo}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </td>
        );
      case 'status':
        return (
          <td className="p-4 align-middle">
            <Badge variant={carroceria.ativo ? 'outline' : 'destructive'} className={carroceria.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
              {carroceria.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          </td>
        );
      case 'acoes':
        return (
          <td className="p-4 align-middle sticky right-0 bg-background z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingCarroceria(carroceria)}>
                  <Search className="w-4 h-4 mr-2" />Ver mais
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingCarroceria(carroceria)}>
                  <Edit className="w-4 h-4 mr-2" />Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteCarroceria.mutate(carroceria.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  const isLoading = activeTab === 'veiculos' ? isLoadingVeiculos : isLoadingCarrocerias;

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col h-full gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'veiculos' | 'carrocerias')} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full max-w-md grid-cols-2 shrink-0">
            <TabsTrigger value="veiculos" className="gap-2">
              <Car className="w-4 h-4" />
              Veículos ({veiculos.length})
            </TabsTrigger>
            <TabsTrigger value="carrocerias" className="gap-2">
              <Container className="w-4 h-4" />
              Carrocerias ({carrocerias.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'veiculos' && <div className="flex flex-col flex-1 min-h-0 gap-6 mt-6">
            {/* Veículos Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
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
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shrink-0">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, motorista, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'list' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={resetVeiculoColumnOrder}
                    title="Restaurar ordem das colunas"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
                  <ToggleGroupItem value="list" aria-label="Visualização em lista">
                    <List className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Visualização em cards">
                    <LayoutGrid className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Veículos List */}
            {isLoadingVeiculos ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedVeiculos.length === 0 ? (
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
                    <Button onClick={() => setIsVeiculoDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Veículo
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              /* List View */
              <Card className="border-border flex flex-col flex-1 min-h-0">
                <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                        <tr className="border-b transition-colors bg-muted/50">
                          {orderedVeiculoColumns.map((col) => (
                            <DraggableTableHead
                              key={col.id}
                              columnId={col.id}
                              isDragging={draggedVeiculoCol === col.id}
                              isDragOver={dragOverVeiculoCol === col.id}
                              isSticky={!!col.sticky}
                              sortable={col.sortable}
                              sortDirection={col.sortKey ? getVeiculoSortDirection(col.sortKey) : null}
                              onSort={col.sortKey ? () => requestVeiculoSort(col.sortKey!) : undefined}
                              onColumnDragStart={handleVeiculoDragStart}
                              onColumnDragEnd={handleVeiculoDragEnd}
                              onColumnDragOver={handleVeiculoDragOver}
                              onColumnDragLeave={handleVeiculoDragLeave}
                              onColumnDrop={handleVeiculoDrop}
                              className={
                                col.sticky === 'left' ? 'sticky left-0 bg-muted/50 z-10' :
                                  col.sticky === 'right' ? 'sticky right-0 bg-muted/50 z-10' : ''
                              }
                            >
                              {col.label}
                            </DraggableTableHead>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {paginatedVeiculos.map((veiculo) => (
                          <tr key={veiculo.id} className={`border-b transition-colors hover:bg-muted/30 ${!veiculo.ativo ? 'opacity-60' : ''}`}>
                            {orderedVeiculoColumns.map((col) => (
                              <React.Fragment key={col.id}>
                                {renderVeiculoCell(col.id, veiculo)}
                              </React.Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalPagesVeiculos > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3 shrink-0">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPageVeiculos - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPageVeiculos * ITEMS_PER_PAGE, sortedVeiculos.length)} de {sortedVeiculos.length} registros
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPageVeiculos(p => Math.max(1, p - 1))} disabled={currentPageVeiculos === 1}>
                          <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                        </Button>
                        {Array.from({ length: Math.min(5, totalPagesVeiculos) }, (_, i) => {
                          let pageNum: number;
                          if (totalPagesVeiculos <= 5) pageNum = i + 1;
                          else if (currentPageVeiculos <= 3) pageNum = i + 1;
                          else if (currentPageVeiculos >= totalPagesVeiculos - 2) pageNum = totalPagesVeiculos - 4 + i;
                          else pageNum = currentPageVeiculos - 2 + i;
                          return (
                            <Button key={pageNum} variant={currentPageVeiculos === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPageVeiculos(pageNum)}>
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button variant="outline" size="sm" onClick={() => setCurrentPageVeiculos(p => Math.min(totalPagesVeiculos, p + 1))} disabled={currentPageVeiculos === totalPagesVeiculos}>
                          Próximo<ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Card View - compact like Motoristas */
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedVeiculos.map((veiculo) => (
                      <Card key={veiculo.id} className={`border-border ${!veiculo.ativo ? 'opacity-60' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Square photo avatar */}
                              <div
                                className="w-10 h-10 rounded-lg bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group relative"
                                onClick={() => cardFileInputRefs.current[veiculo.id]?.click()}
                              >
                                {uploadingPhoto === veiculo.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : veiculo.foto_url ? (
                                  <img src={veiculo.foto_url} alt={veiculo.placa} className="w-full h-full object-cover" />
                                ) : (
                                  <Truck className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-foreground">{veiculo.placa}</h3>
                                  <Badge variant={veiculo.ativo ? 'outline' : 'destructive'} className={`text-[10px] ${veiculo.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}`}>
                                    {veiculo.ativo ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px]">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</Badge>
                                  {veiculo.carroceria_integrada ? (
                                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Apenas Cavalo</Badge>
                                  )}
                                  {veiculo.seguro_ativo && <Badge variant="outline" className="text-[10px] gap-0.5"><Shield className="w-3 h-3" /></Badge>}
                                  {veiculo.rastreador && <Badge variant="outline" className="text-[10px] gap-0.5"><Gauge className="w-3 h-3" /></Badge>}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingVeiculo(veiculo)}>
                                  <Search className="w-4 h-4 mr-2" />Ver mais
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => cardFileInputRefs.current[veiculo.id]?.click()}>
                                  <Upload className="w-4 h-4 mr-2" />{veiculo.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
                                </DropdownMenuItem>
                                {veiculo.foto_url && (
                                  <DropdownMenuItem onClick={() => handleRemoveVehiclePhoto(veiculo.id, veiculo.foto_url)}>
                                    <ImageOff className="w-4 h-4 mr-2" />Remover Foto
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setEditingVeiculo(veiculo)}>
                                  <Edit className="w-4 h-4 mr-2" />Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteVeiculo.mutate(veiculo.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {/* Motorista + Trip Status */}
                          <div className="flex gap-1 mt-3 flex-wrap">
                            {veiculo.motorista && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <User className="w-3 h-3" />{veiculo.motorista.nome_completo}
                              </Badge>
                            )}
                            {veiculoTripMap[veiculo.id] && (
                              <Badge className="text-[10px] bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">
                                <Truck className="w-3 h-3 mr-0.5" />Em Viagem • {veiculoTripMap[veiculo.id].codigo}
                              </Badge>
                            )}
                          </div>
                          {/* Capacity Progress (for integrated bodywork) */}
                          {veiculo.carroceria_integrada && veiculo.capacidade_kg && veiculo.capacidade_kg > 0 && (
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Weight className="w-3 h-3" />Capacidade</span>
                                <span>
                                  {((pesoAlocadoPorVeiculo[veiculo.id] || 0) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t / {(veiculo.capacidade_kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t
                                </span>
                              </div>
                              <Progress
                                value={Math.min(100, ((pesoAlocadoPorVeiculo[veiculo.id] || 0) / veiculo.capacidade_kg) * 100)}
                                className="h-1.5"
                                indicatorClassName={
                                  ((pesoAlocadoPorVeiculo[veiculo.id] || 0) / veiculo.capacidade_kg) > 0.9
                                    ? 'bg-destructive'
                                    : ((pesoAlocadoPorVeiculo[veiculo.id] || 0) / veiculo.capacidade_kg) > 0.7
                                      ? 'bg-chart-4'
                                      : 'bg-chart-2'
                                }
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                {/* Grid Pagination */}
                {totalPagesVeiculos > 1 && (
                  <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 mt-4 shrink-0">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPageVeiculos - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPageVeiculos * ITEMS_PER_PAGE, sortedVeiculos.length)} de {sortedVeiculos.length} registros
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPageVeiculos(p => Math.max(1, p - 1))} disabled={currentPageVeiculos === 1}>
                        <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                      </Button>
                      {Array.from({ length: Math.min(5, totalPagesVeiculos) }, (_, i) => {
                        let pageNum: number;
                        if (totalPagesVeiculos <= 5) pageNum = i + 1;
                        else if (currentPageVeiculos <= 3) pageNum = i + 1;
                        else if (currentPageVeiculos >= totalPagesVeiculos - 2) pageNum = totalPagesVeiculos - 4 + i;
                        else pageNum = currentPageVeiculos - 2 + i;
                        return (
                          <Button key={pageNum} variant={currentPageVeiculos === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPageVeiculos(pageNum)}>
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" onClick={() => setCurrentPageVeiculos(p => Math.min(totalPagesVeiculos, p + 1))} disabled={currentPageVeiculos === totalPagesVeiculos}>
                        Próximo<ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>}

          {activeTab === 'carrocerias' && <div className="flex flex-col flex-1 min-h-0 gap-6 mt-6">
            {/* Carrocerias Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-md shrink-0">
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
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shrink-0">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, motorista, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'list' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={resetCarroceriaColumnOrder}
                    title="Restaurar ordem das colunas"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
                  <ToggleGroupItem value="list" aria-label="Visualização em lista">
                    <List className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Visualização em cards">
                    <LayoutGrid className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Carrocerias List */}
            {isLoadingCarrocerias ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedCarrocerias.length === 0 ? (
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
              <Card className="border-border flex flex-col flex-1 min-h-0">
                <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                        <tr className="border-b transition-colors bg-muted/50">
                          {orderedCarroceriaColumns.map((col) => (
                            <DraggableTableHead
                              key={col.id}
                              columnId={col.id}
                              isDragging={draggedCarroceriaCol === col.id}
                              isDragOver={dragOverCarroceriaCol === col.id}
                              isSticky={!!col.sticky}
                              sortable={col.sortable}
                              sortDirection={col.sortKey ? getCarroceriaSortDirection(col.sortKey) : null}
                              onSort={col.sortKey ? () => requestCarroceriaSort(col.sortKey!) : undefined}
                              onColumnDragStart={handleCarroceriaDragStart}
                              onColumnDragEnd={handleCarroceriaDragEnd}
                              onColumnDragOver={handleCarroceriaDragOver}
                              onColumnDragLeave={handleCarroceriaDragLeave}
                              onColumnDrop={handleCarroceriaDrop}
                              className={
                                col.sticky === 'left' ? 'sticky left-0 bg-muted/50 z-10' :
                                  col.sticky === 'right' ? 'sticky right-0 bg-muted/50 z-10' : ''
                              }
                            >
                              {col.label}
                            </DraggableTableHead>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {paginatedCarrocerias.map((carroceria) => (
                          <tr key={carroceria.id} className={`border-b transition-colors hover:bg-muted/30 ${!carroceria.ativo ? 'opacity-60' : ''}`}>
                            {orderedCarroceriaColumns.map((col) => (
                              <React.Fragment key={col.id}>
                                {renderCarroceriaCell(col.id, carroceria)}
                              </React.Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalPagesCarrocerias > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3 shrink-0">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPageCarrocerias - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPageCarrocerias * ITEMS_PER_PAGE, sortedCarrocerias.length)} de {sortedCarrocerias.length} registros
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPageCarrocerias(p => Math.max(1, p - 1))} disabled={currentPageCarrocerias === 1}>
                          <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                        </Button>
                        {Array.from({ length: Math.min(5, totalPagesCarrocerias) }, (_, i) => {
                          let pageNum: number;
                          if (totalPagesCarrocerias <= 5) pageNum = i + 1;
                          else if (currentPageCarrocerias <= 3) pageNum = i + 1;
                          else if (currentPageCarrocerias >= totalPagesCarrocerias - 2) pageNum = totalPagesCarrocerias - 4 + i;
                          else pageNum = currentPageCarrocerias - 2 + i;
                          return (
                            <Button key={pageNum} variant={currentPageCarrocerias === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPageCarrocerias(pageNum)}>
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button variant="outline" size="sm" onClick={() => setCurrentPageCarrocerias(p => Math.min(totalPagesCarrocerias, p + 1))} disabled={currentPageCarrocerias === totalPagesCarrocerias}>
                          Próximo<ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Card View - compact like Motoristas */
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedCarrocerias.map((carroceria) => {
                      const veiculoAtrelado = veiculos.find(
                        (v) => v.motorista?.id === carroceria.motorista?.id && carroceria.motorista?.id
                      );
                      return (
                        <Card key={carroceria.id} className={`border-border ${!carroceria.ativo ? 'opacity-60' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-lg bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group"
                                  onClick={() => cardFileInputRefs.current[carroceria.id]?.click()}
                                >
                                  {uploadingPhoto === carroceria.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : carroceria.foto_url ? (
                                    <img src={carroceria.foto_url} alt={carroceria.placa} className="w-full h-full object-cover" />
                                  ) : (
                                    <Container className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                  )}
                                  <input
                                    ref={(el) => cardFileInputRefs.current[carroceria.id] = el}
                                    type="file" accept="image/*"
                                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCarroceriaPhotoUpload(carroceria.id, file); }}
                                    className="hidden"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-foreground">{carroceria.placa}</h3>
                                    <Badge variant={carroceria.ativo ? 'outline' : 'destructive'} className={`text-[10px] ${carroceria.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}`}>
                                      {carroceria.ativo ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{carroceria.marca} {carroceria.modelo} {carroceria.ano && `(${carroceria.ano})`}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="secondary" className="text-[10px]">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</Badge>
                                    {carroceria.capacidade_kg && (
                                      <Badge variant="outline" className="text-[10px] gap-0.5"><Weight className="w-3 h-3" />{(carroceria.capacidade_kg / 1000).toLocaleString('pt-BR')}t</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewingCarroceria(carroceria)}>
                                    <Search className="w-4 h-4 mr-2" />Ver mais
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => cardFileInputRefs.current[carroceria.id]?.click()}>
                                    <Upload className="w-4 h-4 mr-2" />{carroceria.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
                                  </DropdownMenuItem>
                                  {carroceria.foto_url && (
                                    <DropdownMenuItem onClick={() => handleRemoveCarroceriaPhoto(carroceria.id, carroceria.foto_url)}>
                                      <ImageOff className="w-4 h-4 mr-2" />Remover Foto
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setEditingCarroceria(carroceria)}>
                                    <Edit className="w-4 h-4 mr-2" />Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteCarroceria.mutate(carroceria.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex gap-1 mt-3 flex-wrap">
                              {veiculoAtrelado && (<Badge variant="outline" className="text-xs gap-1"><Car className="w-3 h-3" />{veiculoAtrelado.placa}</Badge>)}
                              {carroceria.motorista && (<Badge variant="outline" className="text-xs gap-1"><User className="w-3 h-3" />{carroceria.motorista.nome_completo}</Badge>)}
                              {carroceriaTripMap[carroceria.id] && (
                                <Badge className="text-[10px] bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">
                                  <Container className="w-3 h-3 mr-0.5" />Em Viagem • {carroceriaTripMap[carroceria.id].codigo}
                                </Badge>
                              )}
                            </div>
                            {/* Capacity Progress */}
                            {carroceria.capacidade_kg && carroceria.capacidade_kg > 0 && (
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1"><Weight className="w-3 h-3" />Capacidade</span>
                                  <span>
                                    {((pesoAlocadoPorCarroceria[carroceria.id] || 0) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t / {(carroceria.capacidade_kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t
                                  </span>
                                </div>
                                <Progress
                                  value={Math.min(100, ((pesoAlocadoPorCarroceria[carroceria.id] || 0) / carroceria.capacidade_kg) * 100)}
                                  className="h-1.5"
                                  indicatorClassName={
                                    ((pesoAlocadoPorCarroceria[carroceria.id] || 0) / carroceria.capacidade_kg) > 0.9
                                      ? 'bg-destructive'
                                      : ((pesoAlocadoPorCarroceria[carroceria.id] || 0) / carroceria.capacidade_kg) > 0.7
                                        ? 'bg-chart-4'
                                        : 'bg-chart-2'
                                  }
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                {/* Grid Pagination */}
                {totalPagesCarrocerias > 1 && (
                  <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 mt-4 shrink-0">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPageCarrocerias - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPageCarrocerias * ITEMS_PER_PAGE, sortedCarrocerias.length)} de {sortedCarrocerias.length} registros
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPageCarrocerias(p => Math.max(1, p - 1))} disabled={currentPageCarrocerias === 1}>
                        <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                      </Button>
                      {Array.from({ length: Math.min(5, totalPagesCarrocerias) }, (_, i) => {
                        let pageNum: number;
                        if (totalPagesCarrocerias <= 5) pageNum = i + 1;
                        else if (currentPageCarrocerias <= 3) pageNum = i + 1;
                        else if (currentPageCarrocerias >= totalPagesCarrocerias - 2) pageNum = totalPagesCarrocerias - 4 + i;
                        else pageNum = currentPageCarrocerias - 2 + i;
                        return (
                          <Button key={pageNum} variant={currentPageCarrocerias === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPageCarrocerias(pageNum)}>
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" onClick={() => setCurrentPageCarrocerias(p => Math.min(totalPagesCarrocerias, p + 1))} disabled={currentPageCarrocerias === totalPagesCarrocerias}>
                        Próximo<ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>}
        </Tabs>

        {/* Detail Dialogs (read-only) */}
        <VeiculoDetailDialog
          veiculo={viewingVeiculo}
          open={!!viewingVeiculo}
          onOpenChange={(open) => !open && setViewingVeiculo(null)}
        />
        <CarroceriaDetailDialog
          carroceria={viewingCarroceria}
          open={!!viewingCarroceria}
          onOpenChange={(open) => !open && setViewingCarroceria(null)}
          veiculoAtrelado={viewingCarroceria?.motorista ? veiculos.find(v => v.motorista?.id === viewingCarroceria.motorista?.id) : null}
        />

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
