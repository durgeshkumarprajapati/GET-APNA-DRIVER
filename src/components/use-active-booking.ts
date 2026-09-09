'use client';

import { useEffect, useState } from 'react';

/** Mirrors ACTIVE_BOOKING_STATUSES used server-side (e.g. admin dashboard-service.ts). */
const ACTIVE_BOOKING_STATUSES = new Set([
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_IN_PROGRESS',
]);

interface BookingLike {
  id: string;
  status: string;
  createdAt: string;
}

export interface UseActiveBookingResult<T extends BookingLike> {
  activeBooking: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Resolves "my current active booking" from an existing list endpoint —
 * there is no dedicated "get my active booking" API, so this fetches the
 * caller's own booking list (customer: /api/bookings, driver:
 * /api/driver/bookings) and picks the most recent one still in an active
 * lifecycle state. Shared by /customer/safety-sos, /driver/sos-support, and
 * /customer/active-tracking so each doesn't reimplement this resolution.
 */
export function useActiveBooking<T extends BookingLike>(
  listUrl: string,
  listKey: string,
): UseActiveBookingResult<T> {
  const [activeBooking, setActiveBooking] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(listUrl);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          const list: T[] = data[listKey] ?? [];
          const active = list
            .filter((b) => ACTIVE_BOOKING_STATUSES.has(b.status))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActiveBooking(active[0] ?? null);
          setError(null);
        } else {
          setError('Failed to load your bookings.');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load bookings.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [listUrl, listKey, refetchToken]);

  return {
    activeBooking,
    loading,
    error,
    refetch: () => setRefetchToken((t) => t + 1),
  };
}
