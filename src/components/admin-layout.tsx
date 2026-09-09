'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';

interface AdminLayoutProps {
  children: ReactNode;
  activePath?:
    | 'mission-dashboard'
    | 'live-fleet-radar'
    | 'analytics-and-bi'
    | 'customers'
    | 'driver-directory'
    | 'verification-queue'
    | 'admin-access-and-rbac'
    | 'live-bookings'
    | 'sos-and-disputes'
    | 'dispatch-overrides'
    | 'treasury-and-settlements'
    | 'payout-rails'
    | 'commission-matrix'
    | 'tax-invoices'
    | 'coupons'
    | 'referral-engines'
    | 'audit-logs'
    | 'system-config';
}

export function AdminLayout({ children, activePath = 'mission-dashboard' }: AdminLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      {/* FIXED SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0a0e16] border-r border-[#262a33] z-50 flex flex-col overflow-y-auto shadow-2xl">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#262a33] shrink-0 bg-[#0a0e16]/80 backdrop-blur-md">
          <Link href="/admin/mission-dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-[#dfe2ee] tracking-tight leading-none font-['Space_Grotesk']">
                Get Apna Driver
              </span>
              <span className="text-[9px] font-bold text-[#68dba9] tracking-widest mt-0.5 uppercase font-['Space_Grotesk']">
                Chauffeur Matrix OS
              </span>
            </div>
          </Link>
        </div>

        {/* Latency Ticker Strip */}
        <div className="px-4 py-2 border-b border-[#262a33] bg-[#181c24]/40 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68dba9]" />
            </span>
            <span className="text-[#bccac0] text-[10px] uppercase font-bold">SYS_LATENCY</span>
          </div>
          <span className="text-[#68dba9] font-bold text-[10px]">14ms • SECURE</span>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-4">
          {/* Overview */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
              Overview
            </span>
            <Link
              href="/admin/mission-dashboard"
              data-path="mission-dashboard"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'mission-dashboard'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Mission Dashboard</span>
            </Link>

            <Link
              href="/admin/live-fleet-radar"
              data-path="live-fleet-radar"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'live-fleet-radar'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">radar</span>
              <span>Live Fleet Radar</span>
            </Link>

            <Link
              href="/admin/analytics-and-bi"
              data-path="analytics-and-bi"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'analytics-and-bi'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">insights</span>
              <span>Analytics &amp; BI</span>
            </Link>
          </div>

          {/* User Mgmt */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
              User Mgmt
            </span>
            <Link
              href="/admin/customers"
              data-path="customers"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'customers'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              <span>Customers</span>
            </Link>

            <Link
              href="/admin/driver-directory"
              data-path="driver-directory"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'driver-directory'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">id_card</span>
              <span>Driver Directory</span>
            </Link>

            <Link
              href="/admin/verification-queue"
              data-path="verification-queue"
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'verification-queue'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Verification Queue</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold">
                18
              </span>
            </Link>

            <Link
              href="/admin/admin-access-and-rbac"
              data-path="admin-access-and-rbac"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'admin-access-and-rbac'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              <span>Admin Access &amp; RBAC</span>
            </Link>
          </div>

          {/* Operations */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
              Operations
            </span>
            <Link
              href="/admin/live-bookings"
              data-path="live-bookings"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'live-bookings'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">local_taxi</span>
              <span>Live Bookings</span>
            </Link>

            <Link
              href="/admin/sos-and-disputes"
              data-path="sos-and-disputes"
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'sos-and-disputes'
                  ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#ffb4ab]">
                  crisis_alert
                </span>
                <span>SOS &amp; Disputes</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-[#93000a]/40 text-[#ffb4ab] font-mono text-[9px] font-bold animate-pulse">
                2 ACTIVE
              </span>
            </Link>

            <Link
              href="/admin/dispatch-overrides"
              data-path="dispatch-overrides"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'dispatch-overrides'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">published_with_changes</span>
              <span>Dispatch Overrides</span>
            </Link>
          </div>

          {/* Finance & Audit */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
              Finance &amp; Audit
            </span>
            <Link
              href="/admin/treasury-and-settlements"
              data-path="treasury-and-settlements"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'treasury-and-settlements'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              <span>Treasury &amp; Settlements</span>
            </Link>

            <Link
              href="/admin/payout-rails"
              data-path="payout-rails"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'payout-rails'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">currency_rupee</span>
              <span>Payout Rails</span>
            </Link>

            <Link
              href="/admin/commission-matrix"
              data-path="commission-matrix"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'commission-matrix'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">percent</span>
              <span>Commission Matrix</span>
            </Link>

            <Link
              href="/admin/tax-invoices"
              data-path="tax-invoices"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'tax-invoices'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Tax Invoices</span>
            </Link>
          </div>

          {/* Governance & Config */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
              Governance
            </span>
            <Link
              href="/admin/audit-logs"
              data-path="audit-logs"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'audit-logs'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">history_edu</span>
              <span>Audit Logs</span>
            </Link>

            <Link
              href="/admin/system-config"
              data-path="system-config"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                activePath === 'system-config'
                  ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                  : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>System Config</span>
            </Link>
          </div>
        </nav>

        {/* Footer Security Badge */}
        <div className="p-3 border-t border-[#262a33] bg-[#0a0e16]/90">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#181c24] rounded-lg border border-[#262a33]">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="material-symbols-outlined text-[#68dba9] text-[16px]">
                shield_with_heart
              </span>
              <span className="text-[#dfe2ee] font-bold">ENCRYPTED V4</span>
            </div>
            <span className="font-mono text-[10px] text-[#87948b]">TLS 1.3</span>
          </div>
        </div>
      </aside>

      {/* HEADER BAR */}
      <div className="pl-72">
        <header className="fixed top-0 left-72 right-0 h-16 bg-[#0a0e16]/85 backdrop-blur-xl border-b border-[#262a33] z-40 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
              <span className="font-mono text-xs text-[#68dba9] font-bold">PROD-DELHI-CORE</span>
            </div>
            <div className="hidden xl:flex items-center gap-1.5 text-[#bccac0] font-mono text-xs border-l border-[#262a33] pl-4">
              <span className="material-symbols-outlined text-[16px] text-[#87948b]">schedule</span>
              <span>IST 14:48:02 UTC+5:30</span>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#87948b] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drivers, bookings, telematics, txns... ⌘K"
                className="w-full h-9 pl-10 pr-12 rounded-lg bg-[#181c24] border border-[#262a33] font-mono text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9] focus:ring-1 focus:ring-[#68dba9] transition-all"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#262a33] border border-[#3d4a42] font-mono text-[10px] text-[#bccac0]">
                ⌘K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              title="Operational SOS & Alerts"
              className="relative p-2 rounded-lg bg-[#181c24] hover:bg-[#262a33] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold">
                4
              </span>
            </button>

            <div className="h-6 w-px bg-[#262a33]" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <div className="font-bold text-[10px] text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  SUPER ADMIN - LEVEL 4
                </div>
                <div className="text-xs text-[#dfe2ee] font-semibold leading-tight font-['Space_Grotesk']">
                  Vikramaditya S.
                </div>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center font-bold text-xs text-[#68dba9] font-['Space_Grotesk']">
                  VS
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#68dba9] border-2 border-[#0a0e16]" />
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="relative w-full pt-16 bg-[#0f131c] min-h-screen p-6">{children}</main>
      </div>
    </div>
  );
}
