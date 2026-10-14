import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { localPublicImageStorageProvider } from '@/shared/storage/public-image-storage-provider';

/**
 * Serves a previously uploaded profile picture. Deliberately public/
 * unauthenticated — a driver's or customer's avatar is meant to be visible
 * to whoever can see their profile (their counterpart in a booking, an
 * admin, etc.), unlike the private, token-gated document storage used for
 * compliance documents (file-storage-provider.ts).
 */
export async function GET(
  _req: NextRequest,
  routeContext: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  const { key } = await routeContext.params;

  const contentType = localPublicImageStorageProvider.contentTypeForStorageKey(key);
  if (!contentType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await localPublicImageStorageProvider.readImage(key);
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=86400');
    return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
