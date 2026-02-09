import { useState, useMemo, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Truck, MapPin, ArrowRight, CheckCircle, XCircle, FileText, Package,
  Share, Printer, X, Weight, DollarSign, Clock, Upload, History,
  Loader2, MoreVertical, Ban, Paperclip, AlertTriangle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AnexarManifestoViagemDialog } from './AnexarManifestoViagemDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { ViagemMultiPointMap } from '@/components/maps/ViagemMultiPointMap';
import { ViagemHistorico } from './ViagemHistorico';
import { fetchAllTrackingHistoricoByViagemId } from '@/lib/fetchAllTrackingHistorico';
import { supabase } from '@/integrations/supabase/client';
interface ViagemEntregaEvento {
  id: string;
  tipo: string;
  timestamp: string;
  observacao: string | null;
  user_nome: string | null;
}

interface ViagemEntrega {
  id: string;
  codigo: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  peso_alocado_kg?: number | null;
  valor_frete?: number | null;
  notas_fiscais_urls?: string[] | null;
  cte_url?: string | null;
  canhoto_url?: string | null;
  eventos?: ViagemEntregaEvento[];
  carga: {
    descricao: string;
    endereco_origem?: { cidade: string; estado: string; latitude?: number | null; longitude?: number | null } | null;
    endereco_destino?: { cidade: string; estado: string; latitude?: number | null; longitude?: number | null } | null;
  };
}

interface ViagemDetailPanelProps {
  viagem: {
    id: string;
    codigo: string;
    status: string;
    created_at: string;
    updated_at?: string;
    started_at?: string | null;
    ended_at?: string | null;
    manifesto_url?: string | null;
    motorista?: {
      id: string;
      nome_completo: string;
      telefone?: string | null;
      foto_url?: string | null;
    } | null;
    veiculo?: {
      placa: string;
      modelo?: string | null;
    } | null;
    entregas: ViagemEntrega[];
  } | null;
  onClose: () => void;
  onSelectEntrega: (entregaId: string) => void;
  onRefresh: () => void;
  driverLocation?: { lat: number; lng: number; heading?: number | null; isOnline?: boolean; updated_at?: string | null } | null;
  onStart?: (viagemId: string) => Promise<void>;
  onFinalize?: (viagemId: string) => Promise<void>;
  onCancel?: (viagemId: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: Truck },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: MapPin },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

const viagemStatusConfig: Record<string, { label: string; color: string }> = {
  programada: { label: 'Programada', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  aguardando: { label: 'Aguardando', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export function ViagemDetailPanel({
  viagem,
  onClose,
  onSelectEntrega,
  onRefresh,
  driverLocation,
  onStart,
  onFinalize,
  onCancel,
}: ViagemDetailPanelProps) {
  const [anexarManifestoOpen, setAnexarManifestoOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  // iniciarDialogOpen removed - trips now start as aguardando
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isProcessingViagem, setIsProcessingViagem] = useState(false);
  const [trackingPoints, setTrackingPoints] = useState<Array<{ lat: number; lng: number; tracked_at: string; speed: number | null; status: string | null }>>([]);

  // Fetch tracking history for map dots
  useEffect(() => {
    if (!viagem?.id) return;
    fetchAllTrackingHistoricoByViagemId(viagem.id, { maxRows: 5000 })
      .then(rows => setTrackingPoints(rows.map(r => ({
        lat: r.latitude,
        lng: r.longitude,
        tracked_at: r.tracked_at,
        speed: r.speed,
        status: r.status,
      }))))
      .catch(() => setTrackingPoints([]));
  }, [viagem?.id]);

  // Status flags
  const isViagemAguardando = viagem?.status === 'aguardando';
  const isViagemEmAndamento = viagem?.status === 'em_andamento';
  const isViagemFinalized = viagem?.status === 'finalizada' || viagem?.status === 'cancelada';

  // Verificar se todas as entregas estão finalizadas (entregue ou cancelada)
  const entregasValidation = useMemo(() => {
    if (!viagem) return { canFinalize: false, pendingCount: 0, pendingEntregas: [] };

    const pendingEntregas = viagem.entregas.filter(
      e => e.status !== 'entregue' && e.status !== 'cancelada'
    );

    return {
      canFinalize: pendingEntregas.length === 0,
      pendingCount: pendingEntregas.length,
      pendingEntregas: pendingEntregas.map(e => e.codigo),
    };
  }, [viagem]);

  // handleIniciarViagem removed - trips now start as aguardando automatically

  const handleFinalizarViagem = async () => {
    if (!viagem || !onFinalize) return;
    
    setIsProcessingViagem(true);
    try {
      await onFinalize(viagem.id);
      toast.success('Viagem finalizada com sucesso');
      setFinalizarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao finalizar viagem');
    } finally {
      setIsProcessingViagem(false);
    }
  };

  const handleCancelarViagem = async () => {
    if (!viagem || !onCancel) return;
    
    setIsProcessingViagem(true);
    try {
      await onCancel(viagem.id);
      toast.success('Viagem cancelada');
      setCancelDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao cancelar viagem');
    } finally {
      setIsProcessingViagem(false);
    }
  };

  if (!viagem) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center justify-center text-muted-foreground px-8 py-12">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm text-center">Selecione uma viagem para ver os detalhes</p>
        </div>
      </div>
    );
  }

  const viagemStatus = viagemStatusConfig[viagem.status] || viagemStatusConfig.em_andamento;

  // Resumo de documentos das entregas
  const docsResumo = viagem.entregas.map(e => ({
    codigo: e.codigo,
    cte: !!e.cte_url,
    nfe: (e.notas_fiscais_urls?.length || 0) > 0,
    pod: !!e.canhoto_url,
  }));

  // Preparar pontos para o mapa multi-ponto
  const mapEntregas = viagem.entregas.map(e => ({
    id: e.id,
    codigo: e.codigo,
    status: e.status,
    origem: e.carga.endereco_origem?.latitude && e.carga.endereco_origem?.longitude
      ? { lat: e.carga.endereco_origem.latitude, lng: e.carga.endereco_origem.longitude }
      : null,
    destino: e.carga.endereco_destino?.latitude && e.carga.endereco_destino?.longitude
      ? { lat: e.carga.endereco_destino.latitude, lng: e.carga.endereco_destino.longitude }
      : null,
  }));

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Viagem</span>
            <Badge variant="outline" className="font-mono font-bold text-xs px-2 border-primary text-primary">
              {viagem.codigo}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Share className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          Criada {format(new Date(viagem.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
        </p>

        {/* Status banner */}
        <div className={`rounded-md px-3 py-1.5 text-center text-sm ${viagemStatus.color}`}>
          <span className="font-semibold flex items-center justify-center gap-2">
            <Truck className="w-3.5 h-3.5" />
            {viagemStatus.label} há {formatDistanceToNow(new Date(
              ['finalizada', 'cancelada'].includes(viagem.status) && viagem.updated_at
                ? viagem.updated_at
                : viagem.created_at
            ), { locale: ptBR })}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Entregas desta Viagem (above map for context) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Entregas desta Viagem ({viagem.entregas.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {viagem.entregas.map(entrega => {
                const eStatusInfo = statusConfig[entrega.status] || statusConfig.aguardando;
                const StatusIcon = eStatusInfo.icon;
                const missingDocs: string[] = [];
                if (!entrega.notas_fiscais_urls?.length) missingDocs.push('NF-e');
                if (!entrega.cte_url) missingDocs.push('CT-e');
                if (!entrega.canhoto_url) missingDocs.push('Canhoto');
                return (
                  <Card
                    key={`summary-${entrega.id}`}
                    className="shadow-none hover:shadow-sm transition-all cursor-pointer border"
                    onClick={() => onSelectEntrega(entrega.id)}
                  >
                    <CardContent className="p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono font-bold shrink-0 border-primary/40 text-primary">
                          {entrega.codigo}
                        </Badge>
                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0.5 gap-1 shrink-0 ${eStatusInfo.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {eStatusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {entrega.carga.endereco_origem?.cidade || '—'} → {entrega.carga.endereco_destino?.cidade || '—'}
                        </span>
                      </div>
                      {missingDocs.length > 0 && entrega.status !== 'cancelada' && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{missingDocs.join(', ')} pendente{missingDocs.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Mapa Multi-Ponto with tracking dots */}
          <div className="relative z-0">
            <ViagemMultiPointMap
              entregas={mapEntregas}
              driverLocation={driverLocation}
              trackingPoints={trackingPoints}
              height={260}
            />
          </div>

          {/* Motorista & Veículo */}
          {viagem.motorista && (
            <Card className="shadow-none border">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      {viagem.motorista.foto_url && <AvatarImage src={viagem.motorista.foto_url} />}
                      <AvatarFallback className="text-xs">{viagem.motorista.nome_completo?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      driverLocation?.isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{viagem.motorista.nome_completo}</p>
                    {viagem.veiculo && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Truck className="w-3 h-3" />
                        <span>{viagem.veiculo.placa}</span>
                        {viagem.veiculo.modelo && <span>• {viagem.veiculo.modelo}</span>}
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    driverLocation?.isOnline
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${driverLocation?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    {driverLocation?.isOnline ? 'Online' : (() => {
                      const lastSeen = driverLocation?.updated_at;
                      if (!lastSeen) return 'Offline';
                      const text = formatDistanceToNow(new Date(lastSeen), { locale: ptBR, addSuffix: false });
                      return `Offline há ${text}`;
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Documentos da Viagem */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-xs">Documentos da Viagem</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => viagem.manifesto_url ? setPreviewDocUrl(viagem.manifesto_url) : setAnexarManifestoOpen(true)}
                className={`flex items-center justify-between gap-2 p-2 rounded-md border text-xs transition-colors text-left ${
                  viagem.manifesto_url 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-900/30 cursor-pointer' 
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:hover:bg-amber-900/30 cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  {viagem.manifesto_url ? (
                    <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <Upload className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>Manifesto (MDF-e)</span>
                </span>
                {!viagem.manifesto_url && (
                  <span className="text-amber-600 dark:text-amber-400 text-[10px]">Clique para anexar</span>
                )}
              </button>
            </div>
          </div>

          <Separator />

          {/* Resumo de Documentos das Entregas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-xs">Documentos das Entregas</span>
            </div>
            <div className="space-y-1 text-xs">
              {docsResumo.map(doc => (
                <div key={doc.codigo} className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] px-1">{doc.codigo}</Badge>
                  <span>CT-e {doc.cte ? '✓' : '✗'}</span>
                  <span>NF-e {doc.nfe ? '✓' : '✗'}</span>
                  <span>POD {doc.pod ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          </div>



          {/* Histórico da Viagem */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Histórico da Viagem</span>
            </div>
            
            <ViagemHistorico
              viagem={{
                id: viagem.id,
                codigo: viagem.codigo,
                status: viagem.status,
                created_at: viagem.created_at,
                updated_at: viagem.updated_at,
                started_at: viagem.started_at,
                ended_at: viagem.ended_at,
              }}
              entregas={viagem.entregas}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer com botões de ação - baseado no status da viagem */}
      {!isViagemFinalized && (
        <div className="p-3 border-t bg-muted/30 flex items-center justify-between gap-2">
          {/* Menu de ações secundárias */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setAnexarManifestoOpen(true)}>
                <Paperclip className="w-4 h-4 mr-2" />
                Anexar Manifesto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setCancelDialogOpen(true)}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancelar viagem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão principal: Finalizar */}
          {(isViagemAguardando || isViagemEmAndamento) ? (
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={!entregasValidation.canFinalize || isProcessingViagem}
              onClick={() => setFinalizarDialogOpen(true)}
            >
              {isProcessingViagem ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Finalizar Viagem
            </Button>
          ) : null}
        </div>
      )}

      {/* Aviso de entregas pendentes (apenas em andamento) */}
      {(isViagemAguardando || isViagemEmAndamento) && !entregasValidation.canFinalize && (
        <div className="px-3 pb-3 mt-1">
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {entregasValidation.pendingCount} entrega{entregasValidation.pendingCount > 1 ? 's' : ''} pendente{entregasValidation.pendingCount > 1 ? 's' : ''}
              </p>
              <p className="text-amber-700 dark:text-amber-400">
                Finalize ou cancele as entregas antes de finalizar a viagem.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmação para finalizar viagem */}
      <AlertDialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Viagem</AlertDialogTitle>
            <AlertDialogDescription>
              {entregasValidation.canFinalize ? (
                <>
                  Tem certeza que deseja finalizar a viagem <strong>{viagem.codigo}</strong>?
                  <br /><br />
                  Todas as {viagem.entregas.length} entrega{viagem.entregas.length > 1 ? 's' : ''} estão finalizadas.
                </>
              ) : (
                <>
                  Não é possível finalizar a viagem.
                  <br /><br />
                  Existem {entregasValidation.pendingCount} entrega{entregasValidation.pendingCount > 1 ? 's' : ''} pendente{entregasValidation.pendingCount > 1 ? 's' : ''}: {entregasValidation.pendingEntregas.join(', ')}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingViagem}>Cancelar</AlertDialogCancel>
            {entregasValidation.canFinalize && (
              <AlertDialogAction
                onClick={handleFinalizarViagem}
                disabled={isProcessingViagem}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessingViagem && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Finalização
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para cancelar viagem */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Cancelar Viagem
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a viagem <strong>{viagem.codigo}</strong>?
              <br /><br />
              Esta ação é irreversível. Todas as entregas pendentes serão canceladas e o peso alocado será liberado nas cargas correspondentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingViagem}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelarViagem}
              disabled={isProcessingViagem}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessingViagem && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sim, Cancelar Viagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para anexar Manifesto */}
      <AnexarManifestoViagemDialog
        open={anexarManifestoOpen}
        onOpenChange={setAnexarManifestoOpen}
        viagemId={viagem.id}
        viagemCodigo={viagem.codigo}
        onSuccess={onRefresh}
      />

      {/* Preview de documento */}
      <FilePreviewDialog
        open={!!previewDocUrl}
        onOpenChange={() => setPreviewDocUrl(null)}
        fileUrl={previewDocUrl}
        title="Manifesto (MDF-e)"
      />
    </div>
  );
}
