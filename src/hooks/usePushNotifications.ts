import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// VAPID public key - será buscada do edge function
const VAPID_PUBLIC_KEY_ENDPOINT = 'https://eilwdavgnuhfyxfqkvrk.supabase.co/functions/v1/push-notifications';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true, permission: Notification.permission }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => checkSubscription())
        .catch(error => {
          console.error('Erro ao registrar SW:', error);
          setState(prev => ({ ...prev, isLoading: false }));
        });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkSubscription]);

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Notificações push não são suportadas neste navegador');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast.error('Permissão para notificações foi negada');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Buscar VAPID public key
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para ativar notificações');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      const vapidResponse = await fetch(`${VAPID_PUBLIC_KEY_ENDPOINT}?action=get-vapid-key`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!vapidResponse.ok) {
        throw new Error('Falha ao buscar chave VAPID');
      }

      const { publicKey } = await vapidResponse.json();

      // Criar subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Salvar subscription no banco
      const subscriptionJson = subscription.toJSON();
      
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        throw error;
      }

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success('Notificações ativadas com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      toast.error('Erro ao ativar notificações');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remover do banco
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', session.user.id)
            .eq('endpoint', subscription.endpoint);
        }
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      toast.success('Notificações desativadas');
      return true;
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      toast.error('Erro ao desativar notificações');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
