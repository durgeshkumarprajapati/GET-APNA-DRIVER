import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getInteger } from '@/shared/config/configuration-service';
import {
  getOrCreateCustomerProfile,
  updateCustomerProfile,
} from '@/modules/customer/application/customer-profile-service';
import {
  localPublicImageStorageProvider,
  ALLOWED_AVATAR_CONTENT_TYPES,
} from '@/shared/storage/public-image-storage-provider';

/**
 * Real profile-picture upload for a customer — a prior version of the
 * profile page only offered a "paste an externally-hosted image URL" text
 * field, not an actual upload. Accepts the raw image bytes directly.
 */
export const POST = withAuth(async (req: NextRequest, { principal }) => {
  const contentType = req.headers.get('content-type') ?? '';
  if (!ALLOWED_AVATAR_CONTENT_TYPES[contentType]) {
    return NextResponse.json(
      { error: 'Unsupported image type. Use JPEG, PNG, or WebP.' },
      { status: 415 },
    );
  }

  const arrayBuffer = await req.arrayBuffer();
  const maxBytes = await getInteger('profile.avatar.max_file_size_bytes', 5 * 1024 * 1024);
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
  }
  if (arrayBuffer.byteLength > maxBytes) {
    return NextResponse.json({ error: 'Image exceeds the maximum allowed size.' }, { status: 413 });
  }

  const profile = await getOrCreateCustomerProfile(principal.userId);
  const previousKey = localPublicImageStorageProvider.storageKeyFromPublicUrl(profile.avatarUrl);

  const saved = await localPublicImageStorageProvider.saveImage(
    Buffer.from(arrayBuffer),
    contentType,
  );
  // Absolute, not relative — CustomerProfile.avatarUrl is validated as a
  // full URL (z.string().url()) wherever else it's set (PUT
  // /api/customer/profile), so a relative path saved here would fail that
  // validation the next time the customer's main profile form is submitted.
  const absoluteUrl = new URL(saved.publicUrl, req.nextUrl.origin).toString();

  await updateCustomerProfile(principal.userId, { avatarUrl: absoluteUrl });

  if (previousKey && previousKey !== saved.storageKey) {
    await localPublicImageStorageProvider.deleteImage(previousKey);
  }

  return NextResponse.json({ avatarUrl: absoluteUrl }, { status: 200 });
});
