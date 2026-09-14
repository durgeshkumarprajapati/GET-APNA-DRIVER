import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { isValidLocale } from '@/i18n/config';
import { prisma } from '@/shared/database/prisma';

const localeSchema = z.object({
  locale: z.string().refine(isValidLocale, { message: 'Invalid locale' }),
});

export const POST = withAuth(async (req: NextRequest, { principal }) => {
  try {
    const body = await req.json();
    const parsed = localeSchema.parse(body);

    await prisma.user.update({
      where: { id: principal.userId },
      data: { preferredLocale: parsed.locale },
    });

    const response = NextResponse.json({ success: true, locale: parsed.locale });
    response.cookies.set('gad_locale', parsed.locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });

    return response;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_LOCALE', message: 'Invalid locale parameter' }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Failed to save locale preference.';
    return NextResponse.json({ error: 'LOCALE_UPDATE_FAILED', message }, { status: 500 });
  }
});
