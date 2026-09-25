import { requireSessionForPage } from '@/shared/auth/require-session';
import BillingCenterClient from './billing-center-client';

export default async function CustomerBillingPage() {
  await requireSessionForPage();
  return <BillingCenterClient />;
}
