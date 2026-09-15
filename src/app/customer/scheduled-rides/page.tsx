'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { useTranslation } from '@/i18n/context';

interface ScheduledRideSummary {
  id: string;
  status: 'SCHEDULED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  scheduleType: 'ONE_TIME' | 'RECURRING';
  recurrenceFrequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM_DAYS' | null;
  daysOfWeek?: number[];
  scheduledTime: string;
  scheduledDate?: string | null;
  nextRunAt?: string | null;
  pickupLocation: { address: string; label?: string | null };
  dropoffLocation?: { address: string; label?: string | null } | null;
  preferredDriverProfileId?: string | null;
  createdAt: string;
}

export default function CustomerScheduledRidesPage() {
  const { t, formatDate } = useTranslation();
  const [scheduledRides, setScheduledRides] = useState<ScheduledRideSummary[]>([]);
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  >('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchScheduledRides = async () => {
    try {
      const res = await fetch('/api/customer/scheduled-rides');
      if (res.ok) {
        const data = await res.json();
        setScheduledRides(data.scheduledRides ?? []);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to fetch scheduled rides.');
      }
    } catch {
      setError('An unexpected error occurred.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/customer/scheduled-rides');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setScheduledRides(data.scheduledRides ?? []);
        } else {
          const errData = await res.json();
          setError(errData.message || 'Failed to fetch scheduled rides.');
        }
      } catch {
        if (isMounted) setError('An unexpected error occurred.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePause = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}/pause`, { method: 'POST' });
      if (res.ok) {
        await fetchScheduledRides();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to pause schedule.');
      }
    } catch {
      alert('Network error while pausing schedule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResume = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        await fetchScheduledRides();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to resume schedule.');
      }
    } catch {
      alert('Network error while resuming schedule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (
      !confirm(
        t('scheduledRides.confirmCancel') || 'Are you sure you want to cancel this scheduled ride?',
      )
    ) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchScheduledRides();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to cancel schedule.');
      }
    } catch {
      alert('Network error while cancelling schedule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRides = scheduledRides.filter((ride) => {
    if (activeTab === 'ACTIVE') return ride.status === 'SCHEDULED';
    if (activeTab === 'PAUSED') return ride.status === 'PAUSED';
    if (activeTab === 'COMPLETED') return ride.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return ride.status === 'CANCELLED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
      case 'PAUSED':
        return 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]';
      case 'COMPLETED':
        return 'bg-[#1c2028] text-[#87948b] border border-[#262a33]';
      case 'CANCELLED':
        return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
      default:
        return 'bg-[#262a33] text-[#dfe2ee]';
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
              {t('scheduledRides.title')}
            </span>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              {t('scheduledRides.subtitle')}
            </h1>
          </div>
          <Link
            href="/bookings/new?mode=schedule"
            className="px-4 py-2.5 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold transition-colors shrink-0 flex items-center gap-2 font-['Space_Grotesk']"
          >
            <span className="material-symbols-outlined text-base">add_alarm</span>
            {t('scheduledRides.createBtn')}
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[#262a33] pb-3 overflow-x-auto">
          {(['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold font-['Space_Grotesk'] transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#25a475] text-[#00311f]'
                  : 'bg-[#181c24] text-[#87948b] hover:text-[#dfe2ee] border border-[#262a33]'
              }`}
            >
              {tab === 'ALL'
                ? t('common.labels.all', { defaultValue: 'All' })
                : t(`scheduledRides.status.${tab.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">
            {t('common.labels.loading')}
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[#262a33] bg-[#181c24] text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#87948b]">
              calendar_today
            </span>
            <p className="text-sm text-[#87948b]">{t('scheduledRides.noRides')}</p>
            <Link
              href="/bookings/new?mode=schedule"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25a475] text-[#00311f] text-xs font-bold font-['Space_Grotesk']"
            >
              {t('scheduledRides.createBtn')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/40 rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-['Space_Grotesk'] uppercase ${getStatusBadge(
                        ride.status,
                      )}`}
                    >
                      {t(`scheduledRides.status.${ride.status.toLowerCase()}`)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#262a33] text-[#68dba9] font-['Space_Grotesk'] uppercase">
                      {ride.scheduleType === 'RECURRING'
                        ? t(
                            `scheduledRides.frequency.${ride.recurrenceFrequency?.toLowerCase() ?? 'daily'}`,
                          )
                        : t('scheduledRides.oneTime')}
                    </span>
                    {ride.scheduleType === 'RECURRING' &&
                      ride.daysOfWeek &&
                      ride.daysOfWeek.length > 0 && (
                        <span className="text-xs text-[#87948b] font-mono">
                          ({ride.daysOfWeek.map((d) => dayNames[d]).join(', ')})
                        </span>
                      )}
                  </div>

                  {/* Route */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#dfe2ee]">
                      <span className="w-2 h-2 rounded-full bg-[#68dba9] shrink-0" />
                      <span className="truncate">
                        {ride.pickupLocation.label || ride.pickupLocation.address}
                      </span>
                    </div>
                    {ride.dropoffLocation && (
                      <div className="flex items-center gap-2 text-sm text-[#87948b]">
                        <span className="w-2 h-2 rounded-full bg-[#ffb4ab] shrink-0" />
                        <span className="truncate">
                          {ride.dropoffLocation.label || ride.dropoffLocation.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timings */}
                  <div className="flex flex-wrap gap-4 text-xs font-mono text-[#87948b]">
                    <span>
                      ⏰ Time: <strong className="text-[#dfe2ee]">{ride.scheduledTime}</strong>
                    </span>
                    {ride.nextRunAt && (
                      <span>
                        📅 Next Run:{' '}
                        <strong className="text-[#68dba9]">{formatDate(ride.nextRunAt)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-[#262a33] pt-3 md:pt-0">
                  <Link
                    href={`/customer/scheduled-rides/${ride.id}`}
                    className="px-3.5 py-2 rounded-xl bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-bold transition-colors"
                  >
                    {t('scheduledRides.viewDetails')}
                  </Link>

                  {ride.status === 'SCHEDULED' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === ride.id}
                      onClick={() => handlePause(ride.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#3a2f00] hover:bg-[#5c4a00] text-[#f5c04a] text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {t('scheduledRides.pauseBtn')}
                    </button>
                  )}

                  {ride.status === 'PAUSED' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === ride.id}
                      onClick={() => handleResume(ride.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#00311f] hover:bg-[#25a475] text-[#68dba9] hover:text-[#00311f] text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {t('scheduledRides.resumeBtn')}
                    </button>
                  )}

                  {(ride.status === 'SCHEDULED' || ride.status === 'PAUSED') && (
                    <button
                      type="button"
                      disabled={actionLoadingId === ride.id}
                      onClick={() => handleCancel(ride.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#93000a]/50 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {t('scheduledRides.cancelBtn')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
