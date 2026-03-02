import { useState, useEffect } from 'react';
import { 
  Truck, 
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

type Veiculo = {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  tipo: string;
  carroceria: string;
  capacidade_kg: number | null;
  ativo: boolean;
  created_at: string;
  empresa_id: number | null;
  empresa?: {
    id: number;
    nome: string | null;
  };
};

const ITEMS_PER_PAGE = 10;

export default function VeiculosAdmin() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchVeiculos();
  }, []);

  const fetchVeiculos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          *,
          empresa:empresas(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVeiculos(data || []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAtivo = async (veiculo: Veiculo) => {
    try {
      const { error } = await supabase
        .from('veiculos')
        .update({ ativo: !veiculo.ativo })
        .eq('id', veiculo.id);

      if (error) throw error;

      toast.success(`Veículo ${veiculo.ativo ? 'desativado' : 'ativado'} com sucesso`);
      fetchVeiculos();
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      toast.error('Erro ao atualizar status do veículo');
    }
  };

  const handleDeleteVeiculo = async () => {
    if (!selectedVeiculo) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('veiculos')
        .delete()
        .eq('id', selectedVeiculo.id);

      if (error) throw error;

      toast.success('Veículo excluído com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedVeiculo(null);
      fetchVeiculos();
    } catch (error: any) {
      console.error('Erro ao excluir veículo:', error);
      toast.error(error.message || 'Erro ao excluir veículo');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVeiculos = veiculos.filter(v => {
    const matchesSearch = 
      v.placa.toLowerCase().includes(search.toLowerCase()) ||
      v.marca?.toLowerCase().includes(search.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'ativo' && v.ativo) ||
      (filterStatus === 'inativo' && !v.ativo);
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVeiculos.length / ITEMS_PER_PAGE);
  const paginatedVeiculos = filteredVeiculos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const formatPlaca = (placa: string) => {
    return placa.toUpperCase();
  };

  const tipoLabels: Record<string, string> = {
    'truck': 'Truck',
    'carreta': 'Carreta',
    'bitrem': 'Bitrem',
    'rodotrem': 'Rodotrem',
    'van': 'Van',
    'vuc': 'VUC',
    'toco': 'Toco',
    '3/4': '3/4',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-8 h-8 text-chart-2" />
            Veículos
          </h1>
          <p className="text-muted-foreground">Todos os veículos cadastrados na plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Truck className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{veiculos.length}</p>
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
                  {veiculos.filter(v => v.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <User className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {veiculos.filter(v => v.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
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
                  {new Set(veiculos.filter(v => v.empresa_id).map(v => v.empresa_id)).size}
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
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
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
          ) : filteredVeiculos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum veículo encontrado
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Carroceria</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVeiculos.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell>
                        <span className="font-mono font-bold">{formatPlaca(veiculo.placa)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{veiculo.marca || '-'} {veiculo.modelo || ''}</p>
                          {veiculo.ano && <p className="text-muted-foreground">{veiculo.ano}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tipoLabels[veiculo.tipo] || veiculo.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {veiculo.carroceria.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        {veiculo.capacidade_kg ? formatWeight(veiculo.capacidade_kg) : '-'}
                      </TableCell>
                      <TableCell>
                        -
                      </TableCell>
                      <TableCell>
                        {veiculo.empresa?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        {veiculo.ativo ? (
                          <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inativo
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
                              setSelectedVeiculo(veiculo);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleAtivo(veiculo)}>
                              {veiculo.ativo ? (
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
                                setSelectedVeiculo(veiculo);
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
                  totalItems={filteredVeiculos.length}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Veículo</DialogTitle>
            <DialogDescription>Informações completas do cadastro</DialogDescription>
          </DialogHeader>
          {selectedVeiculo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Placa</p>
                  <p className="font-mono font-bold">{formatPlaca(selectedVeiculo.placa)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ano</p>
                  <p>{selectedVeiculo.ano || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marca/Modelo</p>
                  <p>{selectedVeiculo.marca} {selectedVeiculo.modelo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p>{tipoLabels[selectedVeiculo.tipo] || selectedVeiculo.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carroceria</p>
                  <p className="capitalize">{selectedVeiculo.carroceria.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacidade</p>
                  <p>{selectedVeiculo.capacidade_kg ? formatWeight(selectedVeiculo.capacidade_kg) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p>{selectedVeiculo.empresa?.nome || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteVeiculo}
        isDeleting={isDeleting}
        title="Excluir veículo?"
        description={`Tem certeza que deseja excluir o veículo "${selectedVeiculo?.placa}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
