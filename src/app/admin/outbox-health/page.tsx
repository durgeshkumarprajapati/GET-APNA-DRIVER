'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDateTime } from '@/shared/formatting/date';

interface OutboxStats {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  oldestPendingAgeSeconds: number | null;
  oldestProcessingAgeSeconds: number | null;
}

interface DeadLetterEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

function formatAge(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export default function AdminOutboxHealthPage() {
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [deadLetter, setDeadLetter] = useState<DeadLetterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requeuing, setRequeuing] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/outbox/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDeadLetter(data.deadLetter.events ?? []);
      } else {
        setError('Failed to load outbox health.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outbox health.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRequeue = async (eventId: string) => {
    setRequeuing(eventId);
    try {
      const res = await fetch(`/api/admin/outbox/dead-letter/${eventId}/requeue`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Requeue failed.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Requeue failed.');
    } finally {
      setRequeuing(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Reliability"
          title="Outbox Health"
          subtitle="Live status of the transactional outbox — pending, in-flight, and dead-lettered events."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading outbox health…" />
        ) : (
          stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Pending" value={stats.pending} />
                <MetricCard label="Processing" value={stats.processing} />
                <MetricCard
                  label="Failed (Dead-Letter)"
                  value={stats.failed}
                  accent={stats.failed > 0 ? 'negative' : 'default'}
                />
                <MetricCard label="Processed" value={stats.processed} accent="positive" />
                <MetricCard
                  label="Oldest Pending Age"
                  value={formatAge(stats.oldestPendingAgeSeconds)}
                  accent={
                    stats.oldestPendingAgeSeconds !== null && stats.oldestPendingAgeSeconds > 300
                      ? 'negative'
                      : 'default'
                  }
                  hint="Flags a stuck worker if this stays high"
                />
                <MetricCard
                  label="Oldest Processing Age"
                  value={formatAge(stats.oldestProcessingAgeSeconds)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Dead-Letter Queue
                </h2>
                {deadLetter.length === 0 ? (
                  <EmptyState icon="check_circle" message="No dead-lettered events." />
                ) : (
                  <div className="flex flex-col gap-2">
                    {deadLetter.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-4 flex-wrap"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#dfe2ee]">
                              {event.eventType}
                            </span>
                            <span className="text-[10px] font-mono text-[#87948b]">
                              {event.attempts} attempts
                            </span>
                          </div>
                          <p className="text-xs text-[#ffb4ab] truncate">
                            {event.lastError ?? 'No error recorded'}
                          </p>
                          <span className="text-[10px] font-mono text-[#87948b]">
                            {event.aggregateType}:{event.aggregateId} •{' '}
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={requeuing === event.id}
                          onClick={() => void handleRequeue(event.id)}
                          className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] disabled:opacity-50 transition-colors shrink-0"
                        >
                          {requeuing === event.id ? 'Requeuing…' : 'Requeue'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </AdminLayout>
  );
}
