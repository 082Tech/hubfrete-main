import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, DollarSign, Target, TrendingUp, Truck } from 'lucide-react';

interface ReportTabsProps {
  children: {
    overview: React.ReactNode;
    financial: React.ReactNode;
    performance: React.ReactNode;
    operational: React.ReactNode;
  };
  portalType?: 'embarcador' | 'transportadora';
}

export function ReportTabs({ children, portalType = 'transportadora' }: ReportTabsProps) {
  const isEmbarcador = portalType === 'embarcador';

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto md:inline-flex">
        <TabsTrigger value="overview" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Visão Geral</span>
          <span className="sm:hidden">Geral</span>
        </TabsTrigger>
        <TabsTrigger value="financial" className="gap-2">
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isEmbarcador ? 'Custos Locomoção' : 'Financeiro'}
          </span>
          <span className="sm:hidden">
            {isEmbarcador ? 'Custos' : 'DRE'}
          </span>
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-2">
          <Target className="w-4 h-4" />
          <span className="hidden sm:inline">Performance</span>
          <span className="sm:hidden">OTIF</span>
        </TabsTrigger>
        <TabsTrigger value="operational" className="gap-2">
          <Truck className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isEmbarcador ? 'Logística' : 'Operacional'}
          </span>
          <span className="sm:hidden">
            {isEmbarcador ? 'Logs' : 'Ops'}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {children.overview}
      </TabsContent>

      <TabsContent value="financial" className="space-y-6">
        {children.financial}
      </TabsContent>

      <TabsContent value="performance" className="space-y-6">
        {children.performance}
      </TabsContent>

      <TabsContent value="operational" className="space-y-6">
        {children.operational}
      </TabsContent>
    </Tabs>
  );
}
