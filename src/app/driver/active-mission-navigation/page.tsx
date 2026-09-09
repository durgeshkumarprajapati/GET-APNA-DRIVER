import { redirect } from 'next/navigation';

export default function DriverActiveMissionRedirect() {
  redirect('/driver/bookings');
}
