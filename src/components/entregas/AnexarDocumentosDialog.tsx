import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Trash2, Eye, Plus, FileUp, Receipt, Stamp } from 'lucide-react';
import { FilePreviewDialog } from './FilePreviewDialog';
import { Card, CardContent } from '@/components/ui/card';
import type { CteDoc, NfeDoc } from '@/lib/documentHelpers';
import { fetchCtesForEntregas } from '@/lib/documentHelpers';

interface AnexarDocumentosDialogProps {
  entrega: {
    id: string;
    canhoto_url?: string | null;
    carga?: {
      codigo?: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnexarDocumentosDialog({ entrega, open, onOpenChange, onSuccess }: AnexarDocumentosDialogProps) {
  // CT-e state
  const [cteFile, setCteFile] = useState<File | null>(null);
  const [existingCtes, setExistingCtes] = useState<CteDoc[]>([]);

  // NF-e state (new files to upload, keyed by cte index or 'new')
  const [nfeFiles, setNfeFiles] = useState<File[]>([]);
  const [selectedCteIdForNfe, setSelectedCteIdForNfe] = useState<string | null>(null);

  // Canhoto state
  const [canhotoFile, setCanhotoFile] = useState<File | null>(null);
  const [canhotoUrl, setCanhotoUrl] = useState<string | null>(null);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  // Refs
  const cteInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);
  const canhotoInputRef = useRef<HTMLInputElement>(null);

  // Load existing docs when dialog opens
  useEffect(() => {
    if (entrega && open) {
      setCanhotoUrl(entrega.canhoto_url || null);
      setCteFile(null);
      setNfeFiles([]);
      setCanhotoFile(null);
      setSelectedCteIdForNfe(null);

      // Fetch existing CTes and NFes
      fetchCtesForEntregas([entrega.id]).then(map => {
        setExistingCtes(map[entrega.id] || []);
      });
    }
  }, [entrega, open]);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, XML, JPG ou PNG.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return false;
    }
    return true;
  };

  const handleNfFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (validateFile(files[i])) validFiles.push(files[i]);
    }
    setNfeFiles(prev => [...prev, ...validFiles]);
  };

  const handleCanhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setCanhotoFile(file);
  };

  const uploadFile = async (file: File, prefix: string, folder?: string): Promise<string> => {
    if (!entrega) throw new Error('Entrega não encontrada');
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${entrega.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : `${prefix}s/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
    if (uploadError) throw new Error(`Erro ao fazer upload do ${prefix}`);
    return filePath;
  };

  const handleSave = async () => {
    if (!entrega) return;
    setIsSaving(true);
    try {
      // Upload NF-es and link to the delivery directly
      if (nfeFiles.length > 0) {
        for (const file of nfeFiles) {
          const nfeUrl = await uploadFile(file, 'nota_fiscal');
          await (supabase as any).from('nfes').insert({ entrega_id: entrega.id, url: nfeUrl });
        }
      }

      // Upload Canhoto
      let finalCanhotoUrl = canhotoUrl;
      if (canhotoFile) {
        finalCanhotoUrl = await uploadFile(canhotoFile, 'canhoto', 'canhotos');
      }

      // Update canhoto on entrega
      if (finalCanhotoUrl !== entrega.canhoto_url) {
        await supabase.from('entregas').update({ canhoto_url: finalCanhotoUrl }).eq('id', entrega.id);
      }

      toast.success('Documentos salvos com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar documentos');
    } finally {
      setIsSaving(false);
    }
  };

  const removeNfFile = (index: number) => {
    setNfeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openPreview = async (url: string, title: string) => {
    if (url && !url.startsWith('http')) {
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(url, 3600);
      if (error) { toast.error('Erro ao carregar documento'); return; }
      setPreviewUrl(data.signedUrl);
    } else {
      setPreviewUrl(url);
    }
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  if (!entrega) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Documentos da Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {entrega.carga?.codigo && (
            <p className="text-sm text-muted-foreground">
              Entrega da carga <span className="font-medium text-foreground">{entrega.carga.codigo}</span>
            </p>
          )}
          {/* CT-e Section foi removido pois a geração será automática */}

          {/* Notas Fiscais Section */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-blue-600" />
                Notas Fiscais
              </div>

              {/* Show NF-es from existing CTes */}
              {existingCtes.flatMap((cte, cIdx) =>
                cte.nfes.map((nf, nIdx) => (
                  <div key={nf.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">NF-e {nIdx + 1} (CT-e {cIdx + 1})</span>
                    </div>
                    {nf.url && (
                      <Button variant="ghost" size="sm" onClick={() => openPreview(nf.url!, `NF-e`)}>
                        <Eye className="w-4 h-4 mr-1" /> Ver
                      </Button>
                    )}
                  </div>
                ))
              )}

              {/* New NF files */}
              {nfeFiles.map((file, index) => (
                <div key={`file-${index}`} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeNfFile(index)} className="text-muted-foreground">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <input ref={nfInputRef} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" multiple onChange={handleNfFilesChange} className="hidden" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => nfInputRef.current?.click()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Nota Fiscal
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Canhoto Section */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Stamp className="w-4 h-4 text-orange-600" />
                Canhoto (Comprovante de Entrega)
              </div>

              {canhotoUrl && !canhotoFile && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-500/5 border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Canhoto anexado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPreview(canhotoUrl, 'Canhoto')}>
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCanhotoUrl(null)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {canhotoFile && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate max-w-[200px]">{canhotoFile.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCanhotoFile(null)} className="text-muted-foreground">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <input ref={canhotoInputRef} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={handleCanhotoFileChange} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => canhotoInputRef.current?.click()} className="w-full">
                <FileUp className="w-4 h-4 mr-2" />
                {canhotoUrl || canhotoFile ? 'Substituir Canhoto' : 'Anexar Canhoto'}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            Formatos aceitos: PDF, XML, JPG, PNG (máx. 10MB por arquivo)
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} fileUrl={previewUrl} title={previewTitle} />
    </Dialog>
  );
}
