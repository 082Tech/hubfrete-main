import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck, Shield, Gauge, User, Container, Weight, Boxes, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck', toco: 'Toco', tres_quartos: '3/4', vuc: 'VUC',
  carreta: 'Carreta', carreta_ls: 'Carreta LS', bitrem: 'Bitrem',
  rodotrem: 'Rodotrem', vanderleia: 'Vanderleia', bitruck: 'Bitruck',
};

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta', fechada_bau: 'Baú', graneleira: 'Graneleira', tanque: 'Tanque',
  sider: 'Sider', frigorifico: 'Frigorífico', cegonha: 'Cegonha', prancha: 'Prancha',
  container: 'Container', graneleiro: 'Graneleiro', grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba', plataforma: 'Plataforma', bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico', bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo', gaiola: 'Gaiola', bug_porta_container: 'Bug Porta Container',
  munk: 'Munk', apenas_cavalo: 'Apenas Cavalo', cavaqueira: 'Cavaqueira', hopper: 'Hopper',
};

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  carroceria: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  renavam: string | null;
  uf: string | null;
  antt_rntrc: string | null;
  ativo: boolean;
  seguro_ativo: boolean;
  rastreador: boolean;
  foto_url: string | null;
  carroceria_integrada: boolean;
  motorista: { id: string; nome_completo: string; foto_url: string | null } | null;
}

interface Props {
  veiculo: Veiculo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VeiculoDetailDialog({ veiculo, open, onOpenChange }: Props) {
  if (!veiculo) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Detalhes do Veículo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          <div className="w-full h-48 rounded-lg bg-muted/50 overflow-hidden flex items-center justify-center border border-border">
            {veiculo.foto_url ? (
              <img src={veiculo.foto_url} alt={veiculo.placa} className="w-full h-full object-cover" />
            ) : (
              <Truck className="w-16 h-16 text-muted-foreground/30" />
            )}
          </div>

          {/* Placa + Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">{veiculo.placa}</h3>
            <div className="flex gap-1.5">
              <Badge variant={veiculo.ativo ? 'outline' : 'destructive'} className={veiculo.ativo ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : ''}>
                {veiculo.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {veiculo.seguro_ativo && <Badge variant="outline" className="gap-1"><Shield className="w-3 h-3" />Seguro</Badge>}
              {veiculo.rastreador && <Badge variant="outline" className="gap-1"><Gauge className="w-3 h-3" />Rastreador</Badge>}
            </div>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Carroceria</p>
              <p className="font-medium">
                {veiculo.carroceria_integrada
                  ? tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria
                  : 'Apenas Cavalo'}
              </p>
            </div>
            {(veiculo.marca || veiculo.modelo) && (
              <div>
                <p className="text-muted-foreground">Marca/Modelo</p>
                <p className="font-medium">{veiculo.marca} {veiculo.modelo}</p>
              </div>
            )}
            {veiculo.ano && (
              <div>
                <p className="text-muted-foreground">Ano</p>
                <p className="font-medium">{veiculo.ano}</p>
              </div>
            )}
            {veiculo.renavam && (
              <div>
                <p className="text-muted-foreground">RENAVAM</p>
                <p className="font-medium">{veiculo.renavam}</p>
              </div>
            )}
            {veiculo.uf && (
              <div>
                <p className="text-muted-foreground">UF</p>
                <p className="font-medium">{veiculo.uf}</p>
              </div>
            )}
            {veiculo.antt_rntrc && (
              <div>
                <p className="text-muted-foreground">ANTT/RNTRC</p>
                <p className="font-medium">{veiculo.antt_rntrc}</p>
              </div>
            )}
            {veiculo.carroceria_integrada && veiculo.capacidade_kg && (
              <div>
                <p className="text-muted-foreground">Capacidade</p>
                <p className="font-medium">
                  {(veiculo.capacidade_kg / 1000).toLocaleString('pt-BR')}t
                  {veiculo.capacidade_m3 && ` / ${veiculo.capacidade_m3}m³`}
                </p>
              </div>
            )}
          </div>

          {/* Motorista */}
          {veiculo.motorista && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={veiculo.motorista.foto_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(veiculo.motorista.nome_completo)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="text-sm font-medium">{veiculo.motorista.nome_completo}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
