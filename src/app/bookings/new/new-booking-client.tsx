'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerLayout } from '@/components/customer-layout';
import { CurrentLocationButton } from '@/components/ui/current-location-button';
import type { CapturedLocation } from '@/components/use-geolocation-capture';
import { useTranslation } from '@/i18n/context';

interface FareEstimateData {
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  breakdown: {
    baseFareAmount: string;
    distanceFareAmount: string;
    durationFareAmount: string;
    packageAdjustmentAmount: string;
    minimumFareAmount: string;
    platformFeeAmount: string;
    subtotalAmount: string;
    totalFareAmount: string;
  };
}

interface LocationField {
  address: string;
  label: string | null;
  latitude: number;
  longitude: number;
}

interface SavedLocationRecord {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  latitude: number;
  longitude: number;
}

interface FavoriteDriverRecord {
  driverProfileId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  ratingAverage: number;
  drivingExperienceYears: number;
}

interface BookingRecord {
  id: string;
  customerId: string;
  bookingType: string;
  pickupLocation: { address: string; label: string | null; latitude: number; longitude: number };
  dropoffLocation?: {
    address: string;
    label: string | null;
    latitude: number;
    longitude: number;
  } | null;
}

function savedLocationAddress(loc: SavedLocationRecord): string {
  return [loc.addressLine1, loc.addressLine2, loc.city].filter(Boolean).join(', ');
}

function favoriteDisplayName(fav: FavoriteDriverRecord): string {
  if (fav.displayName) return fav.displayName;
  return [fav.firstName, fav.lastName].filter(Boolean).join(' ') || '—';
}

type BookingTypeTab = 'hourly' | 'oneway' | 'outstation' | 'nightout';

const BOOKING_TYPE_TO_TAB: Record<string, BookingTypeTab> = {
  HOURLY: 'hourly',
  ONE_WAY: 'oneway',
  MULTI_DAY: 'outstation',
};

function BookDriverPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatCurrency } = useTranslation();

  const [pickup, setPickup] = useState<LocationField>({
    address: 'Vasant Vihar, Block C, New Delhi',
    label: null,
    latitude: 28.5603,
    longitude: 77.1627,
  });
  const [dropoff, setDropoff] = useState<LocationField>({
    address: 'Connaught Place, Block A, New Delhi',
    label: null,
    latitude: 28.6315,
    longitude: 77.2167,
  });
  const [selectedTab, setSelectedTab] = useState<BookingTypeTab>('hourly');
  const [vehicleClass, setVehicleClass] = useState<'luxury' | 'sedan' | 'hatchback'>('luxury');
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto');
  const [preferredDriverProfileId, setPreferredDriverProfileId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');

  const [bookingMode, setBookingMode] = useState<'NOW' | 'SCHEDULE'>(
    searchParams.get('mode') === 'schedule' ? 'SCHEDULE' : 'NOW',
  );
  const [scheduleType, setScheduleType] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME');
  const [scheduledDate, setScheduledDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0],
  );
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    'DAILY' | 'WEEKLY' | 'CUSTOM_DAYS'
  >('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [savedLocations, setSavedLocations] = useState<SavedLocationRecord[]>([]);
  const [favoriteDrivers, setFavoriteDrivers] = useState<FavoriteDriverRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fareEstimate, setFareEstimate] = useState<FareEstimateData | null>(null);

  // No reverse-geocoding provider is wired up client-side (the only one in
  // the codebase, src/modules/location/infrastructure/map-provider.ts, is a
  // server-only dev mock) — rather than fabricate a resolved address, a
  // successful capture is labeled honestly and the real coordinates are
  // what's actually sent to /api/bookings.
  const handleUseCurrentLocation = (location: CapturedLocation) => {
    setPickup((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: 'Current location selected',
      label: null,
    }));
  };

  // Load the customer's real saved places and favorite drivers once — used
  // by the quick-select chips and the preferred-driver picker below. Both
  // sections render nothing when empty rather than showing placeholder/fake
  // entries.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [locationsRes, favoritesRes] = await Promise.all([
          fetch('/api/customer/locations'),
          fetch('/api/customer/favorites'),
        ]);
        if (!isMounted) return;
        if (locationsRes.ok) {
          const data = await locationsRes.json();
          setSavedLocations(data.locations ?? []);
        }
        if (favoritesRes.ok) {
          const data = await favoritesRes.json();
          setFavoriteDrivers(data.favorites ?? []);
        }
      } catch {
        // Quick-select chips and the preference picker just stay empty.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Prefill from a dashboard "Book Again" action or a saved-place shortcut.
  // Book Again only ever reuses pickup/dropoff/service-type from the prior
  // booking — never its fare, driver, payment, or PIN, which are
  // recalculated/re-created fresh by the normal flow below. Ownership of the
  // referenced booking is enforced server-side by GET /api/bookings/[id]
  // (the same endpoint the booking-detail page uses), so a customer can
  // never prefill from someone else's booking.
  useEffect(() => {
    const bookAgainId = searchParams.get('bookAgain');
    const savedLocationId = searchParams.get('savedLocationId');
    const prefillPickup = searchParams.get('prefillPickup');
    const prefillDropoff = searchParams.get('prefillDropoff');
    const preferredDriver = searchParams.get('preferredDriverProfileId');
    const vClass = searchParams.get('vehicleClass')?.toLowerCase();

    (async () => {
      if (preferredDriver) {
        setPreferredDriverProfileId(preferredDriver);
      }
      if (vClass === 'luxury' || vClass === 'sedan' || vClass === 'hatchback') {
        setVehicleClass(vClass);
      }

      if (prefillPickup) {
        setPickup((prev) => ({ ...prev, address: prefillPickup }));
      }
      if (prefillDropoff) {
        setDropoff((prev) => ({ ...prev, address: prefillDropoff }));
      }

      if (!bookAgainId && !savedLocationId) return;

      try {
        if (bookAgainId) {
          const res = await fetch(`/api/bookings/${bookAgainId}`);
          if (!res.ok) return;
          const data = await res.json();
          const booking: BookingRecord = data.booking;
          setPickup({
            address: booking.pickupLocation.address,
            label: booking.pickupLocation.label,
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          });
          if (booking.dropoffLocation) {
            setDropoff({
              address: booking.dropoffLocation.address,
              label: booking.dropoffLocation.label,
              latitude: booking.dropoffLocation.latitude,
              longitude: booking.dropoffLocation.longitude,
            });
          }
          setSelectedTab(BOOKING_TYPE_TO_TAB[booking.bookingType] ?? 'oneway');
        } else if (savedLocationId) {
          const res = await fetch(`/api/customer/locations/${savedLocationId}`);
          if (!res.ok) return;
          const data = await res.json();
          const loc: SavedLocationRecord = data.location;
          setDropoff({
            address: savedLocationAddress(loc),
            label: loc.label,
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
        }
      } catch {
        // Prefill is a convenience — silently fall back to the defaults.
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    async function fetchEstimate() {
      try {
        const bookingType =
          selectedTab === 'hourly'
            ? 'HOURLY'
            : selectedTab === 'outstation'
              ? 'MULTI_DAY'
              : 'ONE_WAY';
        const res = await fetch('/api/pricing/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickup: {
              latitude: pickup.latitude,
              longitude: pickup.longitude,
              address: pickup.address,
            },
            dropoff: {
              latitude: dropoff.latitude,
              longitude: dropoff.longitude,
              address: dropoff.address,
            },
            bookingType,
            estimatedDurationMinutes: selectedTab === 'hourly' ? 240 : 60,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setFareEstimate(data.estimate);
        }
      } catch {
        // Fallback gracefully
      }
    }
    fetchEstimate();
  }, [selectedTab, pickup, dropoff]);

  const handleEditPickup = useCallback(() => {
    const next = prompt(t('customer.booking.promptPickup'), pickup.address);
    if (next) setPickup((prev) => ({ ...prev, address: next, label: null }));
  }, [pickup.address, t]);

  const handleEditDropoff = useCallback(() => {
    const next = prompt(t('customer.booking.promptDropoff'), dropoff.address);
    if (next) setDropoff((prev) => ({ ...prev, address: next, label: null }));
  }, [dropoff.address, t]);

  const handleConfirmDispatch = async () => {
    setLoading(true);
    setError(null);

    const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      if (bookingMode === 'SCHEDULE') {
        const res = await fetch('/api/customer/scheduled-rides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            scheduleType,
            recurrenceFrequency: scheduleType === 'RECURRING' ? recurrenceFrequency : undefined,
            daysOfWeek:
              scheduleType === 'RECURRING' &&
              (recurrenceFrequency === 'WEEKLY' || recurrenceFrequency === 'CUSTOM_DAYS')
                ? selectedDays
                : undefined,
            scheduledDate: scheduleType === 'ONE_TIME' ? scheduledDate : undefined,
            scheduledTime,
            pickupLocation: {
              latitude: pickup.latitude,
              longitude: pickup.longitude,
              address: pickup.address,
              label: pickup.label,
            },
            dropoffLocation: {
              latitude: dropoff.latitude,
              longitude: dropoff.longitude,
              address: dropoff.address,
              label: dropoff.label,
            },
            bookingType:
              selectedTab === 'hourly'
                ? 'HOURLY'
                : selectedTab === 'outstation'
                  ? 'MULTI_DAY'
                  : 'ONE_WAY',
            preferredDriverProfileId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(
            data.message ||
              t('scheduledRides.failedCreate', { defaultValue: 'Failed to create schedule.' }),
          );
        } else {
          router.push('/customer/scheduled-rides');
        }
      } else {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            pickupLocation: {
              latitude: pickup.latitude,
              longitude: pickup.longitude,
              address: pickup.address,
              label: pickup.label,
            },
            dropoffLocation: {
              latitude: dropoff.latitude,
              longitude: dropoff.longitude,
              address: dropoff.address,
              label: dropoff.label,
            },
            bookingType:
              selectedTab === 'hourly'
                ? 'HOURLY'
                : selectedTab === 'outstation'
                  ? 'MULTI_DAY'
                  : 'ONE_WAY',
            estimatedDurationMinutes: selectedTab === 'hourly' ? 240 : 60,
            preferredDriverProfileId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.message || t('customer.booking.dispatchFailedError'));
        } else {
          router.push(`/bookings/${data.booking.id}`);
        }
      }
    } catch {
      setError(t('customer.booking.dispatchUnexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const vehicleTiers: Array<{
    key: 'luxury' | 'sedan' | 'hatchback';
    icon: string;
    label: string;
    models: string;
  }> = [
    {
      key: 'luxury',
      icon: 'directions_car',
      label: t('customer.booking.vehicleLuxury'),
      models: t('customer.booking.vehicleLuxuryModels'),
    },
    {
      key: 'sedan',
      icon: 'airport_shuttle',
      label: t('customer.booking.vehicleSedan'),
      models: t('customer.booking.vehicleSedanModels'),
    },
    {
      key: 'hatchback',
      icon: 'garage',
      label: t('customer.booking.vehicleHatchback'),
      models: t('customer.booking.vehicleHatchbackModels'),
    },
  ];

  const tabs: Array<{ key: BookingTypeTab; label: string }> = [
    { key: 'hourly', label: t('customer.booking.tabHourly') },
    { key: 'oneway', label: t('customer.booking.tabOneway') },
    { key: 'outstation', label: t('customer.booking.tabOutstation') },
    { key: 'nightout', label: t('customer.booking.tabNightout') },
  ];

  return (
    <CustomerLayout>
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
          {/* Left Panel: Booking Configuration (42% width) */}
          <section className="w-full xl:w-[42%] flex flex-col gap-4 shrink-0">
            {error && (
              <div className="p-4 rounded-xl bg-[#93000a]/40 border border-[#ffb4ab] text-[#ffdad6] text-xs">
                {error}
              </div>
            )}

            {/* Booking Mode Selector (Ride Now vs Schedule Ride) */}
            <div className="bg-[#181c24] rounded-xl p-3 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                <button
                  type="button"
                  onClick={() => setBookingMode('NOW')}
                  className={`py-2 px-3 rounded-md text-xs font-bold font-['Space_Grotesk'] flex items-center justify-center gap-2 transition-all ${
                    bookingMode === 'NOW'
                      ? 'bg-[#25a475] text-[#00311f] shadow'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">directions_car</span>
                  <span>Ride Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('SCHEDULE')}
                  className={`py-2 px-3 rounded-md text-xs font-bold font-['Space_Grotesk'] flex items-center justify-center gap-2 transition-all ${
                    bookingMode === 'SCHEDULE'
                      ? 'bg-[#25a475] text-[#00311f] shadow'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>{t('scheduledRides.createTitle')}</span>
                </button>
              </div>

              {bookingMode === 'SCHEDULE' && (
                <div className="flex flex-col gap-3 pt-2 border-t border-[#262a33] text-xs">
                  {/* Schedule Type */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg bg-[#1c2028] text-[#dfe2ee] border border-[#262a33] flex-1">
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === 'ONE_TIME'}
                        onChange={() => setScheduleType('ONE_TIME')}
                        className="accent-[#68dba9]"
                      />
                      <span>{t('scheduledRides.oneTime')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg bg-[#1c2028] text-[#dfe2ee] border border-[#262a33] flex-1">
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === 'RECURRING'}
                        onChange={() => setScheduleType('RECURRING')}
                        className="accent-[#68dba9]"
                      />
                      <span>{t('scheduledRides.recurring')}</span>
                    </label>
                  </div>

                  {/* Frequency if Recurring */}
                  {scheduleType === 'RECURRING' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#87948b] text-[10px] uppercase font-bold">
                        Frequency:
                      </span>
                      <select
                        value={recurrenceFrequency}
                        onChange={(e) =>
                          setRecurrenceFrequency(
                            e.target.value as 'DAILY' | 'WEEKLY' | 'CUSTOM_DAYS',
                          )
                        }
                        className="bg-[#0a0e16] border border-[#262a33] rounded-lg px-2.5 py-1 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9] flex-1"
                      >
                        <option value="DAILY">{t('scheduledRides.frequency.daily')}</option>
                        <option value="WEEKLY">{t('scheduledRides.frequency.weekly')}</option>
                        <option value="CUSTOM_DAYS">
                          {t('scheduledRides.frequency.custom_days')}
                        </option>
                      </select>
                    </div>
                  )}

                  {/* Day Picker if Weekly or Custom */}
                  {scheduleType === 'RECURRING' &&
                    (recurrenceFrequency === 'WEEKLY' || recurrenceFrequency === 'CUSTOM_DAYS') && (
                      <div className="flex items-center justify-between gap-1 pt-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                          const active = selectedDays.includes(idx);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDays((prev) =>
                                  active ? prev.filter((d) => d !== idx) : [...prev, idx],
                                );
                              }}
                              className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all ${
                                active
                                  ? 'bg-[#25a475] text-[#00311f]'
                                  : 'bg-[#0a0e16] text-[#87948b] border border-[#262a33]'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {/* Time & Date Pickers */}
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleType === 'ONE_TIME' && (
                      <div>
                        <span className="text-[#87948b] text-[10px] uppercase font-bold block mb-1">
                          Date:
                        </span>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full bg-[#0a0e16] border border-[#262a33] rounded-lg px-2.5 py-1.5 text-xs text-[#dfe2ee] font-mono focus:outline-none focus:border-[#68dba9]"
                        />
                      </div>
                    )}
                    <div className={scheduleType === 'RECURRING' ? 'col-span-2' : ''}>
                      <span className="text-[#87948b] text-[10px] uppercase font-bold block mb-1">
                        Dispatch Time (IST):
                      </span>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-[#0a0e16] border border-[#262a33] rounded-lg px-2.5 py-1.5 text-xs text-[#dfe2ee] font-mono focus:outline-none focus:border-[#68dba9]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location & Pickup Anchor Card */}
            <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" />
                  <span className="text-[10px] font-bold uppercase text-[#68dba9] tracking-wider font-['Space_Grotesk']">
                    {t('customer.booking.pickupLockedEyebrow')}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#bccac0]">
                  {t('customer.booking.pickupSetTag')}
                </span>
              </div>

              <div className="bg-[#1c2028] rounded-lg p-3 flex items-center justify-between gap-3 border border-[#262a33]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#25a475]/20 flex items-center justify-center shrink-0 text-[#68dba9]">
                    <span className="material-symbols-outlined text-base">my_location</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] text-[#bccac0] uppercase block">
                      {t('customer.booking.currentPickupZoneLabel')}
                    </span>
                    <p className="font-bold text-sm text-[#dfe2ee] truncate font-['Space_Grotesk']">
                      {pickup.label ?? pickup.address}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEditPickup}
                  className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 border border-[#3d4a42]"
                >
                  <span className="material-symbols-outlined text-xs">edit_location</span>
                  <span>{t('customer.booking.changeBtn')}</span>
                </button>
              </div>

              <CurrentLocationButton onLocated={handleUseCurrentLocation} className="w-full" />

              {savedLocations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[9px] text-[#87948b]">
                    {t('customer.booking.quickSelectLabel')}
                  </span>
                  {savedLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() =>
                        setPickup({
                          address: savedLocationAddress(loc),
                          label: loc.label,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        })
                      }
                      className="px-2 py-1 rounded-lg bg-[#1c2028] border border-[#262a33] hover:border-[#68dba9] text-[10px] font-semibold text-[#dfe2ee] transition-colors"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-[#1c2028] rounded-lg p-3 flex items-center justify-between gap-3 border border-[#262a33]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center shrink-0 text-[#60a5fa]">
                    <span className="material-symbols-outlined text-base">location_on</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] text-[#bccac0] uppercase block">
                      {t('customer.booking.destinationZoneLabel')}
                    </span>
                    <p className="font-bold text-sm text-[#dfe2ee] truncate font-['Space_Grotesk']">
                      {dropoff.label ?? dropoff.address}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEditDropoff}
                  className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 border border-[#3d4a42]"
                >
                  <span className="material-symbols-outlined text-xs">edit_location</span>
                  <span>{t('customer.booking.changeBtn')}</span>
                </button>
              </div>

              {savedLocations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[9px] text-[#87948b]">
                    {t('customer.booking.quickSelectLabel')}
                  </span>
                  {savedLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() =>
                        setDropoff({
                          address: savedLocationAddress(loc),
                          label: loc.label,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        })
                      }
                      className="px-2 py-1 rounded-lg bg-[#1c2028] border border-[#262a33] hover:border-[#68dba9] text-[10px] font-semibold text-[#dfe2ee] transition-colors"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trip Configuration Tabs */}
            <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.serviceTierModeLabel')}
                </span>
                <span className="font-mono text-[10px] text-[#68dba9]">
                  {t('customer.booking.surchargeShieldActive')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedTab(tab.key)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-mono text-[11px] transition-all ${
                      selectedTab === tab.key
                        ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow border border-[#3d4a42]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${selectedTab === tab.key ? 'bg-[#68dba9]' : 'bg-transparent'}`}
                    />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Vehicle Specifications */}
              <div className="pt-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.vehicleProfileLabel')}
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {vehicleTiers.map((tier) => (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setVehicleClass(tier.key)}
                      className={`p-2.5 rounded-lg text-left flex flex-col gap-1 transition-all ${
                        vehicleClass === tier.key
                          ? 'bg-[#262a33] text-[#dfe2ee] border border-[#68dba9]/50 shadow'
                          : 'bg-[#1c2028] text-[#bccac0] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[#68dba9]">
                        <span className="material-symbols-outlined text-base">{tier.icon}</span>
                        {vehicleClass === tier.key && (
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase text-[#dfe2ee] font-['Space_Grotesk']">
                        {tier.label}
                      </span>
                      <span className="font-mono text-[9px] text-[#bccac0]">{tier.models}</span>
                    </button>
                  ))}
                </div>

                {/* Transmission Radio Options */}
                <div className="flex items-center justify-between bg-[#1c2028] p-2 rounded-lg mt-1 border border-[#262a33]">
                  <span className="font-mono text-[10px] text-[#bccac0]">
                    {t('customer.booking.transmissionMatrixLabel')}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded bg-[#262a33] text-[#dfe2ee] font-mono text-[10px]">
                      <input
                        type="radio"
                        name="transmission"
                        checked={transmission === 'auto'}
                        onChange={() => setTransmission('auto')}
                        className="accent-[#68dba9] w-3 h-3"
                      />
                      <span>{t('customer.booking.transmissionAuto')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded text-[#bccac0] font-mono text-[10px]">
                      <input
                        type="radio"
                        name="transmission"
                        checked={transmission === 'manual'}
                        onChange={() => setTransmission('manual')}
                        className="accent-[#68dba9] w-3 h-3"
                      />
                      <span>{t('customer.booking.transmissionManual')}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferred Driver — real favorites, honest non-guarantee framing */}
            {favoriteDrivers.length > 0 && (
              <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.preferredDriverSectionTitle')}
                </span>
                <p className="text-[10px] text-[#87948b]">
                  {t('customer.booking.preferredDriverSubtitle')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreferredDriverProfileId(null)}
                    className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] transition-colors ${
                      preferredDriverProfileId === null
                        ? 'bg-[#68dba9] text-[#003825] font-bold'
                        : 'bg-[#262a33] text-[#dfe2ee]'
                    }`}
                  >
                    {t('customer.booking.preferredDriverNone')}
                  </button>
                  {favoriteDrivers.map((fav) => (
                    <button
                      key={fav.driverProfileId}
                      type="button"
                      onClick={() => setPreferredDriverProfileId(fav.driverProfileId)}
                      className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] flex items-center gap-1 transition-colors ${
                        preferredDriverProfileId === fav.driverProfileId
                          ? 'bg-[#68dba9] text-[#003825] font-bold'
                          : 'bg-[#262a33] text-[#dfe2ee]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">star</span>
                      {favoriteDisplayName(fav)}
                      <span className="opacity-70">
                        {t('customer.favorites.rating', { rating: fav.ratingAverage.toFixed(1) })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Estimation Breakdown */}
            <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.fareBreakdownLabel')}
                </span>
                <span className="font-mono text-[10px] text-[#68dba9] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>{' '}
                  {t('customer.booking.guaranteedRateTag')}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-[#bccac0]">
                <div className="flex justify-between items-center">
                  <span>{t('customer.booking.baseFareLabel')}</span>
                  <span className="text-[#dfe2ee]">
                    {fareEstimate
                      ? formatCurrency(Number(fareEstimate.breakdown.baseFareAmount))
                      : formatCurrency(100)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>
                    {t('customer.booking.distanceDurationLabel', {
                      km: fareEstimate ? fareEstimate.estimatedDistanceKm : 10,
                    })}
                  </span>
                  <span className="text-[#dfe2ee]">
                    {fareEstimate
                      ? formatCurrency(
                          Number(fareEstimate.breakdown.distanceFareAmount) +
                            Number(fareEstimate.breakdown.durationFareAmount) +
                            Number(fareEstimate.breakdown.packageAdjustmentAmount),
                        )
                      : formatCurrency(210)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('customer.booking.platformFeeLabel')}</span>
                  <span className="text-[#dfe2ee]">
                    {fareEstimate
                      ? formatCurrency(Number(fareEstimate.breakdown.platformFeeAmount))
                      : formatCurrency(25)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between bg-[#1c2028] p-3 rounded-lg border border-[#262a33]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    {t('customer.booking.totalFareLabel')}
                  </span>
                  <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {fareEstimate
                      ? formatCurrency(Number(fareEstimate.breakdown.totalFareAmount))
                      : formatCurrency(335)}
                  </span>
                </div>
                <div className="text-right font-mono text-[10px]">
                  <span className="text-[#bccac0] block">
                    {t('customer.booking.billingStartsNote')}
                  </span>
                  <span className="text-[#68dba9]">
                    {t('customer.booking.noCancellationFeeNote')}
                  </span>
                </div>
              </div>

              {/* Primary CTA Button */}
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#68dba9]/20 font-['Space_Grotesk'] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#003825] border-t-transparent" />
                ) : (
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                )}
                <span>
                  {bookingMode === 'SCHEDULE'
                    ? t('scheduledRides.confirmSchedule', {
                        defaultValue: 'Confirm & Schedule Ride',
                      })
                    : t('customer.booking.confirmBookingCta')}
                </span>
              </button>
            </div>
          </section>

          {/* Right Panel: Radar Canvas (58% width) */}
          <section className="w-full xl:w-[58%] flex flex-col gap-4 relative shrink-0">
            <div className="relative w-full h-[540px] rounded-2xl overflow-hidden bg-[#0a0e16] shadow-2xl flex flex-col justify-between p-4 border border-[#262a33]">
              {/* Radar Grid SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#68dba9" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#68dba9" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#0f131c" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path
                  d="M0,190 H1000 M0,380 H1000 M0,570 H1000"
                  stroke="#31353e"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.4"
                />
                <path
                  d="M250,0 V800 M500,0 V800 M750,0 V800"
                  stroke="#31353e"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.4"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="90"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                  opacity="0.3"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="180"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.25"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="240"
                  fill="url(#radarSweep)"
                  className="animate-pulse"
                />
              </svg>

              <div className="absolute inset-0 origin-center animate-radar-sweep pointer-events-none">
                <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#68dba9]/30 to-transparent origin-bottom-right transform rotate-45 rounded-tl-full" />
              </div>

              {/* Top Map HUD & Controls */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-[#181c24]/90 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-[#262a33]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#68dba9] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0f131c]" />
                    </span>
                    <span className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      {t('customer.booking.radarSectorLabel')}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-[#bccac0] bg-[#1c2028] px-2 py-1 rounded border border-[#262a33]">
                    <span>{t('customer.booking.sweepBandLabel')}</span>
                    <span>•</span>
                    <span className="text-[#68dba9]">{t('customer.booking.latencyLabel')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#1c2028] px-3 py-1.5 rounded-lg border border-[#262a33]">
                    <span className="material-symbols-outlined text-xs text-[#bccac0]">radar</span>
                    <span className="font-mono text-[10px] text-[#bccac0]">
                      {t('customer.booking.radiusLabel')}
                    </span>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                      className="w-16 accent-[#68dba9] cursor-pointer h-1 bg-[#262a33] rounded-lg"
                    />
                    <span className="font-mono text-[10px] text-[#68dba9] font-bold">
                      {radiusKm}km
                    </span>
                  </div>

                  <div className="flex items-center bg-[#1c2028] p-1 rounded-lg border border-[#262a33]">
                    <button
                      type="button"
                      onClick={() => setMapStyle('dark')}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        mapStyle === 'dark' ? 'bg-[#262a33] text-[#dfe2ee]' : 'text-[#bccac0]'
                      }`}
                    >
                      {t('customer.booking.mapStyleDark')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapStyle('satellite')}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        mapStyle === 'satellite' ? 'bg-[#262a33] text-[#dfe2ee]' : 'text-[#bccac0]'
                      }`}
                    >
                      {t('customer.booking.mapStyleSatellite')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Pin Anchor — reflects the real, currently-selected pickup */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-12 h-12 rounded-full bg-[#68dba9]/30 animate-ping" />
                  <div className="w-6 h-6 rounded-full bg-[#68dba9] shadow-[0_0_16px_#68dba9] flex items-center justify-center text-[#003825]">
                    <span className="material-symbols-outlined text-xs font-bold">person_pin</span>
                  </div>
                </div>
                <div className="mt-2 bg-[#0a0e16]/90 backdrop-blur-md px-2.5 py-1 rounded shadow text-center border border-[#262a33] max-w-[220px]">
                  <span className="text-[9px] font-bold text-[#68dba9] uppercase block font-['Space_Grotesk']">
                    {t('customer.booking.pickupAnchorLabel')}
                  </span>
                  <span className="font-mono text-[9px] text-[#bccac0] truncate block">
                    {pickup.label ?? pickup.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry & SLA Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">timer</span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    {t('customer.booking.avgArrivalLabel')}
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    6.8{' '}
                    <span className="text-xs font-normal">{t('customer.booking.minsUnit')}</span>
                  </span>
                </div>
              </div>

              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                  verified_user
                </span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    {t('customer.booking.backgroundPassLabel')}
                  </span>
                  <span className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                    100%
                  </span>
                </div>
              </div>

              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">shield</span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    {t('customer.booking.transitCoverLabel')}
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹50L{' '}
                    <span className="text-xs font-normal">
                      {t('customer.booking.transitCoverUnit')}
                    </span>
                  </span>
                </div>
              </div>

              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                  support_agent
                </span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    {t('customer.booking.sosResponseLabel')}
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    &lt; 30s
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default function BookDriverPage() {
  return (
    <Suspense fallback={null}>
      <BookDriverPageInner />
    </Suspense>
  );
}
