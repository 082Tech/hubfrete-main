import { useState, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
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
  Package,
  Search,
  MoreHorizontal,
  Eye,
  Weight,
  DollarSign,
  TrendingUp,
  Loader2,
  MapPin,
} from 'lucide-react';

const EntregasMap = lazy(() => import('@/components/maps/EntregasMap').then(module => ({ default: module.EntregasMap })));

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
  created_at: string;
  enderecos_carga: Array<{
    tipo: string;
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
  }>;
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
  const [selectedCarga, setSelectedCarga] = useState<CargaPublicada | null>(null);
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
          created_at,
          enderecos_carga (
            tipo,
            cidade,
            estado,
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

  const getOrigem = (carga: CargaPublicada) => {
    const origem = carga.enderecos_carga?.find(e => e.tipo === 'origem');
    return origem ? `${origem.cidade}/${origem.estado}` : '-';
  };

  const getDestino = (carga: CargaPublicada) => {
    const destino = carga.enderecos_carga?.find(e => e.tipo === 'destino');
    return destino ? `${destino.cidade}/${destino.estado}` : '-';
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

  // Stats
  const totalCargas = cargas.length;
  const pesoTotalPublicado = cargas.reduce((acc, c) => acc + c.peso_kg, 0);
  const pesoTotalDisponivel = cargas.reduce((acc, c) => acc + getPesoDisponivel(c), 0);
  const valorFreteEstimado = cargas.reduce((acc, c) => {
    if (c.valor_frete_tonelada && c.peso_kg) {
      return acc + (c.valor_frete_tonelada * c.peso_kg / 1000);
    }
    return acc;
  }, 0);

  // Map data - convert to EntregaMapData format
  const mapCargas = selectedCarga ? [selectedCarga] : filteredCargas;
  const entregasForMap = mapCargas.flatMap(carga => {
    const origem = carga.enderecos_carga?.find(e => e.tipo === 'origem');
    const destino = carga.enderecos_carga?.find(e => e.tipo === 'destino');
    
    if (!origem?.latitude || !destino?.latitude) return [];
    
    return [{
      id: carga.id,
      cargaId: carga.id,
      latitude: origem.latitude,
      longitude: origem.longitude,
      status: 'aguardando_coleta',
      codigo: carga.codigo,
      descricao: carga.descricao,
      motorista: null,
      telefone: null,
      placa: null,
      destino: `${destino.cidade}/${destino.estado}`,
      origemCoords: { lat: origem.latitude!, lng: origem.longitude! },
      destinoCoords: { lat: destino.latitude!, lng: destino.longitude! },
    }];
  });

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="flex gap-6 h-[calc(100vh-2rem)]">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Cargas Publicadas
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas cargas disponíveis para transporte
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <NovaCargaDialog onSuccess={refetch} />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Cargas</span>
                </div>
                <p className="text-xl font-bold">{totalCargas}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Peso Total</span>
                </div>
                <p className="text-xl font-bold">{formatWeight(pesoTotalPublicado)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Disponível</span>
                </div>
                <p className="text-xl font-bold">{formatWeight(pesoTotalDisponivel)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Frete Est.</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(valorFreteEstimado)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <Card className="bg-card/50">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Legenda</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs">Aguardando motoristas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs">Parcialmente alocada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs">100% alocada</span>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Map */}
          <Suspense fallback={
            <div className="w-full h-64 bg-muted/20 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          }>
            <div className="h-64 rounded-lg overflow-hidden">
              <EntregasMap
                entregas={entregasForMap}
                selectedCargaId={selectedCarga?.id}
                onSelectCarga={(id) => {
                  const carga = cargas.find(c => c.id === id);
                  setSelectedCarga(carga === selectedCarga ? null : carga || null);
                }}
              />
            </div>
          </Suspense>

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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Código</TableHead>
                        <TableHead className="font-semibold">Rota</TableHead>
                        <TableHead className="font-semibold">Peso Total</TableHead>
                        <TableHead className="font-semibold">Disponível</TableHead>
                        <TableHead className="font-semibold">Progresso</TableHead>
                        <TableHead className="font-semibold">Frete/ton</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCargas.map((carga) => {
                        const percentual = getPercentualAlocado(carga);
                        const isSelected = selectedCarga?.id === carga.id;
                        
                        return (
                          <TableRow 
                            key={carga.id}
                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'}`}
                            onClick={() => setSelectedCarga(isSelected ? null : carga)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-primary">{carga.codigo}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {carga.descricao}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-green-500" />
                                <span>{getOrigem(carga)}</span>
                                <span className="text-muted-foreground mx-1">→</span>
                                <MapPin className="w-3 h-3 text-red-500" />
                                <span>{getDestino(carga)}</span>
                              </div>
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
                              <div className="w-24">
                                <Progress value={percentual} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {percentual.toFixed(0)}% alocado
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {formatCurrency(carga.valor_frete_tonelada)}
                              </span>
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
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCarga(carga);
                                  }}>
                                    <MapPin className="w-4 h-4 mr-2" />
                                    Ver no mapa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Dialog */}
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
