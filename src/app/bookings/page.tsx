import { requireSessionForPage } from '@/shared/auth/require-session';
import BookingsListPage from './bookings-client';

export default async function BookingsPage() {
  await requireSessionForPage();
  return <BookingsListPage />;
}
