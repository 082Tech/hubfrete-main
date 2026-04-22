/**
 * Helpers ANTT — Frete mínimo por número de eixos
 *
 * Mapeamento veículo → nº de eixos e tipo de carga → categoria ANTT,
 * e cálculo do piso mínimo R$/ton baseado na tabela vigente.
 */

export type CategoriaAntt =
  | 'geral'
  | 'granel_solido'
  | 'granel_liquido'
  | 'frigorificada'
  | 'perigosa'
  | 'neogranel'
  | 'florestal'
  | 'conteinerizada';

export const CATEGORIA_ANTT_LABEL: Record<CategoriaAntt, string> = {
  geral: 'Carga Geral',
  granel_solido: 'Granel Sólido',
  granel_liquido: 'Granel Líquido',
  frigorificada: 'Frigorificada',
  perigosa: 'Perigosa',
  neogranel: 'Neogranel',
  florestal: 'Florestal',
  conteinerizada: 'Conteinerizada',
};

/** Mapeia número de eixos → veículos típicos */
export const EIXOS_VEICULOS_LABEL: Record<number, string> = {
  2: 'VUC, 3/4',
  3: 'Toco, Truck',
  4: 'Bitruck',
  5: 'Carreta',
  6: 'Carreta LS / Vanderléia',
  7: 'Bitrem',
  9: 'Rodotrem',
};

/** Mapeamento veículo → número de eixos (Tabela A ANTT) */
const VEICULO_EIXOS: Record<string, number> = {
  vuc: 2,
  tres_quartos: 2,
  toco: 3,
  truck: 3,
  bitruck: 4,
  carreta: 5,
  carreta_ls: 6,
  vanderleia: 6,
  bitrem: 7,
  rodotrem: 9,
};

/** Mapeamento tipo de carga (enum tipo_carga) → categoria ANTT */
const TIPO_CARGA_CATEGORIA: Record<string, CategoriaAntt> = {
  carga_seca: 'geral',
  container: 'conteinerizada',
  indivisivel: 'geral',
  granel_solido: 'granel_solido',
  granel_liquido: 'granel_liquido',
  refrigerada: 'frigorificada',
  congelada: 'frigorificada',
  perigosa: 'perigosa',
  viva: 'granel_solido',
};

export function eixosDeVeiculo(veiculoTipo: string): number | null {
  return VEICULO_EIXOS[veiculoTipo] ?? null;
}

export function categoriaAnttDeTipoCarga(tipo: string): CategoriaAntt {
  return TIPO_CARGA_CATEGORIA[tipo] ?? 'geral';
}

/**
 * Agrupa veículos selecionados por número de eixos, descartando os que não mapeiam.
 * Retorna lista ordenada por nº de eixos crescente.
 */
export function agruparVeiculosPorEixos(veiculos: string[]): Array<{
  eixos: number;
  veiculos: string[];
}> {
  const map = new Map<number, string[]>();
  for (const v of veiculos) {
    const e = eixosDeVeiculo(v);
    if (e == null) continue;
    if (!map.has(e)) map.set(e, []);
    map.get(e)!.push(v);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([eixos, veiculos]) => ({ eixos, veiculos }));
}

export interface AnttPisoRow {
  id: string;
  categoria_carga: CategoriaAntt;
  numero_eixos: number;
  valor_por_km: number;
  valor_por_km_carga_lotacao: number | null;
  vigente_desde: string;
  ativo: boolean;
}

/**
 * Calcula o piso mínimo total (R$) e R$/ton para um grupo de eixos.
 * Retorna null se não houver tabela ANTT correspondente.
 */
export function calcularPisoMinimo(params: {
  pisos: AnttPisoRow[];
  categoria: CategoriaAntt;
  eixos: number;
  distanciaKm: number;
  pesoKg: number;
}): {
  valorPorKm: number;
  pisoTotal: number;
  pisoPorTonelada: number;
} | null {
  const { pisos, categoria, eixos, distanciaKm, pesoKg } = params;
  const piso = pisos.find(
    (p) => p.categoria_carga === categoria && p.numero_eixos === eixos && p.ativo,
  );
  if (!piso || distanciaKm <= 0) return null;

  const pisoTotal = piso.valor_por_km * distanciaKm;
  const pesoTon = pesoKg / 1000;
  const pisoPorTonelada = pesoTon > 0 ? pisoTotal / pesoTon : 0;

  return {
    valorPorKm: piso.valor_por_km,
    pisoTotal: Math.round(pisoTotal * 100) / 100,
    pisoPorTonelada: Math.round(pisoPorTonelada * 100) / 100,
  };
}

/** Calcula distância em linha reta (Haversine) — fallback caso OSRM falhe */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
