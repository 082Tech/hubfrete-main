import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import {
  Truck,
  Plus,
  Search,
  Loader2,
  Gauge,
  Weight,
  MoreVertical,
  Edit,
  Trash2,
  Camera,
  Container,
  Car,
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
import { toast } from 'sonner';
import { CarroceriaEditDialog, CarroceriaDetailDialog } from '@/components/frota';
import { Pagination } from '@/components/admin/Pagination';

const ITEMS_PER_PAGE = 12;

const carroceriaColumns: ColumnDefinition[] = [
  { id: 'placa', label: 'Placa', minWidth: '100px', sticky: 'left', sortable: true, sortKey: 'placa' },
  { id: 'tipo', label: 'Tipo', minWidth: '100px', sortable: true, sortKey: 'tipo' },
  { id: 'marca_modelo', label: 'Marca/Modelo', minWidth: '180px', sortable: true, sortKey: 'marca' },
  { id: 'capacidade', label: 'Capacidade', minWidth: '120px', sortable: true, sortKey: 'capacidade_kg' },
  { id: 'veiculo', label: 'Veículo', minWidth: '100px' },
  { id: 'status', label: 'Status', minWidth: '80px', sortable: true, sortKey: 'ativo' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

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

interface Veiculo {
  id: string;
  placa: string;
}

export default function FrotaCarrocerias() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const { viewMode, setViewMode } = useViewModePreference();
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [editingCarroceria, setEditingCarroceria] = useState<Carroceria | null>(null);
  const [viewingCarroceria, setViewingCarroceria] = useState<Carroceria | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  // Fetch carrocerias
  const { data: carrocerias = [], isLoading } = useQuery({
    queryKey: ['carrocerias_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('carrocerias')
        .select('id, placa, tipo, marca, modelo, ano, capacidade_kg, capacidade_m3, renavam, ativo, foto_url, veiculo_id')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Carroceria[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch veículos (for "Veículo" column)
  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos_transportadora_mini', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa')
        .eq('empresa_id', empresa.id);
      if (error) throw error;
      return (data || []) as Veiculo[];
    },
    enabled: !!empresa?.id,
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async (carroceriaId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setUploadingPhoto(carroceriaId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${carroceriaId}-${Date.now()}.${fileExt}`;
      const filePath = `carrocerias/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('fotos-frota').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('fotos-frota').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('carrocerias').update({ foto_url: urlData.publicUrl }).eq('id', carroceriaId);
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

  const handleRemovePhoto = async (carroceriaId: string, fotoUrl: string | null) => {
    if (!fotoUrl) return;
    try {
      const urlParts = fotoUrl.split('/fotos-frota/');
      if (urlParts.length > 1) {
        await supabase.storage.from('fotos-frota').remove([urlParts[1]]);
      }
      const { error } = await supabase.from('carrocerias').update({ foto_url: null }).eq('id', carroceriaId);
      if (error) throw error;
      toast.success('Foto removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const createCarroceria = useMutation({
    mutationFn: async (data: typeof newCarroceria) => {
      let fotoUrl: string | null = null;
      if (selectedPhoto) {
        const fileExt = selectedPhoto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `carrocerias/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('fotos-frota').upload(filePath, selectedPhoto);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('fotos-frota').getPublicUrl(filePath);
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
      setIsDialogOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setNewCarroceria({ placa: '', tipo: '', marca: '', modelo: '', ano: '', renavam: '', capacidade_kg: '', capacidade_m3: '' });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar carroceria:', error);
      toast.error('Erro ao cadastrar carroceria');
    },
  });

  const deleteCarroceria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('carrocerias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Carroceria removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
    },
    onError: () => toast.error('Erro ao remover carroceria'),
  });

  const filtered = useMemo(() => {
    return carrocerias.filter(
      (c) =>
        c.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [carrocerias, searchTerm]);

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
  } = useDraggableColumns({ columns: carroceriaColumns, persistKey: 'frota-carrocerias-columns' });

  const sortFunctions = useMemo(() => ({
    placa: (a: Carroceria, b: Carroceria) => a.placa.localeCompare(b.placa, 'pt-BR'),
    tipo: (a: Carroceria, b: Carroceria) => (tipoCarroceriaLabels[a.tipo] || a.tipo).localeCompare(tipoCarroceriaLabels[b.tipo] || b.tipo, 'pt-BR'),
    marca: (a: Carroceria, b: Carroceria) => (a.marca || '').localeCompare(b.marca || '', 'pt-BR'),
    capacidade_kg: (a: Carroceria, b: Carroceria) => (a.capacidade_kg || 0) - (b.capacidade_kg || 0),
    ativo: (a: Carroceria, b: Carroceria) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1),
  }), []);

  const { sortedData: sorted, requestSort, getSortDirection } = useTableSort({
    data: filtered,
    defaultSort: { key: 'placa', direction: 'asc' },
    persistKey: 'frota-carrocerias',
    sortFunctions,
  });

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const stats = useMemo(() => ({
    total: carrocerias.length,
    ativos: carrocerias.filter((c) => c.ativo).length,
  }), [carrocerias]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarroceria.placa || !newCarroceria.tipo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createCarroceria.mutate(newCarroceria);
  };

  const renderCell = (columnId: string, carroceria: Carroceria) => {
    const veiculoAtrelado = carroceria.veiculo_id ? veiculos.find(v => v.id === carroceria.veiculo_id) : null;
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
        return <td className="p-4 align-middle"><Badge variant="secondary">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</Badge></td>;
      case 'marca_modelo':
        return <td className="p-4 align-middle text-muted-foreground text-nowrap">{carroceria.marca} {carroceria.modelo} {carroceria.ano && `(${carroceria.ano})`}</td>;
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
              <Badge variant="outline" className="text-xs gap-1"><Car className="w-3 h-3" />{veiculoAtrelado.placa}</Badge>
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
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingCarroceria(carroceria)}><Search className="w-4 h-4 mr-2" />Ver mais</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingCarroceria(carroceria)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteCarroceria.mutate(carroceria.id)}><Trash2 className="w-4 h-4 mr-2" />Remover</DropdownMenuItem>
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
            <h1 className="text-3xl font-bold text-foreground">Carrocerias</h1>
            <p className="text-muted-foreground">
              Gerencie as carrocerias e implementos da sua frota
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setSelectedPhoto(null); setPhotoPreview(null); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Container className="w-4 h-4" />Nova Carroceria</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Container className="w-5 h-5" />Cadastrar Carroceria (Implemento)</DialogTitle>
                <DialogDescription>Adicione uma nova carroceria/implemento à sua frota</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto da Carroceria</Label>
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
                      <p>Clique para adicionar uma foto da carroceria</p>
                      <p className="text-xs">PNG, JPG até 5MB</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Placa *</Label>
                    <MaskedInput mask="plate" placeholder="ABC-1234" value={newCarroceria.placa} onChange={(value) => setNewCarroceria({ ...newCarroceria, placa: value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Renavam</Label>
                    <MaskedInput mask="renavam" placeholder="00000000000" value={newCarroceria.renavam} onChange={(value) => setNewCarroceria({ ...newCarroceria, renavam: value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Carroceria *</Label>
                  <Select value={newCarroceria.tipo} onValueChange={(v) => setNewCarroceria({ ...newCarroceria, tipo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoCarroceriaLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input placeholder="Ex: Randon" value={newCarroceria.marca} onChange={(e) => setNewCarroceria({ ...newCarroceria, marca: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input placeholder="Ex: SR GR" value={newCarroceria.modelo} onChange={(e) => setNewCarroceria({ ...newCarroceria, modelo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input type="number" placeholder="2024" value={newCarroceria.ano} onChange={(e) => setNewCarroceria({ ...newCarroceria, ano: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidade (kg)</Label>
                    <Input type="number" placeholder="30000" value={newCarroceria.capacidade_kg} onChange={(e) => setNewCarroceria({ ...newCarroceria, capacidade_kg: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (m³)</Label>
                    <Input type="number" placeholder="100" value={newCarroceria.capacidade_m3} onChange={(e) => setNewCarroceria({ ...newCarroceria, capacidade_m3: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createCarroceria.isPending}>
                    {createCarroceria.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Cadastrar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md shrink-0">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl"><Container className="w-6 h-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-xl"><Gauge className="w-6 h-6 text-chart-2" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ativos}</p>
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
              placeholder="Buscar por placa, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={resetColumnOrder} title="Resetar colunas" className="h-8 w-8">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="Grade"><LayoutGrid className="w-4 h-4" /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Lista"><List className="w-4 h-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : sorted.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Container className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma carroceria encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhuma carroceria corresponde à busca.' : 'Adicione carrocerias à sua frota.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Nova Carroceria</Button>
              )}
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
                          onColumnDragStart={handleDragStart}
                          onColumnDragEnd={handleDragEnd}
                          onColumnDragOver={handleDragOver}
                          onColumnDragLeave={handleDragLeave}
                          onColumnDrop={handleDrop}
                          isDragging={draggedColumn === col.id}
                          isDragOver={dragOverColumn === col.id}
                          sortable={col.sortable}
                          sortDirection={col.sortable ? getSortDirection(col.sortKey!) : undefined}
                          onSort={col.sortable ? () => requestSort(col.sortKey!) : undefined}
                          isSticky={col.sticky === 'left' || col.sticky === 'right'}
                        >
                          {col.label}
                        </DraggableTableHead>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {paginated.map((carroceria) => (
                      <tr key={carroceria.id} className="border-b transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => setViewingCarroceria(carroceria)}>
                        {orderedColumns.map((col) => (
                          <React.Fragment key={col.id}>{renderCell(col.id, carroceria)}</React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{sorted.length} carroceria(s)</p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Próximo<ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginated.map((carroceria) => {
                const veiculoAtrelado = carroceria.veiculo_id ? veiculos.find(v => v.id === carroceria.veiculo_id) : null;
                return (
                  <Card key={carroceria.id} className="border-border hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setViewingCarroceria(carroceria)}>
                    <CardContent className="p-0">
                      <div className="relative h-36 bg-muted/50 overflow-hidden rounded-t-lg">
                        {carroceria.foto_url ? (
                          <img src={carroceria.foto_url} alt={carroceria.placa} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageOff className="w-10 h-10 mb-2" /><span className="text-xs">Sem foto</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); cardFileInputRefs.current[carroceria.id]?.click(); }}
                          >
                            {uploadingPhoto === carroceria.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          </Button>
                          {carroceria.foto_url && (
                            <Button
                              variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); handleRemovePhoto(carroceria.id, carroceria.foto_url); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <input
                            ref={(el) => { cardFileInputRefs.current[carroceria.id] = el; }}
                            type="file" accept="image/*" className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(carroceria.id, file);
                            }}
                          />
                        </div>
                        <Badge variant={carroceria.ativo ? 'outline' : 'destructive'} className={`absolute top-2 left-2 text-xs ${carroceria.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20 backdrop-blur-sm' : ''}`}>
                          {carroceria.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg text-foreground">{carroceria.placa}</h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingCarroceria(carroceria); }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteCarroceria.mutate(carroceria.id); }}><Trash2 className="w-4 h-4 mr-2" />Remover</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Badge variant="secondary">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</Badge>
                        <p className="text-sm text-muted-foreground">{carroceria.marca} {carroceria.modelo} {carroceria.ano && `(${carroceria.ano})`}</p>
                        <div className="flex gap-2 flex-wrap">
                          {carroceria.capacidade_kg && (
                            <Badge variant="outline" className="text-xs gap-1"><Weight className="w-3 h-3" />{(carroceria.capacidade_kg / 1000).toLocaleString('pt-BR')}t</Badge>
                          )}
                          {veiculoAtrelado && (
                            <Badge variant="outline" className="text-xs gap-1"><Car className="w-3 h-3" />{veiculoAtrelado.placa}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 shrink-0">
                <p className="text-sm text-muted-foreground">{sorted.length} carroceria(s)</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Próximo<ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail Dialog */}
        <CarroceriaDetailDialog
          carroceria={viewingCarroceria}
          open={!!viewingCarroceria}
          onOpenChange={(open) => !open && setViewingCarroceria(null)}
          veiculoAtrelado={viewingCarroceria?.veiculo_id ? veiculos.find(v => v.id === viewingCarroceria.veiculo_id) : null}
        />

        {/* Edit Dialog */}
        <CarroceriaEditDialog
          carroceria={editingCarroceria}
          open={!!editingCarroceria}
          onOpenChange={(open) => !open && setEditingCarroceria(null)}
        />
      </div>
    </div>
  );
}
