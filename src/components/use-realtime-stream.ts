'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'FAILED';

export interface RealTimeEventPayload {
  eventId?: string;
  bookingId?: string;
  eventType?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

export interface UseRealTimeStreamOptions {
  bookingId: string | null;
  enabled?: boolean;
  onBookingUpdate?: (event: RealTimeEventPayload) => void;
  onReconcile?: () => void;
}

const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 15000;
const MAX_RETRY_ATTEMPTS = 20;
const HEARTBEAT_TIMEOUT_MS = 35000;

export function useRealTimeStream({
  bookingId,
  enabled = true,
  onBookingUpdate,
  onReconcile,
}: UseRealTimeStreamOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [reconnectCount, setReconnectCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
  const attemptsRef = useRef(0);
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      // Heartbeat timeout — close dead connection and attempt reconnect
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionState('RECONNECTING');
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!bookingId || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState(attemptsRef.current === 0 ? 'CONNECTING' : 'RECONNECTING');

    try {
      const url = `/api/bookings/${bookingId}/stream`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('connected', (e: MessageEvent) => {
        setConnectionState('CONNECTED');
        attemptsRef.current = 0;
        retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
        resetHeartbeat();

        try {
          const data = JSON.parse(e.data);
          if (data.eventId) processedEventIdsRef.current.add(data.eventId);
        } catch {
          // Ignore
        }
      });

      es.addEventListener('ping', (e: MessageEvent) => {
        resetHeartbeat();
        try {
          const data = JSON.parse(e.data);
          if (data.eventId) processedEventIdsRef.current.add(data.eventId);
        } catch {
          // Ignore
        }
      });

      es.addEventListener('booking_update', (e: MessageEvent) => {
        resetHeartbeat();
        try {
          const data = JSON.parse(e.data) as RealTimeEventPayload;
          const eventId = data.eventId || (data.payload as Record<string, unknown>)?.messageId as string;

          // Event Deduplication check
          if (eventId && processedEventIdsRef.current.has(eventId)) {
            return; // Ignore duplicate event
          }
          if (eventId) {
            processedEventIdsRef.current.add(eventId);
            // Cap stored event IDs set to 200 items to avoid memory growth
            if (processedEventIdsRef.current.size > 200) {
              const items = Array.from(processedEventIdsRef.current);
              processedEventIdsRef.current = new Set(items.slice(50));
            }
          }

          if (onBookingUpdate) {
            onBookingUpdate(data);
          }
        } catch {
          // Ignore
        }
      });

      es.onerror = () => {
        clearTimers();
        es.close();
        eventSourceRef.current = null;

        if (attemptsRef.current >= MAX_RETRY_ATTEMPTS) {
          setConnectionState('FAILED');
          return;
        }

        setConnectionState('RECONNECTING');
        attemptsRef.current += 1;
        setReconnectCount((prev) => prev + 1);

        // Exponential backoff with random jitter (0 - 500ms)
        const jitter = Math.floor(Math.random() * 500);
        const nextDelay = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY_MS) + jitter;
        retryDelayRef.current = nextDelay;

        reconnectTimerRef.current = setTimeout(() => {
          connect();
          if (onReconcile) onReconcile();
        }, nextDelay);
      };
    } catch {
      setConnectionState('FAILED');
    }
  }, [bookingId, enabled, onBookingUpdate, onReconcile, resetHeartbeat, clearTimers]);

  // Tab visibility & Window Online listener for immediate recovery and state reconciliation
  useEffect(() => {
    if (!bookingId || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab brought to foreground — reconcile server state and reconnect if necessary
        if (onReconcile) onReconcile();

        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          attemptsRef.current = 0;
          retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
          connect();
        }
      }
    };

    const handleOnline = () => {
      // Network reconnected — reset retry delay and connect immediately
      attemptsRef.current = 0;
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
      connect();
      if (onReconcile) onReconcile();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [bookingId, enabled, connect, onReconcile]);

  // Initial connect on mount or bookingId change
  useEffect(() => {
    attemptsRef.current = 0;
    retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
    connect();

    return () => {
      clearTimers();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionState('DISCONNECTED');
    };
  }, [bookingId, enabled, connect, clearTimers]);

  const forceReconnect = useCallback(() => {
    attemptsRef.current = 0;
    retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
    connect();
    if (onReconcile) onReconcile();
  }, [connect, onReconcile]);

  return {
    connectionState,
    reconnectCount,
    forceReconnect,
  };
}
