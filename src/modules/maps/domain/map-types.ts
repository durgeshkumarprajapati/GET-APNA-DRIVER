/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-namespace */
declare global {
  namespace google {
    namespace maps {
      type Map = any;
      type MapsLibrary = any;
      type LatLngBounds = any;
      const LatLngBounds: any;
      namespace marker {
        type AdvancedMarkerElement = any;
        const AdvancedMarkerElement: any;
        type PinElement = any;
        const PinElement: any;
      }
      function importLibrary(libraryName: string): Promise<any>;
    }
  }
  interface Window {
    google?: any;
  }
}

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export type MapMarkerType = 'CUSTOMER' | 'DRIVER' | 'PICKUP' | 'DROPOFF';

export interface MapMarkerDefinition {
  id: string;
  position: MapCoordinate;
  type: MapMarkerType;
  title: string;
  snippet?: string | null;
  heading?: number | null;
}

export interface TrackingLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  capturedAt?: Date | string | null;
}

export type MapLoaderStatus =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'NO_KEY'
  | 'ERROR';

export interface MapLoaderState {
  status: MapLoaderStatus;
  errorMessage: string | null;
}
