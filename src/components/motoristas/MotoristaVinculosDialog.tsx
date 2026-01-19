import { useState } from 'react';
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
import { Loader2, Save, Car, Container, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
          {/* Veículos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Car className="w-4 h-4 text-primary" />
              Veículos Vinculados
            </div>

            {/* Current vehicles */}
            <div className="space-y-2">
              {motorista.veiculos.length > 0 ? (
                motorista.veiculos.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{v.placa}</Badge>
                      <span className="text-sm">
                        {tipoVeiculoLabels[v.tipo] || v.tipo}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkVeiculo(v.id)}
                      disabled={isSubmitting}
                    >
                      <Unlink className="w-4 h-4 mr-1" />
                      Desvincular
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum veículo vinculado
                </p>
              )}
            </div>

            {/* Add new vehicle */}
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
          </div>

          <Separator />

          {/* Carrocerias */}
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
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkCarroceria(c.id)}
                      disabled={isSubmitting}
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

            {/* Add new carroceria */}
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
          </div>
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
