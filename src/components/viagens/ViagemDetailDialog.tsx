import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Route, Truck, User, MapPin, Package, Clock, CheckCircle, XCircle,
  AlertCircle, ArrowRightLeft, Loader2, Map, BarChart3, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViagemTrackingMapDialog } from '@/components/maps/ViagemTrackingMapDialog';
import { EventTimeline } from '@/components/shared/EventTimeline';
import { RouteDeviationPanel } from '@/components/viagens/RouteDeviationPanel';
import { SmartRoutingPanel } from '@/components/viagens/SmartRoutingPanel';
import { useSmartRouting } from '@/hooks/useSmartRouting';
import type { DeliveryForRouting } from '@/lib/smartRouting';

interface ViagemDetailDialogProps {
  entregaId: string | null;
  onClose: () => void;
}

const statusViagemConfig: Record<string, { label: string; color: string }> = {
  planejada: { label: 'Planejada', color: 'bg-muted text-muted-foreground' },
  programada: { label: 'Programada', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  aguardando: { label: 'Aguardando', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pausada: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusEntregaConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando', icon: Clock },
  saiu_para_coleta: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Saiu p/ Coleta', icon: Package },
  em_transito: { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', label: 'Em Trânsito', icon: ArrowRightLeft },
  saiu_para_entrega: { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Saiu p/ Entrega', icon: Truck },
  entregue: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Concluída', icon: CheckCircle },
  problema: { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Problema', icon: AlertCircle },
  cancelada: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Cancelada', icon: XCircle },
};

export function ViagemDetailDialog({ entregaId, onClose }: ViagemDetailDialogProps) {
  const [showTrackingMap, setShowTrackingMap] = useState(false);

  // 1. Find viagem for entrega
  const { data: viagemLink, isLoading: linkLoading } = useQuery({
    queryKey: ['viagem-link-for-entrega', entregaId],
    queryFn: async () => {
      if (!entregaId) return null;
      const { data } = await supabase
        .from('viagem_entregas')
        .select('viagem_id')
        .eq('entrega_id', entregaId)
        .maybeSingle();
      return data;
    },
    enabled: !!entregaId,
  });

  const viagemId = viagemLink?.viagem_id || null;

  // 2. Fetch viagem details
  const { data: viagem, isLoading: viagemLoading } = useQuery({
    queryKey: ['viagem-detail-dialog', viagemId],
    queryFn: async () => {
      if (!viagemId) return null;
      const { data, error } = await supabase
        .from('viagens')
        .select(`
          id, codigo, status, created_at, started_at, ended_at,
          rota_planejada_polyline, distancia_planejada_km, tempo_estimado_minutos,
          motorista:motoristas!viagens_motorista_id_fkey(id, nome_completo, telefone, foto_url),
          veiculo:veiculos!viagens_veiculo_id_fkey(id, placa, tipo, modelo)
        `)
        .eq('id', viagemId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!viagemId,
  });

  // 3. Fetch all entregas in this viagem
  const { data: viagemEntregas = [] } = useQuery({
    queryKey: ['viagem-entregas-dialog', viagemId],
    queryFn: async () => {
      if (!viagemId) return [];
      const { data: links } = await supabase
        .from('viagem_entregas')
        .select('entrega_id')
        .eq('viagem_id', viagemId);
      if (!links?.length) return [];

      const entregaIds = links.map(l => l.entrega_id);
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id, codigo, status, valor_frete, peso_alocado_kg,
          carga:cargas(
            codigo, descricao,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado)
          )
        `)
        .in('id', entregaIds);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!viagemId,
  });

  // 4. Fetch entrega eventos for timeline
  const { data: eventos = [] } = useQuery({
    queryKey: ['viagem-entrega-eventos', viagemId],
    queryFn: async () => {
      if (!viagemEntregas.length) return [];
      const ids = viagemEntregas.map(e => e.id);
      const { data } = await supabase
        .from('entrega_eventos')
        .select('*')
        .in('entrega_id', ids)
        .order('timestamp', { ascending: false });
      return data || [];
    },
    enabled: viagemEntregas.length > 0,
  });

  const isLoading = linkLoading || viagemLoading;
  const isOpen = !!entregaId;
  const noViagem = !isLoading && !viagemId;

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (v: number | null) => {
    if (!v) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              {viagem ? `Viagem ${viagem.codigo}` : 'Detalhes da Viagem'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-5rem)]">
            <div className="px-6 pb-6 space-y-5">
              {isLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {noViagem && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Sem viagem vinculada</p>
                  <p className="text-sm">Esta carga ainda não foi atribuída a uma viagem.</p>
                </div>
              )}

              {viagem && (
                <>
                  {/* Viagem header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Badge className={statusViagemConfig[viagem.status]?.color || 'bg-muted'}>
                        {statusViagemConfig[viagem.status]?.label || viagem.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Criada em {formatDate(viagem.created_at)}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setShowTrackingMap(true)}>
                      <Map className="w-4 h-4 mr-2" />
                      Ver Rastreamento
                    </Button>
                  </div>

                  {/* Driver & Vehicle */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={viagem.motorista?.foto_url || undefined} />
                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{viagem.motorista?.nome_completo || '-'}</p>
                        <p className="text-xs text-muted-foreground">Motorista</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium font-mono">{viagem.veiculo?.placa || '-'}</p>
                        <p className="text-xs text-muted-foreground">{viagem.veiculo?.modelo || viagem.veiculo?.tipo || 'Veículo'}</p>
                      </div>
                    </div>
                  </div>

                  {viagem.started_at && (
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Início: {formatDate(viagem.started_at)}</span>
                      {viagem.ended_at && <span>Fim: {formatDate(viagem.ended_at)}</span>}
                    </div>
                  )}

                  <Separator />

                  <Tabs defaultValue="cargas" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="cargas" className="flex-1">
                        <Package className="w-4 h-4 mr-1.5" />
                        Cargas ({viagemEntregas.length})
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="flex-1">
                        <Clock className="w-4 h-4 mr-1.5" />
                        Timeline ({eventos.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="cargas" className="mt-4 space-y-3">
                      {viagemEntregas.map((entrega: any) => {
                        const sc = statusEntregaConfig[entrega.status || ''] || statusEntregaConfig.aguardando;
                        const StatusIcon = sc.icon;
                        const isCurrentEntrega = entrega.id === entregaId;
                        return (
                          <div
                            key={entrega.id}
                            className={`p-3 rounded-lg border ${isCurrentEntrega ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">{entrega.codigo || '-'}</span>
                                {isCurrentEntrega && (
                                  <Badge variant="outline" className="text-xs">atual</Badge>
                                )}
                              </div>
                              <Badge className={`${sc.color} border text-xs`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {sc.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{entrega.carga?.descricao}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 text-green-500" />
                              <span>{entrega.carga?.endereco_origem?.cidade}/{entrega.carga?.endereco_origem?.estado}</span>
                              <span>→</span>
                              <MapPin className="w-3 h-3 text-red-500" />
                              <span>{entrega.carga?.endereco_destino?.cidade}/{entrega.carga?.endereco_destino?.estado}</span>
                              {entrega.valor_frete && (
                                <span className="ml-auto font-medium">{formatCurrency(entrega.valor_frete)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="timeline" className="mt-4">
                      {eventos.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">Nenhum evento registrado</p>
                      ) : (
                        <EventTimeline
                          events={eventos.map((e: any) => ({
                            id: e.id,
                            tipo: e.tipo,
                            timestamp: e.timestamp,
                            observacao: e.observacao,
                            user_nome: e.user_nome,
                          }))}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Tracking map sub-dialog */}
      <ViagemTrackingMapDialog
        viagemId={showTrackingMap ? viagemId : null}
        info={viagem ? {
          motorista: viagem.motorista?.nome_completo || '-',
          placa: viagem.veiculo?.placa || '-',
          codigo: viagem.codigo || '-',
        } : null}
        onClose={() => setShowTrackingMap(false)}
      />
    </>
  );
}
