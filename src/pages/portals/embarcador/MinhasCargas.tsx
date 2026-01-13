import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  Package,
  MapPin,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Carga = Database['public']['Tables']['cargas']['Row'];
type EnderecoCarga = Database['public']['Tables']['enderecos_carga']['Row'];

interface CargaComEnderecos extends Carga {
  enderecos_carga: EnderecoCarga[];
}

const statusLabels: Record<string, string> = {
  'rascunho': 'Rascunho',
  'publicada': 'Publicada',
  'em_cotacao': 'Em Cotação',
  'aceita': 'Aceita',
  'em_coleta': 'Em Coleta',
  'em_transito': 'Em Trânsito',
  'entregue': 'Entregue',
  'cancelada': 'Cancelada',
};

const statusColors: Record<string, string> = {
  'rascunho': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  'publicada': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'em_cotacao': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'aceita': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'em_coleta': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'em_transito': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'entregue': 'bg-green-500/10 text-green-600 border-green-500/20',
  'cancelada': 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function MinhasCargas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [cargas, setCargas] = useState<CargaComEnderecos[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    publicadas: 0,
    em_cotacao: 0,
    em_transito: 0,
    entregues: 0,
  });

  const fetchCargas = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cargas')
        .select(`
          *,
          enderecos_carga (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar cargas:', error);
        toast.error('Erro ao carregar cargas');
        setIsLoading(false);
        return;
      }

      setCargas(data || []);
      
      // Calcular estatísticas
      const allCargas = data || [];
      setStats({
        total: allCargas.length,
        publicadas: allCargas.filter(c => c.status === 'publicada').length,
        em_cotacao: allCargas.filter(c => c.status === 'em_cotacao').length,
        em_transito: allCargas.filter(c => c.status === 'em_transito').length,
        entregues: allCargas.filter(c => c.status === 'entregue').length,
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar cargas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCargas();
  }, []);

  const getEndereco = (carga: CargaComEnderecos, tipo: 'origem' | 'destino') => {
    const endereco = carga.enderecos_carga?.find(e => e.tipo === tipo);
    if (!endereco) return '-';
    return `${endereco.cidade}, ${endereco.estado}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPeso = (peso: number) => {
    return peso.toLocaleString('pt-BR') + ' kg';
  };

  const formatValor = (valor: number | null) => {
    if (!valor) return '-';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filteredCargas = cargas.filter(carga => {
    const matchesSearch = carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || carga.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas Cargas</h1>
            <p className="text-muted-foreground">Gerencie todas as suas cargas cadastradas</p>
          </div>
          <NovaCargaDialog onSuccess={fetchCargas} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.publicadas}</p>
              <p className="text-xs text-muted-foreground">Publicadas</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.em_cotacao}</p>
              <p className="text-xs text-muted-foreground">Em Cotação</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.em_transito}</p>
              <p className="text-xs text-muted-foreground">Em Trânsito</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.entregues}</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por ID ou descrição..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Publicada">Publicada</SelectItem>
                  <SelectItem value="Em Cotação">Em Cotação</SelectItem>
                  <SelectItem value="Aceita">Aceita</SelectItem>
                  <SelectItem value="Em Trânsito">Em Trânsito</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Lista de Cargas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>ID / Descrição</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Coleta</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">Carregando cargas...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredCargas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground mt-2">Nenhuma carga encontrada</p>
                      <p className="text-sm text-muted-foreground">Clique em "Nova Carga" para cadastrar</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCargas.map((carga) => (
                    <TableRow key={carga.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{carga.codigo}</p>
                          <p className="text-sm text-muted-foreground">{carga.descricao}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {getEndereco(carga, 'origem')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {getEndereco(carga, 'destino')}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatPeso(carga.peso_kg)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatValor(carga.valor_mercadoria)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[carga.status || 'rascunho']}>
                          {statusLabels[carga.status || 'rascunho']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(carga.data_coleta_de)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <Eye className="w-4 h-4" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <Edit className="w-4 h-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                              <Trash2 className="w-4 h-4" /> Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}