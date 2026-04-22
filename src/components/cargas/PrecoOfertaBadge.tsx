import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Truck } from 'lucide-react';
import { eixosDeVeiculo, EIXOS_VEICULOS_LABEL } from '@/lib/antt';
import type { CargaPrecoEixo } from '@/hooks/useCargaPrecosEixo';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface PrecoOfertaBadgeProps {
  /** Lista de preços por eixo da oferta. */
  precos: CargaPrecoEixo[] | undefined;
  /** Tipos de veículo da frota da transportadora logada. */
  tiposFrota: string[];
  /** Aplicar comissão (0-100) sobre o valor exibido. */
  comissaoPercent?: number;
  /** Frete líquido total fallback (para ofertas sem precos por eixo). */
  freteLiquidoFallback?: number | null;
  /** Indica se é fixo (mostrar "Valor Fixo" como antes). */
  tipoPrecificacao?: string | null;
}

/**
 * Mostra a faixa de preço por tonelada da oferta + destaque para o melhor
 * veículo da frota da transportadora.
 */
export function PrecoOfertaBadge({
  precos,
  tiposFrota,
  comissaoPercent = 0,
  freteLiquidoFallback,
  tipoPrecificacao,
}: PrecoOfertaBadgeProps) {
  const fator = 1 - (comissaoPercent || 0) / 100;

  // Sem preços por eixo → fallback (ofertas legadas / valor fixo)
  if (!precos || precos.length === 0) {
    if (freteLiquidoFallback === null || freteLiquidoFallback === undefined) return null;
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="text-sm font-semibold text-chart-2">{fmtBRL(freteLiquidoFallback)}</div>
        {tipoPrecificacao === 'fixo' && comissaoPercent === 0 && (
          <span className="text-xs text-muted-foreground">(Valor Fixo)</span>
        )}
      </div>
    );
  }

  const valores = precos.map((p) => p.valor_por_tonelada * fator);
  const min = Math.min(...valores);
  const max = Math.max(...valores);

  // Eixos da frota
  const eixosFrota = new Set<number>();
  for (const t of tiposFrota) {
    const e = eixosDeVeiculo(t);
    if (e != null) eixosFrota.add(e);
  }

  // Preços compatíveis com a frota
  const precosCompat = precos.filter((p) => eixosFrota.has(p.numero_eixos));
  const precosCompatLiquido = precosCompat.map((p) => ({
    ...p,
    valorLiquido: p.valor_por_tonelada * fator,
  }));
  // Melhor (maior R$/ton) entre os compatíveis
  const melhor = precosCompatLiquido.length
    ? precosCompatLiquido.reduce((a, b) => (a.valorLiquido > b.valorLiquido ? a : b))
    : null;

  const outros = precosCompatLiquido.filter((p) => p !== melhor);

  return (
    <div className="flex flex-col items-end gap-0.5">
      {/* Faixa */}
      <div className="text-sm font-semibold text-chart-2 leading-tight">
        {min === max ? (
          <>{fmtBRL(min)}<span className="text-xs font-normal text-muted-foreground">/ton</span></>
        ) : (
          <>
            {fmtBRL(min)} – {fmtBRL(max)}
            <span className="text-xs font-normal text-muted-foreground">/ton</span>
          </>
        )}
      </div>

      {/* Destaque do veículo da frota */}
      {melhor ? (
        <div className="flex items-center gap-1 text-[11px] text-foreground">
          <Truck className="w-3 h-3 text-primary" />
          <span className="font-medium">
            Sua {EIXOS_VEICULOS_LABEL[melhor.numero_eixos] ?? `${melhor.numero_eixos} eixos`}:
          </span>
          <span className="font-semibold text-chart-2">{fmtBRL(melhor.valorLiquido)}/ton</span>
          {outros.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center cursor-help text-muted-foreground">
                  <Info className="w-3 h-3 ml-0.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium">Outros veículos compatíveis:</div>
                  {outros.map((o) => (
                    <div key={o.numero_eixos}>
                      {EIXOS_VEICULOS_LABEL[o.numero_eixos] ?? `${o.numero_eixos} eixos`}:{' '}
                      <span className="font-semibold">{fmtBRL(o.valorLiquido)}/ton</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">
          {tiposFrota.length === 0
            ? 'Cadastre sua frota p/ ver seu preço'
            : 'Frota não compatível'}
        </span>
      )}
    </div>
  );
}
