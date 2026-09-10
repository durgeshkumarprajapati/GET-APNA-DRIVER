'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';

interface Booking {
  id: string;
  status: string;
  bookingType: string;
  pickupLocation: {
    address: string;
    label: string | null;
  };
  createdAt: string;
  assignedDriver?: {
    displayName: string | null;
  } | null;
}

export default function BookingsListPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
        } else {
          setError('Failed to load bookings.');
        }
      } catch {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    void fetchBookings();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SEARCHING_DRIVER':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            Searching Driver
          </span>
        );
      case 'DRIVER_ASSIGNED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Driver Assigned
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            Cancelled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Bookings"
          title="My Bookings"
          subtitle="Your booking history and live status."
          actions={
            <Link
              href="/bookings/new"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors text-center"
            >
              + Create New Booking
            </Link>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
            Loading your bookings...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center space-y-4">
            <p className="text-slate-300 font-medium text-lg">
              You don&apos;t have any bookings yet.
            </p>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Create your first booking to request a verified professional driver for your trip.
            </p>
            <Link
              href="/bookings/new"
              className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              Book a Driver Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(booking.status)}
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {booking.bookingType.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {booking.pickupLocation.address}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Requested on: {new Date(booking.createdAt).toLocaleString()}
                  </p>
                  {booking.assignedDriver && (
                    <p className="text-xs text-emerald-400 font-medium">
                      Assigned Driver: {booking.assignedDriver.displayName || 'Professional Driver'}
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="w-full md:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-lg transition-colors text-center"
                  >
                    View Status Tracker →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
