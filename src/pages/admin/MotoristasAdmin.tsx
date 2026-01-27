import { useState, useEffect } from 'react';
import { 
  User, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Loader2,
  Truck,
  Phone,
  Mail,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
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

type Motorista = {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  ativo: boolean;
  tipo_cadastro: 'autonomo' | 'frota';
  created_at: string;
  empresa_id: number | null;
  empresa?: {
    id: number;
    nome: string | null;
  };
};

export default function MotoristasAdmin() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');

  useEffect(() => {
    fetchMotoristas();
  }, []);

  const fetchMotoristas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          *,
          empresa:empresas(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMotoristas(data || []);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
      toast.error('Erro ao carregar motoristas');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMotoristas = motoristas.filter(m => {
    const matchesSearch = 
      m.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      m.cpf.includes(search.replace(/\D/g, '')) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'ativo' && m.ativo) ||
      (filterStatus === 'inativo' && !m.ativo);
    const matchesTipo = filterTipo === 'all' || m.tipo_cadastro === filterTipo;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const formatCpf = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <User className="w-8 h-8 text-chart-3" />
            Motoristas
          </h1>
          <p className="text-muted-foreground">Todos os motoristas cadastrados na plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <User className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{motoristas.length}</p>
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
                  {motoristas.filter(m => m.ativo).length}
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
                <Building2 className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {motoristas.filter(m => m.tipo_cadastro === 'frota').length}
                </p>
                <p className="text-sm text-muted-foreground">Frota</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Truck className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {motoristas.filter(m => m.tipo_cadastro === 'autonomo').length}
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
            placeholder="Buscar por nome, CPF ou e-mail..."
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
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="frota">Frota</SelectItem>
            <SelectItem value="autonomo">Autônomo</SelectItem>
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
          ) : filteredMotoristas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum motorista encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>CNH</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMotoristas.map((motorista) => (
                  <TableRow key={motorista.id}>
                    <TableCell>
                      <span className="font-medium">{motorista.nome_completo}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCpf(motorista.cpf)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{motorista.cnh}</p>
                        <p className="text-muted-foreground">{motorista.categoria_cnh}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {motorista.telefone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {motorista.telefone}
                          </div>
                        )}
                        {motorista.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {motorista.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={motorista.tipo_cadastro === 'frota' ? 'default' : 'secondary'}>
                        {motorista.tipo_cadastro === 'frota' ? 'Frota' : 'Autônomo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {motorista.empresa?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      {motorista.ativo ? (
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
                    <TableCell className="text-muted-foreground">
                      {format(new Date(motorista.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
