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
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockCargas = [
  { 
    id: 'CRG-2026-001', 
    descricao: 'Minério de Ferro - Lote A', 
    origem: 'Parauapebas, PA',
    destino: 'São Luís, MA', 
    peso: '45.000 kg',
    valor: 'R$ 12.500,00',
    status: 'Publicada',
    dataCriacao: '12/01/2026',
    dataColeta: '15/01/2026'
  },
  { 
    id: 'CRG-2026-002', 
    descricao: 'Minério de Cobre - Lote B', 
    origem: 'Marabá, PA',
    destino: 'Barcarena, PA', 
    peso: '32.000 kg',
    valor: 'R$ 8.200,00',
    status: 'Em Cotação',
    dataCriacao: '11/01/2026',
    dataColeta: '14/01/2026'
  },
  { 
    id: 'CRG-2026-003', 
    descricao: 'Equipamentos Industriais', 
    origem: 'São Paulo, SP',
    destino: 'Parauapebas, PA', 
    peso: '12.500 kg',
    valor: 'R$ 18.900,00',
    status: 'Aceita',
    dataCriacao: '10/01/2026',
    dataColeta: '13/01/2026'
  },
  { 
    id: 'CRG-2026-004', 
    descricao: 'Peças de Reposição', 
    origem: 'Curitiba, PR',
    destino: 'Marabá, PA', 
    peso: '5.200 kg',
    valor: 'R$ 4.800,00',
    status: 'Em Trânsito',
    dataCriacao: '08/01/2026',
    dataColeta: '10/01/2026'
  },
  { 
    id: 'CRG-2026-005', 
    descricao: 'Insumos Químicos', 
    origem: 'Santos, SP',
    destino: 'Parauapebas, PA', 
    peso: '28.000 kg',
    valor: 'R$ 15.300,00',
    status: 'Entregue',
    dataCriacao: '05/01/2026',
    dataColeta: '07/01/2026'
  },
];

const statusColors: Record<string, string> = {
  'Publicada': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Em Cotação': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Aceita': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Em Trânsito': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Entregue': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Cancelada': 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function MinhasCargas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filteredCargas = mockCargas.filter(carga => {
    const matchesSearch = carga.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Carga
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">3</p>
              <p className="text-xs text-muted-foreground">Publicadas</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">2</p>
              <p className="text-xs text-muted-foreground">Em Cotação</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">4</p>
              <p className="text-xs text-muted-foreground">Em Trânsito</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">47</p>
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
                {filteredCargas.map((carga) => (
                  <TableRow key={carga.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{carga.id}</p>
                        <p className="text-sm text-muted-foreground">{carga.descricao}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {carga.origem}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {carga.destino}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{carga.peso}</TableCell>
                    <TableCell className="text-sm font-medium">{carga.valor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[carga.status]}>
                        {carga.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {carga.dataColeta}
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}