'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { RatingStars } from '@/components/ui/rating-stars';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime } from '@/shared/formatting/date';

interface AdminReviewDetail {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  customer: { email: string | null; phoneNumber: string | null };
  driver: { id: string; name: string };
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  PUBLISHED: 'success',
  FLAGGED: 'warning',
  HIDDEN: 'neutral',
  REJECTED: 'danger',
};

const MODERATION_ACTIONS = [
  { targetStatus: 'FLAGGED', label: 'Flag', tone: 'warning' as StatusBadgeTone },
  { targetStatus: 'HIDDEN', label: 'Hide', tone: 'neutral' as StatusBadgeTone },
  { targetStatus: 'REJECTED', label: 'Reject', tone: 'danger' as StatusBadgeTone },
  { targetStatus: 'PUBLISHED', label: 'Restore to Published', tone: 'success' as StatusBadgeTone },
];

export default function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = use(params);
  const [review, setReview] = useState<AdminReviewDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [reviewRes, auditRes] = await Promise.all([
        fetch(`/api/admin/reviews/${reviewId}`),
        fetch(`/api/admin/audit-logs?entityType=Review&entityId=${reviewId}`),
      ]);
      if (reviewRes.ok) {
        const data = await reviewRes.json();
        setReview(data.review);
      } else {
        setError('Review not found.');
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.entries ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const handleModerate = async (targetStatus: string) => {
    if (!reason.trim()) {
      setError('A moderation reason is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Moderation action failed.');
      }
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        eyebrow="Trust & Safety"
        title="Review Detail"
        subtitle={reviewId}
        actions={
          <Link
            href="/admin/reviews"
            className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface hover:bg-surface-container-high transition-colors"
          >
            ← Back to Reviews
          </Link>
        }
      />

      {error && (
        <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading review…" />
      ) : (
        review && (
          <>
            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <RatingStars value={review.rating} size="lg" />
                  <StatusBadge
                    label={review.status}
                    tone={STATUS_TONE[review.status] ?? 'neutral'}
                  />
                </div>
                <span className="font-mono text-xs text-outline">
                  {formatDateTime(review.createdAt)}
                </span>
              </div>
              <p className="text-sm text-on-surface italic">
                {review.comment ?? <span className="text-outline">No comment provided.</span>}
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-surface-container-high">
                <div>
                  <span className="block text-[10px] uppercase text-outline font-bold">Driver</span>
                  <Link
                    href={`/admin/drivers/${review.driver.id}`}
                    className="text-primary hover:underline"
                  >
                    {review.driver.name}
                  </Link>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-outline font-bold">
                    Customer
                  </span>
                  <span className="text-on-surface">
                    {review.customer.email ?? review.customer.phoneNumber ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-outline font-bold">
                    Booking
                  </span>
                  <Link
                    href={`/admin/live-bookings/${review.bookingId}`}
                    className="text-primary hover:underline font-mono text-[10px]"
                  >
                    {review.bookingId}
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
              <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
                Moderation Action
              </h2>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for this moderation action (required)…"
                className="w-full h-20 px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-2">
                {MODERATION_ACTIONS.filter((action) => action.targetStatus !== review.status).map(
                  (action) => (
                    <button
                      key={action.targetStatus}
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleModerate(action.targetStatus)}
                      className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-border text-xs font-bold text-on-surface disabled:opacity-50 transition-colors"
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
              <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
                Audit History
              </h2>
              {auditLogs.length === 0 ? (
                <EmptyState icon="history" message="No audit entries yet." />
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {auditLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high flex items-center justify-between"
                    >
                      <span className="text-on-surface">{entry.action}</span>
                      <span className="text-outline">{formatDateTime(entry.createdAt)}</span>
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
