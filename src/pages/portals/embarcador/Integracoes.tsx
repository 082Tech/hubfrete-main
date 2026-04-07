import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, ChevronRight, Database, Code, Globe, BarChart3,
  Webhook, Key, FileText, Truck, Package, MapPin, CreditCard,
  MessageSquare, Bell, Shield, Plus,
} from 'lucide-react';
import { useUserContext } from '@/hooks/useUserContext';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  available: boolean;
}

interface IntegrationCategory {
  title: string;
  items: Integration[];
}

const iconClass = "w-6 h-6";

const embarcadorCategories: IntegrationCategory[] = [
  {
    title: 'Sistemas ERP',
    items: [
      { id: 'totvs', name: 'TOTVS Protheus', icon: <Database className={`${iconClass} text-blue-600`} />, available: false },
      { id: 'sap', name: 'SAP S/4HANA', icon: <Database className={`${iconClass} text-indigo-600`} />, available: false },
      { id: 'oracle', name: 'Oracle NetSuite', icon: <Database className={`${iconClass} text-red-600`} />, available: false },
    ],
  },
  {
    title: 'Rastreamento e Logística',
    items: [
      { id: 'tracking', name: 'Rastreamento em Tempo Real', icon: <MapPin className={`${iconClass} text-green-600`} />, available: false },
      { id: 'tms', name: 'TMS Externo', icon: <Truck className={`${iconClass} text-amber-600`} />, available: false },
      { id: 'wms', name: 'WMS (Armazém)', icon: <Package className={`${iconClass} text-purple-600`} />, available: false },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { id: 'banking', name: 'Integração Bancária', icon: <CreditCard className={`${iconClass} text-emerald-600`} />, available: false },
      { id: 'nfe', name: 'Emissor NF-e', icon: <FileText className={`${iconClass} text-blue-500`} />, available: false },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { id: 'whatsapp', name: 'WhatsApp Business', icon: <MessageSquare className={`${iconClass} text-green-500`} />, available: false },
      { id: 'email', name: 'E-mail SMTP', icon: <Bell className={`${iconClass} text-orange-500`} />, available: false },
    ],
  },
  {
    title: 'API e Ferramentas de Desenvolvimento',
    items: [
      { id: 'api', name: 'REST API', icon: <Code className={`${iconClass} text-primary`} />, available: false },
      { id: 'webhooks', name: 'Webhooks', icon: <Webhook className={`${iconClass} text-violet-600`} />, available: false },
      { id: 'api-keys', name: 'Chaves de API', icon: <Key className={`${iconClass} text-amber-500`} />, available: false },
    ],
  },
];

const transportadoraCategories: IntegrationCategory[] = [
  {
    title: 'Sistemas ERP / TMS',
    items: [
      { id: 'totvs', name: 'TOTVS Protheus', icon: <Database className={`${iconClass} text-blue-600`} />, available: false },
      { id: 'emakers', name: 'Emakers TMS', icon: <Database className={`${iconClass} text-indigo-600`} />, available: false },
      { id: 'sap', name: 'SAP S/4HANA', icon: <Database className={`${iconClass} text-red-600`} />, available: false },
    ],
  },
  {
    title: 'Rastreamento e Telemetria',
    items: [
      { id: 'tracking', name: 'Rastreador Veicular', icon: <MapPin className={`${iconClass} text-green-600`} />, available: false },
      { id: 'telemetria', name: 'Telemetria (OBD)', icon: <BarChart3 className={`${iconClass} text-cyan-600`} />, available: false },
      { id: 'roteirizacao', name: 'Roteirização Avançada', icon: <Globe className={`${iconClass} text-teal-600`} />, available: false },
    ],
  },
  {
    title: 'Fiscal e Financeiro',
    items: [
      { id: 'cte', name: 'CT-e / MDF-e', icon: <FileText className={`${iconClass} text-blue-500`} />, available: false },
      { id: 'banking', name: 'Integração Bancária', icon: <CreditCard className={`${iconClass} text-emerald-600`} />, available: false },
      { id: 'seguro', name: 'Seguradora', icon: <Shield className={`${iconClass} text-purple-600`} />, available: false },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { id: 'whatsapp', name: 'WhatsApp Business', icon: <MessageSquare className={`${iconClass} text-green-500`} />, available: false },
      { id: 'email', name: 'E-mail SMTP', icon: <Bell className={`${iconClass} text-orange-500`} />, available: false },
    ],
  },
  {
    title: 'API e Ferramentas de Desenvolvimento',
    items: [
      { id: 'api', name: 'REST API', icon: <Code className={`${iconClass} text-primary`} />, available: false },
      { id: 'webhooks', name: 'Webhooks', icon: <Webhook className={`${iconClass} text-violet-600`} />, available: false },
      { id: 'api-keys', name: 'Chaves de API', icon: <Key className={`${iconClass} text-amber-500`} />, available: false },
    ],
  },
];

export default function Integracoes() {
  const { empresa } = useUserContext();
  const isTransportadora = empresa?.tipo === 'TRANSPORTADORA';
  const categories = isTransportadora ? transportadoraCategories : embarcadorCategories;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.items.map((integration) => (
                <Card
                  key={integration.id}
                  className="border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {integration.icon}
                      </div>
                      <span className="font-medium text-sm text-foreground truncate">
                        {integration.name}
                      </span>
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
