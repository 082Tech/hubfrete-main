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
import { Car, Container, Link2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
}: MotoristaVinculosDialogProps) {
  // Fetch active trips for this driver to show current equipment
  const { data: viagemAtiva } = useQuery({
    queryKey: ['viagem_ativa_motorista', motorista?.id],
    queryFn: async () => {
      if (!motorista?.id) return null;

      const { data, error } = await supabase
        .from('viagens')
        .select('id, codigo, veiculo_id, carroceria_id, status')
        .eq('motorista_id', motorista.id)
        .in('status', ['aguardando', 'programada', 'em_andamento'])
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!motorista?.id && open,
  });

  if (!motorista) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Equipamento em Uso
          </DialogTitle>
          <DialogDescription>
            Equipamento atualmente alocado ao motorista{' '}
            <strong>{motorista.nome_completo}</strong> via viagem ativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {viagemAtiva ? (
            <>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  Viagem ativa: {viagemAtiva.codigo}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O equipamento abaixo está alocado nesta viagem e não pode ser alterado até sua finalização.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Car className="w-4 h-4 text-primary" />
                  Veículo
                </div>
                {viagemAtiva.veiculo_id ? (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline">{viagemAtiva.veiculo_id.substring(0, 8)}...</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum veículo alocado</p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Container className="w-4 h-4 text-primary" />
                  Carroceria
                </div>
                {viagemAtiva.carroceria_id ? (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline">{viagemAtiva.carroceria_id.substring(0, 8)}...</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma carroceria alocada</p>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center space-y-2">
              <Info className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Este motorista não possui viagem ativa no momento.
              </p>
              <p className="text-xs text-muted-foreground">
                A alocação de equipamento ocorre no aceite de carga.
              </p>
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
