import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Loader2,
  Package,
  Truck,
  MapPin,
  Users,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Empresa = {
  id: number;
  nome: string | null;
  cnpj_matriz: string | null;
  tipo: 'EMBARCADOR' | 'TRANSPORTADORA';
  classe: string;
  created_at: string;
  logo_url: string | null;
  _count?: {
    filiais: number;
    usuarios: number;
  };
};

type TipoEmpresa = 'EMBARCADOR' | 'TRANSPORTADORA';
type ClasseEmpresa = 'INDÚSTRIA' | 'LOJA' | 'COMÉRCIO';

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    cnpj_matriz: '',
    tipo: 'EMBARCADOR' as TipoEmpresa,
    classe: 'COMÉRCIO' as ClasseEmpresa,
  });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch counts for each empresa
      const empresasWithCounts = await Promise.all(
        (data || []).map(async (empresa) => {
          const [filiaisRes, usuariosRes] = await Promise.all([
            supabase.from('filiais').select('id', { count: 'exact', head: true }).eq('empresa_id', empresa.id),
            supabase.from('usuarios_filiais').select('id', { count: 'exact', head: true })
              .in('filial_id', 
                (await supabase.from('filiais').select('id').eq('empresa_id', empresa.id)).data?.map(f => f.id) || []
              ),
          ]);

          return {
            ...empresa,
            _count: {
              filiais: filiaisRes.count || 0,
              usuarios: usuariosRes.count || 0,
            },
          };
        })
      );

      setEmpresas(empresasWithCounts);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmpresa = async () => {
    if (!formData.nome || !formData.cnpj_matriz) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsCreating(true);
    try {
      // Create empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: formData.nome,
          cnpj_matriz: formData.cnpj_matriz.replace(/\D/g, ''),
          tipo: formData.tipo,
          classe: formData.classe,
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // Create matriz filial
      const { error: filialError } = await supabase
        .from('filiais')
        .insert({
          empresa_id: empresa.id,
          nome: 'Matriz',
          cnpj: formData.cnpj_matriz.replace(/\D/g, ''),
          is_matriz: true,
          ativa: true,
        });

      if (filialError) throw filialError;

      toast.success('Empresa criada com sucesso!');
      setCreateDialogOpen(false);
      setFormData({
        nome: '',
        cnpj_matriz: '',
        tipo: 'EMBARCADOR',
        classe: 'COMÉRCIO',
      });
      fetchEmpresas();
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
      toast.error(error.message || 'Erro ao criar empresa');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredEmpresas = empresas.filter(empresa => {
    const matchesSearch = 
      empresa.nome?.toLowerCase().includes(search.toLowerCase()) ||
      empresa.cnpj_matriz?.includes(search.replace(/\D/g, ''));
    const matchesTipo = filterTipo === 'all' || empresa.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const formatCnpj = (cnpj: string | null) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Empresas
          </h1>
          <p className="text-muted-foreground">Gerenciar embarcadores e transportadoras</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Building2 className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{empresas.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Package className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {empresas.filter(e => e.tipo === 'EMBARCADOR').length}
                </p>
                <p className="text-sm text-muted-foreground">Embarcadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Truck className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {empresas.filter(e => e.tipo === 'TRANSPORTADORA').length}
                </p>
                <p className="text-sm text-muted-foreground">Transportadoras</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <MapPin className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {empresas.reduce((sum, e) => sum + (e._count?.filiais || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Filiais</p>
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
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="EMBARCADOR">Embarcadores</SelectItem>
            <SelectItem value="TRANSPORTADORA">Transportadoras</SelectItem>
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
          ) : filteredEmpresas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Filiais</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {empresa.logo_url ? (
                          <img 
                            src={empresa.logo_url} 
                            alt={empresa.nome || ''} 
                            className="w-8 h-8 rounded object-contain bg-muted"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{empresa.nome || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCnpj(empresa.cnpj_matriz)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={empresa.tipo === 'EMBARCADOR' ? 'default' : 'secondary'}>
                        {empresa.tipo === 'EMBARCADOR' ? 'Embarcador' : 'Transportadora'}
                      </Badge>
                    </TableCell>
                    <TableCell>{empresa.classe}</TableCell>
                    <TableCell>{empresa._count?.filiais || 0}</TableCell>
                    <TableCell>{empresa._count?.usuarios || 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(empresa.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Cadastrar uma nova empresa na plataforma
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Empresa *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome fantasia ou razão social"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj_matriz}
                onChange={(e) => setFormData({ ...formData, cnpj_matriz: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(v: TipoEmpresa) => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMBARCADOR">Embarcador</SelectItem>
                    <SelectItem value="TRANSPORTADORA">Transportadora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classe *</Label>
                <Select 
                  value={formData.classe} 
                  onValueChange={(v: ClasseEmpresa) => setFormData({ ...formData, classe: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDÚSTRIA">Indústria</SelectItem>
                    <SelectItem value="LOJA">Loja</SelectItem>
                    <SelectItem value="COMÉRCIO">Comércio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEmpresa} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
