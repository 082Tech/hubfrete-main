/**
 * Serviço para finalização de entregas
 * 
 * Usa Edge Function + RPC atômica para garantir:
 * - Transação única
 * - Auto-finalização de viagem quando todas entregas estão concluídas
 * - Proteção contra race conditions
 */

import { supabase } from "@/integrations/supabase/client";

export interface FinalizarEntregaParams {
  entregaId: string;
  nomeRecebedor?: string;
  documentoRecebedor?: string;
  observacoes?: string;
}

export interface FinalizarEntregaResult {
  success: boolean;
  entrega_id: string;
  entrega_status: string;
  viagem_id: string | null;
  viagem_finalizada: boolean;
  total_entregas?: number;
  entregas_concluidas?: number;
  mensagem: string;
}

export interface FinalizarEntregaError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Finaliza uma entrega e automaticamente finaliza a viagem
 * se todas as entregas estiverem concluídas.
 * 
 * @param params - Parâmetros da finalização
 * @returns Resultado da operação
 * @throws Error se a chamada falhar
 * 
 * @example
 * ```ts
 * const result = await finalizarEntrega({
 *   entregaId: 'uuid-da-entrega',
 *   nomeRecebedor: 'João Silva',
 *   documentoRecebedor: '123.456.789-00'
 * });
 * 
 * if (result.viagem_finalizada) {
 *   console.log('Viagem também foi finalizada!');
 * }
 * ```
 */
export async function finalizarEntrega(
  params: FinalizarEntregaParams
): Promise<FinalizarEntregaResult> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Usuário não autenticado");
  }

  const response = await supabase.functions.invoke<FinalizarEntregaResult | FinalizarEntregaError>(
    "finalizar-entrega",
    {
      body: {
        entrega_id: params.entregaId,
        nome_recebedor: params.nomeRecebedor,
        documento_recebedor: params.documentoRecebedor,
        observacoes: params.observacoes,
      },
    }
  );

  if (response.error) {
    throw new Error(response.error.message || "Erro ao finalizar entrega");
  }

  const data = response.data;

  if (!data) {
    throw new Error("Resposta vazia da API");
  }

  if (!data.success) {
    const errorData = data as FinalizarEntregaError;
    throw new Error(errorData.message || errorData.error || "Erro desconhecido");
  }

  return data as FinalizarEntregaResult;
}

/**
 * Hook helper para usar com React Query
 * 
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: finalizarEntrega,
 *   onSuccess: (data) => {
 *     toast.success(data.mensagem);
 *     if (data.viagem_finalizada) {
 *       toast.info('Viagem também foi finalizada!');
 *     }
 *   }
 * });
 * ```
 */
export const finalizarEntregaMutationFn = finalizarEntrega;
