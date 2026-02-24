/**
 * ManifestoHistoricoPanel
 *
 * Exibe o histórico de manifestos (MDF-e) de uma viagem.
 * Mostra o ativo em destaque e os anteriores (encerrados) em linha do tempo.
 * Permite encerrar o atual e anexar um novo via AnexarManifestoViagemDialog.
 */
import { useState } from 'react';
import { FileText, Plus, Eye, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnexarManifestoViagemDialog } from './AnexarManifestoViagemDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import type { ManifestoDoc } from '@/lib/documentHelpers';

interface ManifestoHistoricoPanelProps {
    viagemId: string;
    viagemCodigo: string;
    manifestos: ManifestoDoc[];
    onRefresh: () => void;
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
}: ManifestoHistoricoPanelProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const [histOpen, setHistOpen] = useState(false);

    const activeManifesto = manifestos.find(
        m => m.status === 'processando' || m.status === 'autorizado'
    ) || null;

    const historico = manifestos
        .filter(m => m.status === 'encerrado' || m.status === 'cancelado' || m.status === 'erro')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const openPreview = (url: string, title: string) => {
        setPreviewUrl(url);
        setPreviewTitle(title);
        setPreviewOpen(true);
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
                <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] gap-1 border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={() => setDialogOpen(true)}
                >
                    <Plus className="w-3 h-3" />
                    {activeManifesto ? 'Novo Manifesto' : 'Anexar Manifesto'}
                </Button>
            </div>

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
                        {activeManifesto.url && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 w-full"
                                onClick={() => openPreview(activeManifesto.url!, 'MDF-e ativo')}
                            >
                                <Eye className="w-3 h-3" /> Visualizar PDF
                            </Button>
                        )}
                    </div>
                );
            })() : (
                <div className="rounded-xl border border-dashed border-violet-200 dark:border-violet-800 p-4 text-center">
                    <p className="text-[11px] text-muted-foreground">Nenhum manifesto ativo</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Clique em "Anexar Manifesto" para adicionar</p>
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
