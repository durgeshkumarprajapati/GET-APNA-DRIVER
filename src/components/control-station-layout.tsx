'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';

interface ControlStationLayoutProps {
  children: ReactNode;
  activePersona: 'customer' | 'driver' | 'admin' | 'public';
  activePath?: string;
}

export function ControlStationLayout({
  children,
  activePersona,
  activePath = 'customer-book-driver',
}: ControlStationLayoutProps) {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      {/* FIXED SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0a0e16] z-50 flex flex-col justify-between p-4 border-r border-[#262a33] shadow-[1px_0_12px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <Link href="/" className="flex items-center gap-3 px-1 group">
            <div className="w-9 h-9 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9] group-hover:scale-105 transition-transform shadow-md">
              <span className="material-symbols-outlined text-xl">local_taxi</span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[#dfe2ee] block leading-none font-['Space_Grotesk']">
                GET APNA DRIVER
              </span>
              <span className="text-[9px] font-bold uppercase text-[#68dba9] tracking-widest block mt-0.5 font-['Space_Grotesk']">
                Control Station
              </span>
            </div>
          </Link>

          {/* Active Persona Pill Switcher */}
          <div className="bg-[#181c24] p-1.5 rounded-xl flex flex-col gap-1 border border-[#262a33]">
            <span className="text-[9px] font-bold text-[#bccac0] uppercase px-1 font-['Space_Grotesk']">
              Active Persona
            </span>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
              <Link
                href="/bookings/new"
                className={`py-1 px-2 rounded text-center transition-colors ${
                  activePersona === 'customer'
                    ? 'bg-[#1c2028] text-[#dfe2ee] font-bold border border-[#3d4a42]'
                    : 'text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#262a33]'
                }`}
              >
                Customer
              </Link>
              <Link
                href="/driver"
                className={`py-1 px-2 rounded text-center transition-colors ${
                  activePersona === 'driver'
                    ? 'bg-[#1c2028] text-[#dfe2ee] font-bold border border-[#3d4a42]'
                    : 'text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#262a33]'
                }`}
              >
                Driver
              </Link>
              <Link
                href="/admin/drivers"
                className={`py-1 px-2 rounded text-center transition-colors ${
                  activePersona === 'admin'
                    ? 'bg-[#1c2028] text-[#dfe2ee] font-bold border border-[#3d4a42]'
                    : 'text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#262a33]'
                }`}
              >
                Admin
              </Link>
              <Link
                href="/"
                className={`py-1 px-2 rounded text-center transition-colors ${
                  activePersona === 'public'
                    ? 'bg-[#1c2028] text-[#dfe2ee] font-bold border border-[#3d4a42]'
                    : 'text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#262a33]'
                }`}
              >
                Public
              </Link>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className="space-y-4">
            {/* Customer Workspace */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#bccac0] px-2 block font-['Space_Grotesk']">
                Customer Workspace
              </span>
              <nav className="flex flex-col gap-1 text-xs">
                <Link
                  href="/bookings/new"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'customer-book-driver'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">hail</span>
                  <span>Book Driver</span>
                </Link>
                <Link
                  href="/bookings"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'customer-active-ride'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">navigation</span>
                  <span>Active Ride</span>
                </Link>
                <Link
                  href="/bookings"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'customer-my-bookings'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>My Bookings</span>
                </Link>
                <Link
                  href="/payments"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'customer-wallet'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    account_balance_wallet
                  </span>
                  <span>Wallet & Coupons</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#ffb4ab] hover:bg-[#93000a]/40 hover:text-[#ffdad6] transition-colors"
                >
                  <span className="material-symbols-outlined text-base">emergency</span>
                  <span className="font-bold">SOS Safety Desk</span>
                </Link>
              </nav>
            </div>

            {/* Driver & Ops Terminal */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#bccac0] px-2 block font-['Space_Grotesk']">
                Driver & Ops Terminal
              </span>
              <nav className="flex flex-col gap-1 text-xs">
                <Link
                  href="/driver"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'driver-dispatch-radar'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">radar</span>
                  <span>Dispatch Radar</span>
                </Link>
                <Link
                  href="/driver/wallet"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'driver-earnings'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">payments</span>
                  <span>Today&apos;s Earnings</span>
                </Link>
                <Link
                  href="/admin/drivers"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'admin-live-ops-map'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">map</span>
                  <span>Live Ops Map</span>
                </Link>
                <Link
                  href="/admin/driver-documents"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    activePath === 'admin-driver-approvals'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>KYC Approvals</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Footer Telemetry Badge */}
        <div className="bg-[#181c24] p-3 rounded-xl flex items-center justify-between border border-[#262a33]">
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#bccac0]">
            <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
            <span>DELHI-NCR OPERATIONAL</span>
          </div>
          <span className="font-mono text-[10px] text-[#68dba9] font-bold">99.8%</span>
        </div>
      </aside>

      {/* HEADER BAR */}
      <div className="pl-72">
        <header className="fixed top-0 left-72 right-0 h-16 bg-[#0f131c]/90 backdrop-blur-xl z-40 px-6 flex items-center justify-between border-b border-[#262a33] shadow-[0_1px_8px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center bg-[#0a0e16] px-3.5 py-1.5 rounded-xl w-72 justify-between border border-[#262a33] text-xs text-[#bccac0]"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">search</span>
                <span>Quick dispatch lookup...</span>
              </div>
              <kbd className="bg-[#262a33] px-1.5 py-0.5 rounded text-[#bccac0] text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-[#181c24] px-3 py-1.5 rounded-full border border-[#262a33]">
              <span className="material-symbols-outlined text-[#68dba9] text-base">
                location_on
              </span>
              <span className="text-xs font-mono text-[#dfe2ee]">South Delhi / NCR Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              onClick={() => setSearchModalOpen(true)}
              className="relative w-9 h-9 rounded-xl bg-[#181c24] hover:bg-[#1c2028] text-[#bccac0] hover:text-[#dfe2ee] flex items-center justify-center transition-colors border border-[#262a33]"
            >
              <span className="material-symbols-outlined text-lg">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#68dba9]" />
            </button>

            <Link href="/profile" className="flex items-center gap-2 pl-1">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-xs">
                  AD
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0f131c] rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#68dba9] text-[10px]">
                    verified
                  </span>
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* MAIN PAGE BODY */}
        <main className="relative pt-16 bg-[#0f131c] w-full min-h-screen">{children}</main>
      </div>

      {/* SEARCH MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c2028] border border-[#3d4a42] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9]">search</span>
                Control Station Lookup
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
                Quick Links
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/bookings/new"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">hail</span>
                  Book Driver
                </Link>
                <Link
                  href="/driver"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">radar</span>
                  Driver Radar
                </Link>
                <Link
                  href="/admin/drivers"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">map</span>
                  Live Ops Map
                </Link>
                <Link
                  href="/admin/driver-documents"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    verified
                  </span>
                  KYC Approvals
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
