import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  File,
  Image,
  FileText,
  ChevronRight,
  ChevronDown,
  Eye,
  Download,
  Search,
  Loader2,
  HardDrive,
  RefreshCw,
  ArrowLeft,
  FolderArchive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Bucket = {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
};

type StorageFile = {
  id: string | null;
  name: string;
  bucket_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (mimetype?: string) => {
  if (!mimetype) return File;
  if (mimetype.startsWith('image/')) return Image;
  if (mimetype.includes('pdf')) return FileText;
  return File;
};

const isImageFile = (mimetype?: string) => mimetype?.startsWith('image/');

// Lista fixa de buckets conhecidos (API listBuckets requer service_role)
const KNOWN_BUCKETS: Bucket[] = [
  { id: 'chat-anexos', name: 'chat-anexos', public: true, created_at: '2026-01-26T20:49:04Z' },
  { id: 'fotos-frota', name: 'fotos-frota', public: true, created_at: '2026-01-22T16:49:25Z' },
  { id: 'notas-fiscais', name: 'notas-fiscais', public: false, created_at: '2026-01-14T15:49:07Z' },
];

export default function StorageExplorer() {
  const [buckets] = useState<Bucket[]>(KNOWN_BUCKETS);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [search, setSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());

  const fetchFilesInPath = useCallback(async (bucket: Bucket, path: string = '') => {
    setIsLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage
        .from(bucket.id)
        .list(path, {
          limit: 500,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;

      // Separate folders and files
      const folderList: string[] = [];
      const fileList: StorageFile[] = [];

      (data || []).forEach(item => {
        if (item.id === null) {
          // It's a folder
          folderList.push(item.name);
        } else {
          fileList.push(item);
        }
      });

      setFolders(folderList);
      setFiles(fileList);

      // Build breadcrumbs
      const pathParts = path.split('/').filter(Boolean);
      const crumbs: BreadcrumbItem[] = [{ name: bucket.name, path: '' }];
      let cumulativePath = '';
      pathParts.forEach(part => {
        cumulativePath = cumulativePath ? `${cumulativePath}/${part}` : part;
        crumbs.push({ name: part, path: cumulativePath });
      });
      setBreadcrumbs(crumbs);
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  const handleBucketClick = (bucket: Bucket) => {
    setSelectedBucket(bucket);
    setCurrentPath('');
    fetchFilesInPath(bucket, '');
    setExpandedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(bucket.id)) {
        next.delete(bucket.id);
      } else {
        next.add(bucket.id);
      }
      return next;
    });
  };

  const handleFolderClick = (folderName: string) => {
    if (!selectedBucket) return;
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    fetchFilesInPath(selectedBucket, newPath);
  };

  const handleBreadcrumbClick = (crumb: BreadcrumbItem, index: number) => {
    if (!selectedBucket) return;
    if (index === 0) {
      // Root of bucket
      setCurrentPath('');
      fetchFilesInPath(selectedBucket, '');
    } else {
      setCurrentPath(crumb.path);
      fetchFilesInPath(selectedBucket, crumb.path);
    }
  };

  const handlePreview = async (file: StorageFile) => {
    if (!selectedBucket) return;
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;

    try {
      // For public buckets, get public URL
      if (selectedBucket.public) {
        const { data } = supabase.storage
          .from(selectedBucket.id)
          .getPublicUrl(filePath);
        setPreviewUrl(data.publicUrl);
      } else {
        // For private buckets, create signed URL
        const { data, error } = await supabase.storage
          .from(selectedBucket.id)
          .createSignedUrl(filePath, 60 * 5); // 5 minutes
        if (error) throw error;
        setPreviewUrl(data.signedUrl);
      }
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Erro ao gerar URL:', error);
      toast.error('Erro ao gerar URL de visualização');
    }
  };

  const handleDownload = async (file: StorageFile) => {
    if (!selectedBucket) return;
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;

    try {
      const { data, error } = await supabase.storage
        .from(selectedBucket.id)
        .download(filePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  // Filter files by search
  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFolders = folders.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalFiles = files.length;
  const totalFolders = folders.length;
  const totalSize = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-8 h-8 text-chart-4" />
            Explorador de Storage
          </h1>
          <p className="text-muted-foreground">Visualização read-only dos buckets de armazenamento</p>
        </div>
        <Button variant="outline" onClick={() => {
          if (selectedBucket) {
            fetchFilesInPath(selectedBucket, currentPath);
          }
        }}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Buckets List */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderArchive className="w-5 h-5" />
              Buckets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : buckets.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">
                Nenhum bucket encontrado
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-2">
                  {buckets.map((bucket) => (
                    <button
                      key={bucket.id}
                      onClick={() => handleBucketClick(bucket)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-left ${
                        selectedBucket?.id === bucket.id
                          ? 'bg-chart-4/10 text-chart-4'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {expandedBuckets.has(bucket.id) ? (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      )}
                      <FolderOpen className="w-4 h-4 shrink-0" />
                      <span className="flex-1 font-medium truncate">{bucket.name}</span>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        bucket.public 
                          ? 'bg-chart-1/10 text-chart-1 border-chart-1/30' 
                          : 'bg-chart-5/10 text-chart-5 border-chart-5/30'
                      }`}>
                        {bucket.public ? 'Público' : 'Privado'}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Main Content - Files Browser */}
        <Card className="lg:col-span-3 border-border">
          <CardHeader className="pb-3">
            {selectedBucket ? (
              <div className="space-y-3">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 flex-wrap">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.path} className="flex items-center">
                      {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
                      <button
                        onClick={() => handleBreadcrumbClick(crumb, index)}
                        className={`text-sm hover:text-chart-4 transition-colors ${
                          index === breadcrumbs.length - 1
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Search and Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar arquivos..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{totalFolders} pastas</span>
                    <span>{totalFiles} arquivos</span>
                    <span>{formatFileSize(totalSize)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <CardTitle className="text-lg text-muted-foreground">
                Selecione um bucket para explorar
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {!selectedBucket ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
                <p>Clique em um bucket à esquerda para visualizar os arquivos</p>
              </div>
            ) : isLoadingFiles ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
                <p>Esta pasta está vazia</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-1">
                  {/* Back button if in subfolder */}
                  {currentPath && (
                    <button
                      onClick={() => {
                        const parentPath = currentPath.split('/').slice(0, -1).join('/');
                        setCurrentPath(parentPath);
                        fetchFilesInPath(selectedBucket, parentPath);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">..</span>
                    </button>
                  )}

                  {/* Folders */}
                  {filteredFolders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => handleFolderClick(folder)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <FolderOpen className="w-5 h-5 text-chart-4" />
                      <span className="flex-1 font-medium">{folder}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}

                  {/* Files */}
                  {filteredFiles.map((file) => {
                    const FileIcon = getFileIcon(file.metadata?.mimetype);
                    const isImage = isImageFile(file.metadata?.mimetype);

                    return (
                      <div
                        key={file.id || file.name}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <FileIcon className={`w-5 h-5 ${isImage ? 'text-chart-2' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.metadata?.size)}</span>
                            {file.created_at && (
                              <>
                                <span>•</span>
                                <span>{format(new Date(file.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isImage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePreview(file)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
