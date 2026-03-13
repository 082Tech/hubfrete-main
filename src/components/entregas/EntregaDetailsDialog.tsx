import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatWeight } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Package,
  MapPin,
  Calendar,
  Truck,
  User,
  Building2,
  Weight,
  Route,
  Clock,
  CheckCircle,
  AlertCircle,
  Navigation,
  ArrowRight,
  FileText,
  FileCheck,
  Files,
  ExternalLink,
  AlertTriangle,
  XCircle,
  Receipt,
  Paperclip,
  Info,
  Eye,
import {
  Shuffle, History,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { OutroDocumento } from './EntregaDocumentosPanel';
import { FilePreviewDialog } from './FilePreviewDialog';
import { CarregamentoCarroceriasSection } from './CarregamentoCarroceriasSection';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaDetailsProps {
  entrega: {
    id: string;
    codigo?: string | null;
    tracking_code?: string;
    status: StatusEntrega | null;
    created_at: string | null;
    coletado_em: string | null;
    entregue_em: string | null;
    peso_alocado_kg: number | null;
    carrocerias_alocadas?: Array<{ carroceria_id: string; peso_kg: number }> | null;
    carroceria_id?: string | null;
    valor_frete: number | null;
    previsao_coleta?: string | null;
    canhoto_url?: string | null;
    motorista: {
      id: string;
      nome_completo: string;
      telefone: string | null;
      email: string | null;
      foto_url: string | null;
    } | null;
    veiculo: {
      id: string;
      placa: string;
      tipo: string | null;
    } | null;
    carga: {
      id: string;
      codigo: string;
      descricao: string;
      peso_kg: number;
      tipo: string;
      data_entrega_limite: string | null;
      destinatario_nome_fantasia: string | null;
      destinatario_razao_social: string | null;
      endereco_origem: {
        cidade: string;
        estado: string;
        logradouro: string;
        latitude: number | null;
        longitude: number | null;
      } | null;
      endereco_destino: {
        cidade: string;
        estado: string;
        logradouro: string;
        latitude: number | null;
        longitude: number | null;
      } | null;
      empresa: {
        nome: string | null;
      } | null;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusEntregaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'aguardando': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando', icon: Clock },
  'saiu_para_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Saiu para Coleta', icon: Package },
  'saiu_para_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Saiu p/ Entrega', icon: Truck },
  'entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Concluída', icon: CheckCircle },
  'problema': { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Problema', icon: AlertCircle },
  'cancelada': { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Cancelada', icon: XCircle },
};

const tipoCargaLabels: Record<string, string> = {
  'carga_seca': 'Carga Seca',
  'granel_solido': 'Granel Sólido',
  'granel_liquido': 'Granel Líquido',
  'refrigerada': 'Refrigerada',
  'congelada': 'Congelada',
  'perigosa': 'Perigosa',
  'viva': 'Carga Viva',
  'indivisivel': 'Indivisível',
  'container': 'Container',
};

const tipoVeiculoLabels: Record<string, string> = {
  'truck': 'Truck',
  'toco': 'Toco',
  'tres_quartos': '3/4',
  'vuc': 'VUC',
  'carreta': 'Carreta',
  'carreta_ls': 'Carreta LS',
  'bitrem': 'Bitrem',
  'rodotrem': 'Rodotrem',
  'vanderleia': 'Vanderléia',
  'bitruck': 'Bitruck',
};

export function EntregaDetailsDialog({ entrega, open, onOpenChange }: EntregaDetailsProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [nfes, setNfes] = useState<any[]>([]);

  useEffect(() => {
    if (!entrega?.id || !open) { setNfes([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from('nfes')
        .select('id, numero, chave_acesso, url, xml_url, valor, data_emissao')
        .eq('entrega_id', entrega.id)
        .order('created_at', { ascending: true });
      setNfes(data || []);
    })();
  }, [entrega?.id, open]);

  if (!entrega) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const status = entrega.status || 'aguardando';
  const config = statusEntregaConfig[status];
  const StatusIcon = config?.icon || Package;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatValor = (valor: number | null) => {
    if (!valor) return '-';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const openPreview = (url: string | null, title: string) => {
    if (url) {
      setPreviewUrl(url);
      setPreviewTitle(title);
      setPreviewOpen(true);
    }
  };

  // Document status
  const hasCanhoto = !!entrega.canhoto_url;
  const hasNfes = nfes.length > 0;
  const pendingDocs = (!hasCanhoto ? 1 : 0) + (!hasNfes ? 1 : 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Truck className="w-5 h-5" />
              <span>Carga - {entrega.codigo || entrega.carga.codigo}</span>
              <Badge variant="outline" className={config?.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config?.label}
              </Badge>
            </DialogTitle>
            {entrega.tracking_code && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const url = `${window.location.origin}/rastreio?codigo=${entrega.tracking_code}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link de rastreio copiado!');
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Link de Rastreio
              </Button>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Descrição da Carga */}
            <div>
              <p className="text-lg font-medium">{entrega.carga.descricao}</p>
              <p className="text-sm text-muted-foreground">
                Tipo: {tipoCargaLabels[entrega.carga.tipo] || entrega.carga.tipo}
              </p>
            </div>

            <Separator />

            {/* Rota */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Route className="w-4 h-4" />
                  Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Origem */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    O
                  </div>
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      {entrega.carga.empresa?.nome || 'Remetente'}
                    </p>
                    {entrega.carga.endereco_origem && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {entrega.carga.endereco_origem.logradouro}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entrega.carga.endereco_origem.cidade}, {entrega.carga.endereco_origem.estado}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Destino */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    D
                  </div>
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      {entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || 'Destinatário'}
                    </p>
                    {entrega.carga.endereco_destino && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {entrega.carga.endereco_destino.logradouro}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entrega.carga.endereco_destino.cidade}, {entrega.carga.endereco_destino.estado}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados da Entrega */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Dados da Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Peso Alocado</p>
                  <p className="font-medium flex items-center gap-1">
                    <Weight className="w-3 h-3" />
                    {entrega.peso_alocado_kg
                      ? `${formatWeight(entrega.peso_alocado_kg)} / ${formatWeight(entrega.carga.peso_kg)}`
                      : formatWeight(entrega.carga.peso_kg)
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor do Frete</p>
                  <p className="font-medium">{formatValor(entrega.valor_frete)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Previsão de Coleta</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {entrega.previsao_coleta ? formatDateTime(entrega.previsao_coleta) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Previsão de Entrega</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entrega.carga.data_entrega_limite)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">{formatDateTime(entrega.created_at)}</p>
                </div>
                {entrega.coletado_em && (
                  <div>
                    <p className="text-muted-foreground">Coletado em</p>
                    <p className="font-medium text-green-600">{formatDateTime(entrega.coletado_em)}</p>
                  </div>
                )}
                {entrega.entregue_em && (
                  <div>
                    <p className="text-muted-foreground">Entregue em</p>
                    <p className="font-medium text-green-600">{formatDateTime(entrega.entregue_em)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Carregamento por Carroceria */}
            <CarregamentoCarroceriasSection
              carroceriasAlocadas={entrega.carrocerias_alocadas as any}
              carroceriaId={entrega.carroceria_id}
              pesoAlocadoKg={entrega.peso_alocado_kg}
            />

            {/* Documentos - Enhanced Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documentos
                  </div>
                  {pendingDocs > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {pendingDocs} pendente(s)
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* NF-es do Embarcador */}
                {nfes.length > 0 ? (
                  nfes.map((nfe: any, idx: number) => (
                    <div key={nfe.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/10">
                          <Files className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">NF-e {nfe.numero || `#${idx + 1}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {nfe.chave_acesso ? `Chave: ...${nfe.chave_acesso.slice(-8)}` : 'Anexada pelo embarcador'}
                            {nfe.valor ? ` · ${Number(nfe.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                          </p>
                        </div>
                      </div>
                      {nfe.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(nfe.url, `NF-e ${nfe.numero || idx + 1}`)}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                        <Files className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Notas Fiscais (NF-e)</p>
                        <p className="text-xs text-muted-foreground">Nenhuma NF-e anexada pelo embarcador</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Pendente
                    </Badge>
                  </div>
                )}

                {/* CT-e - read-only */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                      <FileCheck className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">CT-e (Conhecimento de Transporte)</p>
                      <p className="text-xs text-muted-foreground">Geração automática (em breve)</p>
                    </div>
                  </div>
                </div>

                {/* Canhoto */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasCanhoto ? 'bg-green-500/10' : 'bg-muted'}`}>
                      <Receipt className={`w-4 h-4 ${hasCanhoto ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Comprovante de Entrega</p>
                      <p className="text-xs text-muted-foreground">
                        {hasCanhoto ? 'Comprovante anexado' : 'Aguardando comprovação'}
                      </p>
                    </div>
                  </div>
                  {hasCanhoto ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPreview(entrega.canhoto_url!, 'Comprovante de Entrega')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Visualizar
                    </Button>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Não anexado
                    </Badge>
                  )}
                </div>

                {/* Outros Documentos */}
                {(() => {
                  const outros: any[] = Array.isArray((entrega as any).outros_documentos) ? (entrega as any).outros_documentos : [];
                  if (outros.length === 0) return null;
                  return (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-violet-500" />
                        <span className="text-sm font-medium">Outros Documentos</span>
                        <Badge variant="secondary" className="text-[10px]">{outros.length}</Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                              Documentos complementares como GNRE, comprovantes, autorizações, etc.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {outros.map((doc: any, i: number) => (
                        <div key={`${doc.url}-${i}`} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-500/10">
                              <Paperclip className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.tipo_usuario === 'embarcador' ? 'Embarcador' : 'Transportadora'}
                              </p>
                            </div>
                          </div>
                          {doc.url && (
                            <Button variant="outline" size="sm" onClick={() => openPreview(doc.url, doc.nome)}>
                              <Eye className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Motorista e Veículo */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Motorista */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Motorista
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {entrega.motorista ? (
                    <>
                      <div className="flex items-center gap-3">
                        {entrega.motorista.foto_url ? (
                          <img
                            src={entrega.motorista.foto_url}
                            alt={entrega.motorista.nome_completo}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{entrega.motorista.nome_completo}</p>
                          {entrega.motorista.email && (
                            <p className="text-xs text-muted-foreground">{entrega.motorista.email}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Use o chat para entrar em contato
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Não atribuído</p>
                  )}
                </CardContent>
              </Card>

              {/* Veículo */}
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Veículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {entrega.veiculo ? (
                    <>
                      <p className="font-medium text-lg">{entrega.veiculo.placa}</p>
                      <Badge variant="outline">
                        {tipoVeiculoLabels[entrega.veiculo.tipo || ''] || entrega.veiculo.tipo || 'Não especificado'}
                      </Badge>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Não atribuído</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fileUrl={previewUrl}
        title={previewTitle}
      />
    </>
  );
}
