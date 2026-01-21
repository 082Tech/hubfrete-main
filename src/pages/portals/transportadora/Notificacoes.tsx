import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  BellOff,
  BellRing,
  Package,
  MessageSquare,
  User,
  Truck,
  FileText,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
} from 'lucide-react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

const tipoConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  status_entrega_alterado: { icon: Truck, color: 'text-blue-500', label: 'Status de Entrega' },
  nova_mensagem: { icon: MessageSquare, color: 'text-green-500', label: 'Mensagem' },
  motorista_adicionado: { icon: User, color: 'text-purple-500', label: 'Motorista' },
  carga_publicada: { icon: Package, color: 'text-orange-500', label: 'Carga' },
  entrega_aceita: { icon: Check, color: 'text-emerald-500', label: 'Entrega Aceita' },
  entrega_concluida: { icon: CheckCheck, color: 'text-emerald-600', label: 'Entrega Concluída' },
  cte_anexado: { icon: FileText, color: 'text-amber-500', label: 'CT-e' },
};

export default function NotificacoesTransportadora() {
  const navigate = useNavigate();
  const { 
    notificacoes, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificacoes();
  const push = usePushNotifications();
  const [activeTab, setActiveTab] = useState<'todas' | 'nao_lidas'>('todas');

  const filteredNotificacoes = activeTab === 'nao_lidas' 
    ? notificacoes.filter(n => !n.lida)
    : notificacoes;

  const handleNotificationClick = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      markAsRead(notificacao.id);
    }
    if (notificacao.link) {
      navigate(notificacao.link);
    }
  };

  const getIcon = (tipo: string) => {
    return tipoConfig[tipo] || { icon: Bell, color: 'text-muted-foreground', label: 'Notificação' };
  };

  return (
    <PortalLayout expectedUserType="transportadora" fullWidth>
      <div className="h-full flex flex-col p-6 gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notificações
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas notificações e preferências
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Push Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Receba notificações mesmo quando o navegador estiver fechado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!push.isSupported ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <BellOff className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Seu navegador não suporta notificações push
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {push.isSubscribed ? (
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <Bell className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-muted rounded-full">
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Label className="text-base">
                      {push.isSubscribed ? 'Notificações ativadas' : 'Notificações desativadas'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {push.isSubscribed 
                        ? 'Você receberá alertas em tempo real'
                        : 'Ative para receber alertas importantes'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={push.isSubscribed}
                  onCheckedChange={push.isSubscribed ? push.unsubscribe : push.subscribe}
                  disabled={push.isLoading}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Histórico de Notificações</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                </Badge>
                {notificacoes.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar todas
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar todas as notificações?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá excluir todas as suas notificações permanentemente.
                          Isso não pode ser desfeito.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteAllNotifications()}
                        >
                          Excluir todas
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'todas' | 'nao_lidas')} className="h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="nao_lidas">
                  Não lidas
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0 flex-1 min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredNotificacoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma notificação</p>
                    <p className="text-sm">
                      {activeTab === 'nao_lidas' 
                        ? 'Você leu todas as notificações'
                        : 'As notificações aparecerão aqui'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                      {filteredNotificacoes.map((notificacao) => {
                        const { icon: Icon, color, label } = getIcon(notificacao.tipo);
                        return (
                          <div
                            key={notificacao.id}
                            className={cn(
                              'flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 group',
                              !notificacao.lida && 'bg-accent/50'
                            )}
                            onClick={() => handleNotificationClick(notificacao)}
                          >
                            <div className={cn('mt-0.5 shrink-0', color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  'text-sm',
                                  !notificacao.lida && 'font-semibold'
                                )}>
                                  {notificacao.titulo}
                                </p>
                                {!notificacao.lida && (
                                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {notificacao.mensagem}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {label}
                                </Badge>
                                <span>
                                  {formatDistanceToNow(new Date(notificacao.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                                <span className="hidden sm:inline">
                                  {format(new Date(notificacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notificacao.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
