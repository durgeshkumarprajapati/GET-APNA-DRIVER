import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  listSavedPeople,
  createSavedPerson,
} from '@/modules/customer/application/customer-saved-people-service';

const createSavedPersonSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().nullable(),
  relationship: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  allowDuplicate: z.boolean().optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const people = await listSavedPeople(principal.userId);
  return NextResponse.json({ success: true, savedPeople: people }, { status: 200 });
});

export const POST = withAuth(async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = createSavedPersonSchema.parse(body);

    const result = await createSavedPerson(principal.userId, parsed, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json(
      {
        success: true,
        savedPerson: result.person,
        isDuplicateWarning: result.isDuplicateWarning,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const errorObj = err as Record<string, unknown>;
    if (errorObj?.isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          isDuplicate: true,
          message: (err as Error).message,
          existingPerson: errorObj.existingPerson,
        },
        { status: 409 },
      );
    }
    throw err;
  }
});
