import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AnexarManifestoViagemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viagemId: string;
  viagemCodigo: string;
  onSuccess?: () => void;
}

export function AnexarManifestoViagemDialog({
  open,
  onOpenChange,
  viagemId,
  viagemCodigo,
  onSuccess,
}: AnexarManifestoViagemDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${viagemId}/manifesto_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(fileName);

      const manifestoUrl = urlData.publicUrl;

      // First, close any active manifesto for this viagem
      await (supabase as any)
        .from('manifestos')
        .update({ status: 'encerrado', encerrado_em: new Date().toISOString() })
        .eq('viagem_id', viagemId)
        .eq('status', 'ativo');

      // Insert new manifesto record
      const { error: insertError } = await (supabase as any)
        .from('manifestos')
        .insert({
          viagem_id: viagemId,
          url: manifestoUrl,
          status: 'ativo',
          emitido_em: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update viagem updated_at
      await supabase.from('viagens').update({ updated_at: new Date().toISOString() }).eq('id', viagemId);

      return manifestoUrl;
    },
    onSuccess: () => {
      toast.success('Manifesto (MDF-e) anexado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['gestao-viagens'] });
      queryClient.invalidateQueries({ queryKey: ['operacao-diaria'] });
      queryClient.invalidateQueries({ queryKey: ['viagem-manifestos'] });
      setFile(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Erro ao anexar manifesto:', error);
      toast.error('Erro ao anexar manifesto. Tente novamente.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Anexar Manifesto (MDF-e)
          </DialogTitle>
          <DialogDescription>
            Anexe o Manifesto Eletrônico de Documentos Fiscais para a viagem <strong>{viagemCodigo}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arraste e solte o arquivo aqui ou
                </p>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">Selecionar arquivo</span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF ou XML até 10MB
                </p>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Anexar Manifesto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
