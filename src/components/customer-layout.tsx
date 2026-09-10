'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from './notification-center';
import { useAutoLocation } from './use-auto-location';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';

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

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main Section',
    items: [
      { href: '/customer/dashboard', label: 'Dashboard', icon: 'grid_view' },
      { href: '/customer/find-driver', label: 'Find a Driver', icon: 'explore' },
      { href: '/customer/active-tracking', label: 'Active Ride & Tracking', icon: 'near_me' },
      { href: '/bookings', label: 'My Bookings', icon: 'calendar_month' },
      { href: '/customer/reviews', label: 'My Reviews', icon: 'reviews' },
      { href: '/customer/favorites', label: 'Favorite Drivers', icon: 'star' },
    ],
  },
  {
    label: 'Rewards & Finance',
    items: [
      { href: '/customer/wallet', label: 'Wallet', icon: 'account_balance_wallet' },
      { href: '/customer/offers', label: 'Offers & Coupons', icon: 'confirmation_number' },
      {
        href: '/customer/referral',
        label: 'Refer & Earn',
        icon: 'featured_seasonal_and_gifts',
      },
    ],
  },
  {
    label: 'Account & Safety',
    items: [
      { href: '/customer/safety-sos', label: 'SOS Emergency Hub', icon: 'emergency_home' },
      { href: '/customer/support', label: 'Customer Support', icon: 'support_agent' },
      { href: '/profile', label: 'Profile & Settings', icon: 'settings' },
    ],
  },
];

export function CustomerLayout({ children, userEmail = null }: CustomerLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useAutoLocation('CUSTOMER');

  const isActive = (href: string) =>
    pathname === href || (href !== '/customer/dashboard' && pathname?.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navGroups={NAV_GROUPS}
        isActive={isActive}
        brandLabel="Get Apna Driver"
        brandHref="/customer/dashboard"
      />

      {/* HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0e16]/90 backdrop-blur-xl z-50 flex items-center justify-between px-3 sm:px-6 border-b border-[#262a33]">
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
          <Link href="/customer/dashboard" className="flex items-center gap-3 group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold shrink-0">
              <span className="material-symbols-outlined text-xl">directions_car</span>
            </div>
            <span className="font-bold text-base tracking-tight text-[#dfe2ee] uppercase font-['Space_Grotesk'] hidden sm:inline truncate">
              GET APNA DRIVER
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1c2028] border border-[#262a33] text-xs text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            <span>Search</span>
          </button>

          <NotificationCenter />

          <Link href="/profile" className="flex items-center gap-2 pl-1">
            <div className="text-right hidden md:block">
              <div className="text-xs text-[#dfe2ee] font-semibold leading-tight max-w-[160px] truncate">
                {userEmail ?? 'Customer'}
              </div>
            </div>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-xs font-['Space_Grotesk']">
                {(userEmail ?? 'C').charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#68dba9] ring-2 ring-[#0a0e16]" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-semibold text-red-300 transition-colors"
            title="Log Out"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* FIXED SIDEBAR — desktop only, md and up */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-10 w-64 bg-[#0a0e16] z-40 overflow-y-auto px-3 py-4 flex-col justify-between border-r border-[#262a33]">
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                      isActive(item.href)
                        ? item.href === '/customer/safety-sos'
                          ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                          : 'bg-[#25a475] text-[#00311f] font-bold'
                        : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-lg ${
                        item.href === '/customer/safety-sos' && !isActive(item.href)
                          ? 'text-[#ffb4ab]'
                          : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN BODY AREA */}
      <div className="md:pl-64">
        <main className="w-full pt-16 pb-12 px-4 sm:px-6 min-h-screen bg-[#0f131c]">
          {children}
        </main>
      </div>

      {/* FOOTER BAR */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-[#0a0e16] z-50 flex items-center justify-between px-3 sm:px-6 border-t border-[#262a33] gap-2">
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-[#bccac0] shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
          <span>SYSTEM ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs text-[#bccac0] min-w-0 ml-auto">
          <span className="material-symbols-outlined text-[#ffb4ab] text-sm shrink-0">call</span>
          <span className="truncate">
            <span className="hidden sm:inline">EMERGENCY SOS: </span>
            <strong className="text-[#ffb4ab]">+91 11 4099 2200</strong>
          </span>
        </div>
      </footer>

      {/* SEARCH MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c2028] border border-[#3d4a42] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9]">search</span>
                Search
              </h3>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="text-[#bccac0] hover:text-[#dfe2ee]"
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
                className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-4 py-3 text-sm text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-[#bccac0] font-['Space_Grotesk']">
                Quick Action Links
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/customer/find-driver"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    explore
                  </span>
                  Find Chauffeur
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    calendar_month
                  </span>
                  My Bookings
                </Link>
                <Link
                  href="/bookings/new"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">add</span>
                  New Booking
                </Link>
                <Link
                  href="/customer/safety-sos"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#93000a]/20 hover:bg-[#93000a]/40 rounded-xl text-[#ffdad6] flex items-center gap-2 border border-[#93000a]/50 font-bold"
                >
                  <span className="material-symbols-outlined text-[#ffb4ab] text-base">
                    emergency
                  </span>
                  SOS Emergency Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
