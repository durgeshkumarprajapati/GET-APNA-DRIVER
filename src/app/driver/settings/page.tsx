'use client';

import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationPreferencesPanel } from '@/components/notification-preferences-panel';

export default function DriverSettingsPage() {
  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="Account"
          title="Console Settings"
          subtitle="Manage how we contact you. For your name, experience, and service area, visit your driver profile."
          actions={
            <Link
              href="/driver/profile"
              className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
            >
              Go to Profile →
            </Link>
          }
        />

        <section className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4">
          <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Notification Preferences
          </h2>
          <NotificationPreferencesPanel />
        </section>
      </div>
    </DriverLayout>
  );
}
