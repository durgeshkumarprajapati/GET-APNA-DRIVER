import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DriverDocumentType } from '@prisma/client';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { createDocumentUploadUrl } from '@/modules/driver/application/services/driver-document-service';

const uploadUrlSchema = z.object({
  documentType: z.nativeEnum(DriverDocumentType),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});

export const POST = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = uploadUrlSchema.parse(body);

  const result = await createDocumentUploadUrl(principal.userId, parsed);
  return NextResponse.json(result, { status: 200 });
});
