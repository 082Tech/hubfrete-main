import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';

interface DocumentPreviewProps {
  url: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreview({ url, isOpen, onClose }: DocumentPreviewProps) {
  if (!url) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdf = /\.pdf$/i.test(url);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <span className="text-sm font-medium">Visualização do Documento</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir em nova aba
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 overflow-auto max-h-[calc(90vh-60px)]">
          {isImage && (
            <img
              src={url}
              alt="Documento"
              className="max-w-full h-auto mx-auto rounded-lg"
            />
          )}

          {isPdf && (
            <iframe
              src={url}
              className="w-full h-[70vh] rounded-lg border border-border"
              title="PDF Preview"
            />
          )}

          {!isImage && !isPdf && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Não é possível visualizar este tipo de arquivo.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
