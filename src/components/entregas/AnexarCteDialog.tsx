import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Trash2, Eye } from 'lucide-react';
import { FilePreviewDialog } from './FilePreviewDialog';
import type { CteDoc } from '@/lib/documentHelpers';
import { fetchCtesForEntregas } from '@/lib/documentHelpers';

interface AnexarCteDialogProps {
  entrega: {
    id: string;
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
  const [existingCtes, setExistingCtes] = useState<CteDoc[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (entrega && open) {
      setCteFile(null);
      fetchCtesForEntregas([entrega.id]).then(map => {
        setExistingCtes(map[entrega.id] || []);
      });
    }
  }, [entrega, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use PDF, XML, JPG ou PNG.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setCteFile(file);
    }
  };

  const handleSave = async () => {
    if (!entrega || !cteFile) return;

    setIsSaving(true);
    try {
      const fileExt = cteFile.name.split('.').pop();
      const fileName = `cte_${entrega.id}_${Date.now()}.${fileExt}`;
      const filePath = `ctes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, cteFile);

      if (uploadError) throw new Error('Erro ao fazer upload do CT-e');

      // Insert into ctes table
      const { error: dbError } = await (supabase as any)
        .from('ctes')
        .insert({ entrega_id: entrega.id, url: filePath });

      if (dbError) throw dbError;

      toast.success('CT-e anexado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Erro ao salvar CT-e');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCte = async (cteId: string) => {
    try {
      const { error } = await (supabase as any).from('ctes').delete().eq('id', cteId);
      if (error) throw error;
      setExistingCtes(prev => prev.filter(c => c.id !== cteId));
      toast.success('CT-e removido com sucesso!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error removing CTE:', error);
      toast.error('Erro ao remover CT-e');
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

          {/* Existing CTes */}
          {existingCtes.map((cte, idx) => (
            <div key={cte.id} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">CT-e {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                {cte.url && (
                  <Button variant="ghost" size="sm" onClick={() => { setPreviewUrl(cte.url); setPreviewOpen(true); }}>
                    <Eye className="w-4 h-4 mr-1" /> Ver
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleRemoveCte(cte.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} fileUrl={previewUrl} title="CT-e" />

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="cte-file">Adicionar CT-e</Label>
            <Input id="cte-file" type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground">Formatos aceitos: PDF, XML, JPG, PNG (máx. 10MB)</p>
          </div>

          {cteFile && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm truncate max-w-[200px]">{cteFile.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCteFile(null)} className="text-muted-foreground">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !cteFile}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
