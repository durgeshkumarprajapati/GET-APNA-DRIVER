'use client';

import { useEffect, useState, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const GAD_WEB_PUSH_ENABLED_KEY = 'gad_web_push_enabled';

/**
 * Synchronizes the browser's Web Push subscription with the backend database
 * for the currently logged-in user session.
 */
export async function syncWebPush(options?: { promptIfDefault?: boolean }): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission === 'default' && options?.promptIfDefault) {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
  }

  if (permission !== 'granted') {
    return false;
  }

  try {
    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) return false;
    const keyData = (await keyRes.json()) as { publicKey?: string };
    if (!keyData.publicKey) return false;

    const reg = await navigator.serviceWorker.register('/sw.js');
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource,
        })
        .catch(() => null);
    }

    if (!sub) return false;

    const p256dhKey = sub.getKey('p256dh');
    const authKey = sub.getKey('auth');
    if (!p256dhKey || !authKey) return false;

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
        },
        userAgent: navigator.userAgent,
      }),
    });

    if (res.ok) {
      localStorage.setItem(GAD_WEB_PUSH_ENABLED_KEY, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Auto Web Push Hook:
 * Automatically checks and syncs Web Push notification subscriptions whenever
 * a Customer or Driver visits any page in the portal, ensuring that once enabled
 * on a browser device, it remains continuously active across all logins.
 */
export function useAutoWebPush(): {
  isSupported: boolean;
  isPushActive: boolean;
  enablePush: () => Promise<boolean>;
  syncPush: () => Promise<boolean>;
} {
  const [isSupported, setIsSupported] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setIsSupported(true);
      const isGranted = Notification.permission === 'granted';
      const wasEnabled = localStorage.getItem(GAD_WEB_PUSH_ENABLED_KEY) === 'true';

      if (isGranted || wasEnabled) {
        void syncWebPush().then((active) => {
          setIsPushActive(active);
        });
      }
    }
  }, []);

  const enablePush = useCallback(async () => {
    const success = await syncWebPush({ promptIfDefault: true });
    setIsPushActive(success);
    return success;
  }, []);

  const syncPush = useCallback(async () => {
    const success = await syncWebPush();
    setIsPushActive(success);
    return success;
  }, []);

  return { isSupported, isPushActive, enablePush, syncPush };
}
