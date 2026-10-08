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
              className="min-h-[44px] px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-border text-xs font-bold text-on-surface transition-colors flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-sm"
            >
              Profile →
            </Link>
          }
        />

        <section className="p-6 rounded-xl bg-surface-container border border-border space-y-4 animate-fade-in-up shadow-sm">
          <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
            Notification Preferences
          </h2>
          <NotificationPreferencesPanel />
        </section>
      </div>
    </CustomerLayout>
  );
}
