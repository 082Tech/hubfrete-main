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
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Container, Loader2, Weight, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta',
  fechada_bau: 'Baú',
  graneleira: 'Graneleira',
  tanque: 'Tanque',
  sider: 'Sider',
  frigorifico: 'Frigorífico',
  cegonha: 'Cegonha',
  prancha: 'Prancha',
  container: 'Container',
  graneleiro: 'Graneleiro',
  grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba',
  plataforma: 'Plataforma',
  bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico',
  bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo',
  gaiola: 'Gaiola',
  bug_porta_container: 'Bug Porta Container',
  munk: 'Munk',
  apenas_cavalo: 'Apenas Cavalo',
  cavaqueira: 'Cavaqueira',
  hopper: 'Hopper',
};

interface Carroceria {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  renavam: string | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  ativo: boolean;
}

interface CarroceriaEditDialogProps {
  carroceria: Carroceria | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CarroceriaEditDialog({ carroceria, open, onOpenChange }: CarroceriaEditDialogProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    ano: '',
    renavam: '',
    capacidade_kg: '',
    capacidade_m3: '',
    ativo: true,
  });

  useEffect(() => {
    if (carroceria) {
      setFormData({
        placa: carroceria.placa || '',
        tipo: carroceria.tipo || '',
        marca: carroceria.marca || '',
        modelo: carroceria.modelo || '',
        ano: carroceria.ano?.toString() || '',
        renavam: carroceria.renavam || '',
        capacidade_kg: carroceria.capacidade_kg?.toString() || '',
        capacidade_m3: carroceria.capacidade_m3?.toString() || '',
        ativo: carroceria.ativo ?? true,
      });
    }
  }, [carroceria]);

  const updateCarroceria = useMutation({
    mutationFn: async () => {
      if (!carroceria) return;

      const { error } = await supabase
        .from('carrocerias')
        .update({
          placa: formData.placa.toUpperCase(),
          tipo: formData.tipo,
          marca: formData.marca || null,
          modelo: formData.modelo || null,
          ano: formData.ano ? parseInt(formData.ano) : null,
          renavam: formData.renavam || null,
          capacidade_kg: formData.capacidade_kg ? parseFloat(formData.capacidade_kg) : null,
          capacidade_m3: formData.capacidade_m3 ? parseFloat(formData.capacidade_m3) : null,
          ativo: formData.ativo,
        })
        .eq('id', carroceria.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Carroceria atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Erro ao atualizar carroceria:', error);
      toast.error('Erro ao atualizar carroceria');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa || !formData.tipo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    updateCarroceria.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Container className="w-5 h-5" />
            Editar Carroceria - {carroceria?.placa}
          </DialogTitle>
          <DialogDescription>
            Atualize os dados da carroceria/implemento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Container className="w-4 h-4" />
              Dados da Carroceria
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placa *</Label>
                <MaskedInput
                  mask="plate"
                  placeholder="ABC-1234"
                  value={formData.placa}
                  onChange={(value) => setFormData({ ...formData, placa: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Carroceria *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoCarroceriaLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ex: Randon"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ex: SR GR"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Renavam</Label>
              <MaskedInput
                mask="renavam"
                placeholder="00000000000"
                value={formData.renavam}
                onChange={(value) => setFormData({ ...formData, renavam: value })}
              />
            </div>
          </div>

          <Separator />

          {/* Capacidades */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Weight className="w-4 h-4" />
              Capacidades
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-muted-foreground" />
                  Capacidade (kg)
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="30000"
                  value={formData.capacidade_kg}
                  onChange={(e) => setFormData({ ...formData, capacidade_kg: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Capacidade máxima de carga em quilogramas
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-muted-foreground" />
                  Capacidade (m³)
                </Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.capacidade_m3}
                  onChange={(e) => setFormData({ ...formData, capacidade_m3: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Volume máximo em metros cúbicos
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <Label>Status da Carroceria</Label>
              <p className="text-sm text-muted-foreground">
                Carrocerias inativas não podem ser vinculadas a motoristas
              </p>
            </div>
            <Switch
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCarroceria.isPending}>
              {updateCarroceria.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
