'use client';

import { useEffect, useState } from 'react';
import { LoadingState } from '../ui/loading-state';

interface InsightsData {
  shiftSummary: {
    isOnDuty: boolean;
    availabilityStatus: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'ON_BREAK';
    activeShiftDurationMinutes: number;
    todaysTripsCompleted: number;
    nextScheduledShift: string;
  };
  earningsBreakdown: {
    todayNetEarnings: string;
    completedTripsToday: number;
    lifetimeEarnings: string;
    pendingSettlementAmount: string;
    settlementCycleStatus: 'PENDING' | 'PROCESSING' | 'SETTLED';
    settlementCycleRange: string;
  };
  performanceInsights: {
    averageRating: number;
    totalReviews: number;
    completionRatePercentage: number;
    cancellationRatePercentage: number;
    acceptanceRatePercentage: number;
    onTimeArrivalPercentage: number;
    reliabilityScore: number;
    actionableTips: string[];
  };
}

export function DriverPerformanceInsightsWidget() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Issue Reporting Modal State
  const [showModal, setShowModal] = useState(false);
  const [issueCategory, setIssueCategory] = useState<
    | 'FARE_DISPUTE'
    | 'CUSTOMER_NO_SHOW'
    | 'VEHICLE_TROUBLE'
    | 'APP_GLITCH'
    | 'ROUTE_PROBLEM'
    | 'OTHER'
  >('FARE_DISPUTE');
  const [issueDescription, setIssueDescription] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [issueSuccessMsg, setIssueSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/driver/insights')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        if (isMounted && resData.insights) {
          setData(resData.insights);
        }
      })
      .catch(() => {
        if (isMounted) setError('Failed to load driver performance insights.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReportIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIssue(true);
    setIssueSuccessMsg(null);
    setError(null);

    try {
      const res = await fetch('/api/driver/support/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueCategory, description: issueDescription }),
      });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message ?? 'Failed to submit issue report.');
      }

      setIssueSuccessMsg(
        `Issue logged successfully! Ticket ID: #${resData.result.ticketId.slice(0, 8)}`,
      );
      setIssueDescription('');
      setTimeout(() => setShowModal(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue report.');
    } finally {
      setSubmittingIssue(false);
    }
  };

  if (loading) return <LoadingState message="Loading driver performance & shift insights…" />;

  // A fetch failure previously fell straight through to `if (!data) return
  // null`, below the error-rendering block — the error message and the
  // only "Report Driver Issue" entry point silently disappeared together.
  if (error && !data) {
    return (
      <div className="p-3 rounded-lg border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-xs">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { shiftSummary, earningsBreakdown, performanceInsights } = data;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* 1. Shift & Duty Summary Bar */}
      <div className="p-4 rounded-xl bg-surface-container border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              shiftSummary.isOnDuty ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-on-surface-variant/40'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
                Shift Status: {shiftSummary.availabilityStatus}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {shiftSummary.isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Today: {shiftSummary.todaysTripsCompleted} Trips Completed • Shift Duration:{' '}
              {shiftSummary.activeShiftDurationMinutes} mins
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-on-surface transition-colors flex items-center justify-center gap-2 border border-border focus-visible:outline-2 focus-visible:outline-primary"
        >
          🚨 Report Driver Issue
        </button>
      </div>

      {/* 2. Earnings & Settlement Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-container border border-border space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk']">
            Today Net Payout
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
            ₹{earningsBreakdown.todayNetEarnings}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            {earningsBreakdown.completedTripsToday} trips completed today
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container border border-border space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk']">
            Lifetime Earnings
          </span>
          <div className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
            ₹{earningsBreakdown.lifetimeEarnings}
          </div>
          <p className="text-[11px] text-on-surface-variant">Total earned since joining</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container border border-border space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk']">
              Settlement Status
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                earningsBreakdown.settlementCycleStatus === 'SETTLED'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              {earningsBreakdown.settlementCycleStatus}
            </span>
          </div>
          <div className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
            ₹{earningsBreakdown.pendingSettlementAmount}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Cycle: {earningsBreakdown.settlementCycleRange}
          </p>
        </div>
      </div>

      {/* 3. Performance Scorecard */}
      <div className="p-6 rounded-xl bg-surface-container border border-border space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-['Space_Grotesk'] flex items-center gap-1.5">
          <span>⭐</span> Performance & Reliability Scorecard
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-lg bg-surface-container-high border border-border">
            <span className="text-xs text-on-surface-variant">Rating</span>
            <div className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
              {performanceInsights.averageRating}★
            </div>
            <span className="text-[10px] text-on-surface-variant">
              ({performanceInsights.totalReviews} Reviews)
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-high border border-border">
            <span className="text-xs text-on-surface-variant">Acceptance Rate</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
              {performanceInsights.acceptanceRatePercentage}%
            </div>
            <span className="text-[10px] text-on-surface-variant">Target &gt;90%</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-high border border-border">
            <span className="text-xs text-on-surface-variant">Completion Rate</span>
            <div className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
              {performanceInsights.completionRatePercentage}%
            </div>
            <span className="text-[10px] text-on-surface-variant">Target &gt;95%</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-high border border-border">
            <span className="text-xs text-on-surface-variant">Reliability Score</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
              {performanceInsights.reliabilityScore}/100
            </div>
            <span className="text-[10px] text-on-surface-variant">High Tier</span>
          </div>
        </div>

        {/* Actionable Tips */}
        {performanceInsights.actionableTips.length > 0 && (
          <div className="p-3.5 rounded-lg bg-surface-container-high border border-border space-y-2">
            <span className="text-[11px] font-bold text-primary uppercase font-mono flex items-center gap-1">
              💡 Personalized Actionable Insights
            </span>
            <ul className="space-y-1 text-xs text-on-surface list-disc list-inside">
              {performanceInsights.actionableTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4. Driver Issue Reporting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-xl bg-surface-container border border-border space-y-4 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
                Report Driver Issue / Feedback
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-sm"
              >
                ✕
              </button>
            </div>

            {issueSuccessMsg && (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {issueSuccessMsg}
              </div>
            )}

            <form onSubmit={handleReportIssueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-mono">Issue Category</label>
                <select
                  value={issueCategory}
                  onChange={(e) =>
                    setIssueCategory(
                      e.target.value as
                        | 'FARE_DISPUTE'
                        | 'CUSTOMER_NO_SHOW'
                        | 'VEHICLE_TROUBLE'
                        | 'APP_GLITCH'
                        | 'ROUTE_PROBLEM'
                        | 'OTHER',
                    )
                  }
                  className="w-full px-3 py-2 bg-surface-container-high border border-border rounded text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="FARE_DISPUTE">Fare / Commission Dispute</option>
                  <option value="CUSTOMER_NO_SHOW">Customer No-Show / Delay</option>
                  <option value="VEHICLE_TROUBLE">Vehicle / Capability Issue</option>
                  <option value="APP_GLITCH">App / GPS Navigation Glitch</option>
                  <option value="ROUTE_PROBLEM">Route / Toll Dispute</option>
                  <option value="OTHER">Other Operational Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-mono">Description (Min 10 characters)</label>
                <textarea
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe what went wrong or feedback for the support team..."
                  required
                  className="w-full px-3 py-2 bg-surface-container-high border border-border rounded text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue || issueDescription.length < 10}
                  className="px-4 py-2 rounded bg-primary hover:opacity-90 active:opacity-80 text-on-primary font-bold disabled:opacity-50 transition-colors"
                >
                  {submittingIssue ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
