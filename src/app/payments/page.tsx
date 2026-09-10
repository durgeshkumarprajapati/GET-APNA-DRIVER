import { requireSessionForPage } from '@/shared/auth/require-session';
import PaymentsListPage from './payments-client';

export default async function PaymentsPage() {
  await requireSessionForPage();
  return <PaymentsListPage />;
}
