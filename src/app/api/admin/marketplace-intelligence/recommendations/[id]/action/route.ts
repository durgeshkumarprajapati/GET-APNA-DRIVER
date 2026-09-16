import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { recordRecommendationAction } from '@/modules/marketplace-intelligence/domain/recommendation-service';
import { RecommendationActionType } from '@prisma/client';
import { invalidateMarketplaceCachePattern } from '@/modules/marketplace-intelligence/infrastructure/redis-cache-service';

export const POST = withPermission(
  PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_MANAGE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const { action, recommendationFingerprint, notes } = body;

      if (!action || !recommendationFingerprint) {
        return NextResponse.json(
          { error: 'Missing required parameters action or recommendationFingerprint' },
          { status: 400 },
        );
      }

      if (action !== 'ACKNOWLEDGED' && action !== 'DISMISSED') {
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
      }

      const record = await recordRecommendationAction({
        recommendationFingerprint,
        action: action as RecommendationActionType,
        adminUserId: principal.userId,
        notes,
      });

      await invalidateMarketplaceCachePattern('*');

      return NextResponse.json({ success: true, record });
    } catch (error: unknown) {
      return NextResponse.json(
        { error: (error as Error).message || 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
