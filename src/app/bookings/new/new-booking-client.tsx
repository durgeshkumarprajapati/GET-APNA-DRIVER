'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerLayout } from '@/components/customer-layout';
import { CurrentLocationButton } from '@/components/ui/current-location-button';
import { UnifiedMap } from '@/components/maps/unified-map';
import type { MapMarkerDefinition } from '@/modules/maps/domain/map-types';
import { useGeolocationCapture, type CapturedLocation } from '@/components/use-geolocation-capture';
import { useTranslation } from '@/i18n/context';
import { BookingType } from '@prisma/client';
import { BookingTypeSelector } from '@/components/booking/BookingTypeSelector';
import { DriverHireDurationSelector } from '@/components/booking/DriverHireDurationSelector';
import {
  isDriverHireBooking,
  isRateSelectableHireBooking,
} from '@/modules/booking/domain/booking-policy';
import { useToast, ToastViewport } from '@/components/ui/toast';
import { VehicleCategorySelector } from '@/components/booking/VehicleCategorySelector';

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

interface HireDriverRecord {
  driverProfileId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  ratingAverage: number;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  rate: string;
}

interface NearbyAvailableDriverRecord {
  driverProfileId: string;
  displayName: string;
  profileImageUrl: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  distanceMeters: number;
  distanceFormatted: string;
}

interface DriverReviewRecord {
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerLabel: string;
}

interface DriverProfileDetail {
  driverProfileId: string;
  displayName: string;
  profileImageUrl: string | null;
  bio: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  memberSince: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  completedTrips: number;
  completionRate: string;
  recentReviews: DriverReviewRecord[];
  rate: string | null;
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

function hireDriverDisplayName(driver: HireDriverRecord): string {
  if (driver.displayName) return driver.displayName;
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ') || '—';
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

  // No hardcoded city default (e.g. Delhi) — pickup starts unresolved and is
  // populated only from the customer's real device GPS (auto-captured below)
  // or their own explicit choice (manual edit, saved place, Book Again).
  // pickupReady stays false until one of those provides real coordinates, so
  // nothing downstream (fare estimate, map marker, submit) ever treats an
  // unresolved placeholder as if it were a real location.
  const [pickup, setPickup] = useState<LocationField>({
    address: '',
    label: null,
    latitude: 0,
    longitude: 0,
  });
  const [pickupReady, setPickupReady] = useState(false);
  const [dropoff, setDropoff] = useState<LocationField>({
    address: '',
    label: null,
    latitude: 0,
    longitude: 0,
  });
  const [dropoffReady, setDropoffReady] = useState(false);
  const [selectedBookingType, setSelectedBookingType] = useState<BookingType>(
    BookingType.POINT_TO_POINT,
  );
  const [includeDropoff, setIncludeDropoff] = useState<boolean>(true);
  const [hireDurationValue, setHireDurationValue] = useState<number>(4);
  const [hireStartTime, setHireStartTime] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<BookingTypeTab>('hourly');
  const [vehicleClass, setVehicleClass] = useState<'luxury' | 'sedan' | 'hatchback'>('luxury');
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto');
  const [preferredDriverProfileId, setPreferredDriverProfileId] = useState<string | null>(null);
  const [selectedVehicleCategoryId, setSelectedVehicleCategoryId] = useState<string | null>(null);

  const getHireDurationMinutes = (type: BookingType, val: number): number | null => {
    if (type === BookingType.HOURLY) return val * 60;
    if (type === BookingType.DAILY || type === BookingType.FULL_DAY) return val * 1440;
    if (type === BookingType.WEEKLY) return val * 10080;
    if (type === BookingType.MONTHLY) return val * 43200;
    return null;
  };

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
  const [hireDrivers, setHireDrivers] = useState<HireDriverRecord[]>([]);
  const [hireDriversLoading, setHireDriversLoading] = useState(false);
  const [nearbyAvailableDrivers, setNearbyAvailableDrivers] = useState<
    NearbyAvailableDriverRecord[]
  >([]);
  const [nearbyAvailableDriversLoading, setNearbyAvailableDriversLoading] = useState(false);
  const [viewingDriverId, setViewingDriverId] = useState<string | null>(null);
  const [viewingDriverProfile, setViewingDriverProfile] = useState<DriverProfileDetail | null>(
    null,
  );
  const [viewingDriverLoading, setViewingDriverLoading] = useState(false);
  const [viewingDriverError, setViewingDriverError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<FareEstimateData | null>(null);
  const { toast, showError, dismissToast } = useToast();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCodeInput.trim() || !fareEstimate) return;
    setCouponValidating(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/customer/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCodeInput.trim(),
          fareAmount: fareEstimate.breakdown.totalFareAmount,
          bookingType: selectedBookingType,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.preview?.valid) {
        setAppliedCouponCode(data.preview.code);
        setCouponDiscountAmount(data.preview.discountAmount);
        setCouponError(null);
      } else {
        setAppliedCouponCode(null);
        setCouponDiscountAmount(null);
        setCouponError(data?.preview?.errorMessage || data?.message || 'Invalid coupon code.');
      }
    } catch {
      setCouponError('Failed to validate coupon code.');
    } finally {
      setCouponValidating(false);
    }
  }, [couponCodeInput, fareEstimate, selectedBookingType]);

  const {
    status: autoLocationStatus,
    errorMessage: autoLocationError,
    capture: captureDeviceLocation,
  } = useGeolocationCapture();

  const updatePickupWithAddress = useCallback(async (lat: number, lng: number) => {
    setPickup((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address:
        prev.address && prev.address !== 'Current location selected'
          ? prev.address
          : 'Fetching address…',
      label: null,
    }));
    setPickupReady(true);

    try {
      const res = await fetch(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          const formatted =
            data.address.formattedAddress ||
            [
              data.address.addressLine1,
              data.address.city,
              data.address.state,
              data.address.postalCode,
            ]
              .filter(Boolean)
              .join(', ');
          if (formatted) {
            setPickup((prev) => ({
              ...prev,
              address: formatted,
            }));
            return;
          }
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }

    setPickup((prev) => ({
      ...prev,
      address: `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    }));
  }, []);

  const handleUseCurrentLocation = (location: CapturedLocation) => {
    updatePickupWithAddress(location.latitude, location.longitude);
  };

  // Auto-detect the customer's real device location on load and reverse-geocode
  // it into a proper readable address.
  useEffect(() => {
    if (
      searchParams.get('bookAgain') ||
      searchParams.get('savedLocationId') ||
      searchParams.get('prefillPickup')
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await captureDeviceLocation();
      if (cancelled || !result) return;
      await updatePickupWithAddress(result.latitude, result.longitude);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // DAILY/WEEKLY/MONTHLY hires require the customer to choose a specific
  // active, non-conflicting driver at that driver's own rate — refetch this
  // browsable list whenever the booking type, duration, or start time
  // changes the hire window it needs to check against. If the previously
  // selected driver drops out of the refreshed list (became unavailable, or
  // the window changed), the selection is cleared rather than silently kept.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isRateSelectableHireBooking(selectedBookingType)) {
        if (isMounted) setHireDrivers([]);
        return;
      }
      const hireMins = getHireDurationMinutes(selectedBookingType, hireDurationValue);
      if (!hireMins) return;

      if (isMounted) setHireDriversLoading(true);
      try {
        const params = new URLSearchParams({
          bookingType: selectedBookingType,
          hireDurationMinutes: String(hireMins),
        });
        if (hireStartTime) {
          params.set('hireStartAt', new Date(hireStartTime).toISOString());
        }
        if (selectedVehicleCategoryId) {
          params.set('vehicleCategoryId', selectedVehicleCategoryId);
        }
        const res = await fetch(`/api/customer/drivers/available-for-hire?${params.toString()}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          const drivers: HireDriverRecord[] = data.drivers ?? [];
          setHireDrivers(drivers);
          setPreferredDriverProfileId((prev) =>
            prev && !drivers.some((d) => d.driverProfileId === prev) ? null : prev,
          );
        }
      } catch {
        // List just stays empty — the required-selection gate below still
        // blocks submission honestly rather than pretending a driver exists.
      } finally {
        if (isMounted) setHireDriversLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedBookingType, hireDurationValue, hireStartTime, selectedVehicleCategoryId]);

  // POINT_TO_POINT/HOURLY: browsable list of every currently available,
  // non-conflicting nearby driver — purely optional (sets the same soft
  // preferredDriverProfileId preference as the favorites list above), and
  // deliberately does NOT wait on a dropoff location, since neither of
  // these booking types requires one. Only needs the pickup location to be
  // resolved, so it can run before the customer has decided on (or even
  // needs) a destination.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const isImmediateBrowsableType =
        selectedBookingType === BookingType.POINT_TO_POINT ||
        selectedBookingType === BookingType.HOURLY;
      if (!isImmediateBrowsableType) {
        if (isMounted) setNearbyAvailableDrivers([]);
        return;
      }

      if (isMounted) setNearbyAvailableDriversLoading(true);
      try {
        const params = new URLSearchParams({
          bookingType: selectedBookingType,
        });
        if (pickupReady && pickup.latitude != null && pickup.longitude != null) {
          params.set('pickupLatitude', String(pickup.latitude));
          params.set('pickupLongitude', String(pickup.longitude));
        }
        if (selectedBookingType === BookingType.HOURLY) {
          const hireMins = getHireDurationMinutes(selectedBookingType, hireDurationValue);
          if (hireMins) params.set('hireDurationMinutes', String(hireMins));
        }
        if (selectedVehicleCategoryId) {
          params.set('vehicleCategoryId', selectedVehicleCategoryId);
        }
        const res = await fetch(`/api/customer/drivers/available-for-hire?${params.toString()}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          const drivers: NearbyAvailableDriverRecord[] = data.drivers ?? [];
          setNearbyAvailableDrivers(drivers);
          setPreferredDriverProfileId((prev) =>
            prev && !drivers.some((d) => d.driverProfileId === prev) ? null : prev,
          );
        }
      } catch {
        // List stays empty on error
      } finally {
        if (isMounted) setNearbyAvailableDriversLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [
    selectedBookingType,
    pickupReady,
    pickup.latitude,
    pickup.longitude,
    hireDurationValue,
    selectedVehicleCategoryId,
  ]);

  // Loads the full profile (bio, rating breakdown, recent reviews, rate for
  // this hire type) for whichever driver the customer just tapped in the
  // "Choose Your Driver" list, so they can review before committing —
  // required reading before selection, not just a name/rate row.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!viewingDriverId) {
        if (isMounted) setViewingDriverProfile(null);
        return;
      }
      if (isMounted) {
        setViewingDriverLoading(true);
        setViewingDriverError(null);
      }
      try {
        const params = new URLSearchParams({ bookingType: selectedBookingType });
        const res = await fetch(
          `/api/customer/drivers/${viewingDriverId}/profile?${params.toString()}`,
        );
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setViewingDriverProfile(data.profile);
        } else {
          setViewingDriverError(t('customer.booking.driverProfileLoadError'));
        }
      } catch {
        if (isMounted) setViewingDriverError(t('customer.booking.driverProfileLoadError'));
      } finally {
        if (isMounted) setViewingDriverLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [viewingDriverId, selectedBookingType, t]);

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
        setPickupReady(true);
      }
      if (prefillDropoff) {
        setDropoff((prev) => ({ ...prev, address: prefillDropoff }));
        setDropoffReady(true);
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
          setPickupReady(true);
          if (booking.dropoffLocation) {
            setDropoff({
              address: booking.dropoffLocation.address,
              label: booking.dropoffLocation.label,
              latitude: booking.dropoffLocation.latitude,
              longitude: booking.dropoffLocation.longitude,
            });
            setDropoffReady(true);
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
          setDropoffReady(true);
        }
      } catch {
        // Prefill is a convenience — silently fall back to the defaults.
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    // Never quote a fare against an unresolved (0,0) placeholder pickup or
    // dropoff — wait for real coordinates (device GPS, manual entry, saved
    // place, or Book Again) before asking the pricing service for an
    // estimate. Without this, a still-unset dropoff (address: '', 0,0)
    // produces a nonsensical "10,000+ km" distance from Null Island.
    if (!pickupReady) return;

    async function fetchEstimate() {
      try {
        const activeDropoff = includeDropoff && dropoffReady ? dropoff : null;
        const hireMins = getHireDurationMinutes(selectedBookingType, hireDurationValue);

        const res = await fetch('/api/pricing/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickup: {
              latitude: pickup.latitude,
              longitude: pickup.longitude,
              address: pickup.address,
            },
            dropoff: activeDropoff
              ? {
                  latitude: activeDropoff.latitude,
                  longitude: activeDropoff.longitude,
                  address: activeDropoff.address,
                }
              : null,
            bookingType: selectedBookingType,
            hireDurationMinutes: hireMins,
            numberOfDays: selectedBookingType === BookingType.DAILY ? hireDurationValue : null,
            numberOfWeeks: selectedBookingType === BookingType.WEEKLY ? hireDurationValue : null,
            numberOfMonths: selectedBookingType === BookingType.MONTHLY ? hireDurationValue : null,
            hourlyPackageHours:
              selectedBookingType === BookingType.HOURLY ? hireDurationValue : null,
            preferredDriverProfileId,
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
  }, [
    selectedBookingType,
    hireDurationValue,
    includeDropoff,
    pickup,
    dropoff,
    pickupReady,
    dropoffReady,
    preferredDriverProfileId,
  ]);

  const handleEditPickup = useCallback(() => {
    const next = prompt(t('customer.booking.promptPickup'), pickup.address);
    if (next) {
      setPickup((prev) => ({ ...prev, address: next, label: null }));
      setPickupReady(true);
    }
  }, [pickup.address, t]);

  const handleEditDropoff = useCallback(() => {
    const next = prompt(t('customer.booking.promptDropoff'), dropoff.address);
    if (next) {
      setDropoff((prev) => ({ ...prev, address: next, label: null }));
      setDropoffReady(true);
    }
  }, [dropoff.address, t]);

  const handleConfirmDispatch = async () => {
    if (!pickupReady) {
      showError(t('customer.booking.locationNotSet'));
      return;
    }
    if (isRateSelectableHireBooking(selectedBookingType) && !preferredDriverProfileId) {
      showError(t('customer.booking.driverSelectionRequiredError'));
      return;
    }

    setLoading(true);

    const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const activeDropoff = includeDropoff && dropoffReady ? dropoff : null;
    const hireMins = getHireDurationMinutes(selectedBookingType, hireDurationValue);

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
            dropoffLocation: activeDropoff
              ? {
                  latitude: activeDropoff.latitude,
                  longitude: activeDropoff.longitude,
                  address: activeDropoff.address,
                  label: activeDropoff.label,
                }
              : null,
            bookingType: selectedBookingType,
            preferredDriverProfileId,
            vehicleCategoryId: selectedVehicleCategoryId ?? undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showError(
            data.error === 'INVALID_INPUT'
              ? t('customer.booking.validationFailedError')
              : data.message ||
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
            dropoffLocation: activeDropoff
              ? {
                  latitude: activeDropoff.latitude,
                  longitude: activeDropoff.longitude,
                  address: activeDropoff.address,
                  label: activeDropoff.label,
                }
              : null,
            bookingType: selectedBookingType,
            hireDurationMinutes: hireMins,
            hireStartAt: hireStartTime ? new Date(hireStartTime).toISOString() : undefined,
            numberOfDays: selectedBookingType === BookingType.DAILY ? hireDurationValue : null,
            numberOfWeeks: selectedBookingType === BookingType.WEEKLY ? hireDurationValue : null,
            numberOfMonths: selectedBookingType === BookingType.MONTHLY ? hireDurationValue : null,
            hourlyPackageHours:
              selectedBookingType === BookingType.HOURLY ? hireDurationValue : null,
            preferredDriverProfileId,
            vehicleCategoryId: selectedVehicleCategoryId ?? undefined,
            promotionCode: appliedCouponCode ?? undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showError(
            data.error === 'INVALID_INPUT'
              ? t('customer.booking.validationFailedError')
              : data.error === 'DRIVER_SELECTION_REQUIRED'
                ? t('customer.booking.driverSelectionRequiredError')
                : data.error === 'SELECTED_DRIVER_UNAVAILABLE'
                  ? t('customer.booking.selectedDriverUnavailableError')
                  : data.message || t('customer.booking.dispatchFailedError'),
          );
        } else {
          router.push(`/bookings/${data.booking.id}`);
        }
      }
    } catch {
      showError(t('customer.booking.dispatchUnexpectedError'));
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
            {/* Phase 56 Flexible Driver Hire Mode Selector */}
            <BookingTypeSelector
              selectedType={selectedBookingType}
              onSelectType={setSelectedBookingType}
            />

            {/* Vehicle Category Requirement Selector (Phase 66) */}
            <VehicleCategorySelector
              selectedCategoryId={selectedVehicleCategoryId}
              onSelectCategory={setSelectedVehicleCategoryId}
            />

            {/* Duration Selector for Driver Hire Modes */}
            <DriverHireDurationSelector
              bookingType={selectedBookingType}
              durationValue={hireDurationValue}
              onChangeDurationValue={setHireDurationValue}
              startTime={hireStartTime}
              onChangeStartTime={setHireStartTime}
            />

            {/* Booking Mode Selector (Book Now vs Schedule Booking) */}
            <div className="bg-[#181c24] rounded-xl p-3 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                <button
                  type="button"
                  onClick={() => setBookingMode('NOW')}
                  className={`py-2 px-3 rounded-md text-xs font-bold font-['Space_Grotesk'] flex items-center justify-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
                    bookingMode === 'NOW'
                      ? 'bg-[#25a475] text-[#00311f] shadow'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">directions_car</span>
                  <span>Book Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('SCHEDULE')}
                  className={`py-2 px-3 rounded-md text-xs font-bold font-['Space_Grotesk'] flex items-center justify-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
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
                              className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
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
                      {pickup.address
                        ? (pickup.label ?? pickup.address)
                        : autoLocationStatus === 'ACQUIRING'
                          ? t('customer.booking.detectingLocation')
                          : (autoLocationError ?? t('customer.booking.locationNotSet'))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEditPickup}
                  className="bg-[#262a33] hover:bg-[#31353e] active:bg-[#3d4a42] text-[#dfe2ee] font-mono text-[10px] px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 border border-[#3d4a42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
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
                      className="px-2 py-1 rounded-lg bg-[#1c2028] border border-[#262a33] hover:border-[#68dba9] text-[10px] font-semibold text-[#dfe2ee] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Flexible Dropoff Location Section */}
              {isDriverHireBooking(selectedBookingType) ? (
                <div className="bg-[#1c2028] rounded-lg p-3.5 border border-[#262a33] text-xs text-[#87948b] flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#25a475] text-lg shrink-0">
                    info
                  </span>
                  <span>
                    {t('booking.noDropoffRequiredHire', {
                      defaultValue:
                        'No drop location required for driver hire. Your driver will stay with you throughout your hire period.',
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[#262a33]/60">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#dfe2ee]">
                    <input
                      type="checkbox"
                      checked={includeDropoff}
                      onChange={(e) => setIncludeDropoff(e.target.checked)}
                      className="w-4 h-4 rounded border-[#262a33] bg-[#0a0e16] accent-[#25a475]"
                    />
                    <span>
                      {t('booking.addDropoffOptional', {
                        defaultValue: 'Specify Drop Location (Optional)',
                      })}
                    </span>
                  </label>

                  {includeDropoff && (
                    <>
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
                          className="bg-[#262a33] hover:bg-[#31353e] active:bg-[#3d4a42] text-[#dfe2ee] font-mono text-[10px] px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 border border-[#3d4a42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
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
                              className="px-2 py-1 rounded-lg bg-[#1c2028] border border-[#262a33] hover:border-[#68dba9] text-[10px] font-semibold text-[#dfe2ee] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                            >
                              {loc.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Embedded Google Map Preview */}
              <div className="mt-2 pt-3 border-t border-[#262a33]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-[#87948b] font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#68dba9]">map</span>
                    <span>Route Location Preview</span>
                  </span>
                  <span className="text-[9px] text-[#68dba9] font-mono">LIVE MAP</span>
                </div>
                {(() => {
                  const markers: MapMarkerDefinition[] = [];
                  if (pickupReady) {
                    markers.push({
                      id: 'pickup',
                      position: { latitude: pickup.latitude, longitude: pickup.longitude },
                      type: 'PICKUP',
                      title: 'Pickup Location',
                      snippet: pickup.address,
                    });
                  }
                  if (
                    dropoffReady &&
                    dropoff &&
                    !isDriverHireBooking(selectedBookingType) &&
                    includeDropoff
                  ) {
                    markers.push({
                      id: 'dropoff',
                      position: { latitude: dropoff.latitude, longitude: dropoff.longitude },
                      type: 'DROPOFF',
                      title: 'Dropoff Location',
                      snippet: dropoff.address,
                    });
                  }
                  return (
                    <UnifiedMap
                      markers={markers}
                      height="200px"
                      fitBounds={true}
                      showControls={false}
                      ariaLabel="Interactive pickup and dropoff map preview"
                    />
                  );
                })()}
              </div>
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
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-mono text-[11px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {vehicleTiers.map((tier) => (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setVehicleClass(tier.key)}
                      className={`p-2.5 rounded-lg text-left flex flex-col gap-1 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
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

            {/* Preferred Driver — real favorites, honest non-guarantee framing.
                Not shown for DAILY/WEEKLY/MONTHLY, which use the required
                "Choose Your Driver" section below instead. */}
            {!isRateSelectableHireBooking(selectedBookingType) && favoriteDrivers.length > 0 && (
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
                    className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
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
                      className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] flex items-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
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

            {/* Browse all available drivers — POINT_TO_POINT/HOURLY only.
                Purely optional (sets the same soft preferredDriverProfileId
                as the favorites list above); booking still works fine via
                normal auto-dispatch matching if nobody is picked here. Does
                not require a dropoff location — only the pickup point. */}
            {(selectedBookingType === BookingType.POINT_TO_POINT ||
              selectedBookingType === BookingType.HOURLY) && (
              <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.nearbyAvailableDriversTitle', {
                    defaultValue: 'Browse Available Drivers Nearby',
                  })}
                </span>
                <p className="text-[10px] text-[#87948b]">
                  {t('customer.booking.nearbyAvailableDriversSubtitle', {
                    defaultValue:
                      "Optional — every online driver near your pickup with no booking conflict. Pick one to request them directly, or skip this and we'll match you automatically.",
                  })}
                </p>

                {nearbyAvailableDriversLoading ? (
                  <p className="text-[11px] text-[#87948b] py-2">
                    {t('customer.booking.loadingAvailableDrivers')}
                  </p>
                ) : nearbyAvailableDrivers.length === 0 ? (
                  <p className="text-[11px] text-[#87948b] py-2">
                    {t('customer.booking.noDriversAvailableNearby', {
                      defaultValue:
                        'No drivers are currently available for this booking type. You can still book — we will keep searching.',
                    })}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setPreferredDriverProfileId(null)}
                      className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] self-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
                        preferredDriverProfileId === null ||
                        !nearbyAvailableDrivers.some(
                          (d) => d.driverProfileId === preferredDriverProfileId,
                        )
                          ? 'bg-[#68dba9] text-[#003825] font-bold'
                          : 'bg-[#262a33] text-[#dfe2ee]'
                      }`}
                    >
                      {t('customer.booking.preferredDriverNone')}
                    </button>
                    {nearbyAvailableDrivers.map((driver) => (
                      <button
                        key={driver.driverProfileId}
                        type="button"
                        onClick={() =>
                          setPreferredDriverProfileId((prev) =>
                            prev === driver.driverProfileId ? null : driver.driverProfileId,
                          )
                        }
                        className={`card-interactive flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          preferredDriverProfileId === driver.driverProfileId
                            ? 'bg-[#00311f] border-[#25a475]'
                            : 'bg-[#0a0e16] border-[#262a33] hover:border-[#25a475]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {preferredDriverProfileId === driver.driverProfileId && (
                            <span className="material-symbols-outlined text-[#25a475] text-base shrink-0">
                              check_circle
                            </span>
                          )}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-semibold text-[#dfe2ee] truncate">
                              {driver.displayName}
                            </span>
                            <span className="text-[10px] text-[#87948b] font-mono">
                              {t('customer.booking.experienceYears', {
                                years: driver.drivingExperienceYears,
                              })}
                              {driver.primaryServiceArea ? ` · ${driver.primaryServiceArea}` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#68dba9] font-mono shrink-0">
                          {driver.distanceFormatted}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Choose Your Driver — required for DAILY/WEEKLY/MONTHLY hires.
                No platform-default-rate fallback for these three types: the
                customer must pick one of the active, non-conflicting
                drivers below, at that driver's own listed rate. */}
            {isRateSelectableHireBooking(selectedBookingType) && (
              <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.chooseYourDriverTitle')}
                </span>
                <p className="text-[10px] text-[#87948b]">
                  {t('customer.booking.chooseYourDriverSubtitle')}
                </p>

                {hireDriversLoading ? (
                  <p className="text-[11px] text-[#87948b] py-2">
                    {t('customer.booking.loadingAvailableDrivers')}
                  </p>
                ) : hireDrivers.length === 0 ? (
                  <p className="text-[11px] text-[#87948b] py-2">
                    {t('customer.booking.noDriversAvailableForHire')}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {hireDrivers.map((driver) => (
                      <button
                        key={driver.driverProfileId}
                        type="button"
                        onClick={() => setViewingDriverId(driver.driverProfileId)}
                        className={`card-interactive flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          preferredDriverProfileId === driver.driverProfileId
                            ? 'bg-[#00311f] border-[#25a475]'
                            : 'bg-[#0a0e16] border-[#262a33] hover:border-[#25a475]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {preferredDriverProfileId === driver.driverProfileId && (
                            <span className="material-symbols-outlined text-[#25a475] text-base shrink-0">
                              check_circle
                            </span>
                          )}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-semibold text-[#dfe2ee] truncate">
                              {hireDriverDisplayName(driver)}
                            </span>
                            <span className="text-[10px] text-[#87948b] font-mono">
                              {t('customer.favorites.rating', {
                                rating: driver.ratingAverage.toFixed(1),
                              })}{' '}
                              ·{' '}
                              {t('customer.booking.experienceYears', {
                                years: driver.drivingExperienceYears,
                                defaultValue: `${driver.drivingExperienceYears} yrs exp`,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-[#25a475] font-mono">
                            {formatCurrency(Number(driver.rate))}
                          </span>
                          <span className="text-[9px] text-[#87948b] uppercase font-semibold underline">
                            {t('customer.booking.viewDetailsLink', {
                              defaultValue: 'View Details',
                            })}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                  {/* GET Apna Driver bills for the driver's service (time or
                      package), never distance — the customer already owns
                      the vehicle. distanceFareAmount is always zero and is
                      deliberately left out of this line. */}
                  <span>{t('customer.booking.serviceDurationLabel')}</span>
                  <span className="text-[#dfe2ee]">
                    {fareEstimate
                      ? formatCurrency(
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
                      ? formatCurrency(
                          Math.max(
                            0,
                            Number(fareEstimate.breakdown.totalFareAmount) -
                              Number(couponDiscountAmount ?? 0),
                          ),
                        )
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

              {/* Coupon / Promo Code Card */}
              <div className="p-3.5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#dfe2ee] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      local_offer
                    </span>
                    <span>Coupon / Promo Code</span>
                  </span>
                  {appliedCouponCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCouponCode(null);
                        setCouponDiscountAmount(null);
                        setCouponCodeInput('');
                        setCouponError(null);
                      }}
                      className="text-[11px] text-rose-400 hover:underline active:text-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] rounded"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => {
                      setCouponCodeInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    placeholder="Enter Code (e.g. FIRST50)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#262a33] text-xs font-mono text-[#dfe2ee] uppercase focus:outline-none focus:border-[#68dba9]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponValidating || !couponCodeInput.trim() || !fareEstimate}
                    className="min-h-[40px] min-w-[72px] px-3.5 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#68dba9] active:bg-[#1c7d5c] text-[#00311f] text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                  >
                    {couponValidating ? 'Checking…' : 'Apply'}
                  </button>
                </div>

                {couponError && (
                  <p className="text-xs text-[#ff897d] bg-[#93000a]/20 p-2 rounded-lg border border-[#93000a]">
                    {couponError}
                  </p>
                )}

                {appliedCouponCode && couponDiscountAmount && fareEstimate && (
                  <div className="pt-2 border-t border-[#262a33] text-xs space-y-1">
                    <div className="flex justify-between text-[#87948b]">
                      <span>Original Fare:</span>
                      <span>₹{Number(fareEstimate.breakdown.totalFareAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#68dba9] font-bold">
                      <span>Coupon Discount ({appliedCouponCode}):</span>
                      <span>- ₹{Number(couponDiscountAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#dfe2ee] font-extrabold text-sm pt-1 border-t border-[#262a33]">
                      <span>Final Fare:</span>
                      <span className="text-[#68dba9]">
                        ₹
                        {Math.max(
                          0,
                          Number(fareEstimate.breakdown.totalFareAmount) -
                            Number(couponDiscountAmount),
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary CTA Button */}
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={
                  loading ||
                  !pickupReady ||
                  (isRateSelectableHireBooking(selectedBookingType) && !preferredDriverProfileId)
                }
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] active:bg-[#4fc890] text-[#003825] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#68dba9]/20 font-['Space_Grotesk'] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#003825] border-t-transparent" />
                ) : (
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                )}
                <span>
                  {bookingMode === 'SCHEDULE'
                    ? t('scheduledRides.confirmSchedule', {
                        defaultValue: 'Confirm & Schedule Booking',
                      })
                    : t('customer.booking.confirmBookingCta')}
                </span>
              </button>
            </div>
          </section>

          {/* Right Panel: Radar Canvas (58% width) */}
          <section className="w-full xl:w-[58%] flex flex-col gap-4 relative shrink-0">
            {/* Real map showing only the current-location marker — no radar
                decoration, no simulated telemetry, no second/fake pin. It
                reflects the actual resolved pickup coordinates (device GPS,
                manual entry, saved place, or Book Again), never a default
                city, and stays empty until a real location is available. */}
            <UnifiedMap
              markers={
                pickupReady
                  ? [
                      {
                        id: 'current-location',
                        position: { latitude: pickup.latitude, longitude: pickup.longitude },
                        type: 'CURRENT_LOCATION',
                        title: t('customer.booking.pickupAnchorLabel'),
                        snippet: pickup.label ?? pickup.address,
                      },
                    ]
                  : []
              }
              height="540px"
              fitBounds={true}
              showControls={true}
              ariaLabel={t('customer.booking.pickupAnchorLabel')}
            />

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

      {/* Driver Detail Review Modal — required stop before selecting a
          driver for a DAILY/WEEKLY/MONTHLY hire: full profile, rating
          breakdown, recent reviews, and the rate for this specific hire,
          reviewed before the customer commits to that driver. */}
      {viewingDriverId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f1319] border border-[#262a33] rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  {t('customer.booking.driverDetailsTitle', { defaultValue: 'Driver Details' })}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingDriverId(null)}
                  aria-label={t('common.actions.close', { defaultValue: 'Close' })}
                  className="p-2 -m-1 rounded-lg text-[#87948b] hover:text-white active:text-white/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {viewingDriverLoading ? (
                <p className="text-xs text-[#87948b] py-8 text-center">
                  {t('customer.booking.loadingDriverProfile', {
                    defaultValue: 'Loading driver profile…',
                  })}
                </p>
              ) : viewingDriverError ? (
                <p className="text-xs text-red-400 py-8 text-center">{viewingDriverError}</p>
              ) : viewingDriverProfile ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-[#262a33] border border-[#25a475]/40 flex items-center justify-center text-xl font-bold text-white uppercase overflow-hidden shrink-0">
                      {viewingDriverProfile.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={viewingDriverProfile.profileImageUrl}
                          alt={viewingDriverProfile.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        viewingDriverProfile.displayName?.[0] || 'D'
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-base font-bold text-white truncate">
                        {viewingDriverProfile.displayName}
                      </span>
                      <span className="text-[11px] text-[#87948b]">
                        {t('customer.tracking.serviceAreaLabel', {
                          area:
                            viewingDriverProfile.primaryServiceArea ||
                            t('customer.tracking.serviceAreaFallback'),
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#181c24] rounded-lg p-2.5 border border-[#262a33]">
                      <div className="text-sm font-bold text-[#25a475]">
                        {viewingDriverProfile.averageRating.toFixed(1)}★
                      </div>
                      <div className="text-[9px] text-[#87948b] uppercase mt-0.5">
                        {t('customer.booking.reviewsCountLabel', {
                          count: viewingDriverProfile.totalReviews,
                          defaultValue: `${viewingDriverProfile.totalReviews} reviews`,
                        })}
                      </div>
                    </div>
                    <div className="bg-[#181c24] rounded-lg p-2.5 border border-[#262a33]">
                      <div className="text-sm font-bold text-white">
                        {viewingDriverProfile.drivingExperienceYears}
                      </div>
                      <div className="text-[9px] text-[#87948b] uppercase mt-0.5">
                        {t('customer.booking.yearsExpLabel', { defaultValue: 'Years Exp' })}
                      </div>
                    </div>
                    <div className="bg-[#181c24] rounded-lg p-2.5 border border-[#262a33]">
                      <div className="text-sm font-bold text-white">
                        {viewingDriverProfile.completedTrips}
                      </div>
                      <div className="text-[9px] text-[#87948b] uppercase mt-0.5">
                        {t('customer.booking.tripsCompletedLabel', {
                          defaultValue: 'Bookings Done',
                        })}
                      </div>
                    </div>
                  </div>

                  {viewingDriverProfile.bio && (
                    <p className="text-xs text-[#dfe2ee] bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                      {viewingDriverProfile.bio}
                    </p>
                  )}

                  {viewingDriverProfile.rate && (
                    <div className="flex items-center justify-between bg-[#00311f] border border-[#25a475]/40 rounded-lg p-3">
                      <span className="text-xs text-[#bccac0]">
                        {t('customer.booking.rateForThisHireLabel', {
                          defaultValue: 'Rate for this hire',
                        })}
                      </span>
                      <span className="text-sm font-bold text-[#25a475]">
                        {formatCurrency(Number(viewingDriverProfile.rate))}
                      </span>
                    </div>
                  )}

                  {viewingDriverProfile.recentReviews.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider">
                        {t('customer.booking.recentReviewsLabel', {
                          defaultValue: 'Recent Reviews',
                        })}
                      </span>
                      {viewingDriverProfile.recentReviews.slice(0, 3).map((review, idx) => (
                        <div
                          key={idx}
                          className="bg-[#181c24] rounded-lg p-2.5 border border-[#262a33] text-[11px] text-[#dfe2ee]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{review.reviewerLabel}</span>
                            <span className="text-[#25a475]">{'★'.repeat(review.rating)}</span>
                          </div>
                          {review.comment && <p className="text-[#87948b]">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDriverProfileId(viewingDriverProfile.driverProfileId);
                      setViewingDriverId(null);
                    }}
                    className="w-full min-h-[48px] py-3 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] active:bg-[#4fc890] text-[#003825] font-bold text-sm transition-all font-['Space_Grotesk'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                  >
                    {t('customer.booking.selectThisDriverBtn', {
                      defaultValue: 'Select This Driver',
                    })}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <ToastViewport toast={toast} onDismiss={dismissToast} />
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
