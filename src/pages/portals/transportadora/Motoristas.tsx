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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Plus,
  Search,
  Loader2,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Truck,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Car,
  Container,
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
import { useAuth } from '@/hooks/useAuth';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { format, isValid, parseISO } from 'date-fns';

interface Motorista {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  ativo: boolean;
  foto_url: string | null;
  veiculos: {
    id: string;
    placa: string;
    tipo: string;
  }[];
}

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  motorista_id: string | null;
}

interface Carroceria {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  motorista_id: string | null;
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
  bitruck: 'Bitruck',
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

export default function Motoristas() {
  const { empresa } = useUserContext();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMotorista, setNewMotorista] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    cnh: '',
    categoria_cnh: '',
    validade_cnh: '',
    veiculo_id: '',
    carroceria_id: '',
  });

  // Fetch motoristas
  const { data: motoristas = [], isLoading } = useQuery({
    queryKey: ['motoristas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          id,
          nome_completo,
          cpf,
          email,
          telefone,
          cnh,
          categoria_cnh,
          validade_cnh,
          ativo,
          foto_url,
          veiculos(id, placa, tipo)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Motorista[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch veículos disponíveis (sem motorista atribuído)
  const { data: veiculosDisponiveis = [] } = useQuery({
    queryKey: ['veiculos_disponiveis', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, marca, modelo, motorista_id')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;
      return (data || []) as Veiculo[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch carrocerias disponíveis (sem motorista atribuído)
  const { data: carroceriasDisponiveis = [] } = useQuery({
    queryKey: ['carrocerias_disponiveis', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('carrocerias')
        .select('id, placa, tipo, marca, modelo, motorista_id')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;
      return (data || []) as Carroceria[];
    },
    enabled: !!empresa?.id,
  });

  // Veículos disponíveis para seleção (sem motorista ou o que será editado)
  const veiculosSelecionaveis = useMemo(() => {
    return veiculosDisponiveis.filter(v => !v.motorista_id);
  }, [veiculosDisponiveis]);

  // Carrocerias disponíveis para seleção (sem motorista ou o que será editado)
  const carroceriasSelecionaveis = useMemo(() => {
    return carroceriasDisponiveis.filter(c => !c.motorista_id);
  }, [carroceriasDisponiveis]);

  // Mutation para criar motorista
  const createMotorista = useMutation({
    mutationFn: async (data: typeof newMotorista) => {
      // Primeiro insere o motorista
      const { data: motoristaData, error: motoristaError } = await supabase
        .from('motoristas')
        .insert({
          nome_completo: data.nome_completo,
          cpf: data.cpf,
          email: data.email || null,
          telefone: data.telefone || null,
          cnh: data.cnh,
          categoria_cnh: data.categoria_cnh,
          validade_cnh: data.validade_cnh,
          empresa_id: empresa?.id,
          user_id: session?.user?.id || crypto.randomUUID(),
          ativo: true,
        })
        .select('id')
        .single();

      if (motoristaError) throw motoristaError;

      // Se selecionou veículo, atualiza o vínculo
      if (data.veiculo_id) {
        const { error: veiculoError } = await supabase
          .from('veiculos')
          .update({ motorista_id: motoristaData.id })
          .eq('id', data.veiculo_id);

        if (veiculoError) throw veiculoError;
      }

      // Se selecionou carroceria, atualiza o vínculo
      if (data.carroceria_id) {
        const { error: carroceriaError } = await supabase
          .from('carrocerias')
          .update({ motorista_id: motoristaData.id })
          .eq('id', data.carroceria_id);

        if (carroceriaError) throw carroceriaError;
      }
    },
    onSuccess: () => {
      toast.success('Motorista cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos_disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['carrocerias_disponiveis'] });
      setIsDialogOpen(false);
      setNewMotorista({
        nome_completo: '',
        cpf: '',
        email: '',
        telefone: '',
        cnh: '',
        categoria_cnh: '',
        validade_cnh: '',
        veiculo_id: '',
        carroceria_id: '',
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar motorista:', error);
      toast.error('Erro ao cadastrar motorista');
    },
  });

  // Mutation para toggle ativo
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('motoristas')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  // Mutation para deletar motorista
  const deleteMotorista = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro remove vínculos de veículos e carrocerias
      await supabase.from('veiculos').update({ motorista_id: null }).eq('motorista_id', id);
      await supabase.from('carrocerias').update({ motorista_id: null }).eq('motorista_id', id);
      
      const { error } = await supabase.from('motoristas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Motorista removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos_disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['carrocerias_disponiveis'] });
    },
    onError: (error) => {
      console.error('Erro ao remover motorista:', error);
      toast.error('Erro ao remover motorista');
    },
  });

  const filteredMotoristas = useMemo(() => {
    return motoristas.filter(
      (m) =>
        m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cpf.includes(searchTerm) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.telefone?.includes(searchTerm)
    );
  }, [motoristas, searchTerm]);

  const formatValidadeCNH = (validade: string | null | undefined): string => {
    if (!validade) return 'Não informada';
    try {
      const date = parseISO(validade);
      if (!isValid(date)) return 'Data inválida';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return 'Data inválida';
    }
  };

  const getCNHStatus = (validade: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'unknown' => {
    if (!validade) return 'unknown';
    try {
      const date = parseISO(validade);
      if (!isValid(date)) return 'unknown';
      const hoje = new Date();
      const diff = date.getTime() - hoje.getTime();
      const dias = diff / (1000 * 60 * 60 * 24);
      if (dias < 0) return 'expired';
      if (dias <= 30) return 'expiring';
      return 'valid';
    } catch {
      return 'unknown';
    }
  };

  const stats = useMemo(() => {
    const ativos = motoristas.filter((m) => m.ativo).length;
    const comVeiculo = motoristas.filter((m) => m.veiculos.length > 0).length;
    const cnhVencendo = motoristas.filter((m) => getCNHStatus(m.validade_cnh) === 'expiring').length;
    const cnhVencida = motoristas.filter((m) => getCNHStatus(m.validade_cnh) === 'expired').length;
    return { total: motoristas.length, ativos, comVeiculo, cnhVencendo, cnhVencida };
  }, [motoristas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newMotorista.nome_completo ||
      !newMotorista.cpf ||
      !newMotorista.cnh ||
      !newMotorista.categoria_cnh ||
      !newMotorista.validade_cnh
    ) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createMotorista.mutate(newMotorista);
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Motoristas</h1>
            <p className="text-muted-foreground">
              Gerencie os motoristas da sua transportadora
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Motorista
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Motorista</DialogTitle>
                <DialogDescription>
                  Adicione um novo motorista à sua equipe e vincule seu veículo/carroceria
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="w-4 h-4" />
                    Dados Pessoais
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        placeholder="Nome do motorista"
                        value={newMotorista.nome_completo}
                        onChange={(e) =>
                          setNewMotorista({
                            ...newMotorista,
                            nome_completo: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF *</Label>
                      <Input
                        placeholder="000.000.000-00"
                        value={newMotorista.cpf}
                        onChange={(e) =>
                          setNewMotorista({ ...newMotorista, cpf: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={newMotorista.email}
                        onChange={(e) =>
                          setNewMotorista({ ...newMotorista, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={newMotorista.telefone}
                        onChange={(e) =>
                          setNewMotorista({
                            ...newMotorista,
                            telefone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* CNH */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    Carteira de Habilitação
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Número CNH *</Label>
                      <Input
                        placeholder="00000000000"
                        value={newMotorista.cnh}
                        onChange={(e) =>
                          setNewMotorista({ ...newMotorista, cnh: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select
                        value={newMotorista.categoria_cnh}
                        onValueChange={(v) =>
                          setNewMotorista({ ...newMotorista, categoria_cnh: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                          <SelectItem value="AB">AB</SelectItem>
                          <SelectItem value="AC">AC</SelectItem>
                          <SelectItem value="AD">AD</SelectItem>
                          <SelectItem value="AE">AE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Validade CNH *</Label>
                      <Input
                        type="date"
                        value={newMotorista.validade_cnh}
                        onChange={(e) =>
                          setNewMotorista({
                            ...newMotorista,
                            validade_cnh: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Veículo e Carroceria */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Truck className="w-4 h-4" />
                    Equipamentos Vinculados
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        Veículo (Cavalo)
                      </Label>
                      <Select
                        value={newMotorista.veiculo_id}
                        onValueChange={(v) =>
                          setNewMotorista({ ...newMotorista, veiculo_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um veículo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {veiculosSelecionaveis.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.placa} - {tipoVeiculoLabels[v.tipo] || v.tipo}
                              {v.marca && ` (${v.marca})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Apenas veículos sem motorista atribuído
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Container className="w-4 h-4" />
                        Carroceria (Implemento)
                      </Label>
                      <Select
                        value={newMotorista.carroceria_id}
                        onValueChange={(v) =>
                          setNewMotorista({ ...newMotorista, carroceria_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma carroceria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {carroceriasSelecionaveis.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.placa} - {tipoCarroceriaLabels[c.tipo] || c.tipo}
                              {c.marca && ` (${c.marca})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Apenas carrocerias sem motorista atribuído
                      </p>
                    </div>
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
                  <Button type="submit" disabled={createMotorista.isPending}>
                    {createMotorista.isPending && (
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <User className="w-6 h-6 text-primary" />
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
                <CheckCircle className="w-6 h-6 text-chart-2" />
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
                <Truck className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.comVeiculo}
                </p>
                <p className="text-sm text-muted-foreground">Com Veículo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-4/10 rounded-xl">
                <Calendar className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.cnhVencendo}
                </p>
                <p className="text-sm text-muted-foreground">CNH Vencendo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.cnhVencida}
                </p>
                <p className="text-sm text-muted-foreground">CNH Vencida</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Motoristas List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMotoristas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum motorista encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Nenhum motorista corresponde à busca.'
                  : 'Adicione motoristas à sua equipe.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Motorista
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMotoristas.map((motorista) => {
              const cnhStatus = getCNHStatus(motorista.validade_cnh);
              return (
                <Card
                  key={motorista.id}
                  className={`border-border transition-all ${
                    !motorista.ativo ? 'opacity-60' : 'hover:shadow-md'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {motorista.nome_completo}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            CPF: {formatCPF(motorista.cpf)}
                          </p>
                        </div>
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
                            onClick={() =>
                              toggleAtivo.mutate({
                                id: motorista.id,
                                ativo: !motorista.ativo,
                              })
                            }
                          >
                            {motorista.ativo ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMotorista.mutate(motorista.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {motorista.ativo ? (
                        <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                      <Badge variant="secondary">CNH {motorista.categoria_cnh}</Badge>
                      {cnhStatus === 'valid' && (
                        <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                          CNH Válida
                        </Badge>
                      )}
                      {cnhStatus === 'expiring' && (
                        <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">
                          CNH Vencendo
                        </Badge>
                      )}
                      {cnhStatus === 'expired' && (
                        <Badge variant="destructive">CNH Vencida</Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {motorista.telefone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {motorista.telefone}
                        </div>
                      )}
                      {motorista.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {motorista.email}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="w-4 h-4" />
                        CNH: {motorista.cnh}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Validade: {formatValidadeCNH(motorista.validade_cnh)}
                      </div>
                    </div>

                    {motorista.veiculos.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Veículos vinculados:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {motorista.veiculos.map((v) => (
                            <Badge
                              key={v.id}
                              variant="outline"
                              className="text-xs gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              {v.placa}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
