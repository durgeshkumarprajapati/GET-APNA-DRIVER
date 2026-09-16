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
  try {
    const searchParams = req.nextUrl.searchParams;
    let policy = null;
    let history: { entries: unknown[]; total: number; page?: number; pageSize?: number } = {
      entries: [],
      total: 0,
    };

    try {
      policy = await getCommissionPolicy();
    } catch {
      // Handled below if policy stays null
    }

    try {
      history = await getCommissionPolicyHistory({
        page: Number(searchParams.get('page')) || undefined,
        pageSize: Number(searchParams.get('pageSize')) || undefined,
      });
    } catch {
      // History fallback
    }

    if (!policy) {
      return NextResponse.json(
        {
          success: false,
          error: 'COMMISSION_POLICY_LOAD_FAILED',
          message: 'Failed to load commission policy.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, policy, history }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load commission policy.';
    return NextResponse.json({ success: false, error: 'COMMISSION_FETCH_FAILED', message }, { status: 500 });
  }
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
