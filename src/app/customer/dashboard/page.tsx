'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';

interface CustomerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  accountStatus: string;
  email: string | null;
  phoneNumber: string | null;
  createdAt: string;
}

interface BookingSummary {
  id: string;
  status: string;
  bookingType: string;
  pickupLocation: { address: string; label: string | null };
  requestedStartTime: string | null;
  createdAt: string;
}

const ACTIVE_BOOKING_STATUSES = new Set([
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_IN_PROGRESS',
]);

function customerDisplayName(profile: CustomerProfile): string {
  if (profile.displayName) return profile.displayName;
  const combined = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return combined || profile.email || 'there';
}

function statusBadgeClass(status: string): string {
  if (status === 'TRIP_COMPLETED') return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  if (ACTIVE_BOOKING_STATUSES.has(status)) {
    return 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]';
  }
  return 'bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]';
}

export default function CustomerDashboardPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          fetch('/api/customer/profile'),
          fetch('/api/bookings'),
        ]);
        if (isMounted) {
          if (profileRes.ok) {
            const data = await profileRes.json();
            setProfile(data.profile);
          }
          if (bookingsRes.ok) {
            const data = await bookingsRes.json();
            setBookings(data.bookings ?? []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeBookings = bookings.filter((b) => ACTIVE_BOOKING_STATUSES.has(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'TRIP_COMPLETED');

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">Loading dashboard…</div>
        ) : (
          <>
            {/* Profile Summary */}
            <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  Welcome back
                </span>
                <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  {profile ? customerDisplayName(profile) : 'Customer'}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#87948b]">
                  {profile?.email && <span>{profile.email}</span>}
                  {profile?.phoneNumber && <span>{profile.phoneNumber}</span>}
                  {profile && (
                    <span>Customer since {new Date(profile.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <Link
                href="/profile"
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-bold transition-colors shrink-0"
              >
                Edit Profile
              </Link>
            </section>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/bookings"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Active Bookings
                </span>
                <span className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                  {activeBookings.length}
                </span>
              </Link>
              <Link
                href="/bookings"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Completed Trips
                </span>
                <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  {completedBookings.length}
                </span>
              </Link>
              <Link
                href="/bookings/new"
                className="p-4 rounded-xl bg-[#25a475] hover:bg-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#00311f] uppercase font-['Space_Grotesk']">
                  New Booking
                </span>
                <span className="text-sm font-bold text-[#00311f] font-['Space_Grotesk'] flex items-center gap-1">
                  Book a Chauffeur
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </Link>
            </div>

            {/* Active Bookings */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Active Bookings
                </h2>
                <Link href="/bookings" className="text-xs font-mono text-[#68dba9] hover:underline">
                  View all →
                </Link>
              </div>
              {activeBookings.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  No active bookings right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBookings.slice(0, 5).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#dfe2ee]">
                          {booking.pickupLocation.label ?? booking.pickupLocation.address}
                        </p>
                        <p className="text-xs text-[#87948b]">{booking.bookingType}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(booking.status)}`}
                      >
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Bookings */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Recent Bookings
                </h2>
                <Link href="/bookings" className="text-xs font-mono text-[#68dba9] hover:underline">
                  View all →
                </Link>
              </div>
              {bookings.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  No bookings yet — your history will show up here.
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 5).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#dfe2ee]">
                          {booking.pickupLocation.label ?? booking.pickupLocation.address}
                        </p>
                        <p className="text-xs text-[#87948b]">
                          {new Date(booking.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(booking.status)}`}
                      >
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
