import { redirect } from 'next/navigation';

/**
 * Superseded by the duty-status toggle already in DriverLayout's header
 * (present on every /driver/* page) — this standalone page posted to
 * `/api/driver/availability` with the wrong HTTP method/field and was never
 * reachable from navigation, so it only ever 405'd if visited directly.
 */
export default function DriverAvailabilityRedirect() {
  redirect('/driver');
}
