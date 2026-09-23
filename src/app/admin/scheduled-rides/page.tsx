'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/context';

interface AdminScheduledRide {
  id: string;
  customerId: string;
  customer?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  status: 'SCHEDULED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  scheduleType: 'ONE_TIME' | 'RECURRING';
  recurrenceFrequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM_DAYS' | null;
  daysOfWeek?: number[];
  scheduledTime: string;
  nextRunAt?: string | null;
  pickupLocation: { address: string; label?: string | null };
  dropoffLocation?: { address: string; label?: string | null } | null;
  bookingType: string;
  preferredDriverProfileId?: string | null;
  createdAt: string;
}

export default function AdminScheduledRidesPage() {
  const { t, formatDate } = useTranslation();
  const [scheduledRides, setScheduledRides] = useState<AdminScheduledRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchRides = async () => {
    try {
      const res = await fetch('/api/admin/scheduled-rides');
      if (res.ok) {
        const data = await res.json();
        setScheduledRides(data.scheduledRides ?? []);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to load scheduled bookings.');
      }
    } catch {
      setError('Network error fetching scheduled bookings.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/scheduled-rides');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setScheduledRides(data.scheduledRides ?? []);
        } else {
          const errData = await res.json();
          setError(errData.message || 'Failed to load scheduled bookings.');
        }
      } catch {
        if (isMounted) setError('Network error fetching scheduled bookings.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAdminCancel = async (id: string) => {
    const reason = prompt('Reason for admin cancellation:');
    if (!reason) return;

    setCancellingId(id);
    try {
      const res = await fetch(`/api/admin/scheduled-rides/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        await fetchRides();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to cancel schedule.');
      }
    } catch {
      alert('Network error while cancelling schedule.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRides = scheduledRides.filter((ride) => {
    if (statusFilter !== 'ALL' && ride.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && ride.scheduleType !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCustomer =
        ride.customer?.email?.toLowerCase().includes(q) ||
        ride.customer?.firstName?.toLowerCase().includes(q) ||
        ride.customer?.lastName?.toLowerCase().includes(q);
      const matchId = ride.id.toLowerCase().includes(q);
      const matchPickup = ride.pickupLocation.address.toLowerCase().includes(q);
      if (!matchCustomer && !matchId && !matchPickup) return false;
    }
    return true;
  });

  const counts = {
    total: scheduledRides.length,
    active: scheduledRides.filter((r) => r.status === 'SCHEDULED').length,
    paused: scheduledRides.filter((r) => r.status === 'PAUSED').length,
    completed: scheduledRides.filter((r) => r.status === 'COMPLETED').length,
    cancelled: scheduledRides.filter((r) => r.status === 'CANCELLED').length,
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl">
        <div>
          <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
            {t('scheduledRides.adminTitle')}
          </span>
          <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Fleet Scheduled & Recurring Bookings Console
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#181c24] border border-[#262a33] rounded-xl p-4">
          <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
            Total Schedules
          </span>
          <p className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            {counts.total}
          </p>
        </div>
        <div className="bg-[#181c24] border border-[#262a33] rounded-xl p-4">
          <span className="text-[10px] font-bold text-[#68dba9] uppercase font-['Space_Grotesk']">
            Active
          </span>
          <p className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
            {counts.active}
          </p>
        </div>
        <div className="bg-[#181c24] border border-[#262a33] rounded-xl p-4">
          <span className="text-[10px] font-bold text-[#f5c04a] uppercase font-['Space_Grotesk']">
            Paused
          </span>
          <p className="text-xl font-bold text-[#f5c04a] font-['Space_Grotesk'] mt-1">
            {counts.paused}
          </p>
        </div>
        <div className="bg-[#181c24] border border-[#262a33] rounded-xl p-4">
          <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
            Completed
          </span>
          <p className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            {counts.completed}
          </p>
        </div>
        <div className="bg-[#181c24] border border-[#262a33] rounded-xl p-4">
          <span className="text-[10px] font-bold text-[#ffb4ab] uppercase font-['Space_Grotesk']">
            Cancelled
          </span>
          <p className="text-xl font-bold text-[#ffb4ab] font-['Space_Grotesk'] mt-1">
            {counts.cancelled}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#181c24] border border-[#262a33] rounded-xl p-4">
        <input
          type="text"
          placeholder="Search customer, ID, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9] w-full"
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Active / Scheduled</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
          >
            <option value="ALL">All Types</option>
            <option value="ONE_TIME">One Time</option>
            <option value="RECURRING">Recurring</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#181c24] border border-[#262a33] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">
            {t('common.labels.loading')}
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="p-8 text-center text-[#87948b] text-sm">
            No scheduled bookings match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0e16] text-[#87948b] uppercase font-['Space_Grotesk'] border-b border-[#262a33]">
                <tr>
                  <th className="p-3.5">Schedule ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Type & Recurrence</th>
                  <th className="p-3.5">Pickup Location</th>
                  <th className="p-3.5">Time / Next Run</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33]">
                {filteredRides.map((ride) => (
                  <tr key={ride.id} className="hover:bg-[#1f242e] transition-colors">
                    <td className="p-3.5 font-mono text-[#dfe2ee]">{ride.id.substring(0, 8)}...</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-[#dfe2ee]">
                        {ride.customer?.firstName
                          ? `${ride.customer.firstName} ${ride.customer.lastName || ''}`
                          : 'Customer'}
                      </div>
                      <div className="text-[#87948b] font-mono text-[11px]">
                        {ride.customer?.email}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-[#68dba9]">
                        {ride.scheduleType === 'RECURRING' ? ride.recurrenceFrequency : 'ONE_TIME'}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#dfe2ee] max-w-[200px] truncate">
                      {ride.pickupLocation.label || ride.pickupLocation.address}
                    </td>
                    <td className="p-3.5 font-mono">
                      <div className="text-[#dfe2ee]">{ride.scheduledTime}</div>
                      <div className="text-[#87948b] text-[11px]">
                        {ride.nextRunAt ? formatDate(ride.nextRunAt) : 'N/A'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          ride.status === 'SCHEDULED'
                            ? 'bg-[#00311f] text-[#68dba9]'
                            : ride.status === 'PAUSED'
                              ? 'bg-[#3a2f00] text-[#f5c04a]'
                              : ride.status === 'CANCELLED'
                                ? 'bg-[#93000a]/20 text-[#ffb4ab]'
                                : 'bg-[#262a33] text-[#87948b]'
                        }`}
                      >
                        {ride.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {(ride.status === 'SCHEDULED' || ride.status === 'PAUSED') && (
                        <button
                          type="button"
                          disabled={cancellingId === ride.id}
                          onClick={() => handleAdminCancel(ride.id)}
                          className="px-2.5 py-1 rounded bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#93000a]/50 text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                          Cancel Schedule
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
