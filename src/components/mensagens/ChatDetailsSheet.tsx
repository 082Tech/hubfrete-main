import { 
  Package, 
  MapPin, 
  ArrowRight, 
  Calendar, 
  Truck, 
  User, 
  Building2, 
  Scale,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Route,
  Users
} from 'lucide-react';
import { formatWeight } from '@/lib/utils';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chat, ChatParticipante } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatDetailsSheetProps {
  chat: Chat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'embarcador' | 'transportadora';
}

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'aguardando_coleta': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando Coleta', icon: Clock },
  'em_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Em Coleta', icon: Package },
  'coletado': { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', label: 'Coletado', icon: CheckCircle },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Em Trânsito', icon: Route },
  'em_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Em Rota', icon: Truck },
  'entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Concluída', icon: CheckCircle },
  'problema': { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Problema', icon: AlertCircle },
  'devolvida': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Devolvida', icon: AlertCircle },
};

export function ChatDetailsSheet({ chat, open, onOpenChange, userType }: ChatDetailsSheetProps) {
  if (!chat?.entrega) return null;

  const { entrega } = chat;
  const { carga, motorista, veiculo } = entrega;
  const status = entrega.status || 'aguardando_coleta';
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo?.icon || Package;

  const formatPeso = (peso: number | null | undefined) => formatWeight(peso);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: ptBR });
  };

  const participantes = chat.participantes || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Detalhes da Entrega
              </SheetTitle>
            </SheetHeader>

            {/* Status Card */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="text-sm">
                  {carga?.codigo}
                </Badge>
                <Badge className={`${statusInfo?.color} gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo?.label || status}
                </Badge>
              </div>
              <h3 className="font-medium text-foreground mb-2">{carga?.descricao}</h3>
              <p className="text-sm text-muted-foreground">{carga?.tipo}</p>
            </div>

            {/* Route */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Route className="w-4 h-4" />
                Rota
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Origem</p>
                    <p className="text-sm text-muted-foreground">
                      {carga?.endereco_origem?.cidade}, {carga?.endereco_origem?.estado}
                    </p>
                    {carga?.endereco_origem?.logradouro && (
                      <p className="text-xs text-muted-foreground">{carga.endereco_origem.logradouro}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-4">
                  <div className="w-px h-8 bg-border" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Destino</p>
                    <p className="text-sm text-muted-foreground">
                      {carga?.endereco_destino?.cidade}, {carga?.endereco_destino?.estado}
                    </p>
                    {carga?.endereco_destino?.logradouro && (
                      <p className="text-xs text-muted-foreground">{carga.endereco_destino.logradouro}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Scale className="w-4 h-4" />
                  <span className="text-xs">Peso</span>
                </div>
                <p className="font-medium">{formatPeso(entrega.peso_alocado_kg || carga?.peso_kg)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Previsão</span>
                </div>
                <p className="font-medium text-sm">{formatDate(carga?.data_entrega_limite)}</p>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Participants */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participantes ({2 + (motorista ? 1 : 0)})
              </h4>
              <div className="space-y-3">
                {/* Embarcador */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={carga?.empresa?.logo_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Building2 className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{carga?.empresa?.nome || 'Embarcador'}</p>
                    <p className="text-xs text-muted-foreground">Embarcador</p>
                  </div>
                </div>

                {/* Transportadora */}
                {motorista?.empresa && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={motorista.empresa.logo_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Truck className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{motorista.empresa.nome}</p>
                      <p className="text-xs text-muted-foreground">Transportadora</p>
                    </div>
                  </div>
                )}

                {/* Motorista */}
                {motorista && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={motorista.foto_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{motorista.nome_completo}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Motorista</p>
                        {veiculo && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {veiculo.placa}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    {motorista.telefone && (
                      <Button variant="ghost" size="icon" className="shrink-0" asChild>
                        <a href={`tel:${motorista.telefone}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
