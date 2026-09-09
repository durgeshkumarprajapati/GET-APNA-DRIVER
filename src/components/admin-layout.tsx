'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from './notification-center';

interface AdminLayoutProps {
  children: ReactNode;
  userEmail?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardBadgeCounts {
  pendingDocumentVerifications: number;
}

export function AdminLayout({ children, userEmail = null }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [badgeCounts, setBadgeCounts] = useState<DashboardBadgeCounts | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok && isMounted) {
          const data = await res.json();
          setBadgeCounts({
            pendingDocumentVerifications: data.drivers?.pendingDocumentVerifications ?? 0,
          });
        }
      } catch {
        // Ignore — badges simply stay unset.
      }
    };
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { href: '/admin/mission-dashboard', label: 'Mission Dashboard', icon: 'grid_view' },
        { href: '/admin/live-fleet-radar', label: 'Live Fleet Radar', icon: 'radar' },
        { href: '/admin/analytics-and-bi', label: 'Analytics & BI', icon: 'insights' },
      ],
    },
    {
      label: 'User Mgmt',
      items: [
        { href: '/admin/customers', label: 'Customers', icon: 'groups' },
        { href: '/admin/drivers', label: 'Driver Directory', icon: 'id_card' },
        {
          href: '/admin/verification-queue',
          label: 'Verification Queue',
          icon: 'verified_user',
          badge: badgeCounts?.pendingDocumentVerifications,
        },
        {
          href: '/admin/admin-access-and-rbac',
          label: 'Admin Access & RBAC',
          icon: 'admin_panel_settings',
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        { href: '/admin/live-bookings', label: 'Live Bookings', icon: 'local_taxi' },
        { href: '/admin/sos-and-disputes', label: 'SOS & Disputes', icon: 'crisis_alert' },
        { href: '/admin/reviews', label: 'Reviews & Ratings', icon: 'reviews' },
      ],
    },
    {
      label: 'Finance & Audit',
      items: [
        { href: '/admin/payments', label: 'Payments', icon: 'credit_card' },
        { href: '/admin/settlements', label: 'Driver Settlements', icon: 'payments' },
        {
          href: '/admin/finance/transactions',
          label: 'Ledger Transactions',
          icon: 'account_balance',
        },
        {
          href: '/admin/treasury-and-settlements',
          label: 'Treasury & Settlements',
          icon: 'account_balance_wallet',
        },
        { href: '/admin/payout-rails', label: 'Payout Rails', icon: 'currency_rupee' },
        { href: '/admin/commission-matrix', label: 'Commission Matrix', icon: 'percent' },
        { href: '/admin/tax-invoices', label: 'Tax Invoices', icon: 'receipt_long' },
      ],
    },
    {
      label: 'Governance',
      items: [
        { href: '/admin/audit-logs', label: 'Audit Logs', icon: 'history_edu' },
        { href: '/admin/system-config', label: 'System Config', icon: 'tune' },
      ],
    },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname?.startsWith(`${href}/`));

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

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
                {group.label}
              </span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                    isActive(item.href)
                      ? 'bg-[#25a475] text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.25)]'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {!!item.badge && (
                    <span className="px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
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
              <span className="font-mono text-xs text-[#68dba9] font-bold">SYSTEM ONLINE</span>
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
                placeholder="Search drivers, bookings, transactions..."
                className="w-full h-9 pl-10 pr-3 rounded-lg bg-[#181c24] border border-[#262a33] font-mono text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9] focus:ring-1 focus:ring-[#68dba9] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NotificationCenter />

            <div className="h-6 w-px bg-[#262a33]" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <div className="font-bold text-[10px] text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  Administrator
                </div>
                <div className="text-xs text-[#dfe2ee] font-semibold leading-tight font-['Space_Grotesk'] max-w-[160px] truncate">
                  {userEmail ?? 'Admin'}
                </div>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center font-bold text-xs text-[#68dba9] font-['Space_Grotesk']">
                  {(userEmail ?? 'A').charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#68dba9] border-2 border-[#0a0e16]" />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Log out"
                className="p-2 rounded-lg bg-[#181c24] hover:bg-[#262a33] border border-[#262a33] text-[#bccac0] hover:text-[#ffb4ab] transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="relative w-full pt-16 bg-[#0f131c] min-h-screen p-6">{children}</main>
      </div>
    </div>
  );
}
