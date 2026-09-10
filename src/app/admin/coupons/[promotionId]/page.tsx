'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/loading-state';
import { PromotionStatusBadge } from '@/components/ui/transaction-status-badge';
import { DiscountLabel } from '@/components/ui/discount-label';
import { FinanceAmount } from '@/components/ui/finance-amount';
import { formatDateTime } from '@/shared/formatting/date';

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string | null;
  minBookingValue: string | null;
  firstRideOnly: boolean;
  isAutomatic: boolean;
  status: string;
  isExpired: boolean;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  totalUsageCount: number;
  perUserUsageLimit: number | null;
  createdAt: string;
}

interface PromotionUsage {
  id: string;
  userId: string;
  bookingId: string;
  discountAmount: string;
  createdAt: string;
}

const PAGE_SIZE = 25;

export default function AdminPromotionDetailPage() {
  const params = useParams<{ promotionId: string }>();
  const router = useRouter();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [usages, setUsages] = useState<PromotionUsage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [promoRes, usagesRes] = await Promise.all([
          fetch(`/api/admin/promotions/${params.promotionId}`),
          fetch(
            `/api/admin/promotions/${params.promotionId}/usages?page=${page}&pageSize=${PAGE_SIZE}`,
          ),
        ]);
        if (!isMounted) return;
        if (promoRes.ok && usagesRes.ok) {
          const promoData = await promoRes.json();
          const usagesData = await usagesRes.json();
          setPromotion(promoData.promotion);
          setUsages(usagesData.usages ?? []);
          setTotal(usagesData.total ?? 0);
          setError(null);
        } else {
          setError('Promotion not found.');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load promotion.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [params.promotionId, page]);

  const columns: DataTableColumn<PromotionUsage>[] = [
    { key: 'bookingId', header: 'Booking', render: (u) => u.bookingId.slice(0, 12) },
    { key: 'userId', header: 'Customer', render: (u) => u.userId.slice(0, 12) },
    {
      key: 'discount',
      header: 'Discount Granted',
      align: 'right',
      render: (u) => <FinanceAmount value={u.discountAmount} />,
    },
    {
      key: 'createdAt',
      header: 'Redeemed',
      align: 'right',
      render: (u) => formatDateTime(u.createdAt),
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full max-w-4xl">
        <PageHeader
          eyebrow="Growth"
          title="Promotion Detail"
          subtitle={promotion?.name}
          actions={
            <button
              type="button"
              onClick={() => router.push('/admin/coupons')}
              className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
            >
              ← Back to Coupons
            </button>
          }
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading promotion…" />
        ) : (
          promotion && (
            <>
              <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {promotion.code && (
                      <span className="font-mono text-sm px-3 py-1 rounded bg-[#25a475] text-[#00311f] font-bold">
                        {promotion.code}
                      </span>
                    )}
                    <DiscountLabel
                      discountType={promotion.discountType}
                      discountValue={promotion.discountValue}
                      maxDiscountAmount={promotion.maxDiscountAmount}
                      className="text-sm font-bold text-[#68dba9]"
                    />
                  </div>
                  <PromotionStatusBadge status={promotion.status} isExpired={promotion.isExpired} />
                </div>
                {promotion.description && (
                  <p className="text-sm text-[#bccac0]">{promotion.description}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#262a33]">
                  <MetricCard label="Total Redemptions" value={promotion.totalUsageCount} />
                  <MetricCard label="Usage Limit" value={promotion.totalUsageLimit ?? '∞'} />
                  <MetricCard label="Per-User Limit" value={promotion.perUserUsageLimit ?? '∞'} />
                  <MetricCard
                    label="Min. Booking Value"
                    value={
                      promotion.minBookingValue ? (
                        <FinanceAmount value={promotion.minBookingValue} />
                      ) : (
                        '—'
                      )
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#87948b]">
                  <span>Starts: {formatDateTime(promotion.startsAt)}</span>
                  <span>
                    Ends: {promotion.endsAt ? formatDateTime(promotion.endsAt) : 'No expiry'}
                  </span>
                  <span>First ride only: {promotion.firstRideOnly ? 'Yes' : 'No'}</span>
                  <span>Automatic: {promotion.isAutomatic ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Redemption History
                </h2>
                <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl space-y-4">
                  <DataTable
                    columns={columns}
                    data={usages}
                    keyExtractor={(u) => u.id}
                    emptyIcon="receipt_long"
                    emptyMessage="This promotion has not been redeemed yet."
                  />
                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onPageChange={setPage}
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
