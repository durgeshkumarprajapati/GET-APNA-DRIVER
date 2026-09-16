let loadPromise: Promise<void> | null = null;

/**
 * Singleton Google Maps JavaScript API loader.
 * Ensures script is loaded dynamically on the client side only,
 * preventing duplicate script injections and supporting React 19 Strict Mode safely.
 */
export function loadGoogleMapsScript(apiKey?: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps script cannot be loaded on the server.'));
  }

  // Already loaded globally
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  const key = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.'));
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if script element is already present in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places,geometry,marker`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps JavaScript API script.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function resetGoogleMapsLoaderForTest(): void {
  loadPromise = null;
}
