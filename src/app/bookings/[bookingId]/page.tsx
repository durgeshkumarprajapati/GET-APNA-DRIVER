import { requireSessionForPage } from '@/shared/auth/require-session';
import BookingDetailPage from './booking-detail-client';

export default async function BookingDetailRoute({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  await requireSessionForPage();
  return <BookingDetailPage params={params} />;
}
