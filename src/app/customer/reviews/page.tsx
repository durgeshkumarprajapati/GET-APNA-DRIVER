'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { RatingStars } from '@/components/ui/rating-stars';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDate } from '@/shared/formatting/date';

interface CustomerReview {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
}

interface CustomerReviewsResponse {
  reviews: CustomerReview[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  PUBLISHED: 'success',
  FLAGGED: 'warning',
  HIDDEN: 'neutral',
  REJECTED: 'danger',
};

const PAGE_SIZE = 10;

export default function CustomerReviewHistoryPage() {
  const [data, setData] = useState<CustomerReviewsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/reviews/me?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: CustomerReviewsResponse) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setError('Failed to load your reviews.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Your Feedback"
          title="Review History"
          subtitle="Reviews you've submitted for completed trips."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading your reviews…" />
        ) : !data || data.reviews.length === 0 ? (
          <EmptyState
            icon="reviews"
            message="You haven't reviewed a driver yet. Complete a trip to leave a review."
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {data.reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <RatingStars value={review.rating} size="sm" />
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
                  <Link
                    href={`/bookings/${review.bookingId}`}
                    className="text-[10px] text-[#68dba9] hover:underline"
                  >
                    View booking →
                  </Link>
                </div>
              ))}
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={(nextPage) => {
                setLoading(true);
                setPage(nextPage);
              }}
            />
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
