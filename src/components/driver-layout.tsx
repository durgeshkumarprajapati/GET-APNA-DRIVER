'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from './notification-center';
import { useAutoLocation } from './use-auto-location';

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

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operational Dispatch',
    items: [
      { href: '/driver', label: 'Dashboard', icon: 'radar' },
      {
        href: '/driver/assignment-offers',
        label: 'Assignment Offers',
        icon: 'notifications_active',
      },
      { href: '/driver/bookings', label: 'My Bookings', icon: 'explore' },
    ],
  },
  {
    label: 'Finance & Ledger',
    items: [
      {
        href: '/driver/wallet-and-payouts',
        label: 'Wallet & Payouts',
        icon: 'account_balance_wallet',
      },
    ],
  },
  {
    label: 'Growth & Reputation',
    items: [
      {
        href: '/driver/performance-and-badges',
        label: 'Performance & Badges',
        icon: 'military_tech',
      },
      { href: '/driver/ratings-and-reviews', label: 'Ratings & Reviews', icon: 'star' },
      { href: '/driver/public-portfolio', label: 'Public Portfolio', icon: 'badge' },
    ],
  },
  {
    label: 'Governance & Account',
    items: [
      { href: '/driver/profile', label: 'Profile', icon: 'person' },
      { href: '/driver/documents', label: 'Documents', icon: 'verified_user' },
      { href: '/driver/sos-support', label: 'SOS Emergency', icon: 'emergency_home' },
      { href: '/driver/settings', label: 'Console Settings', icon: 'tune' },
    ],
  },
];

export function DriverLayout({ children, userEmail = null }: DriverLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  useAutoLocation('DRIVER');

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
      {/* FIXED SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0a0e16] z-50 flex flex-col justify-between py-4 border-r border-[#262a33] shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
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
          <nav className="flex-1 overflow-y-auto px-3 space-y-4 mt-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                  {group.label}
                </span>
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
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
      <div className="pl-72">
        <header className="fixed top-0 left-72 right-0 h-16 bg-[#0a0e16]/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.45)] border-b border-[#262a33]">
          <div className="w-full px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Duty Shift Pill Switcher */}
              <div className="flex items-center bg-[#1c2028] px-3 py-1.5 rounded-full gap-2 border border-[#262a33]">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnDuty ? 'bg-[#68dba9]' : 'bg-[#87948b]'
                    }`}
                  />
                  {isOnDuty && (
                    <span className="absolute w-4 h-4 rounded-full bg-[#68dba9]/40 animate-ping" />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#68dba9] font-['Space_Grotesk']">
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
                  className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                >
                  {isOnDuty ? 'Toggle Off' : 'Toggle On'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/customer/dashboard"
                className="px-2.5 py-1 rounded-lg bg-[#1c2028] hover:bg-[#262a33] text-[#68dba9] font-mono text-xs border border-[#3d4a42]"
                title="Switch to Customer Hub"
              >
                Customer Hub
              </Link>

              <NotificationCenter />

              <div className="flex items-center gap-2 pl-1">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-[#dfe2ee] max-w-[160px] truncate">
                    {userEmail ?? 'Driver'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-xs text-[#68dba9]">
                  {(userEmail ?? 'D').charAt(0).toUpperCase()}
                </div>
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
