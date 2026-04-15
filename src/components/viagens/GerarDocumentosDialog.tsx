import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, ArrowRight, Loader2, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GerarDocumentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viagemId: string;
  viagemCodigo: string;
  onSuccess: () => void;
}

interface PreviewData {
  ctes_to_generate: Array<{ entrega_id: string; codigo: string; uf_origem: string; uf_destino: string; valor_frete: number }>;
  ctes_already_exist: Array<{ entrega_id: string; codigo: string; uf_origem: string; uf_destino: string }>;
  mdfe_groups: Array<{ uf_origem: string; uf_destino: string; entregas: string[] }>;
  existing_mdfes: any[];
  total_ctes: number;
  total_mdfes: number;
}

interface GenerateResult {
  success: boolean;
  summary: { ctes_generated: number; ctes_failed: number; mdfes_generated: number; mdfes_failed: number };
  results: {
    ctes: Array<{ entrega_codigo: string; success: boolean; error?: string }>;
    mdfes: Array<{ uf_origem: string; uf_destino: string; success: boolean; error?: string }>;
  };
}

export function GerarDocumentosDialog({ open, onOpenChange, viagemId, viagemCodigo, onSuccess }: GerarDocumentosDialogProps) {
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ['gerar-documentos-preview', viagemId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('gerar-documentos-viagem', {
        body: { action: 'preview', viagem_id: viagemId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as PreviewData;
    },
    enabled: open && !generateResult,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gerar-documentos-viagem', {
        body: { action: 'gerar', viagem_id: viagemId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as GenerateResult;
    },
    onSuccess: (data) => {
      setGenerateResult(data);
      const { summary } = data;
      if (summary.ctes_failed === 0 && summary.mdfes_failed === 0) {
        toast.success('Documentos fiscais gerados com sucesso!', {
          description: `${summary.ctes_generated} CT-e(s) e ${summary.mdfes_generated} MDF-e(s) emitidos.`,
        });
      } else {
        toast.warning('Documentos gerados com erros', {
          description: `CT-e: ${summary.ctes_generated} ok, ${summary.ctes_failed} falha(s). MDF-e: ${summary.mdfes_generated} ok, ${summary.mdfes_failed} falha(s).`,
        });
      }
      onSuccess();
    },
    onError: (err: any) => {
      toast.error('Erro ao gerar documentos', { description: err.message });
    },
  });

  const handleClose = () => {
    setGenerateResult(null);
    onOpenChange(false);
  };

  const nothingToGenerate = preview && preview.total_ctes === 0 && preview.ctes_already_exist.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Gerar Documentos Fiscais
          </DialogTitle>
          <DialogDescription>
            Viagem <strong>{viagemCodigo}</strong> — Emissão de CT-e e MDF-e
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-4 pr-2">
            {previewLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Analisando entregas...</span>
              </div>
            )}

            {previewError && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                {(previewError as any)?.message || 'Erro ao carregar preview'}
              </div>
            )}

            {preview && !generateResult && (
              <>
                {/* CT-e Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    CT-e — Conhecimentos de Transporte
                  </h4>

                  {preview.ctes_already_exist.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Já emitidos:</p>
                      <div className="flex flex-wrap gap-1">
                        {preview.ctes_already_exist.map(c => (
                          <Badge key={c.entrega_id} variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-400">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {c.codigo}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.ctes_to_generate.length > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Serão gerados ({preview.total_ctes}):</p>
                      <div className="space-y-1">
                        {preview.ctes_to_generate.map(c => (
                          <div key={c.entrega_id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">{c.codigo}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {c.uf_origem} <ArrowRight className="w-3 h-3 inline" /> {c.uf_destino}
                              </span>
                            </div>
                            <span className="text-xs font-medium">
                              R$ {c.valor_frete?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Todos os CT-es já foram emitidos.</p>
                  )}
                </div>

                <Separator />

                {/* MDF-e Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    MDF-e — Manifestos ({preview.total_mdfes})
                  </h4>

                  {preview.existing_mdfes.length > 0 && (
                    <div className="mb-2 p-2 rounded bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {preview.existing_mdfes.length} MDF-e(s) ativo(s) serão mantidos. Novos serão criados por agrupamento de UF.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {preview.mdfe_groups.map((g, i) => (
                      <div key={i} className="p-2.5 rounded bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs">
                            {g.uf_origem} → {g.uf_destino}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {g.entregas.length} entrega{g.entregas.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {g.entregas.map(cod => (
                            <Badge key={cod} variant="outline" className="text-[10px] font-mono">{cod}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Summary */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-center">
                    Serão emitidos: <strong className="text-primary">{preview.total_ctes} CT-e(s)</strong> e{' '}
                    <strong className="text-primary">{preview.total_mdfes} MDF-e(s)</strong>
                  </p>
                </div>
              </>
            )}

            {/* Results after generation */}
            {generateResult && (
              <div className="space-y-3">
                <div className={`p-4 rounded-lg text-center ${
                  generateResult.summary.ctes_failed === 0 && generateResult.summary.mdfes_failed === 0
                    ? 'bg-green-50 dark:bg-green-900/10 border border-green-200'
                    : 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200'
                }`}>
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-semibold">Documentos Processados</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    CT-e: {generateResult.summary.ctes_generated} emitido(s)
                    {generateResult.summary.ctes_failed > 0 && `, ${generateResult.summary.ctes_failed} falha(s)`}
                    <br />
                    MDF-e: {generateResult.summary.mdfes_generated} emitido(s)
                    {generateResult.summary.mdfes_failed > 0 && `, ${generateResult.summary.mdfes_failed} falha(s)`}
                  </p>
                </div>

                {/* Show errors if any */}
                {generateResult.results.ctes.filter(c => !c.success).map((c, i) => (
                  <div key={`cte-err-${i}`} className="p-2 rounded bg-destructive/10 text-xs">
                    <XCircle className="w-3 h-3 inline mr-1 text-destructive" />
                    CT-e {c.entrega_codigo}: {c.error}
                  </div>
                ))}
                {generateResult.results.mdfes.filter(m => !m.success).map((m, i) => (
                  <div key={`mdfe-err-${i}`} className="p-2 rounded bg-destructive/10 text-xs">
                    <XCircle className="w-3 h-3 inline mr-1 text-destructive" />
                    MDF-e {m.uf_origem}→{m.uf_destino}: {m.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {!generateResult ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={generateMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || previewLoading || !!previewError || nothingToGenerate}
                className="gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {generateMutation.isPending ? 'Gerando...' : `Gerar ${preview?.total_ctes || 0} CT-e + ${preview?.total_mdfes || 0} MDF-e`}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
