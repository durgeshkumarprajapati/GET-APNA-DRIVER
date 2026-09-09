'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface DashboardMetrics {
  bookings: {
    active: number;
    completedToday: number;
    cancelledToday: number;
  };
  drivers: {
    totalApproved: number;
    onlineNow: number;
    pendingApplications: number;
    pendingDocumentVerifications: number;
  };
  finance: {
    capturedTodayAmount: string;
    capturedTodayCount: number;
    commissionTodayAmount: string;
    pendingSettlementsAmount: string;
    pendingSettlementsCount: number;
  };
  generatedAt: string;
}

function formatCurrency(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: string;
  href?: string;
}

function KpiCard({ label, value, subtext, icon, href }: KpiCardProps) {
  const content = (
    <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm h-full">
      <div className="flex items-center justify-between text-[#bccac0]">
        <span className="text-[11px] font-mono uppercase tracking-wider">{label}</span>
        <span className="material-symbols-outlined text-sm text-[#68dba9]">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee]">{value}</span>
      </div>
      {subtext && <span className="text-[10px] font-mono text-[#bccac0]">{subtext}</span>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}

export default function MissionDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard metrics.');
        const data = await res.json();
        if (isMounted) setMetrics(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181c24] p-5 rounded-2xl border border-[#262a33] shadow-md">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee] tracking-tight">
              Mission Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
              Real-time marketplace, fleet, and financial operations summary.
            </p>
          </div>
          {metrics && (
            <span className="text-[10px] font-mono text-[#87948b]">
              Last updated {new Date(metrics.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading && !metrics ? (
          <div className="py-16 text-center text-[#87948b] text-sm">Loading metrics…</div>
        ) : metrics ? (
          <>
            <div>
              <h2 className="text-xs font-bold text-[#87948b] uppercase tracking-wider mb-3 font-['Space_Grotesk']">
                Booking Operations
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KpiCard
                  label="Active Bookings"
                  value={String(metrics.bookings.active)}
                  subtext="Searching through trip-in-progress"
                  icon="alt_route"
                  href="/admin/live-bookings"
                />
                <KpiCard
                  label="Completed Today"
                  value={String(metrics.bookings.completedToday)}
                  icon="task_alt"
                />
                <KpiCard
                  label="Cancelled Today"
                  value={String(metrics.bookings.cancelledToday)}
                  icon="cancel"
                />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-[#87948b] uppercase tracking-wider mb-3 font-['Space_Grotesk']">
                Fleet
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Approved Drivers"
                  value={String(metrics.drivers.totalApproved)}
                  icon="badge"
                  href="/admin/drivers"
                />
                <KpiCard
                  label="Online Now"
                  value={String(metrics.drivers.onlineNow)}
                  subtext="Available or on a trip"
                  icon="wifi"
                />
                <KpiCard
                  label="Pending Applications"
                  value={String(metrics.drivers.pendingApplications)}
                  icon="pending_actions"
                  href="/admin/drivers?approvalStatus=PENDING"
                />
                <KpiCard
                  label="Docs Awaiting Review"
                  value={String(metrics.drivers.pendingDocumentVerifications)}
                  icon="verified_user"
                  href="/admin/verification-queue"
                />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-[#87948b] uppercase tracking-wider mb-3 font-['Space_Grotesk']">
                Finance
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Captured Today"
                  value={formatCurrency(metrics.finance.capturedTodayAmount)}
                  subtext={`${metrics.finance.capturedTodayCount} payments`}
                  icon="payments"
                  href="/admin/payments"
                />
                <KpiCard
                  label="Commission Today"
                  value={formatCurrency(metrics.finance.commissionTodayAmount)}
                  icon="percent"
                  href="/admin/finance/transactions"
                />
                <KpiCard
                  label="Pending Settlements"
                  value={formatCurrency(metrics.finance.pendingSettlementsAmount)}
                  subtext={`${metrics.finance.pendingSettlementsCount} settlements`}
                  icon="account_balance"
                  href="/admin/settlements"
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
