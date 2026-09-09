'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface DriverRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  drivingLicenseNumber: string;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
  availabilityStatus: string;
  createdAt: string;
  user: {
    email: string | null;
    phoneNumber: string | null;
  };
}

interface DriverListResponse {
  drivers: DriverRow[];
  total: number;
  page: number;
  pageSize: number;
}

const APPROVAL_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;

function driverDisplayName(driver: DriverRow): string {
  if (driver.displayName) return driver.displayName;
  const combined = [driver.firstName, driver.lastName].filter(Boolean).join(' ');
  return combined || driver.user.email || 'Unnamed Driver';
}

function statusBadgeClass(status: string): string {
  if (status === 'APPROVED' || status === 'AVAILABLE') {
    return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  }
  if (status === 'REJECTED' || status === 'SUSPENDED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  return 'bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]';
}

const PAGE_SIZE = 25;

export default function AdminDriverDirectoryPage() {
  const [data, setData] = useState<DriverListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<(typeof APPROVAL_FILTERS)[number]>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search.trim()) params.set('search', search.trim());
    if (approvalStatus !== 'ALL') params.set('approvalStatus', approvalStatus);

    fetch(`/api/admin/drivers?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: DriverListResponse) => {
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
  }, [search, approvalStatus, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">id_card</span>
              <span>CHAUFFEUR DIRECTORY &amp; ROSTER</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Driver Directory
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              {data ? `${data.total} driver application${data.total === 1 ? '' : 's'}` : '—'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name..."
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
            />
            <select
              value={approvalStatus}
              onChange={(e) => {
                setApprovalStatus(e.target.value as (typeof APPROVAL_FILTERS)[number]);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            >
              {APPROVAL_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Approval Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-[#87948b] text-sm">Loading drivers…</div>
          ) : !data || data.drivers.length === 0 ? (
            <div className="py-16 text-center text-[#87948b] text-sm">
              No drivers match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">License</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Onboarding</th>
                    <th className="py-3 px-4">Approval</th>
                    <th className="py-3 px-4 text-right">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {data.drivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-[#181c24]/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/drivers/${driver.id}`}
                          className="font-bold text-[#dfe2ee] hover:text-[#68dba9] transition-colors"
                        >
                          {driverDisplayName(driver)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        <span className="block">{driver.user.email ?? '—'}</span>
                        {driver.user.phoneNumber && (
                          <span className="block text-[10px] text-[#87948b]">
                            {driver.user.phoneNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">{driver.drivingLicenseNumber}</td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        {driver.drivingExperienceYears} yrs
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(driver.onboardingStatus)}`}
                        >
                          {driver.onboardingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(driver.approvalStatus)}`}
                        >
                          {driver.approvalStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(driver.availabilityStatus)}`}
                        >
                          {driver.availabilityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-[#87948b]">
              <span>
                Page {data.page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
