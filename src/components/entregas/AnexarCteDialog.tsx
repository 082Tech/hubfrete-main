import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Trash2, Eye } from 'lucide-react';
import { FilePreviewDialog } from './FilePreviewDialog';

interface AnexarCteDialogProps {
  entrega: {
    id: string;
    cte_url?: string | null;
    carga?: {
      codigo?: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnexarCteDialog({ entrega, open, onOpenChange, onSuccess }: AnexarCteDialogProps) {
  const [cteFile, setCteFile] = useState<File | null>(null);
  const [cteUrl, setCteUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Reset state when dialog opens with new entrega
  useEffect(() => {
    if (entrega && open) {
      setCteUrl(entrega.cte_url || null);
      setCteFile(null);
    }
  }, [entrega, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use PDF, XML, JPG ou PNG.');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setCteFile(file);
    }
  };

  const uploadCte = async (): Promise<string | null> => {
    if (!cteFile || !entrega) return cteUrl;

    const fileExt = cteFile.name.split('.').pop();
    const fileName = `cte_${entrega.id}_${Date.now()}.${fileExt}`;
    const filePath = `ctes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('notas-fiscais')
      .upload(filePath, cteFile);

    if (uploadError) {
      console.error('Error uploading CTE:', uploadError);
      throw new Error('Erro ao fazer upload do CT-e');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('notas-fiscais')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!entrega) return;

    setIsSaving(true);
    try {
      // Upload CTE if there's a new file
      let finalCteUrl = cteUrl;
      if (cteFile) {
        finalCteUrl = await uploadCte();
      }

      // Update entrega
      const { error } = await supabase
        .from('entregas')
        .update({
          cte_url: finalCteUrl,
        })
        .eq('id', entrega.id);

      if (error) throw error;

      toast.success('CT-e anexado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar CT-e');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCte = async () => {
    if (!entrega) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('entregas')
        .update({ cte_url: null })
        .eq('id', entrega.id);

      if (error) throw error;

      setCteUrl(null);
      setCteFile(null);
      toast.success('CT-e removido com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Error removing CTE:', error);
      toast.error('Erro ao remover CT-e');
    } finally {
      setIsRemoving(false);
    }
  };

  if (!entrega) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Anexar CT-e
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {entrega.carga?.codigo && (
            <p className="text-sm text-muted-foreground">
              Entrega da carga <span className="font-medium text-foreground">{entrega.carga.codigo}</span>
            </p>
          )}

          {/* Current CTE status */}
          {cteUrl && !cteFile && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">CT-e anexado</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCte}
                  disabled={isRemoving}
                  className="text-destructive hover:text-destructive"
                >
                  {isRemoving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <FilePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            fileUrl={cteUrl}
            title="CT-e"
          />

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="cte-file">
              {cteUrl ? 'Substituir CT-e' : 'Selecionar CT-e'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cte-file"
                type="file"
                accept=".pdf,.xml,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: PDF, XML, JPG, PNG (máx. 10MB)
            </p>
          </div>

          {/* New file preview */}
          {cteFile && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm truncate max-w-[200px]">{cteFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCteFile(null)}
                className="text-muted-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (!cteFile && !cteUrl)}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
