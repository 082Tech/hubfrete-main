import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Truck,
  Plus,
  Search,
  Loader2,
  Shield,
  Gauge,
  User,
  Calendar,
  Weight,
  Boxes,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

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
  ativo: boolean;
  seguro_ativo: boolean;
  rastreador: boolean;
  motorista: {
    id: string;
    nome_completo: string;
  } | null;
}

const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck',
  toco: 'Toco',
  tres_quartos: '3/4',
  vuc: 'VUC',
  carreta: 'Carreta',
  carreta_ls: 'Carreta LS',
  bitrem: 'Bitrem',
  rodotrem: 'Rodotrem',
  vanderleia: 'Vanderleia',
};

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
};

export default function MinhaFrota() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVeiculo, setNewVeiculo] = useState({
    placa: '',
    tipo: '',
    carroceria: '',
    marca: '',
    modelo: '',
    ano: '',
    capacidade_kg: '',
    capacidade_m3: '',
    renavam: '',
  });

  // Fetch veículos
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ['veiculos_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          id,
          placa,
          tipo,
          carroceria,
          marca,
          modelo,
          ano,
          capacidade_kg,
          capacidade_m3,
          renavam,
          ativo,
          seguro_ativo,
          rastreador,
          motorista:motoristas(id, nome_completo)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Veiculo[];
    },
    enabled: !!empresa?.id,
  });

  // Mutation para criar veículo
  const createVeiculo = useMutation({
    mutationFn: async (data: typeof newVeiculo) => {
      const { error } = await supabase.from('veiculos').insert({
        placa: data.placa.toUpperCase(),
        tipo: data.tipo as any,
        carroceria: data.carroceria as any,
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ? parseInt(data.ano) : null,
        capacidade_kg: data.capacidade_kg ? parseFloat(data.capacidade_kg) : null,
        capacidade_m3: data.capacidade_m3 ? parseFloat(data.capacidade_m3) : null,
        renavam: data.renavam || null,
        empresa_id: empresa?.id,
        ativo: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Veículo cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
      setIsDialogOpen(false);
      setNewVeiculo({
        placa: '',
        tipo: '',
        carroceria: '',
        marca: '',
        modelo: '',
        ano: '',
        capacidade_kg: '',
        capacidade_m3: '',
        renavam: '',
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar veículo:', error);
      toast.error('Erro ao cadastrar veículo');
    },
  });

  // Mutation para deletar veículo
  const deleteVeiculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('veiculos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Veículo removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
    },
    onError: (error) => {
      console.error('Erro ao remover veículo:', error);
      toast.error('Erro ao remover veículo');
    },
  });

  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(
      (v) =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [veiculos, searchTerm]);

  const stats = useMemo(() => {
    const ativos = veiculos.filter((v) => v.ativo).length;
    const comSeguro = veiculos.filter((v) => v.seguro_ativo).length;
    const comRastreador = veiculos.filter((v) => v.rastreador).length;
    return { total: veiculos.length, ativos, comSeguro, comRastreador };
  }, [veiculos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVeiculo.placa || !newVeiculo.tipo || !newVeiculo.carroceria) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createVeiculo.mutate(newVeiculo);
  };

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minha Frota</h1>
            <p className="text-muted-foreground">
              Gerencie os veículos da sua transportadora
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Veículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Veículo</DialogTitle>
                <DialogDescription>
                  Adicione um novo veículo à sua frota
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Placa *</Label>
                    <Input
                      placeholder="ABC-1234"
                      value={newVeiculo.placa}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, placa: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Renavam</Label>
                    <Input
                      placeholder="00000000000"
                      value={newVeiculo.renavam}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, renavam: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Veículo *</Label>
                    <Select
                      value={newVeiculo.tipo}
                      onValueChange={(v) =>
                        setNewVeiculo({ ...newVeiculo, tipo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoVeiculoLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Carroceria *</Label>
                    <Select
                      value={newVeiculo.carroceria}
                      onValueChange={(v) =>
                        setNewVeiculo({ ...newVeiculo, carroceria: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoCarroceriaLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input
                      placeholder="Ex: Volvo"
                      value={newVeiculo.marca}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, marca: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      placeholder="Ex: FH 540"
                      value={newVeiculo.modelo}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, modelo: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={newVeiculo.ano}
                      onChange={(e) =>
                        setNewVeiculo({ ...newVeiculo, ano: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidade (kg)</Label>
                    <Input
                      type="number"
                      placeholder="30000"
                      value={newVeiculo.capacidade_kg}
                      onChange={(e) =>
                        setNewVeiculo({
                          ...newVeiculo,
                          capacidade_kg: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (m³)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={newVeiculo.capacidade_m3}
                      onChange={(e) =>
                        setNewVeiculo({
                          ...newVeiculo,
                          capacidade_m3: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createVeiculo.isPending}>
                    {createVeiculo.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Cadastrar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-xl">
                <Gauge className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ativos}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-1/10 rounded-xl">
                <Shield className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.comSeguro}
                </p>
                <p className="text-sm text-muted-foreground">Com Seguro</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-4/10 rounded-xl">
                <Gauge className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.comRastreador}
                </p>
                <p className="text-sm text-muted-foreground">Rastreador</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, motorista, marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Veículos List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredVeiculos.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum veículo encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Nenhum veículo corresponde à busca.'
                  : 'Adicione veículos à sua frota.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Veículo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVeiculos.map((veiculo) => (
              <Card
                key={veiculo.id}
                className={`border-border transition-all ${
                  !veiculo.ativo ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {veiculo.placa}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteVeiculo.mutate(veiculo.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}
                    </Badge>
                    <Badge variant="outline">
                      {tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}
                    </Badge>
                    {veiculo.ativo ? (
                      <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Inativo</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {veiculo.capacidade_kg && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Weight className="w-4 h-4" />
                        {veiculo.capacidade_kg.toLocaleString('pt-BR')} kg
                      </div>
                    )}
                    {veiculo.capacidade_m3 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Boxes className="w-4 h-4" />
                        {veiculo.capacidade_m3} m³
                      </div>
                    )}
                  </div>

                  {veiculo.motorista && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{veiculo.motorista.nome_completo}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {veiculo.seguro_ativo && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="w-3 h-3" />
                        Seguro
                      </Badge>
                    )}
                    {veiculo.rastreador && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Gauge className="w-3 h-3" />
                        Rastreador
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
