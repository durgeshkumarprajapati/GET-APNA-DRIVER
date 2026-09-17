'use client';

import { UserAvatar } from './ui/user-avatar';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { NotificationCenter } from './notification-center';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';
import { LanguageSelector } from './ui/language-selector';

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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Restore sidebar scroll position and scroll active item into view if out of bounds
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
    } finally {
      router.push('/login');
    }
  };

  const navGroups: NavGroup[] = [
    {
      label: t('admin.nav.overview'),
      items: [
        {
          href: '/admin/mission-dashboard',
          label: t('admin.nav.missionDashboard'),
          icon: 'grid_view',
        },
        { href: '/admin/live-fleet-radar', label: t('admin.nav.liveFleetRadar'), icon: 'radar' },
        { href: '/admin/analytics-and-bi', label: t('admin.nav.analyticsAndBi'), icon: 'insights' },
        {
          href: '/admin/marketplace-intelligence',
          label: t('admin.nav.marketplaceIntelligence', {
            defaultValue: 'Marketplace Intelligence',
          }),
          icon: 'monitoring',
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
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
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
        className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-[#0a0e16] border-r border-[#262a33] z-50 flex-col overflow-y-auto shadow-2xl"
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-[#262a33] shrink-0 bg-[#0a0e16]/80 backdrop-blur-md">
          <Link href="/admin/mission-dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold">
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-[#dfe2ee] tracking-tight leading-none font-['Space_Grotesk']">
                Get Apna Driver
              </span>
              <span className="text-[8.5px] font-bold text-[#68dba9] tracking-widest mt-0.5 uppercase font-['Space_Grotesk']">
                Chauffeur Matrix OS
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-2 py-3 space-y-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <span className="px-2.5 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
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
                        ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                        : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[17px] shrink-0">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {!!item.badge && (
                      <span className="px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-mono text-[9px] font-bold shrink-0">
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
        <div className="p-2 border-t border-[#262a33] bg-[#0a0e16]/90">
          <div className="flex items-center justify-between px-2.5 py-1 bg-[#181c24] rounded-lg border border-[#262a33]">
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="material-symbols-outlined text-[#68dba9] text-[15px]">
                shield_with_heart
              </span>
              <span className="text-[#dfe2ee] font-bold">ENCRYPTED V4</span>
            </div>
            <span className="font-mono text-[9px] text-[#87948b]">TLS 1.3</span>
          </div>
        </div>
      </aside>

      {/* HEADER BAR */}
      <div className="md:pl-52">
        <header className="fixed top-0 left-0 md:left-52 right-0 h-16 bg-[#0a0e16]/85 backdrop-blur-xl border-b border-[#262a33] z-40 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
            <div className="hidden sm:flex px-3 py-1 rounded bg-[#181c24] border border-[#262a33] items-center gap-2 shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
              <span className="font-mono text-xs text-[#68dba9] font-bold">SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-2 sm:mx-4 hidden sm:block">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#87948b] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drivers, bookings, transactions..."
                className="w-full h-9 pl-10 pr-3 rounded-lg bg-[#181c24] border border-[#262a33] font-mono text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9] focus:ring-1 focus:ring-[#68dba9] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSelector variant="dark" />

            <NotificationCenter />

            <div className="h-6 w-px bg-[#262a33]" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <div className="font-bold text-[10px] text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  Administrator
                </div>
                <div className="text-xs text-[#dfe2ee] font-semibold leading-tight font-['Space_Grotesk'] max-w-[160px] truncate">
                  {userEmail ?? 'Admin'}
                </div>
              </div>
              <div className="relative">
                <UserAvatar
                  name={userEmail ?? 'Admin'}
                  size={32}
                  className="border-2 border-[#68dba9]"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#68dba9] border-2 border-[#0a0e16] z-10" />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Log out"
                className="p-2 rounded-lg bg-[#181c24] hover:bg-[#262a33] border border-[#262a33] text-[#bccac0] hover:text-[#ffb4ab] transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="relative w-full pt-14 bg-[#0f131c] min-h-screen p-3.5 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
