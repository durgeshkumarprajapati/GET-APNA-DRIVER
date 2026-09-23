'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { UnifiedMap } from '@/components/maps/unified-map';
import type { MapMarkerDefinition } from '@/modules/maps/domain/map-types';
import { useActiveBooking } from '@/components/use-active-booking';
import { useBookingTracking, type TrackedBooking } from '@/components/use-booking-tracking';
import { formatDateTime } from '@/shared/formatting/date';
import { SmartTripStatusCard } from '@/components/trip-intelligence/SmartTripStatusCard';
import type { TripIntelligenceResult } from '@/modules/trip-intelligence/trip-intelligence-types';
import { SmartTripReliabilityCard } from '@/components/trip-reliability/SmartTripReliabilityCard';
import type { CustomerReliabilityView } from '@/modules/trip-reliability/trip-reliability-types';
import { LocationETACard } from '@/components/location-intelligence/LocationETACard';
import { DispatchSearchCountdownCard } from '@/components/dispatch/DispatchSearchCountdownCard';
import { SmartJourneyCard } from '@/components/trip-execution/SmartJourneyCard';
import type { CustomerJourneyDTO } from '@/modules/trip-execution/application/journey-orchestration-service';
import { PostTripPaymentCard } from '@/components/payment/PostTripPaymentCard';

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
  TRIP_IN_PROGRESS: 'Service in progress',
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

  const [intelligence, setIntelligence] = useState<TripIntelligenceResult | null>(null);
  const [reliability, setReliability] = useState<CustomerReliabilityView | null>(null);
  const [locationIntel, setLocationIntel] = useState<Record<string, unknown> | null>(null);
  const [journeyData, setJourneyData] = useState<CustomerJourneyDTO | null>(null);

  const loading = resolvingActiveBooking || (Boolean(activeBooking) && trackingLoading);
  const displayBooking = booking ?? activeBooking;

  useEffect(() => {
    if (!displayBooking?.id) return;

    fetch(`/api/customer/bookings/${displayBooking.id}/journey`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.journey) {
          setJourneyData(data.journey);
        }
      })
      .catch(() => {});

    fetch(`/api/customer/bookings/${displayBooking.id}/trip-intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.intelligence) {
          setIntelligence(data.intelligence);
        }
      })
      .catch(() => {});

    fetch(`/api/customer/bookings/${displayBooking.id}/reliability`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          setReliability(data.data);
        }
      })
      .catch(() => {});

    fetch(`/api/customer/bookings/${displayBooking.id}/location-intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.locationIntelligence) {
          setLocationIntel(data.locationIntelligence);
        }
      })
      .catch(() => {});
  }, [displayBooking?.id]);

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Live Tracking"
          title="Active Booking & Tracking"
          subtitle="Real-time status of your current booking."
        />

        {loading ? (
          <LoadingState message="Checking for an active booking…" />
        ) : activeBookingError ? (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm animate-fade-in">
            {activeBookingError}
          </div>
        ) : !displayBooking ? (
          <EmptyState icon="near_me" message="No active booking right now.">
            <Link
              href="/bookings/new"
              className="mt-3 inline-flex items-center justify-center min-h-[48px] px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] active:bg-[#1c7d5c] text-[#00311f] text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
            >
              Book a Driver
            </Link>
          </EmptyState>
        ) : (
          <>
            <DispatchSearchCountdownCard bookingId={displayBooking.id} />

            <PostTripPaymentCard bookingId={displayBooking.id} role="CUSTOMER" />

            {journeyData && <SmartJourneyCard journey={journeyData} role="CUSTOMER" />}

            {locationIntel && <LocationETACard locationIntelligence={locationIntel} />}

            {intelligence && (
              <SmartTripStatusCard intelligence={intelligence} bookingId={displayBooking.id} />
            )}

            {reliability && <SmartTripReliabilityCard reliability={reliability} />}

            <section className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <StatusBadge
                  label={STATUS_LABEL[displayBooking.status] ?? displayBooking.status}
                  tone={STATUS_TONE[displayBooking.status] ?? 'neutral'}
                />
                <Link
                  href={`/bookings/${displayBooking.id}`}
                  className="text-xs text-[#68dba9] hover:underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                >
                  View full booking details →
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

            <section className="p-5 rounded-2xl bg-[#181c24] border border-[#262a33] space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">map</span>
                  <span>Live Booking Map</span>
                </h2>
                {driverLocation && (
                  <span className="text-[10px] text-[#87948b]">
                    Updated {formatDateTime(driverLocation.capturedAt)}
                    {driverLocation.speed !== null
                      ? ` • ${driverLocation.speed.toFixed(0)} km/h`
                      : ''}
                  </span>
                )}
              </div>

              {(() => {
                const markers: MapMarkerDefinition[] = [
                  {
                    id: 'pickup',
                    position: {
                      latitude: displayBooking.pickupLocation.latitude,
                      longitude: displayBooking.pickupLocation.longitude,
                    },
                    type: 'PICKUP',
                    title: 'Pickup Location',
                    snippet: displayBooking.pickupLocation.address,
                  },
                ];

                if (displayBooking.dropoffLocation) {
                  markers.push({
                    id: 'dropoff',
                    position: {
                      latitude: displayBooking.dropoffLocation.latitude,
                      longitude: displayBooking.dropoffLocation.longitude,
                    },
                    type: 'DROPOFF',
                    title: 'Dropoff Location',
                    snippet: displayBooking.dropoffLocation.address,
                  });
                }

                if (driverLocation) {
                  markers.push({
                    id: 'driver',
                    position: {
                      latitude: driverLocation.latitude,
                      longitude: driverLocation.longitude,
                    },
                    type: 'DRIVER',
                    title: displayBooking.assignedDriver?.displayName
                      ? `${displayBooking.assignedDriver.displayName}'s Location`
                      : 'Driver Location',
                    heading: driverLocation.heading,
                  });
                }

                return (
                  <UnifiedMap
                    markers={markers}
                    height="380px"
                    fitBounds={true}
                    ariaLabel="Active booking tracking map"
                  />
                );
              })()}
            </section>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
