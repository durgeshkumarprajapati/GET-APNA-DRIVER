'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';

interface DriverLayoutProps {
  children: ReactNode;
  activePath?:
    | 'radar-and-duty-shift'
    | 'incoming-bookings'
    | 'active-mission-navigation'
    | 'schedule'
    | 'earnings-and-ledger'
    | 'wallet-and-payouts'
    | 'settlement-cycles'
    | 'performance-and-badges'
    | 'ratings-and-reviews'
    | 'public-portfolio'
    | 'document-vault'
    | 'sos-support'
    | 'settings';
}

export function DriverLayout({ children, activePath = 'radar-and-duty-shift' }: DriverLayoutProps) {
  const [isOnDuty, setIsOnDuty] = useState(true);

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
            {/* Operational Dispatch */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                Operational Dispatch
              </span>
              <div className="space-y-0.5 pt-1">
                <Link
                  href="/driver"
                  data-path="radar-and-duty-shift"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'radar-and-duty-shift'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">radar</span>
                  <span>Radar &amp; Duty Shift</span>
                </Link>

                <Link
                  href="/driver/incoming-bookings"
                  data-path="incoming-bookings"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'incoming-bookings'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">notifications_active</span>
                    <span>Incoming Bookings</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#68dba9] font-mono text-[9px] font-bold">
                    LIVE
                  </span>
                </Link>

                <Link
                  href="/driver/active-mission-navigation"
                  data-path="active-mission-navigation"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'active-mission-navigation'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">explore</span>
                  <span>Active Mission</span>
                </Link>

                <Link
                  href="/driver/schedule"
                  data-path="schedule"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'schedule'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">calendar_today</span>
                  <span>Schedule</span>
                </Link>
              </div>
            </div>

            {/* Finance & Ledger */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                Finance &amp; Ledger
              </span>
              <div className="space-y-0.5 pt-1">
                <Link
                  href="/driver/earnings-and-ledger"
                  data-path="earnings-and-ledger"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'earnings-and-ledger'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">payments</span>
                  <span>Earnings &amp; Ledger</span>
                </Link>

                <Link
                  href="/driver/wallet-and-payouts"
                  data-path="wallet-and-payouts"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'wallet-and-payouts'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                  <span>Wallet &amp; Payouts</span>
                </Link>

                <Link
                  href="/driver/settlement-cycles"
                  data-path="settlement-cycles"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'settlement-cycles'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                  <span>Settlement Cycles</span>
                </Link>
              </div>
            </div>

            {/* Growth & Reputation */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                Growth &amp; Reputation
              </span>
              <div className="space-y-0.5 pt-1">
                <Link
                  href="/driver/performance-and-badges"
                  data-path="performance-and-badges"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'performance-and-badges'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">military_tech</span>
                  <span>Performance &amp; Badges</span>
                </Link>

                <Link
                  href="/driver/ratings-and-reviews"
                  data-path="ratings-and-reviews"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'ratings-and-reviews'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">star</span>
                  <span>Ratings &amp; Reviews</span>
                </Link>

                <Link
                  href="/driver/public-portfolio"
                  data-path="public-portfolio"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'public-portfolio'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">badge</span>
                  <span>Public Portfolio</span>
                </Link>
              </div>
            </div>

            {/* Governance & Account */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase text-[#87948b] tracking-wider font-['Space_Grotesk']">
                Governance &amp; Account
              </span>
              <div className="space-y-0.5 pt-1">
                <Link
                  href="/driver/document-vault"
                  data-path="document-vault"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'document-vault'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                  <span>Document Vault</span>
                </Link>

                <Link
                  href="/driver/sos-support"
                  data-path="sos-support"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'sos-support'
                      ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg text-[#ffb4ab]">
                    emergency_home
                  </span>
                  <span>SOS Emergency</span>
                </Link>

                <Link
                  href="/driver/settings"
                  data-path="settings"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    activePath === 'settings'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">tune</span>
                  <span>Console Settings</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* Footer Telemetry Badge */}
          <div className="px-4 pt-3">
            <div className="bg-[#1c2028] p-3 rounded-xl flex items-center justify-between border border-[#262a33]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
                <span className="font-bold text-xs text-[#dfe2ee] uppercase font-['Space_Grotesk']">
                  Telemetry Active
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#87948b]">v4.8.2-SEC</span>
            </div>
          </div>
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
                  {isOnDuty ? 'ONLINE • ON DUTY' : 'OFFLINE • OFF DUTY'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOnDuty(!isOnDuty)}
                  className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] px-2 py-0.5 rounded transition-colors"
                >
                  {isOnDuty ? 'Toggle Off' : 'Toggle On'}
                </button>
              </div>

              {/* Satellite GPS Pill */}
              <div className="hidden xl:flex items-center gap-1.5 bg-[#1c2028] px-3 py-1.5 rounded-lg text-[#87948b] border border-[#262a33]">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">
                  satellite_alt
                </span>
                <span className="font-mono text-xs text-[#dfe2ee]">GPS LOCK 99.8%</span>
                <span className="font-mono text-xs text-[#3d4a42]">•</span>
                <span className="font-mono text-xs text-[#bccac0]">LAT 28.5355° N</span>
              </div>

              {/* Shift Clock Pill */}
              <div className="hidden lg:flex items-center gap-1.5 bg-[#1c2028] px-3 py-1.5 rounded-lg border border-[#262a33]">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">timer</span>
                <span className="text-[10px] font-bold uppercase text-[#87948b] font-['Space_Grotesk']">
                  Shift Clock:
                </span>
                <span className="font-mono text-xs font-bold text-[#dfe2ee]">04h 28m</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#1c2028] px-3 py-1.5 rounded-lg border border-[#262a33]">
                <span className="text-[10px] font-bold text-[#87948b] uppercase mr-1 font-['Space_Grotesk']">
                  Tier:
                </span>
                <span className="text-[10px] font-bold text-[#4edea3] tracking-wider uppercase font-['Space_Grotesk']">
                  VIP CHAUFFEUR
                </span>
              </div>

              <Link
                href="/customer/dashboard"
                className="px-2.5 py-1 rounded-lg bg-[#1c2028] hover:bg-[#262a33] text-[#68dba9] font-mono text-xs border border-[#3d4a42]"
                title="Switch to Customer Hub"
              >
                Customer Hub
              </Link>

              <button
                type="button"
                aria-label="Notifications"
                className="relative p-2 rounded-lg bg-[#1c2028] hover:bg-[#262a33] text-[#bccac0] hover:text-[#dfe2ee] transition-colors border border-[#262a33]"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#68dba9]" />
              </button>

              <div className="flex items-center gap-2 pl-1">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-[#dfe2ee]">Capt. Rajesh Verma</span>
                  <span className="font-mono text-[10px] text-[#68dba9]">ID: APNA-8842</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-xs text-[#68dba9]">
                  RV
                </div>
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
