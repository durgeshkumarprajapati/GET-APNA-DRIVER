import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { adjustCustomerPoints } from '@/modules/loyalty/application/services/loyalty-account-service';

export const POST = withPermission(PERMISSIONS.ADMIN_LOYALTY_ADJUST, async (req, { principal }) => {
  const body = await req.json();

  if (!body.customerId || !body.points || !body.direction || !body.reason) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required adjustment fields (customerId, points, direction, reason)',
      },
      { status: 400 },
    );
  }

  const result = await adjustCustomerPoints({
    customerId: body.customerId,
    points: parseInt(body.points, 10),
    direction: body.direction,
    reason: body.reason,
    adminUserId: principal.userId,
  });

  return NextResponse.json({ success: true, data: result }, { status: 200 });
});
