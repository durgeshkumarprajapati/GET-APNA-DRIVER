'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SavedLocation {
  id: string;
  label: string;
  addressLine1: string;
  city: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [locationMode, setLocationMode] = useState<'saved' | 'current' | 'manual'>('saved');
  const [selectedSavedId, setSelectedSavedId] = useState<string>('');

  const [manualAddress, setManualAddress] = useState('');
  const [manualLat, setManualLat] = useState('28.6139');
  const [manualLng, setManualLng] = useState('77.2090');

  const [bookingType, setBookingType] = useState('ONE_WAY');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [customerNotes, setCustomerNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/customer/locations');
        if (res.ok) {
          const data = await res.json();
          const list: SavedLocation[] = data.locations || [];
          setSavedLocations(list);
          const def = list.find((l) => l.isDefault) || list[0];
          if (def) setSelectedSavedId(def.id);
        }
      } catch {
        // Ignore fetch error
      }
    };

    const fetchCurrentLocation = async () => {
      try {
        const res = await fetch('/api/location/current');
        if (res.ok) {
          const data = await res.json();
          if (data.location) {
            setManualLat(data.location.latitude.toString());
            setManualLng(data.location.longitude.toString());
            setManualAddress(data.location.address || 'Current Device Location');
          }
        }
      } catch {
        // Ignore fetch error
      }
    };

    void fetchSaved();
    void fetchCurrentLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let latitude = parseFloat(manualLat);
    let longitude = parseFloat(manualLng);
    let address = manualAddress;
    let label: string | undefined;

    if (locationMode === 'saved') {
      const loc = savedLocations.find((l) => l.id === selectedSavedId);
      if (!loc) {
        setError('Please select a valid saved location.');
        setLoading(false);
        return;
      }
      latitude = loc.latitude;
      longitude = loc.longitude;
      address = `${loc.addressLine1}, ${loc.city}`;
      label = loc.label;
    }

    if (isNaN(latitude) || isNaN(longitude) || !address.trim()) {
      setError('Please provide valid pickup coordinates and address.');
      setLoading(false);
      return;
    }

    const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          pickupLocation: {
            latitude,
            longitude,
            address,
            label,
          },
          bookingType,
          requestedStartTime: requestedStartTime
            ? new Date(requestedStartTime).toISOString()
            : null,
          estimatedDurationMinutes: parseInt(estimatedDuration, 10) || 60,
          customerNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create booking.');
      } else {
        router.push(`/bookings/${data.booking.id}`);
      }
    } catch {
      setError('An unexpected error occurred while creating booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/profile" className="hover:text-emerald-400 transition-colors">
              Customer Portal
            </Link>
            <span>/</span>
            <Link href="/bookings" className="hover:text-emerald-400 transition-colors">
              Bookings
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">New Booking</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create New Driver Booking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Specify your pickup location details and requirements to find nearby available drivers.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pickup Location Selection */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white">1. Pickup Location</h2>

            <div className="flex gap-2 border-b border-slate-700 pb-4">
              <button
                type="button"
                onClick={() => setLocationMode('saved')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  locationMode === 'saved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Saved Locations
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('current')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  locationMode === 'current'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Current Device GPS
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('manual')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  locationMode === 'manual'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Manual Coordinates
              </button>
            </div>

            {locationMode === 'saved' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Saved Address
                </label>
                {savedLocations.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No saved addresses found. Please switch to Current Device GPS or Manual mode.
                  </p>
                ) : (
                  <select
                    value={selectedSavedId}
                    onChange={(e) => setSelectedSavedId(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {savedLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label} — {loc.addressLine1}, {loc.city}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {(locationMode === 'manual' || locationMode === 'current') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Address Description
                  </label>
                  <input
                    type="text"
                    required
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="e.g. Connaught Place, Block B, New Delhi"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Requirements & Trip Details */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white">2. Booking Details & Notes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Booking Type
                </label>
                <select
                  value={bookingType}
                  onChange={(e) => setBookingType(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ONE_WAY">One-Way Trip</option>
                  <option value="ROUND_TRIP">Round Trip</option>
                  <option value="HOURLY">Hourly Booking</option>
                  <option value="FULL_DAY">Full Day Booking</option>
                  <option value="MULTI_DAY">Multi-Day Booking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estimated Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Requested Start Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={requestedStartTime}
                onChange={(e) => setRequestedStartTime(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Driver Instructions / Customer Notes
              </label>
              <textarea
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Add special instructions for the driver..."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            Confirm & Search Drivers
          </button>
        </form>
      </div>
    </div>
  );
}
