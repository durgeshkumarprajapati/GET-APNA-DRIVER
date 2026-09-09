'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

type DocumentStatus = 'UPLOADED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

interface QueueDocument {
  id: string;
  documentType: string;
  documentNumber: string | null;
  status: DocumentStatus;
  originalFileName: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  driverProfile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    user: { email: string | null; phoneNumber: string | null };
  };
}

interface QueueResponse {
  documents: QueueDocument[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_FILTERS: (DocumentStatus | 'ALL')[] = [
  'ALL',
  'PENDING_VERIFICATION',
  'UPLOADED',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
];

function driverDisplayName(driver: QueueDocument['driverProfile']): string {
  if (driver.displayName) return driver.displayName;
  const combined = [driver.firstName, driver.lastName].filter(Boolean).join(' ');
  return combined || driver.user.email || 'Unnamed Driver';
}

function statusBadgeClass(status: string): string {
  if (status === 'VERIFIED') return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  if (status === 'REJECTED' || status === 'EXPIRED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  return 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]';
}

const PAGE_SIZE = 20;

export default function VerificationQueuePage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('PENDING_VERIFICATION');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    fetch(`/api/admin/driver-documents?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: QueueResponse) => {
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
  }, [statusFilter, page, refreshKey]);

  const handleVerify = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/verify`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document verified.' });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: resData.message ?? 'Failed to verify document.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    }
  };

  const handleReject = async (documentId: string) => {
    const reason = prompt('Enter rejection reason for this document:');
    if (!reason?.trim()) return;
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document rejected.' });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: resData.message ?? 'Failed to reject document.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/download-url`);
      const resData = await res.json();
      if (res.ok && resData.downloadUrl) {
        window.open(resData.downloadUrl, '_blank');
      } else {
        setMessage({ type: 'error', text: resData.message ?? 'Failed to fetch document link.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error downloading document.' });
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>DOCUMENT VERIFICATION QUEUE</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Verification Queue
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              {data ? `${data.total} document${data.total === 1 ? '' : 's'}` : '—'}
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number]);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All Statuses' : status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-[#00311f]/50 border-[#25a475] text-[#68dba9]' : 'bg-[#93000a]/20 border-[#93000a] text-[#ffb4ab]'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-[#87948b] text-sm">Loading documents…</div>
          ) : !data || data.documents.length === 0 ? (
            <div className="py-16 text-center text-[#87948b] text-sm">
              No documents match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">File</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {data.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#181c24]/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/drivers/${doc.driverProfile.id}`}
                          className="font-bold text-[#dfe2ee] hover:text-[#68dba9] transition-colors"
                        >
                          {driverDisplayName(doc.driverProfile)}
                        </Link>
                        <span className="block text-[10px] text-[#87948b]">
                          {doc.driverProfile.user.email ?? '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        {doc.documentType.replace(/_/g, ' ')}
                        {doc.documentNumber && (
                          <span className="block text-[10px] text-[#87948b]">
                            #{doc.documentNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#87948b]">{doc.originalFileName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(doc.status)}`}
                        >
                          {doc.status.replace(/_/g, ' ')}
                        </span>
                        {doc.rejectionReason && (
                          <span className="block text-[10px] text-[#ffb4ab] mt-0.5">
                            {doc.rejectionReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.id)}
                            className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                          >
                            View
                          </button>
                          {doc.status !== 'VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => handleVerify(doc.id)}
                              className="px-2.5 py-1 bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold rounded text-[11px]"
                            >
                              Verify
                            </button>
                          )}
                          {doc.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleReject(doc.id)}
                              className="px-2.5 py-1 bg-[#93000a]/80 hover:bg-[#690005] text-[#ffdad6] rounded text-[11px]"
                            >
                              Reject
                            </button>
                          )}
                        </div>
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
