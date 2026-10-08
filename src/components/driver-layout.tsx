'use client';

import { UserAvatar } from './ui/user-avatar';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { NotificationCenter } from './notification-center';
import { captureDeviceLocation } from './use-geolocation-capture';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';

import { LanguageSelector } from './ui/language-selector';
import { ThemeToggle } from './ui/theme-toggle';

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

type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export function DriverLayout({ children, userEmail = null }: DriverLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [fetchedUserName, setFetchedUserName] = useState<string | null>(null);

  const userName = userEmail ?? fetchedUserName;
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (userEmail) return;
    let isMounted = true;
    fetch('/api/driver/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.profile) return;
        const p = data.profile;
        const name =
          p.displayName ||
          [p.firstName, p.lastName].filter(Boolean).join(' ') ||
          p.email ||
          'Driver Partner';
        setFetchedUserName(name);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [userEmail]);

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
      label: t('driver.nav.cockpitSection', { defaultValue: 'Cockpit Section' }),
      items: [
        {
          href: '/driver',
          label: t('driver.nav.cockpit', { defaultValue: 'Driver Cockpit' }),
          icon: 'dashboard',
        },
        {
          href: '/driver/bookings',
          label: t('driver.nav.activeRides', { defaultValue: 'Active Rides & Tracking' }),
          icon: 'directions_car',
        },
        {
          href: '/driver/assignment-offers',
          label: t('driver.nav.assignmentOffers', { defaultValue: 'Assignment Offers' }),
          icon: 'contactless',
        },
        {
          href: '/driver/availability',
          label: t('driver.nav.availability', { defaultValue: 'Go Online / Offline' }),
          icon: 'toggle_on',
        },
        {
          href: '/driver/schedule',
          label: t('driver.nav.schedule', { defaultValue: 'Shift Roster & Leave' }),
          icon: 'calendar_month',
        },
        {
          href: '/driver/incoming-bookings',
          label: t('driver.nav.incomingRides', { defaultValue: 'Incoming Booking Offers' }),
          icon: 'radar',
        },
      ],
    },
    {
      label: t('driver.nav.financeGrowth', { defaultValue: 'Finance & Growth' }),
      items: [
        {
          href: '/driver/earnings',
          label: t('driver.nav.earnings', { defaultValue: 'Driver Earnings' }),
          icon: 'payments',
        },
        {
          href: '/driver/wallet',
          label: t('driver.nav.wallet', { defaultValue: 'Earnings & Payouts' }),
          icon: 'account_balance_wallet',
        },
        {
          href: '/driver/settlements',
          label: t('driver.nav.settlements', { defaultValue: 'Settlements & Statements' }),
          icon: 'receipt',
        },
        {
          href: '/driver/incentives',
          label: t('driver.nav.incentives', { defaultValue: 'Incentives & Bonuses' }),
          icon: 'military_tech',
        },
        {
          href: '/driver/achievements',
          label: t('driver.nav.achievements', { defaultValue: 'Achievements & Milestones' }),
          icon: 'stars',
        },
        {
          href: '/driver/offers',
          label: t('driver.nav.offers', { defaultValue: 'Offers & Perks' }),
          icon: 'confirmation_number',
        },
        {
          href: '/driver/performance-and-badges',
          label: t('driver.nav.performanceAndBadges', { defaultValue: 'Performance & Badges' }),
          icon: 'military_tech',
        },
        {
          href: '/driver/ratings-and-reviews',
          label: t('driver.nav.ratingsAndReviews', { defaultValue: 'Ratings & Reviews' }),
          icon: 'star',
        },
        {
          href: '/driver/public-portfolio',
          label: t('driver.nav.publicPortfolio', { defaultValue: 'Public Portfolio' }),
          icon: 'badge',
        },
        {
          href: '/driver/referrals',
          label: t('driver.nav.referrals', { defaultValue: 'Driver Referrals' }),
          icon: 'group_add',
        },
      ],
    },
    {
      label: t('driver.nav.governanceAccount', { defaultValue: 'Governance & Account' }),
      items: [
        {
          href: '/driver/profile',
          label: t('driver.nav.profile', { defaultValue: 'Profile' }),
          icon: 'person',
        },
        {
          href: '/driver/documents',
          label: t('driver.nav.documents', { defaultValue: 'Documents' }),
          icon: 'verified_user',
        },
        {
          href: '/driver/sos-support',
          label: t('driver.nav.sosSupport', { defaultValue: 'SOS Emergency' }),
          icon: 'emergency_home',
        },
        {
          href: '/driver/settings',
          label: t('driver.nav.settings', { defaultValue: 'Console Settings' }),
          icon: 'tune',
        },
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
      const result = await captureDeviceLocation();
      if (result) {
        locationPayload = {
          latitude: result.latitude,
          longitude: result.longitude,
          accuracy: result.accuracy ?? undefined,
        };
      } else if (process.env.NODE_ENV === 'production') {
        setUpdatingAvailability(false);
        alert(
          'We could not detect your current location. Please enable location access and try again.',
        );
        return;
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
    <div className="min-h-screen bg-background text-on-surface font-sans antialiased selection:bg-primary selection:text-on-primary">
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
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-surface-container-lowest z-50 flex-col justify-between py-3 border-r border-border shadow-sm">
        <div className="flex flex-col h-full">
          {/* Logo & Brand Header */}
          <div className="px-3 flex items-center justify-between pb-3 border-b border-border">
            <Link href="/driver" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
                <span className="material-symbols-outlined text-lg">directions_car</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-on-surface leading-none font-['Space_Grotesk']">
                  APNA DRIVER
                </span>
                <span className="text-[8.5px] font-bold tracking-widest text-primary uppercase font-['Space_Grotesk']">
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
                <span className="px-2.5 text-[10px] font-bold uppercase text-on-surface-variant tracking-wider font-['Space_Grotesk']">
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
                            ? 'bg-error-container text-on-error-container font-bold'
                            : 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          item.href === '/driver/sos-support' && !isActive(item.href)
                            ? 'text-error'
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
        <header className="fixed top-0 left-0 md:left-52 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 border-b border-border shadow-sm">
          <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
              {/* Duty Shift Pill Switcher */}
              <div className="flex items-center bg-surface-container px-2 sm:px-3 py-1.5 rounded-full gap-1.5 sm:gap-2 border border-border min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnDuty ? 'bg-primary' : 'bg-on-surface-variant'
                    }`}
                  />
                </div>
                <span className="text-xs font-mono text-on-surface font-bold truncate">
                  {isOnDuty ? 'DUTY ONLINE' : 'OFF DUTY'}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleDuty()}
                  disabled={updatingAvailability || availabilityStatus === null}
                  className={`ml-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 ${
                    isOnDuty
                      ? 'bg-error-container text-on-error-container hover:bg-error/20 border border-error/30'
                      : 'bg-primary text-on-primary hover:bg-primary-hover'
                  }`}
                >
                  {isOnDuty ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LanguageSelector variant="dark" />
              <ThemeToggle variant="compact" />

              <NotificationCenter />

              <div className="h-5 w-px bg-border" />

              <div className="flex items-center gap-2">
                <Link href="/profile" className="flex items-center gap-2">
                  <div className="text-right flex flex-col items-end">
                    <div className="text-xs text-on-surface font-semibold leading-tight max-w-[140px] truncate">
                      {userName || userEmail || 'Driver Partner'}
                    </div>
                  </div>
                  <UserAvatar
                    src={null}
                    name={userName || userEmail || 'Driver Partner'}
                    className="w-8 h-8 ring-1 ring-primary"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="ml-2 flex items-center justify-center p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors disabled:opacity-50"
                  title="Logout Session"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="w-full pt-16 pb-8 px-3 sm:px-4 bg-background min-h-screen">{children}</main>
      </div>
    </div>
  );
}
