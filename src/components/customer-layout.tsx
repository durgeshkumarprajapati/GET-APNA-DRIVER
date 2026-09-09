'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';

interface CustomerLayoutProps {
  children: ReactNode;
  activePath?:
    | 'customer-dashboard'
    | 'customer-find-driver'
    | 'customer-active-tracking'
    | 'customer-bookings'
    | 'customer-favorites'
    | 'customer-wallet'
    | 'customer-offers'
    | 'customer-referral'
    | 'customer-safety-sos'
    | 'customer-support'
    | 'customer-settings';
}

export function CustomerLayout({
  children,
  activePath = 'customer-dashboard',
}: CustomerLayoutProps) {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      {/* HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0e16]/90 backdrop-blur-xl z-50 flex items-center justify-between px-6 border-b border-[#262a33]">
        <div className="flex items-center gap-5">
          <Link href="/customer/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold">
              <span className="material-symbols-outlined text-xl">directions_car</span>
            </div>
            <span className="font-bold text-base tracking-tight text-[#dfe2ee] uppercase font-['Space_Grotesk']">
              GET APNA DRIVER
            </span>
          </Link>
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181c24] text-[#bccac0] text-xs font-mono border border-[#262a33]">
            <span className="material-symbols-outlined text-[#68dba9] text-sm">verified_user</span>
            <span>256-Bit SSL Auth Rails • ISO/IEC 27001 Certified</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181c24] border border-[#262a33] text-xs">
            <span className="material-symbols-outlined text-[#68dba9] text-sm">location_on</span>
            <span className="font-mono text-[#dfe2ee]">South Delhi / NCR Hub (GPS Locked)</span>
          </div>

          <button
            onClick={() => setSearchModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1c2028] border border-[#262a33] text-xs text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            <span>Search Telemetry</span>
            <kbd className="px-1.5 py-0.5 bg-[#31353e] rounded text-[#dfe2ee] text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>

          <Link
            href="/admin/drivers"
            className="px-2.5 py-1 rounded-lg bg-[#1c2028] hover:bg-[#262a33] text-[#68dba9] font-mono text-xs border border-[#3d4a42]"
            title="Switch to Admin Console"
          >
            Admin Ops
          </Link>

          <button
            type="button"
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]"
          >
            <span className="material-symbols-outlined text-lg">dark_mode</span>
          </button>

          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setSearchModalOpen(true)}
            className="relative p-2 rounded-lg text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]"
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#68dba9] text-[10px] font-bold text-[#003825]">
              3
            </span>
          </button>

          <Link href="/customer/settings" className="flex items-center pl-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-xs font-['Space_Grotesk']">
                VS
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#68dba9] ring-2 ring-[#0a0e16]" />
            </div>
          </Link>
        </div>
      </header>

      {/* FIXED SIDEBAR */}
      <aside className="fixed left-0 top-16 bottom-10 w-64 bg-[#0a0e16] z-40 overflow-y-auto px-3 py-4 flex flex-col justify-between border-r border-[#262a33]">
        <div className="space-y-5">
          {/* Main Section */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
              Main Section
            </p>
            <nav className="space-y-0.5">
              <Link
                href="/customer/dashboard"
                data-path="customer-dashboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-dashboard'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
                <span>Dashboard</span>
              </Link>
              <Link
                href="/customer/find-driver"
                data-path="customer-find-driver"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-find-driver'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">explore</span>
                <span>Find a Driver</span>
              </Link>
              <Link
                href="/customer/active-tracking"
                data-path="customer-active-tracking"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-active-tracking'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">near_me</span>
                <span>Active Ride & Tracking</span>
              </Link>
              <Link
                href="/customer/bookings"
                data-path="customer-bookings"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-bookings'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">calendar_month</span>
                <span>My Bookings</span>
              </Link>
              <Link
                href="/customer/favorites"
                data-path="customer-favorites"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-favorites'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">star</span>
                <span>Favorite Drivers</span>
              </Link>
            </nav>
          </div>

          {/* Rewards & Finance */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
              Rewards & Finance
            </p>
            <nav className="space-y-0.5">
              <Link
                href="/customer/wallet"
                data-path="customer-wallet"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-wallet'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                <span>Wallet & Payments</span>
              </Link>
              <Link
                href="/customer/offers"
                data-path="customer-offers"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-offers'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">confirmation_number</span>
                <span>Offers & Coupons</span>
              </Link>
              <Link
                href="/customer/referral"
                data-path="customer-referral"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-referral'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  featured_seasonal_and_gifts
                </span>
                <span>Refer & Earn</span>
              </Link>
            </nav>
          </div>

          {/* Account & Safety */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
              Account & Safety
            </p>
            <nav className="space-y-0.5">
              <Link
                href="/customer/safety-sos"
                data-path="customer-safety-sos"
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-safety-sos'
                    ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg text-[#ffb4ab]">
                    emergency_home
                  </span>
                  <span>SOS Emergency Hub</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] text-[9px] font-bold uppercase font-['Space_Grotesk']">
                  PRIORITY
                </span>
              </Link>
              <Link
                href="/customer/support"
                data-path="customer-support"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-support'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                <span>Customer Support</span>
              </Link>
              <Link
                href="/customer/settings"
                data-path="customer-settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activePath === 'customer-settings'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">settings</span>
                <span>Profile & Settings</span>
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* MAIN BODY AREA */}
      <div className="pl-64">
        <main className="w-full pt-16 pb-12 px-6 min-h-screen bg-[#0f131c]">{children}</main>
      </div>

      {/* FOOTER BAR */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-[#0a0e16] z-50 flex items-center justify-between px-6 border-t border-[#262a33]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xs text-[#bccac0]">
            <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
            <span>OPERATIONAL TELEMATICS ONLINE</span>
          </div>
          <span className="hidden md:inline font-mono text-xs text-[#bccac0]">
            SLA 99.8% AVAILABILITY
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#bccac0]">
          <span className="material-symbols-outlined text-[#ffb4ab] text-sm">call</span>
          <span>
            EMERGENCY SOS: <strong className="text-[#ffb4ab]">+91 11 4099 2200</strong>
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
                Search Customer Telemetry
              </h3>
              <button
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
                  href="/customer/active-tracking"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    near_me
                  </span>
                  Active Ride Tracker
                </Link>
                <Link
                  href="/customer/bookings"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    calendar_month
                  </span>
                  My Bookings
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
