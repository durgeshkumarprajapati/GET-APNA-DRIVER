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
              className="min-h-[48px] flex items-center px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-on-surface border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Go to Profile →
            </Link>
          }
        />

        <section className="p-6 rounded-xl bg-surface-container border border-border space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
            Notification Preferences
          </h2>
          <NotificationPreferencesPanel />
        </section>
      </div>
    </DriverLayout>
  );
}
