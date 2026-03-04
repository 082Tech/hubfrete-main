/**
 * EntregaDocsDialog
 * Modal dedicado para visualização de documentos de uma entrega no histórico.
 * Exibe: NF-es (tabela nfes), CT-es (tabela ctes) e Canhoto (campo canhoto_url).
 * Usado em ambos os portais: transportadora e embarcador.
 */
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FilePreviewDialog } from './FilePreviewDialog';
import {
    FileText,
    FileCode,
    Stamp,
    Eye,
    Loader2,
    AlertCircle,
    CheckCircle,
    Package,
    Paperclip,
    Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { OutroDocumento } from './EntregaDocumentosPanel';

interface EntregaDocsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entregaId: string;
    entregaCodigo?: string | null;
    canhotoUrl?: string | null;
    outrosDocumentos?: OutroDocumento[];
}

interface CteRow {
    id: string;
    numero: string | null;
    url: string | null;
    created_at: string;
}

interface NfeRow {
    id: string;
    numero: string | null;
    chave_acesso: string | null;
    url: string | null;
    valor: number | null;
    cte_id: string | null;
}

// ─── Section label ───────────────────────────────────────────────────────────
function SectionLabel({
    icon,
    label,
    count,
}: {
    icon: React.ReactNode;
    label: string;
    count?: number;
}) {
    return (
        <div className="flex items-center gap-1.5 mb-2">
            {icon}
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                {label}
            </span>
            {count !== undefined && count > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {count}
                </Badge>
            )}
        </div>
    );
}

// ─── Doc row card ─────────────────────────────────────────────────────────────
function DocRow({
    icon,
    title,
    subtitle,
    url,
    onPreview,
    missing,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    url?: string | null;
    onPreview: (url: string, title: string) => void;
    missing?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${missing
                    ? 'border-dashed border-muted bg-muted/20'
                    : url
                        ? 'border-border bg-card'
                        : 'border-dashed border-muted bg-muted/20'
                }`}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <div className={`shrink-0 ${missing || !url ? 'opacity-40' : ''}`}>{icon}</div>
                <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${missing || !url ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {title}
                    </p>
                    {subtitle && (
                        <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
                    )}
                </div>
            </div>
            {url ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-primary hover:bg-primary/10 shrink-0"
                    onClick={() => onPreview(url, title)}
                >
                    <Eye className="w-3 h-3" />
                    <span className="text-xs">Ver</span>
                </Button>
            ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                    {missing ? 'Pendente' : 'Sem arquivo'}
                </Badge>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EntregaDocsDialog({
    open,
    onOpenChange,
    entregaId,
    entregaCodigo,
    canhotoUrl,
}: EntregaDocsDialogProps) {
    const [loading, setLoading] = useState(false);
    const [ctes, setCtes] = useState<CteRow[]>([]);
    const [nfes, setNfes] = useState<NfeRow[]>([]);

    // Preview
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');

    const openPreview = (url: string, title: string) => {
        setPreviewUrl(url);
        setPreviewTitle(title);
        setPreviewOpen(true);
    };

    useEffect(() => {
        if (!open || !entregaId) {
            setCtes([]);
            setNfes([]);
            return;
        }

        setLoading(true);
        Promise.all([
            (supabase as any)
                .from('ctes')
                .select('id, numero, url, created_at')
                .eq('entrega_id', entregaId)
                .order('created_at', { ascending: true }),
            (supabase as any)
                .from('nfes')
                .select('id, numero, chave_acesso, url, valor, cte_id')
                .eq('entrega_id', entregaId)
                .order('created_at', { ascending: true }),
        ])
            .then(([ctesRes, nfesRes]) => {
                setCtes(ctesRes.data || []);
                setNfes(nfesRes.data || []);
            })
            .finally(() => setLoading(false));
    }, [open, entregaId]);

    // Derived status icons
    const hasCte = ctes.length > 0;
    const hasNfe = nfes.length > 0;
    const hasCanhoto = !!canhotoUrl;
    const allPresent = hasCte && hasNfe && hasCanhoto;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Package className="w-4 h-4 text-primary" />
                            Documentos da Entrega
                            {entregaCodigo && (
                                <span className="font-mono text-sm text-muted-foreground font-normal">
                                    – {entregaCodigo}
                                </span>
                            )}
                            {allPresent ? (
                                <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-[10px]">
                                    <CheckCircle className="w-3 h-3" />
                                    Completo
                                </Badge>
                            ) : (
                                <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px]">
                                    <AlertCircle className="w-3 h-3" />
                                    Pendente
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* ── NF-es ─────────────────────────────────── */}
                            <div>
                                <SectionLabel
                                    icon={<FileCode className="w-3.5 h-3.5 text-indigo-500" />}
                                    label="Notas Fiscais (NF-e)"
                                    count={nfes.length}
                                />
                                {nfes.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {nfes.map((nfe, i) => (
                                            <DocRow
                                                key={nfe.id}
                                                icon={<FileCode className="w-4 h-4 text-indigo-500" />}
                                                title={`NF-e ${nfe.numero || nfe.chave_acesso?.slice(-6) || i + 1}`}
                                                subtitle={
                                                    nfe.valor
                                                        ? `R$ ${Number(nfe.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                        : nfe.chave_acesso
                                                            ? `...${nfe.chave_acesso.slice(-8)}`
                                                            : undefined
                                                }
                                                url={nfe.url}
                                                onPreview={openPreview}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <DocRow
                                        icon={<FileCode className="w-4 h-4 text-indigo-400" />}
                                        title="Notas Fiscais"
                                        subtitle="Nenhuma NF-e anexada pelo embarcador"
                                        onPreview={openPreview}
                                        missing
                                    />
                                )}
                            </div>

                            {/* ── CT-es ─────────────────────────────────── */}
                            <div>
                                <SectionLabel
                                    icon={<FileText className="w-3.5 h-3.5 text-amber-500" />}
                                    label="CT-e (Conhecimento de Transporte)"
                                    count={ctes.length}
                                />
                                {ctes.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {ctes.map((cte, i) => (
                                            <DocRow
                                                key={cte.id}
                                                icon={<FileText className="w-4 h-4 text-amber-500" />}
                                                title={`CT-e ${cte.numero || `#${i + 1}`}`}
                                                url={cte.url}
                                                onPreview={openPreview}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <DocRow
                                        icon={<FileText className="w-4 h-4 text-amber-400" />}
                                        title="CT-e"
                                        subtitle="Nenhum CT-e anexado pela transportadora"
                                        onPreview={openPreview}
                                        missing
                                    />
                                )}
                            </div>

                            {/* ── Canhoto ───────────────────────────────── */}
                            <div>
                                <SectionLabel
                                    icon={<Stamp className="w-3.5 h-3.5 text-emerald-500" />}
                                    label="Canhoto de Entrega"
                                />
                                <DocRow
                                    icon={<Stamp className="w-4 h-4 text-emerald-500" />}
                                    title="Canhoto"
                                    subtitle={hasCanhoto ? 'Comprovante de entrega' : 'Aguardando transportadora'}
                                    url={canhotoUrl}
                                    onPreview={openPreview}
                                    missing={!hasCanhoto}
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <FilePreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                fileUrl={previewUrl}
                title={previewTitle}
            />
        </>
    );
}
