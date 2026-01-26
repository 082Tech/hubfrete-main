import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Car, Container, Link2, Unlink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';

import { MotoristaCompleto, VeiculoSimples, CarroceriaSimples, tipoVeiculoLabels, tipoCarroceriaLabels } from './types';

interface MotoristaVinculosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaCompleto | null;
  veiculosDisponiveis: VeiculoSimples[];
  carroceriasDisponiveis: CarroceriaSimples[];
}

export function MotoristaVinculosDialog({
  open,
  onOpenChange,
  motorista,
  veiculosDisponiveis,
  carroceriasDisponiveis,
}: MotoristaVinculosDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState('');
  const [selectedCarroceriaId, setSelectedCarroceriaId] = useState('');

  // Fetch active deliveries for this driver
  const { data: entregasAtivas = [] } = useQuery({
    queryKey: ['entregas_ativas_motorista', motorista?.id],
    queryFn: async () => {
      if (!motorista?.id) return [];
      
      const { data, error } = await supabase
        .from('entregas')
        .select('id, veiculo_id')
        .eq('motorista_id', motorista.id)
        .in('status', ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!motorista?.id && open,
  });

  // Check if driver has active deliveries
  const hasActiveDeliveries = entregasAtivas.length > 0;

  // Get vehicles and carrocerias that are available (not assigned) or assigned to this driver
  const availableVeiculos = veiculosDisponiveis.filter(
    (v) => !v.motorista_id || v.motorista_id === motorista?.id
  );
  const availableCarrocerias = carroceriasDisponiveis.filter(
    (c) => !c.motorista_id || c.motorista_id === motorista?.id
  );

  const handleLinkVeiculo = async () => {
    if (!motorista || !selectedVeiculoId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('veiculos')
        .update({ motorista_id: motorista.id })
        .eq('id', selectedVeiculoId);

      if (error) throw error;

      toast.success('Veículo vinculado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos_disponiveis'] });
      setSelectedVeiculoId('');
    } catch (error) {
      console.error('Erro ao vincular veículo:', error);
      toast.error('Erro ao vincular veículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkVeiculo = async (veiculoId: string) => {
    // Check if driver has active deliveries using this vehicle
    const vehicleInUse = entregasAtivas.some(e => e.veiculo_id === veiculoId);
    if (vehicleInUse) {
      toast.error('Não é possível desvincular: veículo em uso em entrega ativa');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('veiculos')
        .update({ motorista_id: null })
        .eq('id', veiculoId);

      if (error) throw error;

      toast.success('Veículo desvinculado!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos_disponiveis'] });
    } catch (error) {
      console.error('Erro ao desvincular veículo:', error);
      toast.error('Erro ao desvincular veículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkCarroceria = async () => {
    if (!motorista || !selectedCarroceriaId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('carrocerias')
        .update({ motorista_id: motorista.id })
        .eq('id', selectedCarroceriaId);

      if (error) throw error;

      toast.success('Carroceria vinculada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['carrocerias_disponiveis'] });
      setSelectedCarroceriaId('');
    } catch (error) {
      console.error('Erro ao vincular carroceria:', error);
      toast.error('Erro ao vincular carroceria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkCarroceria = async (carroceriaId: string) => {
    // Check if driver has any active deliveries
    if (hasActiveDeliveries) {
      toast.error('Não é possível desvincular: motorista possui entregas ativas');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('carrocerias')
        .update({ motorista_id: null })
        .eq('id', carroceriaId);

      if (error) throw error;

      toast.success('Carroceria desvinculada!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['carrocerias_disponiveis'] });
    } catch (error) {
      console.error('Erro ao desvincular carroceria:', error);
      toast.error('Erro ao desvincular carroceria');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!motorista) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Gerenciar Vínculos
          </DialogTitle>
          <DialogDescription>
            Vincule ou desvincule veículos e carrocerias do motorista{' '}
            <strong>{motorista.nome_completo}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning if driver has active deliveries */}
          {hasActiveDeliveries && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Este motorista possui {entregasAtivas.length} entrega{entregasAtivas.length > 1 ? 's' : ''} ativa{entregasAtivas.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 ml-6">
                Não é possível desvincular veículos ou carrocerias enquanto houver entregas em andamento.
              </p>
            </div>
          )}

          {/* Veículos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Car className="w-4 h-4 text-primary" />
              Veículos Vinculados
            </div>

            {/* Current vehicles */}
            <div className="space-y-2">
              {motorista.veiculos.length > 0 ? (
                  motorista.veiculos.map((v) => {
                    const vehicleInUse = entregasAtivas.some(e => e.veiculo_id === v.id);
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{v.placa}</Badge>
                          <span className="text-sm">
                            {tipoVeiculoLabels[v.tipo] || v.tipo}
                          </span>
                          {vehicleInUse && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Em uso
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkVeiculo(v.id)}
                          disabled={isSubmitting || vehicleInUse}
                        >
                          <Unlink className="w-4 h-4 mr-1" />
                          Desvincular
                        </Button>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum veículo vinculado
                </p>
              )}
            </div>

            {/* Add new vehicle - only if no vehicle linked yet */}
            {motorista.veiculos.length === 0 && (
              <div className="flex gap-2">
                <Select value={selectedVeiculoId} onValueChange={setSelectedVeiculoId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um veículo para vincular" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVeiculos
                      .filter((v) => !motorista.veiculos.find((mv) => mv.id === v.id))
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} - {tipoVeiculoLabels[v.tipo] || v.tipo}
                          {v.marca && ` (${v.marca})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleLinkVeiculo}
                  disabled={!selectedVeiculoId || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
            {motorista.veiculos.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Para trocar de veículo, primeiro desvincule o atual
              </p>
            )}
          </div>

          <Separator />

          {/* Carrocerias - Only show if vehicle doesn't have integrated body */}
          {motorista.veiculos.some((v: any) => v.carroceria_integrada) ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Container className="w-4 h-4 text-primary" />
                Carroceria
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  O veículo vinculado possui <strong>carroceria integrada</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Não é necessário vincular uma carroceria separada
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Container className="w-4 h-4 text-primary" />
                Carrocerias Vinculadas
              </div>

              {/* Current carrocerias */}
              <div className="space-y-2">
                {motorista.carrocerias.length > 0 ? (
                  motorista.carrocerias.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.placa}</Badge>
                        <span className="text-sm">
                          {tipoCarroceriaLabels[c.tipo] || c.tipo}
                        </span>
                        {hasActiveDeliveries && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Em uso
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkCarroceria(c.id)}
                        disabled={isSubmitting || hasActiveDeliveries}
                      >
                        <Unlink className="w-4 h-4 mr-1" />
                        Desvincular
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma carroceria vinculada
                  </p>
                )}
              </div>

              {/* Add new carroceria - only if no carroceria linked */}
              {motorista.carrocerias.length === 0 && (
                <div className="flex gap-2">
                  <Select value={selectedCarroceriaId} onValueChange={setSelectedCarroceriaId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma carroceria para vincular" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCarrocerias
                        .filter((c) => !motorista.carrocerias.find((mc) => mc.id === c.id))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.placa} - {tipoCarroceriaLabels[c.tipo] || c.tipo}
                            {c.marca && ` (${c.marca})`}
                            {c.capacidade_kg && ` - ${c.capacidade_kg.toLocaleString()}kg`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleLinkCarroceria}
                    disabled={!selectedCarroceriaId || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
              {motorista.carrocerias.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Para trocar de carroceria, primeiro desvincule a atual
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
