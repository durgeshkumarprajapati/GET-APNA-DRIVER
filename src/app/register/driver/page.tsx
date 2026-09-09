import { redirect } from 'next/navigation';

export default function DriverRegisterRedirectPage() {
  redirect('/register?role=driver');
}
