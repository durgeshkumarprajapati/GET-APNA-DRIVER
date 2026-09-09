import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { verifyDocument } from '@/modules/driver/application/services/driver-document-service';

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_DOCUMENT_VERIFY,
  async (req, { principal }, routeContext) => {
    const { documentId } = await routeContext!.params;

    const document = await verifyDocument(principal.userId, documentId, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ document }, { status: 200 });
  },
);
