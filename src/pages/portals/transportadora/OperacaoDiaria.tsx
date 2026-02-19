import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeftRight,
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  History,
  Share,
  Printer,
  X,
  ArrowUpRight,
  Map,
  MoreVertical,
  Ban,
  ArrowRight,
  Upload,
  Download,
  FileText,
  Building2,
  Calendar,
  Weight,
  DollarSign,
  Paperclip,
  AlertTriangle,
  Search,
  HelpCircle,
  Route,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { AdvancedFiltersPopover, AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
import { AnexarDocumentosDialog } from '@/components/entregas/AnexarDocumentosDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { DocumentButton } from '@/components/entregas/DocumentButton';
import { DetailPanelLeafletMap } from '@/components/maps/DetailPanelLeafletMap';
import { GestaoLeafletMap } from '@/components/maps/GestaoLeafletMap';
import { ChatSheet } from '@/components/mensagens/ChatSheet';
import { DailyPerformanceDialog } from '@/components/admin/relatorios/DailyPerformanceDialog';
import { BarChart3 } from 'lucide-react';
import { ViagemListItem, ViagemDetailPanel } from '@/components/viagens';

type ViewMode = 'entregas' | 'viagens';

// Status definitions - apenas os status válidos
// Coluna 1 (pending): APENAS 'aguardando'
// Coluna 2 (inRoute/done): 'saiu_para_coleta', 'saiu_para_entrega', 'entregue', 'cancelada'
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; column: 'pending' | 'inRoute' | 'done' }> = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800', icon: Clock, column: 'pending' },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800', icon: Truck, column: 'inRoute' },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', icon: MapPin, column: 'inRoute' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', icon: CheckCircle, column: 'done' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', icon: XCircle, column: 'done' },
};

type EntregaStatus = string;

interface Entrega {
  id: string;
  codigo: string;
  status: EntregaStatus;
  created_at: string;
  updated_at: string;
  motorista_id: string | null;
  veiculo_id: string | null;
  carroceria_id: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  coletado_em: string | null;
  entregue_em: string | null;
  // Documentos
  cte_url: string | null;
  numero_cte: string | null;
  notas_fiscais_urls: string[] | null;
  manifesto_url: string | null;
  canhoto_url: string | null;
  motorista?: { id: string; nome_completo: string; telefone: string | null; foto_url: string | null } | null;
  veiculo?: { id: string; placa: string; modelo: string | null; tipo: string } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    tipo: string;
    quantidade: number | null;
    remetente_razao_social: string | null;
    remetente_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    destinatario_nome_fantasia: string | null;
    data_coleta_de: string | null;
    data_entrega_limite: string | null;
    endereco_origem?: { cidade: string; estado: string; logradouro: string; numero: string | null; bairro: string | null; cep: string; latitude: number | null; longitude: number | null } | null;
    endereco_destino?: { cidade: string; estado: string; logradouro: string; numero: string | null; bairro: string | null; cep: string; latitude: number | null; longitude: number | null } | null;
    empresa?: { id: number; nome: string | null } | null;
  };
  eventos?: Array<{
    id: string;
    tipo: string;
    timestamp: string;
    observacao: string | null;
    user_nome: string | null;
  }>;
}

// Helper para verificar documentos obrigatórios da entrega (3 docs: CT-e, Canhoto, NF-e)
// Manifesto pertence à viagem, não à entrega
function checkRequiredDocuments(entrega: Entrega): { complete: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!entrega.cte_url) missing.push('CT-e');
  if (!entrega.canhoto_url) missing.push('Canhoto');
  if (!entrega.notas_fiscais_urls || entrega.notas_fiscais_urls.length === 0) missing.push('Nota Fiscal');

  return { complete: missing.length === 0, missing };
}

// Delivery list item component (iFood style)
function EntregaListItem({
  entrega,
  isSelected,
  onClick,
}: {
  entrega: Entrega;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando;
  const tempoDecorrido = formatDistanceToNow(new Date(entrega.updated_at || entrega.created_at), {
    addSuffix: false,
    locale: ptBR
  });

  const remetenteNome = entrega.carga.remetente_nome_fantasia || entrega.carga.remetente_razao_social || 'Remetente não informado';
  const destinatarioNome = entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || 'Destinatário não informado';

  return (
    <div
      className={`flex items-start gap-3 bg-card px-4 py-3 cursor-pointer transition-all hover:bg-muted/50 border-b ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
        }`}
      onClick={onClick}
    >
      {/* Avatar/Icon */}
      <Avatar className="h-9 w-9 shrink-0">
        {entrega.motorista?.foto_url && (
          <AvatarImage src={entrega.motorista.foto_url} />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {entrega.motorista?.nome_completo?.[0] || <Truck className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Motorista */}
        <span className="font-medium text-sm truncate block">
          {entrega.motorista?.nome_completo || 'Sem motorista'}
        </span>

        {/* Origem → Destino */}
        <div className="flex items-center gap-1 text-sm font-semibold">
          <span className="truncate">
            {entrega.carga.endereco_origem?.cidade || 'N/A'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">
            {entrega.carga.endereco_destino?.cidade || 'N/A'}
          </span>
        </div>

        {/* Remetente / Destinatário */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
          <span className="flex items-center gap-1 truncate max-w-[120px]" title={remetenteNome}>
            <Upload className="w-3 h-3 shrink-0" />
            {remetenteNome}
          </span>
          <span className="flex items-center gap-1 truncate max-w-[120px]" title={destinatarioNome}>
            <Download className="w-3 h-3 shrink-0" />
            {destinatarioNome}
          </span>
        </div>

        {/* Descrição da entrega */}
        {entrega.carga.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {entrega.carga.descricao}
          </p>
        )}

        {/* Código + Valor */}
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5">
            #{entrega.codigo || entrega.id.slice(0, 6)}
          </Badge>
          {entrega.valor_frete && (
            <span className="text-primary font-semibold">
              R$ {entrega.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Time & Status */}
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground mb-1">{tempoDecorrido}</p>
        <Badge className={`text-[10px] ${statusInfo.color}`}>
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}

// Empty column placeholder - centered both vertically and horizontally
function EmptyColumnPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground px-8 py-12 h-full min-h-[200px]">
      <Package className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

// Detail panel (right side) - with full information
function DetailPanel({
  entrega,
  onClose,
  onStatusChange,
  isChangingStatus,
  driverLocation,
  onRefresh,
  showBackButton = false,
  onBack,
  viagemStatus,
}: {
  entrega: Entrega | null;
  onClose: () => void;
  onStatusChange: (newStatus: EntregaStatus) => void;
  isChangingStatus: boolean;
  driverLocation: { lat: number; lng: number; heading?: number | null; isOnline?: boolean } | null;
  onRefresh: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  viagemStatus?: string | null;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [entregueDialogOpen, setEntregueDialogOpen] = useState(false);
  const [anexarDocumentosOpen, setAnexarDocumentosOpen] = useState(false);
  const [actionConfirmDialogOpen, setActionConfirmDialogOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [chatSheetOpen, setChatSheetOpen] = useState(false);

  if (!entrega) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyColumnPlaceholder
          message="Selecione uma entrega para ver os detalhes"
        />
      </div>
    );
  }

  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando;
  const StatusIcon = statusInfo.icon;

  const origemCoords = entrega.carga.endereco_origem?.latitude && entrega.carga.endereco_origem?.longitude
    ? { lat: entrega.carga.endereco_origem.latitude, lng: entrega.carga.endereco_origem.longitude }
    : null;
  const destinoCoords = entrega.carga.endereco_destino?.latitude && entrega.carga.endereco_destino?.longitude
    ? { lat: entrega.carga.endereco_destino.latitude, lng: entrega.carga.endereco_destino.longitude }
    : null;

  // Determine next status based on current status
  const getNextStatus = (): { status: string; label: string; icon: React.ElementType } | null => {
    switch (entrega.status) {
      case 'aguardando': return { status: 'saiu_para_coleta', label: 'Saiu para Coleta', icon: Truck };
      case 'saiu_para_coleta': return { status: 'saiu_para_entrega', label: 'Saiu para Entrega', icon: MapPin };
      case 'saiu_para_entrega': return { status: 'entregue', label: 'Marcar como Entregue', icon: CheckCircle };
      default: return null;
    }
  };

  const nextStatus = getNextStatus();
  const isFinalized = entrega.status === 'entregue' || entrega.status === 'cancelada';
  
  // Verificar se a viagem está iniciada (não mais necessário, viagens já iniciam como aguardando)
  const isViagemNotStarted = false;

  const handleCancelConfirm = () => {
    onStatusChange('cancelada');
    setCancelDialogOpen(false);
  };

  const handleEntregueConfirm = () => {
    onStatusChange('entregue');
    setEntregueDialogOpen(false);
  };

  const handleActionConfirm = () => {
    if (!nextStatus) return;
    onStatusChange(nextStatus.status);
    setActionConfirmDialogOpen(false);
  };

  const handleActionClick = () => {
    if (!nextStatus) return;

    if (nextStatus.status === 'entregue') {
      // Precisa verificar documentos antes de marcar como entregue
      setEntregueDialogOpen(true);
    } else {
      // Todas as ações precisam de confirmação
      setActionConfirmDialogOpen(true);
    }
  };

  const handleDocClick = (url: string | null, title: string) => {
    if (url) {
      setPreviewDocUrl(url);
      setPreviewDocTitle(title);
    }
  };

  const docsCheck = checkRequiredDocuments(entrega);

  const remetenteNome = entrega.carga.remetente_nome_fantasia || entrega.carga.remetente_razao_social;
  const destinatarioNome = entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social;

  // Contagem de documentos anexados (3 obrigatórios: CT-e, Canhoto, NF-e)
  const docsCount = [
    entrega.cte_url ? 1 : 0,
    entrega.canhoto_url ? 1 : 0,
    (entrega.notas_fiscais_urls?.length || 0) > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header with code and actions */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {showBackButton && onBack && (
              <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={onBack}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            )}
            <span className="text-xs text-muted-foreground">Entrega Nº</span>
            <Badge variant="outline" className="font-mono font-bold text-xs px-2 border-primary text-primary">
              {entrega.codigo || entrega.id.slice(0, 8)}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Share className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          {format(new Date(entrega.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })} • Carga {entrega.carga.codigo}
        </p>

        {/* Status banner */}
        <div className={`rounded-md px-3 py-1.5 text-center text-sm ${statusInfo.color}`}>
          <span className="font-semibold flex items-center justify-center gap-2">
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label} há {formatDistanceToNow(new Date(entrega.updated_at), { locale: ptBR })}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Empresa que publicou */}
          {entrega.carga.empresa && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Publicado por:</span>
              <span className="font-medium">{entrega.carga.empresa.nome || 'Empresa não identificada'}</span>
            </div>
          )}

          {/* Mapa com rotas condicionais e histórico de rastreamento */}
          <DetailPanelLeafletMap
            origemCoords={origemCoords}
            destinoCoords={destinoCoords}
            driverLocation={driverLocation}
            status={entrega.status}
            height={300}
            entregaId={entrega.id}
          />

          {/* Cargo description */}
          <div className="text-sm">
            <p className="font-medium">{entrega.carga.descricao}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Weight className="w-3 h-3" />
                {entrega.carga.peso_kg?.toLocaleString('pt-BR')} kg
              </span>
              {entrega.carga.quantidade && (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {entrega.carga.quantidade} un
                </span>
              )}
              {entrega.valor_frete && (
                <span className="flex items-center gap-1 text-primary font-semibold">
                  <DollarSign className="w-3 h-3" />
                  R$ {entrega.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Origem */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              ORIGEM / REMETENTE
            </div>
            <div className="pl-4 text-sm">
              {remetenteNome && <p className="font-medium">{remetenteNome}</p>}
              {entrega.carga.endereco_origem && (
                <>
                  <p className="text-muted-foreground">
                    {entrega.carga.endereco_origem.logradouro}
                    {entrega.carga.endereco_origem.numero && `, ${entrega.carga.endereco_origem.numero}`}
                    {entrega.carga.endereco_origem.bairro && ` - ${entrega.carga.endereco_origem.bairro}`}
                  </p>
                  <p className="text-muted-foreground">
                    {entrega.carga.endereco_origem.cidade}/{entrega.carga.endereco_origem.estado} - CEP {entrega.carga.endereco_origem.cep}
                  </p>
                </>
              )}
              {entrega.carga.data_coleta_de && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Coleta: {format(new Date(entrega.carga.data_coleta_de), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* Destino */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              DESTINO / DESTINATÁRIO
            </div>
            <div className="pl-4 text-sm">
              {destinatarioNome && <p className="font-medium">{destinatarioNome}</p>}
              {entrega.carga.endereco_destino && (
                <>
                  <p className="text-muted-foreground">
                    {entrega.carga.endereco_destino.logradouro}
                    {entrega.carga.endereco_destino.numero && `, ${entrega.carga.endereco_destino.numero}`}
                    {entrega.carga.endereco_destino.bairro && ` - ${entrega.carga.endereco_destino.bairro}`}
                  </p>
                  <p className="text-muted-foreground">
                    {entrega.carga.endereco_destino.cidade}/{entrega.carga.endereco_destino.estado} - CEP {entrega.carga.endereco_destino.cep}
                  </p>
                </>
              )}
              {entrega.carga.data_entrega_limite && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Prazo: {format(new Date(entrega.carga.data_entrega_limite), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Datas da entrega */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/30 rounded-md p-2">
              <p className="text-muted-foreground">Data Coleta</p>
              <p className="font-medium">
                {entrega.coletado_em
                  ? format(new Date(entrega.coletado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : 'Pendente'}
              </p>
            </div>
            <div className="bg-muted/30 rounded-md p-2">
              <p className="text-muted-foreground">Data Entrega</p>
              <p className="font-medium">
                {entrega.entregue_em
                  ? format(new Date(entrega.entregue_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : 'Pendente'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Documentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-xs">Documentos</span>
              </div>
              <Badge variant={docsCheck.complete ? "default" : "secondary"} className="text-[10px]">
                {docsCount}/3 anexados
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <DocumentButton
                type="cte"
                hasDoc={!!entrega.cte_url}
                canAttach={true}
                onView={() => handleDocClick(entrega.cte_url, 'CT-e')}
                entregaId={entrega.id}
                onUploaded={onRefresh}
              />
              <DocumentButton
                type="canhoto"
                hasDoc={!!entrega.canhoto_url}
                canAttach={true}
                onView={() => handleDocClick(entrega.canhoto_url, 'Canhoto')}
                entregaId={entrega.id}
                onUploaded={onRefresh}
              />
              <DocumentButton
                type="nfe"
                hasDoc={(entrega.notas_fiscais_urls?.length || 0) > 0}
                count={entrega.notas_fiscais_urls?.length || 0}
                canAttach={false}
                onView={() => handleDocClick(entrega.notas_fiscais_urls?.[0] || null, 'Nota Fiscal')}
                entregaId={entrega.id}
                onUploaded={onRefresh}
              />
            </div>
          </div>

          <Separator />

          {/* Driver & Vehicle + Chat Button + Status Online/Offline */}
          {entrega.motorista && (
            <Card className="shadow-none border">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      {entrega.motorista.foto_url && <AvatarImage src={entrega.motorista.foto_url} />}
                      <AvatarFallback className="text-xs">{entrega.motorista.nome_completo?.[0]}</AvatarFallback>
                    </Avatar>
                    {/* Indicador visual de online/offline no avatar */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${driverLocation?.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{entrega.motorista.nome_completo}</p>
                      {/* Badge de status Online/Offline com tempo */}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${driverLocation?.isOnline
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${driverLocation?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                        {driverLocation?.isOnline ? 'Online' : (() => {
                          const lastSeen = (driverLocation as any)?.updated_at;
                          if (!lastSeen) return 'Offline';
                          const text = formatDistanceToNow(new Date(lastSeen), { locale: ptBR, addSuffix: false });
                          return `Offline há ${text}`;
                        })()}
                      </span>
                    </div>
                    {entrega.veiculo && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Truck className="w-3 h-3" />
                        <span>{entrega.veiculo.placa}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setChatSheetOpen(true)}
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Histórico</span>
            </div>

            {entrega.eventos && entrega.eventos.length > 0 ? (
              <div className="relative">
                {/* Linha vertical de timeline */}
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

                <div className="space-y-4">
                  {entrega.eventos.slice(0, 5).map((evento, idx) => {
                    // Mapear tipo do evento para label legível e cor
                    const tipoConfig: Record<string, { label: string; bgColor: string; isDocument?: boolean; isCreation?: boolean }> = {
                      criado: { label: 'Entrega criada', bgColor: 'bg-gray-100 dark:bg-gray-900/30', isCreation: true },
                      aceite: { label: 'Aguardando', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
                      inicio_coleta: { label: 'Saiu para Coleta', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
                      inicio_rota: { label: 'Saiu para Entrega', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
                      finalizado: { label: 'Entregue', bgColor: 'bg-green-100 dark:bg-green-900/30' },
                      cancelado: { label: 'Cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30' },
                      problema: { label: 'Problema', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
                      documento_anexado: { label: 'Documento anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
                      cte_anexado: { label: 'CT-e anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
                      manifesto_anexado: { label: 'Manifesto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
                      canhoto_anexado: { label: 'Canhoto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
                      nf_anexada: { label: 'Nota Fiscal anexada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
                    };

                    const config = tipoConfig[evento.tipo] || { label: evento.tipo.replace(/_/g, ' '), bgColor: 'bg-muted dark:bg-muted/50' };
                    const userName = evento.user_nome || 'Sistema';
                    const isDocument = config.isDocument || evento.tipo.includes('documento') || evento.tipo.includes('anexa');
                    const isCreation = config.isCreation;
                    const isLast = idx === entrega.eventos!.slice(0, 5).length - 1;

                    return (
                      <div key={evento.id} className="relative flex items-start gap-3">
                        {/* Ícone com cor de fundo baseada no status */}
                        <div className={`relative z-10 w-8 h-8 rounded-md ${config.bgColor} flex items-center justify-center shrink-0`}>
                          {isDocument ? (
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : isCreation ? (
                            <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ArrowLeftRight className={`w-4 h-4 ${evento.tipo === 'aceite' ? 'text-amber-600 dark:text-amber-400' :
                              evento.tipo === 'inicio_coleta' ? 'text-cyan-600 dark:text-cyan-400' :
                                evento.tipo === 'inicio_rota' ? 'text-purple-600 dark:text-purple-400' :
                                  evento.tipo === 'finalizado' ? 'text-green-600 dark:text-green-400' :
                                    evento.tipo === 'cancelado' ? 'text-red-600 dark:text-red-400' :
                                      evento.tipo === 'problema' ? 'text-orange-600 dark:text-orange-400' :
                                        'text-muted-foreground'
                              }`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm">
                            <span className="font-medium">{userName}</span>
                            <span className="text-muted-foreground">
                              {isCreation ? ' criou esta entrega' : isDocument ? ' anexou ' : ' definiu o status como '}
                            </span>
                            {!isCreation && <span className="font-medium">{config.label}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(evento.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                Nenhum evento registrado
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Alerta de viagem não iniciada */}
      {isViagemNotStarted && !isFinalized && (
        <div className="px-3 pt-3">
          <div className="flex items-start gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300">
                Viagem não iniciada
              </p>
              <p className="text-blue-700 dark:text-blue-400">
                Inicie a viagem primeiro para liberar as ações de entrega.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions - botão principal + menu de 3 pontos */}
      {!isFinalized && nextStatus && (
        <div className="p-3 border-t bg-muted/20">
          <div className="flex gap-2">
            {/* Menu de mais ações (3 pontos) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2" disabled={isViagemNotStarted}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setAnexarDocumentosOpen(true)}>
                  <Paperclip className="w-4 h-4 mr-2" />
                  Anexar documentos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCancelDialogOpen(true)} className="text-destructive focus:text-destructive">
                  <Ban className="w-4 h-4 mr-2" />
                  Cancelar entrega
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão de ação principal */}
            <Button
              variant="default"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleActionClick}
              disabled={isChangingStatus || isViagemNotStarted}
            >
              {isChangingStatus ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <nextStatus.icon className="w-3.5 h-3.5 mr-1" />
              )}
              {nextStatus.label}
            </Button>
          </div>
        </div>
      )}

      {/* Alert Dialog para confirmar cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancelar entrega?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar a entrega <span className="font-semibold">{entrega.codigo}</span>.
              O peso será devolvido para a carga original. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para confirmar entrega */}
      <AlertDialog open={entregueDialogOpen} onOpenChange={setEntregueDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {docsCheck.complete ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              {docsCheck.complete ? 'Confirmar entrega?' : 'Documentos obrigatórios pendentes'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {docsCheck.complete ? (
                  <p>
                    Todos os documentos obrigatórios estão anexados. Deseja confirmar a entrega <span className="font-semibold">{entrega.codigo}</span>?
                  </p>
                ) : (
                  <>
                    <p className="text-destructive font-medium">
                      Não é possível confirmar a entrega. Os seguintes documentos são obrigatórios:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {docsCheck.missing.map((doc) => (
                        <li key={doc} className="text-destructive">{doc}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Anexe todos os documentos obrigatórios para poder finalizar a entrega.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            {docsCheck.complete ? (
              <AlertDialogAction onClick={handleEntregueConfirm} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar entrega
              </AlertDialogAction>
            ) : (
              <Button
                onClick={() => {
                  setEntregueDialogOpen(false);
                  setAnexarDocumentosOpen(true);
                }}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Anexar documentos
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para confirmar ação de status (não-entregue) */}
      <AlertDialog open={actionConfirmDialogOpen} onOpenChange={setActionConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {nextStatus && <nextStatus.icon className="w-5 h-5 text-primary" />}
              Confirmar ação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o status da entrega <span className="font-semibold">{entrega.codigo}</span> para <span className="font-semibold">{nextStatus?.label}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleActionConfirm}>
              {nextStatus && <nextStatus.icon className="w-4 h-4 mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para anexar documentos */}
      <AnexarDocumentosDialog
        entrega={{
          id: entrega.id,
          cte_url: entrega.cte_url,
          numero_cte: entrega.numero_cte,
          notas_fiscais_urls: entrega.notas_fiscais_urls,
          canhoto_url: entrega.canhoto_url,
          carga: { codigo: entrega.carga.codigo },
        }}
        open={anexarDocumentosOpen}
        onOpenChange={setAnexarDocumentosOpen}
        onSuccess={onRefresh}
      />

      {/* Dialog para preview de documento */}
      <FilePreviewDialog
        open={!!previewDocUrl}
        onOpenChange={(open) => !open && setPreviewDocUrl(null)}
        fileUrl={previewDocUrl}
        title={previewDocTitle}
      />

      {/* Chat Sheet */}
      <ChatSheet
        open={chatSheetOpen}
        onOpenChange={setChatSheetOpen}
        entregaId={entrega.id}
        userType="transportadora"
      />
    </div>
  );
}

// ==================== Gestão Dialog com Mapa + Lista Motoristas ====================

function GestaoEntregasDialogContent({
  entregas,
  localizacoes,
}: {
  entregas: Entrega[];
  localizacoes: Array<{ motorista_id: string; latitude: number | null; longitude: number | null; heading?: number | null; isOnline?: boolean; updated_at?: string | null }>;
}) {
  const { empresa } = useUserContext();
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<string | null>(null);
  const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch viagens ativas para agrupar entregas por viagem
  type ViagemMapEntry = { viagem_id: string; codigo: string; status: string; motorista_id: string };
  const { data: entregaViagemMap = {} as Record<string, ViagemMapEntry> } = useQuery({
    queryKey: ['gestao-map-viagens', empresa?.id],
    queryFn: async (): Promise<Record<string, ViagemMapEntry>> => {
      if (!empresa?.id) return {};

      const { data: motoristas } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (!motoristas?.length) return {};

      const motoristaIds = motoristas.map(m => m.id);

      // Fetch active viagens
      const { data: viagensData } = await supabase
        .from('viagens')
        .select('id, codigo, status, motorista_id')
        .in('motorista_id', motoristaIds)
        .in('status', ['aguardando', 'programada', 'em_andamento']);

      if (!viagensData?.length) return {};

      // Fetch viagem_entregas to map entrega_id -> viagem
      const viagemIds = viagensData.map(v => v.id);
      const { data: veLinks } = await supabase
        .from('viagem_entregas')
        .select('viagem_id, entrega_id')
        .in('viagem_id', viagemIds);

      // Build map: entrega_id -> viagem info
      const result: Record<string, ViagemMapEntry> = {};
      (veLinks || []).forEach(link => {
        const viagem = viagensData.find(v => v.id === link.viagem_id);
        if (viagem) {
          result[link.entrega_id] = {
            viagem_id: viagem.id,
            codigo: viagem.codigo,
            status: viagem.status,
            motorista_id: viagem.motorista_id,
          };
        }
      });

      return result;
    },
    enabled: !!empresa?.id,
  });

  // Agrupar entregas por viagem (e motorista sem viagem como grupo separado)
  const viagemGroups = useMemo(() => {
    type ViagemGroup = {
      id: string; // viagem_id or motorista_id fallback
      tipo: 'viagem' | 'sem_viagem';
      viagemCodigo?: string;
      viagemStatus?: string;
      motorista: Entrega['motorista'];
      motorista_id: string;
      entregas: Entrega[];
    };

    const groups: Record<string, ViagemGroup> = {};

    entregas.forEach(e => {
      if (!e.motorista_id || !e.motorista) return;

      const viagemInfo = entregaViagemMap[e.id];

      if (viagemInfo) {
        // Entrega belongs to a viagem
        const key = `viagem-${viagemInfo.viagem_id}`;
        if (!groups[key]) {
          groups[key] = {
            id: viagemInfo.viagem_id,
            tipo: 'viagem',
            viagemCodigo: viagemInfo.codigo,
            viagemStatus: viagemInfo.status,
            motorista: e.motorista,
            motorista_id: e.motorista_id,
            entregas: [],
          };
        }
        groups[key].entregas.push(e);
      } else {
        // Entrega sem viagem ativa - agrupar por motorista
        const key = `orphan-${e.motorista_id}`;
        if (!groups[key]) {
          groups[key] = {
            id: e.motorista_id,
            tipo: 'sem_viagem',
            motorista: e.motorista,
            motorista_id: e.motorista_id,
            entregas: [],
          };
        }
        groups[key].entregas.push(e);
      }
    });

    return Object.values(groups);
  }, [entregas, entregaViagemMap]);

  // Filtrar grupos pelo termo de busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return viagemGroups;

    const term = searchTerm.toLowerCase();
    return viagemGroups.filter(g => {
      const nome = g.motorista?.nome_completo?.toLowerCase() || '';
      const viagemMatch = g.viagemCodigo?.toLowerCase().includes(term) || false;
      const temEntregaMatch = g.entregas.some(e =>
        e.codigo?.toLowerCase().includes(term) ||
        e.carga.endereco_origem?.cidade?.toLowerCase().includes(term) ||
        e.carga.endereco_destino?.cidade?.toLowerCase().includes(term)
      );
      return nome.includes(term) || viagemMatch || temEntregaMatch;
    });
  }, [viagemGroups, searchTerm]);

  // Mapa de nomes dos motoristas para o componente de mapa
  const motoristaNames = useMemo(() => {
    const names: Record<string, string> = {};
    viagemGroups.forEach(g => {
      names[g.motorista_id] = g.motorista?.nome_completo || 'Motorista';
    });
    return names;
  }, [viagemGroups]);

  // Informações extras para tooltip do mapa (com entregas completas e lastSeenAt)
  const motoristaInfo = useMemo(() => {
    const info: Record<string, { nome: string; entregas: Array<{ id: string; codigo: string; status: string; origemCidade: string; destinoCidade: string; origemCoords: { lat: number; lng: number } | null; destinoCoords: { lat: number; lng: number } | null }>; isOnline: boolean; lastSeenAt?: string | null }> = {};
    viagemGroups.forEach(g => {
      const loc = localizacoes.find(l => l.motorista_id === g.motorista_id);
      // Merge entregas into motorista-level info for map tooltips
      if (!info[g.motorista_id]) {
        info[g.motorista_id] = {
          nome: g.motorista?.nome_completo || 'Motorista',
          entregas: [],
          isOnline: loc?.isOnline ?? false,
          lastSeenAt: (loc as any)?.updated_at ?? null,
        };
      }
      info[g.motorista_id].entregas.push(...g.entregas.map(e => ({
        id: e.id,
        codigo: e.codigo || e.id.slice(0, 6),
        status: e.status,
        origemCidade: e.carga.endereco_origem?.cidade || 'N/A',
        destinoCidade: e.carga.endereco_destino?.cidade || 'N/A',
        origemCoords: e.carga.endereco_origem?.latitude && e.carga.endereco_origem?.longitude
          ? { lat: e.carga.endereco_origem.latitude, lng: e.carga.endereco_origem.longitude }
          : null,
        destinoCoords: e.carga.endereco_destino?.latitude && e.carga.endereco_destino?.longitude
          ? { lat: e.carga.endereco_destino.latitude, lng: e.carga.endereco_destino.longitude }
          : null,
      })));
    });
    return info;
  }, [viagemGroups, localizacoes]);

  // Contagem de status para os indicadores - cores padronizadas
  const statusCounts = useMemo(() => {
    let aguardando = 0, coleta = 0, entrega = 0, entregue = 0, cancelada = 0;
    entregas.forEach(e => {
      if (e.status === 'aguardando') aguardando++;
      else if (e.status === 'saiu_para_coleta') coleta++;
      else if (e.status === 'saiu_para_entrega') entrega++;
      else if (e.status === 'entregue') entregue++;
      else if (e.status === 'cancelada') cancelada++;
    });
    return { aguardando, coleta, entrega, entregue, cancelada };
  }, [entregas]);

  // Handler para clicar no grupo (viagem ou motorista)
  const handleGroupClick = useCallback((groupId: string) => {
    setSelectedMotoristaId(prev => {
      if (prev === groupId) {
        setSelectedEntregaId(null);
        return null;
      }
      // Auto-selecionar primeira entrega do grupo
      const group = viagemGroups.find(g => g.id === groupId);
      if (group?.entregas.length) {
        setSelectedEntregaId(group.entregas[0].id);
      }
      return groupId;
    });
  }, [viagemGroups]);

  // Bridge: map sends motorista_id, but we need to find the group
  const handleMapMotoristaClick = useCallback((motoristaId: string) => {
    const group = viagemGroups.find(g => g.motorista_id === motoristaId);
    if (group) {
      handleGroupClick(group.id);
    }
  }, [viagemGroups, handleGroupClick]);

  // Handler para selecionar entrega específica
  const handleEntregaSelect = useCallback((entregaId: string) => {
    setSelectedEntregaId(entregaId);
  }, []);

  // Dados da entrega selecionada para o painel flutuante
  const selectedEntregaData = useMemo(() => {
    if (!selectedEntregaId) return null;
    const entrega = entregas.find(e => e.id === selectedEntregaId);
    if (!entrega) return null;
    return {
      id: entrega.id,
      codigo: entrega.codigo,
      status: entrega.status,
      motoristaNome: entrega.motorista?.nome_completo || 'Motorista',
      motoristaFoto: entrega.motorista?.foto_url,
      carga: {
        descricao: entrega.carga.descricao,
        peso: entrega.carga.peso_kg,
        tipo: entrega.carga.tipo,
        remetente: entrega.carga.remetente_nome_fantasia || entrega.carga.remetente_razao_social,
        destinatario: entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social,
        origemCidade: entrega.carga.endereco_origem?.cidade,
        origemEstado: entrega.carga.endereco_origem?.estado,
        destinoCidade: entrega.carga.endereco_destino?.cidade,
        destinoEstado: entrega.carga.endereco_destino?.estado,
      },
      pesoAlocado: entrega.peso_alocado_kg,
      valorFrete: entrega.valor_frete,
      numeroCte: entrega.numero_cte,
    };
  }, [selectedEntregaId, entregas]);

  // Convert group.id to motorista_id for the map
  const mapSelectedMotoristaId = useMemo(() => {
    if (!selectedMotoristaId) return null;
    const group = viagemGroups.find(g => g.id === selectedMotoristaId);
    return group?.motorista_id || null;
  }, [selectedMotoristaId, viagemGroups]);

  return (
    <>
      <DialogHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-bold">Gestão de Entregas</DialogTitle>
        </div>
      </DialogHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* Mapa grande à esquerda (70%) */}
        <div className="flex-[7] relative">
          <GestaoLeafletMap
            localizacoes={localizacoes}
            selectedMotoristaId={mapSelectedMotoristaId}
            selectedEntregaId={selectedEntregaId}
            onMotoristaClick={handleMapMotoristaClick}
            onEntregaDeselect={() => setSelectedEntregaId(null)}
            motoristaNames={motoristaNames}
            motoristaInfo={motoristaInfo}
            statusCounts={statusCounts}
            selectedEntregaData={selectedEntregaData}
          />
        </div>

        {/* Lista de motoristas à direita (30%) */}
        <div className="flex-[3] border-l flex flex-col bg-background">
          {/* Header com busca */}
          <div className="px-3 py-2 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Viagens ({filteredGroups.length})</span>
              {searchTerm && (
                <span className="text-xs text-muted-foreground">
                  de {viagemGroups.length} total
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar motorista, código, cidade..."
                className="pl-8 h-8 text-xs bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredGroups.length === 0 ? (
              <EmptyColumnPlaceholder message={searchTerm ? "Nenhuma viagem encontrada" : "Nenhuma viagem disponível"} />
            ) : (
              filteredGroups.map(group => {
                const loc = localizacoes.find(l => l.motorista_id === group.motorista_id);
                const isOnline = loc?.isOnline ?? false;
                const isSelected = selectedMotoristaId === group.id;

                // Calcular tempo desde última atualização
                const lastSeenAt = (loc as any)?.updated_at;
                const lastSeenText = lastSeenAt
                  ? formatDistanceToNow(new Date(lastSeenAt), { locale: ptBR, addSuffix: false })
                  : null;

                return (
                  <div
                    key={group.id}
                    className={`px-3 py-2.5 border-b cursor-pointer transition-all hover:bg-muted/50 ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                    onClick={() => handleGroupClick(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          {group.motorista?.foto_url && <AvatarImage src={group.motorista.foto_url} />}
                          <AvatarFallback className="text-xs">{group.motorista?.nome_completo?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{group.motorista?.nome_completo}</p>
                          {/* Badge de status Online/Offline com tempo */}
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isOnline
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                            {isOnline ? 'Online' : `Offline há ${lastSeenText || '?'}`}
                          </span>
                        </div>
                        {/* Viagem info */}
                        <div className="flex items-center gap-2 mt-0.5">
                          {group.tipo === 'viagem' && group.viagemCodigo && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1 font-mono bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700">
                              <Route className="w-2.5 h-2.5" />
                              {group.viagemCodigo}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {group.entregas.length} entrega{group.entregas.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Entregas do motorista - lista expandida mais informativa */}
                    {isSelected && group.entregas.length > 0 && (
                      <div className="mt-2 pl-10 space-y-2">
                        {group.entregas.map(e => {
                          const isEntregaSelected = selectedEntregaId === e.id;
                          const statusInfo = statusConfig[e.status];
                          const StatusIcon = statusInfo?.icon || Package;

                          return (
                            <div
                              key={e.id}
                              className={`p-2.5 rounded-lg cursor-pointer transition-all border ${isEntregaSelected
                                ? 'bg-primary/5 border-primary/40 shadow-sm'
                                : 'bg-muted/30 border-transparent hover:bg-muted/60 hover:border-muted'
                                }`}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleEntregaSelect(e.id);
                              }}
                            >
                              {/* Header: Código + Status */}
                              <div className="flex items-center justify-between mb-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0.5 font-mono ${isEntregaSelected ? 'border-primary text-primary bg-primary/5' : ''
                                    }`}
                                >
                                  {e.codigo}
                                </Badge>
                                {statusInfo && (
                                  <Badge
                                    variant="secondary"
                                    className={`text-[9px] px-1.5 py-0 gap-1 ${statusInfo.color}`}
                                  >
                                    <StatusIcon className="w-2.5 h-2.5" />
                                    {statusInfo.label}
                                  </Badge>
                                )}
                              </div>

                              {/* Rota */}
                              <div className="flex items-center gap-1.5 text-xs text-foreground">
                <MapPin className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0" />
                                <span className="truncate">{e.carga.endereco_origem?.cidade}/{e.carga.endereco_origem?.estado}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <MapPin className="w-3 h-3 text-red-500 dark:text-red-400 shrink-0" />
                                <span className="truncate">{e.carga.endereco_destino?.cidade}/{e.carga.endereco_destino?.estado}</span>
                              </div>

                              {/* Info adicional: Peso + Valor */}
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                {e.peso_alocado_kg && (
                                  <span className="flex items-center gap-1">
                                    <Weight className="w-3 h-3" />
                                    {e.peso_alocado_kg.toLocaleString('pt-BR')} kg
                                  </span>
                                )}
                                {e.valor_frete && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    R$ {e.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                                {e.carga.descricao && (
                                  <span className="flex items-center gap-1 truncate flex-1">
                                    <Package className="w-3 h-3" />
                                    {e.carga.descricao.slice(0, 30)}{e.carga.descricao.length > 30 ? '...' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

// Wrapper com Dialog
function GestaoEntregasDialog({
  open,
  onOpenChange,
  entregas,
  localizacoes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregas: Entrega[];
  localizacoes: Array<{ motorista_id: string; latitude: number | null; longitude: number | null; heading?: number | null; isOnline?: boolean; updated_at?: string | null }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0">
        <GestaoEntregasDialogContent entregas={entregas} localizacoes={localizacoes} />
      </DialogContent>
    </Dialog>
  );
}

// Viagem type for the viagens view
interface ViagemWithEntregas {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  updated_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
  manifesto_url: string | null;
  motorista_id: string;
  motorista: {
    id: string;
    nome_completo: string;
    foto_url: string | null;
  } | null;
  veiculo: {
    placa: string;
    modelo: string | null;
  } | null;
  entregas: Array<{
    id: string;
    codigo: string;
    status: string;
    peso_alocado_kg: number | null;
    valor_frete: number | null;
    notas_fiscais_urls: string[] | null;
    cte_url: string | null;
    canhoto_url: string | null;
    carga: {
      descricao: string;
      endereco_origem: { cidade: string; estado: string } | null;
      endereco_destino: { cidade: string; estado: string } | null;
    };
  }>;
}

// Main component
export default function OperacaoDiaria() {
  const { empresa } = useUserContext();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('viagens');
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [selectedViagem, setSelectedViagem] = useState<ViagemWithEntregas | null>(null);
  const [selectedEntregaInViagem, setSelectedEntregaInViagem] = useState<Entrega | null>(null); // Stack navigation for viagem view
  const [motoristaIds, setMotoristaIds] = useState<string[]>([]);
  const [gestaoDialogOpen, setGestaoDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({});

  // Fetch today's deliveries (by created_at) OR pending from previous days
  const { data: entregas = [], isLoading, refetch } = useQuery({
    queryKey: ['operacao-diaria', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();

      // First get motoristas for this empresa
      const { data: motoristas } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (!motoristas || motoristas.length === 0) {
        console.log('No motoristas found for empresa:', empresa.id);
        return [];
      }

      const motoristaIdsList = motoristas.map(m => m.id);

      // Fetch deliveries - usando apenas os status válidos
      const pendingStatuses = ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id, codigo, status, created_at, updated_at,
          motorista_id, veiculo_id, carroceria_id,
          peso_alocado_kg, valor_frete, coletado_em, entregue_em,
          cte_url, numero_cte, notas_fiscais_urls, manifesto_url, canhoto_url,
          motorista:motoristas(id, nome_completo, telefone, foto_url),
          veiculo:veiculos(id, placa, modelo, tipo),
          carga:cargas!inner(
            id, codigo, descricao, peso_kg, tipo, quantidade,
            remetente_razao_social, remetente_nome_fantasia,
            destinatario_razao_social, destinatario_nome_fantasia,
            data_coleta_de, data_entrega_limite,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, numero, bairro, cep, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, numero, bairro, cep, latitude, longitude),
            empresa:empresas(id, nome)
          )
        `)
        .in('motorista_id', motoristaIdsList)
        .not('status', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching entregas:', error);
        throw error;
      }

      // Filter: active items ALWAYS show (regardless of date), terminal items only if finalized today
      const finalizedStatuses = ['entregue', 'cancelada'];
      const filtered = (data || []).filter(e => {
        const isActive = pendingStatuses.includes(e.status);
        if (isActive) return true; // always show active deliveries
        const updatedToday = new Date(e.updated_at) >= new Date(startOfToday);
        return finalizedStatuses.includes(e.status) && updatedToday;
      });

      // Fetch eventos for each entrega
      const entregasWithEvents = await Promise.all(
        filtered.map(async (entrega) => {
          const { data: eventos } = await supabase
            .from('entrega_eventos')
            .select('id, tipo, timestamp, observacao, user_nome')
            .eq('entrega_id', entrega.id)
            .order('timestamp', { ascending: true })
            .limit(10);

          return { ...entrega, eventos: eventos || [] };
        })
      );

      return entregasWithEvents as Entrega[];
    },
    enabled: !!empresa?.id,
    refetchInterval: 30000,
  });

  // Fetch viagens when in viagens view mode
  const { data: viagens = [], isLoading: isLoadingViagens, refetch: refetchViagens } = useQuery({
    queryKey: ['gestao-viagens', empresa?.id],
    queryFn: async (): Promise<ViagemWithEntregas[]> => {
      if (!empresa?.id) return [];

      // First get motoristas for this empresa
      const { data: motoristas } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (!motoristas || motoristas.length === 0) return [];

      const motoristaIdsList = motoristas.map(m => m.id);

      // Fetch viagens em andamento
      const { data: viagensData, error: viagensError } = await supabase
        .from('viagens')
        .select(`
          id, codigo, status, created_at, updated_at, started_at, ended_at, manifesto_url, motorista_id,
          motorista:motoristas(id, nome_completo, foto_url),
          veiculo:veiculos(placa, modelo)
        `)
        .in('motorista_id', motoristaIdsList)
        .in('status', ['programada', 'aguardando', 'em_andamento', 'finalizada', 'cancelada'])
        .order('created_at', { ascending: false });

      if (viagensError) throw viagensError;

      // Fetch entregas for each viagem via viagem_entregas
      const viagensWithEntregas = await Promise.all(
        (viagensData || []).map(async (viagem) => {
          const { data: viagemEntregas } = await supabase
            .from('viagem_entregas')
            .select(`
              entrega:entregas(
                id, codigo, status, peso_alocado_kg, valor_frete, created_at, updated_at,
                notas_fiscais_urls, cte_url, canhoto_url,
                carga:cargas(
                  descricao,
                  endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, latitude, longitude),
                  endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, latitude, longitude)
                ),
                eventos:entrega_eventos(id, tipo, timestamp, observacao, user_nome)
              )
            `)
            .eq('viagem_id', viagem.id)
            .order('ordem', { ascending: true });

          const entregas = (viagemEntregas || [])
            .map(ve => ve.entrega)
            .filter(Boolean)
            .map(e => ({
              ...e,
              carga: {
                ...e.carga,
                endereco_origem: e.carga.endereco_origem,
                endereco_destino: e.carga.endereco_destino,
              },
              eventos: e.eventos || [],
            }));

          return {
            ...viagem,
            motorista: viagem.motorista,
            veiculo: viagem.veiculo,
            entregas,
          };
        })
      );

      // Filter: active viagens always show, terminal viagens only if finalized today
      const today = new Date();
      const startOfTodayViagem = startOfDay(today).toISOString();
      const activeViagemStatuses = ['programada', 'aguardando', 'em_andamento'];
      const terminalViagemStatuses = ['finalizada', 'cancelada'];
      
      return viagensWithEntregas.filter(v => {
        if (v.entregas.length === 0) return false;
        if (activeViagemStatuses.includes(v.status)) return true;
        if (terminalViagemStatuses.includes(v.status)) {
          // Show terminal viagens only if they were updated today
          const viagemUpdatedToday = v.updated_at && new Date(v.updated_at) >= new Date(startOfTodayViagem);
          return !!viagemUpdatedToday;
        }
        return false;
      }) as ViagemWithEntregas[];
    },
    enabled: viewMode === 'viagens' && !!empresa?.id,
    refetchInterval: 30000,
  });

  const motoristaGroups = useMemo(() => {
    const groups: Record<string, { motorista: Entrega['motorista']; entregas: Entrega[] }> = {};

    entregas.forEach(e => {
      if (!e.motorista_id || !e.motorista) return;
      if (!groups[e.motorista_id]) {
        groups[e.motorista_id] = { motorista: e.motorista, entregas: [] };
      }
      groups[e.motorista_id].entregas.push(e);
    });

    return Object.entries(groups).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [entregas]);

  const motoristasList = useMemo(() =>
    motoristaGroups.map(g => ({ id: g.id, nome: g.motorista?.nome_completo || '' })),
    [motoristaGroups]
  );

  const { localizacoes } = useRealtimeLocalizacoes({
    motoristaIds,
    enabled: motoristaIds.length > 0
  });

  // Update motorista IDs when entregas change
  useEffect(() => {
    const ids = entregas
      .map(e => e.motorista_id)
      .filter((id): id is string => id !== null);
    setMotoristaIds([...new Set(ids)]);
  }, [entregas]);

  // Atualizar selectedEntrega quando os dados mudarem
  useEffect(() => {
    if (selectedEntrega) {
      const updated = entregas.find(e => e.id === selectedEntrega.id);
      if (updated) {
        setSelectedEntrega(updated);
      }
    }
  }, [entregas]);

  const statusMutation = useMutation({
    mutationFn: async ({ entregaId, newStatus }: { entregaId: string; newStatus: string }) => {
      const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };

      if (newStatus === 'entregue') {
        updates.entregue_em = new Date().toISOString();
      } else if (newStatus === 'saiu_para_coleta') {
        updates.coletado_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('entregas')
        .update(updates)
        .eq('id', entregaId);

      if (error) throw error;

      // Mapear status para tipos de evento válidos na constraint do DB
      const statusToEventoTipo: Record<string, string> = {
        aguardando: 'aceite',
        saiu_para_coleta: 'inicio_coleta',
        saiu_para_entrega: 'inicio_rota',
        entregue: 'finalizado',
        cancelada: 'cancelado',
      };

      const eventoTipo = statusToEventoTipo[newStatus] || 'aceite';

      // Registrar evento com auditoria (user_id e user_nome)
      const { error: eventoError } = await supabase.from('entrega_eventos').insert({
        entrega_id: entregaId,
        tipo: eventoTipo,
        timestamp: new Date().toISOString(),
        observacao: `Status alterado para ${statusConfig[newStatus]?.label || newStatus}`,
        user_id: user?.id ?? null,
        user_nome: profile?.nome_completo || user?.email || 'Sistema',
      });

      if (eventoError) {
        console.error('Erro ao registrar evento:', eventoError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacao-diaria'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status');
      console.error(error);
    },
  });

  // Mutation para iniciar viagem (programada -> aguardando)
  const iniciarViagemMutation = useMutation({
    mutationFn: async (viagemId: string) => {
      const { error } = await supabase
        .from('viagens')
        .update({ 
          status: 'aguardando', 
          inicio_em: new Date().toISOString(),
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', viagemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-viagens'] });
      refetchViagens();
    },
    onError: (error) => {
      console.error('Erro ao iniciar viagem:', error);
      throw error;
    },
  });

  // Mutation para finalizar viagem
  const finalizarViagemMutation = useMutation({
    mutationFn: async (viagemId: string) => {
      const { error } = await supabase
        .from('viagens')
        .update({ 
          status: 'finalizada', 
          fim_em: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', viagemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-viagens'] });
      setSelectedViagem(null);
    },
    onError: (error) => {
      console.error('Erro ao finalizar viagem:', error);
      throw error;
    },
  });

  // Mutation para cancelar viagem (cancela todas as entregas dentro e libera peso)
  const cancelarViagemMutation = useMutation({
    mutationFn: async (viagemId: string) => {
      // 1. Buscar entregas ativas da viagem (não já canceladas/entregues)
      const { data: viagemEntregas, error: fetchError } = await supabase
        .from('viagem_entregas')
        .select('entrega_id')
        .eq('viagem_id', viagemId);

      if (fetchError) throw fetchError;

      const entregaIds = (viagemEntregas || []).map(ve => ve.entrega_id);

      if (entregaIds.length > 0) {
        // 2. Cancelar todas as entregas que não estão finalizadas
        // O trigger do banco (trigger_release_weight_on_entrega_cancel) 
        // libera automaticamente o peso na carga
        const { error: entregasError } = await supabase
          .from('entregas')
          .update({ 
            status: 'cancelada', 
            updated_at: new Date().toISOString() 
          })
          .in('id', entregaIds)
          .not('status', 'in', '("entregue","cancelada")');

        if (entregasError) throw entregasError;
      }

      // 3. Cancelar a viagem
      const { error } = await supabase
        .from('viagens')
        .update({ 
          status: 'cancelada', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', viagemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-viagens'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-entregas'] });
      setSelectedViagem(null);
    },
    onError: (error) => {
      console.error('Erro ao cancelar viagem:', error);
      throw error;
    },
  });

  // Separar entregas por status para as colunas
  // Coluna 1: APENAS 'aguardando'
  // Coluna 2: 'saiu_para_coleta', 'saiu_para_entrega', 'entregue', 'cancelada'
  const { aguardandoEntregas, emRotaEntregas, filteredEntregas } = useMemo(() => {
    // Aplicar filtros avançados
    let filtered = entregas;

    if (filters.codigo) {
      const term = filters.codigo.toLowerCase();
      filtered = filtered.filter(e =>
        e.codigo?.toLowerCase().includes(term) ||
        e.carga.codigo?.toLowerCase().includes(term)
      );
    }

    if (filters.motorista) {
      const term = filters.motorista.toLowerCase();
      filtered = filtered.filter(e =>
        e.motorista?.nome_completo?.toLowerCase().includes(term)
      );
    }

    if (filters.cidadeOrigem) {
      const term = filters.cidadeOrigem.toLowerCase();
      filtered = filtered.filter(e =>
        e.carga.endereco_origem?.cidade?.toLowerCase().includes(term)
      );
    }

    if (filters.cidadeDestino) {
      const term = filters.cidadeDestino.toLowerCase();
      filtered = filtered.filter(e =>
        e.carga.endereco_destino?.cidade?.toLowerCase().includes(term)
      );
    }

    if (filters.destinatario) {
      const term = filters.destinatario.toLowerCase();
      filtered = filtered.filter(e =>
        e.carga.destinatario_nome_fantasia?.toLowerCase().includes(term) ||
        e.carga.destinatario_razao_social?.toLowerCase().includes(term)
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(e =>
        new Date(e.created_at) >= filters.dateFrom!
      );
    }

    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e =>
        new Date(e.created_at) <= endOfDay
      );
    }

    const ativas = filtered.filter(e => ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'].includes(e.status));
    const finalizadas = filtered.filter(e => ['entregue', 'cancelada'].includes(e.status));
    return { aguardandoEntregas: ativas, emRotaEntregas: finalizadas, filteredEntregas: filtered };
  }, [entregas, filters]);

  // Get driver location for selected delivery (includes heading and online status)
  const driverLocation = useMemo(() => {
    if (!selectedEntrega?.motorista_id) return null;
    const loc = localizacoes.find(l => l.motorista_id === selectedEntrega.motorista_id);
    if (loc?.latitude && loc?.longitude) {
      return {
        lat: loc.latitude,
        lng: loc.longitude,
        heading: loc.heading,
        isOnline: loc.isOnline,
      };
    }
    return null;
  }, [selectedEntrega, localizacoes]);

  const handleStatusChange = (newStatus: string) => {
    // In viagem view, the active entrega is selectedEntregaInViagem
    const activeEntrega = selectedEntregaInViagem || selectedEntrega;
    if (activeEntrega) {
      statusMutation.mutate({ entregaId: activeEntrega.id, newStatus });
      if (selectedEntregaInViagem) {
        setSelectedEntregaInViagem(prev => prev ? { ...prev, status: newStatus } : null);
        // Also refetch viagens to update the viagem's entrega statuses
        refetchViagens();
      } else {
        setSelectedEntrega(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh)' }}>
      <div className="flex items-center justify-between p-4 !pb-0 md:p-8 ">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Gestão de Entregas</h1>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="w-5 h-5 rounded-full mt-1 ml-1 bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-sm p-3">
                  <p className="font-medium mb-1">Central de Operações Diárias</p>
                  <ul className='list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed'>
                    <li>
                      Acompanhe em tempo real todas as entregas do dia.
                    </li>
                    <li>
                      As entregas finalizadas (entregues ou canceladas) permanecem visíveis até o fim do dia, quando são
                      automaticamente movidas para o Histórico de Entregas.
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">Visualize sua operação diária</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Switch de Visualização */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <Label htmlFor="view-mode-switch" className={`text-sm font-medium transition-colors ${viewMode === 'entregas' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Entregas
            </Label>
            <Switch
              id="view-mode-switch"
              checked={viewMode === 'viagens'}
              onCheckedChange={(checked) => {
                setViewMode(checked ? 'viagens' : 'entregas');
                setSelectedEntrega(null);
                setSelectedViagem(null);
                setSelectedEntregaInViagem(null);
              }}
            />
            <Label htmlFor="view-mode-switch" className={`text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'viagens' ? 'text-foreground' : 'text-muted-foreground'}`}>
              <Route className="w-3.5 h-3.5" />
              Viagens
            </Label>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => viewMode === 'viagens' ? refetchViagens() : refetch()}>
            <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingViagens) ? 'animate-spin' : ''}`} />
          </Button>
          <AdvancedFiltersPopover
            filters={filters}
            onFiltersChange={setFilters}
            showMotorista
            showEmbarcador={false}
            showDestinatario
            motoristas={motoristasList}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setPerformanceDialogOpen(true)}
          >
            <BarChart3 className="w-4 h-4" />
            Desempenho Diário
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => setGestaoDialogOpen(true)}
          >
            <Map className="w-4 h-4" />
            Visualização Geral em Mapa
          </Button>
        </div>
      </div>

      {/* Main content - 3 columns: 30% 30% 40% */}
      <div className="flex-1 grid overflow-hidden p-4 !pt-4 md:p-8" style={{ gridTemplateColumns: '30% 30% 40%' }}>
        {viewMode === 'entregas' ? (
          <>
            {/* Column 1: Entregas Ativas (30%) */}
            <div className="border rounded-l-md bg-muted/20 shadow-sm flex flex-col min-w-0 overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">Ativas ({aguardandoEntregas.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : aguardandoEntregas.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyColumnPlaceholder message="Entregas ativas aparecerão aqui" />
                  </div>
                ) : (
                  aguardandoEntregas.map((entrega) => (
                    <EntregaListItem
                      key={entrega.id}
                      entrega={entrega}
                      isSelected={selectedEntrega?.id === entrega.id}
                      onClick={() => setSelectedEntrega(entrega)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Entregas Finalizadas (30%) */}
            <div className="border border-l-0 flex flex-col bg-background shadow-sm min-w-0 overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">Finalizadas ({emRotaEntregas.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : emRotaEntregas.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyColumnPlaceholder message="Entregas finalizadas aparecerão aqui" />
                  </div>
                ) : (
                  emRotaEntregas.map((entrega) => (
                    <EntregaListItem
                      key={entrega.id}
                      entrega={entrega}
                      isSelected={selectedEntrega?.id === entrega.id}
                      onClick={() => setSelectedEntrega(entrega)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Detail Panel (40%) */}
            <div className="min-w-0 border border-l-0 rounded-r-md overflow-hidden flex flex-col shadow-sm">
              <DetailPanel
                entrega={selectedEntrega}
                onClose={() => setSelectedEntrega(null)}
                onStatusChange={handleStatusChange}
                isChangingStatus={statusMutation.isPending}
                driverLocation={driverLocation}
                onRefresh={handleRefresh}
              />
            </div>
          </>
        ) : (
          <>
            {/* VIAGENS VIEW */}
            {/* Column 1: Viagens Programadas + Em Andamento */}
            <div className="border rounded-l-md bg-muted/20 shadow-sm flex flex-col min-w-0 overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">
                  Ativas ({viagens.filter(v => ['programada', 'aguardando', 'em_andamento'].includes(v.status)).length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoadingViagens ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : viagens.filter(v => ['programada', 'aguardando', 'em_andamento'].includes(v.status)).length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyColumnPlaceholder message="Viagens ativas aparecerão aqui" />
                  </div>
                ) : (
                  viagens.filter(v => ['programada', 'aguardando', 'em_andamento'].includes(v.status)).map((viagem) => (
                    <ViagemListItem
                      key={viagem.id}
                      viagem={{
                        ...viagem,
                        entregas: viagem.entregas.map(e => ({
                          id: e.id,
                          codigo: e.codigo,
                          status: e.status,
                          origemCidade: e.carga.endereco_origem?.cidade,
                          destinoCidade: e.carga.endereco_destino?.cidade,
                        })),
                      }}
                      isSelected={selectedViagem?.id === viagem.id}
                      onClick={() => {
                        setSelectedViagem(viagem);
                        setSelectedEntregaInViagem(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Viagens Finalizadas */}
            <div className="border border-l-0 flex flex-col bg-background shadow-sm min-w-0 overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">Finalizadas ({viagens.filter(v => v.status === 'finalizada' || v.status === 'cancelada').length})</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoadingViagens ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : viagens.filter(v => v.status === 'finalizada' || v.status === 'cancelada').length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyColumnPlaceholder message="Viagens finalizadas aparecerão aqui" />
                  </div>
                ) : (
                  viagens.filter(v => v.status === 'finalizada' || v.status === 'cancelada').map((viagem) => (
                    <ViagemListItem
                      key={viagem.id}
                      viagem={{
                        ...viagem,
                        entregas: viagem.entregas.map(e => ({
                          id: e.id,
                          codigo: e.codigo,
                          status: e.status,
                          origemCidade: e.carga.endereco_origem?.cidade,
                          destinoCidade: e.carga.endereco_destino?.cidade,
                        })),
                      }}
                      isSelected={selectedViagem?.id === viagem.id}
                      onClick={() => {
                        setSelectedViagem(viagem);
                        setSelectedEntregaInViagem(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Detail Panel with Stack Navigation */}
            <div className="min-w-0 border border-l-0 rounded-r-md overflow-hidden flex flex-col shadow-sm">
              {selectedEntregaInViagem ? (
                /* Mostrar DetailPanel da entrega com botão voltar */
                <DetailPanel
                  entrega={selectedEntregaInViagem}
                  onClose={() => setSelectedEntregaInViagem(null)}
                  onStatusChange={handleStatusChange}
                  isChangingStatus={statusMutation.isPending}
                  driverLocation={driverLocation}
                  onRefresh={handleRefresh}
                  showBackButton
                  onBack={() => setSelectedEntregaInViagem(null)}
                  viagemStatus={selectedViagem?.status}
                />
              ) : (
                /* Mostrar ViagemDetailPanel */
                <ViagemDetailPanel
                  viagem={selectedViagem}
                  onClose={() => setSelectedViagem(null)}
                  onSelectEntrega={(entregaId) => {
                    const entrega = entregas.find(e => e.id === entregaId);
                    if (entrega) {
                      setSelectedEntregaInViagem(entrega);
                    }
                  }}
                  onRefresh={() => refetchViagens()}
                  driverLocation={selectedViagem?.motorista_id ? (() => {
                    const loc = localizacoes.find(l => l.motorista_id === selectedViagem.motorista_id);
                    return loc?.latitude && loc?.longitude ? { lat: loc.latitude, lng: loc.longitude, heading: loc.heading, isOnline: loc.isOnline, updated_at: (loc as any)?.updated_at } : null;
                  })() : null}
                  onStart={async (viagemId) => {
                    await iniciarViagemMutation.mutateAsync(viagemId);
                  }}
                  onFinalize={async (viagemId) => {
                    await finalizarViagemMutation.mutateAsync(viagemId);
                  }}
                  onCancel={async (viagemId) => {
                    await cancelarViagemMutation.mutateAsync(viagemId);
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Gestão de Entregas Dialog com Mapa + Motoristas */}
      <GestaoEntregasDialog
        open={gestaoDialogOpen}
        onOpenChange={setGestaoDialogOpen}
        entregas={entregas}
        localizacoes={localizacoes}
      />

      {/* Daily Performance Dialog */}
      <DailyPerformanceDialog
        open={performanceDialogOpen}
        onOpenChange={setPerformanceDialogOpen}
        entregas={filteredEntregas}
      />
    </div>
  );
}
