import { useState, useEffect, useMemo } from 'react';
import { formatWeight } from '@/lib/utils';
import { Truck, Weight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface AlocacaoItem {
  carroceria_id: string;
  peso_kg: number;
}

interface CarroceriaInfo {
  id: string;
  placa: string;
  tipo: string;
  capacidade_kg: number | null;
}

interface CarregamentoSectionProps {
  carroceriasAlocadas: AlocacaoItem[] | null;
  /** Fallback for legacy data: single carroceria_id + peso_alocado_kg */
  carroceriaId?: string | null;
  pesoAlocadoKg?: number | null;
  /** Hide individual capacity progress bars (used in carrier portal) */
  hideCapacityBar?: boolean;
}

const tipoCarroceriaLabels: Record<string, string> = {
  bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico',
  sider: 'Sider',
  graneleira: 'Graneleira',
  carga_seca: 'Carga Seca',
  tanque: 'Tanque',
  plataforma: 'Plataforma',
  basculante: 'Basculante',
  container: 'Container',
  prancha: 'Prancha',
  gaiola: 'Gaiola',
};

export function CarregamentoCarroceriasSection({ carroceriasAlocadas, carroceriaId, pesoAlocadoKg, hideCapacityBar }: CarregamentoSectionProps) {
  const [carroceriasInfo, setCarroceriasInfo] = useState<Record<string, CarroceriaInfo>>({});

  const alocacoes = useMemo(() => {
    // Try new JSON format first
    if (Array.isArray(carroceriasAlocadas) && carroceriasAlocadas.length > 0) {
      return carroceriasAlocadas.filter(a => a.carroceria_id && a.peso_kg > 0);
    }
    // Fallback: legacy single carroceria_id + peso_alocado_kg
    if (carroceriaId && pesoAlocadoKg && pesoAlocadoKg > 0) {
      return [{ carroceria_id: carroceriaId, peso_kg: pesoAlocadoKg }];
    }
    return [];
  }, [carroceriasAlocadas, carroceriaId, pesoAlocadoKg]);

  useEffect(() => {
    if (alocacoes.length === 0) return;
    const ids = alocacoes.map(a => a.carroceria_id);
    supabase
      .from('carrocerias')
      .select('id, placa, tipo, capacidade_kg')
      .in('id', ids)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, CarroceriaInfo> = {};
        data.forEach((c: any) => { map[c.id] = c; });
        setCarroceriasInfo(map);
      });
  }, [alocacoes]);

  if (alocacoes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Carregamento por Carroceria</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
          {alocacoes.length} {alocacoes.length === 1 ? 'carroceria' : 'carrocerias'}
        </Badge>
      </div>

      <div className="space-y-2">
        {alocacoes.map((alocacao) => {
          const info = carroceriasInfo[alocacao.carroceria_id];
          const capacidade = info?.capacidade_kg;
          const percentual = capacidade && capacidade > 0
            ? Math.min(100, Math.round((alocacao.peso_kg / capacidade) * 100))
            : null;

          return (
            <div
              key={alocacao.carroceria_id}
              className="rounded-lg border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-sm">
                      {info?.placa || '...'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tipoCarroceriaLabels[info?.tipo || ''] || info?.tipo || 'Carroceria'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm flex items-center gap-1 justify-end">
                    <Weight className="w-3 h-3" />
                    {formatWeight(alocacao.peso_kg)}
                  </p>
                  {!hideCapacityBar && capacidade && (
                    <p className="text-[10px] text-muted-foreground">
                      de {formatWeight(capacidade)}
                    </p>
                  )}
                </div>
              </div>

              {!hideCapacityBar && percentual !== null && (
                <div className="space-y-1">
                  <Progress
                    value={percentual}
                    className="h-2"
                    indicatorClassName={
                      percentual >= 90
                        ? 'bg-red-500'
                        : percentual >= 70
                          ? 'bg-amber-500'
                          : 'bg-primary'
                    }
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {percentual}% da capacidade
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
