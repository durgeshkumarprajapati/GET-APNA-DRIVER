'use client';

import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationPreferencesPanel } from '@/components/notification-preferences-panel';

export default function CustomerSettingsPage() {
  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          subtitle="Manage how we contact you. For your name, contact details, and saved locations, visit your profile."
          actions={
            <Link
              href="/profile"
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
    </CustomerLayout>
  );
}
