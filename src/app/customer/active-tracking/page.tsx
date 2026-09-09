'use client';

import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { LocationMapLink } from '@/components/ui/location-map-link';
import { useActiveBooking } from '@/components/use-active-booking';
import { useBookingTracking, type TrackedBooking } from '@/components/use-booking-tracking';
import { formatDateTime } from '@/shared/formatting/date';

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  SEARCHING_DRIVER: 'warning',
  DRIVER_ASSIGNED: 'info',
  DRIVER_EN_ROUTE: 'info',
  DRIVER_ARRIVED: 'success',
  TRIP_IN_PROGRESS: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  SEARCHING_DRIVER: 'Finding you a driver…',
  DRIVER_ASSIGNED: 'Driver assigned',
  DRIVER_EN_ROUTE: 'Driver en route to pickup',
  DRIVER_ARRIVED: 'Driver has arrived',
  TRIP_IN_PROGRESS: 'Trip in progress',
};

export default function CustomerActiveTrackingPage() {
  const {
    activeBooking,
    loading: resolvingActiveBooking,
    error: activeBookingError,
  } = useActiveBooking<TrackedBooking & { createdAt: string }>('/api/bookings', 'bookings');

  const {
    booking,
    driverLocation,
    loading: trackingLoading,
  } = useBookingTracking(activeBooking?.id ?? null);

  const loading = resolvingActiveBooking || (Boolean(activeBooking) && trackingLoading);
  const displayBooking = booking ?? activeBooking;

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Live Tracking"
          title="Active Ride & Tracking"
          subtitle="Real-time status of your current trip."
        />

        {loading ? (
          <LoadingState message="Checking for an active ride…" />
        ) : activeBookingError ? (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {activeBookingError}
          </div>
        ) : !displayBooking ? (
          <EmptyState icon="near_me" message="No active ride right now.">
            <Link
              href="/bookings/new"
              className="mt-3 inline-block px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold transition-colors"
            >
              Book a Ride
            </Link>
          </EmptyState>
        ) : (
          <>
            <section className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <StatusBadge
                  label={STATUS_LABEL[displayBooking.status] ?? displayBooking.status}
                  tone={STATUS_TONE[displayBooking.status] ?? 'neutral'}
                />
                <Link
                  href={`/bookings/${displayBooking.id}`}
                  className="text-xs text-[#68dba9] hover:underline"
                >
                  View full trip details →
                </Link>
              </div>

              {displayBooking.assignedDriver && (
                <div className="pt-2 border-t border-[#262a33] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-sm">
                    {(displayBooking.assignedDriver.displayName ?? 'D').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#dfe2ee]">
                      {displayBooking.assignedDriver.displayName ?? 'Your Driver'}
                    </p>
                    <p className="text-[10px] text-[#87948b]">
                      {displayBooking.assignedDriver.drivingExperienceYears} yrs experience
                      {displayBooking.assignedDriver.primaryServiceArea
                        ? ` • ${displayBooking.assignedDriver.primaryServiceArea}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#262a33] text-xs">
                <div>
                  <span className="block text-[10px] uppercase text-[#87948b] font-bold">
                    Pickup
                  </span>
                  <span className="text-[#dfe2ee]">
                    {displayBooking.pickupLocation.label ?? displayBooking.pickupLocation.address}
                  </span>
                </div>
                {displayBooking.dropoffLocation && (
                  <div>
                    <span className="block text-[10px] uppercase text-[#87948b] font-bold">
                      Dropoff
                    </span>
                    <span className="text-[#dfe2ee]">
                      {displayBooking.dropoffLocation.label ??
                        displayBooking.dropoffLocation.address}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {driverLocation ? (
              <section className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Live Driver Location
                </h2>
                <LocationMapLink
                  latitude={driverLocation.latitude}
                  longitude={driverLocation.longitude}
                  label="Open driver's location"
                />
                <p className="text-[10px] text-[#87948b]">
                  Last updated {formatDateTime(driverLocation.capturedAt)}
                  {driverLocation.speed !== null
                    ? ` • ${driverLocation.speed.toFixed(0)} km/h`
                    : ''}
                </p>
              </section>
            ) : (
              ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'].includes(
                displayBooking.status,
              ) && (
                <EmptyState
                  icon="location_searching"
                  message="Waiting for your driver's live location…"
                />
              )
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
