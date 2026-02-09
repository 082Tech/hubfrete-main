import { useState, useEffect } from 'react';
// Layout is now handled by PortalLayoutWrapper in App.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Building2, Pencil, Trash2, Search, Users, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Contato {
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
}

export default function ContatosSalvos() {
  const { empresa } = useUserContext();
  const navigate = useNavigate();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Contato | null>(null);
  const [editingContato, setEditingContato] = useState<Contato | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contato>>({});

  useEffect(() => {
    const loadContatos = async () => {
      if (!empresa?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('contatos_destino')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('razao_social');

      if (!error && data) {
        setContatos(data as Contato[]);
      }
      setLoading(false);
    };

    loadContatos();
  }, [empresa?.id]);

  const handleDeleteContato = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contatos_destino')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setContatos(prev => prev.filter(c => c.id !== id));
      toast.success('Contato removido com sucesso');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting contact:', err);
      toast.error('Erro ao remover contato');
    }
  };

  const handleUpdateContato = async () => {
    if (!editingContato) return;
    try {
      const { error } = await supabase
        .from('contatos_destino')
        .update(editForm)
        .eq('id', editingContato.id);
      if (error) throw error;

      // Reload contacts
      const { data: newContatos } = await supabase
        .from('contatos_destino')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('razao_social');

      if (newContatos) {
        setContatos(newContatos as Contato[]);
      }

      toast.success('Contato atualizado com sucesso');
      setEditingContato(null);
      setEditForm({});
    } catch (err) {
      console.error('Error updating contact:', err);
      toast.error('Erro ao atualizar contato');
    }
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const filteredContatos = contatos.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(term) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(term)) ||
      c.cnpj.includes(term) ||
      (c.cidade && c.cidade.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-7 w-7 text-primary" />
                Contatos Salvos
              </h1>
              <p className="text-muted-foreground">
                Gerencie seus remetentes e destinatários salvos
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {contatos.length} {contatos.length === 1 ? 'contato' : 'contatos'}
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacts Table */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle>Lista de Contatos</CardTitle>
            <CardDescription>
              Contatos são compartilhados entre todas as filiais da empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando contatos...
              </div>
            ) : filteredContatos.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato salvo'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Tente buscar com outros termos' 
                    : 'Contatos são salvos ao cadastrar uma nova carga'}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden md:table-cell">Localização</TableHead>
                      <TableHead className="hidden lg:table-cell">Contato</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContatos.map((contato) => (
                      <TableRow key={contato.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contato.nome_fantasia || contato.razao_social}</p>
                            <p className="text-xs text-muted-foreground">{formatCNPJ(contato.cnpj)}</p>
                            {contato.nome_fantasia && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {contato.razao_social}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              {contato.cidade && contato.estado ? (
                                <>
                                  <p className="text-sm">{contato.cidade}/{contato.estado}</p>
                                  {contato.logradouro && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {contato.logradouro}{contato.numero ? `, ${contato.numero}` : ''}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-1">
                            {contato.contato_nome && (
                              <p className="text-sm">{contato.contato_nome}</p>
                            )}
                            {contato.contato_telefone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {contato.contato_telefone}
                              </div>
                            )}
                            {contato.contato_email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {contato.contato_email}
                              </div>
                            )}
                            {!contato.contato_nome && !contato.contato_telefone && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingContato(contato);
                                setEditForm({
                                  nome_fantasia: contato.nome_fantasia || '',
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
                              }}
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
              Tem certeza que deseja remover <strong>{deleteConfirm?.razao_social}</strong> da sua lista de contatos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteContato(deleteConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContato} onOpenChange={() => setEditingContato(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              {editingContato?.razao_social}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome Fantasia</Label>
              <Input
                value={editForm.nome_fantasia || ''}
                onChange={(e) => setEditForm({ ...editForm, nome_fantasia: e.target.value })}
                placeholder="Nome fantasia da empresa"
              />
            </div>

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
              <Label>Email</Label>
              <Input
                value={editForm.contato_email || ''}
                onChange={(e) => setEditForm({ ...editForm, contato_email: e.target.value })}
                placeholder="email@empresa.com"
                type="email"
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
              <div>
                <Label>CEP</Label>
                <Input
                  value={editForm.cep || ''}
                  onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingContato(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateContato}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
