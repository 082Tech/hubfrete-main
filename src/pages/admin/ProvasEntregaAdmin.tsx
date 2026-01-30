import { useState, useEffect } from 'react';
import { 
  Camera, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Loader2,
  Image,
  FileSignature,
  ClipboardCheck,
  Calendar,
  User,
  Package,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination } from '@/components/admin/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ProvaEntrega = {
  id: string;
  entrega_id: string;
  nome_recebedor: string;
  documento_recebedor: string | null;
  assinatura_url: string | null;
  fotos_urls: string[] | null;
  checklist: Record<string, boolean> | any;
  observacoes: string | null;
  timestamp: string;
  created_at: string;
  entrega?: {
    id: string;
    codigo: string | null;
    motorista?: {
      id: string;
      nome_completo: string;
    };
  };
};

const ITEMS_PER_PAGE = 10;

const checklistLabels: Record<string, string> = {
  'lacre_intacto': 'Lacre intacto',
  'avarias_constatadas': 'Avarias constatadas',
  'nota_fiscal_presente': 'Nota fiscal presente',
  'quantidade_conferida': 'Quantidade conferida',
};

export default function ProvasEntregaAdmin() {
  const [provas, setProvas] = useState<ProvaEntrega[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProva, setSelectedProva] = useState<ProvaEntrega | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProvas();
  }, [filterPeriodo]);

  const fetchProvas = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('provas_entrega')
        .select(`
          *,
          entrega:entregas(id, codigo, motorista:motoristas(id, nome_completo))
        `)
        .order('timestamp', { ascending: false });

      // Filter by period
      if (filterPeriodo !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (filterPeriodo) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subDays(now, 30);
            break;
          default:
            startDate = subDays(now, 365);
        }
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setProvas(data || []);
    } catch (error) {
      console.error('Erro ao buscar provas de entrega:', error);
      toast.error('Erro ao carregar provas de entrega');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProvas = provas.filter(p => {
    const matchesSearch = 
      p.nome_recebedor.toLowerCase().includes(search.toLowerCase()) ||
      p.entrega?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      p.documento_recebedor?.includes(search);
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProvas.length / ITEMS_PER_PAGE);
  const paginatedProvas = filteredProvas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterPeriodo]);

  // Stats
  const today = startOfDay(new Date());
  const todayProvas = provas.filter(p => new Date(p.timestamp) >= today).length;
  const weekProvas = provas.filter(p => new Date(p.timestamp) >= subDays(new Date(), 7)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Camera className="w-8 h-8 text-chart-5" />
            Provas de Entrega
          </h1>
          <p className="text-muted-foreground">Comprovantes e registros de entrega</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-5/10 rounded-lg">
                <Camera className="w-5 h-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{provas.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Calendar className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayProvas}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Image className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {provas.filter(p => p.fotos_urls && p.fotos_urls.length > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Com fotos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <FileSignature className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {provas.filter(p => p.assinatura_url).length}
                </p>
                <p className="text-sm text-muted-foreground">Com assinatura</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código da entrega, recebedor ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Últimos 7 dias</SelectItem>
            <SelectItem value="month">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProvas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma prova de entrega encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Recebedor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Fotos</TableHead>
                    <TableHead>Assinatura</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProvas.map((prova) => (
                    <TableRow key={prova.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono font-medium">
                            {prova.entrega?.codigo || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {prova.nome_recebedor}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {prova.documento_recebedor || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {prova.fotos_urls && prova.fotos_urls.length > 0 ? (
                          <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30">
                            <Image className="w-3 h-3 mr-1" />
                            {prova.fotos_urls.length}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prova.assinatura_url ? (
                          <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/30">
                            <FileSignature className="w-3 h-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(prova.timestamp), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(prova.timestamp), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedProva(prova);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProvas.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Prova de Entrega</DialogTitle>
            <DialogDescription>
              Entrega: {selectedProva?.entrega?.codigo || '-'}
            </DialogDescription>
          </DialogHeader>
          {selectedProva && (
            <div className="space-y-6">
              {/* Receiver Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recebedor</p>
                  <p className="font-medium">{selectedProva.nome_recebedor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-mono">{selectedProva.documento_recebedor || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p>{format(new Date(selectedProva.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Motorista</p>
                  <p>{selectedProva.entrega?.motorista?.nome_completo || '-'}</p>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <ClipboardCheck className="w-4 h-4" />
                  Checklist de Conferência
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProva.checklist || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      {value ? (
                        <CheckCircle2 className="w-4 h-4 text-chart-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-sm">{checklistLabels[key] || key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observations */}
              {selectedProva.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedProva.observacoes}</p>
                </div>
              )}

              {/* Signature */}
              {selectedProva.assinatura_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <FileSignature className="w-4 h-4" />
                    Assinatura do Recebedor
                  </p>
                  <img
                    src={selectedProva.assinatura_url}
                    alt="Assinatura"
                    className="max-w-xs h-24 object-contain bg-white border rounded-lg p-2 cursor-pointer hover:opacity-80"
                    onClick={() => setLightboxImage(selectedProva.assinatura_url)}
                  />
                </div>
              )}

              {/* Photos */}
              {selectedProva.fotos_urls && selectedProva.fotos_urls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Image className="w-4 h-4" />
                    Fotos ({selectedProva.fotos_urls.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProva.fotos_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxImage(url)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
