import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Container, User, Weight, Car } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta', fechada_bau: 'Baú', graneleira: 'Graneleira', tanque: 'Tanque',
  sider: 'Sider', frigorifico: 'Frigorífico', cegonha: 'Cegonha', prancha: 'Prancha',
  container: 'Container', graneleiro: 'Graneleiro', grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba', plataforma: 'Plataforma', bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico', bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo', gaiola: 'Gaiola', bug_porta_container: 'Bug Porta Container',
  munk: 'Munk', apenas_cavalo: 'Apenas Cavalo', cavaqueira: 'Cavaqueira', hopper: 'Hopper',
};

interface Carroceria {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  renavam: string | null;
  ativo: boolean;
  foto_url: string | null;
  motorista: { id: string; nome_completo: string; foto_url: string | null } | null;
}

interface Props {
  carroceria: Carroceria | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoAtrelado?: { placa: string } | null;
}

export function CarroceriaDetailDialog({ carroceria, open, onOpenChange, veiculoAtrelado }: Props) {
  if (!carroceria) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Container className="w-5 h-5" />
            Detalhes da Carroceria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          <div className="w-full h-48 rounded-lg bg-muted/50 overflow-hidden flex items-center justify-center border border-border">
            {carroceria.foto_url ? (
              <img src={carroceria.foto_url} alt={carroceria.placa} className="w-full h-full object-cover" />
            ) : (
              <Container className="w-16 h-16 text-muted-foreground/30" />
            )}
          </div>

          {/* Placa + Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">{carroceria.placa}</h3>
            <Badge variant={carroceria.ativo ? 'outline' : 'destructive'} className={carroceria.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
              {carroceria.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</p>
            </div>
            {(carroceria.marca || carroceria.modelo) && (
              <div>
                <p className="text-muted-foreground">Marca/Modelo</p>
                <p className="font-medium">{carroceria.marca} {carroceria.modelo}</p>
              </div>
            )}
            {carroceria.ano && (
              <div>
                <p className="text-muted-foreground">Ano</p>
                <p className="font-medium">{carroceria.ano}</p>
              </div>
            )}
            {carroceria.renavam && (
              <div>
                <p className="text-muted-foreground">RENAVAM</p>
                <p className="font-medium">{carroceria.renavam}</p>
              </div>
            )}
            {carroceria.capacidade_kg && (
              <div>
                <p className="text-muted-foreground">Capacidade (peso)</p>
                <p className="font-medium">{(carroceria.capacidade_kg / 1000).toLocaleString('pt-BR')}t</p>
              </div>
            )}
            {carroceria.capacidade_m3 && (
              <div>
                <p className="text-muted-foreground">Capacidade (volume)</p>
                <p className="font-medium">{carroceria.capacidade_m3}m³</p>
              </div>
            )}
          </div>

          {/* Veículo atrelado */}
          {veiculoAtrelado && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Veículo atrelado</p>
                  <p className="text-sm font-medium">{veiculoAtrelado.placa}</p>
                </div>
              </div>
            </>
          )}

          {/* Motorista */}
          {carroceria.motorista && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={carroceria.motorista.foto_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(carroceria.motorista.nome_completo)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="text-sm font-medium">{carroceria.motorista.nome_completo}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
