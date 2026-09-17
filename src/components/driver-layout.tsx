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

    let locationPayload: { latitude?: number; longitude?: number; accuracy?: number } = {};

    if (targetStatus === 'AVAILABLE') {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000,
          });
        });

        locationPayload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      } catch {
        // Fallback to default location if GPS acquisition fails
        locationPayload = {
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: 50,
        };
      }
    }

    try {
      const res = await fetch('/api/driver/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus, ...locationPayload }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailabilityStatus(data.profile?.availabilityStatus ?? targetStatus);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || errData.message || 'Unable to update duty status.');
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
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-[#0a0e16] z-50 flex-col justify-between py-3 border-r border-[#262a33] shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col h-full">
          {/* Logo & Brand Header */}
          <div className="px-3 flex items-center justify-between pb-3 border-b border-[#262a33]">
            <Link href="/driver" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold">
                <span className="material-symbols-outlined text-lg">directions_car</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[#dfe2ee] leading-none font-['Space_Grotesk']">
                  APNA DRIVER
                </span>
                <span className="text-[8.5px] font-bold tracking-widest text-[#68dba9] uppercase font-['Space_Grotesk']">
                  Cockpit Terminal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav
            ref={sidebarRef}
            onScroll={handleSidebarScroll}
            className="flex-1 overflow-y-auto px-2 space-y-3 mt-2"
          >
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <span className="px-2.5 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                  {group.label}
                </span>
                <div className="space-y-0.5 pt-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-sidebar-active={isActive(item.href)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        isActive(item.href)
                          ? item.href === '/driver/sos-support'
                            ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                            : 'bg-[#25a475] text-[#00311f] font-bold'
                          : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          item.href === '/driver/sos-support' && !isActive(item.href)
                            ? 'text-[#ffb4ab]'
                            : ''
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* HEADER BAR */}
      <div className="md:pl-52">
        <header className="fixed top-0 left-0 md:left-52 right-0 h-16 bg-[#0a0e16]/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.45)] border-b border-[#262a33]">
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
                </div>
                <span className="text-xs font-mono text-[#dfe2ee] font-bold truncate">
                  {isOnDuty ? 'DUTY ONLINE' : 'OFF DUTY'}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleDuty()}
                  disabled={updatingAvailability || availabilityStatus === null}
                  className={`ml-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 ${
                    isOnDuty
                      ? 'bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/80'
                      : 'bg-[#25a475] text-[#00311f] hover:bg-[#208f66]'
                  }`}
                >
                  {isOnDuty ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LanguageSelector variant="dark" />

              <NotificationCenter />

              <div className="h-5 w-px bg-[#262a33]" />

              <div className="flex items-center gap-2">
                <Link href="/profile" className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-[#dfe2ee] font-semibold leading-tight max-w-[140px] truncate">
                      {userEmail ?? 'Driver Partner'}
                    </div>
                  </div>
                  <UserAvatar
                    src={null}
                    name={userEmail || 'Driver Partner'}
                    className="w-8 h-8 ring-1 ring-[#68dba9]"
                  />
                </Link>
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
        <main className="w-full pt-14 pb-8 px-3 sm:px-4 bg-[#0f131c] min-h-screen">{children}</main>
      </div>
    </div>
  );
}
