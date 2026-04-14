/**
 * ManifestoHistoricoPanel
 *
 * Exibe o histórico de manifestos (MDF-e) de uma viagem.
 * Mostra o ativo em destaque e os anteriores (encerrados) em linha do tempo.
 * Permite gerar MDF-e via FocusNFe, encerrar o atual e gerar novo.
 * Analisa UFs das entregas para determinar se precisa de múltiplos MDF-es.
 */
import { useState, useMemo } from 'react';
import { FileText, Plus, Eye, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight, AlertCircle, Loader2, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { AnexarManifestoViagemDialog } from './AnexarManifestoViagemDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import type { ManifestoDoc } from '@/lib/documentHelpers';

interface EntregaUfInfo {
    id: string;
    codigo: string;
    uf_origem: string | null;
    uf_destino: string | null;
    has_cte: boolean;
}

interface ManifestoHistoricoPanelProps {
    viagemId: string;
    viagemCodigo: string;
    manifestos: ManifestoDoc[];
    onRefresh: () => void;
    /** Entregas com UF para análise de agrupamento MDF-e */
    entregasUf?: EntregaUfInfo[];
}

type Status = ManifestoDoc['status'];

const statusConfig: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
    processando: { label: 'Em processamento', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock },
    autorizado: { label: 'Autorizado', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle },
    encerrado: { label: 'Encerrado', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-600 border-red-200', icon: XCircle },
    erro: { label: 'Erro', color: 'bg-red-100 text-red-600 border-red-200', icon: AlertCircle },
};

function formatDate(dt: string | null | undefined) {
    if (!dt) return '—';
    try {
        return format(new Date(dt), "dd/MM/yy 'às' HH:mm", { locale: ptBR });
    } catch {
        return '—';
    }
}

export function ManifestoHistoricoPanel({
    viagemId,
    viagemCodigo,
    manifestos,
    onRefresh,
    entregasUf = [],
}: ManifestoHistoricoPanelProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const [histOpen, setHistOpen] = useState(false);
    const [gerando, setGerando] = useState(false);
    const [encerrando, setEncerrando] = useState(false);
    const { empresa } = useUserContext();

    const activeManifesto = manifestos.find(
        m => m.status === 'processando' || m.status === 'autorizado'
    ) || null;

    const historico = manifestos
        .filter(m => m.status === 'encerrado' || m.status === 'cancelado' || m.status === 'erro')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Análise de UF para agrupamento de MDF-e
    const ufGroups = useMemo(() => {
        if (entregasUf.length === 0) return [];
        const groups = new Map<string, EntregaUfInfo[]>();
        for (const e of entregasUf) {
            const key = `${e.uf_origem || '??'} → ${e.uf_destino || '??'}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(e);
        }
        return Array.from(groups.entries()).map(([key, entregas]) => ({
            key,
            uf_origem: entregas[0].uf_origem,
            uf_destino: entregas[0].uf_destino,
            entregas,
            allHaveCte: entregas.every(e => e.has_cte),
        }));
    }, [entregasUf]);

    const needsMultipleMdfe = ufGroups.length > 1;
    const hasAnyCte = entregasUf.some(e => e.has_cte);

    const openPreview = (url: string, title: string) => {
        setPreviewUrl(url);
        setPreviewTitle(title);
        setPreviewOpen(true);
    };

    const handleGerarMdfe = async () => {
        setGerando(true);
        try {
            const { data, error } = await supabase.functions.invoke('focusnfe-mdfe', {
                body: { action: 'emitir', viagem_id: viagemId },
            });
            if (error) throw error;
            if (data?.erro || data?.error) {
                toast.error(`Erro ao gerar MDF-e: ${data.erro || data.error || data.mensagem}`);
            } else {
                toast.success('MDF-e enviado para processamento!');
                onRefresh();
            }
        } catch (err: any) {
            toast.error(`Erro ao gerar MDF-e: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setGerando(false);
        }
    };

    const handleEncerrarMdfe = async () => {
        if (!activeManifesto) return;
        setEncerrando(true);
        try {
            const { data, error } = await supabase.functions.invoke('focusnfe-mdfe', {
                body: { action: 'encerrar', viagem_id: viagemId, ref: activeManifesto.id },
            });
            if (error) throw error;
            if (data?.erro || data?.error) {
                toast.error(`Erro ao encerrar MDF-e: ${data.erro || data.error}`);
            } else {
                // Atualizar status local
                await (supabase as any)
                    .from('mdfes')
                    .update({ status: 'encerrado', encerrado_at: new Date().toISOString() })
                    .eq('id', activeManifesto.id);
                toast.success('MDF-e encerrado com sucesso!');
                onRefresh();
            }
        } catch (err: any) {
            toast.error(`Erro ao encerrar MDF-e: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setEncerrando(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-xs font-semibold">MDF-e / Manifesto</span>
                    {manifestos.length > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-violet-200 text-violet-600">
                            {manifestos.length} total
                        </Badge>
                    )}
                </div>
            </div>

            {/* Análise de UF */}
            {needsMultipleMdfe && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 p-2.5 text-[11px]">
                    <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-300">Múltiplos MDF-e necessários</p>
                            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                                As cargas possuem UFs de destino diferentes. Cada trecho exige um MDF-e separado.
                            </p>
                            <div className="mt-1.5 space-y-1">
                                {ufGroups.map(g => (
                                    <div key={g.key} className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300">
                                            {g.key}
                                        </Badge>
                                        <span className="text-amber-600">
                                            {g.entregas.length} carga{g.entregas.length > 1 ? 's' : ''}
                                            {!g.allHaveCte && ' (aguardando CT-e)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botão de Gerar MDF-e */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/20"
                                onClick={handleGerarMdfe}
                                disabled={gerando || !hasAnyCte}
                            >
                                {gerando ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Gerando MDF-e...</>
                                ) : (
                                    <><Plus className="w-3 h-3" /> Gerar MDF-e</>
                                )}
                            </Button>
                        </div>
                    </TooltipTrigger>
                    {!hasAnyCte && (
                        <TooltipContent>
                            <p>Aguardando CT-e para gerar o MDF-e</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>

            {/* Active manifesto */}
            {activeManifesto ? (() => {
                const cfg = statusConfig[activeManifesto.status] || statusConfig['processando'];
                const Icon = cfg.icon;
                return (
                    <div className="rounded-xl border-2 border-violet-200 dark:border-violet-700/50 bg-violet-50/60 dark:bg-violet-900/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-violet-600" />
                                <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                                    Manifesto ativo
                                </span>
                            </div>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${cfg.color}`}>
                                {cfg.label}
                            </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                            {activeManifesto.numero && <p>Nº {activeManifesto.numero}</p>}
                            <p>Emitido em {formatDate(activeManifesto.created_at)}</p>
                            {activeManifesto.observacoes && (
                                <p className="text-amber-600">Obs: {activeManifesto.observacoes}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {activeManifesto.url && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1 flex-1"
                                    onClick={() => openPreview(activeManifesto.url!, 'MDF-e ativo')}
                                >
                                    <Eye className="w-3 h-3" /> Visualizar
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                onClick={handleEncerrarMdfe}
                                disabled={encerrando}
                            >
                                {encerrando ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <StopCircle className="w-3 h-3" />
                                )}
                                Encerrar
                            </Button>
                        </div>
                    </div>
                );
            })() : (
                <div className="rounded-xl border border-dashed border-violet-200 dark:border-violet-800 p-4 text-center">
                    <p className="text-[11px] text-muted-foreground">Nenhum manifesto ativo</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Clique em "Gerar MDF-e" para emitir</p>
                </div>
            )}

            {/* History toggle */}
            {historico.length > 0 && (
                <div>
                    <button
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setHistOpen(o => !o)}
                    >
                        {histOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Histórico ({historico.length} manifesto{historico.length !== 1 ? 's' : ''} anterior{historico.length !== 1 ? 'es' : ''})
                    </button>

                    {histOpen && (
                        <div className="mt-2 space-y-1.5 border-l-2 border-muted ml-1.5 pl-3">
                            {historico.map((m, idx) => {
                                const cfg = statusConfig[m.status] || statusConfig['encerrado'];
                                const Icon = cfg.icon;
                                return (
                                    <div
                                        key={m.id}
                                        className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-lg bg-muted/30"
                                    >
                                        <div className="flex items-start gap-2 min-w-0">
                                            <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-medium text-foreground truncate">
                                                    Manifesto {historico.length - idx}
                                                    {m.numero ? ` · Nº ${m.numero}` : ''}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">{formatDate(m.created_at)}</p>
                                                {m.encerrado_em && (
                                                    <p className="text-[10px] text-muted-foreground">Encerrado {formatDate(m.encerrado_em)}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${cfg.color}`}>
                                                {cfg.label}
                                            </Badge>
                                            {m.url && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openPreview(m.url!, `Manifesto ${historico.length - idx}`)}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Dialogs */}
            <AnexarManifestoViagemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                viagemId={viagemId}
                viagemCodigo={viagemCodigo}
                onSuccess={() => {
                    setDialogOpen(false);
                    onRefresh();
                }}
            />

            <FilePreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                fileUrl={previewUrl}
                title={previewTitle}
            />
        </div>
    );
}
