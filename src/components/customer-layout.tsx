'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { NotificationCenter } from './notification-center';
import { useAutoLocation } from './use-auto-location';
import { useAutoWebPush } from './use-auto-web-push';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';
import { LanguageSelector } from './ui/language-selector';
import { UserAvatar } from './ui/user-avatar';
import { ThemeToggle } from './ui/theme-toggle';

interface CustomerLayoutProps {
  children: ReactNode;
  userEmail?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function CustomerLayout({ children, userEmail = null }: CustomerLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [fetchedUserName, setFetchedUserName] = useState<string | null>(null);

  const userName = userEmail ?? fetchedUserName;
  const sidebarRef = useRef<HTMLElement | null>(null);
  useAutoLocation('CUSTOMER');
  useAutoWebPush();

  useEffect(() => {
    if (userEmail) return;
    let isMounted = true;
    fetch('/api/customer/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.profile) return;
        const p = data.profile;
        const name =
          p.displayName ||
          [p.firstName, p.lastName].filter(Boolean).join(' ') ||
          p.email ||
          'Customer';
        setFetchedUserName(name);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  useEffect(() => {
    if (!sidebarRef.current) return;

    const key = 'gad-customer-sidebar-scroll';
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
      sessionStorage.setItem('gad-customer-sidebar-scroll', String(sidebarRef.current.scrollTop));
    }
  };

  const navGroups: NavGroup[] = [
    {
      label: t('customer.nav.mainSection'),
      items: [
        { href: '/customer/dashboard', label: t('customer.nav.dashboard'), icon: 'grid_view' },
        { href: '/customer/find-driver', label: t('customer.nav.findDriver'), icon: 'explore' },
        {
          href: '/customer/active-tracking',
          label: t('customer.nav.activeTracking'),
          icon: 'near_me',
        },
        { href: '/bookings', label: t('customer.nav.bookings'), icon: 'calendar_month' },
        { href: '/customer/scheduled-rides', label: t('scheduledRides.title'), icon: 'schedule' },
        { href: '/customer/reviews', label: t('customer.nav.reviews'), icon: 'reviews' },
        { href: '/customer/favorites', label: t('customer.nav.favorites'), icon: 'star' },
      ],
    },
    {
      label: t('customer.nav.rewardsFinance'),
      items: [
        {
          href: '/customer/wallet',
          label: t('customer.nav.wallet'),
          icon: 'account_balance_wallet',
        },
        {
          href: '/customer/billing',
          label: t('customer.nav.billing', { defaultValue: 'Billing Center' }),
          icon: 'account_balance',
        },
        { href: '/customer/rewards', label: t('customer.nav.rewards'), icon: 'card_giftcard' },
        { href: '/customer/invoices', label: t('customer.nav.invoices'), icon: 'receipt_long' },
        { href: '/customer/offers', label: t('customer.nav.offers'), icon: 'confirmation_number' },
        {
          href: '/customer/referral',
          label: t('customer.nav.referral'),
          icon: 'featured_seasonal_and_gifts',
        },
        {
          href: '/corporate/dashboard',
          label: t('corporate.nav.portal', { defaultValue: 'Corporate Travel' }),
          icon: 'domain',
        },
      ],
    },
    {
      label: t('customer.nav.accountSafety'),
      items: [
        { href: '/customer/safety-sos', label: t('customer.nav.safety'), icon: 'emergency_home' },
        { href: '/customer/support', label: t('customer.nav.support'), icon: 'support_agent' },
        { href: '/profile', label: t('customer.nav.settings'), icon: 'settings' },
      ],
    },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== '/customer/dashboard' && pathname?.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans antialiased selection:bg-primary selection:text-on-primary">
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navGroups={navGroups}
        isActive={isActive}
        brandLabel="Get Apna Driver"
        brandHref="/customer/dashboard"
      />

      {/* HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-50 flex items-center justify-between px-3 sm:px-6 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
          <Link href="/customer/dashboard" className="flex items-center gap-3 group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-bold shrink-0">
              <span className="material-symbols-outlined text-xl">directions_car</span>
            </div>
            <span className="font-bold text-base tracking-tight text-on-surface uppercase font-['Space_Grotesk'] hidden sm:inline truncate">
              GET APNA DRIVER
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector variant="dark" />
          <ThemeToggle variant="compact" />

          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-border text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            <span>{t('common.actions.search')}</span>
          </button>

          <NotificationCenter />

          <Link href="/profile" className="flex items-center gap-2 pl-1">
            <div className="text-right flex flex-col items-end">
              <div className="text-xs text-on-surface font-semibold leading-tight max-w-[160px] truncate">
                {userName || userEmail || 'Customer'}
              </div>
            </div>
            <div className="relative">
              <UserAvatar
                src={null}
                name={userName || userEmail || 'Customer Profile'}
                className="w-8 h-8 ring-1 ring-primary"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface" />
            </div>
          </Link>

          <button
            type="button"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch {
                // Ignore
              }
              router.push('/login');
              router.refresh();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container/40 hover:bg-error-container/60 border border-error/30 text-xs font-semibold text-on-error-container transition-colors"
            title="Log Out"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">
              {t('common.actions.logout', { defaultValue: 'Logout' })}
            </span>
          </button>
        </div>
      </header>

      {/* FIXED SIDEBAR — desktop only, md and up */}
      <aside
        ref={sidebarRef}
        onScroll={handleSidebarScroll}
        className="hidden md:flex fixed left-0 top-16 bottom-10 w-52 bg-surface-container-lowest z-40 overflow-y-auto px-2 py-3 flex-col justify-between border-r border-border"
      >
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold uppercase text-on-surface-variant tracking-wider font-['Space_Grotesk']">
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-sidebar-active={isActive(item.href)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isActive(item.href)
                        ? item.href === '/customer/safety-sos'
                          ? 'bg-error-container text-on-error-container font-bold'
                          : 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-base ${
                        item.href === '/customer/safety-sos' && !isActive(item.href)
                          ? 'text-error'
                          : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN BODY AREA */}
      <div className="md:pl-52">
        <main className="w-full pt-16 pb-8 px-3 sm:px-4 min-h-screen bg-background">{children}</main>
      </div>

      {/* FOOTER BAR */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-surface-container-lowest z-50 flex items-center justify-between px-3 sm:px-6 border-t border-border gap-2">
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-on-surface-variant shrink-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>SYSTEM ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs text-on-surface-variant min-w-0 ml-auto">
          <span className="material-symbols-outlined text-error text-sm shrink-0">call</span>
          <span className="truncate">
            <span className="hidden sm:inline">EMERGENCY SOS: </span>
            <strong className="text-error">+91 11 4099 2200</strong>
          </span>
        </div>
      </footer>

      {/* SEARCH MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-on-surface font-['Space_Grotesk'] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">search</span>
                {t('common.actions.search')}
              </h3>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={t('common.actions.close')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type location, driver name, or booking ID..."
                className="w-full bg-surface-container border border-border rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant font-['Space_Grotesk']">
                Quick Action Links
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/customer/find-driver"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl text-on-surface flex items-center gap-2 border border-border"
                >
                  <span className="material-symbols-outlined text-primary text-base">
                    explore
                  </span>
                  {t('customer.nav.findDriver')}
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl text-on-surface flex items-center gap-2 border border-border"
                >
                  <span className="material-symbols-outlined text-primary text-base">
                    calendar_month
                  </span>
                  {t('customer.nav.bookings')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
