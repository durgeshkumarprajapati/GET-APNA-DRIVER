import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getMobilePerformanceReport,
  evaluateCoreWebVitals,
} from '@/modules/observability/application/mobile-performance-service';

const evaluateVitalsSchema = z.object({
  lcpMs: z.number().min(0),
  fidMs: z.number().min(0),
  clsScore: z.number().min(0),
  ttfbMs: z.number().min(0),
});

const networkTypeSchema = z.enum(['SLOW_2G', '2G', '3G', '4G', 'WIFI']);

export const GET = withPermission(PERMISSIONS.ADMIN_PLATFORM_METRICS_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const network = networkTypeSchema.parse(searchParams.get('network') ?? '4G');

  const report = await getMobilePerformanceReport(network);
  return NextResponse.json(report, { status: 200 });
});

export const POST = withPermission(PERMISSIONS.ADMIN_PLATFORM_METRICS_READ, async (req) => {
  const body = await req.json();
  const parsed = evaluateVitalsSchema.parse(body);

  const evaluated = evaluateCoreWebVitals(parsed);
  return NextResponse.json({ success: true, evaluated }, { status: 200 });
});
