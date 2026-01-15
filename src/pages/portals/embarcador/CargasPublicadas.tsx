import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Package,
  Search,
  MoreHorizontal,
  Eye,
  Weight,
  DollarSign,
  TrendingUp,
  Loader2,
  MapPin,
  Building2,
  Calendar,
  Truck,
  CircleDot,
  Percent,
} from 'lucide-react';

interface EnderecoData {
  id: string;
  tipo: string;
  logradouro: string;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  cep: string;
  contato_nome: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CargaPublicada {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  peso_disponivel_kg: number | null;
  permite_fracionado: boolean | null;
  valor_mercadoria: number | null;
  valor_frete_tonelada: number | null;
  status: string;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  created_at: string;
  endereco_origem: EnderecoData | null;
  endereco_destino: EnderecoData | null;
  entregas: Array<{
    id: string;
    peso_alocado_kg: number | null;
    status: string;
    motorista_id: string | null;
  }> | null;
}

export default function CargasPublicadas() {
  const { filialAtiva } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsCarga, setDetailsCarga] = useState<any>(null);

  const { data: cargas = [], isLoading, refetch } = useQuery({
    queryKey: ['cargas-publicadas', filialAtiva?.id],
    queryFn: async () => {
      if (!filialAtiva?.id) return [];
      
      const { data, error } = await supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          tipo,
          peso_kg,
          peso_disponivel_kg,
          permite_fracionado,
          valor_mercadoria,
          valor_frete_tonelada,
          status,
          data_coleta_de,
          data_coleta_ate,
          created_at,
          endereco_origem:enderecos_carga!endereco_origem_id (
            id,
            tipo,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            cep,
            contato_nome,
            latitude,
            longitude
          ),
          endereco_destino:enderecos_carga!endereco_destino_id (
            id,
            tipo,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            cep,
            contato_nome,
            latitude,
            longitude
          ),
          entregas (
            id,
            peso_alocado_kg,
            status,
            motorista_id
          )
        `)
        .eq('filial_id', filialAtiva.id)
        .in('status', ['publicada', 'em_cotacao', 'aceita'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        entregas: Array.isArray(item.entregas) ? item.entregas : (item.entregas ? [item.entregas] : [])
      })) as CargaPublicada[];
    },
    enabled: !!filialAtiva?.id,
  });

  const filteredCargas = cargas.filter(carga => 
    carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    carga.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEnderecoData = (carga: CargaPublicada, tipo: 'origem' | 'destino') => {
    const endereco = tipo === 'origem' ? carga.endereco_origem : carga.endereco_destino;
    if (!endereco) return { empresa: '-', cidade: '-', enderecoCompleto: '-' };
    
    const enderecoCompleto = [
      endereco.logradouro,
      endereco.numero,
      endereco.bairro,
      `${endereco.cidade}/${endereco.estado}`,
      endereco.cep
    ].filter(Boolean).join(', ');
    
    return {
      empresa: endereco.contato_nome || filialAtiva?.nome || 'Remetente',
      cidade: `${endereco.cidade}/${endereco.estado}`,
      enderecoCompleto
    };
  };

  const getPesoDisponivel = (carga: CargaPublicada) => {
    return carga.peso_disponivel_kg ?? carga.peso_kg;
  };

  const getPercentualAlocado = (carga: CargaPublicada) => {
    const disponivel = getPesoDisponivel(carga);
    return ((carga.peso_kg - disponivel) / carga.peso_kg) * 100;
  };

  const getStatusBadge = (carga: CargaPublicada) => {
    const percentual = getPercentualAlocado(carga);
    if (percentual >= 100) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">100% Alocada</Badge>;
    }
    if (percentual > 0) {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{percentual.toFixed(0)}% Alocada</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Aguardando</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const tipoLabels: Record<string, string> = {
      'granel_solido': 'Granel Sólido',
      'granel_liquido': 'Granel Líquido',
      'carga_seca': 'Carga Seca',
      'refrigerada': 'Refrigerada',
      'congelada': 'Congelada',
      'perigosa': 'Perigosa',
      'viva': 'Viva',
      'indivisivel': 'Indivisível',
      'container': 'Container',
    };
    return <Badge variant="outline" className="text-xs">{tipoLabels[tipo] || tipo}</Badge>;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg}kg`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Stats
  const totalCargas = cargas.length;
  const pesoTotalPublicado = cargas.reduce((acc, c) => acc + c.peso_kg, 0);
  const pesoTotalDisponivel = cargas.reduce((acc, c) => acc + getPesoDisponivel(c), 0);
  const percentualMedioAlocado = totalCargas > 0 
    ? cargas.reduce((acc, c) => acc + getPercentualAlocado(c), 0) / totalCargas 
    : 0;
  const valorFreteEstimado = cargas.reduce((acc, c) => {
    if (c.valor_frete_tonelada && c.peso_kg) {
      return acc + (c.valor_frete_tonelada * c.peso_kg / 1000);
    }
    return acc;
  }, 0);
  const valorMercadoriaTotal = cargas.reduce((acc, c) => acc + (c.valor_mercadoria || 0), 0);
  const cargasAguardando = cargas.filter(c => getPercentualAlocado(c) === 0).length;
  const cargasParciais = cargas.filter(c => {
    const p = getPercentualAlocado(c);
    return p > 0 && p < 100;
  }).length;
  const cargasCompletas = cargas.filter(c => getPercentualAlocado(c) >= 100).length;

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Cargas Publicadas
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas cargas disponíveis para transporte
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <NovaCargaDialog onSuccess={refetch} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Cargas</span>
              </div>
              <p className="text-2xl font-bold text-primary">{totalCargas}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Peso Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">{formatWeight(pesoTotalPublicado)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Disponível</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{formatWeight(pesoTotalDisponivel)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">% Alocado</span>
              </div>
              <p className="text-2xl font-bold text-purple-500">{percentualMedioAlocado.toFixed(0)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-muted-foreground">Frete Est.</span>
              </div>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(valorFreteEstimado)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-muted-foreground">Mercadoria</span>
              </div>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(valorMercadoriaTotal)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CircleDot className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Por Status</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{cargasAguardando}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{cargasParciais}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{cargasCompletas}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2">Legenda</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Aguardando</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Completa</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredCargas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhuma carga publicada
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie e publique novas cargas para disponibilizá-las aos transportadores
                </p>
                <NovaCargaDialog onSuccess={refetch} />
              </div>
            ) : (
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold min-w-[120px] sticky left-0 bg-muted/50 z-10">Código</TableHead>
                      <TableHead className="font-semibold min-w-[180px]">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Remetente
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[180px]">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Destinatário
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[100px]">Tipo</TableHead>
                      <TableHead className="font-semibold min-w-[100px]">Peso Total</TableHead>
                      <TableHead className="font-semibold min-w-[100px]">Disponível</TableHead>
                      <TableHead className="font-semibold min-w-[140px]">Progresso</TableHead>
                      <TableHead className="font-semibold min-w-[120px]">Valor Mercad.</TableHead>
                      <TableHead className="font-semibold min-w-[100px]">Frete/ton</TableHead>
                      <TableHead className="font-semibold min-w-[100px]">Frete Total</TableHead>
                      <TableHead className="font-semibold min-w-[100px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Coleta
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[100px]">Status</TableHead>
                      <TableHead className="font-semibold w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCargas.map((carga) => {
                      const percentual = getPercentualAlocado(carga);
                      const origem = getEnderecoData(carga, 'origem');
                      const destino = getEnderecoData(carga, 'destino');
                      const freteTotal = carga.valor_frete_tonelada && carga.peso_kg 
                        ? (carga.valor_frete_tonelada * carga.peso_kg / 1000) 
                        : null;
                      
                      return (
                        <TableRow 
                          key={carga.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => setDetailsCarga(carga)}
                        >
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div>
                              <p className="font-medium text-primary">{carga.codigo}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {carga.descricao}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-green-500 shrink-0" />
                                      <p className="font-medium text-sm truncate max-w-[160px]">{origem.empresa}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                      {origem.cidade}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <p className="font-medium">{origem.empresa}</p>
                                  <p className="text-xs text-muted-foreground">{origem.enderecoCompleto}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                      <p className="font-medium text-sm truncate max-w-[160px]">{destino.empresa}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                      {destino.cidade}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <p className="font-medium">{destino.empresa}</p>
                                  <p className="text-xs text-muted-foreground">{destino.enderecoCompleto}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            {getTipoBadge(carga.tipo)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{formatWeight(carga.peso_kg)}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${getPesoDisponivel(carga) === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                              {formatWeight(getPesoDisponivel(carga))}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="w-28">
                              <Progress value={percentual} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {percentual.toFixed(0)}% alocado
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm">
                              {formatCurrency(carga.valor_mercadoria)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm">
                              {formatCurrency(carga.valor_frete_tonelada)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm text-primary">
                              {formatCurrency(freteTotal)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {carga.data_coleta_de && (
                                <p>{formatDate(carga.data_coleta_de)}</p>
                              )}
                              {carga.data_coleta_ate && carga.data_coleta_de !== carga.data_coleta_ate && (
                                <p className="text-muted-foreground">até {formatDate(carga.data_coleta_ate)}</p>
                              )}
                              {!carga.data_coleta_de && '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(carga)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsCarga(carga);
                                }}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {detailsCarga && (
        <CargaDetailsDialog
          carga={detailsCarga}
          open={!!detailsCarga}
          onOpenChange={(open) => !open && setDetailsCarga(null)}
        />
      )}
    </PortalLayout>
  );
}
