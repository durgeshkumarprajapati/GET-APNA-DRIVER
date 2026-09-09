'use client';

import { useCallback, useState } from 'react';
import type { LocationAcquisitionStatus } from './use-auto-location';

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
}

export interface UseGeolocationCaptureResult {
  status: LocationAcquisitionStatus;
  errorMessage: string | null;
  location: CapturedLocation | null;
  /** Resolves with the captured location, or null if capture failed/is unsupported — never throws, so a caller can proceed without location on failure. */
  capture: () => Promise<CapturedLocation | null>;
}

/**
 * One-shot geolocation capture with no server side-effect — unlike
 * useAutoLocation (which auto-POSTs to the driver/customer live-location
 * endpoint on every mount), this just returns a single reading for the
 * caller to include in its own payload (e.g. the SOS trigger body). Shared
 * by the customer and driver SOS pages so both handle permission-denied/
 * timeout/unsupported/unavailable identically instead of duplicating the
 * error-code branching.
 */
export function useGeolocationCapture(): UseGeolocationCaptureResult {
  const [status, setStatus] = useState<LocationAcquisitionStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<CapturedLocation | null>(null);

  const capture = useCallback((): Promise<CapturedLocation | null> => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('UNSUPPORTED');
      setErrorMessage('Location is not supported by your browser.');
      return Promise.resolve(null);
    }

    setStatus('ACQUIRING');
    setErrorMessage(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const captured: CapturedLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            capturedAt: new Date().toISOString(),
          };
          setLocation(captured);
          setStatus('SUCCESS');
          resolve(captured);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setStatus('DENIED');
            setErrorMessage('Location permission denied.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setStatus('UNAVAILABLE');
            setErrorMessage('Current position is unavailable.');
          } else if (error.code === error.TIMEOUT) {
            setStatus('TIMEOUT');
            setErrorMessage('Location acquisition timed out.');
          } else {
            setStatus('UNAVAILABLE');
            setErrorMessage('Failed to acquire your location.');
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }, []);

  return { status, errorMessage, location, capture };
}
