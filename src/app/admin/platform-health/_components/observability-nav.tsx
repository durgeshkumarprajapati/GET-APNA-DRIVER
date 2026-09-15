'use client';

import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/context';

export function ObservabilityNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    { href: '/admin/platform-health', label: t('platformHealth.navOverview') || 'Platform Overview' },
    { href: '/admin/platform-health/dependencies', label: t('platformHealth.navDependencies') || 'Dependencies' },
    { href: '/admin/platform-health/workers', label: t('platformHealth.navWorkers') || 'Workers & Outbox' },
    { href: '/admin/platform-health/performance', label: t('platformHealth.navPerformance') || 'Performance' },
    { href: '/admin/platform-health/reliability', label: t('platformHealth.navReliability') || 'Reliability & SLOs' },
    { href: '/admin/platform-health/diagnostics', label: t('platformHealth.navDiagnostics') || 'Diagnostics' },
  ];

  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
      <nav className="-mb-px flex space-x-6 overflow-x-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
