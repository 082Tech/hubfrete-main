import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Phone,
  FileText,
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

type Ajudante = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  ativo: boolean | null;
  tipo_cadastro: string;
  motorista_id: string;
  comprovante_vinculo_url: string | null;
  created_at: string | null;
  motorista?: {
    id: string;
    nome_completo: string;
  };
};

const ITEMS_PER_PAGE = 10;

const tipoCadastroLabels: Record<string, string> = {
  'autonomo': 'Autônomo',
  'frota': 'Frota',
  'agregado': 'Agregado',
};

export default function AjudantesAdmin() {
  const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAjudante, setSelectedAjudante] = useState<Ajudante | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAjudantes();
  }, []);

  const fetchAjudantes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ajudantes')
        .select(`
          *,
          motorista:motoristas(id, nome_completo)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAjudantes(data || []);
    } catch (error) {
      console.error('Erro ao buscar ajudantes:', error);
      toast.error('Erro ao carregar ajudantes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAtivo = async (ajudante: Ajudante) => {
    try {
      const { error } = await supabase
        .from('ajudantes')
        .update({ ativo: !ajudante.ativo })
        .eq('id', ajudante.id);

      if (error) throw error;

      toast.success(`Ajudante ${ajudante.ativo ? 'desativado' : 'ativado'} com sucesso`);
      fetchAjudantes();
    } catch (error) {
      console.error('Erro ao atualizar ajudante:', error);
      toast.error('Erro ao atualizar status do ajudante');
    }
  };

  const handleDeleteAjudante = async () => {
    if (!selectedAjudante) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ajudantes')
        .delete()
        .eq('id', selectedAjudante.id);

      if (error) throw error;

      toast.success('Ajudante excluído com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedAjudante(null);
      fetchAjudantes();
    } catch (error: any) {
      console.error('Erro ao excluir ajudante:', error);
      toast.error(error.message || 'Erro ao excluir ajudante');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const filteredAjudantes = ajudantes.filter(a => {
    const matchesSearch = 
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.cpf.includes(search) ||
      a.telefone?.includes(search);
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'ativo' && a.ativo) ||
      (filterStatus === 'inativo' && !a.ativo);
    const matchesTipo = filterTipo === 'all' || a.tipo_cadastro === filterTipo;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAjudantes.length / ITEMS_PER_PAGE);
  const paginatedAjudantes = filteredAjudantes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterTipo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-8 h-8 text-chart-4" />
            Ajudantes
          </h1>
          <p className="text-muted-foreground">Gestão de ajudantes de motoristas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <UserPlus className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ajudantes.length}</p>
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
                  {ajudantes.filter(a => a.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
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
                  {ajudantes.filter(a => a.tipo_cadastro === 'frota').length}
                </p>
                <p className="text-sm text-muted-foreground">Frota</p>
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
                  {ajudantes.filter(a => a.tipo_cadastro === 'autonomo').length}
                </p>
                <p className="text-sm text-muted-foreground">Autônomos</p>
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
            placeholder="Buscar por nome, CPF ou telefone..."
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
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="autonomo">Autônomo</SelectItem>
            <SelectItem value="frota">Frota</SelectItem>
            <SelectItem value="agregado">Agregado</SelectItem>
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
          ) : filteredAjudantes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum ajudante encontrado
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Motorista Vinculado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAjudantes.map((ajudante) => (
                    <TableRow key={ajudante.id}>
                      <TableCell>
                        <span className="font-medium">{ajudante.nome}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{formatCPF(ajudante.cpf)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {formatPhone(ajudante.telefone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ajudante.motorista?.nome_completo || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tipoCadastroLabels[ajudante.tipo_cadastro] || ajudante.tipo_cadastro}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ajudante.ativo ? (
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
                              setSelectedAjudante(ajudante);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleAtivo(ajudante)}>
                              {ajudante.ativo ? (
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
                                setSelectedAjudante(ajudante);
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
                  totalItems={filteredAjudantes.length}
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
            <DialogTitle>Detalhes do Ajudante</DialogTitle>
            <DialogDescription>Informações completas do cadastro</DialogDescription>
          </DialogHeader>
          {selectedAjudante && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedAjudante.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-mono">{formatCPF(selectedAjudante.cpf)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p>{formatPhone(selectedAjudante.telefone)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Cadastro</p>
                  <p>{tipoCadastroLabels[selectedAjudante.tipo_cadastro] || selectedAjudante.tipo_cadastro}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p>{selectedAjudante.ativo ? 'Ativo' : 'Inativo'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Motorista Vinculado</p>
                  <p>{selectedAjudante.motorista?.nome_completo || '-'}</p>
                </div>
              </div>

              {selectedAjudante.comprovante_vinculo_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Comprovante de Vínculo
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedAjudante.comprovante_vinculo_url} target="_blank" rel="noopener noreferrer">
                      Ver documento
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteAjudante}
        isDeleting={isDeleting}
        title="Excluir ajudante?"
        description={`Tem certeza que deseja excluir o ajudante "${selectedAjudante?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
