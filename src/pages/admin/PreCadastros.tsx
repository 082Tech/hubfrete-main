import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  Truck,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  Loader2,
  Eye,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

const ITEMS_PER_PAGE = 10;

type PreCadastro = {
  id: string;
  tipo: 'embarcador' | 'transportadora' | 'motorista';
  nome: string;
  email: string;
  telefone: string | null;
  cnpj: string | null;
  cpf: string | null;
  nome_empresa: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  analisado_em: string | null;
};

export default function PreCadastros() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [preCadastros, setPreCadastros] = useState<PreCadastro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pendente');
  
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [selectedPreCadastro, setSelectedPreCadastro] = useState<PreCadastro | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPreCadastros();
  }, []);

  const fetchPreCadastros = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pre_cadastros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPreCadastros((data || []) as PreCadastro[]);
    } catch (error) {
      console.error('Erro ao buscar pré-cadastros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pré-cadastros.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPreCadastro) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('pre_cadastros')
        .update({
          status: 'aprovado',
          analisado_em: new Date().toISOString(),
        })
        .eq('id', selectedPreCadastro.id);

      if (error) throw error;

      // TODO: Trigger invite email
      toast({
        title: "Aprovado!",
        description: `Pré-cadastro de ${selectedPreCadastro.nome} foi aprovado. Um convite será enviado.`,
      });

      setShowApproveDialog(false);
      setSelectedPreCadastro(null);
      fetchPreCadastros();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPreCadastro) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('pre_cadastros')
        .update({
          status: 'rejeitado',
          motivo_rejeicao: motivoRejeicao,
          analisado_em: new Date().toISOString(),
        })
        .eq('id', selectedPreCadastro.id);

      if (error) throw error;

      toast({
        title: "Rejeitado",
        description: `Pré-cadastro de ${selectedPreCadastro.nome} foi rejeitado.`,
      });

      setShowRejectDialog(false);
      setMotivoRejeicao('');
      setSelectedPreCadastro(null);
      fetchPreCadastros();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível rejeitar.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'embarcador': return <Package className="w-4 h-4" />;
      case 'transportadora': return <Truck className="w-4 h-4" />;
      case 'motorista': return <User className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'embarcador':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Embarcador</Badge>;
      case 'transportadora':
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">Transportadora</Badge>;
      case 'motorista':
        return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">Motorista</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (!selectedPreCadastro) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('pre_cadastros')
        .delete()
        .eq('id', selectedPreCadastro.id);

      if (error) throw error;

      toast({
        title: "Excluído",
        description: `Pré-cadastro de ${selectedPreCadastro.nome} foi excluído.`,
      });

      setDeleteDialogOpen(false);
      setSelectedPreCadastro(null);
      fetchPreCadastros();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPreCadastros = preCadastros.filter(p => {
    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = selectedTab === 'todos' || p.status === selectedTab;
    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPreCadastros.length / ITEMS_PER_PAGE);
  const paginatedPreCadastros = filteredPreCadastros.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTab]);

  const counts = {
    todos: preCadastros.length,
    pendente: preCadastros.filter(p => p.status === 'pendente').length,
    aprovado: preCadastros.filter(p => p.status === 'aprovado').length,
    rejeitado: preCadastros.filter(p => p.status === 'rejeitado').length,
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-8 h-8 text-primary" />
              Pré-Cadastros
            </h1>
            <p className="text-muted-foreground">Gerencie solicitações de acesso à plataforma</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-muted rounded-xl">
                <UserPlus className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.todos}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{counts.pendente}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{counts.aprovado}</p>
                <p className="text-sm text-muted-foreground">Aprovados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{counts.rejeitado}</p>
                <p className="text-sm text-muted-foreground">Rejeitados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <CardTitle>Solicitações</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="todos">Todos ({counts.todos})</TabsTrigger>
                <TabsTrigger value="pendente">Pendentes ({counts.pendente})</TabsTrigger>
                <TabsTrigger value="aprovado">Aprovados ({counts.aprovado})</TabsTrigger>
                <TabsTrigger value="rejeitado">Rejeitados ({counts.rejeitado})</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPreCadastros.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Nenhum pré-cadastro encontrado
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="hidden md:table-cell">E-mail</TableHead>
                          <TableHead className="hidden lg:table-cell">Empresa/CPF</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Data</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPreCadastros.map((pc) => (
                          <TableRow key={pc.id}>
                            <TableCell>{getTipoBadge(pc.tipo)}</TableCell>
                            <TableCell className="font-medium">{pc.nome}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">{pc.email}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {pc.nome_empresa || pc.cpf || '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(pc.status)}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {format(new Date(pc.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedPreCadastro(pc);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {pc.status === 'pendente' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                      onClick={() => {
                                        setSelectedPreCadastro(pc);
                                        setShowApproveDialog(true);
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                      onClick={() => {
                                        setSelectedPreCadastro(pc);
                                        setShowRejectDialog(true);
                                      }}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setSelectedPreCadastro(pc);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {totalPages > 1 && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredPreCadastros.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                      />
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPreCadastro && getTipoIcon(selectedPreCadastro.tipo)}
              Detalhes do Pré-Cadastro
            </DialogTitle>
          </DialogHeader>
          {selectedPreCadastro && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getTipoBadge(selectedPreCadastro.tipo)}
                {getStatusBadge(selectedPreCadastro.status)}
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Nome:</span>
                  <span>{selectedPreCadastro.nome}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">E-mail:</span>
                  <span>{selectedPreCadastro.email}</span>
                </div>
                {selectedPreCadastro.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Telefone:</span>
                    <span>{selectedPreCadastro.telefone}</span>
                  </div>
                )}
                {selectedPreCadastro.nome_empresa && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Empresa:</span>
                    <span>{selectedPreCadastro.nome_empresa}</span>
                  </div>
                )}
                {selectedPreCadastro.cnpj && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">CNPJ:</span>
                    <span>{selectedPreCadastro.cnpj}</span>
                  </div>
                )}
                {selectedPreCadastro.cpf && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">CPF:</span>
                    <span>{selectedPreCadastro.cpf}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Solicitado em:</span>
                  <span>{format(new Date(selectedPreCadastro.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                {selectedPreCadastro.motivo_rejeicao && (
                  <div className="p-3 bg-red-500/10 rounded-lg text-sm">
                    <span className="font-medium text-red-600">Motivo da rejeição:</span>
                    <p className="mt-1">{selectedPreCadastro.motivo_rejeicao}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
            {selectedPreCadastro?.status === 'pendente' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowRejectDialog(true);
                  }}
                >
                  Rejeitar
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowApproveDialog(true);
                  }}
                >
                  Aprovar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Pré-Cadastro</DialogTitle>
            <DialogDescription>
              Confirma a aprovação do pré-cadastro de <strong>{selectedPreCadastro?.nome}</strong>?
              Um convite será enviado para o e-mail {selectedPreCadastro?.email}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Aprovar e Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pré-Cadastro</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do pré-cadastro de <strong>{selectedPreCadastro?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Rejeição</Label>
              <Textarea
                placeholder="Descreva o motivo da rejeição..."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !motivoRejeicao.trim()}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Excluir pré-cadastro?"
        description={`Tem certeza que deseja excluir o pré-cadastro de "${selectedPreCadastro?.nome}"?`}
      />
    </div>
  );
}
