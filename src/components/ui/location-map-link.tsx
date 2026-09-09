interface LocationMapLinkProps {
  latitude: number;
  longitude: number;
  label?: string;
}

/**
 * Minimal map-provider abstraction. No map SDK is integrated in this
 * application yet, and none of the existing pages configure map
 * credentials — rather than couple this feature to a specific paid SDK
 * (Mapbox/Google Maps JS) that would silently break wherever an API key is
 * missing, this renders the coordinates plainly and links out to a
 * credential-free map view. If a real embedded map provider is added later,
 * this is the one place that needs to change.
 */
export function LocationMapLink({
  latitude,
  longitude,
  label = 'View on map',
}: LocationMapLinkProps) {
  const href = `https://www.google.com/maps?q=${latitude},${longitude}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-[#68dba9] hover:underline font-mono"
    >
      <span className="material-symbols-outlined text-sm">location_on</span>
      {label} ({latitude.toFixed(5)}, {longitude.toFixed(5)})
    </a>
  );
}
