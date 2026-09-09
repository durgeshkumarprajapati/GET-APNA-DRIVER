import 'server-only';
import { NextResponse } from 'next/server';
import { DisputeStatus, DisputeCategory } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listDisputes } from '@/modules/dispute/application/dispute-service';

export const GET = withPermission(PERMISSIONS.DISPUTE_MANAGE, async (req) => {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as DisputeStatus) || undefined;
  const category = (searchParams.get('category') as DisputeCategory) || undefined;
  const search = searchParams.get('search') || undefined;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

  const result = await listDisputes({
    status,
    category,
    search,
    page,
    limit,
  });

  return NextResponse.json(result, { status: 200 });
});
