import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { rejectDocument } from '@/modules/driver/application/services/driver-document-service';

const rejectDocumentSchema = z.object({
  reason: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_DOCUMENT_VERIFY,
  async (req, { principal }, routeContext) => {
    const { documentId } = await routeContext!.params;
    const body = await req.json();
    const parsed = rejectDocumentSchema.parse(body);

    const document = await rejectDocument(principal.userId, documentId, parsed.reason, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ document }, { status: 200 });
  },
);
