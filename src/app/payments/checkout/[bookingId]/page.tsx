import { requireSessionForPage } from '@/shared/auth/require-session';
import PaymentCheckoutPage from './checkout-client';

export default async function PaymentCheckoutRoute({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  await requireSessionForPage();
  return <PaymentCheckoutPage params={params} />;
}
