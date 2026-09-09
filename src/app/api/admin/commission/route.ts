import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getCommissionPolicy,
  getCommissionPolicyHistory,
  updateCommissionPolicy,
} from '@/modules/finance/application/services/commission-policy-service';

export const GET = withPermission(PERMISSIONS.FINANCE_COMMISSION_MANAGE, async (req) => {
  const searchParams = req.nextUrl.searchParams;
  const [policy, history] = await Promise.all([
    getCommissionPolicy(),
    getCommissionPolicyHistory({
      page: Number(searchParams.get('page')) || undefined,
      pageSize: Number(searchParams.get('pageSize')) || undefined,
    }),
  ]);
  return NextResponse.json({ policy, history }, { status: 200 });
});

const updateCommissionSchema = z.object({
  percentage: z.string().trim().min(1),
});

export const PUT = withPermission(
  PERMISSIONS.FINANCE_COMMISSION_MANAGE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = updateCommissionSchema.parse(body);
    const policy = await updateCommissionPolicy(principal.userId, parsed.percentage, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ policy }, { status: 200 });
  },
);
