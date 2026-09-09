'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency } from '@/shared/formatting/money';

interface SettlementBucket {
  count: number;
  amount: string;
}

interface TreasuryMetrics {
  capturedPaymentsTotal: string;
  capturedPaymentsCount: number;
  platformRevenueTotal: string;
  driverPayableAvailable: string;
  driverPayableReserved: string;
  settlements: {
    pending: SettlementBucket;
    processing: SettlementBucket;
    paid: SettlementBucket;
    failed: SettlementBucket;
  };
  refundExposure: string;
  generatedAt: string;
}

export default function AdminTreasuryAndSettlementsPage() {
  const [metrics, setMetrics] = useState<TreasuryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/treasury/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setError(null);
      } else {
        setError('Failed to load treasury metrics.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load treasury metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Finance"
          title="Treasury & Settlements"
          subtitle={
            metrics
              ? `Real-time operational metrics as of ${new Date(metrics.generatedAt).toLocaleTimeString()}.`
              : undefined
          }
          actions={
            <>
              <Link
                href="/admin/settlements"
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
              >
                Manage Settlements →
              </Link>
              <Link
                href="/admin/vault"
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
              >
                View Ledger Vault →
              </Link>
            </>
          }
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading treasury metrics…" />
        ) : (
          metrics && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Captured Payments"
                  value={formatCurrency(metrics.capturedPaymentsTotal)}
                  hint={`${metrics.capturedPaymentsCount} payments`}
                />
                <MetricCard
                  label="Platform Revenue (Commission)"
                  value={formatCurrency(metrics.platformRevenueTotal)}
                  accent="positive"
                />
                <MetricCard
                  label="Driver Payable — Available"
                  value={formatCurrency(metrics.driverPayableAvailable)}
                  hint="Not yet reserved into a settlement"
                />
                <MetricCard
                  label="Driver Payable — Reserved"
                  value={formatCurrency(metrics.driverPayableReserved)}
                  hint="Reserved by an active settlement"
                />
                <MetricCard
                  label="Refund Reserve Exposure"
                  value={formatCurrency(metrics.refundExposure)}
                  accent={Number(metrics.refundExposure) > 0 ? 'negative' : 'default'}
                  hint="Pending + processing refunds"
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Settlement Pipeline
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Pending"
                    value={metrics.settlements.pending.count}
                    hint={formatCurrency(metrics.settlements.pending.amount)}
                  />
                  <MetricCard
                    label="Processing"
                    value={metrics.settlements.processing.count}
                    hint={formatCurrency(metrics.settlements.processing.amount)}
                  />
                  <MetricCard
                    label="Paid"
                    value={metrics.settlements.paid.count}
                    hint={formatCurrency(metrics.settlements.paid.amount)}
                    accent="positive"
                  />
                  <MetricCard
                    label="Failed"
                    value={metrics.settlements.failed.count}
                    hint={formatCurrency(metrics.settlements.failed.amount)}
                    accent={metrics.settlements.failed.count > 0 ? 'negative' : 'default'}
                  />
                </div>
              </div>
            </>
          )
        )}
      </div>
    </AdminLayout>
  );
}
