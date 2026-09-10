'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';

interface DriverBooking {
  id: string;
  customerId: string;
  status: string;
  bookingType: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  requestedStartTime: string | null;
  estimatedDurationMinutes: number | null;
  customerNotes: string | null;
  assignedAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  createdAt: string;
}

export default function DriverBookingsListPage() {
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/driver/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to fetch assigned bookings.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/bookings');
        if (res.ok && isMounted) {
          const data = await res.json();
          setBookings(data.bookings || []);
          setError(null);
        } else if (isMounted) {
          const data = await res.json();
          setError(data.message || 'Failed to fetch assigned bookings.');
        }
      } catch {
        if (isMounted) setError('Error connecting to server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
            Loading assigned trips...
          </div>
        </div>
      </DriverLayout>
    );
  }

  const activeBookings = bookings.filter(
    (b) => !['TRIP_COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status),
  );
  const pastBookings = bookings.filter((b) =>
    ['TRIP_COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status),
  );

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Driver Journey Portal</h1>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void fetchBookings();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors self-start md:self-auto"
          >
            Refresh Trips
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Active Trips Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Driver Assignments ({activeBookings.length})
          </h2>

          {activeBookings.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              No active trip assignments right now. Make sure your availability is set to AVAILABLE.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/driver/bookings/${b.id}`}
                  className="group bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-6 transition-all shadow-lg space-y-4 block"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      #{b.id.substring(0, 8)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {b.pickupLocation.address}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Type: {b.bookingType.replace(/_/g, ' ')} | Est:{' '}
                      {b.estimatedDurationMinutes || 60}m
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                    <span>Manage Trip Controls →</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(b.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Past Trips Section */}
        {pastBookings.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-lg font-bold text-slate-300">
              Completed & Past Trips ({pastBookings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-3 opacity-80"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{b.id.substring(0, 8)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{b.pickupLocation.address}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Completed:{' '}
                      {b.tripCompletedAt ? new Date(b.tripCompletedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DriverLayout>
  );
}
