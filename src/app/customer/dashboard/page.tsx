'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { CustomerExperienceSection } from '@/components/experience/customer-experience-section';
import { LoadingState } from '@/components/ui/loading-state';
import { useTranslation } from '@/i18n/context';
import { BookingMessagePanel } from '@/components/booking/BookingMessagePanel';
import type { CustomerDashboardData } from '@/modules/customer/application/customer-dashboard-service';

function statusBadgeClass(status: string): string {
  if (status === 'TRIP_COMPLETED') return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  if (
    [
      'SEARCHING_DRIVER',
      'DRIVER_ASSIGNED',
      'DRIVER_EN_ROUTE',
      'DRIVER_ARRIVED',
      'TRIP_IN_PROGRESS',
      'TRIP_STARTED',
    ].includes(status)
  ) {
    return 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]';
  }
  return 'bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]';
}

function savedPlaceIcon(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('home')) return 'home';
  if (normalized.includes('work') || normalized.includes('office')) return 'work';
  if (normalized.includes('airport')) return 'flight';
  return 'location_on';
}

export default function CustomerDashboardPage() {
  const { t, formatDate, formatCurrency, statusLabel } = useTranslation();
  const [dashboard, setDashboard] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveChat, setShowActiveChat] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      try {
        const res = await fetch('/api/customer/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard.');
        const data = await res.json();
        if (isMounted && data.success) {
          setDashboard(data.dashboard);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const profile = dashboard?.profile;
  const activeService = dashboard?.activeService;
  const upcomingService = dashboard?.upcomingService;
  const savedPeople = dashboard?.savedPeople || [];
  const savedPlaces = dashboard?.savedPlaces || [];
  const recentServices = dashboard?.recentServices || [];
  const bookAgainShortcuts = dashboard?.bookAgainShortcuts || [];
  const favoriteDrivers = dashboard?.favoriteDrivers || [];
  const billingSummary = dashboard?.billingSummary;
  const recommendations = dashboard?.recommendations || [];

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Header & Profile Overview */}
            <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
              <div>
                <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  {t('customer.dashboard.welcomeEyebrow')}
                </span>
                <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  {profile?.displayName || profile?.firstName
                    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
                    : 'Customer'}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#87948b]">
                  {profile?.email && <span>{profile.email}</span>}
                  {profile?.phoneNumber && <span>{profile.phoneNumber}</span>}
                  {profile && (
                    <span>
                      {t('customer.dashboard.customerSince', {
                        date: formatDate(profile.createdAt),
                      })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/bookings/new"
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#68dba9] hover:bg-[#86e2ba] text-[#003825] text-xs font-bold font-['Space_Grotesk'] transition-all flex items-center gap-2 shadow-lg shadow-[#68dba9]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                >
                  <span className="material-symbols-outlined text-base">directions_car</span>
                  <span>{t('customer.dashboard.bookDriverBtn')}</span>
                </Link>
                <Link
                  href="/profile"
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-bold transition-colors shrink-0 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                >
                  {t('customer.dashboard.editProfile')}
                </Link>
              </div>
            </section>

            {/* Intelligent Experience Orchestration Engine */}
            <CustomerExperienceSection />

            {/* Active Driver Service Banner */}
            {activeService && (
              <section className="bg-gradient-to-r from-[#1b2520] to-[#141d1a] border-2 border-[#68dba9]/60 rounded-2xl p-6 shadow-2xl space-y-4 animate-pulse-subtle">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262a33] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#68dba9]"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#68dba9] font-['Space_Grotesk']">
                      Active Driver Service
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(activeService.status)}`}
                  >
                    {statusLabel(activeService.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-[#87948b]">
                      <span className="text-[10px] uppercase font-bold text-[#87948b]">
                        Pickup:
                      </span>{' '}
                      <span className="text-[#dfe2ee] font-semibold">
                        {activeService.pickupLocation.label || activeService.pickupLocation.address}
                      </span>
                    </div>
                    {activeService.dropoffLocation && (
                      <div className="text-xs text-[#87948b]">
                        <span className="text-[10px] uppercase font-bold text-[#87948b]">
                          Destination:
                        </span>{' '}
                        <span className="text-[#dfe2ee] font-semibold">
                          {activeService.dropoffLocation.label ||
                            activeService.dropoffLocation.address}
                        </span>
                      </div>
                    )}
                    {activeService.serviceRecipient?.isForSomeoneElse && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#262a33] text-xs font-semibold text-[#68dba9] border border-[#343a46]">
                        <span className="material-symbols-outlined text-xs">group</span>
                        <span>
                          Service For: {activeService.serviceRecipient.fullName}{' '}
                          {activeService.serviceRecipient.relationship
                            ? `(${activeService.serviceRecipient.relationship})`
                            : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {activeService.driver && (
                    <div className="p-3 rounded-xl bg-[#141820] border border-[#262a33] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#262a33] text-[#68dba9] flex items-center justify-center font-bold text-sm">
                          {activeService.driver.displayName?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#dfe2ee]">
                            {activeService.driver.displayName}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-[#f5c04a]">
                            <span className="material-symbols-outlined text-xs">star</span>
                            <span>{activeService.driver.ratingAverage.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/bookings/${activeService.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#343a46] text-xs font-semibold text-[#68dba9] transition-colors"
                      >
                        Track Ride →
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowActiveChat(!showActiveChat)}
                    className="px-4 py-2 rounded-xl bg-[#262a33] hover:bg-[#353942] text-[#68dba9] border border-[#68dba9]/40 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">forum</span>
                    <span>{showActiveChat ? 'Hide Communication' : 'Message Chauffeur'}</span>
                  </button>
                  <Link
                    href={`/bookings/${activeService.id}`}
                    className="px-4 py-2 rounded-xl bg-[#68dba9] hover:bg-[#86e2ba] text-[#003825] text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">map</span>
                    <span>Track Live Service</span>
                  </Link>
                </div>

                {showActiveChat && (
                  <div className="pt-3 border-t border-[#262a33]">
                    <BookingMessagePanel
                      viewerRole="CUSTOMER"
                      apiBasePath={`/api/customer/bookings/${activeService.id}/messages`}
                      bookingStatus={activeService.status}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Upcoming Service Banner */}
            {upcomingService && !activeService && (
              <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25a475]/10 border border-[#25a475]/30 flex items-center justify-center text-[#68dba9] shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-xl">event</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#68dba9] font-['Space_Grotesk']">
                      Upcoming Service
                    </span>
                    <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-0.5">
                      {upcomingService.requestedStartTime
                        ? formatDate(upcomingService.requestedStartTime)
                        : 'Scheduled Trip'}
                    </h3>
                    <p className="text-xs text-[#87948b] mt-0.5">
                      Pickup:{' '}
                      {upcomingService.pickupLocation.label ||
                        upcomingService.pickupLocation.address}
                    </p>
                    {upcomingService.serviceRecipient?.isForSomeoneElse && (
                      <p className="text-[11px] text-[#68dba9] mt-1 font-semibold">
                        Service For: {upcomingService.serviceRecipient.fullName}
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  href={`/bookings/${upcomingService.id}`}
                  className="px-4 py-2 rounded-xl bg-[#262a33] hover:bg-[#343a46] text-[#dfe2ee] text-xs font-bold transition-colors shrink-0 flex items-center justify-center"
                >
                  View Details →
                </Link>
              </section>
            )}

            {/* Pending Payment Alert */}
            {billingSummary &&
              billingSummary.pendingPaymentsCount > 0 &&
              billingSummary.latestPendingPayment && (
                <section className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">payments</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-['Space_Grotesk']">
                        Pending Payment
                      </span>
                      <p className="text-xs font-bold text-amber-200">
                        Payment of {formatCurrency(billingSummary.latestPendingPayment.amount)} is
                        due for booking #
                        {billingSummary.latestPendingPayment.bookingId.substring(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/payments/${billingSummary.latestPendingPayment.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-colors shrink-0"
                  >
                    Pay Now
                  </Link>
                </section>
              )}

            {/* Deterministic Recommendations Carousel / Section */}
            {recommendations.length > 0 && (
              <section className="flex flex-col gap-3 animate-fade-in-up">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider text-[#68dba9]">
                  Smart Suggestions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#262a33] text-[#68dba9] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#68dba9] group-hover:text-[#003825] transition-colors">
                          <span className="material-symbols-outlined text-base">{rec.icon}</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#dfe2ee] group-hover:text-[#68dba9] transition-colors">
                            {rec.title}
                          </h4>
                          <p className="text-[11px] text-[#87948b] mt-0.5">{rec.description}</p>
                        </div>
                      </div>
                      <Link
                        href={rec.actionUrl}
                        className="px-2.5 py-1 rounded-md bg-[#262a33] hover:bg-[#343a46] text-[11px] font-bold text-[#68dba9] whitespace-nowrap transition-colors shrink-0"
                      >
                        {rec.actionLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Saved People Quick Access */}
            <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-5 shadow-xl flex flex-col gap-4 animate-fade-in-up">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#68dba9]">group</span>
                  <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Saved People (Book for Family & Friends)
                  </h2>
                </div>
                <Link
                  href="/profile?tab=people"
                  className="text-xs font-mono text-[#68dba9] hover:underline"
                >
                  Manage People →
                </Link>
              </div>

              {savedPeople.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#141820] border border-dashed border-[#262a33] text-center text-xs text-[#87948b] flex flex-col items-center gap-2">
                  <p>Save family members or guests for 1-click chauffeur bookings.</p>
                  <Link
                    href="/profile?tab=people"
                    className="px-3 py-1.5 rounded-lg bg-[#262a33] text-[#68dba9] font-bold text-xs"
                  >
                    + Add Saved Person
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {savedPeople.map((person) => (
                    <div
                      key={person.id}
                      className="p-3 bg-[#141820] border border-[#262a33] hover:border-[#68dba9]/40 rounded-xl flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-[#dfe2ee]">{person.fullName}</h4>
                        <span className="text-[10px] text-[#87948b] uppercase font-mono">
                          {person.relationship || 'Recipient'}
                        </span>
                      </div>
                      <Link
                        href={`/bookings/new?savedPersonId=${person.id}`}
                        className="w-full py-1.5 px-2 rounded-lg bg-[#262a33] hover:bg-[#343a46] text-[11px] font-bold text-[#68dba9] text-center transition-colors border border-[#68dba9]/20"
                      >
                        Book for {person.fullName.split(' ')[0]}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Saved Places Quick Chips */}
            {savedPlaces.length > 0 && (
              <section className="flex flex-col gap-3 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Saved Places
                  </h2>
                  <Link
                    href="/profile?tab=locations"
                    className="text-xs font-mono text-[#68dba9] hover:underline"
                  >
                    Manage Places
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedPlaces.map((loc) => (
                    <Link
                      key={loc.id}
                      href={`/bookings/new?savedLocationId=${loc.id}`}
                      className="card-interactive px-3.5 py-2 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center gap-2 text-xs font-semibold text-[#dfe2ee]"
                    >
                      <span className="material-symbols-outlined text-base text-[#68dba9]">
                        {savedPlaceIcon(loc.label)}
                      </span>
                      <span>{loc.label}</span>
                      <span className="text-[10px] text-[#87948b]">({loc.city})</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Book Again Shortcuts */}
            {bookAgainShortcuts.length > 0 && (
              <section className="flex flex-col gap-3 animate-fade-in-up">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Book Again
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {bookAgainShortcuts.map((trip) => (
                    <div
                      key={trip.id}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#68dba9] font-mono">
                          {trip.bookingType}
                        </span>
                        <p className="text-xs font-semibold text-[#dfe2ee] truncate mt-1">
                          {trip.pickupLocation.label || trip.pickupLocation.address}
                        </p>
                        {trip.serviceRecipientName && (
                          <p className="text-[10px] text-[#87948b] mt-0.5">
                            For: {trip.serviceRecipientName}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/bookings/new?bookAgain=${trip.id}`}
                        className="py-1.5 px-3 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold text-center transition-colors font-['Space_Grotesk']"
                      >
                        Book Again
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Services History */}
            <section className="flex flex-col gap-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Recent Driver Services
                </h2>
                <Link href="/bookings" className="text-xs font-mono text-[#68dba9] hover:underline">
                  View Full History →
                </Link>
              </div>
              {recentServices.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-xs">
                  No previous driver services found.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentServices.map((service) => (
                    <Link
                      key={service.id}
                      href={`/bookings/${service.id}`}
                      className="card-interactive p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#dfe2ee] truncate">
                          {service.pickupLocation.label || service.pickupLocation.address}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#87948b]">
                          <span>{formatDate(service.createdAt)}</span>
                          {service.serviceRecipientName && (
                            <span>• For: {service.serviceRecipientName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {service.fareAmount > 0 && (
                          <span className="text-xs font-bold font-mono text-[#68dba9]">
                            {formatCurrency(service.fareAmount)}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(service.status)}`}
                        >
                          {statusLabel(service.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Favorite Drivers */}
            {favoriteDrivers.length > 0 && (
              <section className="flex flex-col gap-3 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Favorite Drivers
                  </h2>
                  <Link
                    href="/customer/favorites"
                    className="text-xs font-mono text-[#68dba9] hover:underline"
                  >
                    View All Favorites
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {favoriteDrivers.map((fav) => (
                    <div
                      key={fav.driverProfileId}
                      className="p-3.5 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#f5c04a]">
                          star
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#dfe2ee]">{fav.displayName}</h4>
                          <span className="text-[10px] text-[#87948b] font-mono">
                            ⭐ {fav.ratingAverage.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/bookings/new?preferredDriverId=${fav.driverProfileId}`}
                        className="px-2.5 py-1 rounded bg-[#262a33] hover:bg-[#343a46] text-[11px] font-semibold text-[#68dba9] transition-colors"
                      >
                        Hire
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Financial & Operational Shortcuts */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up">
              <Link
                href="/customer/billing"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/40 transition-colors flex flex-col gap-1"
              >
                <span className="material-symbols-outlined text-lg text-[#68dba9]">
                  account_balance_wallet
                </span>
                <span className="text-xs font-bold text-[#dfe2ee] mt-1">Billing Center</span>
                <span className="text-[10px] text-[#87948b]">Financial summary & receipts</span>
              </Link>
              <Link
                href="/customer/invoices"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/40 transition-colors flex flex-col gap-1"
              >
                <span className="material-symbols-outlined text-lg text-[#68dba9]">
                  receipt_long
                </span>
                <span className="text-xs font-bold text-[#dfe2ee] mt-1">Tax Invoices</span>
                <span className="text-[10px] text-[#87948b]">Download tax invoice PDFs</span>
              </Link>
              <Link
                href="/profile?tab=people"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/40 transition-colors flex flex-col gap-1"
              >
                <span className="material-symbols-outlined text-lg text-[#68dba9]">group</span>
                <span className="text-xs font-bold text-[#dfe2ee] mt-1">Saved People</span>
                <span className="text-[10px] text-[#87948b]">Manage service recipients</span>
              </Link>
              <Link
                href="/profile?tab=preferences"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9]/40 transition-colors flex flex-col gap-1"
              >
                <span className="material-symbols-outlined text-lg text-[#68dba9]">tune</span>
                <span className="text-xs font-bold text-[#dfe2ee] mt-1">Booking Preferences</span>
                <span className="text-[10px] text-[#87948b]">Default vehicle & service</span>
              </Link>
            </section>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
