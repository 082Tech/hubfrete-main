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
        .in('status', ['aguardando', 'programada', 'em_andamento'])
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

  // Motoristas podem receber entregas mesmo com viagem em andamento
  const viagemDisponivel = viagens.find(v => v.status === 'em_andamento' || v.status === 'aguardando' || v.status === 'programada') || null;

  // Never blocked
  useEffect(() => {
    onBlockedChange?.(false);
  }, [onBlockedChange]);

  // Auto-select logic
  useEffect(() => {
    if (isLoadingViagens) return;
    
    if (viagemDisponivel) {
      onViagemSelect(viagemDisponivel.id);
    } else {
      onViagemSelect(null);
    }
  }, [viagens, isLoadingViagens, viagemDisponivel, onViagemSelect]);

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

  // Has available trip → can add to it
  if (viagemDisponivel) {
    const statusLabel = viagemDisponivel.status === 'em_andamento' 
      ? 'Em andamento' 
      : viagemDisponivel.status === 'programada' 
        ? 'Programada' 
        : 'Aguardando';
    
    const statusColors = viagemDisponivel.status === 'em_andamento'
      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
      : 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700';

    return (
      <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <span className="font-semibold">Viagem</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Esta entrega será adicionada à viagem existente do motorista.
        </p>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{viagemDisponivel.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    Criada em {format(new Date(viagemDisponivel.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Package className="w-3 h-3" />
                  {viagemDisponivel.entregas_count} {viagemDisponivel.entregas_count === 1 ? 'entrega' : 'entregas'}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`gap-1 ${statusColors}`}
                >
                  <Clock className="w-3 h-3" />
                  {statusLabel}
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
