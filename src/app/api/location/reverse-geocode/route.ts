import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { mapProvider } from '@/modules/location/infrastructure/map-provider';

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
      return NextResponse.json(
        { error: 'Invalid latitude or longitude range' },
        { status: 400 },
      );
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
                : streetName || topResult.formatted_address.split(',')[0] || topResult.formatted_address;

            return NextResponse.json(
              {
                address: {
                  addressLine1,
                  city: city || 'Bengaluru',
                  state: state || 'Karnataka',
                  country: country || 'India',
                  postalCode: postalCode || '560001',
                  latitude: lat,
                  longitude: lng,
                  formattedAddress: topResult.formatted_address,
                },
              },
              { status: 200 },
            );
          }
        }
      } catch {
        // Fallback to mapProvider
      }
    }

    const result = await mapProvider.reverseGeocode(lat, lng);
    return NextResponse.json({ address: result }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reverse geocoding failed' },
      { status: 500 },
    );
  }
}
