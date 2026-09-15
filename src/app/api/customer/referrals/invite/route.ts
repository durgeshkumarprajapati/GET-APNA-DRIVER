import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { prisma } from '@/shared/database/prisma';
import { toErrorResponse } from '@/shared/errors/app-error';

const InviteSchema = z.object({
  channel: z.enum(['LINK', 'WHATSAPP', 'SMS', 'COPY', 'OTHER']).default('LINK'),
  recipientContact: z.string().optional(),
});

export const POST = withAuth(async (req, { principal }) => {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = InviteSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid invite parameters.', details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { channel } = parseResult.data;

    await recordAuditLog(prisma, {
      actorUserId: principal.userId,
      action: 'identity.referral_invited',
      entityType: 'UserReferralCode',
      entityId: principal.userId,
      afterState: { channel },
    });

    return NextResponse.json({ success: true, channel }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
