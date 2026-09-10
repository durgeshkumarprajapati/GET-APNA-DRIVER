import 'server-only';
import { NextResponse } from 'next/server';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getAuthorizedDocumentDownloadUrl } from '@/modules/driver/application/services/driver-document-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withRole<RouteParams>(
  SYSTEM_ROLE_CODES.DRIVER,
  async (_req, { principal }, routeContext) => {
    const { id } = await routeContext!.params;

    const downloadUrl = await getAuthorizedDocumentDownloadUrl(principal.userId, id, false);
    return NextResponse.json({ downloadUrl }, { status: 200 });
  },
);
