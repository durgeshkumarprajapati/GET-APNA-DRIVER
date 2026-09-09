'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { RatingSummary } from '@/components/ui/rating-summary';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency } from '@/shared/formatting/money';

interface PerformanceMetrics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  completedTrips: number;
  cancelledAssignedTrips: number;
  completionRate: string;
  cancellationRate: string;
  averageTripValue: string;
  totalEarnings: string;
}

function formatRate(value: string): string {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export default function DriverPerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/performance');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.performance);
        } else {
          setError('Failed to load performance metrics.');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load performance metrics.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="Chauffeur Performance"
          title="Performance Metrics"
          subtitle="Your quality score, trip completion, and earnings — computed from your real trip history."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading performance metrics…" />
        ) : (
          metrics && (
            <>
              <RatingSummary
                averageRating={metrics.averageRating}
                totalReviews={metrics.totalReviews}
                distribution={metrics.ratingDistribution}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Completed Trips" value={metrics.completedTrips} />
                <MetricCard
                  label="Completion Rate"
                  value={formatRate(metrics.completionRate)}
                  accent="positive"
                />
                <MetricCard
                  label="Cancellation Rate"
                  value={formatRate(metrics.cancellationRate)}
                  accent={Number(metrics.cancellationRate) > 0.1 ? 'negative' : 'default'}
                />
                <MetricCard
                  label="Average Trip Value"
                  value={formatCurrency(metrics.averageTripValue)}
                />
                <MetricCard
                  label="Total Earnings"
                  value={formatCurrency(metrics.totalEarnings)}
                  accent="positive"
                />
                <MetricCard
                  label="Cancelled (Assigned) Trips"
                  value={metrics.cancelledAssignedTrips}
                />
              </div>
            </>
          )
        )}
      </div>
    </DriverLayout>
  );
}
