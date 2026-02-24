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
  nfes: NfeDoc[];
}

export interface NfeDoc {
  id: string;
  numero: string | null;
  chave_acesso: string | null;
  url: string | null;
  xml_url: string | null;
  valor: number | null;
  data_emissao: string | null;
}

export interface ManifestoDoc {
  id: string;
  numero: string | null;
  chave_acesso: string | null;
  url: string | null;
  status: string;
  created_at: string;
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
    .select('id, entrega_id, numero, chave_acesso, url, xml_url, valor')
    .in('entrega_id', entregaIds)
    .order('created_at', { ascending: true });

  if (error || !ctes) return {};

  const cteIds = ctes.map((c: any) => c.id);
  let nfesMap: Record<string, NfeDoc[]> = {};

  if (cteIds.length > 0) {
    const { data: nfes } = await (supabase as any)
      .from('nfes')
      .select('id, cte_id, numero, chave_acesso, url, xml_url, valor, data_emissao')
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
        data_emissao: nf.data_emissao,
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
    .from('mdfes')
    .select('id, viagem_id, numero, chave_acesso, pdf_path, status, created_at, encerrado_at, erro')
    .in('viagem_id', viagemIds)
    .order('created_at', { ascending: true });

  if (error || !manifestos) return {};

  const result: Record<string, ManifestoDoc[]> = {};
  manifestos.forEach((m: any) => {
    if (!result[m.viagem_id]) result[m.viagem_id] = [];

    let publicUrl = m.pdf_path;
    if (m.pdf_path) {
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(m.pdf_path);
      publicUrl = urlData?.publicUrl || m.pdf_path;
    }

    result[m.viagem_id].push({
      id: m.id,
      numero: m.numero,
      chave_acesso: m.chave_acesso,
      url: publicUrl, // Full public URL
      status: m.status,
      created_at: m.created_at,
      encerrado_em: m.encerrado_at,
      observacoes: m.erro,
    });
  });

  return result;
}

/**
 * Get the active manifesto for a viagem from a list of manifestos.
 */
export function getActiveManifesto(manifestos: ManifestoDoc[]): ManifestoDoc | null {
  return manifestos.find(m => m.status === 'processando' || m.status === 'autorizado') || null;
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

/**
 * Fetch NF-es directly linked to an entrega (not through CT-e).
 * Used to check if embarcador has attached NF-es before allowing transition.
 */
export async function fetchNfesForEntrega(entregaId: string): Promise<(NfeDoc & { cte_id?: string | null })[]> {
  const { data, error } = await (supabase as any)
    .from('nfes')
    .select('id, cte_id, numero, chave_acesso, url, xml_url, valor, data_emissao')
    .eq('entrega_id', entregaId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * Check if an entrega has at least one NF-e attached (required before saiu_para_entrega).
 */
export async function hasNfeAttached(entregaId: string): Promise<boolean> {
  const { count, error } = await (supabase as any)
    .from('nfes')
    .select('id', { count: 'exact', head: true })
    .eq('entrega_id', entregaId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Poll CT-e status via the focusnfe-cte edge function.
 * Returns the current focus_status after querying.
 */
export async function pollCteStatus(focusRef: string): Promise<{ status: string; data: any }> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL || 'https://eilwdavgnuhfyxfqkvrk.supabase.co'}/functions/v1/focusnfe-cte`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbHdkYXZnbnVoZnl4ZnFrdnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjUxNjIsImV4cCI6MjA4MzMwMTE2Mn0.kwfOZWgzUEhhQYE3NEPfhYoAQMok0suqVp6FsWBHmu8',
      },
      body: JSON.stringify({ action: 'consultar', ref: focusRef }),
    }
  );

  const result = await response.json();
  return { status: result.data?.status || 'desconhecido', data: result.data };
}
