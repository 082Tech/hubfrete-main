import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart3 } from 'lucide-react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { FinanceCalendar } from '@/components/financeiro/FinanceCalendar';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';

export default function EmbarcadorFinanceiro() {
  const { empresa } = useUserContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['embarcador-financeiro', empresa?.id, monthStart.toISOString()],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('financeiro_entregas')
        .select(`
          *,
          entregas!inner(codigo, carga_id,
            cargas(codigo, descricao),
            motoristas(nome_completo)
          ),
          empresa_transportadora:empresas!financeiro_entregas_empresa_transportadora_id_fkey(nome, nome_fantasia)
        `)
        .eq('empresa_embarcadora_id', empresa.id)
        .gte('data_vencimento', monthStart.toISOString().slice(0, 10))
        .lte('data_vencimento', monthEnd.toISOString().slice(0, 10))
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresa?.id,
  });

  const { data: configFinanceira } = useQuery({
    queryKey: ['embarcador-config-financeira', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data, error } = await supabase
        .from('empresa_config_financeira' as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!empresa?.id,
  });

  const tipoPagamentoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pre_pago': return 'Pré-pago';
      case 'pos_pago': return 'Pós-pago';
      case 'faturado': return 'Faturado';
      default: return 'Padrão (D+30)';
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus pagamentos por carga finalizada</p>
        </div>
        {configFinanceira && (
          <Badge variant="outline" className="text-sm gap-1.5 px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {tipoPagamentoLabel(configFinanceira.tipo_pagamento)} · D+{configFinanceira.prazo_dias}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="calendario" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="w-4 h-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="anual" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Visão Anual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-0">
          <FinanceCalendar
            recebiveis={registros}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            perspective="embarcador"
          />
        </TabsContent>

        <TabsContent value="anual" className="mt-0">
          {empresa?.id && (
            <AnnualBarChart
              empresaId={empresa.id}
              filterColumn="empresa_embarcadora_id"
              valueField="valor_frete"
              year={currentMonth.getFullYear()}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
