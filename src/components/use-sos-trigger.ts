'use client';

import { useCallback, useRef, useState } from 'react';
import { useGeolocationCapture } from './use-geolocation-capture';

export interface TriggeredSosIncident {
  id: string;
  incidentNumber: string;
  status: string;
  severity: string;
  type: string;
  createdAt: string;
}

export type SosTriggerStatus = 'idle' | 'confirming' | 'submitting' | 'success' | 'error';

export interface UseSosTriggerResult {
  status: SosTriggerStatus;
  error: string | null;
  incident: TriggeredSosIncident | null;
  geolocationStatus: ReturnType<typeof useGeolocationCapture>['status'];
  requestConfirmation: () => void;
  cancelConfirmation: () => void;
  confirmAndTrigger: () => Promise<void>;
  reset: () => void;
}

/**
 * Shared SOS-trigger flow: explicit confirm step, best-effort location
 * capture (a location failure never blocks the trigger — see
 * useGeolocationCapture, which resolves null rather than throwing), and the
 * actual POST to the real /api/safety/sos endpoint. A fresh idempotency key
 * is minted per confirmation attempt so a user re-opening the confirm
 * dialog after a failed attempt gets a genuinely new attempt, while the
 * button is disabled during `submitting` to prevent an accidental
 * double-tap firing two requests for the one attempt — the server's own
 * 5-minute per-booking dedup (see safety-incident-service.ts) remains the
 * authoritative backstop either way.
 */
export function useSosTrigger(bookingId?: string | null): UseSosTriggerResult {
  const geolocation = useGeolocationCapture();
  const [status, setStatus] = useState<SosTriggerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<TriggeredSosIncident | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const requestConfirmation = useCallback(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
    setStatus('confirming');
    setError(null);
  }, []);

  const cancelConfirmation = useCallback(() => {
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setIncident(null);
  }, []);

  const confirmAndTrigger = useCallback(async () => {
    setStatus('submitting');
    setError(null);

    const location = await geolocation.capture();

    try {
      const res = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId ?? undefined,
          latitude: location?.latitude,
          longitude: location?.longitude,
          locationAccuracy: location?.accuracy ?? undefined,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger SOS.');
      }
      setIncident(data.incident);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger SOS.');
      setStatus('error');
    }
  }, [bookingId, geolocation]);

  return {
    status,
    error,
    incident,
    geolocationStatus: geolocation.status,
    requestConfirmation,
    cancelConfirmation,
    confirmAndTrigger,
    reset,
  };
}
