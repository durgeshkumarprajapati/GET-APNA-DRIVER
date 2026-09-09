'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { RatingSummary } from '@/components/ui/rating-summary';
import { RatingStars } from '@/components/ui/rating-stars';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDate } from '@/shared/formatting/date';

interface DriverReview {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  customer: { email: string | null; phoneNumber: string | null };
}

interface PerformanceSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  PUBLISHED: 'success',
  FLAGGED: 'warning',
  HIDDEN: 'neutral',
  REJECTED: 'danger',
};

export default function DriverRatingsPage() {
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [performanceRes, reviewsRes] = await Promise.all([
          fetch('/api/driver/performance'),
          fetch(`/api/driver/reviews?page=${page}&pageSize=${pageSize}`),
        ]);
        if (!isMounted) return;
        if (performanceRes.ok) {
          const data = await performanceRes.json();
          setPerformance(data.performance);
        }
        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviews(data.reviews ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load reviews.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="Client Testimonials & Audits"
          title="Ratings & Reviews"
          subtitle="Verified feedback from your completed trips."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading reviews…" />
        ) : (
          <>
            {performance && (
              <RatingSummary
                averageRating={performance.averageRating}
                totalReviews={performance.totalReviews}
                distribution={performance.ratingDistribution}
              />
            )}

            {reviews.length === 0 ? (
              <EmptyState icon="reviews" message="No reviews yet." />
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <RatingStars value={review.rating} size="sm" />
                        <span className="text-xs text-[#87948b]">
                          {review.customer.email ?? review.customer.phoneNumber ?? 'Customer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          label={review.status}
                          tone={STATUS_TONE[review.status] ?? 'neutral'}
                        />
                        <span className="font-mono text-[10px] text-[#87948b]">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-[#bccac0] italic">&quot;{review.comment}&quot;</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </DriverLayout>
  );
}
