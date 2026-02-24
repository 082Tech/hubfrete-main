import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Truck, MapPin, ArrowRight, CheckCircle, Package, User, Route,
  FileText, FileCheck, AlertTriangle, Ban, Clock, Scale, DollarSign,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { ViagemHistorico as ViagemHistoricoTimeline } from './ViagemHistorico';
import { supabase } from '@/integrations/supabase/client';

interface Entrega {
  id: string;
  codigo: string | null;
  status: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  ctes: { id: string }[];
  numero_cte: string | null;
  nfes: { id: string }[];
  canhoto_url: string | null;
  entregue_em: string | null;
  carga: {
    codigo: string;
    descricao: string;
    peso_kg: number;
    destinatario_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    empresa: { nome: string | null } | null;
    endereco_origem: { cidade: string; estado: string } | null;
    endereco_destino: { cidade: string; estado: string } | null;
  };
}

interface ViagemData {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  manifesto_url: string | null;
  km_total: number | null;
  mdfes?: { pdf_path: string | null }[];
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculo: {
    placa: string;
    tipo: string;
  } | null;
  entregas: Entrega[];
}

interface ViagemDetailsHistoricoDialogProps {
  viagem: ViagemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  finalizada: { label: 'Finalizada', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: Ban },
  aguardando: { label: 'Aguardando', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Truck },
};

const entregaStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-700', icon: Clock },
  saiu_para_coleta: { label: 'Coleta', color: 'bg-blue-100 text-blue-700', icon: Truck },
  saiu_para_entrega: { label: 'Em Rota', color: 'bg-purple-100 text-purple-700', icon: MapPin },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: Ban },
};

export function ViagemDetailsHistoricoDialog({ viagem, open, onOpenChange }: ViagemDetailsHistoricoDialogProps) {
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);

  useEffect(() => {
    if (!viagem || !open) return;
    // Fetch eventos for timeline
    const entregaIds = viagem.entregas.map(e => e.id);
    if (entregaIds.length === 0) { setEventos([]); return; }

    supabase
      .from('entrega_eventos')
      .select('id, tipo, timestamp, observacao, user_nome, entrega_id')
      .in('entrega_id', entregaIds)
      .order('timestamp', { ascending: true })
      .then(({ data }) => setEventos(data || []));
  }, [viagem, open]);

  if (!viagem) return null;

  const config = statusConfig[viagem.status] || statusConfig.finalizada;
  const StatusIcon = config.icon;

  const totalPeso = viagem.entregas.reduce((s, e) => s + (e.peso_alocado_kg || e.carga.peso_kg || 0), 0);
  const totalFrete = viagem.entregas.reduce((s, e) => s + (e.valor_frete || 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              <span className="font-mono">{viagem.codigo}</span>
              <Badge className={`${config.color} text-xs gap-1 ml-2`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4 space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{viagem.motorista?.nome_completo || '-'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Veículo</p>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{viagem.veiculo?.placa || '-'} • {viagem.veiculo?.tipo || '-'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Criada em</p>
                  <span className="text-sm">{format(new Date(viagem.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Encerrada em</p>
                  <span className="text-sm">
                    {viagem.ended_at
                      ? format(new Date(viagem.ended_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : format(new Date(viagem.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-border">
                  <CardContent className="p-3 text-center">
                    <Scale className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{totalPeso >= 1000 ? `${(totalPeso / 1000).toFixed(1)}t` : `${totalPeso} kg`}</p>
                    <p className="text-[10px] text-muted-foreground">Peso Total</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-3 text-center">
                    <DollarSign className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{formatCurrency(totalFrete)}</p>
                    <p className="text-[10px] text-muted-foreground">Frete Total</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-3 text-center">
                    <Route className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{viagem.km_total ? `${viagem.km_total.toLocaleString('pt-BR')} km` : '-'}</p>
                    <p className="text-[10px] text-muted-foreground">KM Total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Manifesto */}
              {(() => {
                const mdfe = viagem.mdfes?.find(m => m.pdf_path);
                const rawPath = mdfe?.pdf_path || viagem.manifesto_url;
                const isStoragePath = rawPath && !rawPath.startsWith('http');
                const manifestoUrl = isStoragePath
                  ? supabase.storage.from('documentos').getPublicUrl(rawPath!).data.publicUrl
                  : rawPath;
                return (
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Manifesto MDF-e</span>
                    </div>
                    {manifestoUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-600"
                        onClick={() => { setFilePreviewUrl(manifestoUrl); setFilePreviewOpen(true); }}
                      >
                        <FileCheck className="w-3 h-3" />
                        Ver Manifesto
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* Entregas */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Entregas ({viagem.entregas.length})</span>
                </div>
                <div className="space-y-2">
                  {viagem.entregas.map(entrega => {
                    const eConfig = entregaStatusConfig[entrega.status || 'aguardando'] || entregaStatusConfig.aguardando;
                    const EIcon = eConfig.icon;
                    const origem = entrega.carga.endereco_origem;
                    const destino = entrega.carga.endereco_destino;

                    return (
                      <Card key={entrega.id} className="border-border">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm font-medium text-primary">{entrega.codigo || entrega.carga.codigo}</span>
                            <Badge className={`${eConfig.color} text-xs`}>
                              <EIcon className="w-3 h-3 mr-1" />
                              {eConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{entrega.carga.descricao}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{origem?.cidade}/{origem?.estado || '-'}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{destino?.cidade}/{destino?.estado || '-'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Histórico de Eventos</span>
                </div>
                <ViagemHistoricoTimeline
                  viagem={{ id: viagem.id, codigo: viagem.codigo, status: viagem.status, created_at: viagem.created_at }}
                  entregas={viagem.entregas.map(e => ({
                    id: e.id,
                    codigo: e.codigo || e.carga.codigo,
                    status: e.status || 'aguardando',
                    eventos: eventos.filter(ev => ev.entrega_id === e.id).map(ev => ({
                      id: ev.id,
                      tipo: ev.tipo,
                      timestamp: ev.timestamp,
                      observacao: ev.observacao,
                      user_nome: ev.user_nome,
                    })),
                  }))}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog
        open={filePreviewOpen}
        onOpenChange={setFilePreviewOpen}
        fileUrl={filePreviewUrl}
        title="Manifesto MDF-e"
      />
    </>
  );
}
