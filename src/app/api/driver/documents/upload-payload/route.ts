import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { localPrivateStorageProvider } from '@/shared/storage/file-storage-provider';
import { getInteger } from '@/shared/config/configuration-service';

/**
 * Receives the raw file bytes for a storageKey previously issued by
 * createDocumentUploadUrl (see driver-document-service.ts) — this is the
 * "PUT to the presigned URL" half of the upload flow that was completely
 * missing: generateUploadUrl already pointed here, but this route never
 * existed, so no document upload could ever succeed end-to-end.
 */
export const POST = withAuth(async (req: NextRequest, { principal }) => {
  const key = req.nextUrl.searchParams.get('key');
  const token = req.nextUrl.searchParams.get('token');
  if (!key || !token) {
    return NextResponse.json({ error: 'Missing key or token.' }, { status: 400 });
  }

  const profile = await getOrCreateDriverProfile(principal.userId);
  // The storageKey embeds the owning driver's own profile id at generation
  // time (see createDocumentUploadUrl) — reject any attempt to write under
  // another driver's prefix even if a valid token were somehow presented.
  if (!key.startsWith(`drivers/${profile.id}/`)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const validToken = await localPrivateStorageProvider.verifyUploadToken(key, token);
  if (!validToken) {
    return NextResponse.json({ error: 'Upload URL is invalid or has expired.' }, { status: 403 });
  }

  const arrayBuffer = await req.arrayBuffer();
  const maxBytes = await getInteger('driver.document.max_file_size_bytes', 10485760);
  if (arrayBuffer.byteLength > maxBytes) {
    return NextResponse.json({ error: 'File exceeds the maximum allowed size.' }, { status: 413 });
  }

  await localPrivateStorageProvider.saveFile(key, Buffer.from(arrayBuffer));

  return NextResponse.json({ storageKey: key }, { status: 200 });
});
