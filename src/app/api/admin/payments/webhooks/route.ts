import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';

export const GET = withPermission(PERMISSIONS.FINANCE_READ, async () => {
  const events = await prisma.paymentWebhookEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      provider: true,
      providerEventId: true,
      eventType: true,
      signatureVerified: true,
      processingStatus: true,
      errorDetails: true,
      processedAt: true,
      createdAt: true,
    },
  });

  const formattedEvents = events.map((e) => ({
    ...e,
    processedAt: e.processedAt ? e.processedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
  }));

  return NextResponse.json({ webhooks: formattedEvents }, { status: 200 });
});
