'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CustomerRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  bookingCount: number;
  paymentCount: number;
  createdAt: string;
  user: {
    id: string;
    accountStatus: string;
    email: string | null;
    phoneNumber: string | null;
  };
}

interface CustomerListResponse {
  customers: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

const ACCOUNT_STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

function customerDisplayName(customer: CustomerRow): string {
  if (customer.displayName) return customer.displayName;
  const combined = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return combined || customer.user.email || 'Unnamed Customer';
}

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE')
    return 'bg-on-primary-container text-primary border border-primary-container';
  if (status === 'PENDING')
    return 'bg-on-warning-container text-warning border border-on-warning-container';
  if (status === 'SUSPENDED' || status === 'DELETED') {
    return 'bg-error-container/20 text-error border border-error-container';
  }
  return 'bg-surface-container-high text-on-surface border border-border';
}

const PAGE_SIZE = 25;

export default function AdminCustomersPage() {
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] =
    useState<(typeof ACCOUNT_STATUS_FILTERS)[number]>('ALL');
  const [page, setPage] = useState(1);

  // Current session permissions & approval modal state
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [approving, setApproving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.principal?.permissions) {
          setUserPermissions(data.principal.permissions);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());
    if (accountStatus !== 'ALL') params.set('accountStatus', accountStatus);

    fetch(`/api/admin/customers?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: CustomerListResponse) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, accountStatus, page, refreshKey]);

  const canApprove = userPermissions.includes('admin.customer.approve');

  const handleApprove = async () => {
    if (!selectedCustomer) return;
    setApproving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to approve customer');
      }

      setSuccessMsg(
        `Customer ${customerDisplayName(selectedCustomer)} has been successfully approved!`,
      );
      setSelectedCustomer(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed.';
      setErrorMsg(message);
    } finally {
      setApproving(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="flex flex-col gap-6 w-full">
        {successMsg && (
          <div className="bg-on-primary-container border border-primary-container text-primary px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-primary hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-error-container/20 border border-error-container text-error px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-error hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>CUSTOMER DIRECTORY</span>
            </div>
            <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
              Customers
            </h1>
            <p className="text-xs text-outline mt-0.5">
              {data ? `${data.total} customer${data.total === 1 ? '' : 's'}` : '—'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name..."
              className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
            />
            <select
              value={accountStatus}
              onChange={(e) => {
                setAccountStatus(e.target.value as (typeof ACCOUNT_STATUS_FILTERS)[number]);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              {ACCOUNT_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Account Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-outline text-sm">Loading customers…</div>
          ) : !data || data.customers.length === 0 ? (
            <div className="py-16 text-center text-outline text-sm">
              No customers match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-['Space_Grotesk'] uppercase border-b border-surface-container-high">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Bookings</th>
                    <th className="py-3 px-4">Payments</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-mono">
                  {data.customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-bold text-on-surface hover:text-primary transition-colors"
                        >
                          {customerDisplayName(customer)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        <span className="block">{customer.user.email ?? '—'}</span>
                        {customer.user.phoneNumber && (
                          <span className="block text-[10px] text-outline">
                            {customer.user.phoneNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{customer.bookingCount}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{customer.paymentCount}</td>
                      <td className="py-3 px-4 text-outline">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(customer.user.accountStatus)}`}
                        >
                          {customer.user.accountStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {customer.user.accountStatus === 'PENDING' && canApprove && (
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="px-3 py-1 bg-primary-container text-on-primary-container font-bold rounded text-[11px] hover:bg-primary transition-colors"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-outline">
              <span>
                Page {data.page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Admin Approval */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
              <h2 className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
                Approve Customer?
              </h2>
            </div>

            <div className="text-xs text-on-surface-variant space-y-3 leading-relaxed">
              <p>You are about to approve customer account:</p>
              <div className="bg-surface-container-low border border-surface-container-high p-3 rounded-lg font-mono">
                <div className="text-sm font-bold text-on-surface">
                  {customerDisplayName(selectedCustomer)}
                </div>
                <div className="text-[11px] text-outline mt-0.5">
                  {selectedCustomer.user.email ?? selectedCustomer.user.phoneNumber ?? 'No contact'}
                </div>
              </div>
              <p>
                The customer will become <strong className="text-primary">ACTIVE</strong> and may
                use customer services according to current account rules.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
              <button
                type="button"
                disabled={approving}
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold hover:bg-primary transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approving ? 'Approving...' : 'Approve Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
