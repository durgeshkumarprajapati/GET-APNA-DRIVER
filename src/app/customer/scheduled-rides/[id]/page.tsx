'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
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
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
          <Link
            href="/customer/scheduled-rides"
            className="hover:text-primary transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ← {t('scheduledRides.title')}
          </Link>
          <span>/</span>
          <span className="text-on-surface">{id}</span>
        </div>

        {loading ? (
          <LoadingState />
        ) : error || !ride ? (
          <div className="p-4 rounded-xl border border-error/30 bg-error-container text-on-error-container text-sm animate-fade-in">
            {error || 'Schedule not found.'}
          </div>
        ) : (
          <>
            {/* Header Banner */}
            <div className="bg-surface-container border border-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-['Space_Grotesk']">
                    {ride.scheduleType === 'RECURRING'
                      ? t(
                          `scheduledRides.frequency.${ride.recurrenceFrequency?.toLowerCase() ?? 'daily'}`,
                        )
                      : t('scheduledRides.oneTime')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/30 font-['Space_Grotesk'] uppercase">
                    {t(`scheduledRides.status.${ride.status.toLowerCase()}`)}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
                  Scheduled Booking #{ride.id.substring(0, 8)}
                </h1>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">
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
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  >
                    {t('scheduledRides.pauseBtn')}
                  </button>
                )}
                {ride.status === 'PAUSED' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleResume}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t('scheduledRides.resumeBtn')}
                  </button>
                )}
                {(ride.status === 'SCHEDULED' || ride.status === 'PAUSED') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancel}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-error-container hover:bg-error-container/80 text-on-error-container border border-error/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                  >
                    {t('scheduledRides.cancelBtn')}
                  </button>
                )}
              </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
              {/* Route & Booking Info */}
              <div className="bg-surface-container border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-primary font-['Space_Grotesk'] uppercase tracking-wider">
                  Route & Preferences
                </h2>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                      Pickup Location
                    </span>
                    <p className="text-sm text-on-surface font-semibold mt-0.5">
                      {ride.pickupLocation.label || ride.pickupLocation.address}
                    </p>
                  </div>

                  {ride.dropoffLocation && (
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Dropoff Location
                      </span>
                      <p className="text-sm text-on-surface font-semibold mt-0.5">
                        {ride.dropoffLocation.label || ride.dropoffLocation.address}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-on-surface-variant block">Service Type</span>
                      <strong className="text-on-surface">
                        {t(`booking.types.${ride.bookingType}`)}
                      </strong>
                    </div>
                    {ride.preferredDriver && (
                      <div>
                        <span className="text-on-surface-variant block">Preferred Driver</span>
                        <strong className="text-primary">
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
              <div className="bg-surface-container border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-primary font-['Space_Grotesk'] uppercase tracking-wider">
                  Schedule Configuration
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-on-surface-variant block">Scheduled Time</span>
                      <strong className="text-base text-on-surface font-mono">
                        {ride.scheduledTime} IST
                      </strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Next Dispatch Run</span>
                      <strong className="text-sm text-primary font-mono">
                        {ride.nextRunAt ? formatDate(ride.nextRunAt) : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {ride.scheduleType === 'RECURRING' && (
                    <>
                      <div className="pt-2 border-t border-border">
                        <span className="text-on-surface-variant block">Frequency</span>
                        <strong className="text-on-surface">
                          {t(
                            `scheduledRides.frequency.${ride.recurrenceFrequency?.toLowerCase() ?? 'daily'}`,
                          )}
                        </strong>
                      </div>

                      {ride.daysOfWeek && ride.daysOfWeek.length > 0 && (
                        <div>
                          <span className="text-on-surface-variant block">Active Days</span>
                          <div className="flex gap-1.5 mt-1">
                            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                              const active = ride.daysOfWeek?.includes(day);
                              return (
                                <span
                                  key={day}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono ${
                                    active
                                      ? 'bg-primary text-on-primary'
                                      : 'bg-surface-container-high text-on-surface-variant border border-border'
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
            <div className="bg-surface-container border border-border rounded-2xl p-6 space-y-4 animate-fade-in-up">
              <h2 className="text-sm font-bold text-primary font-['Space_Grotesk'] uppercase tracking-wider">
                {t('scheduledRides.occurrenceHistory')}
              </h2>

              {!ride.occurrenceLogs || ride.occurrenceLogs.length === 0 ? (
                <EmptyState icon="history" message="No occurrences generated yet." />
              ) : (
                <div className="space-y-2">
                  {ride.occurrenceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-surface-container-high border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-on-surface">
                            {formatDate(log.occurrenceStart)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                              log.status === 'GENERATED'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-error-container text-on-error-container'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        {log.errorMessage && (
                          <p className="text-[11px] text-error">{log.errorMessage}</p>
                        )}
                      </div>

                      {log.generatedBookingId && (
                        <Link
                          href={`/bookings/${log.generatedBookingId}`}
                          className="min-h-[40px] flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-colors shrink-0 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
