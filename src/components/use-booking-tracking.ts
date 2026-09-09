'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TrackedBookingLocation {
  pickupLocation: { latitude: number; longitude: number; address: string; label: string | null };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  } | null;
}

export interface TrackedDriver {
  id: string;
  displayName: string | null;
  profileImageUrl: string | null;
  primaryServiceArea: string | null;
  drivingExperienceYears: number;
}

export interface TrackedBooking extends TrackedBookingLocation {
  id: string;
  status: string;
  bookingType: string;
  requestedStartTime: string | null;
  estimatedDurationMinutes: number | null;
  customerNotes: string | null;
  requestedAt: string;
  assignedAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  expiresAt: string | null;
  assignedDriver?: TrackedDriver | null;
}

export interface TrackedDriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  capturedAt: string;
}

const ACTIVE_TRACKING_STATES = [
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_IN_PROGRESS',
];

export interface UseBookingTrackingResult<TBooking extends TrackedBooking> {
  booking: TBooking | null;
  driverLocation: TrackedDriverLocation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Live booking + driver-location tracking: polls the booking every 6s,
 * listens on the existing SSE stream (used purely as a "something changed,
 * refetch" signal) and, while the booking is in an active tracking state,
 * polls driver-location every 4s. This is the exact mechanism
 * /bookings/[bookingId]/page.tsx already used — extracted here so
 * /customer/active-tracking can reuse it instead of standing up a second,
 * divergent polling implementation for the same data.
 */
export function useBookingTracking<TBooking extends TrackedBooking = TrackedBooking>(
  bookingId: string | null,
): UseBookingTrackingResult<TBooking> {
  const [booking, setBooking] = useState<TBooking | null>(null);
  const [driverLocation, setDriverLocation] = useState<TrackedDriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to load booking details.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const fetchDriverLocation = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/driver-location`);
      if (res.ok) {
        const data = await res.json();
        setDriverLocation(data.location);
      } else {
        setDriverLocation(null);
      }
    } catch {
      // Non-critical tracking poll
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) {
      return;
    }
    let isMounted = true;
    const run = async () => {
      if (isMounted) await fetchBooking();
    };
    void run();
    const interval = setInterval(() => {
      if (isMounted) void fetchBooking();
    }, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bookingId, fetchBooking]);

  useEffect(() => {
    if (!bookingId) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/bookings/${bookingId}/stream`);
      eventSource.addEventListener('booking_update', () => {
        void fetchBooking();
      });
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // Fall back to polling
    }
    return () => {
      eventSource?.close();
    };
  }, [bookingId, fetchBooking]);

  useEffect(() => {
    if (!booking || !ACTIVE_TRACKING_STATES.includes(booking.status)) {
      return;
    }
    let isMounted = true;
    void (async () => {
      await fetchDriverLocation();
    })();
    const locInterval = setInterval(() => {
      if (isMounted) void fetchDriverLocation();
    }, 4000);
    return () => {
      isMounted = false;
      clearInterval(locInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.status, fetchDriverLocation]);

  return {
    booking,
    driverLocation,
    // No bookingId means there is nothing to load at all — never stuck
    // showing a loading spinner for a fetch that was never started.
    loading: bookingId ? loading : false,
    error,
    refetch: fetchBooking,
  };
}
