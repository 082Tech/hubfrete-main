import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical,
  Mail,
  Shield,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getUsers, createUser, User } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newCargo, setNewCargo] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newSenha || !newCargo) {
      toast.error('Preencha todos os campos');
      return;
    }

    setCreating(true);
    try {
      const response = await createUser(newEmail, newSenha, newCargo);
      const output = typeof response.data === 'string' 
        ? response.data 
        : (response.data?.output || '');
      
      if (!output || output.includes('Sucesso') || output.includes('Criado')) {
        toast.success('Usuário criado com sucesso!');
        setIsDialogOpen(false);
        setNewEmail('');
        setNewSenha('');
        setNewCargo('');
        fetchUsers();
      } else {
        toast.error(output);
      }
    } catch (error) {
      toast.error('Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const getCargoBadge = (cargo: string) => {
    switch (cargo?.toLowerCase()) {
      case 'admin':
        return <Badge className="bg-destructive/10 text-destructive">Admin</Badge>;
      case 'operador':
        return <Badge className="bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]">Operador</Badge>;
      case 'motorista':
        return <Badge className="bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))]">Motorista</Badge>;
      default:
        return <Badge variant="secondary">{cargo || 'N/A'}</Badge>;
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground">Controle de acesso e permissões</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo usuário no sistema.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    value={newSenha}
                    onChange={(e) => setNewSenha(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Select value={newCargo} onValueChange={setNewCargo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="motorista">Motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Usuário'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou cargo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Usuários Cadastrados ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cargo</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Criado em</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm text-muted-foreground">#{user.id}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold text-sm">
                                {user.email?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <span className="text-sm text-foreground">{user.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getCargoBadge(user.cargo)}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Mail className="w-4 h-4" />
                                Enviar Email
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Shield className="w-4 h-4" />
                                Alterar Permissões
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
