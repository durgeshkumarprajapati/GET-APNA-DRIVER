'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

type BookingStatus =
  | 'DRAFT'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'TRIP_IN_PROGRESS'
  | 'TRIP_COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

interface DispatchBookingSummary {
  id: string;
  status: BookingStatus;
  bookingType: string;
  pickupAddress: string;
  requestedStartTime: string | null;
  createdAt: string;
  customer: { id: string; email: string | null; phoneNumber: string | null };
  assignedDriver: { id: string; name: string } | null;
  pendingAttemptCount: number;
}

interface ListResponse {
  bookings: DispatchBookingSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_FILTERS: (BookingStatus | 'ALL')[] = [
  'ALL',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_IN_PROGRESS',
  'TRIP_COMPLETED',
  'CANCELLED',
  'EXPIRED',
];

function statusBadgeClass(status: string): string {
  if (status === 'TRIP_COMPLETED') return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  if (status === 'SEARCHING_DRIVER') {
    return 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]';
  }
  return 'bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]';
}

const PAGE_SIZE = 25;

export default function AdminLiveBookingsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);

    fetch(`/api/admin/bookings?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: ListResponse) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setData(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, status, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">local_taxi</span>
              <span>LIVE BOOKING OPERATIONS</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Live Bookings
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              {data ? `${data.total} booking${data.total === 1 ? '' : 's'}` : '—'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search customer email/phone..."
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as (typeof STATUS_FILTERS)[number]);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-[#87948b] text-sm">Loading bookings…</div>
          ) : !data || data.bookings.length === 0 ? (
            <div className="py-16 text-center text-[#87948b] text-sm">
              No bookings match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Pickup</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Pending Offers</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {data.bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-[#181c24]/60 transition-colors">
                      <td className="py-3 px-4 text-[#bccac0]">
                        <span className="block">{booking.customer.email ?? '—'}</span>
                        {booking.customer.phoneNumber && (
                          <span className="block text-[10px] text-[#87948b]">
                            {booking.customer.phoneNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#dfe2ee] max-w-[220px] truncate">
                        {booking.pickupAddress}
                      </td>
                      <td className="py-3 px-4 text-[#87948b]">{booking.bookingType}</td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        {booking.assignedDriver?.name ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">{booking.pendingAttemptCount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(booking.status)}`}
                        >
                          {booking.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/live-bookings/${booking.id}`}
                          className="text-[#68dba9] hover:underline text-xs font-semibold"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-[#87948b]">
              <span>
                Page {data.page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
