'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CorporateLayout } from '@/components/corporate-layout';

interface CorporateBooking {
  id: string;
  status: string;
  bookingType: string;
  estimatedFareAmount: string | null;
  finalFareAmount: string | null;
  businessPurpose: string | null;
  createdAt: string;
  customer: { fullName: string; email: string };
  bookedForUser?: { fullName: string; email: string } | null;
  department?: { name: string; code: string } | null;
  costCenter?: { name: string; code: string } | null;
}

export default function CorporateBookingsPage() {
  const [bookings, setBookings] = useState<CorporateBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch('/api/corporate/bookings');
        if (!res.ok) {
          throw new Error('Failed to load corporate bookings');
        }
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading corporate bookings');
      } finally {
        setLoading(false);
      }
    }
    void loadBookings();
  }, []);

  return (
    <CorporateLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
              RIDE MANAGEMENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Corporate Travel Roster
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
              Track business trips, allocated cost centers, department spend, and ride statuses.
            </p>
          </div>

          <Link
            href="/corporate/bookings/new"
            className="px-4 py-2.5 bg-[#25a475] hover:bg-[#208e65] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-[#25a475]/20"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Book Ride</span>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading corporate travel roster...
          </div>
        ) : (
          <div className="bg-[#141822] border border-[#262a33] rounded-2xl overflow-hidden shadow-xl">
            {bookings.length === 0 ? (
              <div className="p-12 text-center text-[#bccac0] text-xs font-mono space-y-3">
                <p>No corporate travel bookings found.</p>
                <Link
                  href="/corporate/bookings/new"
                  className="inline-block px-4 py-2 bg-[#25a475] text-[#00311f] font-bold rounded-lg text-xs"
                >
                  Create First Corporate Booking
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262a33] bg-[#0a0e16]/60 text-[11px] font-mono text-[#bccac0] uppercase tracking-wider">
                      <th className="p-3.5">Booking ID</th>
                      <th className="p-3.5">Booker / Passenger</th>
                      <th className="p-3.5">Department & Cost Center</th>
                      <th className="p-3.5">Business Purpose</th>
                      <th className="p-3.5">Fare</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Requested At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262a33] text-xs font-mono">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#1c2028] transition-colors">
                        <td className="p-3.5 font-bold text-[#dfe2ee]">#{b.id.substring(0, 8)}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#dfe2ee]">{b.bookedForUser?.fullName || b.customer.fullName}</div>
                          <div className="text-[10px] text-[#87948b]">{b.customer.email}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-[#dfe2ee] font-semibold">{b.department?.name || 'General'}</div>
                          <div className="text-[10px] text-[#68dba9]">{b.costCenter?.code || 'CC-DEFAULT'}</div>
                        </td>
                        <td className="p-3.5 text-[#bccac0] max-w-xs truncate">
                          {b.businessPurpose || 'Corporate Travel'}
                        </td>
                        <td className="p-3.5 font-bold text-[#68dba9]">
                          ₹{Number(b.finalFareAmount || b.estimatedFareAmount || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#1e2330] border border-[#262a33] text-[10px] uppercase font-bold text-[#dfe2ee]">
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#87948b]">
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </CorporateLayout>
  );
}
