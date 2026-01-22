import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link2, 
  Plus, 
  Copy, 
  Trash2, 
  Clock, 
  Users, 
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DriverInviteLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
}

interface InviteLink {
  id: string;
  codigo_acesso: string;
  max_usos: number;
  usos_realizados: number;
  expira_em: string;
  ativo: boolean;
  nome_link: string | null;
  created_at: string;
}

const EXPIRATION_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
];

const USAGE_LIMIT_OPTIONS = [
  { value: '5', label: '5 motoristas' },
  { value: '10', label: '10 motoristas' },
  { value: '25', label: '25 motoristas' },
  { value: '50', label: '50 motoristas' },
  { value: '100', label: '100 motoristas' },
];

export function DriverInviteLinksDialog({ open, onOpenChange, empresaId }: DriverInviteLinksDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form state
  const [nomeLinkInput, setNomeLinkInput] = useState('');
  const [codigoAcessoInput, setCodigoAcessoInput] = useState('');
  const [expiracaoInput, setExpiracaoInput] = useState('30');
  const [maxUsosInput, setMaxUsosInput] = useState('10');

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['driver_invite_links', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_invite_links')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InviteLink[];
    },
    enabled: open && !!empresaId,
  });

  const createLink = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const expirationDays = parseInt(expiracaoInput);
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + expirationDays);

      const { error } = await supabase.from('driver_invite_links').insert({
        empresa_id: empresaId,
        codigo_acesso: codigoAcessoInput,
        max_usos: parseInt(maxUsosInput),
        expira_em: expiraEm.toISOString(),
        nome_link: nomeLinkInput || null,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link de convite criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['driver_invite_links'] });
      resetForm();
      setActiveTab('list');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar link: ' + error.message);
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('driver_invite_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link removido!');
      queryClient.invalidateQueries({ queryKey: ['driver_invite_links'] });
    },
    onError: () => toast.error('Erro ao remover link'),
  });

  const toggleLinkStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('driver_invite_links').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['driver_invite_links'] });
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const resetForm = () => {
    setNomeLinkInput('');
    setCodigoAcessoInput('');
    setExpiracaoInput('30');
    setMaxUsosInput('10');
  };

  const handleCreate = () => {
    if (!codigoAcessoInput || codigoAcessoInput.length < 4) {
      toast.error('O código de acesso deve ter pelo menos 4 caracteres');
      return;
    }
    createLink.mutate();
  };

  const copyLinkToClipboard = async (link: InviteLink) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/cadastro/motorista/convite/${link.id}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(link.id);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const getLinkStatus = (link: InviteLink) => {
    if (!link.ativo) return { label: 'Desativado', variant: 'secondary' as const };
    if (isPast(new Date(link.expira_em))) return { label: 'Expirado', variant: 'destructive' as const };
    if (link.usos_realizados >= link.max_usos) return { label: 'Limite atingido', variant: 'destructive' as const };
    return { label: 'Ativo', variant: 'default' as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Links de Convite para Motoristas
          </DialogTitle>
          <DialogDescription>
            Crie links para que motoristas façam seu próprio cadastro
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'create')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Links Criados</TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-1" />
              Novo Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : links.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Link2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum link de convite criado</p>
                  <Button onClick={() => setActiveTab('create')} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Criar primeiro link
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const status = getLinkStatus(link);
                  const isExpired = isPast(new Date(link.expira_em));
                  const isLimitReached = link.usos_realizados >= link.max_usos;

                  return (
                    <Card key={link.id} className={`${!link.ativo || isExpired || isLimitReached ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {link.nome_link || 'Link sem nome'}
                              </span>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {link.usos_realizados}/{link.max_usos} usos
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {isExpired 
                                  ? 'Expirado' 
                                  : `Expira ${formatDistanceToNow(new Date(link.expira_em), { addSuffix: true, locale: ptBR })}`
                                }
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Criado em {format(new Date(link.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyLinkToClipboard(link)}
                              disabled={!link.ativo || isExpired || isLimitReached}
                              title="Copiar link"
                            >
                              {copiedId === link.id ? (
                                <Check className="w-4 h-4 text-chart-2" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLinkStatus.mutate({ id: link.id, ativo: !link.ativo })}
                              title={link.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {link.ativo ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLink.mutate(link.id)}
                              className="text-destructive hover:text-destructive"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nomeLink">Nome do link (opcional)</Label>
                <Input
                  id="nomeLink"
                  placeholder="Ex: Grupo WhatsApp Região Sul"
                  value={nomeLinkInput}
                  onChange={(e) => setNomeLinkInput(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigoAcesso">Código de acesso *</Label>
                <div className="relative">
                  <Input
                    id="codigoAcesso"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a senha para validar o acesso"
                    value={codigoAcessoInput}
                    onChange={(e) => setCodigoAcessoInput(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Os motoristas precisarão informar este código para acessar o formulário
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tempo de expiração</Label>
                  <Select value={expiracaoInput} onValueChange={setExpiracaoInput}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Limite de cadastros</Label>
                  <Select value={maxUsosInput} onValueChange={setMaxUsosInput}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_LIMIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Após criar o link, você poderá copiá-lo e compartilhar com motoristas via WhatsApp ou outros meios. 
                  Cada motorista que acessar o link precisará informar o código de acesso para ver o formulário de cadastro.
                </p>
              </div>

              <Button 
                onClick={handleCreate} 
                className="w-full"
                disabled={createLink.isPending}
              >
                {createLink.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Link de Convite
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
