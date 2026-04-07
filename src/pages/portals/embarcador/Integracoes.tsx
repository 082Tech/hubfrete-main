import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, ChevronRight, Code, Webhook, Key, Plus,
} from 'lucide-react';
import { useUserContext } from '@/hooks/useUserContext';

import totvsLogo from '@/assets/integrations/totvs.png';
import sapLogo from '@/assets/integrations/sap.png';
import oracleLogo from '@/assets/integrations/oracle.png';
import emakersLogo from '@/assets/integrations/emakers.png';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface IntegrationCategory {
  title: string;
  items: Integration[];
}

const iconClass = "w-6 h-6";

const erpEmbarcador: Integration[] = [
  { id: 'totvs', name: 'TOTVS Protheus', description: 'Módulos de faturamento e logística', icon: <img src={totvsLogo} alt="TOTVS" className="w-8 h-8 object-contain" loading="lazy" /> },
  { id: 'sap', name: 'SAP S/4HANA', description: 'Módulos de supply chain', icon: <img src={sapLogo} alt="SAP" className="w-8 h-8 object-contain" loading="lazy" /> },
  { id: 'oracle', name: 'Oracle NetSuite', description: 'ERP em nuvem completo', icon: <img src={oracleLogo} alt="Oracle NetSuite" className="w-8 h-8 object-contain" loading="lazy" /> },
];

const erpTransportadora: Integration[] = [
  { id: 'totvs', name: 'TOTVS Protheus', description: 'Módulos de faturamento e logística', icon: <img src={totvsLogo} alt="TOTVS" className="w-8 h-8 object-contain" loading="lazy" /> },
  { id: 'emakers', name: 'Emakers TMS', description: 'Sistema de gerenciamento de transporte', icon: <img src={emakersLogo} alt="Emakers" className="w-8 h-8 object-contain" loading="lazy" /> },
  { id: 'sap', name: 'SAP S/4HANA', description: 'Módulos de supply chain', icon: <img src={sapLogo} alt="SAP" className="w-8 h-8 object-contain" loading="lazy" /> },
];

const apiTools: Integration[] = [
  { id: 'api', name: 'REST API', description: 'Acesso programático à plataforma', icon: <Code className={`${iconClass} text-primary`} /> },
  { id: 'webhooks', name: 'Webhooks', description: 'Notificações em tempo real', icon: <Webhook className={`${iconClass} text-violet-600`} /> },
  { id: 'api-keys', name: 'Chaves de API', description: 'Autenticação de integrações', icon: <Key className={`${iconClass} text-amber-500`} /> },
];

export default function Integracoes() {
  const { empresa } = useUserContext();
  const isTransportadora = empresa?.tipo === 'TRANSPORTADORA';

  const categories: IntegrationCategory[] = [
    {
      title: isTransportadora ? 'Sistemas ERP / TMS' : 'Sistemas ERP',
      items: isTransportadora ? erpTransportadora : erpEmbarcador,
    },
    {
      title: 'API e Ferramentas de Desenvolvimento',
      items: apiTools,
    },
  ];

  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-muted-foreground">Conecte ferramentas e sistemas externos à sua empresa</p>
        </div>

        {/* Suggestion Banner */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Sentiu falta de alguma integração?</p>
              <p className="text-xs text-muted-foreground">Nos conte quais ferramentas você gostaria de ver integradas ao nosso sistema.</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            Sugerir integração
          </Button>
        </div>

        {/* Categories */}
        {categories.map((category) => (
          <div key={category.title} className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">{category.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((integration) => (
                <Card
                  key={integration.id}
                  className="border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <CardContent className="p-5 flex items-center justify-between gap-4 min-h-[88px]">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        {integration.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {integration.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
