/**
 * EntregaDocumentosPanel — v3
 *
 * Correções v3:
 *  - Estado LOCAL de ctes e canhotoUrl → atualiza na hora sem recarregar
 *  - Botão excluir CT-e
 *  - Removida seção "Adicionar NF-e" do accordion (é responsabilidade do embarcador)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
    FileText, Plus, Upload, Eye, Trash2,
    FileCode, Stamp, Loader2, X, CheckCircle, AlertCircle, File, Paperclip, Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FilePreviewDialog } from './FilePreviewDialog';
import type { CteDoc, NfeDoc } from '@/lib/documentHelpers';

export type DocumentosPerfil = 'embarcador' | 'transportadora';

export interface OutroDocumento {
    url: string;
    nome: string;
    uploaded_by: string;
    uploaded_at: string;
    tipo_usuario: 'embarcador' | 'transportadora';
}

interface EntregaDocumentosPanelProps {
    perfil: DocumentosPerfil;
    entregaId: string;
    ctes: CteDoc[];
    nfesDiretas?: NfeDoc[];
    canhotoUrl?: string | null;
    outrosDocumentos?: OutroDocumento[];
    onRefresh: () => void;
}

// ─── utils ────────────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];
const MAX_MB = 10;

function humanSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(file: File) {
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (file.type.includes('xml')) return <FileCode className="w-4 h-4 text-blue-400" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
}

function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
    const valid: File[] = [];
    const errors: string[] = [];
    for (const f of files) {
        if (!ACCEPTED_TYPES.includes(f.type)) {
            errors.push(`${f.name}: tipo não permitido (use PDF, XML ou imagem)`);
            continue;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            errors.push(`${f.name}: muito grande (máx ${MAX_MB} MB)`);
            continue;
        }
        valid.push(f);
    }
    return { valid, errors };
}

async function uploadFile(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage
        .from('documentos')
        .upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('documentos').getPublicUrl(path);
    return data.publicUrl;
}

// ─── StagingFile ──────────────────────────────────────────────────────────────
interface StagingFile {
    id: string;
    file: File;
    preview?: string;
}

function toStaging(files: File[]): StagingFile[] {
    return files.map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
}

// ─── StagingList ─────────────────────────────────────────────────────────────
function StagingList({
    items, onRemove, onConfirm, uploading, label,
}: {
    items: StagingFile[];
    onRemove: (id: string) => void;
    onConfirm: () => void;
    uploading: boolean;
    label: string;
}) {
    return (
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.03] p-3 space-y-2 mt-2">
            <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-wide">
                {items.length} arquivo{items.length !== 1 ? 's' : ''} — confirme antes de enviar
            </p>
            <div className="space-y-1.5">
                {items.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 bg-background rounded-lg px-2 py-1.5 border border-border/60 text-xs">
                        {s.preview
                            ? <img src={s.preview} alt="" className="w-7 h-7 rounded object-cover border" />
                            : <span className="shrink-0">{fileIcon(s.file)}</span>}
                        <span className="flex-1 font-medium truncate">{s.file.name}</span>
                        <span className="text-muted-foreground shrink-0">{humanSize(s.file.size)}</span>
                        <button
                            onClick={() => onRemove(s.id)}
                            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            disabled={uploading}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={onConfirm} disabled={uploading}>
                    {uploading
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</>
                        : <><Upload className="w-3 h-3" /> Confirmar {label}</>}
                </Button>
                {!uploading && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => items.forEach((s) => onRemove(s.id))}>
                        Cancelar
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
function DropZone({
    label, hint, accentColor, inputRef, multiple = false, onFiles,
}: {
    label: string; hint: string; accentColor: string;
    inputRef: React.RefObject<HTMLInputElement>; multiple?: boolean;
    onFiles: (files: File[]) => void;
}) {
    const [dragging, setDragging] = useState(false);

    return (
        <div
            className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer select-none
        ${dragging ? 'border-primary bg-primary/5 scale-[1.01]' : `${accentColor} hover:border-opacity-80`}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = Array.from(e.dataTransfer.files); if (f.length) onFiles(f); }}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" multiple={multiple} className="hidden"
                onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ''; }}
            />
            <div className="flex flex-col items-center justify-center py-5 px-3 gap-1" onClick={(e) => e.stopPropagation()}>
                <Upload className="w-5 h-5 text-muted-foreground mb-0.5" />
                <p className="text-xs font-semibold text-foreground/80">{label}</p>
                <p className="text-[10px] text-muted-foreground text-center">{hint}</p>
                <Button size="sm" variant="outline" className="h-7 text-xs mt-1.5 gap-1"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                    <Plus className="w-3 h-3" /> Selecionar arquivo{multiple ? 's' : ''}
                </Button>
            </div>
        </div>
    );
}

// ─── CteCard ─────────────────────────────────────────────────────────────────
function CteCard({
    cte, index, onPreview, onDelete,
}: {
    cte: CteDoc; index: number;
    onPreview: (url: string, title: string) => void;
    onDelete: (id: string) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleting(true);
        try {
            const { error } = await (supabase as any).from('ctes').delete().eq('id', cte.id);
            if (error) throw error;
            toast.success('CT-e removido!');
            onDelete(cte.id);
        } catch (err: any) {
            toast.error(`Erro ao remover CT-e: ${err?.message || 'Erro'}`);
            setDeleting(false);
        }
    };

    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 overflow-hidden bg-card">
            <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50/80 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-100 truncate">
                        CT-e {cte.numero || `#${index + 1}`}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    {cte.url && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
                            title="Visualizar CT-e"
                            onClick={() => onPreview(cte.url!, `CT-e ${cte.numero || index + 1}`)}>
                            <Eye className="w-3 h-3" />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        title="Excluir CT-e" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── NfeRow ──────────────────────────────────────────────────────────────────
function NfeRow({
    nfe, index, onPreview, onDelete,
}: {
    nfe: NfeDoc; index: number;
    onPreview: (url: string, title: string) => void;
    onDelete: (id: string) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleting(true);
        try {
            const { error } = await (supabase as any).from('nfes').delete().eq('id', nfe.id);
            if (error) throw error;
            toast.success('NF-e removida!');
            onDelete(nfe.id);
        } catch (err: any) {
            toast.error(`Erro ao remover NF-e: ${err?.message || 'Erro'}`);
            setDeleting(false);
        }
    };

    return (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/40 bg-indigo-50/40 dark:bg-indigo-900/10 text-xs">
            <div className="flex items-center gap-2">
                <FileCode className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-800 dark:text-indigo-200">NF-e {nfe.numero || nfe.chave_acesso?.slice(-6) || index + 1}</span>
            </div>
            <div className="flex items-center gap-0.5">
                {nfe.url && (
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-indigo-500"
                        onClick={() => onPreview(nfe.url!, `NF-e ${index + 1}`)}>
                        <Eye className="w-3 h-3" />
                    </Button>
                )}
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                    title="Excluir NF-e" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </Button>
            </div>
        </div>
    );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
function SectionTitle({ icon, label, count, badge }: {
    icon: React.ReactNode; label: string; count?: number; badge?: string;
}) {
    return (
        <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-xs font-semibold">{label}</span>
            {count !== undefined && count > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{count}</Badge>
            )}
            {badge && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600">{badge}</Badge>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function EntregaDocumentosPanel({
    perfil, entregaId, ctes: ctesProp, nfesDiretas = [], canhotoUrl: canhotoUrlProp, outrosDocumentos: outrosDocsProp = [], onRefresh,
}: EntregaDocumentosPanelProps) {

    // ── Estado LOCAL (atualiza imediatamente sem depender do ciclo do pai) ──────
    const [localCtes, setLocalCtes] = useState<CteDoc[]>(ctesProp);
    const [localCanhotoUrl, setLocalCanhotoUrl] = useState<string | null>(canhotoUrlProp ?? null);
    const [localOutros, setLocalOutros] = useState<OutroDocumento[]>(outrosDocsProp);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Sincroniza quando o pai manda novos dados
    useEffect(() => { setLocalCtes(ctesProp); }, [ctesProp]);
    useEffect(() => { setLocalCanhotoUrl(canhotoUrlProp ?? null); }, [canhotoUrlProp]);
    useEffect(() => { setLocalOutros(outrosDocsProp); }, [outrosDocsProp]);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    }, []);

    // ── Preview dialog ──────────────────────────────────────────────────────────
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');

    const openPreview = useCallback((url: string, title: string) => {
        setPreviewUrl(url); setPreviewTitle(title); setPreviewOpen(true);
    }, []);

    // ── CT-e staging ────────────────────────────────────────────────────────────
    const [stagingCtes, setStagingCtes] = useState<StagingFile[]>([]);
    const [uploadingCte, setUploadingCte] = useState(false);
    const cteRef = useRef<HTMLInputElement>(null);

    const handleCteFiles = (files: File[]) => {
        const { valid, errors } = validateFiles(files);
        errors.forEach((e) => toast.error(e));
        if (valid.length) setStagingCtes((prev) => [...prev, ...toStaging(valid)]);
    };

    const removeCteStaging = (id: string) => {
        setStagingCtes((prev) => {
            const s = prev.find((x) => x.id === id);
            if (s?.preview) URL.revokeObjectURL(s.preview);
            return prev.filter((x) => x.id !== id);
        });
    };

    const confirmCteUpload = async () => {
        setUploadingCte(true);
        const newCtes: CteDoc[] = [];
        try {
            for (const s of stagingCtes) {
                const ext = s.file.name.split('.').pop();
                const path = `ctes/${entregaId}/${Date.now()}_${Math.random().toString(36).slice(7)}.${ext}`;
                const url = await uploadFile(s.file, path);
                const { data, error } = await (supabase as any)
                    .from('ctes')
                    .insert({ entrega_id: entregaId, url })
                    .select('id, entrega_id, numero, chave_acesso, url, xml_url, valor')
                    .single();
                if (error) throw error;
                newCtes.push({ ...data, nfes: [] });
            }
            if (newCtes.length > 0) {
                // Atualiza estado local imediatamente
                setLocalCtes((prev) => [...prev, ...newCtes]);
                toast.success(newCtes.length > 1 ? `${newCtes.length} CT-es adicionados!` : 'CT-e adicionado!');
                setStagingCtes([]);
                onRefresh();
            }
        } catch (err: any) {
            toast.error(`Erro ao salvar CT-e: ${err?.message || 'Erro desconhecido'}`);
        } finally {
            setUploadingCte(false);
        }
    };

    const handleDeleteCte = (id: string) => {
        setLocalCtes((prev) => prev.filter((c) => c.id !== id));
        onRefresh();
    };

    const handleDeleteNfe = (id: string) => {
        // NF-e removida pelo NfeRow, apenas refresh
        onRefresh();
    };

    // ── Canhoto staging ─────────────────────────────────────────────────────────
    const [stagingCanhoto, setStagingCanhoto] = useState<StagingFile | null>(null);
    const [uploadingCanhoto, setUploadingCanhoto] = useState(false);
    const [deletingCanhoto, setDeletingCanhoto] = useState(false);
    const canhotoRef = useRef<HTMLInputElement>(null);

    const handleCanhotoFile = (files: File[]) => {
        const { valid, errors } = validateFiles([files[0]]);
        errors.forEach((e) => toast.error(e));
        if (valid.length) {
            if (stagingCanhoto?.preview) URL.revokeObjectURL(stagingCanhoto.preview);
            setStagingCanhoto(toStaging(valid)[0]);
        }
    };

    const confirmCanhotoUpload = async () => {
        if (!stagingCanhoto) return;
        setUploadingCanhoto(true);
        try {
            const ext = stagingCanhoto.file.name.split('.').pop();
            const path = `canhotos/${entregaId}/${Date.now()}.${ext}`;
            const url = await uploadFile(stagingCanhoto.file, path);
            const { error } = await supabase.from('entregas').update({ canhoto_url: url }).eq('id', entregaId);
            if (error) throw error;
            toast.success('Canhoto anexado!');
            if (stagingCanhoto.preview) URL.revokeObjectURL(stagingCanhoto.preview);
            setStagingCanhoto(null);
            setLocalCanhotoUrl(url); // Atualiza local imediatamente
            onRefresh();
        } catch (err: any) {
            toast.error(`Erro ao salvar canhoto: ${err?.message || 'Erro'}`);
        } finally {
            setUploadingCanhoto(false);
        }
    };

    const deleteCanhoto = async () => {
        setDeletingCanhoto(true);
        try {
            const { error } = await supabase.from('entregas').update({ canhoto_url: null }).eq('id', entregaId);
            if (error) throw error;
            toast.success('Canhoto removido!');
            setLocalCanhotoUrl(null); // Atualiza local imediatamente
            onRefresh();
        } catch (err: any) {
            toast.error(`Erro ao remover canhoto: ${err?.message || 'Erro'}`);
        } finally {
            setDeletingCanhoto(false);
        }
    };

    // ── NF-e direta (embarcador) ────────────────────────────────────────────────
    const [stagingNfes, setStagingNfes] = useState<StagingFile[]>([]);
    const [uploadingNfe, setUploadingNfe] = useState(false);
    const nfeRef = useRef<HTMLInputElement>(null);

    const handleNfeFiles = (files: File[]) => {
        const { valid, errors } = validateFiles(files);
        errors.forEach((e) => toast.error(e));
        if (valid.length) setStagingNfes((prev) => [...prev, ...toStaging(valid)]);
    };

    const removeNfeStaging = (id: string) => {
        setStagingNfes((prev) => {
            const s = prev.find((x) => x.id === id);
            if (s?.preview) URL.revokeObjectURL(s.preview);
            return prev.filter((x) => x.id !== id);
        });
    };

    const confirmNfeUpload = async () => {
        setUploadingNfe(true);
        let ok = 0;
        try {
            for (const s of stagingNfes) {
                const ext = s.file.name.split('.').pop();
                const path = `nfes/${entregaId}/${Date.now()}_${Math.random().toString(36).slice(7)}.${ext}`;
                const url = await uploadFile(s.file, path);
                const { error } = await (supabase as any).from('nfes').insert({ entrega_id: entregaId, cte_id: null, url });
                if (error) throw error;
                ok++;
            }
            if (ok > 0) {
                toast.success(ok > 1 ? `${ok} NF-es adicionadas!` : 'NF-e adicionada!');
                setStagingNfes([]);
                onRefresh();
            }
        } catch (err: any) {
            toast.error(`Erro ao salvar NF-e: ${err?.message || 'Erro'}`);
        } finally {
            setUploadingNfe(false);
        }
    };

    // ── Outros Documentos staging ───────────────────────────────────────────────
    const [stagingOutros, setStagingOutros] = useState<StagingFile[]>([]);
    const [uploadingOutro, setUploadingOutro] = useState(false);
    const outroRef = useRef<HTMLInputElement>(null);

    const handleOutroFiles = (files: File[]) => {
        const remaining = 10 - localOutros.length;
        if (remaining <= 0) { toast.error('Limite de 10 documentos atingido'); return; }
        const { valid, errors } = validateFiles(files);
        errors.forEach((e) => toast.error(e));
        const capped = valid.slice(0, remaining - stagingOutros.length);
        if (capped.length < valid.length) toast.warning(`Apenas ${capped.length} arquivo(s) adicionado(s) (limite de 10)`);
        if (capped.length) setStagingOutros((prev) => [...prev, ...toStaging(capped)]);
    };

    const removeOutroStaging = (id: string) => {
        setStagingOutros((prev) => {
            const s = prev.find((x) => x.id === id);
            if (s?.preview) URL.revokeObjectURL(s.preview);
            return prev.filter((x) => x.id !== id);
        });
    };

    const confirmOutroUpload = async () => {
        if (!currentUserId) return;
        setUploadingOutro(true);
        try {
            const newDocs: OutroDocumento[] = [];
            for (const s of stagingOutros) {
                const ext = s.file.name.split('.').pop();
                const path = `outros/${entregaId}/${Date.now()}_${Math.random().toString(36).slice(7)}.${ext}`;
                const url = await uploadFile(s.file, path);
                newDocs.push({
                    url, nome: s.file.name,
                    uploaded_by: currentUserId,
                    uploaded_at: new Date().toISOString(),
                    tipo_usuario: perfil,
                });
            }
            const updated = [...localOutros, ...newDocs];
            const { error } = await supabase.from('entregas').update({ outros_documentos: updated as any }).eq('id', entregaId);
            if (error) throw error;
            setLocalOutros(updated);
            setStagingOutros([]);
            toast.success(newDocs.length > 1 ? `${newDocs.length} documentos adicionados!` : 'Documento adicionado!');
            onRefresh();
        } catch (err: any) {
            toast.error(`Erro ao salvar: ${err?.message || 'Erro'}`);
        } finally {
            setUploadingOutro(false);
        }
    };

    const handleRemoveOutro = async (index: number) => {
        const updated = localOutros.filter((_, i) => i !== index);
        try {
            const { error } = await supabase.from('entregas').update({ outros_documentos: updated as any }).eq('id', entregaId);
            if (error) throw error;
            setLocalOutros(updated);
            toast.success('Documento removido!');
            onRefresh();
        } catch (err: any) {
            toast.error(`Erro ao remover: ${err?.message || 'Erro'}`);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">

            {/* ═══ NF-e do Embarcador ═══ */}
            {perfil === 'embarcador' && (
                <section className="space-y-2">
                    <SectionTitle icon={<FileCode className="w-3.5 h-3.5 text-indigo-500" />} label="Notas Fiscais" count={nfesDiretas.length} />

                    {nfesDiretas.length > 0 && (
                        <div className="space-y-1">
                            {nfesDiretas.map((nfe, i) => (
                                <NfeRow key={nfe.id} nfe={nfe} index={i} onPreview={openPreview} onDelete={handleDeleteNfe} />
                            ))}
                        </div>
                    )}

                    {stagingNfes.length > 0 ? (
                        <StagingList items={stagingNfes} onRemove={removeNfeStaging} onConfirm={confirmNfeUpload} uploading={uploadingNfe} label="NF-es" />
                    ) : (
                        <DropZone
                            label="Arrastar NF-es aqui"
                            hint="PDF ou XML • até 10 MB • múltiplos permitidos"
                            accentColor="border-indigo-200 dark:border-indigo-800/40 hover:border-indigo-400"
                            inputRef={nfeRef} multiple onFiles={handleNfeFiles}
                        />
                    )}
                </section>
            )}

            {/* ═══ CT-es read-only (embarcador) ═══ */}
            {perfil === 'embarcador' && (
                <section className="space-y-2">
                    <SectionTitle icon={<FileText className="w-3.5 h-3.5 text-amber-500" />} label="CT-es" count={localCtes.length > 0 ? localCtes.length : undefined} />

                    {localCtes.length > 0 ? (
                        <div className="space-y-2">
                            {localCtes.map((cte, i) => (
                                <div key={cte.id} className="rounded-xl border border-amber-200 dark:border-amber-800/40 overflow-hidden bg-card">
                                    <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50/80 dark:bg-amber-900/10">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-100 truncate">
                                                CT-e {cte.numero || `#${i + 1}`}
                                            </span>
                                        </div>
                                        {cte.url && (
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100 shrink-0"
                                                onClick={() => openPreview(cte.url!, `CT-e ${cte.numero || i + 1}`)}>
                                                <Eye className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-muted text-xs text-muted-foreground">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Aguardando transportadora
                        </div>
                    )}
                </section>
            )}

            {/* ═══ NF-es do embarcador — always visible, above CT-e ═══ */}
            {perfil === 'transportadora' && (() => {
                const allNfes = [
                    ...localCtes.flatMap(c => c.nfes.map(nfe => ({ ...nfe }))),
                    ...nfesDiretas.map(nfe => ({ ...nfe })),
                ];
                return (
                    <section className="space-y-2">
                        <SectionTitle
                            icon={<FileCode className="w-3.5 h-3.5 text-indigo-500" />}
                            label="Notas Fiscais"
                            count={allNfes.length > 0 ? allNfes.length : undefined}
                        />
                        {allNfes.length > 0 ? (
                            <div className="space-y-2">
                                {allNfes.map((nfe, i) => (
                                    <div key={nfe.id} className="rounded-xl border border-indigo-200 dark:border-indigo-800/40 overflow-hidden bg-card">
                                        <div className="flex items-center justify-between px-3 py-2.5 bg-indigo-50/60 dark:bg-indigo-900/10">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileCode className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 truncate">
                                                    NF-e {nfe.numero || nfe.chave_acesso?.slice(-6) || i + 1}
                                                </span>
                                                {nfe.valor && (
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        R$ {Number(nfe.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                            {nfe.url && (
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-indigo-500 hover:bg-indigo-100 shrink-0"
                                                    onClick={() => openPreview(nfe.url!, `NF-e ${nfe.numero || i + 1}`)}>
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/40 bg-card">
                                <div className="flex items-center gap-2 px-3 py-2.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span className="text-xs text-indigo-500 dark:text-indigo-400">Aguardando embarcador
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>
                );
            })()}

            {/* ═══ CT-es (transportadora) ═══ */}
            {perfil === 'transportadora' && (
                <section className="space-y-2">
                    <SectionTitle icon={<FileText className="w-3.5 h-3.5 text-amber-500" />} label="CT-es" count={localCtes.length} />

                    {localCtes.length > 0 && (
                        <div className="space-y-2">
                            {localCtes.map((cte, i) => (
                                <CteCard key={cte.id} cte={cte} index={i}
                                    onPreview={openPreview}
                                    onDelete={handleDeleteCte}
                                />
                            ))}
                        </div>
                    )}

                    {stagingCtes.length > 0 ? (
                        <StagingList items={stagingCtes} onRemove={removeCteStaging} onConfirm={confirmCteUpload} uploading={uploadingCte} label="CT-es" />
                    ) : (
                        <DropZone
                            label="Arrastar CT-es aqui"
                            hint="PDF ou XML • até 10 MB • múltiplos de uma vez"
                            accentColor="border-amber-200 dark:border-amber-800/40 hover:border-amber-400"
                            inputRef={cteRef} multiple onFiles={handleCteFiles}
                        />
                    )}
                </section>
            )}


            {/* ═══ Canhoto ═══ */}
            <section className="space-y-2">
                <SectionTitle icon={<Stamp className="w-3.5 h-3.5 text-emerald-500" />} label="Canhoto"
                    badge={localCanhotoUrl ? 'Anexado' : undefined} />

                {localCanhotoUrl ? (
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 overflow-hidden bg-card">
                        <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50/60 dark:bg-emerald-900/10">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Canhoto da entrega</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-100"
                                    title="Visualizar" onClick={() => openPreview(localCanhotoUrl, 'Canhoto')}>
                                    <Eye className="w-3 h-3" />
                                </Button>
                                {perfil === 'transportadora' && (
                                    <>
                                        <input ref={canhotoRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                            onChange={(e) => { if (e.target.files?.length) handleCanhotoFile(Array.from(e.target.files)); e.target.value = ''; }} />
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-100"
                                            title="Substituir" onClick={() => canhotoRef.current?.click()}>
                                            <Upload className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                            title="Excluir" onClick={deleteCanhoto} disabled={deletingCanhoto}>
                                            {deletingCanhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Staging de substituição */}
                        {stagingCanhoto && (
                            <div className="p-2.5">
                                <StagingList
                                    items={[stagingCanhoto]}
                                    onRemove={() => { if (stagingCanhoto.preview) URL.revokeObjectURL(stagingCanhoto.preview); setStagingCanhoto(null); }}
                                    onConfirm={confirmCanhotoUpload}
                                    uploading={uploadingCanhoto}
                                    label="novo canhoto"
                                />
                            </div>
                        )}
                    </div>
                ) : stagingCanhoto ? (
                    <StagingList
                        items={[stagingCanhoto]}
                        onRemove={() => { if (stagingCanhoto.preview) URL.revokeObjectURL(stagingCanhoto.preview); setStagingCanhoto(null); }}
                        onConfirm={confirmCanhotoUpload}
                        uploading={uploadingCanhoto}
                        label="canhoto"
                    />
                ) : perfil === 'transportadora' ? (
                    <DropZone
                        label="Arrastar canhoto aqui"
                        hint="PDF, JPG ou PNG • até 10 MB"
                        accentColor="border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-400"
                        inputRef={canhotoRef}
                        onFiles={handleCanhotoFile}
                    />
                ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-muted text-xs text-muted-foreground">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Aguardando transportadora
                    </div>
                )}
            </section>

            {/* ═══ Outros Documentos ═══ */}
            <section className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-xs font-semibold">Outros Documentos</span>
                    {localOutros.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{localOutros.length}/10</Badge>
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                                Anexe documentos complementares como GNRE, comprovantes de pagamento, autorizações, etc. Limite de 10 arquivos.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {localOutros.length > 0 && (
                    <div className="space-y-1.5">
                        {localOutros.map((doc, i) => (
                            <div key={`${doc.url}-${i}`} className="rounded-xl border border-violet-200 dark:border-violet-800/40 overflow-hidden bg-card">
                                <div className="flex items-center justify-between px-3 py-2.5 bg-violet-50/60 dark:bg-violet-900/10">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Paperclip className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                        <span className="text-xs font-semibold text-violet-900 dark:text-violet-100 truncate">{doc.nome}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                                            {doc.tipo_usuario === 'embarcador' ? 'Embarcador' : 'Transportadora'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-violet-600 hover:bg-violet-100"
                                            title="Visualizar" onClick={() => openPreview(doc.url, doc.nome)}>
                                            <Eye className="w-3 h-3" />
                                        </Button>
                                        {doc.tipo_usuario === perfil && (
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                title="Remover" onClick={() => handleRemoveOutro(i)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {localOutros.length >= 10 ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-muted text-xs text-muted-foreground">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Limite de 10 documentos atingido
                    </div>
                ) : stagingOutros.length > 0 ? (
                    <StagingList items={stagingOutros} onRemove={removeOutroStaging} onConfirm={confirmOutroUpload} uploading={uploadingOutro} label="documentos" />
                ) : (
                    <DropZone
                        label="Arrastar documentos aqui"
                        hint="GNRE, comprovantes, autorizações • PDF, XML, JPG, PNG • até 10 MB"
                        accentColor="border-violet-200 dark:border-violet-800/40 hover:border-violet-400"
                        inputRef={outroRef} multiple onFiles={handleOutroFiles}
                    />
                )}
            </section>

            {/* Preview dialog */}
            <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} fileUrl={previewUrl} title={previewTitle} />
        </div>
    );
}
