import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotaFiscalUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function NotaFiscalUpload({ value, onChange }: NotaFiscalUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, XML ou imagens.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para anexar arquivos');
        return;
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(filePath);

      onChange(filePath); // Store the path, not the full URL
      setFileName(file.name);
      toast.success('Nota fiscal anexada com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        await supabase.storage
          .from('notas-fiscais')
          .remove([value]);
      } catch (error) {
        console.error('Error removing file:', error);
      }
    }
    onChange(null);
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Nota Fiscal</Label>
      </div>

      <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          {value ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{fileName || 'Arquivo anexado'}</p>
                  <p className="text-xs text-muted-foreground">Clique para substituir</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center cursor-pointer py-4">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.xml,image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Enviando...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Clique para anexar</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PDF, XML ou imagem (máx. 10MB)
                  </span>
                </>
              )}
            </label>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
