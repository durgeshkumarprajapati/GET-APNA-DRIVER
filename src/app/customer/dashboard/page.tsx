'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { useTranslation } from '@/i18n/context';

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

interface BookingLocationSummary {
  address: string;
  label: string | null;
}

interface BookingSummary {
  id: string;
  status: string;
  bookingType: string;
  pickupLocation: BookingLocationSummary;
  dropoffLocation?: BookingLocationSummary | null;
  requestedStartTime: string | null;
  createdAt: string;
}

interface SavedLocationSummary {
  id: string;
  label: string;
  addressLine1: string;
  city: string;
  isDefault: boolean;
}

interface FavoriteDriverSummary {
  driverProfileId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  ratingAverage: number;
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

function favoriteDisplayName(fav: FavoriteDriverSummary): string {
  if (fav.displayName) return fav.displayName;
  return [fav.firstName, fav.lastName].filter(Boolean).join(' ') || '—';
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

/** Derives a display icon from the customer's own real saved-place label — never fabricated data, just a presentational cue for common label words. */
function savedPlaceIcon(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('home')) return 'home';
  if (normalized.includes('work') || normalized.includes('office')) return 'work';
  if (normalized.includes('airport')) return 'flight';
  return 'location_on';
}

export default function CustomerDashboardPage() {
  const { t, formatDate, statusLabel } = useTranslation();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<BookingSummary[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocationSummary[]>([]);
  const [favoriteDrivers, setFavoriteDrivers] = useState<FavoriteDriverSummary[]>([]);
  const [loyaltyAccount, setLoyaltyAccount] = useState<{
    pointsBalance: number;
    tierCode: string;
    currentTier: { name: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [profileRes, bookingsRes, recentRes, locationsRes, favoritesRes, loyaltyRes] = await Promise.all([
          fetch('/api/customer/profile'),
          fetch('/api/bookings'),
          fetch('/api/customer/bookings/recent'),
          fetch('/api/customer/locations'),
          fetch('/api/customer/favorites'),
          fetch('/api/customer/loyalty'),
        ]);
        if (!isMounted) return;
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.profile);
        }
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings ?? []);
        }
        if (recentRes.ok) {
          const data = await recentRes.json();
          setRecentCompleted(data.bookings ?? []);
        }
        if (locationsRes.ok) {
          const data = await locationsRes.json();
          setSavedLocations(data.locations ?? []);
        }
        if (favoritesRes.ok) {
          const data = await favoritesRes.json();
          setFavoriteDrivers(data.favorites ?? []);
        }
        if (loyaltyRes.ok) {
          const data = await loyaltyRes.json();
          setLoyaltyAccount(data.account ?? null);
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
  const mostRecentRide = recentCompleted[0] ?? null;

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">
            {t('common.labels.loading')}
          </div>
        ) : (
          <>
            {/* Profile Summary */}
            <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  {t('customer.dashboard.welcomeEyebrow')}
                </span>
                <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  {profile ? customerDisplayName(profile) : 'Customer'}
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
              <Link
                href="/profile"
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-bold transition-colors shrink-0"
              >
                {t('customer.dashboard.editProfile')}
              </Link>
            </section>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/bookings"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  {t('customer.dashboard.activeBookings')}
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
                  {t('customer.dashboard.completedTrips')}
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
                  {t('customer.dashboard.newBooking')}
                </span>
                <span className="text-sm font-bold text-[#00311f] font-['Space_Grotesk'] flex items-center gap-1">
                  {t('customer.dashboard.bookDriverBtn')}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </Link>
            </div>

            {/* Loyalty & Rewards Widget */}
            {loyaltyAccount && (
              <section className="p-4 rounded-xl bg-gradient-to-r from-[#141822] to-[#1a202c] border border-[#262a33] hover:border-[#68dba9]/40 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#68dba9]/10 border border-[#68dba9]/30 flex items-center justify-center text-[#68dba9]">
                    <span className="material-symbols-outlined text-xl">workspace_premium</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#68dba9]">
                        {loyaltyAccount.currentTier?.name || loyaltyAccount.tierCode}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      {loyaltyAccount.pointsBalance.toLocaleString()} Loyalty Points
                    </p>
                  </div>
                </div>
                <Link
                  href="/customer/rewards"
                  className="px-3 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold font-mono transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>{t('customer.nav.rewards')}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </section>
            )}

            {/* Recent Ride / Book Again */}
            {mostRecentRide && (
              <section className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    {t('customer.dashboard.recentRideTitle')}
                  </span>
                  <p className="text-sm font-semibold text-[#dfe2ee] truncate flex items-center gap-2 mt-0.5">
                    <span className="truncate">
                      {mostRecentRide.pickupLocation.label ?? mostRecentRide.pickupLocation.address}
                    </span>
                    {mostRecentRide.dropoffLocation && (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#68dba9] shrink-0">
                          arrow_forward
                        </span>
                        <span className="truncate">
                          {mostRecentRide.dropoffLocation.label ??
                            mostRecentRide.dropoffLocation.address}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <Link
                  href={`/bookings/new?bookAgain=${mostRecentRide.id}`}
                  className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold transition-colors shrink-0 text-center"
                >
                  {t('customer.dashboard.bookAgain')}
                </Link>
              </section>
            )}

            {/* Saved Places */}
            {savedLocations.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {t('customer.dashboard.savedPlacesTitle')}
                  </h2>
                  <Link
                    href="/profile"
                    className="text-xs font-mono text-[#68dba9] hover:underline"
                  >
                    {t('customer.dashboard.managePlaces')}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedLocations.map((loc) => (
                    <Link
                      key={loc.id}
                      href={`/bookings/new?savedLocationId=${loc.id}`}
                      className="px-3.5 py-2 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex items-center gap-2 text-xs font-semibold text-[#dfe2ee]"
                    >
                      <span className="material-symbols-outlined text-base text-[#68dba9]">
                        {savedPlaceIcon(loc.label)}
                      </span>
                      {loc.label}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Favorite Drivers Teaser */}
            {favoriteDrivers.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {t('customer.favorites.title')}
                  </h2>
                  <Link
                    href="/customer/favorites"
                    className="text-xs font-mono text-[#68dba9] hover:underline"
                  >
                    {t('customer.dashboard.favoriteDriversViewAll')}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favoriteDrivers.slice(0, 3).map((fav) => (
                    <div
                      key={fav.driverProfileId}
                      className="px-3.5 py-2 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center gap-2 text-xs font-semibold text-[#dfe2ee]"
                    >
                      <span className="material-symbols-outlined text-base text-[#f5c04a]">
                        star
                      </span>
                      {favoriteDisplayName(fav)}
                      <span className="text-[#87948b] font-mono">
                        {t('customer.favorites.rating', { rating: fav.ratingAverage.toFixed(1) })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Active Bookings */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  {t('customer.dashboard.activeBookings')}
                </h2>
                <Link href="/bookings" className="text-xs font-mono text-[#68dba9] hover:underline">
                  {t('customer.dashboard.viewAll')} →
                </Link>
              </div>
              {activeBookings.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  {t('customer.dashboard.noActiveRide')}
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
                        <p className="text-xs text-[#87948b]">
                          {t(`booking.types.${booking.bookingType}`)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(booking.status)}`}
                      >
                        {statusLabel(booking.status)}
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
                  {t('customer.dashboard.recentBookings')}
                </h2>
                <Link href="/bookings" className="text-xs font-mono text-[#68dba9] hover:underline">
                  {t('customer.dashboard.viewAll')} →
                </Link>
              </div>
              {bookings.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  {t('customer.dashboard.noBookingsYet')}
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
                        <p className="text-xs text-[#87948b]">{formatDate(booking.createdAt)}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(booking.status)}`}
                      >
                        {statusLabel(booking.status)}
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
