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
        <div className="p-3 rounded-lg border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-xs">
          {error}
        </div>
      )}

      {/* 1. Shift & Duty Summary Bar */}
      <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              shiftSummary.isOnDuty ? 'bg-[#68dba9] shadow-[0_0_8px_#68dba9]' : 'bg-[#87948b]'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Shift Status: {shiftSummary.availabilityStatus}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#262a33] text-[#68dba9]">
                {shiftSummary.isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
              </span>
            </div>
            <p className="text-xs text-[#87948b]">
              Today: {shiftSummary.todaysTripsCompleted} Trips Completed • Shift Duration:{' '}
              {shiftSummary.activeShiftDurationMinutes} mins
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-[#68dba9]"
        >
          🚨 Report Driver Issue
        </button>
      </div>

      {/* 2. Earnings & Settlement Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
          <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
            Today Net Payout
          </span>
          <div className="text-2xl font-extrabold text-[#68dba9] font-['Space_Grotesk']">
            ₹{earningsBreakdown.todayNetEarnings}
          </div>
          <p className="text-[11px] text-[#87948b]">
            {earningsBreakdown.completedTripsToday} trips completed today
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
          <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
            Lifetime Earnings
          </span>
          <div className="text-xl font-bold text-[#dfe2ee]">
            ₹{earningsBreakdown.lifetimeEarnings}
          </div>
          <p className="text-[11px] text-[#87948b]">Total earned since joining</p>
        </div>

        <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
              Settlement Status
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                earningsBreakdown.settlementCycleStatus === 'SETTLED'
                  ? 'bg-[#68dba9]/20 text-[#68dba9]'
                  : 'bg-[#ffb4ab]/20 text-[#ffb4ab]'
              }`}
            >
              {earningsBreakdown.settlementCycleStatus}
            </span>
          </div>
          <div className="text-xl font-bold text-[#dfe2ee]">
            ₹{earningsBreakdown.pendingSettlementAmount}
          </div>
          <p className="text-[11px] text-[#87948b]">
            Cycle: {earningsBreakdown.settlementCycleRange}
          </p>
        </div>
      </div>

      {/* 3. Performance Scorecard */}
      <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4">
        <h3 className="text-xs font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
          ⭐ Performance & Reliability Scorecard
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-lg bg-[#11141c] border border-[#262a33]">
            <span className="text-xs text-[#87948b]">Rating</span>
            <div className="text-lg font-bold text-[#dfe2ee]">
              {performanceInsights.averageRating}★
            </div>
            <span className="text-[10px] text-[#87948b]">
              ({performanceInsights.totalReviews} Reviews)
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#11141c] border border-[#262a33]">
            <span className="text-xs text-[#87948b]">Acceptance Rate</span>
            <div className="text-lg font-bold text-[#68dba9]">
              {performanceInsights.acceptanceRatePercentage}%
            </div>
            <span className="text-[10px] text-[#87948b]">Target &gt;90%</span>
          </div>

          <div className="p-3 rounded-lg bg-[#11141c] border border-[#262a33]">
            <span className="text-xs text-[#87948b]">Completion Rate</span>
            <div className="text-lg font-bold text-[#dfe2ee]">
              {performanceInsights.completionRatePercentage}%
            </div>
            <span className="text-[10px] text-[#87948b]">Target &gt;95%</span>
          </div>

          <div className="p-3 rounded-lg bg-[#11141c] border border-[#262a33]">
            <span className="text-xs text-[#87948b]">Reliability Score</span>
            <div className="text-lg font-bold text-[#68dba9]">
              {performanceInsights.reliabilityScore}/100
            </div>
            <span className="text-[10px] text-[#87948b]">High Tier</span>
          </div>
        </div>

        {/* Actionable Tips */}
        {performanceInsights.actionableTips.length > 0 && (
          <div className="p-3 rounded-lg bg-[#11141c] border border-[#262a33] space-y-2">
            <span className="text-[11px] font-bold text-[#68dba9] uppercase">
              💡 Personalized Actionable Insights
            </span>
            <ul className="space-y-1 text-xs text-[#dfe2ee] list-disc list-inside">
              {performanceInsights.actionableTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4. Driver Issue Reporting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Report Driver Issue / Feedback
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#87948b] hover:text-[#dfe2ee] text-sm"
              >
                ✕
              </button>
            </div>

            {issueSuccessMsg && (
              <div className="p-3 rounded-lg border border-[#68dba9] bg-[#68dba9]/20 text-[#68dba9] text-xs">
                {issueSuccessMsg}
              </div>
            )}

            <form onSubmit={handleReportIssueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#87948b] mb-1">Issue Category</label>
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
                  className="w-full px-3 py-2 bg-[#0a0e16] border border-[#262a33] rounded text-[#dfe2ee]"
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
                <label className="block text-[#87948b] mb-1">Description (Min 10 characters)</label>
                <textarea
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe what went wrong or feedback for the support team..."
                  required
                  className="w-full px-3 py-2 bg-[#0a0e16] border border-[#262a33] rounded text-[#dfe2ee] placeholder:text-[#87948b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-[#262a33] text-[#87948b] hover:text-[#dfe2ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue || issueDescription.length < 10}
                  className="px-4 py-2 rounded bg-[#68dba9] hover:bg-[#52c995] text-[#0a0e16] font-bold disabled:opacity-50"
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
