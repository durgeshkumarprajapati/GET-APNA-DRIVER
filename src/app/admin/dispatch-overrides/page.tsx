import { redirect } from 'next/navigation';

export default function DispatchOverridesRedirect() {
  redirect('/admin/live-bookings');
}
