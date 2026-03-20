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
import { Separator } from '@/components/ui/separator';
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
  MapPin,
  Hash,
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
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  cep: string | null;
  auth_user_id: string | null;
  empresa_id: number | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  analisado_em: string | null;
};

type TipoFilter = 'todos' | 'empresas' | 'motoristas';

export default function PreCadastros() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [preCadastros, setPreCadastros] = useState<PreCadastro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatusTab, setSelectedStatusTab] = useState('pendente');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
  
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

      // If linked to an empresa, update empresa status to 'ativa'
      if (selectedPreCadastro.empresa_id && isEmpresa(selectedPreCadastro.tipo)) {
        const { error: empresaError } = await supabase
          .from('empresas')
          .update({ status: 'ativa' } as any)
          .eq('id', selectedPreCadastro.empresa_id);

        if (empresaError) {
          console.error('Erro ao ativar empresa:', empresaError);
        }
      }

      // If it's a motorista, activate the motorista record
      if (selectedPreCadastro.tipo === 'motorista' && selectedPreCadastro.auth_user_id) {
        const { error: motoristaError } = await supabase
          .from('motoristas')
          .update({ ativo: true } as any)
          .eq('user_id', selectedPreCadastro.auth_user_id);

        if (motoristaError) {
          console.error('Erro ao ativar motorista:', motoristaError);
        }
      }

      // Send notification to the user
      if (selectedPreCadastro.auth_user_id) {
        const isEmp = isEmpresa(selectedPreCadastro.tipo);
        const isFrotaDriver = selectedPreCadastro.tipo === 'motorista' && selectedPreCadastro.empresa_id;
        await supabase.from('notificacoes').insert({
          user_id: selectedPreCadastro.auth_user_id,
          tipo: 'carga_publicada' as any,
          titulo: 'Cadastro Aprovado! 🎉',
          mensagem: isEmp
            ? `Seu cadastro como ${selectedPreCadastro.tipo === 'embarcador' ? 'Embarcador' : 'Transportadora'} foi aprovado. Agora você tem acesso completo à plataforma.`
            : isFrotaDriver
            ? `Seu cadastro como motorista foi aprovado pela equipe do HubFrete. Você já pode acessar o aplicativo.`
            : 'Seu cadastro como motorista autônomo foi aprovado. Baixe o aplicativo para começar a aceitar fretes.',
          link: isEmp ? `/${selectedPreCadastro.tipo}` : undefined,
        });
      }

      toast({
        title: "Aprovado!",
        description: `Pré-cadastro de ${selectedPreCadastro.nome} foi aprovado${selectedPreCadastro.empresa_id ? ' e empresa ativada' : ''}.`,
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

  const isEmpresa = (tipo: string) => tipo === 'embarcador' || tipo === 'transportadora';

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'embarcador':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><Package className="w-3 h-3 mr-1" />Embarcador</Badge>;
      case 'transportadora':
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"><Truck className="w-3 h-3 mr-1" />Transportadora</Badge>;
      case 'motorista':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"><User className="w-3 h-3 mr-1" />Motorista Autônomo</Badge>;
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

  const filteredPreCadastros = preCadastros.filter(p => {
    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cnpj?.includes(searchTerm) ||
      p.cpf?.includes(searchTerm);
    const matchesStatus = selectedStatusTab === 'todos' || p.status === selectedStatusTab;
    const matchesTipo = tipoFilter === 'todos' 
      || (tipoFilter === 'empresas' && isEmpresa(p.tipo))
      || (tipoFilter === 'motoristas' && p.tipo === 'motorista');
    return matchesSearch && matchesStatus && matchesTipo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPreCadastros.length / ITEMS_PER_PAGE);
  const paginatedPreCadastros = filteredPreCadastros.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatusTab, tipoFilter]);

  const counts = {
    todos: preCadastros.length,
    pendente: preCadastros.filter(p => p.status === 'pendente').length,
    aprovado: preCadastros.filter(p => p.status === 'aprovado').length,
    rejeitado: preCadastros.filter(p => p.status === 'rejeitado').length,
    empresas: preCadastros.filter(p => isEmpresa(p.tipo)).length,
    motoristas: preCadastros.filter(p => p.tipo === 'motorista').length,
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
              <div className="flex items-center gap-3">
                {/* Tipo filter */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={tipoFilter === 'todos' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTipoFilter('todos')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={tipoFilter === 'empresas' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTipoFilter('empresas')}
                  >
                    <Building2 className="w-3 h-3 mr-1" />
                    Empresas ({counts.empresas})
                  </Button>
                  <Button
                    variant={tipoFilter === 'motoristas' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTipoFilter('motoristas')}
                  >
                    <User className="w-3 h-3 mr-1" />
                    Motoristas ({counts.motoristas})
                  </Button>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nome, email, CNPJ..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStatusTab} onValueChange={setSelectedStatusTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="todos">Todos ({counts.todos})</TabsTrigger>
                <TabsTrigger value="pendente">Pendentes ({counts.pendente})</TabsTrigger>
                <TabsTrigger value="aprovado">Aprovados ({counts.aprovado})</TabsTrigger>
                <TabsTrigger value="rejeitado">Rejeitados ({counts.rejeitado})</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatusTab} className="mt-0">
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
                          <TableHead>Solicitante</TableHead>
                          <TableHead className="hidden md:table-cell">Contato</TableHead>
                          <TableHead className="hidden lg:table-cell">Documento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Data</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPreCadastros.map((pc) => (
                          <TableRow key={pc.id}>
                            <TableCell>{getTipoBadge(pc.tipo)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{pc.nome}</p>
                                {isEmpresa(pc.tipo) && pc.razao_social && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{pc.razao_social}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-sm text-muted-foreground">
                                <p>{pc.email}</p>
                                {pc.telefone && <p>{pc.telefone}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                              {isEmpresa(pc.tipo) ? pc.cnpj || '-' : pc.cpf || '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(pc.status)}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                              {format(new Date(pc.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Pré-Cadastro
            </DialogTitle>
          </DialogHeader>
          {selectedPreCadastro && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getTipoBadge(selectedPreCadastro.tipo)}
                {getStatusBadge(selectedPreCadastro.status)}
              </div>

              {/* Responsável / Pessoa */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {isEmpresa(selectedPreCadastro.tipo) ? 'Responsável' : 'Dados do Motorista'}
                </p>
                <div className="grid gap-2 bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium min-w-[70px]">Nome:</span>
                    <span>{selectedPreCadastro.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium min-w-[70px]">E-mail:</span>
                    <span className="truncate">{selectedPreCadastro.email}</span>
                  </div>
                  {selectedPreCadastro.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium min-w-[70px]">Telefone:</span>
                      <span>{selectedPreCadastro.telefone}</span>
                    </div>
                  )}
                  {selectedPreCadastro.cpf && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium min-w-[70px]">CPF:</span>
                      <span>{selectedPreCadastro.cpf}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados da empresa (apenas para embarcador/transportadora) */}
              {isEmpresa(selectedPreCadastro.tipo) && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Dados da Empresa
                  </p>
                  <div className="grid gap-2 bg-muted/50 rounded-lg p-3">
                    {selectedPreCadastro.razao_social && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium min-w-[100px]">Razão Social:</span>
                        <span>{selectedPreCadastro.razao_social}</span>
                      </div>
                    )}
                    {selectedPreCadastro.nome_fantasia && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium min-w-[100px]">Nome Fantasia:</span>
                        <span>{selectedPreCadastro.nome_fantasia}</span>
                      </div>
                    )}
                    {selectedPreCadastro.cnpj && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium min-w-[100px]">CNPJ:</span>
                        <span>{selectedPreCadastro.cnpj}</span>
                      </div>
                    )}
                    {selectedPreCadastro.inscricao_estadual && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium min-w-[100px]">IE:</span>
                        <span>{selectedPreCadastro.inscricao_estadual}</span>
                      </div>
                    )}

                    {/* Endereço */}
                    {(selectedPreCadastro.endereco || selectedPreCadastro.cidade) && (
                      <>
                        <Separator className="my-1" />
                        {selectedPreCadastro.endereco && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium min-w-[100px]">Endereço:</span>
                            <span>{selectedPreCadastro.endereco}</span>
                          </div>
                        )}
                        {(selectedPreCadastro.cidade || selectedPreCadastro.estado) && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium min-w-[100px]">Cidade/UF:</span>
                            <span>{[selectedPreCadastro.cidade, selectedPreCadastro.estado].filter(Boolean).join(' - ')}</span>
                          </div>
                        )}
                        {selectedPreCadastro.cep && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium min-w-[100px]">CEP:</span>
                            <span>{selectedPreCadastro.cep}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Solicitado em {format(new Date(selectedPreCadastro.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>

              {selectedPreCadastro.analisado_em && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4" />
                  Analisado em {format(new Date(selectedPreCadastro.analisado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}

              {selectedPreCadastro.motivo_rejeicao && (
                <div className="p-3 bg-red-500/10 rounded-lg text-sm">
                  <span className="font-medium text-red-600">Motivo da rejeição:</span>
                  <p className="mt-1">{selectedPreCadastro.motivo_rejeicao}</p>
                </div>
              )}
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
              {selectedPreCadastro && isEmpresa(selectedPreCadastro.tipo) ? (
                <>Confirma a aprovação da empresa <strong>{selectedPreCadastro.razao_social || selectedPreCadastro.nome}</strong>? O acesso completo à plataforma será liberado.</>
              ) : (
                <>Confirma a aprovação do motorista <strong>{selectedPreCadastro?.nome}</strong>? Uma notificação será enviada.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {selectedPreCadastro && isEmpresa(selectedPreCadastro.tipo) ? 'Aprovar e Ativar Empresa' : 'Aprovar Motorista'}
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
