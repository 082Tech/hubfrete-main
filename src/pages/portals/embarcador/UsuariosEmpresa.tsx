import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Plus, 
  Search,
  Mail,
  Phone,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  MapPin
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type UserRole = 'admin' | 'gerente' | 'operador' | 'visualizador';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: UserRole;
  filiais: string[];
  ativo: boolean;
  ultimoAcesso: string;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  operador: 'Operador',
  visualizador: 'Visualizador',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  gerente: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  operador: 'bg-green-500/10 text-green-600 border-green-500/20',
  visualizador: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const mockFiliais = [
  { id: 'f1', nome: 'Matriz - Parauapebas' },
  { id: 'f2', nome: 'Filial São Luís' },
  { id: 'f3', nome: 'Filial Marabá' },
  { id: 'f4', nome: 'Centro de Distribuição SP' },
];

const mockUsuarios: Usuario[] = [
  { 
    id: 'u1', 
    nome: 'Carlos Silva', 
    email: 'carlos.silva@carajas.com.br',
    telefone: '(94) 99999-1234',
    cargo: 'admin',
    filiais: ['f1', 'f2', 'f3', 'f4'],
    ativo: true,
    ultimoAcesso: '12/01/2026 às 14:30',
  },
  { 
    id: 'u2', 
    nome: 'Maria Santos', 
    email: 'maria.santos@carajas.com.br',
    telefone: '(98) 98888-5678',
    cargo: 'gerente',
    filiais: ['f2'],
    ativo: true,
    ultimoAcesso: '12/01/2026 às 10:15',
  },
  { 
    id: 'u3', 
    nome: 'João Oliveira', 
    email: 'joao.oliveira@carajas.com.br',
    telefone: '(94) 97777-9012',
    cargo: 'operador',
    filiais: ['f1', 'f3'],
    ativo: true,
    ultimoAcesso: '11/01/2026 às 18:45',
  },
  { 
    id: 'u4', 
    nome: 'Ana Costa', 
    email: 'ana.costa@carajas.com.br',
    telefone: '(11) 96666-3456',
    cargo: 'visualizador',
    filiais: ['f4'],
    ativo: false,
    ultimoAcesso: '05/01/2026 às 09:00',
  },
  { 
    id: 'u5', 
    nome: 'Pedro Ferreira', 
    email: 'pedro.ferreira@carajas.com.br',
    telefone: '(94) 95555-7890',
    cargo: 'operador',
    filiais: ['f1'],
    ativo: true,
    ultimoAcesso: '12/01/2026 às 16:20',
  },
];

export default function UsuariosEmpresa() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);

  const filteredUsuarios = mockUsuarios.filter(usuario => 
    usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roleLabels[usuario.cargo].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUsuario = () => {
    toast.success('Usuário adicionado com sucesso!');
    setIsAddDialogOpen(false);
    setSelectedFiliais([]);
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    toast.success(currentStatus ? 'Usuário desativado' : 'Usuário ativado');
  };

  const handleDelete = (userId: string) => {
    toast.success('Usuário removido com sucesso');
  };

  const getFilialNomes = (filialIds: string[]) => {
    return filialIds
      .map(id => mockFiliais.find(f => f.id === id)?.nome)
      .filter(Boolean)
      .join(', ');
  };

  const toggleFilial = (filialId: string) => {
    setSelectedFiliais(prev => 
      prev.includes(filialId) 
        ? prev.filter(id => id !== filialId)
        : [...prev, filialId]
    );
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários da Empresa</h1>
            <p className="text-muted-foreground">Gerencie os usuários e suas permissões</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" placeholder="Nome do usuário" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="email@empresa.com.br" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo/Função</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="visualizador">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filiais com Acesso</Label>
                  <div className="grid grid-cols-1 gap-2 p-3 border border-border rounded-lg bg-muted/20">
                    {mockFiliais.map((filial) => (
                      <div key={filial.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={filial.id} 
                          checked={selectedFiliais.includes(filial.id)}
                          onCheckedChange={() => toggleFilial(filial.id)}
                        />
                        <label
                          htmlFor={filial.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {filial.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUsuario}>Adicionar Usuário</Button>
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
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{mockUsuarios.length}</p>
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {mockUsuarios.filter(u => u.ativo).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {mockUsuarios.filter(u => u.cargo === 'admin').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {mockUsuarios.filter(u => !u.ativo).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Inativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email ou cargo..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {filteredUsuarios.map((usuario) => (
            <Card key={usuario.id} className="border-border">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {usuario.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{usuario.nome}</h3>
                        <Badge variant="outline" className={roleColors[usuario.cargo]}>
                          {roleLabels[usuario.cargo]}
                        </Badge>
                        <Badge variant={usuario.ativo ? 'outline' : 'secondary'}>
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {usuario.email}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {usuario.telefone}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {usuario.filiais.length === mockFiliais.length 
                            ? 'Todas as filiais' 
                            : getFilialNomes(usuario.filiais)
                          }
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        Último acesso: {usuario.ultimoAcesso}
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
                      <DropdownMenuItem className="gap-2">
                        <Shield className="w-4 h-4" />
                        Alterar Permissões
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}
                      >
                        {usuario.ativo ? (
                          <>
                            <UserX className="w-4 h-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => handleDelete(usuario.id)}
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