import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plug, ExternalLink, Check, AlertCircle, Code, Database, Plus
} from 'lucide-react';

const integrations = [
  { id: 'totvs', name: 'TOTVS Protheus', description: 'Integração com módulos de faturamento e logística', icon: Database, status: 'disconnected' as const, category: 'erp' as const },
  { id: 'emakers', name: 'Emakers TMS', description: 'Sistema de gerenciamento de transporte', icon: Database, status: 'disconnected' as const, category: 'erp' as const },
  { id: 'sap', name: 'SAP S/4HANA', description: 'Integração com módulos de supply chain', icon: Database, status: 'disconnected' as const, category: 'erp' as const },
  { id: 'api', name: 'API Própria', description: 'Conecte seu sistema através da nossa REST API', icon: Code, status: 'disconnected' as const, category: 'api' as const },
];

export default function Integracoes() {
  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-muted-foreground">Conecte ERPs e APIs externas à sua empresa</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" />Sistemas ERP</CardTitle>
            <CardDescription>Conecte seu ERP para sincronização automática de dados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.filter(i => i.category === 'erp').map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><integration.icon className="w-6 h-6 text-muted-foreground" /></div>
                    <div><p className="font-medium text-foreground">{integration.name}</p><p className="text-sm text-muted-foreground">{integration.description}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.status === 'connected' ? (
                      <>
                        <Badge variant="default" className="gap-1"><Check className="w-3 h-3" />Conectado</Badge>
                        <Button variant="outline" size="sm">Configurar</Button>
                      </>
                    ) : integration.status === 'pending' ? (
                      <>
                        <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />Pendente</Badge>
                        <Button variant="outline" size="sm">Verificar</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-2"><Plug className="w-4 h-4" />Conectar</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Code className="w-5 h-5" />API e Integrações Customizadas</CardTitle>
            <CardDescription>Utilize nossa API REST para integrações personalizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Code className="w-6 h-6 text-primary" /></div>
                  <div><p className="font-medium text-foreground">REST API</p><p className="text-sm text-muted-foreground">Acesso programático completo à plataforma</p></div>
                </div>
                <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="w-4 h-4" />Documentação</Button>
              </div>
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Chaves de API</h4>
                <p className="text-sm text-muted-foreground mb-4">Gere chaves de API para autenticar suas integrações</p>
                <Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />Gerar Nova Chave</Button>
              </div>
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Webhooks</h4>
                <p className="text-sm text-muted-foreground mb-4">Configure endpoints para receber notificações em tempo real</p>
                <Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />Adicionar Webhook</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
