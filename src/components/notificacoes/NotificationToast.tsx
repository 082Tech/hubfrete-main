import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Package, MessageSquare, Truck, CheckCircle, FileText } from 'lucide-react';
import { useNotificacoesContext, type Notificacao } from '@/contexts/NotificacoesContext';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

const tipoConfig: Record<string, { icon: React.ElementType; color: string }> = {
  status_entrega_alterado: { icon: Truck, color: 'text-blue-500' },
  nova_mensagem: { icon: MessageSquare, color: 'text-green-500' },
  motorista_adicionado: { icon: Truck, color: 'text-purple-500' },
  carga_publicada: { icon: Package, color: 'text-orange-500' },
  entrega_aceita: { icon: CheckCircle, color: 'text-emerald-500' },
  entrega_concluida: { icon: CheckCircle, color: 'text-green-600' },
  cte_anexado: { icon: FileText, color: 'text-cyan-500' },
};

interface ToastNotification extends Notificacao {
  isVisible: boolean;
}

export function NotificationToast() {
  const { notificacoes } = useNotificacoesContext();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect new notifications
  useEffect(() => {
    if (notificacoes.length > 0) {
      const latestNotification = notificacoes[0];
      
      // Only show toast for genuinely new notifications
      if (latestNotification.id !== lastNotificationId && lastNotificationId !== null) {
        // Add new toast
        setToasts(prev => [
          { ...latestNotification, isVisible: true },
          ...prev.slice(0, 2) // Keep max 3 toasts
        ]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setToasts(prev => 
            prev.map(t => 
              t.id === latestNotification.id ? { ...t, isVisible: false } : t
            )
          );
        }, 5000);

        // Remove from array after animation
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== latestNotification.id));
        }, 5300);
      }
      
      setLastNotificationId(latestNotification.id);
    }
  }, [notificacoes, lastNotificationId]);

  const handleDismiss = (id: string) => {
    setToasts(prev => 
      prev.map(t => t.id === id ? { ...t, isVisible: false } : t)
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  const handleClick = (notification: ToastNotification) => {
    handleDismiss(notification.id);
    
    if (notification.link) {
      // Determine portal based on current path
      const isTransportadora = location.pathname.startsWith('/transportadora');
      const basePath = isTransportadora ? '/transportadora' : '/embarcador';
      navigate(`${basePath}${notification.link}`);
    }
  };

  const getIcon = (tipo: string) => {
    const config = tipoConfig[tipo] || { icon: Bell, color: 'text-primary' };
    return config;
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const { icon: Icon, color } = getIcon(toast.tipo);
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ 
                opacity: toast.isVisible ? 1 : 0, 
                y: toast.isVisible ? 0 : -20, 
                scale: toast.isVisible ? 1 : 0.9 
              }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
              className="pointer-events-auto"
            >
              <div
                onClick={() => handleClick(toast)}
                className={cn(
                  "bg-background border border-border rounded-xl shadow-lg overflow-hidden cursor-pointer",
                  "hover:shadow-xl transition-shadow duration-200",
                  "backdrop-blur-sm bg-background/95"
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      "bg-muted"
                    )}>
                      <Icon className={cn("w-5 h-5", color)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {toast.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {toast.mensagem}
                      </p>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(toast.id);
                      }}
                      className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-1 bg-primary origin-left"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
