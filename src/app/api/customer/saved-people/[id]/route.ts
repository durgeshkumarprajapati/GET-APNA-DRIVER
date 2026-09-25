import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  updateSavedPerson,
  deleteSavedPerson,
  getSavedPersonById,
} from '@/modules/customer/application/customer-saved-people-service';

const updateSavedPersonSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  relationship: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withAuth<RouteParams>(async (_req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;
  const person = await getSavedPersonById(principal.userId, id);
  if (!person) {
    return NextResponse.json(
      { success: false, message: 'Saved person not found' },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, savedPerson: person }, { status: 200 });
});

export const PATCH = withAuth<RouteParams>(async (req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;
  const body = await req.json();
  const parsed = updateSavedPersonSchema.parse(body);

  try {
    const updated = await updateSavedPerson(principal.userId, id, parsed, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, savedPerson: updated }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Update failed' },
      { status: 400 },
    );
  }
});

export const DELETE = withAuth<RouteParams>(async (req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;
  try {
    await deleteSavedPerson(principal.userId, id, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, message: 'Person removed' }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Delete failed' },
      { status: 400 },
    );
  }
});
