import { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Loader2,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  User,
  Settings2,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  motorista_id: string | null;
  empresa?: {
    id: number;
    nome: string | null;
  };
  motorista?: {
    id: string;
    nome_completo: string;
  };
};

export default function VeiculosAdmin() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
          empresa:empresas(id, nome),
          motorista:motoristas(id, nome_completo)
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
                  {veiculos.filter(v => v.motorista_id).length}
                </p>
                <p className="text-sm text-muted-foreground">Com motorista</p>
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
                {filteredVeiculos.map((veiculo) => (
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
                      {veiculo.capacidade_kg 
                        ? `${(veiculo.capacidade_kg / 1000).toFixed(1)} ton`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {veiculo.motorista?.nome_completo || '-'}
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
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
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
    </div>
  );
}
