import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Trash2, Eye, Plus, FileUp, Receipt, ClipboardList, Stamp } from 'lucide-react';
import { FilePreviewDialog } from './FilePreviewDialog';
import { Card, CardContent } from '@/components/ui/card';

interface AnexarDocumentosDialogProps {
  entrega: {
    id: string;
    cte_url?: string | null;
    numero_cte?: string | null;
    notas_fiscais_urls?: string[] | null;
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
  const [cteUrl, setCteUrl] = useState<string | null>(null);
  const [numeroCte, setNumeroCte] = useState<string>('');
  
  // Notas Fiscais state
  const [notasFiscaisUrls, setNotasFiscaisUrls] = useState<string[]>([]);
  const [notasFiscaisFiles, setNotasFiscaisFiles] = useState<File[]>([]);
  
  
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
  const canhotoInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens with new entrega
  useEffect(() => {
    if (entrega && open) {
      setCteUrl(entrega.cte_url || null);
      setNumeroCte(entrega.numero_cte || '');
      setNotasFiscaisUrls(entrega.notas_fiscais_urls || []);
      setCanhotoUrl(entrega.canhoto_url || null);
      setCteFile(null);
      setNotasFiscaisFiles([]);
      setCanhotoFile(null);
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

  const handleCteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setCteFile(file);
    }
  };

  const handleNfFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (validateFile(files[i])) {
        validFiles.push(files[i]);
      }
    }
    setNotasFiscaisFiles(prev => [...prev, ...validFiles]);
  };

  const handleCanhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setCanhotoFile(file);
    }
  };

  const uploadFile = async (file: File, prefix: string, folder?: string): Promise<string> => {
    if (!entrega) throw new Error('Entrega não encontrada');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${entrega.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : `${prefix}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('notas-fiscais')
      .upload(filePath, file);

    if (uploadError) {
      console.error(`Error uploading ${prefix}:`, uploadError);
      throw new Error(`Erro ao fazer upload do ${prefix}`);
    }

    return filePath;
  };

  const handleSave = async () => {
    if (!entrega) return;

    setIsSaving(true);
    try {
      // Upload CT-e if there's a new file
      let finalCteUrl = cteUrl;
      if (cteFile) {
        finalCteUrl = await uploadFile(cteFile, 'cte');
      }

      // Upload new Notas Fiscais
      const uploadedNfUrls: string[] = [];
      for (const file of notasFiscaisFiles) {
        const url = await uploadFile(file, 'nota_fiscal');
        uploadedNfUrls.push(url);
      }
      const finalNotasFiscaisUrls = [...notasFiscaisUrls, ...uploadedNfUrls];

      // Upload Canhoto if there's a new file
      let finalCanhotoUrl = canhotoUrl;
      if (canhotoFile) {
        finalCanhotoUrl = await uploadFile(canhotoFile, 'canhoto', 'canhotos');
      }

      // Update entrega
      const { error } = await supabase
        .from('entregas')
        .update({
          cte_url: finalCteUrl,
          numero_cte: numeroCte || null,
          notas_fiscais_urls: finalNotasFiscaisUrls,
          manifesto_url: finalManifestoUrl,
          canhoto_url: finalCanhotoUrl,
        })
        .eq('id', entrega.id);

      if (error) throw error;

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
    setNotasFiscaisFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeNfUrl = (index: number) => {
    setNotasFiscaisUrls(prev => prev.filter((_, i) => i !== index));
  };

  const openPreview = async (url: string, title: string) => {
    // Check if it's a path (not full URL) and generate signed URL
    if (url && !url.startsWith('http')) {
      const { data, error } = await supabase.storage
        .from('notas-fiscais')
        .createSignedUrl(url, 3600);
      
      if (error) {
        toast.error('Erro ao carregar documento');
        return;
      }
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

          {/* CT-e Section */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Receipt className="w-4 h-4 text-primary" />
                CT-e (Conhecimento de Transporte)
              </div>
              
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="numero-cte">Número do CT-e</Label>
                  <Input
                    id="numero-cte"
                    placeholder="Ex: 000012345"
                    value={numeroCte}
                    onChange={(e) => setNumeroCte(e.target.value)}
                  />
                </div>

                {cteUrl && !cteFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-500/5 border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-600">CT-e anexado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreview(cteUrl, 'CT-e')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCteUrl(null)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

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

                <div>
                  <input
                    ref={cteInputRef}
                    type="file"
                    accept=".pdf,.xml,.jpg,.jpeg,.png"
                    onChange={handleCteFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cteInputRef.current?.click()}
                    className="w-full"
                  >
                    <FileUp className="w-4 h-4 mr-2" />
                    {cteUrl || cteFile ? 'Substituir CT-e' : 'Anexar CT-e'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Notas Fiscais Section */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-blue-600" />
                Notas Fiscais
              </div>
              
              <div className="space-y-2">
                {/* Existing NFs */}
                {notasFiscaisUrls.map((url, index) => (
                  <div key={`url-${index}`} className="flex items-center justify-between p-3 border rounded-lg bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Nota Fiscal {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreview(url, `Nota Fiscal ${index + 1}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNfUrl(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* New NF files */}
                {notasFiscaisFiles.map((file, index) => (
                  <div key={`file-${index}`} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNfFile(index)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <input
                  ref={nfInputRef}
                  type="file"
                  accept=".pdf,.xml,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleNfFilesChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => nfInputRef.current?.click()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Nota Fiscal
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Manifesto Section */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                Manifesto (MDF-e)
              </div>
              
              <div className="space-y-2">
                {manifestoUrl && !manifestoFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-purple-500/5 border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">Manifesto anexado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreview(manifestoUrl, 'Manifesto')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManifestoUrl(null)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {manifestoFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate max-w-[200px]">{manifestoFile.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManifestoFile(null)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <input
                  ref={manifestoInputRef}
                  type="file"
                  accept=".pdf,.xml,.jpg,.jpeg,.png"
                  onChange={handleManifestoFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => manifestoInputRef.current?.click()}
                  className="w-full"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {manifestoUrl || manifestoFile ? 'Substituir Manifesto' : 'Anexar Manifesto'}
                </Button>
              </div>
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
              
              <div className="space-y-2">
                {canhotoUrl && !canhotoFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-500/5 border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-600">Canhoto anexado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreview(canhotoUrl, 'Canhoto')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCanhotoUrl(null)}
                        className="text-destructive hover:text-destructive"
                      >
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCanhotoFile(null)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <input
                  ref={canhotoInputRef}
                  type="file"
                  accept=".pdf,.xml,.jpg,.jpeg,.png"
                  onChange={handleCanhotoFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => canhotoInputRef.current?.click()}
                  className="w-full"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {canhotoUrl || canhotoFile ? 'Substituir Canhoto' : 'Anexar Canhoto'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            Formatos aceitos: PDF, XML, JPG, PNG (máx. 10MB por arquivo)
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>

      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fileUrl={previewUrl}
        title={previewTitle}
      />
    </Dialog>
  );
}
