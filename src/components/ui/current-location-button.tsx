'use client';

import { useGeolocationCapture, type CapturedLocation } from '../use-geolocation-capture';

interface CurrentLocationButtonProps {
  onLocated: (location: CapturedLocation) => void;
  label?: string;
  className?: string;
}

const ERROR_MESSAGES: Partial<Record<string, string>> = {
  DENIED:
    'Location permission was denied. Please allow location access or enter your location manually.',
  UNAVAILABLE: "We couldn't determine your current location. Please enter your location manually.",
  TIMEOUT: "We couldn't determine your current location. Please enter your location manually.",
  UNSUPPORTED:
    "Your browser doesn't support location detection. Please enter your location manually.",
};

/**
 * Shared "Use my current location" control — wraps the existing one-shot
 * useGeolocationCapture hook (src/components/use-geolocation-capture.ts) so
 * every caller (booking pickup, driver registration/onboarding/profile)
 * gets identical permission/loading/error handling instead of each
 * duplicating navigator.geolocation calls. Never shows a raw
 * GeolocationPositionError or exposes latitude/longitude as the primary
 * UX — callers receive a CapturedLocation via `onLocated` and decide how to
 * represent it (e.g. "Current location selected").
 */
export function CurrentLocationButton({
  onLocated,
  label = 'Use my current location',
  className = '',
}: CurrentLocationButtonProps) {
  const { status, capture } = useGeolocationCapture();

  const handleClick = async () => {
    const result = await capture();
    if (result) onLocated(result);
  };

  const busy = status === 'ACQUIRING';
  const errorMessage = ERROR_MESSAGES[status] ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg bg-[#262a33] hover:bg-[#31353e] disabled:opacity-60 disabled:cursor-not-allowed text-[#dfe2ee] font-bold text-xs border border-[#3d4a42] transition-colors font-['Space_Grotesk'] ${className}`}
      >
        {busy ? (
          <>
            <span
              className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#68dba9] border-t-transparent"
              aria-hidden="true"
            />
            <span>Getting your location…</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base text-[#68dba9]" aria-hidden="true">
              my_location
            </span>
            <span>{label}</span>
          </>
        )}
      </button>
      {status === 'SUCCESS' && (
        <span role="status" className="text-[10px] text-[#68dba9]">
          Current location detected
        </span>
      )}
      {errorMessage && (
        <span role="alert" className="text-[10px] text-[#ffb4ab]">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
