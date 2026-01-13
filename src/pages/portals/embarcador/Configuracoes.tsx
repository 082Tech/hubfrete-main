import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User,
  Bell,
  Shield,
  Building2,
  MapPin,
  Mail,
  Phone,
  Key,
  Save,
  Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import type { Tables } from '@/integrations/supabase/types';

type Filial = Tables<'filiais'>;

export default function Configuracoes() {
  const { companyInfo, empresa, filiais: contextFiliais } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: ''
  });
  
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    push: true,
    sms: false,
    novasProposta: true,
    statusEntrega: true,
    relatorios: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar dados do usuário logado
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Buscar dados do usuário na tabela usuarios
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();
          
          if (usuarioData) {
            setUserData({
              nome: usuarioData.nome || '',
              email: usuarioData.email || authUser.email || '',
              telefone: '',
              cargo: usuarioData.cargo || 'OPERADOR'
            });
          } else {
            setUserData(prev => ({
              ...prev,
              email: authUser.email || ''
            }));
          }
          
          // Buscar filiais da empresa usando o contexto
          if (empresa?.id) {
            const { data: filiaisData } = await supabase
              .from('filiais')
              .select('*')
              .eq('empresa_id', empresa.id)
              .order('is_matriz', { ascending: false });
            
            setFiliais(filiaisData || []);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [empresa?.id]);

  const handleSave = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Atualizar dados do usuário
        const { error } = await supabase
          .from('usuarios')
          .update({
            nome: userData.nome
          })
          .eq('auth_user_id', authUser.id);
        
        if (error) throw error;
      }
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  if (loading) {
    return (
      <PortalLayout expectedUserType="embarcador">
        <div className="space-y-6 max-w-4xl">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e dados da conta</p>
        </div>

        {/* Profile Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>Atualize suas informações de contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input 
                  id="nome" 
                  value={userData.nome}
                  onChange={(e) => setUserData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input 
                  id="cargo" 
                  value={userData.cargo === 'ADMIN' ? 'Administrador' : 'Operador'} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    className="pl-10" 
                    value={userData.email} 
                    disabled 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="telefone" 
                    className="pl-10" 
                    value={userData.telefone}
                    onChange={(e) => setUserData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>Informações da empresa vinculada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={companyInfo?.razao_social || 'Não informado'} disabled />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={companyInfo?.cnpj || 'Não informado'} disabled />
              </div>
              {companyInfo?.nome_fantasia && (
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={companyInfo.nome_fantasia} disabled />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Para alterar dados da empresa, entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>

        {/* Branches */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Filiais
              </CardTitle>
              <CardDescription>
                {filiais.length > 0 
                  ? `${filiais.length} filial(is) vinculada(s) à sua empresa`
                  : 'Nenhuma filial cadastrada'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Solicitar Acesso
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filiais.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma filial encontrada para sua empresa.
                </p>
              ) : (
                filiais.map((filial) => (
                  <div 
                    key={filial.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        filial.ativa ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <MapPin className={`w-5 h-5 ${filial.ativa ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {filial.is_matriz ? '🏢 ' : ''}{filial.nome || 'Filial sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {[filial.endereco, filial.cidade, filial.estado].filter(Boolean).join(' - ') || 'Endereço não informado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {filial.is_matriz && (
                        <Badge variant="outline">Matriz</Badge>
                      )}
                      <Badge variant={filial.ativa ? 'default' : 'secondary'}>
                        {filial.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure como deseja receber alertas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Canais de Notificação</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">Receber notificações por email</p>
                  </div>
                  <Switch 
                    checked={notificacoes.email} 
                    onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Push</p>
                    <p className="text-sm text-muted-foreground">Notificações no navegador</p>
                  </div>
                  <Switch 
                    checked={notificacoes.push} 
                    onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, push: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">SMS</p>
                    <p className="text-sm text-muted-foreground">Notificações por mensagem de texto</p>
                  </div>
                  <Switch 
                    checked={notificacoes.sms} 
                    onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, sms: checked }))}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Tipos de Alerta</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Novas Propostas</p>
                    <p className="text-sm text-muted-foreground">Quando receber propostas de transportadoras</p>
                  </div>
                  <Switch 
                    checked={notificacoes.novasProposta} 
                    onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, novasProposta: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Status de Entrega</p>
                    <p className="text-sm text-muted-foreground">Atualizações sobre suas cargas em trânsito</p>
                  </div>
                  <Switch 
                    checked={notificacoes.statusEntrega} 
                    onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, statusEntrega: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Relatórios Semanais</p>
                    <p className="text-sm text-muted-foreground">Resumo semanal das operações</p>
                  </div>
                  <Switch 
                    checked={notificacoes.relatorios} 
                    onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, relatorios: checked }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Segurança
            </CardTitle>
            <CardDescription>Gerencie a segurança da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Alterar Senha</p>
                  <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
                </div>
              </div>
              <Button variant="outline">Alterar</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Autenticação em Duas Etapas</p>
                  <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                </div>
              </div>
              <Badge variant="secondary">Inativo</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
