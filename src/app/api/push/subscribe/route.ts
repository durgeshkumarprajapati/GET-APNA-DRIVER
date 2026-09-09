import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  registerPushSubscription,
  removePushSubscription,
} from '@/modules/notification/application/push-notification-service';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
  deviceName: z.string().optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const POST = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = subscribeSchema.parse(body);

  const subscription = await registerPushSubscription(principal.userId, parsed);

  return NextResponse.json({ subscription }, { status: 201 });
});

export const DELETE = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = unsubscribeSchema.parse(body);

  const success = await removePushSubscription(principal.userId, parsed.endpoint);

  return NextResponse.json({ success }, { status: 200 });
});
