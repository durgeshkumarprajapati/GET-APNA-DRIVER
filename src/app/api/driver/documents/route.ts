import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DriverDocumentType } from '@prisma/client';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import {
  listDriverDocuments,
  registerUploadedDocument,
} from '@/modules/driver/application/services/driver-document-service';

const registerDocumentSchema = z.object({
  documentType: z.nativeEnum(DriverDocumentType),
  storageKey: z.string().min(1),
  originalFileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  documentNumber: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const documents = await listDriverDocuments(profile.id, true);
  return NextResponse.json({ documents }, { status: 200 });
});

export const POST = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  const body = await req.json();
  const parsed = registerDocumentSchema.parse(body);

  const document = await registerUploadedDocument(principal.userId, parsed, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ document }, { status: 201 });
});
