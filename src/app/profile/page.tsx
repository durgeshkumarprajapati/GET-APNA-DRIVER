import { requireSessionForPage } from '@/shared/auth/require-session';
import ProfilePage from './profile-client';

export default async function ProfileRoute() {
  await requireSessionForPage();
  return <ProfilePage />;
}
