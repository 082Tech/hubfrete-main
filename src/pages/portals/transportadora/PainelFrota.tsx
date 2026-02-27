import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  Search,
  Loader2,
  User,
  Container,
  Wrench,
  Route,
  CheckCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useViewModePreference } from '@/hooks/useViewModePreference';

const ITEMS_PER_PAGE = 12;

const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck', toco: 'Toco', tres_quartos: '3/4', vuc: 'VUC',
  carreta: 'Carreta', carreta_ls: 'Carreta LS', bitrem: 'Bitrem',
  rodotrem: 'Rodotrem', vanderleia: 'Vanderléia', bitruck: 'Bitruck',
};

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta', fechada_bau: 'Fechada/Baú', graneleira: 'Graneleira',
  tanque: 'Tanque', sider: 'Sider', frigorifico: 'Frigorífico',
  cegonha: 'Cegonha', prancha: 'Prancha', container: 'Container',
  bau: 'Baú', bau_frigorifico: 'Baú Frigorífico', cacamba: 'Caçamba',
  plataforma: 'Plataforma', silo: 'Silo', gaiola: 'Gaiola',
};

type StatusFrota = 'disponivel' | 'em_viagem' | 'manutencao';

export default function PainelFrota() {
  const { empresa } = useUserContext();
  const { viewMode, setViewMode } = useViewModePreference();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch veículos da empresa
  const { data: veiculos = [], isLoading: loadingVeiculos } = useQuery({
    queryKey: ['painel_frota_veiculos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, carroceria, marca, modelo, capacidade_kg, capacidade_m3, foto_url, ativo, carroceria_integrada')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('placa');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch carrocerias da empresa
  const { data: carrocerias = [] } = useQuery({
    queryKey: ['painel_frota_carrocerias', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('carrocerias')
        .select('id, placa, tipo, capacidade_kg, marca, modelo')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch viagens ativas
  const { data: viagensAtivas = [] } = useQuery({
    queryKey: ['painel_frota_viagens', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('viagens')
        .select('id, codigo, veiculo_id, carroceria_id, motorista_id, status, motoristas(nome_completo, foto_url)')
        .in('status', ['aguardando', 'em_andamento', 'programada'] as any[])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas ativas para calcular peso em uso
  const { data: entregasAtivas = [] } = useQuery({
    queryKey: ['painel_frota_entregas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('entregas')
        .select('veiculo_id, carroceria_id, peso_alocado_kg')
        .in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  const pesoEmUsoPorVeiculo = useMemo(() => {
    const map = new Map<string, number>();
    entregasAtivas.forEach((e: any) => {
      if (!e.veiculo_id) return;
      map.set(e.veiculo_id, (map.get(e.veiculo_id) || 0) + (e.peso_alocado_kg || 0));
    });
    return map;
  }, [entregasAtivas]);

  const viagemPorVeiculo = useMemo(() => {
    const map = new Map<string, any>();
    viagensAtivas.forEach((v: any) => {
      if (v.veiculo_id) map.set(v.veiculo_id, v);
    });
    return map;
  }, [viagensAtivas]);

  const frota = useMemo(() => {
    return veiculos.map((v: any) => {
      const viagem = viagemPorVeiculo.get(v.id);
      const pesoEmUso = pesoEmUsoPorVeiculo.get(v.id) || 0;
      const capacidade = v.capacidade_kg || 0;
      const ocupacao = capacidade > 0 ? Math.min(100, (pesoEmUso / capacidade) * 100) : 0;

      let status: StatusFrota = 'disponivel';
      if (viagem) status = 'em_viagem';

      const motorista = viagem?.motoristas;
      const carroceriaViagem = viagem?.carroceria_id
        ? carrocerias.find((c: any) => c.id === viagem.carroceria_id)
        : null;

      return {
        ...v,
        status,
        viagem,
        motoristaNome: motorista?.nome_completo || null,
        motoristaFoto: motorista?.foto_url || null,
        carroceriaAtual: carroceriaViagem,
        pesoEmUso,
        ocupacao,
      };
    });
  }, [veiculos, viagemPorVeiculo, pesoEmUsoPorVeiculo, carrocerias]);

  const filtered = useMemo(() => {
    return frota.filter(v => {
      if (searchTerm && !v.placa.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(v.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(v.modelo || '').toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      if (filterTipo !== 'all' && v.tipo !== filterTipo) return false;
      return true;
    });
  }, [frota, searchTerm, filterStatus, filterTipo]);

  const stats = useMemo(() => ({
    total: frota.length,
    disponiveis: frota.filter(v => v.status === 'disponivel').length,
    emViagem: frota.filter(v => v.status === 'em_viagem').length,
  }), [frota]);

  const tiposUnicos = useMemo(() => {
    const set = new Set(veiculos.map((v: any) => v.tipo));
    return Array.from(set) as string[];
  }, [veiculos]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useMemo(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterTipo]);

  const statusBadge = (status: StatusFrota) => {
    switch (status) {
      case 'disponivel':
        return <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20 gap-1"><CheckCircle className="w-3 h-3" />Disponível</Badge>;
      case 'em_viagem':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1"><Route className="w-3 h-3" />Em Viagem</Badge>;
      case 'manutencao':
        return <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20 gap-1"><Wrench className="w-3 h-3" />Manutenção</Badge>;
    }
  };

  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t px-4 py-3 shrink-0">
        <p className="text-sm text-muted-foreground">
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} registros
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" />Anterior
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                {pageNum}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            Próximo<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-foreground">Painel de Frota</h1>
        <p className="text-muted-foreground">Visão operacional dos veículos, alocações e disponibilidade</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 shrink-0 mb-6">
        {[
          { icon: Truck, value: stats.total, label: 'Veículos', color: 'primary' },
          { icon: CheckCircle, value: stats.disponiveis, label: 'Disponíveis', color: 'chart-2' },
          { icon: Route, value: stats.emViagem, label: 'Em Viagem', color: 'chart-1' },
        ].map((s, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 bg-${s.color}/10 rounded-xl`}>
                <s.icon className={`w-6 h-6 text-${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center shrink-0 mb-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="em_viagem">Em Viagem</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {tiposUnicos.map(t => (
              <SelectItem key={t} value={t}>{tipoVeiculoLabels[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as any)} className="ml-auto">
          <ToggleGroupItem value="grid"><LayoutGrid className="w-4 h-4" /></ToggleGroupItem>
          <ToggleGroupItem value="list"><List className="w-4 h-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {loadingVeiculos ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum veículo encontrado</h3>
            <p className="text-muted-foreground">Ajuste os filtros ou cadastre veículos na frota.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* Table View */
        <Card className="border-border flex flex-col flex-1 min-h-0">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                  <tr className="border-b transition-colors bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10">Placa</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Marca/Modelo</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Motorista</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Carroceria</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Ocupação</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {paginated.map((v) => (
                    <tr key={v.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="p-4 align-middle sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                            {v.foto_url ? (
                              <img src={v.foto_url} alt={v.placa} className="w-full h-full object-cover" />
                            ) : (
                              <Truck className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-mono font-bold text-foreground">{v.placa}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant="secondary" className="text-xs">{tipoVeiculoLabels[v.tipo] || v.tipo}</Badge>
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground">
                        {v.marca && v.modelo ? `${v.marca} ${v.modelo}` : '-'}
                      </td>
                      <td className="p-4 align-middle">
                        {v.motoristaNome ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={v.motoristaFoto || undefined} />
                              <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{v.motoristaNome}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Sem motorista</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {(v as any).carroceria_integrada ? (
                          <span className="text-xs text-muted-foreground">Integrada</span>
                        ) : v.carroceriaAtual ? (
                          <span className="text-sm font-medium">{v.carroceriaAtual.placa} · {tipoCarroceriaLabels[v.carroceriaAtual.tipo] || v.carroceriaAtual.tipo}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {v.capacidade_kg > 0 ? (
                          <div className="space-y-1 min-w-[120px]">
                            <Progress value={v.ocupacao} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {(v.pesoEmUso / 1000).toFixed(1)} / {(v.capacidade_kg / 1000).toFixed(1)}t ({v.ocupacao.toFixed(0)}%)
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {statusBadge(v.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar />
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginated.map((v) => (
                <Card key={v.id} className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                          {v.foto_url ? (
                            <img src={v.foto_url} alt={v.placa} className="w-full h-full object-cover" />
                          ) : (
                            <Truck className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-foreground">{v.placa}</p>
                          <p className="text-xs text-muted-foreground">
                            {tipoVeiculoLabels[v.tipo] || v.tipo}
                            {v.marca && v.modelo ? ` · ${v.marca} ${v.modelo}` : ''}
                          </p>
                        </div>
                      </div>
                      {statusBadge(v.status)}
                    </div>

                    {/* Motorista */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {v.motoristaNome ? (
                        <span className="font-medium text-foreground">{v.motoristaNome}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Sem motorista alocado</span>
                      )}
                    </div>

                    {/* Carroceria */}
                    <div className="flex items-center gap-2 text-sm">
                      <Container className="w-4 h-4 text-muted-foreground" />
                      {(v as any).carroceria_integrada ? (
                        <span className="text-muted-foreground">Carroceria integrada</span>
                      ) : v.carroceriaAtual ? (
                        <span className="font-medium text-foreground">
                          {v.carroceriaAtual.placa} · {tipoCarroceriaLabels[v.carroceriaAtual.tipo] || v.carroceriaAtual.tipo}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Sem carroceria</span>
                      )}
                    </div>

                    {/* Viagem */}
                    {v.viagem && (
                      <div className="flex items-center gap-2 text-sm">
                        <Route className="w-4 h-4 text-primary" />
                        <Badge variant="secondary" className="text-xs">{v.viagem.codigo}</Badge>
                      </div>
                    )}

                    {/* Ocupação */}
                    {v.capacidade_kg > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Ocupação</span>
                          <span className="font-medium">
                            {(v.pesoEmUso / 1000).toFixed(1)} / {(v.capacidade_kg / 1000).toFixed(1)} ton
                          </span>
                        </div>
                        <Progress value={v.ocupacao} className="h-2" />
                        <p className="text-xs text-right font-medium text-foreground">{v.ocupacao.toFixed(0)}%</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 shrink-0 mt-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Próximo<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
