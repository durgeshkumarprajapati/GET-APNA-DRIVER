'use client';

import { useEffect, useState } from 'react';
import { CorporateLayout } from '@/components/corporate-layout';

interface ApprovalRequest {
  id: string;
  status: string;
  reason: string | null;
  policyViolations: Array<{ rule: string; message: string }> | null;
  bookingParameters: Record<string, unknown>;
  requestedAt: string;
  requesterUser: { fullName: string; email: string };
  approverUser?: { fullName: string; email: string } | null;
}

export default function CorporateApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadApprovals() {
      try {
        const res = await fetch('/api/corporate/approvals');
        if (!res.ok) {
          throw new Error('Failed to load corporate approvals');
        }
        const data = await res.json();
        if (!ignore) {
          setApprovals(data.approvals || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading approvals');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void loadApprovals();
    return () => {
      ignore = true;
    };
  }, []);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionId(id);
      setError(null);
      const res = await fetch(`/api/corporate/approvals/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewComment:
            status === 'APPROVED' ? 'Approved by Corporate Travel Manager' : 'Rejected per policy',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to review approval request');
      }

      const updatedRes = await fetch('/api/corporate/approvals');
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        setApprovals(data.approvals || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing review');
    } finally {
      setActionId(null);
    }
  };

  return (
    <CorporateLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            GOVERNANCE QUEUE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Approval Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
            Review out-of-policy corporate travel requests, fare threshold exceptions, and Manager
            approvals.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading approval queue...
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.length === 0 ? (
              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-12 text-center text-[#bccac0] text-xs font-mono">
                No corporate approval requests currently pending.
              </div>
            ) : (
              approvals.map((req) => {
                const isPending = req.status === 'PENDING';
                const violations = req.policyViolations || [];
                const fare = String(req.bookingParameters.estimatedFare || '0');
                const cat = String(req.bookingParameters.vehicleCategory || 'SEDAN');

                return (
                  <div
                    key={req.id}
                    className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262a33] pb-3">
                      <div>
                        <span className="text-xs font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                          Requester: {req.requesterUser.fullName} ({req.requesterUser.email})
                        </span>
                        <div className="text-[11px] text-[#87948b] font-mono mt-0.5">
                          Requested: {new Date(req.requestedAt).toLocaleString()}
                        </div>
                      </div>

                      <span
                        className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
                              : 'bg-amber-950/60 border border-amber-500/50 text-amber-300 animate-pulse'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[#bccac0] uppercase block">
                          Trip Parameters
                        </span>
                        <div className="text-[#dfe2ee] mt-1 space-y-1">
                          <p>Estimated Fare: ₹{fare}</p>
                          <p>Category: {cat}</p>
                          <p>Purpose: {req.reason || 'Corporate Travel'}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#bccac0] uppercase block">
                          Policy Evaluation Violations
                        </span>
                        {violations.length === 0 ? (
                          <span className="text-emerald-400 mt-1 block">
                            Requires manual manager sign-off
                          </span>
                        ) : (
                          <div className="space-y-1 mt-1">
                            {violations.map((v, i) => (
                              <div
                                key={i}
                                className="text-rose-300 bg-rose-950/40 border border-rose-500/30 p-1.5 rounded text-[11px]"
                              >
                                ⚠️ {v.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="pt-2 flex justify-end gap-3 border-t border-[#262a33]">
                        <button
                          type="button"
                          disabled={actionId === req.id}
                          onClick={() => void handleReview(req.id, 'REJECTED')}
                          className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold"
                        >
                          Reject Request
                        </button>
                        <button
                          type="button"
                          disabled={actionId === req.id}
                          onClick={() => void handleReview(req.id, 'APPROVED')}
                          className="px-5 py-2 bg-[#25a475] hover:bg-[#208e65] text-[#00311f] rounded-xl text-xs font-bold shadow-lg shadow-[#25a475]/20"
                        >
                          Approve Request
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </CorporateLayout>
  );
}
