'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { NotificationCenter } from './notification-center';
import { LanguageSelector } from './ui/language-selector';
import { MobileNavDrawer, MobileNavTrigger } from './ui/mobile-nav-drawer';
import { ThemeToggle } from './ui/theme-toggle';

interface CorporateLayoutProps {
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

export function CorporateLayout({ children, userEmail = null }: CorporateLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [orgData, setOrgData] = useState<{
    name: string;
    role: string;
    creditLimit: number;
    currentBalance: number;
  } | null>(null);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch('/api/corporate/organization');
        if (res.ok) {
          const data = await res.json();
          if (data.membership) {
            setOrgData({
              name: data.membership.organization.name,
              role: data.membership.role,
              creditLimit: Number(data.membership.organization.creditLimit || 0),
              currentBalance: Number(data.membership.organization.currentBalance || 0),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load corporate organization:', err);
      }
    }
    void loadOrg();
  }, []);

  const navGroups: NavGroup[] = [
    {
      label: t('corporate.nav.main', { defaultValue: 'BUSINESS MANAGEMENT' }),
      items: [
        {
          href: '/corporate/dashboard',
          label: t('corporate.nav.dashboard', { defaultValue: 'Dashboard' }),
          icon: 'dashboard',
        },
        {
          href: '/corporate/bookings',
          label: t('corporate.nav.bookings', { defaultValue: 'Corporate Rides' }),
          icon: 'local_taxi',
        },
        {
          href: '/corporate/bookings/new',
          label: t('corporate.nav.newBooking', { defaultValue: 'Book Corporate Ride' }),
          icon: 'add_circle',
        },
      ],
    },
    {
      label: t('corporate.nav.governance', { defaultValue: 'GOVERNANCE & TEAM' }),
      items: [
        {
          href: '/corporate/members',
          label: t('corporate.nav.members', { defaultValue: 'Employees & Roster' }),
          icon: 'group',
        },
        {
          href: '/corporate/approvals',
          label: t('corporate.nav.approvals', { defaultValue: 'Approval Queue' }),
          icon: 'verified',
        },
        {
          href: '/corporate/policies',
          label: t('corporate.nav.policies', { defaultValue: 'Travel Policies' }),
          icon: 'policy',
        },
      ],
    },
    {
      label: t('corporate.nav.finance', { defaultValue: 'FINANCE & REPORTS' }),
      items: [
        {
          href: '/corporate/billing',
          label: t('corporate.nav.billing', { defaultValue: 'Billing & GST' }),
          icon: 'receipt_long',
        },
        {
          href: '/corporate/reports',
          label: t('corporate.nav.reports', { defaultValue: 'Spend Analytics' }),
          icon: 'analytics',
        },
      ],
    },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== '/corporate/dashboard' && pathname?.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans antialiased">
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navGroups={navGroups}
        isActive={isActive}
        brandLabel="Corporate Portal"
        brandHref="/corporate/dashboard"
      />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-50 flex items-center justify-between px-3 sm:px-6 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
          <Link href="/corporate/dashboard" className="flex items-center gap-3 group min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#25a475] to-[#68dba9] flex items-center justify-center text-[#00311f] font-bold shrink-0 shadow-lg shadow-[#25a475]/20">
              <span className="material-symbols-outlined text-xl">domain</span>
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-on-surface uppercase font-['Space_Grotesk'] truncate">
                {orgData?.name || 'GET APNA DRIVER CORPORATE'}
              </span>
              <span className="text-[10px] text-primary font-medium tracking-wider uppercase">
                {orgData?.role ? `${orgData.role} PORTAL` : 'BUSINESS ACCOUNTS'}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {orgData && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container border border-border text-xs">
              <span className="text-on-surface-variant">Credit Line:</span>
              <span className="font-mono text-primary font-bold">
                ₹{orgData.creditLimit.toLocaleString()}
              </span>
            </div>
          )}

          <ThemeToggle />
          <LanguageSelector />
          <NotificationCenter />

          <Link href="/profile" className="flex items-center gap-2 pl-1">
            <div className="text-right hidden md:block">
              <div className="text-xs text-on-surface font-semibold leading-tight max-w-[140px] truncate">
                {userEmail ?? 'Corporate User'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-xs font-['Space_Grotesk']">
              {(userEmail ?? 'C').charAt(0).toUpperCase()}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-300 transition-colors"
            title="Log Out"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-10 w-52 bg-surface-container-lowest z-40 overflow-y-auto px-2 py-3 flex-col justify-between border-r border-border">
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold uppercase text-on-surface-variant tracking-wider font-['Space_Grotesk']">
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border">
          <Link
            href="/customer/dashboard"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span className="truncate">Return to Consumer App</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="md:pl-52">
        <main className="w-full pt-16 pb-8 px-3 sm:px-4 min-h-screen bg-background">{children}</main>
      </div>

      {/* FOOTER BAR */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-surface-container-lowest z-50 flex items-center justify-between px-3 sm:px-6 border-t border-border gap-2">
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-primary shrink-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>CORPORATE ACCOUNT VERIFIED</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant ml-auto">
          <span>Enterprise Support: </span>
          <strong className="text-primary">corporate@getapnadriver.com</strong>
        </div>
      </footer>
    </div>
  );
}

