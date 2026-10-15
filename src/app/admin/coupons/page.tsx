'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string | null;
  status: string;
  isExpired: boolean;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  totalUsageCount: number;
  perUserUsageLimit: number | null;
}

interface Analytics {
  totalPromotions: number;
  activePromotions: number;
  totalRedemptions: number;
  totalDiscountAmount: string;
}

interface DriverCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  creditAmount: string;
  status: string;
  isExpired: boolean;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  totalUsageCount: number;
}

const STATUS_OPTIONS = ['', 'DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
const PAGE_SIZE = 25;

const emptyForm = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscountAmount: '',
  minBookingValue: '',
  firstRideOnly: false,
  isAutomatic: false,
  startsAt: '',
  endsAt: '',
  totalUsageLimit: '',
  perUserUsageLimit: '1',
};

const emptyDriverCouponForm = {
  code: '',
  name: '',
  description: '',
  creditAmount: '',
  startsAt: '',
  endsAt: '',
  totalUsageLimit: '',
};

export default function AdminCouponsPage() {
  const [audience, setAudience] = useState<'CUSTOMER' | 'DRIVER'>('CUSTOMER');

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void fetch('/api/admin/promotions/metrics')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAnalytics(data.analytics));
  }, [refreshKey]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (statusFilter) params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/admin/promotions?${params.toString()}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setPromotions(data.promotions ?? []);
          setTotal(data.total ?? 0);
          setError(null);
        } else {
          setError('Failed to load promotions.');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load promotions.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, page, statusFilter, search]);

  const runAction = async (promotionId: string, action: 'activate' | 'pause' | 'archive') => {
    setActionMessage(null);
    setBusyId(promotionId);
    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Promotion now ${data.promotion.status}.`);
        setRefreshKey((k) => k + 1);
      } else {
        setActionMessage(data.message ?? 'Action failed.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim() || null,
          name: form.name.trim(),
          description: form.description.trim() || null,
          discountType: form.discountType,
          discountValue: form.discountValue,
          maxDiscountAmount: form.maxDiscountAmount.trim() || null,
          minBookingValue: form.minBookingValue.trim() || null,
          firstRideOnly: form.firstRideOnly,
          isAutomatic: form.isAutomatic,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          totalUsageLimit: form.totalUsageLimit.trim() ? Number(form.totalUsageLimit) : null,
          perUserUsageLimit: form.perUserUsageLimit.trim() ? Number(form.perUserUsageLimit) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Promotion "${data.promotion.name}" created as DRAFT.`);
        setForm(emptyForm);
        setShowCreate(false);
        setPage(1);
        setRefreshKey((k) => k + 1);
      } else {
        setActionMessage(data.message ?? 'Failed to create promotion.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    } finally {
      setCreating(false);
    }
  };

  // --- Driver coupons (direct wallet-credit codes) ---------------------
  const [driverCoupons, setDriverCoupons] = useState<DriverCoupon[]>([]);
  const [driverCouponTotal, setDriverCouponTotal] = useState(0);
  const [driverCouponPage, setDriverCouponPage] = useState(1);
  const [driverCouponStatusFilter, setDriverCouponStatusFilter] = useState('');
  const [driverCouponSearch, setDriverCouponSearch] = useState('');
  const [driverCouponLoading, setDriverCouponLoading] = useState(false);
  const [driverCouponError, setDriverCouponError] = useState<string | null>(null);
  const [driverCouponBusyId, setDriverCouponBusyId] = useState<string | null>(null);
  const [driverCouponRefreshKey, setDriverCouponRefreshKey] = useState(0);
  const [showDriverCouponCreate, setShowDriverCouponCreate] = useState(false);
  const [driverCouponForm, setDriverCouponForm] = useState(emptyDriverCouponForm);
  const [creatingDriverCoupon, setCreatingDriverCoupon] = useState(false);

  useEffect(() => {
    if (audience !== 'DRIVER') return;
    let isMounted = true;
    const load = async () => {
      setDriverCouponLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(driverCouponPage),
          pageSize: String(PAGE_SIZE),
        });
        if (driverCouponStatusFilter) params.set('status', driverCouponStatusFilter);
        if (driverCouponSearch.trim()) params.set('search', driverCouponSearch.trim());
        const res = await fetch(`/api/admin/driver-coupons?${params.toString()}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setDriverCoupons(data.coupons ?? []);
          setDriverCouponTotal(data.total ?? 0);
          setDriverCouponError(null);
        } else {
          setDriverCouponError('Failed to load driver coupons.');
        }
      } catch (err) {
        if (isMounted) {
          setDriverCouponError(
            err instanceof Error ? err.message : 'Failed to load driver coupons.',
          );
        }
      } finally {
        if (isMounted) setDriverCouponLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [
    audience,
    driverCouponRefreshKey,
    driverCouponPage,
    driverCouponStatusFilter,
    driverCouponSearch,
  ]);

  const runDriverCouponAction = async (
    driverCouponId: string,
    action: 'activate' | 'pause' | 'archive',
  ) => {
    setActionMessage(null);
    setDriverCouponBusyId(driverCouponId);
    try {
      const res = await fetch(`/api/admin/driver-coupons/${driverCouponId}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Driver coupon now ${data.coupon.status}.`);
        setDriverCouponRefreshKey((k) => k + 1);
      } else {
        setActionMessage(data.message ?? 'Action failed.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    } finally {
      setDriverCouponBusyId(null);
    }
  };

  const handleCreateDriverCoupon = async () => {
    setCreatingDriverCoupon(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/driver-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: driverCouponForm.code.trim(),
          name: driverCouponForm.name.trim(),
          description: driverCouponForm.description.trim() || null,
          creditAmount: driverCouponForm.creditAmount,
          startsAt: driverCouponForm.startsAt
            ? new Date(driverCouponForm.startsAt).toISOString()
            : null,
          endsAt: driverCouponForm.endsAt ? new Date(driverCouponForm.endsAt).toISOString() : null,
          totalUsageLimit: driverCouponForm.totalUsageLimit.trim()
            ? Number(driverCouponForm.totalUsageLimit)
            : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Driver coupon "${data.coupon.name}" created as DRAFT.`);
        setDriverCouponForm(emptyDriverCouponForm);
        setShowDriverCouponCreate(false);
        setDriverCouponPage(1);
        setDriverCouponRefreshKey((k) => k + 1);
      } else {
        setActionMessage(data.message ?? 'Failed to create driver coupon.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    } finally {
      setCreatingDriverCoupon(false);
    }
  };

  const driverCouponColumns: DataTableColumn<DriverCoupon>[] = [
    { key: 'name', header: 'Coupon', render: (c) => c.name },
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono">{c.code}</span>,
    },
    {
      key: 'creditAmount',
      header: 'Wallet Credit',
      align: 'right',
      render: (c) => <FinanceAmount value={c.creditAmount} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <PromotionStatusBadge status={c.status} isExpired={c.isExpired} />,
    },
    {
      key: 'usage',
      header: 'Usage',
      align: 'right',
      render: (c) => `${c.totalUsageCount}${c.totalUsageLimit ? ` / ${c.totalUsageLimit}` : ''}`,
    },
    {
      key: 'window',
      header: 'Window',
      render: (c) =>
        `${formatDateTime(c.startsAt)} — ${c.endsAt ? formatDateTime(c.endsAt) : 'no end'}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-2">
          {c.status === 'DRAFT' && (
            <button
              type="button"
              disabled={driverCouponBusyId === c.id}
              onClick={() => void runDriverCouponAction(c.id, 'activate')}
              className="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {c.status === 'ACTIVE' && (
            <button
              type="button"
              disabled={driverCouponBusyId === c.id}
              onClick={() => void runDriverCouponAction(c.id, 'pause')}
              className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Disable
            </button>
          )}
          {c.status === 'PAUSED' && (
            <button
              type="button"
              disabled={driverCouponBusyId === c.id}
              onClick={() => void runDriverCouponAction(c.id, 'activate')}
              className="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Enable
            </button>
          )}
          {c.status !== 'ARCHIVED' && (
            <button
              type="button"
              disabled={driverCouponBusyId === c.id}
              onClick={() => void runDriverCouponAction(c.id, 'archive')}
              className="px-3 py-1.5 bg-error-container hover:bg-on-error text-on-error-container font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const columns: DataTableColumn<Promotion>[] = [
    {
      key: 'name',
      header: 'Promotion',
      render: (p) => (
        <Link href={`/admin/coupons/${p.id}`} className="text-primary hover:underline">
          {p.name}
        </Link>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (p) => p.code ?? <span className="text-outline">Automatic</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (p) => (
        <DiscountLabel
          discountType={p.discountType}
          discountValue={p.discountValue}
          maxDiscountAmount={p.maxDiscountAmount}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <PromotionStatusBadge status={p.status} isExpired={p.isExpired} />,
    },
    {
      key: 'usage',
      header: 'Usage',
      align: 'right',
      render: (p) => `${p.totalUsageCount}${p.totalUsageLimit ? ` / ${p.totalUsageLimit}` : ''}`,
    },
    {
      key: 'window',
      header: 'Window',
      render: (p) =>
        `${formatDateTime(p.startsAt)} — ${p.endsAt ? formatDateTime(p.endsAt) : 'no end'}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          {p.status === 'DRAFT' && (
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => void runAction(p.id, 'activate')}
              className="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {p.status === 'ACTIVE' && (
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => void runAction(p.id, 'pause')}
              className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {p.status === 'PAUSED' && (
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => void runAction(p.id, 'activate')}
              className="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {p.status !== 'ARCHIVED' && (
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => void runAction(p.id, 'archive')}
              className="px-3 py-1.5 bg-error-container hover:bg-on-error text-on-error-container font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Archive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        eyebrow="Growth"
        title="Coupons & Promotions"
        subtitle="Manage customer promotions and driver wallet-credit coupons."
        actions={
          audience === 'CUSTOMER' ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-colors"
            >
              {showCreate ? 'Cancel' : '+ New Promotion'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDriverCouponCreate((v) => !v)}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-colors"
            >
              {showDriverCouponCreate ? 'Cancel' : '+ New Driver Coupon'}
            </button>
          )
        }
      />

      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low border border-surface-container-high w-fit">
        <button
          type="button"
          onClick={() => setAudience('CUSTOMER')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            audience === 'CUSTOMER'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Customer Coupons
        </button>
        <button
          type="button"
          onClick={() => setAudience('DRIVER')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            audience === 'DRIVER'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Driver Coupons
        </button>
      </div>

      {actionMessage && <p className="text-sm text-on-surface-variant">{actionMessage}</p>}

      {audience === 'CUSTOMER' && analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Promotions" value={analytics.totalPromotions} />
          <MetricCard
            label="Active Promotions"
            value={analytics.activePromotions}
            accent="positive"
          />
          <MetricCard label="Total Redemptions" value={analytics.totalRedemptions} />
          <MetricCard
            label="Total Discount Granted"
            value={<FinanceAmount value={analytics.totalDiscountAmount} />}
          />
        </div>
      )}

      {audience === 'CUSTOMER' && showCreate && (
        <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high space-y-4">
          <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
            New Promotion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Code (blank = automatic)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary font-mono"
            />
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
            <input
              type="text"
              placeholder={
                form.discountType === 'PERCENTAGE'
                  ? 'Discount % (e.g. 20)'
                  : 'Discount ₹ (e.g. 100)'
              }
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Max discount ₹ (optional cap)"
              value={form.maxDiscountAmount}
              onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Minimum booking value (optional)"
              value={form.minBookingValue}
              onChange={(e) => setForm({ ...form, minBookingValue: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <label className="flex items-center gap-2 text-xs text-on-surface-variant">
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="flex-1 rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </label>
            <input
              type="datetime-local"
              placeholder="Ends at (optional)"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Total usage limit (blank = unlimited)"
              value={form.totalUsageLimit}
              onChange={(e) => setForm({ ...form, totalUsageLimit: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Per-user usage limit"
              value={form.perUserUsageLimit}
              onChange={(e) => setForm({ ...form, perUserUsageLimit: e.target.value })}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="md:col-span-3 rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <label className="flex items-center gap-2 text-xs text-on-surface-variant">
              <input
                type="checkbox"
                checked={form.firstRideOnly}
                onChange={(e) => setForm({ ...form, firstRideOnly: e.target.checked })}
              />
              First booking only
            </label>
            <label className="flex items-center gap-2 text-xs text-on-surface-variant">
              <input
                type="checkbox"
                checked={form.isAutomatic}
                onChange={(e) => setForm({ ...form, isAutomatic: e.target.checked })}
              />
              Auto-apply (no code needed)
            </label>
          </div>
          <button
            type="button"
            disabled={creating || !form.name.trim() || !form.discountValue.trim() || !form.startsAt}
            onClick={() => void handleCreate()}
            className="px-5 py-2 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary-container font-bold text-sm rounded-lg shadow transition-colors"
          >
            {creating ? 'Creating…' : 'Create Promotion (as Draft)'}
          </button>
          <p className="text-[10px] text-outline">
            A new promotion is always created as DRAFT — activate it once ready. Only DRAFT
            promotions can still be edited; once activated, its terms are locked to keep historical
            redemptions correct.
          </p>
        </div>
      )}

      {audience === 'CUSTOMER' && (
        <>
          <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'All Statuses' : opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or code"
              className="flex-1 min-w-[220px] rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <LoadingState message="Loading promotions…" />
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl space-y-4">
              <DataTable
                columns={columns}
                data={promotions}
                keyExtractor={(p) => p.id}
                emptyIcon="confirmation_number"
                emptyMessage="No promotions match these filters."
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {audience === 'DRIVER' && (
        <>
          {showDriverCouponCreate && (
            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high space-y-4">
              <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
                New Driver Coupon
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={driverCouponForm.name}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, name: e.target.value })
                  }
                  className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Code"
                  value={driverCouponForm.code}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, code: e.target.value.toUpperCase() })
                  }
                  className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary font-mono"
                />
                <input
                  type="text"
                  placeholder="Wallet credit ₹ (e.g. 100)"
                  value={driverCouponForm.creditAmount}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, creditAmount: e.target.value })
                  }
                  className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
                <input
                  type="datetime-local"
                  value={driverCouponForm.startsAt}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, startsAt: e.target.value })
                  }
                  className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
                <input
                  type="datetime-local"
                  placeholder="Ends at (optional)"
                  value={driverCouponForm.endsAt}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, endsAt: e.target.value })
                  }
                  className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  placeholder="Total usage limit (blank = unlimited)"
                  value={driverCouponForm.totalUsageLimit}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, totalUsageLimit: e.target.value })
                  }
                  className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={driverCouponForm.description}
                  onChange={(e) =>
                    setDriverCouponForm({ ...driverCouponForm, description: e.target.value })
                  }
                  className="md:col-span-3 rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                disabled={
                  creatingDriverCoupon ||
                  !driverCouponForm.name.trim() ||
                  !driverCouponForm.code.trim() ||
                  !driverCouponForm.creditAmount.trim() ||
                  !driverCouponForm.startsAt
                }
                onClick={() => void handleCreateDriverCoupon()}
                className="px-5 py-2 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary-container font-bold text-sm rounded-lg shadow transition-colors"
              >
                {creatingDriverCoupon ? 'Creating…' : 'Create Driver Coupon (as Draft)'}
              </button>
              <p className="text-[10px] text-outline">
                A new driver coupon is always created as DRAFT — activate it once ready. A driver
                redeems it once for a direct, one-time credit to their wallet. Only DRAFT coupons
                can still be edited.
              </p>
            </div>
          )}

          <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-3">
            <select
              value={driverCouponStatusFilter}
              onChange={(e) => {
                setDriverCouponStatusFilter(e.target.value);
                setDriverCouponPage(1);
              }}
              className="rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'All Statuses' : opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={driverCouponSearch}
              onChange={(e) => {
                setDriverCouponSearch(e.target.value);
                setDriverCouponPage(1);
              }}
              placeholder="Search by name or code"
              className="flex-1 min-w-[220px] rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {driverCouponError && (
            <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
              {driverCouponError}
            </div>
          )}

          {driverCouponLoading ? (
            <LoadingState message="Loading driver coupons…" />
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl space-y-4">
              <DataTable
                columns={driverCouponColumns}
                data={driverCoupons}
                keyExtractor={(c) => c.id}
                emptyIcon="confirmation_number"
                emptyMessage="No driver coupons match these filters."
              />
              <Pagination
                page={driverCouponPage}
                pageSize={PAGE_SIZE}
                total={driverCouponTotal}
                onPageChange={setDriverCouponPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
