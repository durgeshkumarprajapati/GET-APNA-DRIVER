'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface AvailabilityData {
  driverProfileId: string;
  availabilityStatus: 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
  eligibility: {
    isEligible: boolean;
    reasons: string[];
  };
}

export default function DriverAvailabilityPage() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live GPS state
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [lastCoords, setLastCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    time: string;
  } | null>(null);
  const [locationStatusText, setLocationStatusText] = useState<string>(
    'Location sharing inactive.',
  );
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/availability');
        if (res.ok && isMounted) {
          const resData = await res.json();
          setData(resData);
        }
      } catch {
        // Ignore load error
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshAvailability = async () => {
    try {
      const res = await fetch('/api/driver/availability');
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      }
    } catch {
      // Ignore load error
    }
  };

  useEffect(() => {
    if (data?.availabilityStatus === 'AVAILABLE') {
      if (typeof window !== 'undefined' && navigator.geolocation && watchIdRef.current === null) {
        const id = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude, accuracy, heading, speed } = pos.coords;
            const capturedAt = new Date(pos.timestamp).toISOString();

            setLastCoords({
              latitude,
              longitude,
              accuracy: accuracy || null,
              time: new Date().toLocaleTimeString(),
            });
            setIsLocationSharing(true);
            setLocationStatusText('Live location active & syncing.');

            try {
              await fetch('/api/driver/location/current', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  latitude,
                  longitude,
                  accuracy: accuracy || null,
                  heading: heading || null,
                  speed: speed || null,
                  capturedAt,
                  source: 'BROWSER_GPS',
                }),
              });
            } catch {
              // Ignore transient transmission error
            }
          },
          (err) => {
            setLocationStatusText(`Location error: ${err.message}`);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        );

        watchIdRef.current = id;
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTimeout(() => {
        setIsLocationSharing(false);
        setLocationStatusText('Location sharing stopped.');
      }, 0);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [data?.availabilityStatus]);

  const handleToggleStatus = async (targetStatus: 'AVAILABLE' | 'OFFLINE') => {
    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/driver/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(
          resData.message || resData.error?.message || 'Failed to update availability status.',
        );
      }

      setMessage({
        type: 'success',
        text: `Availability status updated to ${targetStatus}.`,
      });
      await refreshAvailability();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400">Loading availability status...</p>
        </div>
      </div>
    );
  }

  const isAvailable = data?.availabilityStatus === 'AVAILABLE';
  const isEligible = data?.eligibility.isEligible ?? false;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/driver" className="hover:text-emerald-400 transition-colors">
                Driver Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Availability & Live Location</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Driver Availability & GPS Status
            </h1>
            <p className="text-slate-400 mt-1">
              Manage active driver state and live GPS location transmission for nearby discovery.
            </p>
          </div>
          <Link
            href="/driver"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Availability Switch Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Current Availability State
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`h-3.5 w-3.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}
                />
                <span className="text-2xl font-bold text-white">
                  {data?.availabilityStatus || 'OFFLINE'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAvailable ? (
                <button
                  onClick={() => handleToggleStatus('OFFLINE')}
                  disabled={updating}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 font-semibold rounded-xl text-sm transition-colors shadow-md"
                >
                  {updating ? 'Updating...' : 'Go Offline'}
                </button>
              ) : (
                <button
                  onClick={() => handleToggleStatus('AVAILABLE')}
                  disabled={updating || !isEligible}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-md shadow-emerald-900/30 flex items-center gap-2"
                >
                  {updating && (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  )}
                  {updating ? 'Updating...' : 'Go Online & Available'}
                </button>
              )}
            </div>
          </div>

          {/* Live GPS Telemetry Status */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${isLocationSharing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
                />
                <span>Live GPS Location Sharing</span>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isLocationSharing ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}
              >
                {isLocationSharing ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-400">{locationStatusText}</p>

            {lastCoords && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 block">Latitude</span>
                  <span className="font-mono text-slate-200">
                    {lastCoords.latitude.toFixed(5)}°
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Longitude</span>
                  <span className="font-mono text-slate-200">
                    {lastCoords.longitude.toFixed(5)}°
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">GPS Accuracy</span>
                  <span className="font-mono text-slate-200">
                    {lastCoords.accuracy ? `±${Math.round(lastCoords.accuracy)}m` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Synced</span>
                  <span className="font-mono text-slate-200">{lastCoords.time}</span>
                </div>
              </div>
            )}
          </div>

          {/* Eligibility Status Banner */}
          {!isEligible && (
            <div className="p-6 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Cannot Go Available — Requirements Pending</span>
              </div>
              <p className="text-slate-300 text-sm">
                The server checks your account status, driver documents, and administrator approval
                before allowing you to go online.
              </p>
              <ul className="list-disc list-inside text-sm text-amber-200/90 space-y-1">
                {data?.eligibility.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              <div className="pt-2 flex gap-4 text-xs font-medium">
                <Link href="/driver/documents" className="text-emerald-400 hover:underline">
                  Manage Documents &rarr;
                </Link>
                <Link href="/driver/onboarding" className="text-emerald-400 hover:underline">
                  View Onboarding Status &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
