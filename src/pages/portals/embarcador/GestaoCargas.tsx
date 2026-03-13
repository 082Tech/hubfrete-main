import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { formatWeight } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { toast } from 'sonner';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowRightLeft,
  MessageCircle,
  RefreshCw,
  History,
  Share,
  Printer,
  X,
  ArrowUpRight,
  FileText,
  FileCode,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  Upload,
  Download,
  Eye,
  Weight,
  Map,
  Search,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdvancedFiltersPopover, AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { EntregaDocumentosPanel } from '@/components/entregas/EntregaDocumentosPanel';
import { DetailPanelLeafletMap } from '@/components/maps/DetailPanelLeafletMap';
import { GestaoLeafletMap } from '@/components/maps/GestaoLeafletMap';
import { ChatSheet } from '@/components/mensagens/ChatSheet';
import { EmbarcadorDailyPerformanceDialog } from '@/components/admin/relatorios/EmbarcadorDailyPerformanceDialog';
import { BarChart3 } from 'lucide-react';

// Status config - matching transportadora portal
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800', icon: Clock },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800', icon: Truck },
  em_transito: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800', icon: ArrowRightLeft },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', icon: MapPin },
  entregue: { label: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', icon: XCircle },
};

interface EntregaEvento {
  id: string;
  tipo: string;
  timestamp: string;
  observacao: string | null;
  user_nome: string | null;
}

interface Entrega {
  id: string;
  codigo: string;
  tracking_code?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  motorista_id: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  coletado_em: string | null;
  entregue_em: string | null;
  canhoto_url: string | null;
  outros_documentos: any[] | null;
  nfe_count?: number; // populated after batch fetch
  motorista?: { id: string; nome_completo: string; telefone: string | null; foto_url: string | null } | null;
  veiculo?: { id: string; placa: string; modelo: string | null; tipo: string } | null;
  eventos?: EntregaEvento[];
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    tipo: string;
    remetente_razao_social: string | null;
    remetente_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    destinatario_nome_fantasia: string | null;
    data_coleta_de: string | null;
    data_entrega_limite: string | null;
    endereco_origem?: { cidade: string; estado: string; logradouro: string; numero: string | null; bairro: string | null; cep: string; latitude: number | null; longitude: number | null } | null;
    endereco_destino?: { cidade: string; estado: string; logradouro: string; numero: string | null; bairro: string | null; cep: string; latitude: number | null; longitude: number | null } | null;
    empresa?: { id: number; nome: string | null; comissao_hubfrete_percent?: number | null } | null;
  };
}

// --- List item for columns ---
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
    locale: ptBR,
  });
  const remetenteNome = entrega.carga.remetente_nome_fantasia || entrega.carga.remetente_razao_social || 'Remetente';
  const destinatarioNome = entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || 'Destinatário';

  // NF-e pending: check from batch-fetched count
  const nfePending = (entrega.nfe_count ?? -1) === 0 && entrega.status !== 'entregue' && entrega.status !== 'cancelada';

  return (
    <div
      className={`bg-card px-4 py-3 cursor-pointer transition-all hover:bg-muted/50 border-b ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
      onClick={onClick}
    >
      {/* Linha 1: Código da entrega (CRG-X-EX) + badge de status */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold text-sm font-mono">{entrega.codigo || entrega.id.slice(0, 4)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{tempoDecorrido}</span>
          <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
        </div>
      </div>

      {/* Linha 2: Rota */}
      <div className="flex items-center gap-1 text-sm mb-1">
        <span className="truncate font-medium">{entrega.carga.endereco_origem?.cidade || 'N/A'}</span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="truncate font-medium">{entrega.carga.endereco_destino?.cidade || 'N/A'}</span>
      </div>

      {/* Linha 3: Remetente / Destinatário */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mb-1">
        <span className="flex items-center gap-1 truncate max-w-[120px]" title={remetenteNome}>
          <Upload className="w-3 h-3 shrink-0" />
          {remetenteNome}
        </span>
        <span className="flex items-center gap-1 truncate max-w-[120px]" title={destinatarioNome}>
          <Download className="w-3 h-3 shrink-0" />
          {destinatarioNome}
        </span>
      </div>

      {/* Linha 4: Descrição + peso */}
      <p className="text-xs text-muted-foreground truncate mb-1.5">
        {entrega.carga.descricao} • {entrega.peso_alocado_kg ? `${formatWeight(entrega.peso_alocado_kg)} / ` : ''}{formatWeight(entrega.carga.peso_kg)}
      </p>

      {/* Rodapé: Motorista + frete + alerta NF-e */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            {entrega.motorista?.foto_url && <AvatarImage src={entrega.motorista.foto_url} />}
            <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
              {entrega.motorista?.nome_completo?.[0] || <Truck className="w-3 h-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
            {entrega.motorista?.nome_completo || 'Sem motorista'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {entrega.valor_frete && (
            <span className="text-primary font-semibold">
              R$ {entrega.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {nfePending && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-400 gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              NF-e
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Empty column placeholder ---
function EmptyColumnPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground px-8 py-12 h-full min-h-[200px]">
      <Package className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

// --- Detail panel (right side - embarcador: can attach NF-e, view CT-e/Canhoto) ---
function DetailPanel({
  entrega,
  onClose,
  driverLocation,
  onRefresh,
  onExpandMap,
}: {
  entrega: Entrega | null;
  onClose: () => void;
  driverLocation: { lat: number; lng: number; heading?: number | null; isOnline?: boolean } | null;
  onRefresh: () => void;
  onExpandMap?: () => void;
}) {
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('');
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleShareTracking = async () => {
    const trackCode = entrega?.tracking_code || entrega?.codigo;
    if (!trackCode) {
      toast.error('Código de rastreio não disponível para esta carga.');
      return;
    }
    try {
      // The public tracking route is /rastreio
      const url = `${window.location.origin}/rastreio?codigo=${trackCode}`;
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success('Link de rastreio copiado para a área de transferência!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar o link.');
      console.error('Copy tracking link error:', err);
    }
  };

  const handleNativeShare = async () => {
    const trackCode = entrega?.tracking_code || entrega?.codigo;
    if (!trackCode) {
      toast.error('Código de rastreio não disponível para esta carga.');
      return;
    }
    try {
      const url = `${window.location.origin}/rastreio?codigo=${trackCode}`;
      if (navigator.share) {
        await navigator.share({
          title: `Rastreio da Carga ${entrega.codigo || ''}`,
          text: `Acompanhe em tempo real a carga ${entrega.codigo || ''}`,
          url: url,
        });
      } else {
        toast.error('Seu navegador não suporta compartilhamento nativo.');
      }
    } catch (err) {
      console.error('Native share error:', err);
    }
  };

  // ── Documentos (via documentHelpers — mesmo padrão da transportadora) ────────
  const [existingCtes, setExistingCtes] = useState<any[]>([]);
  const [unlinkedNfes, setUnlinkedNfes] = useState<any[]>([]);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);

  const refreshDocs = useCallback(() => {
    setDocsRefreshKey(k => k + 1);
    onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    if (entrega?.id) {
      import('@/lib/documentHelpers').then(({ fetchCtesForEntregas, fetchNfesForEntrega }) => {
        fetchCtesForEntregas([entrega.id]).then((map) => {
          setExistingCtes(map[entrega.id] || []);
        });
        fetchNfesForEntrega(entrega.id).then((nfes) => {
          setUnlinkedNfes(nfes.filter(nf => !(nf as any).cte_id));
        });
      });
    } else {
      setExistingCtes([]);
      setUnlinkedNfes([]);
    }
  }, [entrega?.id, docsRefreshKey]);

  if (!entrega) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyColumnPlaceholder message="Selecione uma carga para ver os detalhes" />
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

  const remetenteNome = entrega.carga.remetente_nome_fantasia || entrega.carga.remetente_razao_social;
  const destinatarioNome = entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social;

  // Docs count
  const allNfes = [...existingCtes.flatMap((c: any) => c.nfes || []), ...unlinkedNfes];
  const docsCount = (entrega.canhoto_url ? 1 : 0) + existingCtes.length + allNfes.length;

  const nfePending = allNfes.length === 0 && entrega.status !== 'entregue' && entrega.status !== 'cancelada';

  const handleDocClick = (url: string | null, title: string) => {
    if (url) {
      setPreviewDocUrl(url);
      setPreviewDocTitle(title);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <Badge variant="outline" className="font-mono font-bold text-sm px-2 border-primary text-primary bg-primary/5">
              {entrega.carga.codigo}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Botão de Copiar Link */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleShareTracking}
                  >
                    {isCopied ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <LinkIcon className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copiar link de rastreio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botão de Compartilhar Nativo */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleNativeShare}
                  >
                    <Share className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Compartilhar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowUpRight className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Printer className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {/* Carga description + entrega ref */}
        <p className="text-sm font-medium mb-1">{entrega.carga.descricao}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
          <span>Carga #{entrega.codigo || entrega.id.slice(0, 6)}</span>
          <span>•</span>
          <span>{format(new Date(entrega.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
        </div>

        {/* Status banner */}
        <div className={`rounded-md px-3 py-1.5 text-center text-sm ${statusInfo.color}`}>
          <span className="font-semibold flex items-center justify-center gap-2">
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label} há {formatDistanceToNow(new Date(entrega.updated_at), { locale: ptBR })}
          </span>
        </div>

        {/* NF-e Alert */}
        {nfePending && (
          <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">NF-e pendente</p>
              <p className="text-amber-700 dark:text-amber-400">O motorista não pode sair para entrega sem a Nota Fiscal anexada.</p>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Chat Button */}
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setChatSheetOpen(true)}>
            <MessageCircle className="w-4 h-4" />
            Abrir Chat da Carga
          </Button>

          {/* Publicado por */}
          {entrega.carga.empresa && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              Publicado por: <span className="font-medium text-foreground">{entrega.carga.empresa.nome}</span>
            </div>
          )}

          {/* Map */}
          <DetailPanelLeafletMap
            key={entrega.id}
            origemCoords={origemCoords}
            destinoCoords={destinoCoords}
            driverLocation={driverLocation}
            status={entrega.status}
            height={300}
            entregaId={entrega.id}
            onExpandClick={onExpandMap || undefined}
          />

          {/* Specs line below map */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Weight className="w-3 h-3" />
              {entrega.peso_alocado_kg ? `${formatWeight(entrega.peso_alocado_kg)} / ` : ''}
              {formatWeight(entrega.carga.peso_kg)}
              <span className="ml-1">• Tipo: {entrega.carga.tipo}</span>
            </span>
            {entrega.valor_frete && (
              <span className="font-semibold text-foreground">
                Valor do frete: R$ {entrega.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
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
                    {entrega.carga.endereco_origem.cidade}/{entrega.carga.endereco_origem.estado}
                  </p>
                </>
              )}
              {entrega.carga.data_coleta_de && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Coleta: {format(new Date(entrega.carga.data_coleta_de), 'dd/MM/yyyy', { locale: ptBR })}
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
                    {entrega.carga.endereco_destino.cidade}/{entrega.carga.endereco_destino.estado}
                  </p>
                </>
              )}
              {entrega.carga.data_entrega_limite && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Prazo: {format(new Date(entrega.carga.data_entrega_limite), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Datas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/30 rounded-md p-2">
              <p className="text-muted-foreground">Data Coleta</p>
              <p className="font-medium">
                {entrega.coletado_em
                  ? format(new Date(entrega.coletado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                  : 'Pendente'}
              </p>
            </div>
            <div className="bg-muted/30 rounded-md p-2">
              <p className="text-muted-foreground">Data Entrega</p>
              <p className="font-medium">
                {entrega.entregue_em
                  ? format(new Date(entrega.entregue_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                  : 'Pendente'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Documentos — mesmo padrão UI da transportadora */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Documentos</span>
              </div>
              <Badge variant={docsCount > 0 ? 'default' : 'secondary'} className={`text-[11px] px-2 py-0.5 ${docsCount >= 3 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                {docsCount} anexo{docsCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            <EntregaDocumentosPanel
              perfil="embarcador"
              entregaId={entrega.id}
              ctes={existingCtes}
              nfesDiretas={unlinkedNfes}
              canhotoUrl={entrega.canhoto_url || null}
              outrosDocumentos={entrega.outros_documentos || []}
              onRefresh={refreshDocs}
            />
          </div>

          <Separator />

          {/* Driver & Vehicle */}
          {entrega.motorista && (
            <Card className="shadow-none border">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      {entrega.motorista.foto_url && <AvatarImage src={entrega.motorista.foto_url} />}
                      <AvatarFallback className="text-xs">{entrega.motorista.nome_completo?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${driverLocation?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{entrega.motorista.nome_completo}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${driverLocation?.isOnline
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${driverLocation?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                        {driverLocation?.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {entrega.veiculo && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Truck className="w-3 h-3" />
                        <span>{entrega.veiculo.placa}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Button - Separate from driver */}
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setChatSheetOpen(true)}>
            <MessageCircle className="w-4 h-4" />
            Abrir Chat da Carga
          </Button>
          {/* History Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Histórico</span>
            </div>

            {entrega.eventos && entrega.eventos.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
                <div className="space-y-4">
                  {entrega.eventos.slice(0, 5).map((evento) => {
                    const tipoConfig: Record<string, { label: string; bgColor: string; isDocument?: boolean; isCreation?: boolean }> = {
                      criado: { label: 'Carga criada', bgColor: 'bg-gray-100 dark:bg-gray-900/30', isCreation: true },
                      aceite: { label: 'Aguardando', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
                      inicio_coleta: { label: 'Saiu para Coleta', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
                      inicio_rota: { label: 'Saiu para Entrega', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
                      finalizado: { label: 'Concluída', bgColor: 'bg-green-100 dark:bg-green-900/30' },
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

                    return (
                      <div key={evento.id} className="relative flex items-start gap-3">
                        <div className={`relative z-10 w-8 h-8 rounded-md ${config.bgColor} flex items-center justify-center shrink-0`}>
                          {isDocument ? (
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : isCreation ? (
                            <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ArrowRightLeft className={`w-4 h-4 ${evento.tipo === 'aceite' ? 'text-amber-600 dark:text-amber-400' :
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

      {/* Preview dialog */}
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
        userType="embarcador"
      />
    </div>
  );
}

// ==================== Map Dialog (simplified - no viagens, just motoristas) ====================
function GestaoMapDialogContent({
  entregas,
  localizacoes,
  initialSelectedEntregaId,
}: {
  entregas: Entrega[];
  localizacoes: Array<{ motorista_id: string; latitude: number | null; longitude: number | null; heading?: number | null; isOnline?: boolean; updated_at?: string | null }>;
  initialSelectedEntregaId?: string | null;
}) {
  const initialEntrega = initialSelectedEntregaId ? entregas.find(e => e.id === initialSelectedEntregaId) : null;
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<string | null>(initialEntrega?.motorista_id ?? null);
  const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(initialSelectedEntregaId ?? null);
  const [searchTerm, setSearchTerm] = useState('');

  // Group entregas by CARGA (not motorista)
  const cargaGroups = useMemo(() => {
    const groups: Record<string, { carga: Entrega['carga']; entregas: Entrega[] }> = {};
    entregas.forEach(e => {
      const cargaId = e.carga.id;
      if (!groups[cargaId]) {
        groups[cargaId] = { carga: e.carga, entregas: [] };
      }
      groups[cargaId].entregas.push(e);
    });
    return Object.values(groups);
  }, [entregas]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return cargaGroups;
    const term = searchTerm.toLowerCase();
    return cargaGroups.filter(g => {
      const codigo = g.carga.codigo?.toLowerCase() || '';
      const descricao = g.carga.descricao?.toLowerCase() || '';
      const remetente = (g.carga.remetente_nome_fantasia || g.carga.remetente_razao_social || '').toLowerCase();
      const destinatario = (g.carga.destinatario_nome_fantasia || g.carga.destinatario_razao_social || '').toLowerCase();
      const origemCidade = g.carga.endereco_origem?.cidade?.toLowerCase() || '';
      const destinoCidade = g.carga.endereco_destino?.cidade?.toLowerCase() || '';
      return codigo.includes(term) || descricao.includes(term) || remetente.includes(term) || destinatario.includes(term) || origemCidade.includes(term) || destinoCidade.includes(term);
    });
  }, [cargaGroups, searchTerm]);

  // Build motoristaNames & motoristaInfo from all entregas (still needed by the map component)
  const motoristaNames = useMemo(() => {
    const names: Record<string, string> = {};
    entregas.forEach(e => {
      if (e.motorista_id && e.motorista) names[e.motorista_id] = e.motorista.nome_completo;
    });
    return names;
  }, [entregas]);

  const motoristaInfo = useMemo(() => {
    const info: Record<string, { nome: string; entregas: Array<{ id: string; codigo: string; status: string; origemCidade: string; destinoCidade: string; origemCoords: { lat: number; lng: number } | null; destinoCoords: { lat: number; lng: number } | null }>; isOnline: boolean; lastSeenAt?: string | null }> = {};
    entregas.forEach(e => {
      if (!e.motorista_id || !e.motorista) return;
      if (!info[e.motorista_id]) {
        const loc = localizacoes.find(l => l.motorista_id === e.motorista_id);
        info[e.motorista_id] = { nome: e.motorista.nome_completo, entregas: [], isOnline: loc?.isOnline ?? false, lastSeenAt: (loc as any)?.updated_at ?? null };
      }
      info[e.motorista_id].entregas.push({
        id: e.id, codigo: e.codigo || e.id.slice(0, 6), status: e.status,
        origemCidade: e.carga.endereco_origem?.cidade || 'N/A', destinoCidade: e.carga.endereco_destino?.cidade || 'N/A',
        origemCoords: e.carga.endereco_origem?.latitude && e.carga.endereco_origem?.longitude ? { lat: e.carga.endereco_origem.latitude, lng: e.carga.endereco_origem.longitude } : null,
        destinoCoords: e.carga.endereco_destino?.latitude && e.carga.endereco_destino?.longitude ? { lat: e.carga.endereco_destino.latitude, lng: e.carga.endereco_destino.longitude } : null,
      });
    });
    return info;
  }, [entregas, localizacoes]);

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

  const selectedEntregaData = useMemo(() => {
    if (!selectedEntregaId) return null;
    const ent = entregas.find(e => e.id === selectedEntregaId);
    if (!ent) return null;
    return {
      id: ent.id, codigo: ent.codigo, status: ent.status,
      motoristaNome: ent.motorista?.nome_completo || 'Motorista',
      motoristaFoto: ent.motorista?.foto_url,
      carga: {
        descricao: ent.carga.descricao, peso: ent.carga.peso_kg, tipo: ent.carga.tipo,
        remetente: ent.carga.remetente_nome_fantasia || ent.carga.remetente_razao_social,
        destinatario: ent.carga.destinatario_nome_fantasia || ent.carga.destinatario_razao_social,
        origemCidade: ent.carga.endereco_origem?.cidade, origemEstado: ent.carga.endereco_origem?.estado,
        destinoCidade: ent.carga.endereco_destino?.cidade, destinoEstado: ent.carga.endereco_destino?.estado,
      },
      pesoAlocado: ent.peso_alocado_kg, valorFrete: ent.valor_frete,
    };
  }, [selectedEntregaId, entregas]);

  const handleMotoristaClick = useCallback((motoristaId: string) => {
    setSelectedMotoristaId(prev => {
      if (prev === motoristaId) { setSelectedEntregaId(null); return null; }
      return motoristaId;
    });
  }, []);

  const handleEntregaClick = useCallback((entrega: Entrega) => {
    setSelectedEntregaId(entrega.id);
    if (entrega.motorista_id) setSelectedMotoristaId(entrega.motorista_id);
  }, []);

  return (
    <>
      <DialogHeader className="px-4 py-3 border-b">
        <DialogTitle className="text-lg font-bold">Visualização Geral em Mapa</DialogTitle>
      </DialogHeader>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[7] relative">
          <GestaoLeafletMap
            localizacoes={localizacoes}
            selectedMotoristaId={selectedMotoristaId}
            selectedEntregaId={selectedEntregaId}
            onMotoristaClick={handleMotoristaClick}
            onEntregaDeselect={() => setSelectedEntregaId(null)}
            motoristaNames={motoristaNames}
            motoristaInfo={motoristaInfo}
            statusCounts={statusCounts}
            selectedEntregaData={selectedEntregaData}
          />
        </div>
        <div className="flex-[3] border-l flex flex-col bg-background">
          <div className="px-3 py-2 border-b bg-muted/30 space-y-2">
            <span className="text-sm font-medium">Cargas ({filteredGroups.length})</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar carga, cidade, remetente..."
                className="pl-8 h-8 text-xs bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredGroups.length === 0 ? (
              <EmptyColumnPlaceholder message="Nenhuma carga encontrada" />
            ) : (
              filteredGroups.map(group => {
                const isExpanded = group.entregas.some(e => selectedEntregaId === e.id);

                return (
                  <div
                    key={group.carga.id}
                    className={`px-3 py-2.5 border-b cursor-pointer transition-all hover:bg-muted/50 ${isExpanded ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    onClick={() => {
                      if (!isExpanded && group.entregas.length > 0) {
                        handleEntregaClick(group.entregas[0]);
                      }
                    }}
                  >
                    {/* Carga header */}
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-bold text-sm font-mono">{group.carga.codigo}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-auto">
                        {group.entregas.length} carga{group.entregas.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs mb-1 pl-6">
                      <MapPin className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="truncate">{group.carga.endereco_origem?.cidade || 'N/A'}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <MapPin className="w-3 h-3 text-red-500 dark:text-red-400 shrink-0" />
                      <span className="truncate">{group.carga.endereco_destino?.cidade || 'N/A'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate pl-6">{group.carga.descricao}</p>

                    {/* Entregas dentro da carga */}
                    <div className="mt-2 pl-6 space-y-2">
                      {group.entregas.map(e => {
                        const isEntregaSelected = selectedEntregaId === e.id;
                        const sInfo = statusConfig[e.status];
                        const SIcon = sInfo?.icon || Package;
                        return (
                          <div
                            key={e.id}
                            className={`p-2 rounded-lg cursor-pointer transition-all border ${isEntregaSelected ? 'bg-primary/5 border-primary/40 shadow-sm' : 'bg-muted/30 border-transparent hover:bg-muted/60'}`}
                            onClick={(ev) => { ev.stopPropagation(); handleEntregaClick(e); }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-mono ${isEntregaSelected ? 'border-primary text-primary bg-primary/5' : ''}`}>
                                {e.codigo}
                              </Badge>
                              {sInfo && (
                                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 gap-1 ${sInfo.color}`}>
                                  <SIcon className="w-2.5 h-2.5" />
                                  {sInfo.label}
                                </Badge>
                              )}
                            </div>
                            {/* Motorista as secondary info */}
                            {e.motorista && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Avatar className="h-4 w-4">
                                  {e.motorista.foto_url && <AvatarImage src={e.motorista.foto_url} />}
                                  <AvatarFallback className="text-[7px]">{e.motorista.nome_completo?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">{e.motorista.nome_completo}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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

function GestaoMapDialog({
  open, onOpenChange, entregas, localizacoes, initialSelectedEntregaId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregas: Entrega[];
  localizacoes: Array<{ motorista_id: string; latitude: number | null; longitude: number | null; heading?: number | null; isOnline?: boolean; updated_at?: string | null }>;
  initialSelectedEntregaId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <GestaoMapDialogContent entregas={entregas} localizacoes={localizacoes} initialSelectedEntregaId={open ? initialSelectedEntregaId : null} />
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Component ====================
export default function GestaoCargas() {
  const { filialAtiva, switchingFilial } = useUserContext();
  const queryClient = useQueryClient();
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [gestaoDialogOpen, setGestaoDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);

  // Fetch entregas directly (not via cargas) filtered by embarcador's filial
  const { data: entregas = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['gestao_entregas_embarcador', filialAtiva?.id],
    queryFn: async () => {
      if (!filialAtiva?.id) return [];

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id, codigo, status, created_at, updated_at,
          motorista_id, peso_alocado_kg, valor_frete, coletado_em, entregue_em,
          canhoto_url, outros_documentos,
          motorista:motoristas(id, nome_completo, telefone, foto_url),
          veiculo:veiculos(id, placa, modelo, tipo),
          carga:cargas!inner(
            id, codigo, descricao, peso_kg, tipo, filial_id,
            remetente_razao_social, remetente_nome_fantasia,
            destinatario_razao_social, destinatario_nome_fantasia,
            data_coleta_de, data_entrega_limite,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, numero, bairro, cep, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, numero, bairro, cep, latitude, longitude),
            empresa:empresas(id, nome, comissao_hubfrete_percent)
          )
        `)
        .eq('carga.filial_id', filialAtiva.id)
        .not('status', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter: active always show, terminal only if finalized today
      const pendingStatuses = ['aguardando', 'saiu_para_coleta', 'em_transito', 'saiu_para_entrega'];
      const terminalStatuses = ['entregue', 'cancelada'];

      const filtered = (data || []).filter(e => {
        if (pendingStatuses.includes(e.status)) return true;
        if (terminalStatuses.includes(e.status)) {
          return new Date(e.updated_at) >= new Date(startOfToday);
        }
        return false;
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

      // Batch-fetch NF-e counts per entrega
      const entregaIds = entregasWithEvents.map(e => e.id);
      if (entregaIds.length > 0) {
        const { data: nfeCounts } = await (supabase as any)
          .from('nfes')
          .select('entrega_id')
          .in('entrega_id', entregaIds);

        const countMap: Record<string, number> = {};
        entregaIds.forEach(id => { countMap[id] = 0; });
        (nfeCounts || []).forEach((n: any) => {
          if (n.entrega_id) countMap[n.entrega_id] = (countMap[n.entrega_id] || 0) + 1;
        });

        entregasWithEvents.forEach((e: any) => {
          e.nfe_count = countMap[e.id] ?? 0;
        });
      }

      return entregasWithEvents as Entrega[];
    },
    enabled: !!filialAtiva?.id,
    refetchInterval: 60000,
  });

  // Collect motorista IDs for real-time tracking
  const motoristaIds = useMemo(() => {
    const ids = new Set<string>();
    entregas.forEach(e => {
      if (e.motorista?.id) ids.add(e.motorista.id);
    });
    return Array.from(ids);
  }, [entregas]);

  const { localizacoes } = useRealtimeLocalizacoes({
    motoristaIds,
    enabled: motoristaIds.length > 0,
  });

  // Update selectedEntrega when data refreshes
  useEffect(() => {
    if (selectedEntrega) {
      const updated = entregas.find(e => e.id === selectedEntrega.id);
      if (updated) setSelectedEntrega(updated);
    }
  }, [entregas]);

  // Filter entregas
  const { ativas, finalizadas } = useMemo(() => {
    let filtered = entregas;

    if (filters.codigo) {
      const term = filters.codigo.toLowerCase();
      filtered = filtered.filter(e =>
        e.codigo?.toLowerCase().includes(term) || e.carga.codigo?.toLowerCase().includes(term)
      );
    }
    if (filters.motorista) {
      const term = filters.motorista.toLowerCase();
      filtered = filtered.filter(e => e.motorista?.nome_completo?.toLowerCase().includes(term));
    }
    if (filters.cidadeOrigem) {
      const term = filters.cidadeOrigem.toLowerCase();
      filtered = filtered.filter(e => e.carga.endereco_origem?.cidade?.toLowerCase().includes(term));
    }
    if (filters.cidadeDestino) {
      const term = filters.cidadeDestino.toLowerCase();
      filtered = filtered.filter(e => e.carga.endereco_destino?.cidade?.toLowerCase().includes(term));
    }
    if (filters.destinatario) {
      const term = filters.destinatario.toLowerCase();
      filtered = filtered.filter(e =>
        e.carga.destinatario_nome_fantasia?.toLowerCase().includes(term) ||
        e.carga.destinatario_razao_social?.toLowerCase().includes(term)
      );
    }

    const a = filtered.filter(e => ['aguardando', 'saiu_para_coleta', 'em_transito', 'saiu_para_entrega'].includes(e.status));
    const f = filtered.filter(e => ['entregue', 'cancelada'].includes(e.status));
    return { ativas: a, finalizadas: f };
  }, [entregas, filters]);

  // Driver location for selected delivery
  const driverLocation = useMemo(() => {
    if (!selectedEntrega?.motorista_id) return null;
    const loc = localizacoes.find(l => l.motorista_id === selectedEntrega.motorista_id);
    if (loc?.latitude && loc?.longitude) {
      return { lat: loc.latitude, lng: loc.longitude, heading: loc.heading, isOnline: loc.isOnline };
    }
    return null;
  }, [selectedEntrega, localizacoes]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 !pb-0 md:p-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Cargas em Andamento</h1>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="w-5 h-5 rounded-full mt-1 ml-1 bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-sm p-3">
                  <p className="font-medium mb-1">Acompanhamento de Entregas</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed">
                     <li>Acompanhe em tempo real as cargas em operação.</li>
                     <li>Cargas finalizadas permanecem visíveis até o fim do dia.</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">Visualize sua operação diária</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
            queryClient.resetQueries({ queryKey: ['gestao_entregas_embarcador', filialAtiva?.id] });
          }}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <AdvancedFiltersPopover
            filters={filters}
            onFiltersChange={setFilters}
            showMotorista
            showEmbarcador={false}
            showDestinatario
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
        {/* Column 1: Ativas */}
        <div className="border rounded-l-md bg-muted/20 shadow-sm flex flex-col min-w-0 overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <span className="text-sm font-medium text-muted-foreground">Ativas ({ativas.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(isLoading || switchingFilial) ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : ativas.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyColumnPlaceholder message="Cargas ativas aparecerão aqui" />
              </div>
            ) : (
              ativas.map(e => (
                <EntregaListItem
                  key={e.id}
                  entrega={e}
                  isSelected={selectedEntrega?.id === e.id}
                  onClick={() => setSelectedEntrega(e)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Finalizadas */}
        <div className="border-y border-r bg-muted/20 shadow-sm flex flex-col min-w-0 overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <span className="text-sm font-medium text-muted-foreground">Finalizadas ({finalizadas.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(isLoading || switchingFilial) ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : finalizadas.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyColumnPlaceholder message="Cargas finalizadas do dia aparecerão aqui" />
              </div>
            ) : (
              finalizadas.map(e => (
                <EntregaListItem
                  key={e.id}
                  entrega={e}
                  isSelected={selectedEntrega?.id === e.id}
                  onClick={() => setSelectedEntrega(e)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Detail Panel */}
        <div className="border rounded-r-md bg-card shadow-sm flex flex-col min-w-0 overflow-hidden">
          <DetailPanel
            entrega={selectedEntrega}
            onClose={() => setSelectedEntrega(null)}
            driverLocation={driverLocation}
            onRefresh={() => refetch()}
            onExpandMap={() => setGestaoDialogOpen(true)}
          />
        </div>
      </div>

      {/* Map Dialog */}
      <GestaoMapDialog
        open={gestaoDialogOpen}
        onOpenChange={setGestaoDialogOpen}
        entregas={entregas}
        localizacoes={localizacoes}
        initialSelectedEntregaId={selectedEntrega?.id}
      />

      {/* Daily Performance Dialog */}
      <EmbarcadorDailyPerformanceDialog
        open={performanceDialogOpen}
        onOpenChange={setPerformanceDialogOpen}
        entregas={entregas}
      />
    </div>
  );
}
