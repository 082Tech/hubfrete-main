import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Route, 
  Plus, 
  Package, 
  Clock,
  Loader2,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Viagem {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  entregas_count: number;
}

interface ViagemSelectorProps {
  motoristaId: string;
  onViagemSelect: (viagemId: string | null) => void;
  selectedViagemId: string | null;
  /** Called when trip status blocks assignment */
  onBlockedChange?: (blocked: boolean) => void;
}

export function ViagemSelector({
  motoristaId,
  onViagemSelect,
  selectedViagemId,
  onBlockedChange,
}: ViagemSelectorProps) {
  // Fetch viagens aguardando e em_andamento do motorista
  const { data: viagens = [], isLoading: isLoadingViagens } = useQuery({
    queryKey: ['viagens_motorista', motoristaId],
    queryFn: async () => {
      if (!motoristaId) return [];

      const { data: viagensData, error } = await supabase
        .from('viagens')
        .select(`
          id,
          codigo,
          status,
          created_at,
          viagem_entregas(id)
        `)
        .eq('motorista_id', motoristaId)
        .in('status', ['programada', 'em_andamento'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (viagensData || []).map(v => ({
        id: v.id,
        codigo: v.codigo,
        status: v.status,
        created_at: v.created_at,
        entregas_count: (v.viagem_entregas as any[])?.length || 0,
      })) as Viagem[];
    },
    enabled: !!motoristaId,
  });

  const viagemEmAndamento = viagens.find(v => v.status === 'em_andamento') || null;
  const viagemProgramada = viagens.find(v => v.status === 'programada') || null;
  const isBlocked = !!viagemEmAndamento;

  // Notify parent about block status
  useEffect(() => {
    onBlockedChange?.(isBlocked);
  }, [isBlocked, onBlockedChange]);

  // Auto-select logic
  useEffect(() => {
    if (isLoadingViagens) return;
    
    if (isBlocked) {
      onViagemSelect(null);
    } else if (viagemProgramada) {
      onViagemSelect(viagemProgramada.id);
    } else {
      // No active trip - will create new
      onViagemSelect(null);
    }
  }, [viagens, isLoadingViagens, isBlocked, viagemProgramada, onViagemSelect]);

  if (isLoadingViagens) {
    return (
      <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <span className="font-semibold">Viagem</span>
        </div>
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Driver has a trip em_andamento → BLOCKED
  if (isBlocked && viagemEmAndamento) {
    return (
      <div className="space-y-3 p-4 bg-destructive/5 rounded-lg border border-destructive/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-destructive" />
            <span className="font-semibold text-destructive">Viagem</span>
          </div>
          <Badge variant="destructive" className="gap-1">
            <Ban className="w-3 h-3" />
            Bloqueado
          </Badge>
        </div>

        <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Motorista em viagem iniciada</p>
            <p className="text-muted-foreground mt-1">
              Este motorista já possui uma viagem em andamento. Não é possível adicionar novas cargas até que a viagem atual seja finalizada.
            </p>
          </div>
        </div>

        <Card className="bg-muted/50 border-destructive/20 opacity-75">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/20 text-destructive">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{viagemEmAndamento.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    Criada em {format(new Date(viagemEmAndamento.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Package className="w-3 h-3" />
                  {viagemEmAndamento.entregas_count} {viagemEmAndamento.entregas_count === 1 ? 'entrega' : 'entregas'}
                </Badge>
                <Badge className="gap-1 bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:bg-amber-900/30">
                  <Clock className="w-3 h-3" />
                  Em andamento
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has programada trip → can add to it
  if (viagemProgramada) {
    return (
      <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <span className="font-semibold">Viagem</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Esta entrega será adicionada à viagem programada do motorista.
        </p>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{viagemProgramada.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    Criada em {format(new Date(viagemProgramada.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Package className="w-3 h-3" />
                  {viagemProgramada.entregas_count} {viagemProgramada.entregas_count === 1 ? 'entrega' : 'entregas'}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="gap-1 bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700"
                >
                  <Clock className="w-3 h-3" />
                  Programada
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No active trip → will create new
  return (
    <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <span className="font-semibold">Viagem</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Plus className="w-4 h-4 text-primary" />
        <span>Uma nova viagem será criada automaticamente para este motorista.</span>
      </div>
    </div>
  );
}

export default ViagemSelector;
