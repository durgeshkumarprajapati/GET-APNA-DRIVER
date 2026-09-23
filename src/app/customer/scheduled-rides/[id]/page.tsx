'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { useTranslation } from '@/i18n/context';

interface OccurrenceLog {
  id: string;
  occurrenceStart: string;
  status: 'GENERATED' | 'FAILED' | 'SKIPPED';
  generatedBookingId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

interface ScheduledRideDetail {
  id: string;
  status: 'SCHEDULED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  scheduleType: 'ONE_TIME' | 'RECURRING';
  recurrenceFrequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM_DAYS' | null;
  daysOfWeek?: number[];
  scheduledTime: string;
  scheduledDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  nextRunAt?: string | null;
  pickupLocation: { address: string; label?: string | null; latitude: number; longitude: number };
  dropoffLocation?: {
    address: string;
    label?: string | null;
    latitude: number;
    longitude: number;
  } | null;
  bookingType: string;
  preferredDriverProfileId?: string | null;
  preferredDriver?: {
    driverProfileId: string;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  occurrenceLogs?: OccurrenceLog[];
  createdAt: string;
}

export default function ScheduledRideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const id = params?.id as string;

  const [ride, setRide] = useState<ScheduledRideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRide(data.scheduledRide);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to fetch schedule details.');
      }
    } catch {
      setError('An unexpected error occurred.');
    }
  };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/customer/scheduled-rides/${id}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setRide(data.scheduledRide);
        } else {
          const errData = await res.json();
          setError(errData.message || 'Failed to fetch schedule details.');
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
  }, [id]);

  const handlePause = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}/pause`, { method: 'POST' });
      if (res.ok) {
        await fetchDetail();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to pause.');
      }
    } catch {
      alert('Error pausing schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        await fetchDetail();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to resume.');
      }
    } catch {
      alert('Error resuming schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (
      !confirm(
        t('scheduledRides.confirmCancel') || 'Are you sure you want to cancel this schedule?',
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/customer/scheduled-rides/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/customer/scheduled-rides');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to cancel.');
        setActionLoading(false);
      }
    } catch {
      alert('Error cancelling schedule.');
      setActionLoading(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#87948b]">
          <Link href="/customer/scheduled-rides" className="hover:text-[#68dba9] transition-colors">
            ← {t('scheduledRides.title')}
          </Link>
          <span>/</span>
          <span className="text-[#dfe2ee]">{id}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">
            {t('common.labels.loading')}
          </div>
        ) : error || !ride ? (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error || 'Schedule not found.'}
          </div>
        ) : (
          <>
            {/* Header Banner */}
            <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                    {ride.scheduleType === 'RECURRING'
                      ? t(
                          `scheduledRides.frequency.${ride.recurrenceFrequency?.toLowerCase() ?? 'daily'}`,
                        )
                      : t('scheduledRides.oneTime')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#00311f] text-[#68dba9] border border-[#25a475] font-['Space_Grotesk'] uppercase">
                    {t(`scheduledRides.status.${ride.status.toLowerCase()}`)}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  Scheduled Booking #{ride.id.substring(0, 8)}
                </h1>
                <p className="text-xs text-[#87948b] font-mono mt-0.5">
                  Created on {formatDate(ride.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {ride.status === 'SCHEDULED' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handlePause}
                    className="px-4 py-2 rounded-xl bg-[#3a2f00] hover:bg-[#5c4a00] text-[#f5c04a] text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {t('scheduledRides.pauseBtn')}
                  </button>
                )}
                {ride.status === 'PAUSED' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleResume}
                    className="px-4 py-2 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {t('scheduledRides.resumeBtn')}
                  </button>
                )}
                {(ride.status === 'SCHEDULED' || ride.status === 'PAUSED') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#93000a]/50 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {t('scheduledRides.cancelBtn')}
                  </button>
                )}
              </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Route & Booking Info */}
              <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider text-[#68dba9]">
                  Route & Preferences
                </h2>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#87948b] uppercase">
                      Pickup Location
                    </span>
                    <p className="text-sm text-[#dfe2ee] font-semibold mt-0.5">
                      {ride.pickupLocation.label || ride.pickupLocation.address}
                    </p>
                  </div>

                  {ride.dropoffLocation && (
                    <div>
                      <span className="text-[10px] font-bold text-[#87948b] uppercase">
                        Dropoff Location
                      </span>
                      <p className="text-sm text-[#dfe2ee] font-semibold mt-0.5">
                        {ride.dropoffLocation.label || ride.dropoffLocation.address}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#262a33] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#87948b] block">Service Type</span>
                      <strong className="text-[#dfe2ee]">
                        {t(`booking.types.${ride.bookingType}`)}
                      </strong>
                    </div>
                    {ride.preferredDriver && (
                      <div>
                        <span className="text-[#87948b] block">Preferred Driver</span>
                        <strong className="text-[#68dba9]">
                          {ride.preferredDriver.displayName ||
                            [ride.preferredDriver.firstName, ride.preferredDriver.lastName]
                              .filter(Boolean)
                              .join(' ') ||
                            'Preferred Driver'}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recurrence Schedule Info */}
              <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider text-[#68dba9]">
                  Schedule Configuration
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#87948b] block">Scheduled Time</span>
                      <strong className="text-base text-[#dfe2ee] font-mono">
                        {ride.scheduledTime} IST
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#87948b] block">Next Dispatch Run</span>
                      <strong className="text-sm text-[#68dba9] font-mono">
                        {ride.nextRunAt ? formatDate(ride.nextRunAt) : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {ride.scheduleType === 'RECURRING' && (
                    <>
                      <div className="pt-2 border-t border-[#262a33]">
                        <span className="text-[#87948b] block">Frequency</span>
                        <strong className="text-[#dfe2ee]">
                          {t(
                            `scheduledRides.frequency.${ride.recurrenceFrequency?.toLowerCase() ?? 'daily'}`,
                          )}
                        </strong>
                      </div>

                      {ride.daysOfWeek && ride.daysOfWeek.length > 0 && (
                        <div>
                          <span className="text-[#87948b] block">Active Days</span>
                          <div className="flex gap-1.5 mt-1">
                            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                              const active = ride.daysOfWeek?.includes(day);
                              return (
                                <span
                                  key={day}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono ${
                                    active
                                      ? 'bg-[#25a475] text-[#00311f]'
                                      : 'bg-[#0a0e16] text-[#87948b] border border-[#262a33]'
                                  }`}
                                >
                                  {dayNames[day]}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Occurrence History Logs */}
            <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider text-[#68dba9]">
                {t('scheduledRides.occurrenceHistory')}
              </h2>

              {!ride.occurrenceLogs || ride.occurrenceLogs.length === 0 ? (
                <p className="text-xs text-[#87948b] font-mono">No occurrences generated yet.</p>
              ) : (
                <div className="space-y-2">
                  {ride.occurrenceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-[#0a0e16] border border-[#262a33] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#dfe2ee]">
                            {formatDate(log.occurrenceStart)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                              log.status === 'GENERATED'
                                ? 'bg-[#00311f] text-[#68dba9]'
                                : 'bg-[#93000a]/20 text-[#ffb4ab]'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        {log.errorMessage && (
                          <p className="text-[11px] text-[#ffb4ab]">{log.errorMessage}</p>
                        )}
                      </div>

                      {log.generatedBookingId && (
                        <Link
                          href={`/bookings/${log.generatedBookingId}`}
                          className="px-3 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold transition-colors shrink-0 text-center"
                        >
                          View Booking →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
