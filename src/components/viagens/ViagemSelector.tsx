import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Route, 
  Plus, 
  Truck as TruckIcon, 
  Package, 
  Clock,
  CheckCircle,
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
  onNewViagem: (viagemId: string) => void;
  selectedViagemId: string | null;
  isCreatingViagem: boolean;
  onCreateViagemClick: () => void;
}

export function ViagemSelector({
  motoristaId,
  onViagemSelect,
  selectedViagemId,
  isCreatingViagem,
  onCreateViagemClick,
}: ViagemSelectorProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('new');

  // Fetch viagens em andamento do motorista
  const { data: viagens = [], isLoading: isLoadingViagens } = useQuery({
    queryKey: ['viagens_motorista', motoristaId],
    queryFn: async () => {
      if (!motoristaId) return [];

      // Fetch viagens em andamento para esse motorista
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

  // Quando tiver viagens disponíveis, permitir seleção
  const hasViagens = viagens.length > 0;

  // Auto-select first viagem if exists and none selected
  useMemo(() => {
    if (hasViagens && !selectedViagemId && mode === 'existing') {
      onViagemSelect(viagens[0].id);
    }
  }, [hasViagens, selectedViagemId, mode, viagens, onViagemSelect]);

  const handleModeChange = (value: string) => {
    const newMode = value as 'existing' | 'new';
    setMode(newMode);
    if (newMode === 'new') {
      onViagemSelect(null); // Clear selection when creating new
    } else if (viagens.length > 0) {
      onViagemSelect(viagens[0].id);
    }
  };

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

  return (
    <div className="space-y-4 p-4 bg-secondary/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <span className="font-semibold">Viagem</span>
        </div>
        {hasViagens && (
          <Badge variant="outline" className="text-xs">
            {viagens.length} viagem(ns) ativa(s)
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Vincule esta entrega a uma viagem do motorista. Você pode adicionar várias entregas na mesma viagem.
      </p>

      <RadioGroup value={mode} onValueChange={handleModeChange} className="space-y-3">
        {/* Nova Viagem */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="new" id="new-viagem" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="new-viagem" className="cursor-pointer">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span className="font-medium">Criar nova viagem</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Uma nova viagem será criada automaticamente para esta entrega
              </p>
            </Label>
          </div>
        </div>

        {/* Viagem Existente */}
        {hasViagens && (
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="existing" id="existing-viagem" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="existing-viagem" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-4 h-4 text-chart-2" />
                  <span className="font-medium">Adicionar a viagem existente</span>
                </div>
              </Label>
            </div>
          </div>
        )}
      </RadioGroup>

      {/* Lista de viagens existentes quando selecionado "existing" */}
      {mode === 'existing' && hasViagens && (
        <div className="space-y-2 mt-2 ml-6">
          {viagens.map((viagem) => (
            <Card 
              key={viagem.id} 
              className={`cursor-pointer transition-all ${
                selectedViagemId === viagem.id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onViagemSelect(viagem.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedViagemId === viagem.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {selectedViagemId === viagem.id ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Route className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{viagem.codigo}</p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {format(new Date(viagem.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Package className="w-3 h-3" />
                      {viagem.entregas_count} {viagem.entregas_count === 1 ? 'entrega' : 'entregas'}
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
          ))}
        </div>
      )}

      {/* Indicador visual do que acontecerá */}
      <Separator className="my-3" />
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {mode === 'new' ? (
          <>
            <Plus className="w-4 h-4 text-primary" />
            <span>Uma nova viagem será criada ao confirmar o aceite</span>
          </>
        ) : selectedViagemId ? (
          <>
            <CheckCircle className="w-4 h-4 text-chart-2" />
            <span>
              Entrega será adicionada à viagem <strong className="text-foreground">
                {viagens.find(v => v.id === selectedViagemId)?.codigo}
              </strong>
            </span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span>Selecione uma viagem acima</span>
          </>
        )}
      </div>
    </div>
  );
}

export default ViagemSelector;
