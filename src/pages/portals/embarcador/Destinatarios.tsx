import { useState } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Search,
  Trash2,
  Pencil,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Users,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { toast } from 'sonner';

interface ContatoDestino {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  created_at: string;
}

export default function Destinatarios() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ContatoDestino | null>(null);
  const [editingContato, setEditingContato] = useState<ContatoDestino | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContatoDestino>>({});

  // Fetch destinatários
  const { data: contatos = [], isLoading, refetch } = useQuery({
    queryKey: ['contatos-destino', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      const { data, error } = await supabase
        .from('contatos_destino')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('razao_social');

      if (error) throw error;
      return data as ContatoDestino[];
    },
    enabled: !!empresa?.id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contatos_destino')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Destinatário removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['contatos-destino'] });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast.error('Erro ao remover destinatário');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ContatoDestino> }) => {
      const { error } = await supabase
        .from('contatos_destino')
        .update(data.updates)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Destinatário atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['contatos-destino'] });
      setEditingContato(null);
      setEditForm({});
    },
    onError: () => {
      toast.error('Erro ao atualizar destinatário');
    },
  });

  // Filter contatos based on search term
  const filteredContatos = contatos.filter(contato => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contato.razao_social.toLowerCase().includes(searchLower) ||
      contato.cnpj.includes(searchTerm) ||
      contato.cidade?.toLowerCase().includes(searchLower) ||
      contato.estado?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (contato: ContatoDestino) => {
    setEditingContato(contato);
    setEditForm({
      contato_nome: contato.contato_nome || '',
      contato_telefone: contato.contato_telefone || '',
      contato_email: contato.contato_email || '',
      logradouro: contato.logradouro || '',
      numero: contato.numero || '',
      complemento: contato.complemento || '',
      bairro: contato.bairro || '',
      cidade: contato.cidade || '',
      estado: contato.estado || '',
      cep: contato.cep || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingContato) return;
    updateMutation.mutate({
      id: editingContato.id,
      updates: editForm,
    });
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Destinatários Salvos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus contatos de destino frequentes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contatos.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Destinatários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {contatos.filter(c => c.latitude && c.longitude).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Com Localização</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Phone className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {contatos.filter(c => c.contato_telefone).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Com Contato</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Lista de Destinatários</CardTitle>
                <CardDescription>
                  Empresas salvas durante a criação de cargas
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContatos.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum destinatário encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar sua busca'
                    : 'Destinatários são salvos automaticamente ao criar cargas'}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                      <TableHead className="hidden sm:table-cell">Localização</TableHead>
                      <TableHead className="hidden lg:table-cell">Contato</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContatos.map((contato) => (
                      <TableRow key={contato.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{contato.razao_social}</p>
                              {contato.nome_fantasia && contato.nome_fantasia !== contato.razao_social && (
                                <p className="text-sm text-muted-foreground">
                                  {contato.nome_fantasia}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {formatCNPJ(contato.cnpj)}
                          </code>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            {contato.latitude && contato.longitude ? (
                              <Badge variant="outline" className="gap-1">
                                <MapPin className="w-3 h-3" />
                                {contato.cidade}/{contato.estado}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {contato.cidade ? `${contato.cidade}/${contato.estado}` : '-'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {contato.contato_nome || contato.contato_telefone ? (
                            <div className="text-sm">
                              {contato.contato_nome && <p>{contato.contato_nome}</p>}
                              {contato.contato_telefone && (
                                <p className="text-muted-foreground">{contato.contato_telefone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contato)}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(contato)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteConfirm?.razao_social}</strong> da sua lista de destinatários?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingContato} onOpenChange={() => setEditingContato(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Destinatário</DialogTitle>
            <DialogDescription>
              {editingContato?.razao_social}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Contato</Label>
                <Input
                  value={editForm.contato_nome || ''}
                  onChange={(e) => setEditForm({ ...editForm, contato_nome: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editForm.contato_telefone || ''}
                  onChange={(e) => setEditForm({ ...editForm, contato_telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editForm.contato_email || ''}
                onChange={(e) => setEditForm({ ...editForm, contato_email: e.target.value })}
                placeholder="email@empresa.com"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={editForm.logradouro || ''}
                  onChange={(e) => setEditForm({ ...editForm, logradouro: e.target.value })}
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input
                  value={editForm.numero || ''}
                  onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bairro</Label>
                <Input
                  value={editForm.bairro || ''}
                  onChange={(e) => setEditForm({ ...editForm, bairro: e.target.value })}
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input
                  value={editForm.complemento || ''}
                  onChange={(e) => setEditForm({ ...editForm, complemento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <Input
                  value={editForm.cep || ''}
                  onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={editForm.cidade || ''}
                  onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={editForm.estado || ''}
                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingContato(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
