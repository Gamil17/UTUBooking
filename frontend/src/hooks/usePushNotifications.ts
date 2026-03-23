'use client';

import { useState, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** Convert base64url VAPID public key to Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushState = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'error';

/**
 * Manages browser push notification subscription lifecycle.
 *
 * Usage:
 *   const { state, subscribe, unsubscribe } = usePushNotifications();
 *   // After user logs in:
 *   await subscribe(userId);
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>('idle');

  const subscribe = useCallback(async (userId: string) => {
    if (!('PushManager' in window)) {
      setState('error');
      return;
    }

    setState('requesting');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId }),
      });

      if (!res.ok) throw new Error('Failed to persist subscription');

      setState('subscribed');
    } catch (err) {
      console.error('[Push] subscription error:', err);
      setState('error');
    }
  }, []);

  const unsubscribe = useCallback(async (userId: string) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setState('idle');
    } catch (err) {
      console.error('[Push] unsubscribe error:', err);
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
