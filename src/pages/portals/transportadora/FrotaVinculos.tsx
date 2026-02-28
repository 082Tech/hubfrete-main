import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  Weight,
  Container,
  CheckCircle,
  Link2,
  Unlink,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { toast } from 'sonner';

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

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  carroceria: string;
  ativo: boolean;
  foto_url: string | null;
  carroceria_integrada: boolean;
  motorista_padrao_id: string | null;
  motorista_padrao: { id: string; nome_completo: string; telefone: string | null; foto_url: string | null } | null;
}

interface Carroceria {
  id: string;
  placa: string;
  tipo: string;
  capacidade_kg: number | null;
  ativo: boolean;
  veiculo_id: string | null;
}

export default function FrotaVinculos() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();

  const { data: veiculos = [], isLoading: isLoadingVeiculos } = useQuery({
    queryKey: ['veiculos_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          id, placa, tipo, carroceria, ativo, foto_url, carroceria_integrada,
          motorista_padrao_id,
          motorista_padrao:motoristas!veiculos_motorista_padrao_id_fkey(id, nome_completo, telefone, foto_url)
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Veiculo[];
    },
    enabled: !!empresa?.id,
  });

  const { data: carrocerias = [] } = useQuery({
    queryKey: ['carrocerias_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('carrocerias')
        .select('id, placa, tipo, capacidade_kg, ativo, veiculo_id')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Carroceria[];
    },
    enabled: !!empresa?.id,
  });

  const { data: motoristasEmpresa = [] } = useQuery({
    queryKey: ['motoristas_empresa_vinculos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('motoristas')
        .select('id, nome_completo, telefone, foto_url')
        .eq('empresa_id', empresa.id as any)
        .eq('ativo', true);
      if (error) throw error;
      return (data || []) as { id: string; nome_completo: string; telefone: string | null; foto_url: string | null }[];
    },
    enabled: !!empresa?.id,
  });

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Vínculos da Frota</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie vínculos entre motoristas, veículos e carrocerias
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3 shrink-0">
        <Link2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Vínculos Motorista + Veículo + Carroceria</p>
          <p className="text-xs text-muted-foreground mt-1">
            Vincule motoristas e carrocerias a veículos para agilizar o aceite de cargas. Os vínculos são usados como padrão no wizard de aceite.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {veiculos
            .filter(v => v.ativo)
            .map((veiculo) => {
              const linkedCarrocerias = carrocerias.filter(c => c.veiculo_id === veiculo.id);
              const maxSlots = veiculo.carroceria_integrada ? 0 : (['bitrem', 'rodotrem'].includes(veiculo.tipo) ? 2 : ['vanderleia'].includes(veiculo.tipo) ? 3 : 1);
              const availableCarrocerias = carrocerias.filter(c => !c.veiculo_id && c.ativo);
              const motoristaPadrao = veiculo.motorista_padrao as any;
              const veiculosComMotorista = veiculos.filter(v => v.motorista_padrao_id && v.id !== veiculo.id).map(v => v.motorista_padrao_id);
              const availableMotoristas = motoristasEmpresa.filter(m => !veiculosComMotorista.includes(m.id));

              return (
                <Card key={veiculo.id} className="border-border">
                  <CardContent className="p-4 space-y-3">
                    {/* Vehicle Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                          {veiculo.foto_url ? (
                            <img src={veiculo.foto_url} alt={veiculo.placa} className="w-full h-full object-cover" />
                          ) : (
                            <Truck className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{veiculo.placa}</h3>
                          <p className="text-[10px] text-muted-foreground">{tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}</p>
                        </div>
                      </div>
                      {!veiculo.carroceria_integrada && (
                        <Badge variant="outline" className="text-[10px]">
                          {linkedCarrocerias.length}/{maxSlots} slot{maxSlots > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {veiculo.carroceria_integrada && (
                        <Badge variant="secondary" className="text-[10px]">Integrado</Badge>
                      )}
                    </div>

                    <Separator />

                    {/* Motorista Padrão Slot */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Motorista padrão</p>
                      {motoristaPadrao ? (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={motoristaPadrao.foto_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {motoristaPadrao.nome_completo?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{motoristaPadrao.nome_completo}</p>
                              {motoristaPadrao.telefone && (
                                <p className="text-[10px] text-muted-foreground">{motoristaPadrao.telefone}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Desvincular motorista"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('veiculos')
                                .update({ motorista_padrao_id: null } as any)
                                .eq('id', veiculo.id);
                              if (error) {
                                toast.error('Erro ao desvincular motorista');
                              } else {
                                toast.success('Motorista desvinculado!');
                                queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
                              }
                            }}
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-lg p-2">
                          <Select
                            onValueChange={async (motoristaId) => {
                              const { error } = await supabase
                                .from('veiculos')
                                .update({ motorista_padrao_id: motoristaId } as any)
                                .eq('id', veiculo.id);
                              if (error) {
                                toast.error('Erro ao vincular motorista');
                              } else {
                                toast.success('Motorista vinculado!');
                                queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs border-dashed">
                              <SelectValue placeholder="+ Vincular motorista" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMotoristas.length === 0 ? (
                                <SelectItem value="__none" disabled>Nenhum motorista disponível</SelectItem>
                              ) : (
                                availableMotoristas.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-5 h-5">
                                        <AvatarImage src={m.foto_url || undefined} />
                                        <AvatarFallback className="text-[8px]">
                                          {m.nome_completo?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      {m.nome_completo}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Carroceria Slots - only for non-integrated */}
                    {!veiculo.carroceria_integrada && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Carrocerias vinculadas</p>
                        {linkedCarrocerias.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Container className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">{c.placa}</span>
                                <span className="text-xs text-muted-foreground ml-2">{tipoCarroceriaLabels[c.tipo] || c.tipo}</span>
                              </div>
                              {c.capacidade_kg && (
                                <Badge variant="outline" className="text-[10px] gap-0.5">
                                  <Weight className="w-3 h-3" />{(c.capacidade_kg / 1000).toLocaleString('pt-BR')}t
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Desvincular"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('carrocerias')
                                  .update({ veiculo_id: null })
                                  .eq('id', c.id);
                                if (error) {
                                  toast.error('Erro ao desvincular');
                                } else {
                                  toast.success('Carroceria desvinculada!');
                                  queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
                                }
                              }}
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}

                        {/* Empty Slots */}
                        {Array.from({ length: maxSlots - linkedCarrocerias.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="border border-dashed border-border rounded-lg p-2">
                            <Select
                              onValueChange={async (carroceriaId) => {
                                const { error } = await supabase
                                  .from('carrocerias')
                                  .update({ veiculo_id: veiculo.id })
                                  .eq('id', carroceriaId);
                                if (error) {
                                  toast.error('Erro ao vincular');
                                } else {
                                  toast.success('Carroceria vinculada!');
                                  queryClient.invalidateQueries({ queryKey: ['carrocerias_transportadora'] });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs border-dashed">
                                <SelectValue placeholder="+ Vincular carroceria" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCarrocerias.length === 0 ? (
                                  <SelectItem value="__none" disabled>Nenhuma carroceria disponível</SelectItem>
                                ) : (
                                  availableCarrocerias.map((ac) => (
                                    <SelectItem key={ac.id} value={ac.id}>
                                      {ac.placa} - {tipoCarroceriaLabels[ac.tipo] || ac.tipo}
                                      {ac.capacidade_kg ? ` (${(ac.capacidade_kg / 1000).toLocaleString('pt-BR')}t)` : ''}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          {/* Vehicles with integrated bodywork - informational */}
          {veiculos.filter(v => v.carroceria_integrada && v.ativo).length > 0 && (
            <Card className="border-border bg-muted/30 col-span-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-chart-2" />
                  <span>
                    <strong>{veiculos.filter(v => v.carroceria_integrada && v.ativo).length}</strong> veículo(s) com carroceria integrada (não necessitam vínculo)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
