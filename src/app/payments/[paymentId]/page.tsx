import { requireSessionForPage } from '@/shared/auth/require-session';
import PaymentDetailPage from './payment-detail-client';

export default async function PaymentDetailRoute({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  await requireSessionForPage();
  return <PaymentDetailPage params={params} />;
}
