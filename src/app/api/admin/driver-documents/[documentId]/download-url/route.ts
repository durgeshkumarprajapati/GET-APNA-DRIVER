import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getAuthorizedDocumentDownloadUrl } from '@/modules/driver/application/services/driver-document-service';

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_DOCUMENT_READ,
  async (_req, { principal }, routeContext) => {
    const { documentId } = await routeContext!.params;

    const downloadUrl = await getAuthorizedDocumentDownloadUrl(principal.userId, documentId, true);
    return NextResponse.json({ downloadUrl }, { status: 200 });
  },
);
