import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
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
  MoreVertical,
  Edit,
  Trash2,
  Camera,
  Upload,
  Container,
  Car,
  FileText,
  CheckCircle,
  ImageOff,
  LayoutGrid,
  List,
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
import { Pagination } from '@/components/admin/Pagination';
import { toast } from 'sonner';
import { VeiculoEditDialog, VeiculoDetailDialog } from '@/components/frota';

const ITEMS_PER_PAGE = 12;

const veiculoColumns: ColumnDefinition[] = [
  { id: 'placa', label: 'Placa', minWidth: '100px', sticky: 'left', sortable: true, sortKey: 'placa' },
  { id: 'tipo', label: 'Tipo', minWidth: '100px', sortable: true, sortKey: 'tipo' },
  { id: 'carroceria', label: 'Carroceria', minWidth: '120px', sortable: true, sortKey: 'carroceria' },
  { id: 'marca_modelo', label: 'Marca/Modelo', minWidth: '180px', sortable: true, sortKey: 'marca' },
  { id: 'status', label: 'Status', minWidth: '100px', sortable: true, sortKey: 'ativo' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

const ESTADOS_BRASIL = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' }, { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' }, { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' }, { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' }, { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' }, { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' }, { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' }, { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' }, { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' }, { value: 'TO', label: 'Tocantins' },
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
  motorista_padrao_id: string | null;
  motorista_padrao: { id: string; nome_completo: string; telefone: string | null; foto_url: string | null } | null;
}

const VEICULOS_COM_CARROCERIA_INTEGRADA = ['vuc', 'tres_quartos', 'toco', 'truck', 'bitruck'];

const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck', toco: 'Toco', tres_quartos: '3/4', vuc: 'VUC',
  carreta: 'Carreta', carreta_ls: 'Carreta LS', bitrem: 'Bitrem',
  rodotrem: 'Rodotrem', vanderleia: 'Vanderleia', bitruck: 'Bitruck',
};

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta', fechada_bau: 'Baú', graneleira: 'Graneleira', tanque: 'Tanque',
  sider: 'Sider', frigorifico: 'Frigorífico', cegonha: 'Cegonha', prancha: 'Prancha',
  container: 'Container', graneleiro: 'Graneleiro', grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba', plataforma: 'Plataforma', bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico', bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo', gaiola: 'Gaiola', bug_porta_container: 'Bug Porta Container',
  munk: 'Munk', apenas_cavalo: 'Apenas Cavalo', cavaqueira: 'Cavaqueira', hopper: 'Hopper',
};

export default function MinhaFrota() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [viewingVeiculo, setViewingVeiculo] = useState<Veiculo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentoInputRef = useRef<HTMLInputElement>(null);
  const enderecoProprietarioInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [newVeiculo, setNewVeiculo] = useState({
    placa: '', tipo: '', marca: '', modelo: '', ano: '', renavam: '',
    uf: '', antt_rntrc: '',
    documento_veiculo_url: null as string | null,
    comprovante_endereco_proprietario_url: null as string | null,
    proprietario_nome: '', proprietario_cpf_cnpj: '',
    tipo_propriedade: 'pf' as 'pf' | 'pj',
    carroceria_integrada: false, carroceria: 'apenas_cavalo' as string,
    capacidade_kg: '', capacidade_m3: '',
  });

  // Fetch veículos only
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ['veiculos_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          id, placa, tipo, carroceria, marca, modelo, ano,
          capacidade_kg, capacidade_m3, renavam, uf, antt_rntrc,
          documento_veiculo_url, comprovante_endereco_proprietario_url,
          proprietario_nome, proprietario_cpf_cnpj, tipo_propriedade,
          ativo, seguro_ativo, rastreador, foto_url, carroceria_integrada,
          motorista_padrao_id,
          motorista_padrao:motoristas!veiculos_motorista_padrao_id_fkey(id, nome_completo, telefone, foto_url)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Veiculo[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch viagens ativas (for trip status on cards)
  const { data: viagensAtivas = [] } = useQuery({
    queryKey: ['viagens_ativas_frota', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('viagens')
        .select('id, codigo, status, veiculo_id')
        .in('status', ['aguardando', 'programada', 'em_andamento']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  const veiculoTripMap = useMemo(() => {
    const map: Record<string, { codigo: string; status: string }> = {};
    viagensAtivas.forEach((v) => {
      if (v.veiculo_id) map[v.veiculo_id] = { codigo: v.codigo, status: v.status };
    });
    return map;
  }, [viagensAtivas]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 5MB'); return; }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVehiclePhotoUpload = async (veiculoId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 5MB'); return; }
    setUploadingPhoto(veiculoId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${veiculoId}-${Date.now()}.${fileExt}`;
      const filePath = `veiculos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('fotos-frota').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('fotos-frota').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('veiculos').update({ foto_url: urlData.publicUrl }).eq('id', veiculoId);
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

  const handleRemoveVehiclePhoto = async (veiculoId: string, fotoUrl: string | null) => {
    if (!fotoUrl) return;
    try {
      const urlParts = fotoUrl.split('/fotos-frota/');
      if (urlParts.length > 1) await supabase.storage.from('fotos-frota').remove([urlParts[1]]);
      const { error } = await supabase.from('veiculos').update({ foto_url: null }).eq('id', veiculoId);
      if (error) throw error;
      toast.success('Foto removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const handleDocumentUpload = async (
    file: File,
    folder: string,
    fieldName: 'documento_veiculo_url' | 'comprovante_endereco_proprietario_url'
  ) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 5MB'); return; }
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `veiculos/${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
      setNewVeiculo(prev => ({ ...prev, [fieldName]: urlData.publicUrl }));
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar arquivo');
    }
  };

  const createVeiculo = useMutation({
    mutationFn: async (data: typeof newVeiculo) => {
      let fotoUrl: string | null = null;
      if (selectedPhoto) {
        const fileExt = selectedPhoto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `veiculos/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('fotos-frota').upload(filePath, selectedPhoto);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('fotos-frota').getPublicUrl(filePath);
        fotoUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from('veiculos').insert({
        placa: data.placa.toUpperCase(),
        tipo: data.tipo as any,
        carroceria: data.carroceria_integrada ? (data.carroceria as any) : ('apenas_cavalo' as any),
        marca: data.marca || null, modelo: data.modelo || null,
        ano: data.ano ? parseInt(data.ano) : null, renavam: data.renavam || null,
        uf: data.uf || null, antt_rntrc: data.antt_rntrc || null,
        documento_veiculo_url: data.documento_veiculo_url,
        comprovante_endereco_proprietario_url: data.comprovante_endereco_proprietario_url,
        proprietario_nome: data.proprietario_nome || null,
        proprietario_cpf_cnpj: data.proprietario_cpf_cnpj || null,
        tipo_propriedade: data.tipo_propriedade as any,
        empresa_id: empresa?.id, ativo: true, foto_url: fotoUrl,
        carroceria_integrada: data.carroceria_integrada,
        capacidade_kg: data.carroceria_integrada && data.capacidade_kg ? parseFloat(data.capacidade_kg) : null,
        capacidade_m3: data.carroceria_integrada && data.capacidade_m3 ? parseFloat(data.capacidade_m3) : null,
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
        placa: '', tipo: '', marca: '', modelo: '', ano: '', renavam: '',
        uf: '', antt_rntrc: '', documento_veiculo_url: null,
        comprovante_endereco_proprietario_url: null,
        proprietario_nome: '', proprietario_cpf_cnpj: '',
        tipo_propriedade: 'pf', carroceria_integrada: false,
        carroceria: 'apenas_cavalo', capacidade_kg: '', capacidade_m3: '',
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar veículo:', error);
      toast.error('Erro ao cadastrar veículo');
    },
  });

  const deleteVeiculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('veiculos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Veículo removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
    },
    onError: () => toast.error('Erro ao remover veículo'),
  });

  const filtered = useMemo(() => {
    return veiculos.filter(
      (v) =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [veiculos, searchTerm]);

  const {
    orderedColumns,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetColumnOrder,
  } = useDraggableColumns({ columns: veiculoColumns, persistKey: 'frota-veiculos-columns' });

  const sortFunctions = useMemo(() => ({
    placa: (a: Veiculo, b: Veiculo) => a.placa.localeCompare(b.placa, 'pt-BR'),
    tipo: (a: Veiculo, b: Veiculo) => (tipoVeiculoLabels[a.tipo] || a.tipo).localeCompare(tipoVeiculoLabels[b.tipo] || b.tipo, 'pt-BR'),
    carroceria: (a: Veiculo, b: Veiculo) => (tipoCarroceriaLabels[a.carroceria] || a.carroceria).localeCompare(tipoCarroceriaLabels[b.carroceria] || b.carroceria, 'pt-BR'),
    marca: (a: Veiculo, b: Veiculo) => (a.marca || '').localeCompare(b.marca || '', 'pt-BR'),
    ativo: (a: Veiculo, b: Veiculo) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1),
  }), []);

  const { sortedData: sorted, requestSort, getSortDirection } = useTableSort({
    data: filtered,
    defaultSort: { key: 'placa', direction: 'asc' },
    persistKey: 'frota-veiculos',
    sortFunctions,
  });

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const stats = useMemo(() => ({
    total: veiculos.length,
    ativos: veiculos.filter((v) => v.ativo).length,
    comSeguro: veiculos.filter((v) => v.seguro_ativo).length,
    comRastreador: veiculos.filter((v) => v.rastreador).length,
  }), [veiculos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVeiculo.placa || !newVeiculo.tipo) { toast.error('Preencha os campos obrigatórios'); return; }
    createVeiculo.mutate(newVeiculo);
  };

  const renderCell = (columnId: string, veiculo: Veiculo) => {
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
        return <td className="p-4 align-middle"><Badge variant="secondary">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</Badge></td>;
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
        return <td className="p-4 align-middle text-muted-foreground text-nowrap">{veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}</td>;
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
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingVeiculo(veiculo)}><Search className="w-4 h-4 mr-2" />Ver mais</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingVeiculo(veiculo)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteVeiculo.mutate(veiculo.id)}><Trash2 className="w-4 h-4 mr-2" />Remover</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col h-full gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
            <p className="text-muted-foreground">Gerencie os veículos da sua frota</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setSelectedPhoto(null); setPhotoPreview(null); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Car className="w-4 h-4" />Novo Veículo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Car className="w-5 h-5" />Cadastrar Veículo (Cavalo)</DialogTitle>
                <DialogDescription>Adicione um novo veículo trator à sua frota</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto do Veículo</Label>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-32 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden bg-muted/50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Camera className="w-6 h-6 mb-1" /><span className="text-xs">Adicionar foto</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                    <div className="text-sm text-muted-foreground">
                      <p>Clique para adicionar uma foto do veículo</p>
                      <p className="text-xs">PNG, JPG até 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Placa *</Label>
                    <MaskedInput mask="plate" placeholder="ABC-1234" value={newVeiculo.placa} onChange={(value) => setNewVeiculo({ ...newVeiculo, placa: value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Renavam</Label>
                    <MaskedInput mask="renavam" placeholder="00000000000" value={newVeiculo.renavam} onChange={(value) => setNewVeiculo({ ...newVeiculo, renavam: value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Veículo *</Label>
                  <Select value={newVeiculo.tipo} onValueChange={(v) => {
                    const hasIntegrated = VEICULOS_COM_CARROCERIA_INTEGRADA.includes(v);
                    setNewVeiculo({
                      ...newVeiculo, tipo: v, carroceria_integrada: hasIntegrated,
                      carroceria: hasIntegrated ? newVeiculo.carroceria : 'apenas_cavalo',
                    });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoVeiculoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label>Carroceria Integrada</Label>
                    <p className="text-xs text-muted-foreground">Marque se o veículo já possui carroceria própria (ex: Toco, Truck com baú)</p>
                  </div>
                  <Switch
                    checked={newVeiculo.carroceria_integrada}
                    onCheckedChange={(checked) => setNewVeiculo({
                      ...newVeiculo, carroceria_integrada: checked,
                      carroceria: checked ? (newVeiculo.carroceria === 'apenas_cavalo' ? 'fechada_bau' : newVeiculo.carroceria) : 'apenas_cavalo',
                      capacidade_kg: checked ? newVeiculo.capacidade_kg : '',
                      capacidade_m3: checked ? newVeiculo.capacidade_m3 : '',
                    })}
                  />
                </div>

                {newVeiculo.carroceria_integrada && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de Carroceria *</Label>
                      <Select value={newVeiculo.carroceria} onValueChange={(v) => setNewVeiculo({ ...newVeiculo, carroceria: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(tipoCarroceriaLabels).filter(([value]) => value !== 'apenas_cavalo').map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Capacidade (kg) *</Label>
                        <Input type="number" placeholder="Ex: 8000" value={newVeiculo.capacidade_kg} onChange={(e) => setNewVeiculo({ ...newVeiculo, capacidade_kg: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacidade (m³)</Label>
                        <Input type="number" placeholder="Ex: 45" value={newVeiculo.capacidade_m3} onChange={(e) => setNewVeiculo({ ...newVeiculo, capacidade_m3: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input placeholder="Ex: Volvo" value={newVeiculo.marca} onChange={(e) => setNewVeiculo({ ...newVeiculo, marca: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input placeholder="Ex: FH 540" value={newVeiculo.modelo} onChange={(e) => setNewVeiculo({ ...newVeiculo, modelo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input type="number" placeholder="2024" value={newVeiculo.ano} onChange={(e) => setNewVeiculo({ ...newVeiculo, ano: e.target.value })} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary"><FileText className="w-4 h-4" />ANTT e Documentação</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ANTT / RNTRC *</Label>
                      <Input placeholder="Número do RNTRC" value={newVeiculo.antt_rntrc} onChange={(e) => setNewVeiculo({ ...newVeiculo, antt_rntrc: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF do Veículo</Label>
                      <Select value={newVeiculo.uf} onValueChange={(v) => setNewVeiculo({ ...newVeiculo, uf: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((estado) => (
                            <SelectItem key={estado.value} value={estado.value}>{estado.value} - {estado.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Documento do Veículo (CRLV)</Label>
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="outline" className="gap-2" onClick={() => documentoInputRef.current?.click()}>
                        <Upload className="w-4 h-4" />{newVeiculo.documento_veiculo_url ? 'Substituir' : 'Enviar Documento'}
                      </Button>
                      {newVeiculo.documento_veiculo_url && (
                        <span className="text-sm text-chart-2 flex items-center gap-1"><CheckCircle className="w-4 h-4" />Documento enviado</span>
                      )}
                      <input ref={documentoInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentUpload(file, 'documento', 'documento_veiculo_url');
                      }} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary"><User className="w-4 h-4" />Dados do Proprietário</div>
                  <div className="space-y-2">
                    <Label>Tipo de Propriedade</Label>
                    <Select value={newVeiculo.tipo_propriedade} onValueChange={(v) => setNewVeiculo({ ...newVeiculo, tipo_propriedade: v as 'pf' | 'pj' })}>
                      <SelectTrigger className="w-full max-w-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pf">Pessoa Física</SelectItem>
                        <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Proprietário</Label>
                      <Input placeholder={newVeiculo.tipo_propriedade === 'pj' ? 'Razão Social' : 'Nome completo'} value={newVeiculo.proprietario_nome} onChange={(e) => setNewVeiculo({ ...newVeiculo, proprietario_nome: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{newVeiculo.tipo_propriedade === 'pj' ? 'CNPJ' : 'CPF'}</Label>
                      <MaskedInput
                        mask={newVeiculo.tipo_propriedade === 'pj' ? 'cnpj' : 'cpf'}
                        placeholder={newVeiculo.tipo_propriedade === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                        value={newVeiculo.proprietario_cpf_cnpj}
                        onChange={(value) => setNewVeiculo({ ...newVeiculo, proprietario_cpf_cnpj: value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Comprovante de Endereço do Proprietário</Label>
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="outline" className="gap-2" onClick={() => enderecoProprietarioInputRef.current?.click()}>
                        <Upload className="w-4 h-4" />{newVeiculo.comprovante_endereco_proprietario_url ? 'Substituir' : 'Enviar Comprovante'}
                      </Button>
                      {newVeiculo.comprovante_endereco_proprietario_url && (
                        <span className="text-sm text-chart-2 flex items-center gap-1"><CheckCircle className="w-4 h-4" />Comprovante enviado</span>
                      )}
                      <input ref={enderecoProprietarioInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentUpload(file, 'proprietario', 'comprovante_endereco_proprietario_url');
                      }} />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createVeiculo.isPending}>
                    {createVeiculo.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Cadastrar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col flex-1 min-h-0 gap-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl"><Car className="w-6 h-6 text-primary" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-chart-2/10 rounded-xl"><Gauge className="w-6 h-6 text-chart-2" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.ativos}</p><p className="text-sm text-muted-foreground">Ativos</p></div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-chart-1/10 rounded-xl"><Shield className="w-6 h-6 text-chart-1" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.comSeguro}</p><p className="text-sm text-muted-foreground">Com Seguro</p></div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-chart-4/10 rounded-xl"><Gauge className="w-6 h-6 text-chart-4" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.comRastreador}</p><p className="text-sm text-muted-foreground">Rastreador</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Search + View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shrink-0">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por placa, marca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'list' && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetColumnOrder} title="Restaurar ordem das colunas">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
                <ToggleGroupItem value="list" aria-label="Lista"><List className="w-4 h-4" /></ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grade"><LayoutGrid className="w-4 h-4" /></ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-12 text-center">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum veículo encontrado</h3>
                <p className="text-muted-foreground mb-4">{searchTerm ? 'Nenhum veículo corresponde à busca.' : 'Adicione veículos à sua frota.'}</p>
                {!searchTerm && <Button onClick={() => setIsDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Novo Veículo</Button>}
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <Card className="border-border flex flex-col flex-1 min-h-0">
              <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                      <tr className="border-b transition-colors bg-muted/50">
                        {orderedColumns.map((col) => (
                          <DraggableTableHead
                            key={col.id}
                            columnId={col.id}
                            isDragging={draggedColumn === col.id}
                            isDragOver={dragOverColumn === col.id}
                            isSticky={!!col.sticky}
                            sortable={col.sortable}
                            sortDirection={col.sortKey ? getSortDirection(col.sortKey) : null}
                            onSort={col.sortKey ? () => requestSort(col.sortKey!) : undefined}
                            onColumnDragStart={handleDragStart}
                            onColumnDragEnd={handleDragEnd}
                            onColumnDragOver={handleDragOver}
                            onColumnDragLeave={handleDragLeave}
                            onColumnDrop={handleDrop}
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
                      {paginated.map((veiculo) => (
                        <tr key={veiculo.id} className={`border-b transition-colors hover:bg-muted/30 ${!veiculo.ativo ? 'opacity-60' : ''}`}>
                          {orderedColumns.map((col) => (
                            <React.Fragment key={col.id}>{renderCell(col.id, veiculo)}</React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sorted.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            /* Grid View - matching Carrocerias card pattern */
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginated.map((veiculo) => (
                    <Card key={veiculo.id} className={`border-border hover:shadow-md transition-shadow cursor-pointer group ${!veiculo.ativo ? 'opacity-60' : ''}`} onClick={() => setViewingVeiculo(veiculo)}>
                      <CardContent className="p-0">
                        {/* Photo Banner */}
                        <div className="relative h-36 bg-muted/50 overflow-hidden rounded-t-lg">
                          {veiculo.foto_url ? (
                            <img src={veiculo.foto_url} alt={veiculo.placa} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                              <ImageOff className="w-10 h-10 mb-2" /><span className="text-xs">Sem foto</span>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); cardFileInputRefs.current[veiculo.id]?.click(); }}
                            >
                              {uploadingPhoto === veiculo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            </Button>
                            {veiculo.foto_url && (
                              <Button
                                variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); handleRemoveVehiclePhoto(veiculo.id, veiculo.foto_url); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <input
                              ref={(el) => { cardFileInputRefs.current[veiculo.id] = el; }}
                              type="file" accept="image/*" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVehiclePhotoUpload(veiculo.id, file);
                              }}
                            />
                          </div>
                          <Badge className={`absolute top-2 left-2 text-xs backdrop-blur-md border ${veiculo.ativo ? 'bg-emerald-600/90 text-white border-emerald-500/50' : 'bg-destructive/90 text-white border-destructive/50'}`}>
                            {veiculo.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {veiculoTripMap[veiculo.id] && (
                            <Badge className="absolute bottom-2 left-2 text-[10px] bg-blue-600/90 text-white border-blue-500/50 backdrop-blur-md">
                              <Truck className="w-3 h-3 mr-0.5" />Em Viagem • {veiculoTripMap[veiculo.id].codigo}
                            </Badge>
                          )}
                        </div>
                        {/* Details */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-foreground">{veiculo.placa}</h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingVeiculo(veiculo); }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteVeiculo.mutate(veiculo.id); }}><Trash2 className="w-4 h-4 mr-2" />Remover</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Badge variant="secondary">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</Badge>
                          <p className="text-sm text-muted-foreground">{veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}</p>
                          <div className="flex gap-2 flex-wrap">
                            {veiculo.carroceria_integrada ? (
                              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Apenas Cavalo</Badge>
                            )}
                            {veiculo.carroceria_integrada && veiculo.capacidade_kg && (
                              <Badge variant="outline" className="text-xs gap-1"><Weight className="w-3 h-3" />{(veiculo.capacidade_kg / 1000).toLocaleString('pt-BR')}t</Badge>
                            )}
                            {veiculo.seguro_ativo && <Badge variant="outline" className="text-xs gap-0.5"><Shield className="w-3 h-3" /></Badge>}
                            {veiculo.rastreador && <Badge variant="outline" className="text-xs gap-0.5"><Gauge className="w-3 h-3" /></Badge>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sorted.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          )}
        </div>

        <VeiculoDetailDialog
          veiculo={viewingVeiculo}
          open={!!viewingVeiculo}
          onOpenChange={(open) => !open && setViewingVeiculo(null)}
        />
        <VeiculoEditDialog
          veiculo={editingVeiculo}
          open={!!editingVeiculo}
          onOpenChange={(open) => !open && setEditingVeiculo(null)}
        />
      </div>
    </div>
  );
}
