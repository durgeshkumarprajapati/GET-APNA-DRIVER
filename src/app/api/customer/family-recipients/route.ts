import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  listFamilyRecipients,
  addFamilyRecipient,
} from '@/modules/corporate/application/corporate-family-service';

const createRecipientSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withPermission(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }) => {
    const recipients = await listFamilyRecipients(principal.userId);
    return NextResponse.json({ recipients }, { status: 200 });
  },
);

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_CREATE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = createRecipientSchema.parse(body);

    const recipient = await addFamilyRecipient(principal.userId, parsed);
    return NextResponse.json({ success: true, recipient }, { status: 201 });
  },
);
