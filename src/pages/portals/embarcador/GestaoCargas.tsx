import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
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
  MessageCircle,
  RefreshCw,
  History,
  Share,
  Printer,
  X,
  ArrowUpRight,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  Upload,
  Download,
  Weight,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdvancedFiltersPopover, AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { DocumentButton } from '@/components/entregas/DocumentButton';
import { DetailPanelLeafletMap } from '@/components/maps/DetailPanelLeafletMap';
import { ChatSheet } from '@/components/mensagens/ChatSheet';

// Status config - matching transportadora portal
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800', icon: Clock },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800', icon: Truck },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', icon: MapPin },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', icon: XCircle },
};

interface Entrega {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  updated_at: string;
  motorista_id: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  coletado_em: string | null;
  entregue_em: string | null;
  cte_url: string | null;
  numero_cte: string | null;
  notas_fiscais_urls: string[] | null;
  canhoto_url: string | null;
  motorista?: { id: string; nome_completo: string; telefone: string | null; foto_url: string | null } | null;
  veiculo?: { id: string; placa: string; modelo: string | null; tipo: string } | null;
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
    empresa?: { id: number; nome: string | null } | null;
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

  // NF-e alert
  const hasNf = (entrega.notas_fiscais_urls?.length || 0) > 0;
  const nfePending = !hasNf && entrega.status === 'aguardando';

  return (
    <div
      className={`flex items-start gap-3 bg-card px-4 py-3 cursor-pointer transition-all hover:bg-muted/50 border-b ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
      onClick={onClick}
    >
      <Avatar className="h-9 w-9 shrink-0">
        {entrega.motorista?.foto_url && <AvatarImage src={entrega.motorista.foto_url} />}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {entrega.motorista?.nome_completo?.[0] || <Truck className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <span className="font-medium text-sm truncate block">
          {entrega.motorista?.nome_completo || 'Sem motorista'}
        </span>
        <div className="flex items-center gap-1 text-sm font-semibold">
          <span className="truncate">{entrega.carga.endereco_origem?.cidade || 'N/A'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{entrega.carga.endereco_destino?.cidade || 'N/A'}</span>
        </div>
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
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5">
            #{entrega.codigo || entrega.id.slice(0, 6)}
          </Badge>
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

      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground mb-1">{tempoDecorrido}</p>
        <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
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
}: {
  entrega: Entrega | null;
  onClose: () => void;
  driverLocation: { lat: number; lng: number; heading?: number | null; isOnline?: boolean } | null;
  onRefresh: () => void;
}) {
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('');
  const [chatSheetOpen, setChatSheetOpen] = useState(false);

  if (!entrega) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyColumnPlaceholder message="Selecione uma entrega para ver os detalhes" />
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

  // Docs: 3 obrigatórios (NF-e, CT-e, Canhoto) - sem manifesto
  const hasCte = !!entrega.cte_url;
  const hasCanhoto = !!entrega.canhoto_url;
  const hasNf = (entrega.notas_fiscais_urls?.length || 0) > 0;
  const docsCount = [hasCte, hasCanhoto, hasNf].filter(Boolean).length;
  const docsComplete = docsCount === 3;

  // NF-e alert
  const nfePending = !hasNf && entrega.status === 'aguardando';

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
            <span className="text-xs text-muted-foreground">Entrega Nº</span>
            <Badge variant="outline" className="font-mono font-bold text-xs px-2 border-primary text-primary">
              {entrega.codigo || entrega.id.slice(0, 8)}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7"><Share className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowUpRight className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Printer className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
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
          {/* Empresa que publicou */}
          {entrega.carga.empresa && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Publicado por:</span>
              <span className="font-medium">{entrega.carga.empresa.nome || 'Empresa não identificada'}</span>
            </div>
          )}

          {/* Map */}
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

          {/* Documentos - 3/3 (NF-e, CT-e, Canhoto) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-xs">Documentos</span>
              </div>
              <Badge variant={docsComplete ? 'default' : 'secondary'} className="text-[10px]">
                {docsCount}/3 anexados
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <DocumentButton
                type="cte"
                hasDoc={hasCte}
                canAttach={false}
                onView={() => handleDocClick(entrega.cte_url, 'CT-e')}
                entregaId={entrega.id}
                onUploaded={onRefresh}
              />
              <DocumentButton
                type="canhoto"
                hasDoc={hasCanhoto}
                canAttach={false}
                onView={() => handleDocClick(entrega.canhoto_url, 'Canhoto')}
                entregaId={entrega.id}
                onUploaded={onRefresh}
              />
              <DocumentButton
                type="nfe"
                hasDoc={hasNf}
                count={entrega.notas_fiscais_urls?.length || 0}
                canAttach={true}
                onView={() => handleDocClick(entrega.notas_fiscais_urls?.[0] || null, 'Nota Fiscal')}
                entregaId={entrega.id}
                onUploaded={onRefresh}
              />
            </div>
          </div>

          <Separator />

          {/* Driver & Vehicle + Chat */}
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
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => setChatSheetOpen(true)}>
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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

// ==================== Main Component ====================
export default function GestaoCargas() {
  const { filialAtiva, switchingFilial } = useUserContext();
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [filters, setFilters] = useState<AdvancedFilters>({});

  // Fetch entregas directly (not via cargas) filtered by embarcador's filial
  const { data: entregas = [], isLoading, refetch } = useQuery({
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
          cte_url, numero_cte, notas_fiscais_urls, canhoto_url,
          motorista:motoristas(id, nome_completo, telefone, foto_url),
          veiculo:veiculos(id, placa, modelo, tipo),
          carga:cargas!inner(
            id, codigo, descricao, peso_kg, tipo,
            remetente_razao_social, remetente_nome_fantasia,
            destinatario_razao_social, destinatario_nome_fantasia,
            data_coleta_de, data_entrega_limite,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, numero, bairro, cep, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, numero, bairro, cep, latitude, longitude),
            empresa:empresas(id, nome)
          )
        `)
        .eq('carga.filial_id', filialAtiva.id)
        .not('status', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter: active always show, terminal only if finalized today
      const pendingStatuses = ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'];
      const terminalStatuses = ['entregue', 'cancelada'];

      return (data || []).filter(e => {
        if (pendingStatuses.includes(e.status)) return true;
        if (terminalStatuses.includes(e.status)) {
          return new Date(e.updated_at) >= new Date(startOfToday);
        }
        return false;
      }) as Entrega[];
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

    const a = filtered.filter(e => ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'].includes(e.status));
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
            <h1 className="text-3xl font-bold text-foreground">Gestão de Cargas</h1>
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
                    <li>Acompanhe em tempo real as entregas das suas cargas.</li>
                    <li>Entregas finalizadas permanecem visíveis até o fim do dia.</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">Visualize sua operação diária</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <AdvancedFiltersPopover
            filters={filters}
            onFiltersChange={setFilters}
            showMotorista
            showEmbarcador={false}
            showDestinatario
          />
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
                <EmptyColumnPlaceholder message="Entregas ativas aparecerão aqui" />
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
                <EmptyColumnPlaceholder message="Entregas finalizadas do dia aparecerão aqui" />
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
          />
        </div>
      </div>
    </div>
  );
}
