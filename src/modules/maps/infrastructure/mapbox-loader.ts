/* eslint-disable @typescript-eslint/no-explicit-any */
let loadPromise: Promise<any> | null = null;

/**
 * Singleton Mapbox GL JS API & CSS loader.
 * Loads Mapbox GL dynamically on the client side only,
 * respecting Next.js SSR and React 19 Strict Mode safely.
 */
export function loadMapboxScript(accessToken?: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mapbox script cannot be loaded on the server.'));
  }

  // Already loaded globally
  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl);
  }

  if (loadPromise) {
    return loadPromise;
  }

  const token = accessToken || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!token) {
    return Promise.reject(new Error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing.'));
  }

  loadPromise = new Promise<any>((resolve, reject) => {
    // Dynamically inject Mapbox CSS if not present
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
      document.head.appendChild(link);
    }

    // Check if mapbox-gl script is already in DOM
    const existingScript = document.querySelector('script[src*="mapbox-gl.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.mapboxgl) {
          window.mapboxgl.accessToken = token;
          resolve(window.mapboxgl);
        } else {
          reject(new Error('Mapbox GL loaded but window.mapboxgl is undefined.'));
        }
      });
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.mapboxgl) {
        window.mapboxgl.accessToken = token;
        resolve(window.mapboxgl);
      } else {
        loadPromise = null;
        reject(new Error('Mapbox script initialized but window.mapboxgl object unavailable.'));
      }
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Mapbox GL JS script from CDN.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function resetMapboxLoaderForTest(): void {
  loadPromise = null;
}
