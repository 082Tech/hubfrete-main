import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  MapPin, 
  Calendar, 
  Truck, 
  User, 
  Phone, 
  Building2,
  Weight,
  Box,
  AlertTriangle,
  Snowflake,
  FileText,
  Navigation,
  CheckCircle,
  PackageOpen,
  FileSearch,
  History,
} from 'lucide-react';
import { NfeValidationStatus } from './NfeValidationStatus';
import { EventTimeline } from '@/components/shared/EventTimeline';
import type { Database } from '@/integrations/supabase/types';
import { formatWeight } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type StatusCarga = Database['public']['Enums']['status_carga'];
type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface CargaDetailsProps {
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    tipo: string;
    peso_kg: number;
    volume_m3: number | null;
    valor_mercadoria: number | null;
    valor_frete_tonelada?: number | null;
    tipo_precificacao?: string | null;
    valor_frete_m3?: number | null;
    valor_frete_fixo?: number | null;
    valor_frete_km?: number | null;
    numero_pedido?: string | null;
    quantidade_paletes?: number | null;
    status: StatusCarga | null;
    data_coleta_de: string | null;
    data_coleta_ate: string | null;
    data_entrega_limite: string | null;
    created_at: string | null;
    necessidades_especiais?: string[] | null;
    regras_carregamento?: string | null;
    nota_fiscal_url?: string | null;
    carga_fragil?: boolean | null;
    carga_perigosa?: boolean | null;
    carga_viva?: boolean | null;
    empilhavel?: boolean | null;
    requer_refrigeracao?: boolean | null;
    temperatura_min?: number | null;
    temperatura_max?: number | null;
    numero_onu?: string | null;
    veiculo_requisitos?: {
      tipos_veiculo?: string[];
      tipos_carroceria?: string[];
    } | null;
    remetente?: {
      nome: string | null;
      cidade: string | null;
      estado: string | null;
      endereco?: string | null;
      contato_nome?: string | null;
      contato_telefone?: string | null;
    } | null;
    destinatario?: {
      nome: string | null;
      cidade: string | null;
      estado: string | null;
      endereco?: string | null;
      contato_nome?: string | null;
      contato_telefone?: string | null;
    } | null;
    entregas?: Array<{
      id: string;
      status: StatusEntrega | null;
      peso_alocado_kg: number | null;
      valor_frete: number | null;
      coletado_em: string | null;
      entregue_em: string | null;
      motoristas?: {
        nome_completo: string;
        telefone: string | null;
      } | null;
      veiculos?: {
        placa: string;
        marca: string | null;
        modelo: string | null;
        tipo: string | null;
      } | null;
    }> | {
      status: StatusEntrega | null;
      motoristas?: {
        nome_completo: string;
        telefone: string | null;
      } | null;
      veiculos?: {
        placa: string;
        marca: string | null;
        modelo: string | null;
        tipo: string | null;
      } | null;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusCargaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'rascunho': { color: 'bg-muted text-muted-foreground', label: 'Rascunho', icon: Package },
  'publicada': { color: 'bg-blue-500/10 text-blue-600', label: 'Publicada', icon: Package },
  'aceita': { color: 'bg-purple-500/10 text-purple-600', label: 'Aceita', icon: Package },
  'em_coleta': { color: 'bg-cyan-500/10 text-cyan-600', label: 'Em Coleta', icon: Truck },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600', label: 'Em Trânsito', icon: Navigation },
  'entregue': { color: 'bg-green-500/10 text-green-600', label: 'Concluída', icon: CheckCircle },
  'cancelada': { color: 'bg-red-500/10 text-red-600', label: 'Cancelada', icon: AlertTriangle },
};

const tipoCargaLabels: Record<string, string> = {
  'carga_seca': 'Carga Seca',
  'granel_solido': 'Granel Sólido',
  'granel_liquido': 'Granel Líquido',
  'refrigerada': 'Refrigerada',
  'congelada': 'Congelada',
  'perigosa': 'Perigosa',
  'viva': 'Carga Viva',
  'indivisivel': 'Indivisível',
  'container': 'Container',
};

const tipoVeiculoLabels: Record<string, string> = {
  'truck': 'Truck',
  'toco': 'Toco',
  'tres_quartos': '3/4',
  'vuc': 'VUC',
  'carreta': 'Carreta',
  'carreta_ls': 'Carreta LS',
  'bitrem': 'Bitrem',
  'rodotrem': 'Rodotrem',
  'vanderleia': 'Vanderléia',
};

const statusEntregaConfig: Record<string, { color: string; label: string }> = {
  'aguardando_coleta': { color: 'bg-muted text-muted-foreground', label: 'Aguardando Coleta' },
  'em_coleta': { color: 'bg-blue-500/10 text-blue-600', label: 'Em Coleta' },
  'coletado': { color: 'bg-cyan-500/10 text-cyan-600', label: 'Coletado' },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600', label: 'Em Trânsito' },
  'em_entrega': { color: 'bg-purple-500/10 text-purple-600', label: 'Saiu p/ Entrega' },
  'entregue': { color: 'bg-green-500/10 text-green-600', label: 'Concluída' },
  'problema': { color: 'bg-red-500/10 text-red-600', label: 'Problema' },
  'devolvida': { color: 'bg-red-500/10 text-red-600', label: 'Devolvida' },
};

export function CargaDetailsDialog({ carga, open, onOpenChange }: CargaDetailsProps) {
  const [eventos, setEventos] = useState<any[]>([]);

  useEffect(() => {
    if (!carga?.id || !open) { setEventos([]); return; }
    (async () => {
      const { data: evts } = await supabase
        .from('carga_eventos' as any)
        .select('id, tipo, timestamp, observacao, user_nome')
        .eq('carga_id', carga.id)
        .order('timestamp', { ascending: false });
      
      setEventos(evts || []);
    })();
  }, [carga?.id, open]);

  // Early return if carga is null to prevent accessing properties of null
  if (!carga) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const status = carga.status || 'rascunho';
  const config = statusCargaConfig[status];
  const StatusIcon = config?.icon || Package;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    // Adiciona T00:00:00 para forçar interpretação como data local e evitar shift de timezone
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatValor = (valor: number | null) => {
    if (!valor) return '-';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="w-5 h-5" />
            <span>{carga.codigo}</span>
            <Badge variant="outline" className={config?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Descrição */}
          <div>
            <p className="text-lg font-medium">{carga.descricao}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Criado em {formatDate(carga.created_at)}</span>
              {carga.numero_pedido && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Pedido: {carga.numero_pedido}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Remetente e Destinatário */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Remetente */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                    O
                  </div>
                  Remetente (Origem)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {carga.remetente?.nome && (
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    {carga.remetente.nome}
                  </p>
                )}
                {carga.remetente?.cidade && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {carga.remetente.cidade}, {carga.remetente.estado}
                  </p>
                )}
                {carga.remetente?.endereco && (
                  <p className="text-muted-foreground text-xs">{carga.remetente.endereco}</p>
                )}
                {carga.remetente?.contato_nome && (
                  <p className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {carga.remetente.contato_nome}
                  </p>
                )}
                {carga.remetente?.contato_telefone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {carga.remetente.contato_telefone}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Destinatário */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                    D
                  </div>
                  Destinatário (Destino)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {carga.destinatario?.nome && (
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    {carga.destinatario.nome}
                  </p>
                )}
                {carga.destinatario?.cidade && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {carga.destinatario.cidade}, {carga.destinatario.estado}
                  </p>
                )}
                {carga.destinatario?.endereco && (
                  <p className="text-muted-foreground text-xs">{carga.destinatario.endereco}</p>
                )}
                {carga.destinatario?.contato_nome && (
                  <p className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {carga.destinatario.contato_nome}
                  </p>
                )}
                {carga.destinatario?.contato_telefone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {carga.destinatario.contato_telefone}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Dados da Carga */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Dados da Carga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {tipoCargaLabels[carga.tipo] || carga.tipo}
                </Badge>
                <Badge variant="secondary">
                  <Weight className="w-3 h-3 mr-1" />
                  {formatWeight(carga.peso_kg)}
                </Badge>
                {carga.volume_m3 && (
                  <Badge variant="secondary">
                    <Box className="w-3 h-3 mr-1" />
                    {carga.volume_m3} m³
                  </Badge>
                )}
                {carga.valor_mercadoria && (
                  <Badge variant="secondary">
                    {formatValor(carga.valor_mercadoria)}
                  </Badge>
                )}
              </div>

              {/* Características especiais */}
              <div className="flex flex-wrap gap-2">
                {carga.carga_fragil && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Frágil
                  </Badge>
                )}
                {carga.carga_perigosa && (
                  <Badge variant="outline" className="border-red-500 text-red-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Perigosa {carga.numero_onu && `(${carga.numero_onu})`}
                  </Badge>
                )}
                {carga.carga_viva && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Carga Viva
                  </Badge>
                )}
                {carga.requer_refrigeracao && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    <Snowflake className="w-3 h-3 mr-1" />
                    Refrigerada
                    {carga.temperatura_min !== undefined && carga.temperatura_max !== undefined &&
                      ` (${carga.temperatura_min}°C ~ ${carga.temperatura_max}°C)`
                    }
                  </Badge>
                )}
                {carga.empilhavel === false && (
                  <Badge variant="outline">Não empilhável</Badge>
                )}
              </div>

              {/* Datas */}
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Coleta: {formatDate(carga.data_coleta_de)}
                  {carga.data_coleta_ate && ` até ${formatDate(carga.data_coleta_ate)}`}
                </span>
                {carga.data_entrega_limite && (
                  <span>
                    Entrega até: {formatDate(carga.data_entrega_limite)}
                  </span>
                )}
              </div>

              {/* Necessidades especiais */}
              {carga.necessidades_especiais && carga.necessidades_especiais.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Equipamentos:</p>
                  <div className="flex flex-wrap gap-1">
                    {carga.necessidades_especiais.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Regras de carregamento */}
              {carga.regras_carregamento && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Regras de Carregamento:</p>
                  <p className="text-sm bg-muted/50 p-2 rounded">{carga.regras_carregamento}</p>
                </div>
              )}

              {/* Requisitos de veículos */}
              {carga.veiculo_requisitos && (
                (carga.veiculo_requisitos.tipos_veiculo?.length > 0 || carga.veiculo_requisitos.tipos_carroceria?.length > 0) && (
                  <div className="space-y-2">
                    {carga.veiculo_requisitos.tipos_veiculo && carga.veiculo_requisitos.tipos_veiculo.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tipos de Veículo Aceitos:</p>
                        <div className="flex flex-wrap gap-1">
                          {carga.veiculo_requisitos.tipos_veiculo.map((tipo) => (
                            <Badge key={tipo} variant="outline" className="text-xs">
                              <Truck className="w-3 h-3 mr-1" />
                              {tipoVeiculoLabels[tipo] || tipo}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {carga.veiculo_requisitos.tipos_carroceria && carga.veiculo_requisitos.tipos_carroceria.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tipos de Carroceria Aceitas:</p>
                        <div className="flex flex-wrap gap-1">
                          {carga.veiculo_requisitos.tipos_carroceria.map((tipo) => (
                            <Badge key={tipo} variant="outline" className="text-xs">
                              {tipo.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Valor do Frete */}
              {(() => {
                const tp = carga.tipo_precificacao || 'por_tonelada';
                const labelMap: Record<string, string> = {
                  por_tonelada: 'Frete por tonelada',
                  por_m3: 'Frete por m³',
                  fixo: 'Frete fixo',
                  por_km: 'Frete por km',
                };
                const suffixMap: Record<string, string> = {
                  por_tonelada: '/ton',
                  por_m3: '/m³',
                  fixo: '',
                  por_km: '/km',
                };
                const valMap: Record<string, number | null | undefined> = {
                  por_tonelada: carga.valor_frete_tonelada,
                  por_m3: carga.valor_frete_m3,
                  fixo: carga.valor_frete_fixo,
                  por_km: carga.valor_frete_km,
                };
                const val = valMap[tp];
                if (!val) return null;
                return (
                  <div className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/20">
                    <span className="text-sm text-muted-foreground">{labelMap[tp]}:</span>
                    <span className="font-medium text-primary">
                      {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{suffixMap[tp]}
                    </span>
                  </div>
                );
              })()}

              {/* Nota fiscal */}
              {carga.nota_fiscal_url && (
                <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                  <FileText className="w-4 h-4 text-green-600" />
                  <a 
                    href={carga.nota_fiscal_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline font-medium"
                  >
                    📎 Ver Nota Fiscal Anexada
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Fiscal */}
          <NfeValidationStatus entregaId={carga.id} />

          {/* Entregas */}
          {carga.entregas && (Array.isArray(carga.entregas) ? (carga.entregas as any[]).length > 0 : true) && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PackageOpen className="w-4 h-4" />
                    Cargas ({Array.isArray(carga.entregas) ? (carga.entregas as any[]).length : 1})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Peso</TableHead>
                        <TableHead className="text-xs">Frete</TableHead>
                        <TableHead className="text-xs">Motorista</TableHead>
                        <TableHead className="text-xs">Veículo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(carga.entregas as any[]).map((entrega: any) => {
                        const statusConfig = statusEntregaConfig[entrega.status || 'aguardando_coleta'];
                        return (
                          <TableRow key={entrega.id}>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${statusConfig?.color || ''}`}>
                                {statusConfig?.label || entrega.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {entrega.peso_alocado_kg ? formatWeight(entrega.peso_alocado_kg) : '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {entrega.valor_frete 
                                ? entrega.valor_frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-xs">
                              {entrega.motoristas ? (
                                <div>
                                  <p className="font-medium">{entrega.motoristas.nome_completo}</p>
                                  {entrega.motoristas.telefone && (
                                    <a 
                                      href={`tel:${entrega.motoristas.telefone}`}
                                      className="text-primary hover:underline text-xs"
                                    >
                                      {entrega.motoristas.telefone}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {entrega.veiculos ? (
                                <div>
                                  <p className="font-medium">{entrega.veiculos.placa}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {entrega.veiculos.marca} {entrega.veiculos.modelo}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* Single Entrega (legacy format from GestaoCargas/HistoricoCargas) */}
          {carga.entregas && !Array.isArray(carga.entregas) && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Transporte
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    {carga.entregas.motoristas && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Motorista</p>
                        <p className="font-medium flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {carga.entregas.motoristas.nome_completo}
                        </p>
                        {carga.entregas.motoristas.telefone && (
                          <a 
                            href={`tel:${carga.entregas.motoristas.telefone}`}
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            <Phone className="w-3 h-3" />
                            {carga.entregas.motoristas.telefone}
                          </a>
                        )}
                      </div>
                    )}
                    {carga.entregas.veiculos && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Veículo</p>
                        <p className="font-medium">{carga.entregas.veiculos.placa}</p>
                        <p className="text-muted-foreground">
                          {carga.entregas.veiculos.marca} {carga.entregas.veiculos.modelo}
                          {carga.entregas.veiculos.tipo && ` - ${tipoVeiculoLabels[carga.entregas.veiculos.tipo] || carga.entregas.veiculos.tipo}`}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Histórico de Eventos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventTimeline
                events={eventos.map((e: any) => ({
                  id: e.id,
                  tipo: e.tipo,
                  timestamp: e.timestamp,
                  observacao: e.observacao,
                  user_nome: e.user_nome,
                  entityType: 'oferta' as const,
                }))}
                emptyMessage="Nenhum evento registrado para esta oferta"
              />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
