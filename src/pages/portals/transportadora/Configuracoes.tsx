
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfigFiscalTab } from '@/components/fiscal/ConfigFiscalTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Bell, Shield, Mail, Phone, Key, Save, Sun, Moon, Monitor
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/components/settings';

type TabId = 'perfil' | 'fiscal' | 'notificacoes' | 'seguranca';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: Tab[] = [
  { id: 'perfil', label: 'Perfil', icon: User, description: 'Dados pessoais e aparência' },
  { id: 'fiscal', label: 'Fiscal', icon: Shield, description: 'CT-e, ICMS e configurações fiscais' },
  { id: 'notificacoes', label: 'Notificações', icon: Bell, description: 'Alertas e canais' },
  { id: 'seguranca', label: 'Segurança', icon: Shield, description: 'Senha e autenticação' },
];




export default function Configuracoes() {
  const { empresa } = useUserContext();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [userData, setUserData] = useState({ nome: '', email: '', telefone: '', cargo: '' });
  const [notificacoes, setNotificacoes] = useState({ email: true, push: true, sms: false, novasCotacoes: true, statusEntrega: true, relatorios: false });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: usuarioData } = await supabase.from('usuarios').select('*').eq('auth_user_id', authUser.id).maybeSingle();
          if (usuarioData) {
            setUserData({ nome: usuarioData.nome || '', email: usuarioData.email || authUser.email || '', telefone: '', cargo: usuarioData.cargo || 'OPERADOR' });
          } else {
            setUserData(prev => ({ ...prev, email: authUser.email || '' }));
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
        const { error } = await supabase.from('usuarios').update({ nome: userData.nome }).eq('auth_user_id', authUser.id);
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
      <div className="p-4 md:p-8">
        <div className="flex gap-6">
          <div className="w-64 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          <div className="flex-1 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Dados Pessoais</CardTitle>
                <CardDescription>Atualize suas informações de contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input id="nome" value={userData.nome} onChange={(e) => setUserData(prev => ({ ...prev, nome: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input id="cargo" value={userData.cargo === 'ADMIN' ? 'Administrador' : 'Operador'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" className="pl-10" value={userData.email} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="telefone" className="pl-10" value={userData.telefone} onChange={(e) => setUserData(prev => ({ ...prev, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sun className="w-5 h-5" />Aparência</CardTitle>
                <CardDescription>Escolha o tema da interface</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className="gap-2"><Sun className="w-4 h-4" />Claro</Button>
                  <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className="gap-2"><Moon className="w-4 h-4" />Escuro</Button>
                  <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')} className="gap-2"><Monitor className="w-4 h-4" />Sistema</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'fiscal':
        return <ConfigFiscalTab />;

      case 'notificacoes':
        return (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notificações</CardTitle>
              <CardDescription>Configure como deseja receber alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Canais de Notificação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">Email</p><p className="text-sm text-muted-foreground">Receber notificações por email</p></div><Switch checked={notificacoes.email} onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, email: checked }))} /></div>
                  <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">Push</p><p className="text-sm text-muted-foreground">Notificações no navegador</p></div><Switch checked={notificacoes.push} onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, push: checked }))} /></div>
                  <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">SMS</p><p className="text-sm text-muted-foreground">Notificações por mensagem de texto</p></div><Switch checked={notificacoes.sms} onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, sms: checked }))} /></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Tipos de Alerta</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">Novas Cotações</p><p className="text-sm text-muted-foreground">Quando novas cargas estiverem disponíveis</p></div><Switch checked={notificacoes.novasCotacoes} onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, novasCotacoes: checked }))} /></div>
                  <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">Status de Carga</p><p className="text-sm text-muted-foreground">Atualizações sobre suas cargas em andamento</p></div><Switch checked={notificacoes.statusEntrega} onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, statusEntrega: checked }))} /></div>
                  <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">Relatórios Semanais</p><p className="text-sm text-muted-foreground">Resumo semanal das operações</p></div><Switch checked={notificacoes.relatorios} onCheckedChange={(checked) => setNotificacoes(prev => ({ ...prev, relatorios: checked }))} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'seguranca':
        return (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Segurança</CardTitle>
              <CardDescription>Gerencie a segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3"><Key className="w-5 h-5 text-muted-foreground" /><div><p className="font-medium text-foreground">Alterar Senha</p><p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p></div></div>
                <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>Alterar</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-muted-foreground" /><div><p className="font-medium text-foreground">Autenticação em Duas Etapas</p><p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p></div></div>
                <Button variant="outline">Configurar</Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie suas preferências e dados da conta</p>
          </div>
          <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" />Salvar Alterações</Button>
        </div>
        <div className="flex gap-6">
          <nav className="w-64 shrink-0">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"
                  )}
                >
                  <tab.icon className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tab.label}</p>
                    <p className={cn("text-xs truncate", activeTab === tab.id ? "text-primary-foreground/70" : "text-muted-foreground")}>{tab.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </nav>
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
