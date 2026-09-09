import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getAuthorizedDocumentDownloadUrl } from '@/modules/driver/application/services/driver-document-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withAuth<RouteParams>(async (_req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;

  const downloadUrl = await getAuthorizedDocumentDownloadUrl(principal.userId, id, false);
  return NextResponse.json({ downloadUrl }, { status: 200 });
});
