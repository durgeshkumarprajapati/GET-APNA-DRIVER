'use client';

import { useEffect, useState, useCallback } from 'react';

export type LocationAcquisitionStatus =
  'IDLE' | 'ACQUIRING' | 'SUCCESS' | 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

export interface UseAutoLocationResult {
  status: LocationAcquisitionStatus;
  errorMessage: string | null;
  acquireLocation: () => void;
}

export function useAutoLocation(userType: 'CUSTOMER' | 'DRIVER'): UseAutoLocationResult {
  const [status, setStatus] = useState<LocationAcquisitionStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const acquireLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('UNSUPPORTED');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('ACQUIRING');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          const endpoint =
            userType === 'DRIVER' ? '/api/driver/location/current' : '/api/location/current';
          const method = userType === 'DRIVER' ? 'PUT' : 'POST';

          await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy,
              source: 'BROWSER_GPS',
            }),
          });

          setStatus('SUCCESS');
        } catch {
          // Failure to save transient location to API does not break application navigation
          setStatus('SUCCESS');
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('DENIED');
          setErrorMessage('Location permission denied. You can still set pickup address manually.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatus('UNAVAILABLE');
          setErrorMessage('Current position is unavailable.');
        } else if (error.code === error.TIMEOUT) {
          setStatus('TIMEOUT');
          setErrorMessage('Location acquisition timed out.');
        } else {
          setStatus('UNAVAILABLE');
          setErrorMessage('Failed to acquire browser location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }, [userType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      acquireLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [acquireLocation]);

  return { status, errorMessage, acquireLocation };
}
