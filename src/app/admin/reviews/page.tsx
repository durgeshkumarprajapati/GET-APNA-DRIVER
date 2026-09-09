'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { RatingStars } from '@/components/ui/rating-stars';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDate } from '@/shared/formatting/date';

interface AdminReviewRow {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  customer: { email: string | null; phoneNumber: string | null };
  driver: { id: string; name: string };
}

interface AdminReviewsResponse {
  reviews: AdminReviewRow[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_FILTERS = ['ALL', 'PUBLISHED', 'FLAGGED', 'HIDDEN', 'REJECTED'] as const;
const STATUS_TONE: Record<string, StatusBadgeTone> = {
  PUBLISHED: 'success',
  FLAGGED: 'warning',
  HIDDEN: 'neutral',
  REJECTED: 'danger',
};

const PAGE_SIZE = 25;

export default function AdminReviewsPage() {
  const [data, setData] = useState<AdminReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);

    fetch(`/api/admin/reviews?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: AdminReviewsResponse) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setData(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, status, page]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Trust & Safety"
          title="Reviews & Ratings"
          subtitle={data ? `${data.total} review${data.total === 1 ? '' : 's'}` : undefined}
          actions={
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setLoading(true);
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search comment text..."
                className="h-9 px-3 rounded-lg bg-[#0a0e16] border border-[#262a33] text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
              />
              <select
                value={status}
                onChange={(e) => {
                  setLoading(true);
                  setStatus(e.target.value as (typeof STATUS_FILTERS)[number]);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg bg-[#0a0e16] border border-[#262a33] text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'All Statuses' : option}
                  </option>
                ))}
              </select>
            </>
          }
        />

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          {loading ? (
            <LoadingState message="Loading reviews…" />
          ) : !data || data.reviews.length === 0 ? (
            <EmptyState icon="reviews" message="No reviews match the current filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Comment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {data.reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-[#181c24]/60 transition-colors">
                      <td className="py-3 px-4">
                        <RatingStars value={review.rating} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/drivers/${review.driver.id}`}
                          className="font-bold text-[#dfe2ee] hover:text-[#68dba9] transition-colors"
                        >
                          {review.driver.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        {review.customer.email ?? review.customer.phoneNumber ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-[#bccac0] max-w-xs truncate">
                        {review.comment ?? <span className="text-[#87948b]">No comment</span>}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          label={review.status}
                          tone={STATUS_TONE[review.status] ?? 'neutral'}
                        />
                      </td>
                      <td className="py-3 px-4 text-right text-[#87948b]">
                        <Link
                          href={`/admin/reviews/${review.id}`}
                          className="hover:text-[#68dba9] transition-colors"
                        >
                          {formatDate(review.createdAt)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="mt-4">
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={(nextPage) => {
                  setLoading(true);
                  setPage(nextPage);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
