import { requireSessionForPage } from '@/shared/auth/require-session';
import BookDriverPage from './new-booking-client';

export default async function NewBookingPage() {
  await requireSessionForPage();
  return <BookDriverPage />;
}
