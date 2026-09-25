'use client';

import { useEffect, useCallback } from 'react';

export interface MultiTabSyncEvent {
  type: 'MESSAGES_READ' | 'MESSAGE_SENT' | 'BOOKING_UPDATED';
  bookingId: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

const CHANNEL_NAME = 'get_apna_driver_sync';

export function useMultiTabSync(
  bookingId: string | null,
  onSyncEvent?: (event: MultiTabSyncEvent) => void,
) {
  const broadcast = useCallback(
    (type: MultiTabSyncEvent['type'], payload?: Record<string, unknown>) => {
      if (!bookingId || typeof window === 'undefined') return;

      const event: MultiTabSyncEvent = {
        type,
        bookingId,
        timestamp: Date.now(),
        payload,
      };

      if ('BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel(CHANNEL_NAME);
          channel.postMessage(event);
          channel.close();
        } catch {
          localStorage.setItem(CHANNEL_NAME, JSON.stringify(event));
        }
      } else {
        localStorage.setItem(CHANNEL_NAME, JSON.stringify(event));
      }
    },
    [bookingId],
  );

  useEffect(() => {
    if (!bookingId || typeof window === 'undefined') return;

    const handleEvent = (event: MultiTabSyncEvent) => {
      if (event.bookingId === bookingId && onSyncEvent) {
        onSyncEvent(event);
      }
    };

    if ('BroadcastChannel' in window) {
      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (e: MessageEvent<MultiTabSyncEvent>) => {
          handleEvent(e.data);
        };
      } catch {
        // Ignore fallback
      }

      return () => {
        if (channel) channel.close();
      };
    } else {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === CHANNEL_NAME && e.newValue) {
          try {
            const data = JSON.parse(e.newValue) as MultiTabSyncEvent;
            handleEvent(data);
          } catch {
            // Ignore
          }
        }
      };

      const win = window as Window;
      win.addEventListener('storage', handleStorage);
      return () => {
        win.removeEventListener('storage', handleStorage);
      };
    }
  }, [bookingId, onSyncEvent]);

  return { broadcast };
}
