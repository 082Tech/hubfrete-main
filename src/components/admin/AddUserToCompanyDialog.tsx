import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Filial {
  id: number;
  nome: string | null;
}

interface AddUserToCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
  empresaNome: string;
  empresaTipo: 'EMBARCADOR' | 'TRANSPORTADORA';
  filiais: Filial[];
  onSuccess: () => void;
}

export function AddUserToCompanyDialog({
  open,
  onOpenChange,
  empresaId,
  empresaNome,
  empresaTipo,
  filiais,
  onSuccess,
}: AddUserToCompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'invite' | 'existing'>('invite');
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');
  const [selectedFilialId, setSelectedFilialId] = useState<string>('');

  // Existing user form
  const [existingUsers, setExistingUsers] = useState<Array<{
    id: number;
    nome: string | null;
    email: string | null;
    auth_user_id: string | null;
  }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [existingUserRole, setExistingUserRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');
  const [existingFilialId, setExistingFilialId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchExistingUsers();
      // Reset forms
      setInviteEmail('');
      setInviteRole('OPERADOR');
      setSelectedFilialId(filiais[0]?.id?.toString() || '');
      setSelectedUserId('');
      setExistingUserRole('OPERADOR');
      setExistingFilialId(filiais[0]?.id?.toString() || '');
    }
  }, [open, filiais]);

  const fetchExistingUsers = async () => {
    try {
      // Fetch all users that are not linked to this company yet
      const { data: allUsers } = await (supabase as any)
        .from('usuarios')
        .select('id, nome, email, auth_user_id');
      
      // Fetch users already linked to any branch of this company
      const { data: linkedUsers } = await (supabase as any)
        .from('usuarios_filiais')
        .select('usuario_id, filiais!inner(empresa_id)')
        .eq('filiais.empresa_id', empresaId);
      
      const linkedUserIds = new Set((linkedUsers || []).map((u: any) => u.usuario_id));
      
      // Filter out already linked users
      const availableUsers = (allUsers || []).filter((u: any) => !linkedUserIds.has(u.id));
      setExistingUsers(availableUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Informe o email do usuário');
      return;
    }
    if (!selectedFilialId) {
      toast.error('Selecione a filial');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          company_type: empresaTipo.toLowerCase(),
          company_id: empresaId.toString(),
          filial_id: parseInt(selectedFilialId),
          role: inviteRole,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success(`Convite enviado para ${inviteEmail}`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      toast.error(error.message || 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExistingUser = async () => {
    if (!selectedUserId) {
      toast.error('Selecione um usuário');
      return;
    }
    if (!existingFilialId) {
      toast.error('Selecione a filial');
      return;
    }

    setLoading(true);
    try {
      // First update the user's cargo
      const { error: userError } = await (supabase as any)
        .from('usuarios')
        .update({ cargo: existingUserRole })
        .eq('id', parseInt(selectedUserId));

      if (userError) throw userError;

      // Then create the filial link
      const { error: linkError } = await (supabase as any)
        .from('usuarios_filiais')
        .insert({
          usuario_id: parseInt(selectedUserId),
          filial_id: parseInt(existingFilialId),
          cargo_na_filial: existingUserRole,
        });

      if (linkError) {
        if (linkError.code === '23505') {
          toast.error('Usuário já vinculado a esta filial');
          return;
        }
        throw linkError;
      }

      // Also add the role to user_roles if not exists
      const user = existingUsers.find(u => u.id === parseInt(selectedUserId));
      if (user?.auth_user_id) {
        const roleValue = empresaTipo.toLowerCase() as 'embarcador' | 'transportadora';
        await supabase
          .from('user_roles')
          .upsert({ 
            user_id: user.auth_user_id, 
            role: roleValue 
          }, { 
            onConflict: 'user_id,role' 
          });
      }

      toast.success('Usuário vinculado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao vincular usuário:', error);
      toast.error(error.message || 'Erro ao vincular usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Adicionar Usuário
          </DialogTitle>
          <DialogDescription>
            Adicione um usuário à empresa {empresaNome}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'invite' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">
              <Send className="w-4 h-4 mr-2" />
              Enviar Convite
            </TabsTrigger>
            <TabsTrigger value="existing">
              <UserPlus className="w-4 h-4 mr-2" />
              Usuário Existente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email do Usuário *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select value={inviteRole} onValueChange={(v: 'ADMIN' | 'OPERADOR') => setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filial *</Label>
                <Select value={selectedFilialId} onValueChange={setSelectedFilialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nome || `Filial ${f.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSendInvite} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Selecionar Usuário *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {existingUsers.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhum usuário disponível
                    </div>
                  ) : (
                    existingUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.nome || u.email || `Usuário ${u.id}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select value={existingUserRole} onValueChange={(v: 'ADMIN' | 'OPERADOR') => setExistingUserRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filial *</Label>
                <Select value={existingFilialId} onValueChange={setExistingFilialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nome || `Filial ${f.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleLinkExistingUser} disabled={loading || !selectedUserId}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Vincular Usuário
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
