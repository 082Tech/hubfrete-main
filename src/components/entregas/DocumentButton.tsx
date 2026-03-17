import { useRef, useState, useEffect } from 'react';
import { CheckCircle, XCircle, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DocType = 'nfe' | 'cte' | 'canhoto';

interface DocumentButtonProps {
  /** Document type */
  type: DocType;
  /** Whether the document is already attached */
  hasDoc: boolean;
  /** Number of attached docs (only for NF-e which supports multiple) */
  count?: number;
  /** Whether the current user role can attach this document */
  canAttach: boolean;
  /** Called when user clicks to view an existing doc */
  onView: () => void;
  /** Entrega ID for upload path */
  entregaId: string;
  /** CT-e ID for NF-e uploads (required when type='nfe') */
  cteId?: string;
  /** Called after successful upload */
  onUploaded: () => void;
}

const docLabels: Record<DocType, string> = {
  nfe: 'NF',
  cte: 'CT-e',
  canhoto: 'Canhoto',
};

export function DocumentButton({
  type,
  hasDoc,
  count,
  canAttach,
  onView,
  entregaId,
  cteId,
  onUploaded,
}: DocumentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Clear syncing state when hasDoc/count updates (parent refetched) or after timeout
  useEffect(() => {
    if (syncing) {
      if (hasDoc) {
        setSyncing(false);
      } else {
        // Fallback: clear after 8s in case refetch doesn't change hasDoc
        const timer = setTimeout(() => setSyncing(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [hasDoc, count, syncing]);

  const label = type === 'nfe' && count !== undefined
    ? `${docLabels[type]} (${count})`
    : docLabels[type];

  const handleClick = () => {
    if (hasDoc) {
      onView();
    } else if (canAttach && !uploading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'application/xhtml+xml', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo não permitido. Use PDF, XML, XHTML, JPG ou PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

      if (type === 'cte') {
        // Upload file to storage
        const fileName = `cte_${entregaId}_${uniqueId}.${fileExt}`;
        const filePath = `ctes/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
        if (uploadError) throw uploadError;

        // Insert into ctes table
        const { error: dbError } = await (supabase as any).from('ctes').insert({
          entrega_id: entregaId,
          url: filePath,
        });
        if (dbError) throw dbError;

      } else if (type === 'canhoto') {
        // Canhoto stays on entregas table
        const fileName = `canhoto_${entregaId}_${uniqueId}.${fileExt}`;
        const filePath = `canhotos/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from('entregas').update({ canhoto_url: filePath }).eq('id', entregaId);
        if (dbError) throw dbError;

      } else if (type === 'nfe') {
        if (!cteId) {
          toast.error('Selecione um CT-e antes de anexar NF-e.');
          return;
        }
        // Upload file to storage
        const fileName = `nota_fiscal_${entregaId}_${uniqueId}.${fileExt}`;
        const filePath = `notas_fiscais/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
        if (uploadError) throw uploadError;

        // Insert into nfes table
        const { error: dbError } = await (supabase as any).from('nfes').insert({
          cte_id: cteId,
          url: filePath,
        });
        if (dbError) throw dbError;
      }

      toast.success(`${docLabels[type]} anexado com sucesso!`);
      setSyncing(true);
      onUploaded();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Erro ao anexar ${docLabels[type]}: ${err.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // Determine visual state
  const isClickable = hasDoc || (canAttach && !uploading && !syncing);
  const showUploadHint = !hasDoc && canAttach && !syncing;

  const bgClass = syncing
    ? 'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/20 cursor-wait'
    : hasDoc
    ? 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-900/30 cursor-pointer'
    : showUploadHint
      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:hover:bg-amber-900/30 cursor-pointer'
      : 'bg-muted/30 border-muted cursor-not-allowed';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!isClickable}
        className={`flex items-center gap-2 p-2 rounded-md border text-xs transition-colors text-left ${bgClass}`}
      >
        {uploading || syncing ? (
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
        ) : hasDoc ? (
          <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
        ) : showUploadHint ? (
          <Upload className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        ) : (
          <XCircle className="w-3 h-3 text-muted-foreground" />
        )}
        <span>{syncing ? `${label} ✓` : label}</span>
      </button>

      {canAttach && (
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xml,.xhtml,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </>
  );
}
