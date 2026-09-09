import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';

export const GET = withAuth(async (_req, { principal }) => {
  return NextResponse.json({ principal }, { status: 200 });
});
