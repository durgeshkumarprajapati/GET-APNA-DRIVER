'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { FinanceAmount } from '@/components/ui/finance-amount';
import { SettlementStatusBadge } from '@/components/ui/transaction-status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime } from '@/shared/formatting/date';

interface Settlement {
  id: string;
  driverProfileId: string;
  amount: string;
  amountPaid: string | null;
  status: string;
  payoutProvider: string | null;
  payoutReference: string | null;
  failureReason: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-container-high last:border-0">
      <span className="text-xs text-outline">{label}</span>
      <span className="text-sm text-on-surface font-mono">{value}</span>
    </div>
  );
}

export default function AdminSettlementDetailPage() {
  const params = useParams<{ settlementId: string }>();
  const router = useRouter();
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/settlements/${params.settlementId}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setSettlement(data.settlement);
          setAuditTrail(data.auditTrail ?? []);
          setError(null);
        } else {
          setError('Settlement not found.');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load settlement.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [params.settlementId]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader
        eyebrow="Finance"
        title="Settlement Detail"
        subtitle={params.settlementId}
        actions={
          <button
            type="button"
            onClick={() => router.push('/admin/settlements')}
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-border text-xs font-bold text-on-surface transition-colors"
          >
            ← Back to Settlements
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading settlement…" />
      ) : (
        settlement && (
          <>
            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high">
              <div className="flex items-center justify-between mb-4">
                <FinanceAmount value={settlement.amount} className="text-2xl font-bold" />
                <SettlementStatusBadge status={settlement.status} />
              </div>
              <DetailRow label="Driver Profile" value={settlement.driverProfileId} />
              <DetailRow
                label="Amount Paid"
                value={
                  settlement.amountPaid ? <FinanceAmount value={settlement.amountPaid} /> : '—'
                }
              />
              <DetailRow label="Payout Provider" value={settlement.payoutProvider ?? '—'} />
              <DetailRow label="Payout Reference" value={settlement.payoutReference ?? '—'} />
              {settlement.failureReason && (
                <DetailRow
                  label="Failure Reason"
                  value={<span className="text-error">{settlement.failureReason}</span>}
                />
              )}
              <DetailRow label="Created" value={formatDateTime(settlement.createdAt)} />
              <DetailRow
                label="Initiated"
                value={settlement.initiatedAt ? formatDateTime(settlement.initiatedAt) : '—'}
              />
              <DetailRow
                label="Completed"
                value={settlement.completedAt ? formatDateTime(settlement.completedAt) : '—'}
              />
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
                Audit Trail
              </h2>
              {auditTrail.length === 0 ? (
                <EmptyState icon="history_edu" message="No audited actions recorded yet." />
              ) : (
                <div className="space-y-2">
                  {auditTrail.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg bg-surface-container-low border border-surface-container-high flex items-center justify-between"
                    >
                      <span className="text-xs font-mono text-on-surface">{entry.action}</span>
                      <span className="text-xs font-mono text-outline">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
