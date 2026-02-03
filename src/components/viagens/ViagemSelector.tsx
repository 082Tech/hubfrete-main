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
  Loader2
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
}

export function ViagemSelector({
  motoristaId,
  onViagemSelect,
  selectedViagemId,
}: ViagemSelectorProps) {
  // Fetch viagens em andamento do motorista
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
        .eq('status', 'em_andamento')
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

  // Lógica automática: se tem viagem, seleciona; se não tem, passa null (vai criar nova)
  useEffect(() => {
    if (isLoadingViagens) return;
    
    if (viagens.length > 0) {
      // Tem viagem ativa - seleciona automaticamente a primeira
      onViagemSelect(viagens[0].id);
    } else {
      // Não tem viagem - passa null para criar uma nova
      onViagemSelect(null);
    }
  }, [viagens, isLoadingViagens, onViagemSelect]);

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

  const viagemAtiva = viagens.length > 0 ? viagens[0] : null;

  return (
    <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <span className="font-semibold">Viagem</span>
        </div>
      </div>

      {viagemAtiva ? (
        <>
          <p className="text-sm text-muted-foreground">
            Esta entrega será adicionada à viagem ativa do motorista.
          </p>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                    <Route className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{viagemAtiva.codigo}</p>
                    <p className="text-xs text-muted-foreground">
                      Criada em {format(new Date(viagemAtiva.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Package className="w-3 h-3" />
                    {viagemAtiva.entregas_count} {viagemAtiva.entregas_count === 1 ? 'entrega' : 'entregas'}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="gap-1 bg-chart-2/10 text-chart-2 border-chart-2/30"
                  >
                    <Clock className="w-3 h-3" />
                    Em andamento
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plus className="w-4 h-4 text-primary" />
          <span>Uma nova viagem será criada automaticamente para este motorista.</span>
        </div>
      )}
    </div>
  );
}

export default ViagemSelector;
