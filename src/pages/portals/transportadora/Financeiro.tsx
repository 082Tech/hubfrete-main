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
import { Textarea } from '@/components/ui/textarea';
import {
  Landmark, Save, Zap, Calendar, BarChart3, AlertTriangle,
  Clock, CheckCircle, TrendingUp, XCircle, Loader2, ListChecks,
} from 'lucide-react';
import { format, endOfMonth, startOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/reportExport';
import { FinanceCalendar } from '@/components/financeiro/FinanceCalendar';
import { AnnualBarChart } from '@/components/financeiro/AnnualBarChart';

export default function TransportadoraFinanceiro() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [antecipacaoDialog, setAntecipacaoDialog] = useState<any | null>(null);
  const [observacoes, setObservacoes] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  

  const { data: registros = [] } = useQuery({
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
        .select('empresa_id, taxa_antecipacao_percent');
      if (error) throw error;
      return (data as any[]).reduce((acc: Record<number, any>, c: any) => {
        acc[c.empresa_id] = c;
        return acc;
      }, {} as Record<number, any>);
    },
  });

  // Fetch existing solicitações to know which are already requested
  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['transportadora-solicitacoes-antecipacao', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('solicitacoes_antecipacao' as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresa?.id,
  });

  const solicitacaoByFinanceiroId = (solicitacoes || []).reduce((acc: Record<string, any>, s: any) => {
    acc[s.financeiro_entrega_id] = s;
    return acc;
  }, {} as Record<string, any>);

  

  const antecipacaoMutation = useMutation({
    mutationFn: async (recebivel: any) => {
      const diasRestantes = differenceInDays(new Date(recebivel.data_vencimento), new Date());
      if (diasRestantes <= 0) throw new Error('Recebível já vencido');
      const cfg = configEmbarcadores?.[recebivel.empresa_embarcadora_id];
      const taxa = cfg?.taxa_antecipacao_percent || 2;
      const valorLiquido = Number(recebivel.valor_liquido);
      const valorTaxa = Math.round(valorLiquido * (taxa / 100) * 100) / 100;
      const valorFinal = valorLiquido - valorTaxa;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('solicitacoes_antecipacao' as any)
        .insert({
          financeiro_entrega_id: recebivel.id,
          solicitante_user_id: user.id,
          solicitante_tipo: 'transportadora',
          empresa_id: empresa?.id,
          valor_original: valorLiquido,
          taxa_percent: taxa,
          valor_taxa: valorTaxa,
          valor_final: valorFinal,
          dias_antecipados: diasRestantes,
          data_vencimento_original: recebivel.data_vencimento,
          status: 'pendente',
          observacoes: observacoes || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportadora-solicitacoes-antecipacao'] });
      toast.success('Solicitação de antecipação enviada! Aguarde aprovação.');
      setAntecipacaoDialog(null);
      setObservacoes('');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao solicitar antecipação'),
  });

  const canAntecipar = (r: any) => {
    if (r.status !== 'pendente' || r.antecipado) return false;
    if (!r.data_vencimento || differenceInDays(new Date(r.data_vencimento), new Date()) <= 0) return false;
    // Already has a pending or approved request
    const existing = solicitacaoByFinanceiroId[r.id];
    if (existing && (existing.status === 'pendente' || existing.status === 'aprovada')) return false;
    return true;
  };

  const getSolicitacaoStatus = (recebivelId: string) => {
    return solicitacaoByFinanceiroId[recebivelId] || null;
  };

  const totalPendente = registros.filter(r => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.valor_liquido), 0);
  const totalRecebido = registros.filter(r => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_liquido), 0);
  const totalAntecipados = registros.filter(r => r.antecipado).length;
  const pendingSolicitacoes = solicitacoes.filter((s: any) => s.status === 'pendente').length;
  const countPendente = registros.filter(r => r.status === 'pendente').length;

  return (
    <div className="h-full overflow-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Recebíveis faturados D+30 por carga finalizada</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-chart-4/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPendente)}</p>
              <p className="text-[10px] text-muted-foreground">{countPendente} a receber</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-chart-2" />
            </div>
            <div>
              <p className="text-lg font-bold text-chart-2">{formatCurrency(totalRecebido)}</p>
              <p className="text-[10px] text-muted-foreground">Recebido no mês</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPendente + totalRecebido)}</p>
              <p className="text-[10px] text-muted-foreground">Total do mês</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-chart-4/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-chart-4">{totalAntecipados}</p>
              <p className="text-[10px] text-muted-foreground">
                Antecipados
                {pendingSolicitacoes > 0 && (
                  <span className="text-primary ml-1">({pendingSolicitacoes} pendente{pendingSolicitacoes > 1 ? 's' : ''})</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendario" className="space-y-3">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="w-4 h-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="gap-2 relative">
            <ListChecks className="w-4 h-4" /> Solicitações
            {pendingSolicitacoes > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                {pendingSolicitacoes}
              </span>
            )}
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
            perspective="transportadora"
            onAntecipar={(r) => { setAntecipacaoDialog(r); setObservacoes(''); }}
            canAntecipar={canAntecipar}
          />
        </TabsContent>

        <TabsContent value="solicitacoes" className="mt-0">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-chart-4" /> Minhas Solicitações de Antecipação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solicitacoes.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação realizada</p>
                  <p className="text-xs text-muted-foreground mt-1">Use o calendário para solicitar antecipação de recebíveis</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {solicitacoes.map((s: any) => {
                    const statusConfig = {
                      pendente: { label: 'Aguardando', icon: Clock, color: 'bg-chart-4 text-white' },
                      aprovada: { label: 'Aprovada', icon: CheckCircle, color: 'bg-chart-2 text-white' },
                      rejeitada: { label: 'Rejeitada', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
                    }[s.status as string] || { label: s.status, icon: Clock, color: 'bg-muted' };

                    return (
                      <div key={s.id} className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${statusConfig.color} text-[10px]`}>
                              <statusConfig.icon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(s.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Venc. original: {format(new Date(s.data_vencimento_original), 'dd/MM/yy')} · {s.dias_antecipados}d antecipado
                          </p>
                          {s.motivo_rejeicao && (
                            <p className="text-xs text-destructive mt-1">Motivo: {s.motivo_rejeicao}</p>
                          )}
                          {s.observacoes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{s.observacoes}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground line-through">{formatCurrency(s.valor_original)}</p>
                          <p className="text-sm font-bold text-chart-2">{formatCurrency(s.valor_final)}</p>
                          <p className="text-[10px] text-muted-foreground">taxa {s.taxa_percent}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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

        
      </Tabs>

      {/* Antecipação Dialog */}
      <Dialog open={!!antecipacaoDialog} onOpenChange={() => setAntecipacaoDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-chart-4" /> Solicitar Antecipação
            </DialogTitle>
          </DialogHeader>
          {antecipacaoDialog && (() => {
            const cfg = configEmbarcadores?.[antecipacaoDialog.empresa_embarcadora_id];
            const taxa = cfg?.taxa_antecipacao_percent || 2;
            const diasRestantes = differenceInDays(new Date(antecipacaoDialog.data_vencimento), new Date());
            const valorLiquido = Number(antecipacaoDialog.valor_liquido);
            const valorTaxa = Math.round(valorLiquido * (taxa / 100) * 100) / 100;
            const valorFinal = valorLiquido - valorTaxa;

            return (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg space-y-1.5">
                  <p className="text-sm font-medium">Carga: {antecipacaoDialog.entregas?.codigo || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {format(new Date(antecipacaoDialog.data_vencimento), 'dd/MM/yyyy')} ({diasRestantes}d restantes)
                  </p>
                </div>

                <div className="space-y-2 p-3 rounded-lg border border-chart-4/30 bg-chart-4/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor líquido</span>
                    <span className="font-medium">{formatCurrency(valorLiquido)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa ({taxa}%)</span>
                    <span className="font-medium text-destructive">- {formatCurrency(valorTaxa)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Valor antecipado</span>
                    <span className="font-bold text-chart-2 text-lg">{formatCurrency(valorFinal)}</span>
                  </div>
                </div>

                <div>
                  <Label>Observações (opcional)</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: Urgência para pagamento de despesas operacionais" rows={2} />
                </div>

                <p className="text-[10px] text-muted-foreground">
                  A solicitação será analisada pela equipe HubFrete. Você receberá uma notificação com a resposta.
                </p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAntecipacaoDialog(null)}>Cancelar</Button>
            <Button
              className="bg-chart-4 hover:bg-chart-4/90 text-white"
              onClick={() => antecipacaoMutation.mutate(antecipacaoDialog)}
              disabled={antecipacaoMutation.isPending}
            >
              {antecipacaoMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Solicitar Antecipação</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
