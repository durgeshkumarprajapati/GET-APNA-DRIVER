'use client';

import { UserAvatar } from './ui/user-avatar';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { NotificationCenter } from './notification-center';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';
import { LanguageSelector } from './ui/language-selector';
import { ThemeToggle } from './ui/theme-toggle';

interface AdminLayoutProps {
  children: ReactNode;
  userEmail?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardBadgeCounts {
  pendingDocumentVerifications: number;
}

export function AdminLayout({ children, userEmail = null }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [badgeCounts, setBadgeCounts] = useState<DashboardBadgeCounts | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok && isMounted) {
          const data = await res.json();
          setBadgeCounts({
            pendingDocumentVerifications: data.drivers?.pendingDocumentVerifications ?? 0,
          });
        }
      } catch {
        // Ignore — badges simply stay unset.
      }
    };
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!sidebarRef.current) return;

    const key = 'gad-admin-sidebar-scroll';
    const storedScroll = sessionStorage.getItem(key);

    if (storedScroll !== null && !isNaN(Number(storedScroll))) {
      sidebarRef.current.scrollTop = Number(storedScroll);
    }

    const activeEl = sidebarRef.current.querySelector('[data-sidebar-active="true"]');
    if (activeEl) {
      const containerTop = sidebarRef.current.scrollTop;
      const containerHeight = sidebarRef.current.clientHeight;
      const containerBottom = containerTop + containerHeight;

      const itemTop = (activeEl as HTMLElement).offsetTop;
      const itemHeight = (activeEl as HTMLElement).offsetHeight;
      const itemBottom = itemTop + itemHeight;

      if (itemTop < containerTop || itemBottom > containerBottom) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }
  }, [pathname]);

  const handleSidebarScroll = () => {
    if (sidebarRef.current) {
      sessionStorage.setItem('gad-admin-sidebar-scroll', String(sidebarRef.current.scrollTop));
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors, proceed with client redirect
    }
    router.push('/login');
    router.refresh();
  };

  const navGroups: NavGroup[] = [
    {
      label: t('admin.nav.commandCenter'),
      items: [
        {
          href: '/admin/mission-dashboard',
          label: t('admin.nav.missionControl'),
          icon: 'dashboard',
        },
        {
          href: '/admin/marketplace-intelligence',
          label: t('admin.nav.marketplaceIntelligence', {
            defaultValue: 'Marketplace Intelligence',
          }),
          icon: 'monitoring',
        },
        {
          href: '/admin/dynamic-pricing',
          label: t('admin.nav.dynamicPricing', {
            defaultValue: 'Dynamic Pricing',
          }),
          icon: 'payments',
        },
      ],
    },
    {
      label: t('admin.nav.userMgmt'),
      items: [
        { href: '/admin/customers', label: t('admin.nav.customers'), icon: 'groups' },
        { href: '/admin/drivers', label: t('admin.nav.driverDirectory'), icon: 'id_card' },
        {
          href: '/admin/verification-queue',
          label: t('admin.nav.verificationQueue'),
          icon: 'verified_user',
          badge: badgeCounts?.pendingDocumentVerifications,
        },
        {
          href: '/admin/admin-access-and-rbac',
          label: t('admin.nav.adminAccessAndRbac'),
          icon: 'admin_panel_settings',
        },
        {
          href: '/admin/corporate',
          label: t('admin.nav.corporateAccounts', { defaultValue: 'Corporate Accounts' }),
          icon: 'domain',
        },
      ],
    },
    {
      label: t('admin.nav.operations'),
      items: [
        {
          href: '/admin/operations-command-center',
          label: t('admin.nav.operationsCommandCenter', {
            defaultValue: 'Operations Command Center',
          }),
          icon: 'terminal',
        },
        {
          href: '/admin/risk-and-trust',
          label: t('admin.nav.riskAndTrust', { defaultValue: 'Risk & Trust Engine' }),
          icon: 'security',
        },
        {
          href: '/admin/experience-orchestration',
          label: t('admin.nav.experienceOrchestration', {
            defaultValue: 'Experience Orchestrator',
          }),
          icon: 'psychology',
        },
        { href: '/admin/live-bookings', label: t('admin.nav.liveBookings'), icon: 'local_taxi' },
        {
          href: '/admin/scheduled-rides',
          label: t('admin.nav.scheduledRides', { defaultValue: 'Scheduled Rides' }),
          icon: 'schedule',
        },
        {
          href: '/admin/sos-and-disputes',
          label: t('admin.nav.sosAndDisputes'),
          icon: 'crisis_alert',
        },
        { href: '/admin/reviews', label: t('admin.nav.reviews'), icon: 'reviews' },
      ],
    },
    {
      label: t('admin.nav.growth'),
      items: [
        { href: '/admin/coupons', label: t('admin.nav.coupons'), icon: 'confirmation_number' },
        {
          href: '/admin/customer-loyalty',
          label: t('admin.nav.customerLoyalty'),
          icon: 'card_giftcard',
        },
        {
          href: '/admin/referral-growth',
          label: t('admin.nav.referralEngines'),
          icon: 'featured_seasonal_and_gifts',
        },
        {
          href: '/admin/driver-incentives',
          label: t('admin.nav.driverIncentives'),
          icon: 'emoji_events',
        },
      ],
    },
    {
      label: t('admin.nav.financeAudit'),
      items: [
        { href: '/admin/payments', label: t('admin.nav.payments'), icon: 'credit_card' },
        { href: '/admin/settlements', label: t('admin.nav.settlements'), icon: 'payments' },
        {
          href: '/admin/finance/transactions',
          label: t('admin.nav.ledgerTransactions'),
          icon: 'account_balance',
        },
        { href: '/admin/vault', label: t('admin.nav.vault'), icon: 'lock' },
        {
          href: '/admin/treasury-and-settlements',
          label: t('admin.nav.treasuryAndSettlements'),
          icon: 'account_balance_wallet',
        },
        { href: '/admin/payout-rails', label: t('admin.nav.payoutRails'), icon: 'currency_rupee' },
        {
          href: '/admin/commission-matrix',
          label: t('admin.nav.commissionMatrix'),
          icon: 'percent',
        },
        { href: '/admin/tax-invoices', label: t('admin.nav.taxInvoices'), icon: 'receipt_long' },
      ],
    },
    {
      label: t('admin.nav.governance'),
      items: [
        { href: '/admin/audit-logs', label: t('admin.nav.auditLogs'), icon: 'history_edu' },
        { href: '/admin/system-config', label: t('admin.nav.systemConfig'), icon: 'tune' },
        { href: '/admin/outbox-health', label: t('admin.nav.outboxHealth'), icon: 'monitor_heart' },
      ],
    },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname?.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans antialiased selection:bg-primary selection:text-on-primary">
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navGroups={navGroups}
        isActive={isActive}
        brandLabel="Get Apna Driver"
        brandSubLabel="Chauffeur Matrix OS"
        brandHref="/admin/mission-dashboard"
      />

      {/* FIXED SIDEBAR — desktop only, md and up */}
      <aside
        ref={sidebarRef}
        onScroll={handleSidebarScroll}
        className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-surface-container-lowest border-r border-border z-50 flex-col overflow-y-auto shadow-sm"
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-border shrink-0 bg-surface-container-lowest/80 backdrop-blur-md">
          <Link href="/admin/mission-dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-on-surface tracking-tight leading-none font-['Space_Grotesk']">
                Get Apna Driver
              </span>
              <span className="text-[8.5px] font-bold text-primary tracking-widest mt-0.5 uppercase font-['Space_Grotesk']">
                Chauffeur Matrix OS
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-2 py-3 space-y-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <span className="px-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-['Space_Grotesk']">
                {group.label}
              </span>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-sidebar-active={active ? 'true' : 'false'}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-xs ${
                      active
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[17px] shrink-0">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {!!item.badge && (
                      <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-mono text-[9px] font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Security Badge */}
        <div className="p-2 border-t border-border bg-surface-container-lowest/90">
          <div className="flex items-center justify-between px-2.5 py-1 bg-surface-container rounded-lg border border-border">
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="material-symbols-outlined text-primary text-[15px]">
                shield_with_heart
              </span>
              <span className="text-on-surface font-bold">ENCRYPTED V4</span>
            </div>
            <span className="font-mono text-[9px] text-on-surface-variant">TLS 1.3</span>
          </div>
        </div>
      </aside>

      {/* HEADER BAR */}
      <div className="md:pl-52">
        <header className="fixed top-0 left-0 md:left-52 right-0 h-16 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-border z-40 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
            <div className="hidden sm:flex px-3 py-1 rounded bg-surface-container border border-border items-center gap-2 shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-primary font-bold">SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="dark" />
            <ThemeToggle variant="compact" />

            <NotificationCenter />

            <div className="flex items-center gap-2 pl-1 sm:pl-2">
              <Link href="/profile" className="flex items-center gap-2">
                <div className="text-right flex flex-col items-end">
                  <div className="text-xs font-semibold text-on-surface leading-tight max-w-[140px] truncate">
                    {userEmail || 'Admin User'}
                  </div>
                  <span className="text-[10px] text-primary font-mono font-bold uppercase">
                    SYS ADMIN
                  </span>
                </div>
                <UserAvatar
                  src={null}
                  name={userEmail || 'Admin User'}
                  className="w-8 h-8 ring-1 ring-primary"
                />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors disabled:opacity-50"
                title="Log Out"
                aria-label="Log Out"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="w-full pt-16 pb-8 px-3 sm:px-6 bg-background min-h-screen">{children}</main>
      </div>
    </div>
  );
}
