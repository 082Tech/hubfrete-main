import { X, FileText, FileSpreadsheet, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentPreview as AttachmentPreviewType } from './types';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  attachment: AttachmentPreviewType;
  onRemove: () => void;
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const getIcon = () => {
    if (attachment.type === 'image') return Image;
    if (attachment.file.name.endsWith('.pdf')) return FileText;
    if (attachment.file.name.endsWith('.xlsx') || attachment.file.name.endsWith('.xls')) return FileSpreadsheet;
    return File;
  };

  const Icon = getIcon();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative group">
      {attachment.type === 'image' ? (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={attachment.preview}
            alt={attachment.file.name}
            className="w-full h-full object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 max-w-[200px]">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{attachment.file.name}</p>
            <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface AttachmentMessageProps {
  url: string;
  nome: string;
  tipo: string;
  tamanho?: number;
  isOwn: boolean;
}

export function AttachmentMessage({ url, nome, tipo, tamanho, isOwn }: AttachmentMessageProps) {
  const isImage = tipo.startsWith('image/');

  const getIcon = () => {
    if (nome.endsWith('.pdf')) return FileText;
    if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) return FileSpreadsheet;
    return File;
  };

  const Icon = getIcon();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={nome}
          className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
        isOwn
          ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
          : 'border-border hover:bg-muted'
      )}
    >
      <Icon className={cn('h-6 w-6 shrink-0', isOwn ? 'text-primary-foreground' : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isOwn ? 'text-primary-foreground' : 'text-foreground')}>
          {nome}
        </p>
        {tamanho && (
          <p className={cn('text-xs', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {formatFileSize(tamanho)}
          </p>
        )}
      </div>
    </a>
  );
}
