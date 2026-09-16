import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { adjustCustomerPoints } from '@/modules/loyalty/application/services/loyalty-account-service';

export const POST = withPermission(PERMISSIONS.ADMIN_LOYALTY_ADJUST, async (req, { principal }) => {
  try {
    const body = await req.json();

    if (!body.customerId || body.points === undefined || body.points === null || !body.reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required adjustment fields (customerId, points, reason)',
        },
        { status: 400 },
      );
    }

    const pointsNum = Number(body.points);
    const direction = body.direction ?? (pointsNum >= 0 ? 'ADD' : 'DEDUCT');

    const result = await adjustCustomerPoints({
      customerId: body.customerId,
      points: Math.abs(pointsNum),
      direction,
      reason: body.reason,
      adminUserId: principal.userId,
    });

    return NextResponse.json(
      {
        success: true,
        account: result.updatedAccount,
        data: result,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to adjust points';
    return NextResponse.json(
      { success: false, error: 'POINTS_ADJUST_FAILED', message },
      { status: 500 },
    );
  }
});
