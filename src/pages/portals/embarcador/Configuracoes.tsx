import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
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
import { useState } from 'react';
import { toast } from 'sonner';

const mockFiliais = [
  { id: 'f1', nome: 'Matriz - Parauapebas', endereco: 'Av. Principal, 1000', cidade: 'Parauapebas', estado: 'PA', ativa: true },
  { id: 'f2', nome: 'Filial São Luís', endereco: 'Rua do Porto, 500', cidade: 'São Luís', estado: 'MA', ativa: true },
  { id: 'f3', nome: 'Filial Marabá', endereco: 'Av. Transamazônica, 2500', cidade: 'Marabá', estado: 'PA', ativa: true },
  { id: 'f4', nome: 'Centro de Distribuição SP', endereco: 'Rod. Anhanguera, km 32', cidade: 'São Paulo', estado: 'SP', ativa: false },
];

export default function Configuracoes() {
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    push: true,
    sms: false,
    novasProposta: true,
    statusEntrega: true,
    relatorios: false,
  });

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

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
                <Input id="nome" defaultValue="João da Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input id="cargo" defaultValue="Gerente de Logística" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" className="pl-10" defaultValue="joao.silva@carajas.com.br" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="telefone" className="pl-10" defaultValue="(94) 99999-1234" />
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
                <Input defaultValue="Carajás Mineração S.A." disabled />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input defaultValue="12.345.678/0001-99" disabled />
              </div>
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
              <CardDescription>Filiais vinculadas à sua conta</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Solicitar Acesso
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockFiliais.map((filial) => (
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
                      <p className="font-medium text-foreground">{filial.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {filial.endereco} - {filial.cidade}, {filial.estado}
                      </p>
                    </div>
                  </div>
                  <Badge variant={filial.ativa ? 'default' : 'secondary'}>
                    {filial.ativa ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))}
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
                  <p className="text-sm text-muted-foreground">Última alteração há 30 dias</p>
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
              <Badge variant="default">Ativo</Badge>
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