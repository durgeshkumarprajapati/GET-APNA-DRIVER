import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { env } from '@/shared/config/env';

/**
 * A VAPID public key is meant to be distributed to browser clients (that's
 * the whole point of the public/private split — pushManager.subscribe()
 * needs it to create a subscription the server's private key can sign
 * pushes for). Without this endpoint, the client had no way to obtain the
 * real key and was passing a meaningless all-zero applicationServerKey,
 * silently producing subscriptions the server could never actually deliver
 * to. Gated by withAuth only for consistency with the rest of the
 * notification flow, not because the key itself is sensitive.
 */
export const GET = withAuth(async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ publicKey });
});
