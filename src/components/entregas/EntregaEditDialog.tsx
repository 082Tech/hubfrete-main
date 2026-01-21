import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Loader2, 
  Truck, 
  Weight,
  DollarSign,
  X
} from 'lucide-react';

interface EntregaEditDialogProps {
  entrega: {
    id: string;
    peso_alocado_kg: number | null;
    valor_frete: number | null;
    observacoes?: string | null;
    cte_url?: string | null;
    motoristas?: {
      nome_completo: string;
    } | null;
    veiculos?: {
      placa: string;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EntregaEditDialog({ entrega, open, onOpenChange, onSuccess }: EntregaEditDialogProps) {
  const [valorFrete, setValorFrete] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [cteFile, setCteFile] = useState<File | null>(null);
  const [cteUrl, setCteUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && entrega) {
      setValorFrete(entrega.valor_frete?.toString() || '');
      setObservacoes((entrega as any).observacoes || '');
      setCteUrl((entrega as any).cte_url || null);
      setCteFile(null);
    }
    onOpenChange(isOpen);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não suportado. Use PDF, XML, JPG ou PNG.');
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

    setIsUploading(true);
    try {
      const fileExt = cteFile.name.split('.').pop();
      const fileName = `cte_${entrega.id}_${Date.now()}.${fileExt}`;
      const filePath = `ctes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, cteFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading CTE:', error);
      toast.error('Erro ao fazer upload do CT-e');
      return null;
    } finally {
      setIsUploading(false);
    }
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
          valor_frete: valorFrete ? parseFloat(valorFrete) : null,
          observacoes: observacoes || null,
          // Note: cte_url field would need to be added to the entregas table
          // For now, we'll just save the other fields
        })
        .eq('id', entrega.id);

      if (error) throw error;

      toast.success('Entrega atualizada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving entrega:', error);
      toast.error('Erro ao salvar entrega');
    } finally {
      setIsSaving(false);
    }
  };

  if (!entrega) {
    return null;
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Editar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info da entrega */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Motorista:</span>
              <span className="font-medium">{entrega.motoristas?.nome_completo || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Placa:</span>
              <span className="font-medium font-mono">{entrega.veiculos?.placa || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Peso:</span>
              <span className="font-medium">{entrega.peso_alocado_kg ? `${entrega.peso_alocado_kg} kg` : 'N/A'}</span>
            </div>
          </div>

          {/* Valor do Frete */}
          <div className="space-y-2">
            <Label htmlFor="valor_frete" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor do Frete
            </Label>
            <Input
              id="valor_frete"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={valorFrete}
              onChange={(e) => setValorFrete(e.target.value)}
            />
          </div>

          {/* CT-e Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              CT-e (Conhecimento de Transporte)
            </Label>
            
            {cteUrl && !cteFile && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                <FileText className="w-4 h-4 text-green-600" />
                <a 
                  href={cteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-700 hover:underline flex-1 truncate"
                >
                  CT-e anexado
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCteUrl(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {cteFile && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 flex-1 truncate">{cteFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCteFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {!cteUrl && !cteFile && (
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,.xml,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="cte-upload"
                />
                <label 
                  htmlFor="cte-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para anexar CT-e
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, XML, JPG ou PNG (máx. 10MB)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre esta entrega..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading}>
            {(isSaving || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUploading ? 'Enviando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
