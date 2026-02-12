/**
 * Document helpers for the new hierarchical document model:
 * Viagem → Manifestos (MDF-e)
 * Entrega → CT-es → NF-es
 * Entrega → Canhoto (canhoto_url field)
 */

import { supabase } from '@/integrations/supabase/client';

// Types for the new document model
export interface CteDoc {
  id: string;
  numero: string | null;
  chave_acesso: string | null;
  url: string | null;
  xml_url: string | null;
  valor: number | null;
  emitido_em: string | null;
  nfes: NfeDoc[];
}

export interface NfeDoc {
  id: string;
  numero: string | null;
  chave_acesso: string | null;
  url: string | null;
  xml_url: string | null;
  valor: number | null;
  emitido_em: string | null;
}

export interface ManifestoDoc {
  id: string;
  numero: string | null;
  chave_acesso: string | null;
  url: string | null;
  status: string;
  emitido_em: string;
  encerrado_em: string | null;
  observacoes: string | null;
}

/**
 * Fetch CT-es and their NF-es for given entrega IDs.
 * Returns a map: entregaId → CteDoc[]
 */
export async function fetchCtesForEntregas(entregaIds: string[]): Promise<Record<string, CteDoc[]>> {
  if (entregaIds.length === 0) return {};

  const { data: ctes, error } = await (supabase as any)
    .from('ctes')
    .select('id, entrega_id, numero, chave_acesso, url, xml_url, valor, emitido_em')
    .in('entrega_id', entregaIds)
    .order('created_at', { ascending: true });

  if (error || !ctes) return {};

  const cteIds = ctes.map((c: any) => c.id);
  let nfesMap: Record<string, NfeDoc[]> = {};

  if (cteIds.length > 0) {
    const { data: nfes } = await (supabase as any)
      .from('nfes')
      .select('id, cte_id, numero, chave_acesso, url, xml_url, valor, emitido_em')
      .in('cte_id', cteIds)
      .order('created_at', { ascending: true });

    (nfes || []).forEach((nf: any) => {
      if (!nfesMap[nf.cte_id]) nfesMap[nf.cte_id] = [];
      nfesMap[nf.cte_id].push({
        id: nf.id,
        numero: nf.numero,
        chave_acesso: nf.chave_acesso,
        url: nf.url,
        xml_url: nf.xml_url,
        valor: nf.valor,
        emitido_em: nf.emitido_em,
      });
    });
  }

  const result: Record<string, CteDoc[]> = {};
  ctes.forEach((cte: any) => {
    if (!result[cte.entrega_id]) result[cte.entrega_id] = [];
    result[cte.entrega_id].push({
      id: cte.id,
      numero: cte.numero,
      chave_acesso: cte.chave_acesso,
      url: cte.url,
      xml_url: cte.xml_url,
      valor: cte.valor,
      emitido_em: cte.emitido_em,
      nfes: nfesMap[cte.id] || [],
    });
  });

  return result;
}

/**
 * Fetch manifestos for given viagem IDs.
 * Returns a map: viagemId → ManifestoDoc[]
 */
export async function fetchManifestosForViagens(viagemIds: string[]): Promise<Record<string, ManifestoDoc[]>> {
  if (viagemIds.length === 0) return {};

  const { data: manifestos, error } = await (supabase as any)
    .from('manifestos')
    .select('id, viagem_id, numero, chave_acesso, url, status, emitido_em, encerrado_em, observacoes')
    .in('viagem_id', viagemIds)
    .order('emitido_em', { ascending: true });

  if (error || !manifestos) return {};

  const result: Record<string, ManifestoDoc[]> = {};
  manifestos.forEach((m: any) => {
    if (!result[m.viagem_id]) result[m.viagem_id] = [];
    result[m.viagem_id].push({
      id: m.id,
      numero: m.numero,
      chave_acesso: m.chave_acesso,
      url: m.url,
      status: m.status,
      emitido_em: m.emitido_em,
      encerrado_em: m.encerrado_em,
      observacoes: m.observacoes,
    });
  });

  return result;
}

/**
 * Get the active manifesto for a viagem from a list of manifestos.
 */
export function getActiveManifesto(manifestos: ManifestoDoc[]): ManifestoDoc | null {
  return manifestos.find(m => m.status === 'ativo') || null;
}

/**
 * Count total NF-es across all CT-es of an entrega.
 */
export function countNfes(ctes: CteDoc[]): number {
  return ctes.reduce((sum, cte) => sum + cte.nfes.length, 0);
}

/**
 * Check if required documents are present for an entrega.
 * Required: at least 1 CT-e, at least 1 NF-e (within CT-e), and canhoto.
 */
export function checkEntregaDocs(ctes: CteDoc[], canhotoUrl: string | null): { complete: boolean; missing: string[] } {
  const missing: string[] = [];

  if (ctes.length === 0) missing.push('CT-e');
  if (countNfes(ctes) === 0) missing.push('Nota Fiscal');
  if (!canhotoUrl) missing.push('Canhoto');

  return { complete: missing.length === 0, missing };
}
