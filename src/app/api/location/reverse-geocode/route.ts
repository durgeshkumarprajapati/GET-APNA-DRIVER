import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/shared/errors/app-error';

interface ResolvedAddress {
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: 'Latitude and longitude parameters are required' },
        { status: 400 },
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid latitude or longitude range' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(geoUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const topResult = data.results[0];
            let city = '';
            let state = '';
            let country = '';
            let postalCode = '';
            let streetName = '';
            let houseNumber = '';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            topResult.address_components.forEach((component: any) => {
              const types: string[] = component.types || [];
              if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                city = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                state = component.long_name;
              }
              if (types.includes('country')) {
                country = component.long_name;
              }
              if (types.includes('postal_code')) {
                postalCode = component.long_name;
              }
              if (types.includes('route')) {
                streetName = component.long_name;
              }
              if (types.includes('street_number')) {
                houseNumber = component.long_name;
              }
            });

            const addressLine1 =
              houseNumber && streetName
                ? `${houseNumber} ${streetName}`
                : streetName ||
                  topResult.formatted_address.split(',')[0] ||
                  topResult.formatted_address;

            return NextResponse.json(
              {
                address: {
                  addressLine1,
                  city,
                  state,
                  country,
                  postalCode,
                  latitude: lat,
                  longitude: lng,
                  formattedAddress: topResult.formatted_address,
                } satisfies ResolvedAddress,
              },
              { status: 200 },
            );
          }
        }
      } catch {
        // Fall through to OpenStreetMap / fallback below
      }
    }

    // Try OpenStreetMap Nominatim reverse geocoding fallback
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const osmRes = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'GetApnaDriver/1.0 (contact@getapnadriver.com)',
        },
      });
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (osmData && osmData.address) {
          const addr = osmData.address;
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
          const state = addr.state || '';
          const country = addr.country || '';
          const postalCode = addr.postcode || '';
          const streetName =
            addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
          const houseNumber = addr.house_number || '';

          const addressLine1 =
            houseNumber && streetName
              ? `${houseNumber} ${streetName}`
              : streetName || (osmData.display_name ? osmData.display_name.split(',')[0] : '');

          const formattedAddress =
            osmData.display_name ||
            [addressLine1, city, state, postalCode, country].filter(Boolean).join(', ');

          if (formattedAddress) {
            return NextResponse.json(
              {
                address: {
                  addressLine1,
                  city,
                  state,
                  country,
                  postalCode,
                  latitude: lat,
                  longitude: lng,
                  formattedAddress,
                } satisfies ResolvedAddress,
              },
              { status: 200 },
            );
          }
        }
      }
    } catch {
      // Fall through to coordinate-formatted fallback
    }

    const fallbackText = `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
    return NextResponse.json(
      {
        address: {
          addressLine1: fallbackText,
          city: '',
          state: '',
          country: '',
          postalCode: '',
          latitude: lat,
          longitude: lng,
          formattedAddress: fallbackText,
        } satisfies ResolvedAddress,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
}
