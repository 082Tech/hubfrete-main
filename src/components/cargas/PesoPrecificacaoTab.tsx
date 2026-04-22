import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { WeightInput } from '@/components/ui/weight-input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Weight, DollarSign, Truck, AlertTriangle, CheckCircle2, Route, Info, Loader2 } from 'lucide-react';
import { useAnttPisos } from '@/hooks/useAnttPisos';
import {
  agruparVeiculosPorEixos,
  calcularPisoMinimo,
  categoriaAnttDeTipoCarga,
  CATEGORIA_ANTT_LABEL,
  EIXOS_VEICULOS_LABEL,
  haversineKm,
} from '@/lib/antt';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export interface PrecoEixoEntry {
  numero_eixos: number;
  valor_por_tonelada: number | null;
  piso_antt_calculado: number;
  piso_por_tonelada: number;
  valor_por_km: number;
}

interface PesoPrecificacaoTabProps {
  pesoKg: number;
  onPesoChange: (v: number) => void;
  pesoMinimoFracionado: number | null;
  onPesoMinimoFracionadoChange: (v: number | null) => void;
  permiteFracionado: boolean;
  onPermiteFracionadoChange: (v: boolean) => void;
  tipoCarga: string;
  veiculosSelecionados: string[];
  origem: { lat: number; lng: number } | null;
  destino: { lat: number; lng: number } | null;
  precosEixo: PrecoEixoEntry[];
  onPrecosEixoChange: (v: PrecoEixoEntry[]) => void;
  onDistanciaChange?: (km: number | null) => void;
}

export function PesoPrecificacaoTab({
  pesoKg,
  onPesoChange,
  pesoMinimoFracionado,
  onPesoMinimoFracionadoChange,
  permiteFracionado,
  onPermiteFracionadoChange,
  tipoCarga,
  veiculosSelecionados,
  origem,
  destino,
  precosEixo,
  onPrecosEixoChange,
  onDistanciaChange,
}: PesoPrecificacaoTabProps) {
  const { pisos, loading: loadingPisos } = useAnttPisos();
  const categoria = categoriaAnttDeTipoCarga(tipoCarga);
  const grupos = useMemo(() => agruparVeiculosPorEixos(veiculosSelecionados), [veiculosSelecionados]);
  // Rastreia quais eixos o usuário editou manualmente — só esses preservam valor entre recálculos
  const touchedEixosRef = useRef<Set<number>>(new Set());

  // Distância via OSRM
  const { route, loading: loadingRoute } = useOSRMRoute(origem, destino);
  const distanciaKm = useMemo(() => {
    if (route && route.length > 1) {
      let total = 0;
      for (let i = 1; i < route.length; i++) {
        total += haversineKm(
          { lat: route[i - 1][0], lng: route[i - 1][1] },
          { lat: route[i][0], lng: route[i][1] },
        );
      }
      return Math.round(total * 100) / 100;
    }
    if (origem && destino) {
      return Math.round(haversineKm(origem, destino) * 1.3 * 100) / 100; // fallback c/ fator estrada
    }
    return 0;
  }, [route, origem, destino]);

  useEffect(() => {
    onDistanciaChange?.(distanciaKm > 0 ? distanciaKm : null);
  }, [distanciaKm, onDistanciaChange]);

  // Recalcula os pisos quando peso/distância/grupos mudam, mantendo o valor digitado se >= piso
  useEffect(() => {
    if (loadingPisos || !pisos.length || pesoKg <= 0 || distanciaKm <= 0 || grupos.length === 0) {
      // limpa se não dá pra calcular
      if (precosEixo.length > 0) onPrecosEixoChange([]);
      return;
    }

    const next: PrecoEixoEntry[] = [];
    for (const g of grupos) {
      const calc = calcularPisoMinimo({ pisos, categoria, eixos: g.eixos, distanciaKm, pesoKg });
      if (!calc) continue;
      const existing = precosEixo.find((p) => p.numero_eixos === g.eixos);
      const wasTouched = touchedEixosRef.current.has(g.eixos);
      // Só preserva o valor digitado se o usuário tiver editado manualmente E o valor for >= piso.
      // Caso contrário, sempre usa o piso ANTT recém calculado (atualiza ao mudar peso/distância).
      const valor = wasTouched && existing && existing.valor_por_tonelada != null && existing.valor_por_tonelada >= calc.pisoPorTonelada
        ? existing.valor_por_tonelada
        : calc.pisoPorTonelada;
      next.push({
        numero_eixos: g.eixos,
        valor_por_tonelada: valor,
        piso_antt_calculado: calc.pisoTotal,
        piso_por_tonelada: calc.pisoPorTonelada,
        valor_por_km: calc.valorPorKm,
      });
    }
    // Atualiza sempre que houver diferença em piso_total, piso_por_ton, valor_por_km ou valor sugerido
    const sameLen = next.length === precosEixo.length;
    const same = sameLen && next.every((n, i) => {
      const p = precosEixo[i];
      return p && p.numero_eixos === n.numero_eixos
        && p.piso_antt_calculado === n.piso_antt_calculado
        && p.piso_por_tonelada === n.piso_por_tonelada
        && p.valor_por_km === n.valor_por_km
        && p.valor_por_tonelada === n.valor_por_tonelada;
    });
    if (!same) onPrecosEixoChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pisos, loadingPisos, categoria, distanciaKm, pesoKg, JSON.stringify(grupos)]);

  const handleValorChange = (eixos: number, valor: number | undefined) => {
    touchedEixosRef.current.add(eixos);
    onPrecosEixoChange(
      precosEixo.map((p) =>
        p.numero_eixos === eixos ? { ...p, valor_por_tonelada: valor ?? null } : p,
      ),
    );
  };

  const pesoTon = pesoKg > 0 ? pesoKg / 1000 : 0;

  return (
    <div className="space-y-5">
      <Alert className="border-primary/20 bg-primary/5">
        <Weight className="w-4 h-4 text-primary" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>Peso e precificação por eixos.</strong> O valor mínimo de cada categoria
          é calculado automaticamente conforme a tabela ANTT vigente, baseado na distância
          origem→destino e no número de eixos dos veículos selecionados em Requisitos.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-sm">Peso Total da Carga (kg) *</Label>
        <WeightInput
          placeholder="Ex: 25.000"
          value={pesoKg || undefined}
          onValueChange={(v) => onPesoChange(v ?? 0)}
        />
        {pesoKg >= 1000 && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {parseFloat((pesoKg / 1000).toFixed(4)).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} toneladas
          </p>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={permiteFracionado}
            onCheckedChange={(c) => onPermiteFracionadoChange(c === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label className="font-medium text-sm">Permitir transporte fracionado (LTL)</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Múltiplos motoristas podem aceitar frações do peso total respeitando o limite mínimo.
            </p>
          </div>
        </div>
        {permiteFracionado && (
          <div className="ml-7 pt-1">
            <Label className="text-sm">Peso Mínimo por Fração (kg)</Label>
            <WeightInput
              placeholder="Ex: 5.000"
              className="mt-1.5 max-w-[260px]"
              value={pesoMinimoFracionado || undefined}
              onValueChange={(v) => onPesoMinimoFracionadoChange(v || null)}
            />
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Precificação ANTT por Eixo</h3>
      </div>

      {/* Status: distância, categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="border rounded-md p-2.5 bg-muted/30 flex items-center gap-2">
          <Route className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Distância</p>
            <p className="font-semibold">
              {loadingRoute ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Calculando…</span>
              ) : distanciaKm > 0 ? (
                `${distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
              ) : (
                'Defina origem e destino'
              )}
            </p>
          </div>
        </div>
        <div className="border rounded-md p-2.5 bg-muted/30">
          <p className="text-muted-foreground">Categoria ANTT</p>
          <p className="font-semibold">{CATEGORIA_ANTT_LABEL[categoria]}</p>
        </div>
        <div className="border rounded-md p-2.5 bg-muted/30">
          <p className="text-muted-foreground">Peso</p>
          <p className="font-semibold">
            {pesoKg > 0 ? `${pesoTon.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ton` : '—'}
          </p>
        </div>
      </div>

      {grupos.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Selecione ao menos um tipo de veículo na aba <strong>Requisitos</strong> para calcular o piso ANTT.
          </AlertDescription>
        </Alert>
      )}

      {grupos.length > 0 && (loadingPisos || loadingRoute) && (
        <div className="space-y-2">
          {grupos.map((g) => <Skeleton key={g.eixos} className="h-24 w-full" />)}
        </div>
      )}

      {grupos.length > 0 && !loadingPisos && distanciaKm > 0 && pesoKg > 0 && (
        <div className="space-y-3">
          {precosEixo.map((p) => {
            const valorTotal = (p.valor_por_tonelada ?? 0) * pesoTon;
            const atende = (p.valor_por_tonelada ?? 0) >= p.piso_por_tonelada;
            return (
              <div
                key={p.numero_eixos}
                className={`border rounded-lg p-3 space-y-2 ${atende ? 'border-primary/30 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">{p.numero_eixos} eixos</p>
                      <p className="text-xs text-muted-foreground">{EIXOS_VEICULOS_LABEL[p.numero_eixos] || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Piso ANTT</p>
                    <p className="text-sm font-bold">{fmtBRL(p.piso_antt_calculado)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtBRL(p.valor_por_km)}/km × {distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                  <div>
                    <Label className="text-xs">Valor por Tonelada (R$/ton)</Label>
                    <CurrencyInput
                      placeholder="0,00"
                      value={p.valor_por_tonelada ?? undefined}
                      onValueChange={(v) => handleValorChange(p.numero_eixos, v)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Mínimo: {fmtBRL(p.piso_por_tonelada)}/ton
                    </p>
                  </div>
                  <div className="space-y-1">
                    {atende ? (
                      <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
                        <CheckCircle2 className="w-3 h-3" /> Atende piso ANTT
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" /> Abaixo do piso
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Frete total: <strong className="text-foreground">{fmtBRL(valorTotal)}</strong>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <Alert className="border-muted">
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              O motorista que aceitar receberá o valor correspondente ao número de eixos do veículo dele.
              Valores abaixo do piso ANTT são bloqueados pela plataforma.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
