'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CorporateLayout } from '@/components/corporate-layout';
import { EmptyState } from '@/components/ui/empty-state';

interface DashboardReport {
  totalSpend: number;
  completedRidesCount: number;
  totalMembersCount: number;
  activePoliciesCount: number;
  recentRides: Array<{
    id: string;
    bookerName: string;
    pickupAddress: string;
    fareAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export default function CorporateDashboardPage() {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/corporate/reports');
        if (!res.ok) {
          throw new Error('Failed to load corporate dashboard data');
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading dashboard');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  return (
    <CorporateLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER & QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
              BUSINESS OVERVIEW
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Corporate Travel Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
              Manage enterprise mobility, employee driver-service bookings, policy compliance, and
              billing statements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/corporate/bookings/new"
              className="px-4 py-2.5 bg-gradient-to-r from-[#25a475] to-[#68dba9] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#25a475]/20 transition-all"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Book Corporate Driver</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-on-surface-variant text-sm font-mono animate-pulse">
            Loading corporate travel metrics...
          </div>
        ) : (
          report && (
            <>
              {/* METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Total Travel Spend
                    </span>
                    <span className="material-symbols-outlined text-primary">payments</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-primary font-['Space_Grotesk']">
                    ₹{report.totalSpend.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Billed to corporate account
                  </p>
                </div>

                <div className="bg-surface-container border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Bookings Completed
                    </span>
                    <span className="material-symbols-outlined text-primary">local_taxi</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-['Space_Grotesk']">
                    {report.completedRidesCount}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-mono">Employee business bookings</p>
                </div>

                <div className="bg-surface-container border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Enrolled Employees
                    </span>
                    <span className="material-symbols-outlined text-primary">groups</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-['Space_Grotesk']">
                    {report.totalMembersCount}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Active organization members
                  </p>
                </div>

                <div className="bg-surface-container border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Active Policies
                    </span>
                    <span className="material-symbols-outlined text-primary">policy</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-['Space_Grotesk']">
                    {report.activePoliciesCount}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Fare & distance governance rules
                  </p>
                </div>
              </div>

              {/* QUICK NAV PANELS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/corporate/members"
                  className="p-5 bg-surface-container hover:bg-surface-container-high border border-border hover:border-primary/40 rounded-2xl transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      group_add
                    </span>
                    <span className="material-symbols-outlined text-lg text-on-surface-variant group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mt-3">
                    Employee Onboarding
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Invite team members, assign departments & cost centers.
                  </p>
                </Link>

                <Link
                  href="/corporate/approvals"
                  className="p-5 bg-surface-container hover:bg-surface-container-high border border-border hover:border-primary/40 rounded-2xl transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      verified
                    </span>
                    <span className="material-symbols-outlined text-lg text-on-surface-variant group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mt-3">
                    Approval Workflow
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Review out-of-policy travel requests and fare exception overrides.
                  </p>
                </Link>

                <Link
                  href="/corporate/reports"
                  className="p-5 bg-surface-container hover:bg-surface-container-high border border-border hover:border-primary/40 rounded-2xl transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      analytics
                    </span>
                    <span className="material-symbols-outlined text-lg text-on-surface-variant group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mt-3">
                    Spend Analytics
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Export department travel breakdowns and monthly GST statements.
                  </p>
                </Link>
              </div>

              {/* RECENT RECENT RIDES TABLE */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
                    Recent Corporate Bookings
                  </h2>
                  <Link
                    href="/corporate/bookings"
                    className="text-xs text-primary font-mono hover:underline"
                  >
                    View All Bookings →
                  </Link>
                </div>

                <div className="bg-surface-container border border-border rounded-2xl overflow-hidden shadow-sm">
                  {report.recentRides.length === 0 ? (
                    <EmptyState
                      icon="local_taxi"
                      message={
                        'No corporate bookings recorded yet. Click "Book Corporate Driver" to schedule the first booking.'
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-surface-container-high/60 text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
                            <th className="p-3.5">Employee</th>
                            <th className="p-3.5">Pickup Location</th>
                            <th className="p-3.5">Fare</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs font-mono">
                          {report.recentRides.map((ride) => (
                            <tr key={ride.id} className="hover:bg-surface-container-high/50 transition-colors">
                              <td className="p-3.5 font-bold text-on-surface">{ride.bookerName}</td>
                              <td className="p-3.5 text-on-surface-variant max-w-xs truncate">
                                {ride.pickupAddress}
                              </td>
                              <td className="p-3.5 font-bold text-primary">
                                ₹{ride.fareAmount.toLocaleString()}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded bg-surface-container-high border border-border text-[10px] uppercase font-bold text-on-surface">
                                  {ride.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-on-surface-variant">
                                {new Date(ride.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </CorporateLayout>
  );
}
