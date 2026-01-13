import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Plus, 
  Search, 
  Building2, 
  Phone,
  Mail,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const mockFiliais = [
  { 
    id: 'f1', 
    nome: 'Matriz - Parauapebas', 
    endereco: 'Av. Principal, 1000', 
    cidade: 'Parauapebas', 
    estado: 'PA',
    cep: '68515-000',
    telefone: '(94) 3346-1234',
    email: 'matriz@carajas.com.br',
    responsavel: 'Carlos Silva',
    ativa: true,
    isMatriz: true,
  },
  { 
    id: 'f2', 
    nome: 'Filial São Luís', 
    endereco: 'Rua do Porto, 500', 
    cidade: 'São Luís', 
    estado: 'MA',
    cep: '65015-000',
    telefone: '(98) 3221-5678',
    email: 'saoluis@carajas.com.br',
    responsavel: 'Maria Santos',
    ativa: true,
    isMatriz: false,
  },
  { 
    id: 'f3', 
    nome: 'Filial Marabá', 
    endereco: 'Av. Transamazônica, 2500', 
    cidade: 'Marabá', 
    estado: 'PA',
    cep: '68502-000',
    telefone: '(94) 3322-9012',
    email: 'maraba@carajas.com.br',
    responsavel: 'João Oliveira',
    ativa: true,
    isMatriz: false,
  },
  { 
    id: 'f4', 
    nome: 'Centro de Distribuição SP', 
    endereco: 'Rod. Anhanguera, km 32', 
    cidade: 'São Paulo', 
    estado: 'SP',
    cep: '05145-000',
    telefone: '(11) 4002-3456',
    email: 'cdsp@carajas.com.br',
    responsavel: 'Ana Costa',
    ativa: false,
    isMatriz: false,
  },
];

export default function GerenciarFiliais() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredFiliais = mockFiliais.filter(filial => 
    filial.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    filial.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    filial.estado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddFilial = () => {
    toast.success('Filial adicionada com sucesso!');
    setIsAddDialogOpen(false);
  };

  const handleToggleStatus = (filialId: string, currentStatus: boolean) => {
    toast.success(currentStatus ? 'Filial desativada' : 'Filial ativada');
  };

  const handleDelete = (filialId: string) => {
    toast.success('Filial removida com sucesso');
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Filiais</h1>
            <p className="text-muted-foreground">Cadastre e gerencie as filiais da sua empresa</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Filial</DialogTitle>
                <DialogDescription>
                  Preencha os dados da nova filial
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Filial</Label>
                  <Input id="nome" placeholder="Ex: Filial Centro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" placeholder="Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input id="estado" placeholder="UF" maxLength={2} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" placeholder="Rua, número, bairro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" placeholder="00000-000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" placeholder="(00) 0000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="filial@empresa.com.br" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input id="responsavel" placeholder="Nome do responsável" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddFilial}>Adicionar Filial</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{mockFiliais.length}</p>
                  <p className="text-xs text-muted-foreground">Total de Filiais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {mockFiliais.filter(f => f.ativa).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {mockFiliais.filter(f => !f.ativa).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Inativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {new Set(mockFiliais.map(f => f.estado)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Estados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, cidade ou estado..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filiais List */}
        <div className="grid gap-4">
          {filteredFiliais.map((filial) => (
            <Card key={filial.id} className="border-border">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      filial.ativa ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {filial.isMatriz ? (
                        <Building2 className={`w-6 h-6 ${filial.ativa ? 'text-primary' : 'text-muted-foreground'}`} />
                      ) : (
                        <MapPin className={`w-6 h-6 ${filial.ativa ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{filial.nome}</h3>
                        {filial.isMatriz && (
                          <Badge variant="default" className="text-xs">Matriz</Badge>
                        )}
                        <Badge variant={filial.ativa ? 'outline' : 'secondary'}>
                          {filial.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filial.endereco} - {filial.cidade}, {filial.estado} - CEP: {filial.cep}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {filial.telefone}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {filial.email}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground pt-1">
                        <span className="font-medium">Responsável:</span> {filial.responsavel}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Edit className="w-4 h-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => handleToggleStatus(filial.id, filial.ativa)}
                      >
                        {filial.ativa ? (
                          <>
                            <XCircle className="w-4 h-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => handleDelete(filial.id)}
                        disabled={filial.isMatriz}
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}