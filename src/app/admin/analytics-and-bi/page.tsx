'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/context';

interface AnalyticsData {
  dateRange: {
    start: string;
    end: string;
    rangeKey: string;
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    active: number;
    completionRate: number;
    cancellationRate: number;
  };
  financial: {
    grossMerchandiseValue: number;
    netPlatformRevenue: number;
    driverPayouts: number;
    totalDiscounts: number;
    takeRate: number;
  };
  drivers: {
    total: number;
    approved: number;
    online: number;
    available: number;
  };
  customers: {
    total: number;
    registeredInRange: number;
  };
  dispatch: {
    totalAttempts: number;
    successfulAssignments: number;
    assignmentSuccessRate: number;
  };
  safety: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  };
  support: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
  };
}

export default function AnalyticsAndBIPage() {
  const { t, formatCurrency, formatNumber, formatDate } = useTranslation();
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/analytics-and-bi?range=${range}`);
        if (!res.ok) {
          throw new Error('Failed to fetch analytics metrics.');
        }
        const json = await res.json();
        if (isMounted) {
          setData(json.metrics);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading analytics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [range]);

  const handleExport = () => {
    if (!data) return;
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute(
      'download',
      `analytics_report_${range}_${new Date().toISOString().split('T')[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
            <span className="material-symbols-outlined text-[16px]">insights</span>
            <span>{t('admin.analytics.eyebrow')}</span>
          </div>
          <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            {t('admin.analytics.title')}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-[#181c24] p-1 rounded-xl border border-[#262a33]">
            {(['today', '7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setRange(r);
                }}
                className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                  range === r
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                {t(`admin.analytics.dateRanges.${r}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !data}
            className="px-3.5 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#208b63] text-[#00311f] font-bold text-xs font-['Space_Grotesk'] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>{t('admin.analytics.exportReport')}</span>
          </button>
        </div>
      </div>

      {/* LOADING & ERROR STATES */}
      {loading && (
        <div className="flex items-center justify-center p-12 bg-[#0a0e16] rounded-xl border border-[#262a33]">
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-[#68dba9] border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-[#bccac0]">
              Loading authoritative telemetry metrics...
            </span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRange((prev) => prev);
            }}
            className="px-3 py-1 bg-red-900/60 rounded text-red-100 font-bold hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && data && (
        <>
          {/* DATE RANGE BAR */}
          <div className="px-4 py-2 bg-[#181c24] rounded-xl border border-[#262a33] text-xs font-mono text-[#bccac0] flex items-center justify-between">
            <span>
              Window: <strong className="text-[#dfe2ee]">{formatDate(data.dateRange.start)}</strong>{' '}
              — <strong className="text-[#dfe2ee]">{formatDate(data.dateRange.end)}</strong>
            </span>
            <span>
              Range: <strong className="text-[#68dba9] uppercase">{data.dateRange.rangeKey}</strong>
            </span>
          </div>

          {/* KEY FINANCIAL CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[11px] font-mono text-[#87948b] uppercase tracking-wider">
                {t('admin.analytics.metrics.gmv')}
              </span>
              <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-2">
                {formatCurrency(data.financial.grossMerchandiseValue)}
              </div>
              <span className="text-[11px] font-mono text-[#bccac0] mt-1">
                Discounts: {formatCurrency(data.financial.totalDiscounts)}
              </span>
            </div>

            <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[11px] font-mono text-[#87948b] uppercase tracking-wider">
                {t('admin.analytics.metrics.netPlatformRevenue')}
              </span>
              <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-2">
                {formatCurrency(data.financial.netPlatformRevenue)}
              </div>
              <span className="text-[11px] font-mono text-[#68dba9] mt-1">
                Take-Rate: {data.financial.takeRate}%
              </span>
            </div>

            <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[11px] font-mono text-[#87948b] uppercase tracking-wider">
                {t('admin.analytics.metrics.driverPayouts')}
              </span>
              <div className="text-2xl font-bold text-[#b4c5ff] font-['Space_Grotesk'] mt-2">
                {formatCurrency(data.financial.driverPayouts)}
              </div>
              <span className="text-[11px] font-mono text-[#bccac0] mt-1">
                Earned by Chauffeurs
              </span>
            </div>

            <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[11px] font-mono text-[#87948b] uppercase tracking-wider">
                {t('admin.analytics.metrics.totalBookings')}
              </span>
              <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-2">
                {formatNumber(data.bookings.total)}
              </div>
              <span className="text-[11px] font-mono text-[#68dba9] mt-1">
                Completed: {formatNumber(data.bookings.completed)} ({data.bookings.completionRate}
                %)
              </span>
            </div>
          </div>

          {/* DETAILED DOMAIN METRICS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BOOKINGS & DISPATCH PERFORMANCE */}
            <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] space-y-4">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">radar</span>
                  Dispatch &amp; Mission Performance
                </h3>
                <span className="text-[11px] font-mono text-[#bccac0]">
                  Active: {data.bookings.active}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Completion Rate</span>
                  <span className="text-lg font-bold text-[#68dba9]">
                    {data.bookings.completionRate}%
                  </span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    {data.bookings.completed} completed trips
                  </span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Cancellation Rate</span>
                  <span className="text-lg font-bold text-[#ffb4ab]">
                    {data.bookings.cancellationRate}%
                  </span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    {data.bookings.cancelled} cancelled trips
                  </span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Dispatch Success Rate</span>
                  <span className="text-lg font-bold text-[#68dba9]">
                    {data.dispatch.assignmentSuccessRate}%
                  </span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    {data.dispatch.successfulAssignments} / {data.dispatch.totalAttempts} offers
                    accepted
                  </span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Active In-Progress</span>
                  <span className="text-lg font-bold text-[#b4c5ff]">{data.bookings.active}</span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    Trips currently active
                  </span>
                </div>
              </div>
            </div>

            {/* FLEET & USER RETENTION */}
            <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] space-y-4">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">groups</span>
                  Chauffeur Fleet &amp; Customer Base
                </h3>
                <span className="text-[11px] font-mono text-[#bccac0]">
                  Registered: {data.customers.total} Users
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Total Chauffeurs</span>
                  <span className="text-lg font-bold text-[#dfe2ee]">{data.drivers.total}</span>
                  <span className="text-[10px] text-[#68dba9] block mt-0.5">
                    {data.drivers.approved} KYC approved
                  </span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Online Fleet</span>
                  <span className="text-lg font-bold text-[#68dba9]">{data.drivers.online}</span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    {data.drivers.available} available idle
                  </span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Safety SOS Incidents</span>
                  <span className="text-lg font-bold text-[#ffb4ab]">
                    {data.safety.totalIncidents}
                  </span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    {data.safety.openIncidents} open incidents
                  </span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <span className="text-[#87948b] block mb-1">Support Tickets</span>
                  <span className="text-lg font-bold text-[#b4c5ff]">
                    {data.support.totalTickets}
                  </span>
                  <span className="text-[10px] text-[#bccac0] block mt-0.5">
                    {data.support.openTickets} pending tickets
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
