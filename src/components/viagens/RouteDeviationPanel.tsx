import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, MapPin, Clock, Loader2, BarChart3, RefreshCw } from 'lucide-react';
import { fetchDeviationMetrics, processRouteDeviationAudit } from '@/lib/routeDeviationService';
import { toast } from 'sonner';

interface RouteDeviationPanelProps {
  viagemId: string;
  polyline: string | null;
  viagemStatus: string;
}

export function RouteDeviationPanel({ viagemId, polyline, viagemStatus }: RouteDeviationPanelProps) {
  const queryClient = useQueryClient();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['deviation-metrics', viagemId],
    queryFn: () => fetchDeviationMetrics(viagemId),
    enabled: !!viagemId,
  });

  const processMutation = useMutation({
    mutationFn: () => {
      if (!polyline) throw new Error('Rota planejada não disponível');
      return processRouteDeviationAudit(viagemId, polyline);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Auditoria processada: ${result.pointsAnalyzed} pontos analisados`);
        queryClient.invalidateQueries({ queryKey: ['deviation-metrics', viagemId] });
      } else {
        toast.error(`Erro: ${result.error}`);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isFinished = ['finalizada', 'concluida'].includes(viagemStatus);
  const canProcess = isFinished && !!polyline;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics && !canProcess) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {!polyline
            ? 'Nenhuma rota planejada registrada para esta viagem.'
            : 'A auditoria de desvio estará disponível após a finalização da viagem.'}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Auditoria de Rota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            A viagem foi finalizada. Processe a auditoria para comparar o trajeto real com a rota planejada.
          </p>
          <Button
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            size="sm"
          >
            {processMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
            ) : (
              <><BarChart3 className="h-4 w-4 mr-2" />Processar Auditoria</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const m = metrics as any;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Auditoria de Rota
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending || !canProcess}
            title="Reprocessar auditoria"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${processMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={m.percentual_fora_rota > 10 ? 'destructive' : 'secondary'} className="gap-1">
            {m.percentual_fora_rota > 10 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
            {m.percentual_fora_rota}% fora da rota
          </Badge>
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {m.total_pontos_analisados} pontos
          </Badge>
          {m.tempo_total_fora_rota_minutos > 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {m.tempo_total_fora_rota_minutos} min fora
            </Badge>
          )}
        </div>

        <Separator />

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Maior desvio</p>
            <p className="font-medium">
              {m.maior_distancia_desvio_metros >= 1000
                ? `${(m.maior_distancia_desvio_metros / 1000).toFixed(1)} km`
                : `${m.maior_distancia_desvio_metros} m`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Pontos fora rota</p>
            <p className="font-medium">{m.total_pontos_fora_rota}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Leve desvio</p>
            <p className="font-medium">{m.total_pontos_leve_desvio}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Trechos com desvio</p>
            <p className="font-medium">{(m.trechos_desvio as any[])?.length ?? 0}</p>
          </div>
        </div>

        {/* Deviation stretches */}
        {(m.trechos_desvio as any[])?.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Trechos de desvio</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(m.trechos_desvio as any[]).map((t: any, i: number) => (
                  <div key={i} className="text-xs border rounded-md p-2 bg-destructive/5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trecho {i + 1}</span>
                      <Badge variant="destructive" className="text-[10px] h-4">
                        {t.distancia_max_metros >= 1000
                          ? `${(t.distancia_max_metros / 1000).toFixed(1)}km`
                          : `${t.distancia_max_metros}m`}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Duração: {t.duracao_minutos} min
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
