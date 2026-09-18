import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

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

/** All fields are honestly empty (never a fabricated place name) so a caller's own `field || previousValue` fallback keeps whatever the customer/driver already had rather than silently showing an unrelated real city. */
function unresolvedAddress(lat: number, lng: number): ResolvedAddress {
  return {
    addressLine1: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    latitude: lat,
    longitude: lng,
    formattedAddress: '',
  };
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

            // Never substitute a real place name (e.g. "Bengaluru") when
            // Google's response doesn't clearly categorize a component for
            // these coordinates — an empty field is honest; a hardcoded
            // fallback city is not, and would misreport wherever the
            // customer/driver actually is.
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
        // Fall through to the honest "unresolved" response below.
      }
    }

    // No Google Maps API key configured, or the lookup didn't return a
    // usable result — never fabricate a resolved address (the previous
    // behavior silently returned a fixed Bengaluru address for any
    // coordinates, which is exactly the "wrong location" defect this
    // endpoint must not have). The caller keeps whatever it already had.
    return NextResponse.json({ address: unresolvedAddress(lat, lng) }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reverse geocoding failed' },
      { status: 500 },
    );
  }
}
