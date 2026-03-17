import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Landmark, Save, Zap, Calendar, BarChart3, AlertTriangle,
} from 'lucide-react';
import { format, endOfMonth, startOfMonth, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { FinanceCalendar } from '@/components/financeiro/FinanceCalendar';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';

export default function TransportadoraFinanceiro() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [antecipacaoDialog, setAntecipacaoDialog] = useState<any | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const [bankForm, setBankForm] = useState({ banco: '', agencia: '', conta: '', tipo_conta: 'corrente', pix: '', titular: '' });
  const [bankLoaded, setBankLoaded] = useState(false);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['transportadora-financeiro', empresa?.id, monthStart.toISOString()],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('financeiro_entregas')
        .select(`
          *,
          entregas!inner(codigo, carga_id,
            cargas(codigo, descricao)
          ),
          empresa_embarcadora:empresas!financeiro_entregas_empresa_embarcadora_id_fkey(nome, nome_fantasia)
        `)
        .eq('empresa_transportadora_id', empresa.id)
        .gte('data_vencimento', monthStart.toISOString().slice(0, 10))
        .lte('data_vencimento', monthEnd.toISOString().slice(0, 10))
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresa?.id,
  });

  const { data: configEmbarcadores } = useQuery({
    queryKey: ['embarcador-configs-for-transportadora'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresa_config_financeira' as any)
        .select('empresa_id, antecipacao_permitida, taxa_antecipacao_percent, limite_credito, credito_utilizado');
      if (error) throw error;
      return (data as any[]).reduce((acc: Record<number, any>, c: any) => {
        acc[c.empresa_id] = c;
        return acc;
      }, {} as Record<number, any>);
    },
  });

  // Load bank details
  useQuery({
    queryKey: ['empresa-dados-bancarios', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data } = await supabase.from('empresas').select('dados_bancarios').eq('id', empresa.id).single();
      if (data?.dados_bancarios) {
        const db = data.dados_bancarios as any;
        setBankForm({ banco: db.banco || '', agencia: db.agencia || '', conta: db.conta || '', tipo_conta: db.tipo_conta || 'corrente', pix: db.pix || '', titular: db.titular || '' });
      }
      setBankLoaded(true);
      return data;
    },
    enabled: !!empresa?.id,
  });

  const saveBankMutation = useMutation({
    mutationFn: async () => {
      if (!empresa?.id) throw new Error('No empresa');
      const { error } = await supabase.from('empresas').update({ dados_bancarios: bankForm as any }).eq('id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Dados bancários salvos!'),
    onError: () => toast.error('Erro ao salvar dados bancários'),
  });

  const antecipacaoMutation = useMutation({
    mutationFn: async (recebivel: any) => {
      const cfg = configEmbarcadores?.[recebivel.empresa_embarcadora_id];
      if (!cfg?.antecipacao_permitida) throw new Error('Antecipação não permitida para este embarcador');
      const diasRestantes = differenceInDays(new Date(recebivel.data_vencimento), new Date());
      if (diasRestantes <= 0) throw new Error('Recebível já vencido');
      const taxa = cfg.taxa_antecipacao_percent || 2;
      const valorTaxa = Math.round(recebivel.valor_liquido * (taxa / 100) * 100) / 100;
      const { error } = await supabase
        .from('financeiro_entregas')
        .update({
          antecipado: true,
          data_antecipacao: new Date().toISOString(),
          taxa_antecipacao_percent: taxa,
          dias_antecipados: diasRestantes,
          valor_taxa_antecipacao: valorTaxa,
        })
        .eq('id', recebivel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportadora-financeiro'] });
      toast.success('Antecipação solicitada com sucesso!');
      setAntecipacaoDialog(null);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao solicitar antecipação'),
  });

  const canAntecipar = (r: any) => {
    if (r.status !== 'pendente' || r.antecipado) return false;
    if (!r.data_vencimento || differenceInDays(new Date(r.data_vencimento), new Date()) <= 0) return false;
    const cfg = configEmbarcadores?.[r.empresa_embarcadora_id];
    return cfg?.antecipacao_permitida === true;
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Recebíveis individuais — cada carga finalizada vence em D+30</p>
      </div>

      <Tabs defaultValue="calendario" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="w-4 h-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="anual" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Visão Anual
          </TabsTrigger>
          <TabsTrigger value="conta" className="gap-2">
            <Landmark className="w-4 h-4" /> Conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-0">
          <FinanceCalendar
            recebiveis={registros}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            perspective="transportadora"
            onAntecipar={(r) => setAntecipacaoDialog(r)}
            canAntecipar={canAntecipar}
          />
        </TabsContent>

        <TabsContent value="anual" className="mt-0">
          {empresa?.id && (
            <AnnualBarChart
              empresaId={empresa.id}
              filterColumn="empresa_transportadora_id"
              valueField="valor_liquido"
              year={currentMonth.getFullYear()}
            />
          )}
        </TabsContent>

        <TabsContent value="conta" className="space-y-6 mt-0">
          <Card className="border-border max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="w-5 h-5" /> Dados Bancários para Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titular da Conta</Label>
                <Input value={bankForm.titular} onChange={(e) => setBankForm(f => ({ ...f, titular: e.target.value }))} placeholder="Nome completo ou razão social" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banco</Label>
                  <Input value={bankForm.banco} onChange={(e) => setBankForm(f => ({ ...f, banco: e.target.value }))} placeholder="Ex: Bradesco" />
                </div>
                <div>
                  <Label>Tipo de Conta</Label>
                  <Select value={bankForm.tipo_conta} onValueChange={(v) => setBankForm(f => ({ ...f, tipo_conta: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agência</Label>
                  <Input value={bankForm.agencia} onChange={(e) => setBankForm(f => ({ ...f, agencia: e.target.value }))} placeholder="0001" />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input value={bankForm.conta} onChange={(e) => setBankForm(f => ({ ...f, conta: e.target.value }))} placeholder="12345-6" />
                </div>
              </div>
              <div>
                <Label>Chave PIX (preferencial)</Label>
                <Input value={bankForm.pix} onChange={(e) => setBankForm(f => ({ ...f, pix: e.target.value }))} placeholder="CPF, CNPJ, e-mail ou chave aleatória" />
              </div>
              <Button onClick={() => saveBankMutation.mutate()} disabled={saveBankMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveBankMutation.isPending ? 'Salvando...' : 'Salvar Dados Bancários'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Antecipação Dialog */}
      <Dialog open={!!antecipacaoDialog} onOpenChange={() => setAntecipacaoDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-chart-4" /> Solicitar Antecipação</DialogTitle></DialogHeader>
          {antecipacaoDialog && (() => {
            const cfg = configEmbarcadores?.[antecipacaoDialog.empresa_embarcadora_id];
            const taxa = cfg?.taxa_antecipacao_percent || 2;
            const valorLiquido = Number(antecipacaoDialog.valor_liquido);
            const valorTaxa = Math.round(valorLiquido * (taxa / 100) * 100) / 100;
            const valorFinal = valorLiquido - valorTaxa;
            const diasRestantes = differenceInDays(new Date(antecipacaoDialog.data_vencimento), new Date());

            return (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Carga: {antecipacaoDialog.entregas?.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento original: {format(new Date(antecipacaoDialog.data_vencimento), 'dd/MM/yyyy')} ({diasRestantes} dias restantes)
                  </p>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor líquido</span>
                    <span className="font-medium">{formatCurrency(valorLiquido)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de antecipação ({taxa}%)</span>
                    <span className="text-destructive">- {formatCurrency(valorTaxa)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Valor a receber</span>
                    <span className="text-lg font-bold text-chart-2">{formatCurrency(valorFinal)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-chart-4/10 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                  <p className="text-xs text-chart-4">
                    Ao confirmar, o valor será disponibilizado antecipadamente com desconto da taxa. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAntecipacaoDialog(null)}>Cancelar</Button>
            <Button className="bg-chart-4 hover:bg-chart-4/90 text-white" onClick={() => antecipacaoMutation.mutate(antecipacaoDialog)} disabled={antecipacaoMutation.isPending}>
              <Zap className="w-4 h-4 mr-1" />
              {antecipacaoMutation.isPending ? 'Processando...' : 'Confirmar Antecipação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
