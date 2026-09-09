import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { prisma } from '@/shared/database/prisma';
import { localPrivateStorageProvider } from '@/shared/storage/file-storage-provider';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';

/**
 * Serves the raw file bytes for a storageKey previously issued by
 * generateDownloadUrl (see driver-document-service.ts's
 * getAuthorizedDocumentDownloadUrl, which already performed the real
 * ownership/admin check before minting this URL) — this route never
 * existed, so no document could ever actually be downloaded/viewed.
 */
export const GET = withAuth(async (req: NextRequest, { principal }) => {
  const key = req.nextUrl.searchParams.get('key');
  const token = req.nextUrl.searchParams.get('token');
  if (!key || !token) {
    return NextResponse.json({ error: 'Missing key or token.' }, { status: 400 });
  }

  const validToken = await localPrivateStorageProvider.verifyDownloadToken(key, token);
  if (!validToken) {
    return NextResponse.json({ error: 'Download URL is invalid or has expired.' }, { status: 403 });
  }

  const document = await prisma.driverDocument.findFirst({
    where: { storageKey: key },
    include: { driverProfile: true },
  });
  if (!document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  // The download URL was already minted for a specific authorized caller
  // (owning driver or admin) — re-verify here too, since the token alone
  // only proves the URL wasn't tampered with, not who is presenting it now.
  const isOwner = document.driverProfile.userId === principal.userId;
  const isAdmin = principal.permissions.includes(PERMISSIONS.ADMIN_DRIVER_DOCUMENT_READ);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const data = await localPrivateStorageProvider.readFile(key);

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="${document.originalFileName}"`,
      'Cache-Control': 'private, max-age=0, no-store',
    },
  });
});
