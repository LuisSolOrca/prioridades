'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
    error: null
  });

  // Verificar soporte y estado inicial
  useEffect(() => {
    const checkSupport = async () => {
      // Verificar que estamos en el cliente (no SSR)
      if (typeof window === 'undefined') {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: 'Ejecutando en servidor'
        }));
        return;
      }

      // Verificar si el navegador soporta push notifications
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      const hasNotification = 'Notification' in window;

      console.log('[Push] Checking support:', { hasServiceWorker, hasPushManager, hasNotification });

      if (!hasServiceWorker || !hasPushManager || !hasNotification) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: `Tu navegador no soporta notificaciones push (SW: ${hasServiceWorker}, PM: ${hasPushManager}, N: ${hasNotification})`
        }));
        return;
      }

      // Obtener permiso actual
      const permission = Notification.permission;

      // Verificar si ya está suscrito
      let isSubscribed = false;
      try {
        // Primero registrar el service worker si no existe
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
        console.log('[Push] Current subscription:', isSubscribed);
      } catch (error) {
        console.error('[Push] Error verificando suscripción:', error);
      }

      setState({
        isSupported: true,
        isSubscribed,
        permission,
        isLoading: false,
        error: null
      });
    };

    checkSupport();
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker no soportado');
    }

    // Registrar o obtener el SW existente
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // Esperar a que esté activo
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker).state === 'activated') {
            resolve();
          }
        });
      });
    }

    return registration;
  }, []);

  // Suscribirse a push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Pedir permiso si no lo tenemos
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setState(prev => ({
            ...prev,
            permission,
            isLoading: false,
            error: 'Permiso denegado para notificaciones'
          }));
          return false;
        }
      } else if (Notification.permission === 'denied') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador.'
        }));
        return false;
      }

      // Registrar Service Worker
      const registration = await registerServiceWorker();

      // Obtener la clave pública VAPID
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key no configurada');
      }

      // Convertir clave a Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Suscribirse al PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Enviar suscripción al servidor
      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Error guardando suscripción en el servidor');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
        error: null
      }));

      return true;
    } catch (error: any) {
      console.error('Error al suscribirse:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Error al activar notificaciones'
      }));
      return false;
    }
  }, [registerServiceWorker]);

  // Desuscribirse de push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Eliminar del servidor primero
        const response = await fetch(`/api/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          console.warn('Error eliminando suscripción del servidor');
        }

        // Desuscribirse localmente
        await subscription.unsubscribe();
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null
      }));

      return true;
    } catch (error: any) {
      console.error('Error al desuscribirse:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Error al desactivar notificaciones'
      }));
      return false;
    }
  }, []);

  // Toggle subscription
  const toggleSubscription = useCallback(async (): Promise<boolean> => {
    if (state.isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [state.isSubscribed, subscribe, unsubscribe]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    toggleSubscription
  };
}

// Helper: Convertir base64 URL-safe a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
