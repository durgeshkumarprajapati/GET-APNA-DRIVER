import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DisputeCategory } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createDispute, listDisputes } from '@/modules/dispute/application/dispute-service';

const createDisputeSchema = z.object({
  bookingId: z.string().uuid(),
  category: z.nativeEnum(DisputeCategory),
  reason: z.string().min(5),
  evidenceUrls: z.array(z.string()).optional(),
});

export const POST = withPermission(PERMISSIONS.DISPUTE_CREATE, async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = createDisputeSchema.parse(body);

    const dispute = await createDispute({
      raisedByUserId: principal.userId,
      ...parsed,
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create dispute';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const GET = withPermission(PERMISSIONS.DISPUTE_READ, async (req, { principal }) => {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

  const result = await listDisputes({
    raisedByUserId: principal.userId,
    page,
    limit,
  });

  return NextResponse.json(result, { status: 200 });
});
