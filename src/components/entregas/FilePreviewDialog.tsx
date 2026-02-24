import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, ExternalLink, FileText, Image, FileCode, AlertCircle } from 'lucide-react';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  title?: string;
}

type FileType = 'pdf' | 'image' | 'xml' | 'unknown';

function getFileType(url: string): FileType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf')) return 'pdf';
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.webp')) return 'image';
  if (lowerUrl.includes('.xml')) return 'xml';
  return 'unknown';
}

interface ExtractedPath {
  bucket: string;
  path: string;
}

function extractPathFromUrl(url: string): ExtractedPath | null {
  // Extract bucket and path from a Supabase storage URL or relative path
  // Supports:
  // - Full URL: https://xxx.supabase.co/storage/v1/object/public/documentos/ctes/file.pdf
  // - Relative path: ctes/file.pdf (assumes documentos bucket)
  // - Bucket prefixed: documentos/ctes/file.pdf

  // Standard buckets in the project
  const knownBuckets = ['documentos', 'chat-anexos', 'fotos-frota', 'notas-fiscais'];

  // Check if it's a full Supabase storage URL
  const storagePattern = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/;
  const match = url.match(storagePattern);

  if (match) {
    const bucket = match[1];
    const path = decodeURIComponent(match[2].split('?')[0]);
    return { bucket, path };
  }

  // Check if URL contains a known bucket name
  for (const bucket of knownBuckets) {
    // Pattern: bucket/path or full URL with bucket
    const bucketPattern = new RegExp(`(?:^|/)${bucket}/(.+?)(?:\\?|$)`);
    const bucketMatch = url.match(bucketPattern);
    if (bucketMatch) {
      return {
        bucket,
        path: decodeURIComponent(bucketMatch[1].split('?')[0])
      };
    }
  }

  // Fallback: If it's a relative path without bucket prefix, assume it's from documentos
  // Common patterns: ctes/file.pdf, manifestos/file.pdf, etc.
  if (!url.startsWith('http') && !url.startsWith('/storage')) {
    // Clean up path - remove any leading slashes
    const cleanPath = url.replace(/^\/+/, '');

    // Determine bucket based on path prefix
    if (cleanPath.startsWith('ctes/')) {
      return { bucket: 'documentos', path: cleanPath };
    }
    if (cleanPath.startsWith('manifestos/') || cleanPath.startsWith('mdfes/')) {
      return { bucket: 'documentos', path: cleanPath };
    }
    if (cleanPath.startsWith('chat-anexos/')) {
      return { bucket: 'chat-anexos', path: cleanPath.replace('chat-anexos/', '') };
    }

    // Default to documentos for any other relative path
    return { bucket: 'documentos', path: cleanPath };
  }

  return null;
}

export function FilePreviewDialog({ open, onOpenChange, fileUrl, title = 'Visualizar Arquivo' }: FilePreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);

  useEffect(() => {
    if (open && fileUrl) {
      loadSignedUrl();
    } else {
      setSignedUrl(null);
      setError(null);
      setXmlContent(null);
    }
  }, [open, fileUrl]);

  const loadSignedUrl = async () => {
    if (!fileUrl) return;

    setIsLoading(true);
    setError(null);

    console.log('[FilePreviewDialog] Loading signed URL for:', fileUrl);

    try {
      const extracted = extractPathFromUrl(fileUrl);
      console.log('[FilePreviewDialog] Extracted path:', extracted);

      if (!extracted) {
        throw new Error('Não foi possível extrair o caminho do arquivo');
      }

      console.log('[FilePreviewDialog] Requesting signed URL from bucket:', extracted.bucket, 'path:', extracted.path);

      const { data, error: signError } = await supabase.storage
        .from(extracted.bucket)
        .createSignedUrl(extracted.path, 3600); // 1 hour expiry

      console.log('[FilePreviewDialog] Signed URL response:', { data, error: signError });

      if (signError) throw signError;
      if (!data?.signedUrl) throw new Error('URL assinada não gerada');

      setSignedUrl(data.signedUrl);

      // If XML, fetch and display content
      if (getFileType(fileUrl) === 'xml') {
        try {
          const response = await fetch(data.signedUrl);
          const text = await response.text();
          setXmlContent(text);
        } catch (e) {
          console.error('Error fetching XML:', e);
        }
      }
    } catch (err) {
      console.error('Error getting signed URL:', err);
      setError('Não foi possível carregar o arquivo. Verifique se você tem permissão de acesso.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const fileType = fileUrl ? getFileType(fileUrl) : 'unknown';

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-sm text-destructive text-center">{error}</p>
          <Button variant="outline" onClick={loadSignedUrl}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (!signedUrl) return null;

    switch (fileType) {
      case 'pdf':
        return (
          <iframe
            src={signedUrl}
            className="w-full h-[70vh] rounded-lg border"
            title="PDF Preview"
          />
        );

      case 'image':
        return (
          <div className="flex items-center justify-center p-4">
            <img
              src={signedUrl}
              alt="Preview"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        );

      case 'xml':
        return (
          <div className="w-full h-[70vh] overflow-auto">
            <pre className="p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap break-all">
              {xmlContent || 'Carregando conteúdo XML...'}
            </pre>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Prévia não disponível para este tipo de arquivo
            </p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Baixar arquivo
            </Button>
          </div>
        );
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-destructive" />;
      case 'image':
        return <Image className="w-5 h-5 text-primary" />;
      case 'xml':
        return <FileCode className="w-5 h-5 text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon()}
            {title}
          </DialogTitle>
          {signedUrl && !error && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir em nova aba
            </Button>
          )}
        </DialogHeader>

        <div className="mt-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
