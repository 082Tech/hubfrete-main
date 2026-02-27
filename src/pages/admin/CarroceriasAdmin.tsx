import { useState, useEffect } from 'react';
import { 
  Container, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
  User,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pagination } from '@/components/admin/Pagination';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

type Carroceria = {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  renavam: string | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  ativo: boolean | null;
  foto_url: string | null;
  fotos_urls: string[] | null;
  empresa_id: number | null;
  created_at: string | null;
  empresa?: {
    id: number;
    nome: string | null;
  };
};

const ITEMS_PER_PAGE = 10;

const tipoLabels: Record<string, string> = {
  'bau': 'Baú',
  'bau_refrigerado': 'Baú Refrigerado',
  'graneleiro': 'Graneleiro',
  'tanque': 'Tanque',
  'sider': 'Sider',
  'cegonha': 'Cegonha',
  'prancha': 'Prancha',
  'carroceria_aberta': 'Carroceria Aberta',
  'container': 'Container',
  'basculante': 'Basculante',
};

export default function CarroceriasAdmin() {
  const [carrocerias, setCarrocerias] = useState<Carroceria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCarroceria, setSelectedCarroceria] = useState<Carroceria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCarrocerias();
  }, []);

  const fetchCarrocerias = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('carrocerias')
        .select(`
          *,
          empresa:empresas(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCarrocerias(data || []);
    } catch (error) {
      console.error('Erro ao buscar carrocerias:', error);
      toast.error('Erro ao carregar carrocerias');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAtivo = async (carroceria: Carroceria) => {
    try {
      const { error } = await supabase
        .from('carrocerias')
        .update({ ativo: !carroceria.ativo })
        .eq('id', carroceria.id);

      if (error) throw error;

      toast.success(`Carroceria ${carroceria.ativo ? 'desativada' : 'ativada'} com sucesso`);
      fetchCarrocerias();
    } catch (error) {
      console.error('Erro ao atualizar carroceria:', error);
      toast.error('Erro ao atualizar status da carroceria');
    }
  };

  const handleDeleteCarroceria = async () => {
    if (!selectedCarroceria) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('carrocerias')
        .delete()
        .eq('id', selectedCarroceria.id);

      if (error) throw error;

      toast.success('Carroceria excluída com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedCarroceria(null);
      fetchCarrocerias();
    } catch (error: any) {
      console.error('Erro ao excluir carroceria:', error);
      toast.error(error.message || 'Erro ao excluir carroceria');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCarrocerias = carrocerias.filter(c => {
    const matchesSearch = 
      c.placa.toLowerCase().includes(search.toLowerCase()) ||
      c.marca?.toLowerCase().includes(search.toLowerCase()) ||
      c.modelo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'ativo' && c.ativo) ||
      (filterStatus === 'inativo' && !c.ativo);
    const matchesTipo = filterTipo === 'all' || c.tipo === filterTipo;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCarrocerias.length / ITEMS_PER_PAGE);
  const paginatedCarrocerias = filteredCarrocerias.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterTipo]);

  const formatPlaca = (placa: string) => placa.toUpperCase();

  const uniqueTipos = [...new Set(carrocerias.map(c => c.tipo))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Container className="w-8 h-8 text-chart-3" />
            Carrocerias
          </h1>
          <p className="text-muted-foreground">Gestão de reboques e semirreboques</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Container className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{carrocerias.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {carrocerias.filter(c => c.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <User className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {carrocerias.filter(c => c.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Building2 className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(carrocerias.filter(c => c.empresa_id).map(c => c.empresa_id)).size}
                </p>
                <p className="text-sm text-muted-foreground">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, marca ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativas</SelectItem>
            <SelectItem value="inativo">Inativas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {uniqueTipos.map(tipo => (
              <SelectItem key={tipo} value={tipo}>
                {tipoLabels[tipo] || tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCarrocerias.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma carroceria encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCarrocerias.map((carroceria) => (
                    <TableRow key={carroceria.id}>
                      <TableCell>
                        <span className="font-mono font-bold">{formatPlaca(carroceria.placa)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tipoLabels[carroceria.tipo] || carroceria.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{carroceria.marca || '-'} {carroceria.modelo || ''}</p>
                          {carroceria.ano && <p className="text-muted-foreground">{carroceria.ano}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {carroceria.capacidade_kg && (
                            <p>{(carroceria.capacidade_kg / 1000).toFixed(1)} ton</p>
                          )}
                          {carroceria.capacidade_m3 && (
                            <p className="text-muted-foreground">{carroceria.capacidade_m3} m³</p>
                          )}
                          {!carroceria.capacidade_kg && !carroceria.capacidade_m3 && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        -
                      </TableCell>
                      <TableCell>
                        {carroceria.empresa?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        {carroceria.ativo ? (
                          <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedCarroceria(carroceria);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleAtivo(carroceria)}>
                              {carroceria.ativo ? (
                                <>
                                  <ToggleLeft className="w-4 h-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setSelectedCarroceria(carroceria);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCarrocerias.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Carroceria</DialogTitle>
            <DialogDescription>Informações completas do cadastro</DialogDescription>
          </DialogHeader>
          {selectedCarroceria && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Placa</p>
                  <p className="font-mono font-bold">{formatPlaca(selectedCarroceria.placa)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p>{tipoLabels[selectedCarroceria.tipo] || selectedCarroceria.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marca/Modelo</p>
                  <p>{selectedCarroceria.marca} {selectedCarroceria.modelo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ano</p>
                  <p>{selectedCarroceria.ano || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renavam</p>
                  <p className="font-mono">{selectedCarroceria.renavam || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacidade</p>
                  <p>
                    {selectedCarroceria.capacidade_kg ? `${(selectedCarroceria.capacidade_kg / 1000).toFixed(1)} ton` : '-'}
                    {selectedCarroceria.capacidade_m3 && ` / ${selectedCarroceria.capacidade_m3} m³`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p>{selectedCarroceria.empresa?.nome || '-'}</p>
                </div>
              </div>

              {/* Photo Gallery */}
              {((selectedCarroceria.fotos_urls && selectedCarroceria.fotos_urls.length > 0) || selectedCarroceria.foto_url) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Image className="w-4 h-4" />
                    Fotos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedCarroceria.foto_url && (
                      <img
                        src={selectedCarroceria.foto_url}
                        alt="Foto principal"
                        className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxImage(selectedCarroceria.foto_url)}
                      />
                    )}
                    {selectedCarroceria.fotos_urls?.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxImage(url)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Foto ampliada"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteCarroceria}
        isDeleting={isDeleting}
        title="Excluir carroceria?"
        description={`Tem certeza que deseja excluir a carroceria "${selectedCarroceria?.placa}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
