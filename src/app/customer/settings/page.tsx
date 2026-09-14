'use client';

import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationPreferencesPanel } from '@/components/notification-preferences-panel';
import { useTranslation } from '@/i18n/context';

export default function CustomerSettingsPage() {
  const { t } = useTranslation();

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow={t('customer.settings.eyebrow')}
          title={t('customer.settings.title')}
          subtitle={t('customer.settings.subtitle')}
          actions={
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
            >
              Profile →
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
