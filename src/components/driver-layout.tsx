'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { NotificationCenter } from './notification-center';
import { useAutoLocation } from './use-auto-location';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';
import { LanguageSelector } from './ui/language-selector';
import { UserAvatar } from './ui/user-avatar';

type AvailabilityStatus = 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

interface DriverLayoutProps {
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

export function DriverLayout({ children, userEmail = null }: DriverLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  useAutoLocation('DRIVER');

  // Restore sidebar scroll position and scroll active item into view if out of bounds
  useEffect(() => {
    if (!sidebarRef.current) return;

    const key = 'gad-driver-sidebar-scroll';
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
      sessionStorage.setItem('gad-driver-sidebar-scroll', String(sidebarRef.current.scrollTop));
    }
  };

  const navGroups: NavGroup[] = [
    {
      label: t('driver.nav.operationalDispatch'),
      items: [
        { href: '/driver', label: t('driver.nav.dashboard'), icon: 'radar' },
        {
          href: '/driver/assignment-offers',
          label: t('driver.nav.assignmentOffers'),
          icon: 'notifications_active',
        },
        { href: '/driver/bookings', label: t('driver.nav.bookings'), icon: 'explore' },
      ],
    },
    {
      label: t('driver.nav.financeLedger'),
      items: [
        {
          href: '/driver/wallet-and-payouts',
          label: t('driver.nav.walletAndPayouts'),
          icon: 'account_balance_wallet',
        },
        {
          href: '/driver/earnings',
          label: t('driver.earnings.title'),
          icon: 'trending_up',
        },
      ],
    },
    {
      label: t('driver.nav.growthReputation'),
      items: [
        {
          href: '/driver/offers',
          label: t('driver.nav.offers', { defaultValue: 'Offers & Perks' }),
          icon: 'confirmation_number',
        },
        {
          href: '/driver/performance-and-badges',
          label: t('driver.nav.performanceAndBadges'),
          icon: 'military_tech',
        },
        {
          href: '/driver/ratings-and-reviews',
          label: t('driver.nav.ratingsAndReviews'),
          icon: 'star',
        },
        { href: '/driver/public-portfolio', label: t('driver.nav.publicPortfolio'), icon: 'badge' },
        { href: '/driver/referrals', label: t('driver.nav.referrals'), icon: 'group_add' },
      ],
    },
    {
      label: t('driver.nav.governanceAccount'),
      items: [
        { href: '/driver/profile', label: t('driver.nav.profile'), icon: 'person' },
        { href: '/driver/documents', label: t('driver.nav.documents'), icon: 'verified_user' },
        { href: '/driver/sos-support', label: t('driver.nav.sosSupport'), icon: 'emergency_home' },
        { href: '/driver/settings', label: t('driver.nav.settings'), icon: 'tune' },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors, proceed with client redirect
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/availability');
        if (res.ok && isMounted) {
          const data = await res.json();
          setAvailabilityStatus(data.availabilityStatus ?? null);
        }
      } catch {
        // Ignore — status simply stays unknown.
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleDuty = async () => {
    const targetStatus: AvailabilityStatus =
      availabilityStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    setUpdatingAvailability(true);
    try {
      const res = await fetch('/api/driver/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailabilityStatus(data.profile?.availabilityStatus ?? targetStatus);
      }
    } catch {
      // Ignore — status remains unchanged on failure.
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const isOnDuty = availabilityStatus === 'AVAILABLE' || availabilityStatus === 'BUSY';
  const isActive = (href: string) =>
    pathname === href || (href !== '/driver' && pathname?.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navGroups={navGroups}
        isActive={isActive}
        brandLabel="Apna Driver"
        brandSubLabel="Cockpit Terminal"
        brandHref="/driver"
      />

      {/* FIXED SIDEBAR — desktop only, md and up */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-[#0a0e16] z-50 flex-col justify-between py-4 border-r border-[#262a33] shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col h-full">
          {/* Logo & Brand Header */}
          <div className="px-4 flex items-center justify-between pb-4 border-b border-[#262a33]">
            <Link href="/driver" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold">
                <span className="material-symbols-outlined text-xl">directions_car</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-[#dfe2ee] leading-none font-['Space_Grotesk']">
                  APNA DRIVER
                </span>
                <span className="text-[9px] font-bold tracking-widest text-[#68dba9] uppercase font-['Space_Grotesk']">
                  Cockpit Terminal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav
            ref={sidebarRef}
            onScroll={handleSidebarScroll}
            className="flex-1 overflow-y-auto px-3 space-y-4 mt-3"
          >
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                  {group.label}
                </span>
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-sidebar-active={isActive(item.href)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        isActive(item.href)
                          ? item.href === '/driver/sos-support'
                            ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                            : 'bg-[#25a475] text-[#00311f] font-bold'
                          : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${
                          item.href === '/driver/sos-support' && !isActive(item.href)
                            ? 'text-[#ffb4ab]'
                            : ''
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* HEADER BAR */}
      <div className="md:pl-72">
        <header className="fixed top-0 left-0 md:left-72 right-0 h-16 bg-[#0a0e16]/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.45)] border-b border-[#262a33]">
          <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
              {/* Duty Shift Pill Switcher */}
              <div className="flex items-center bg-[#1c2028] px-2 sm:px-3 py-1.5 rounded-full gap-1.5 sm:gap-2 border border-[#262a33] min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnDuty ? 'bg-[#68dba9]' : 'bg-[#87948b]'
                    }`}
                  />
                  {isOnDuty && (
                    <span className="absolute w-4 h-4 rounded-full bg-[#68dba9]/40 animate-ping" />
                  )}
                </div>
                <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide text-[#68dba9] font-['Space_Grotesk']">
                  {availabilityStatus === null
                    ? 'LOADING...'
                    : isOnDuty
                      ? 'ONLINE • ON DUTY'
                      : 'OFFLINE • OFF DUTY'}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleDuty()}
                  disabled={updatingAvailability || availabilityStatus === null}
                  className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] px-2 py-0.5 rounded transition-colors disabled:opacity-50 shrink-0"
                >
                  {isOnDuty ? 'Toggle Off' : 'Toggle On'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <LanguageSelector variant="dark" />

              <Link
                href="/customer/dashboard"
                className="hidden lg:inline-block px-2.5 py-1 rounded-lg bg-[#1c2028] hover:bg-[#262a33] text-[#68dba9] font-mono text-xs border border-[#3d4a42]"
                title="Switch to Customer Hub"
              >
                Customer Hub
              </Link>

              <NotificationCenter />

              <div className="flex items-center gap-2 pl-1">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-[#dfe2ee] max-w-[160px] truncate">
                    {userEmail ?? 'Driver'}
                  </span>
                </div>
                <UserAvatar
                  src={null}
                  name={userEmail || 'Driver Profile'}
                  className="w-8 h-8 ring-1 ring-[#68dba9]"
                />
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="ml-2 flex items-center justify-center p-1.5 rounded-lg text-[#87948b] hover:text-[#ffb4ab] hover:bg-[#262a33] transition-colors disabled:opacity-50"
                  title="Logout Session"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="w-full pt-16 bg-[#0f131c] min-h-screen">{children}</main>
      </div>
    </div>
  );
}
