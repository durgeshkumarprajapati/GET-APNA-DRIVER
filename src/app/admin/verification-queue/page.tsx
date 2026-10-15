'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  if (status === 'VERIFIED')
    return 'bg-on-primary-container text-primary border border-primary-container';
  if (status === 'REJECTED' || status === 'EXPIRED') {
    return 'bg-error-container/20 text-error border border-error-container';
  }
  return 'bg-warning-container text-on-warning-container border border-warning-container';
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
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>DOCUMENT VERIFICATION QUEUE</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
            Verification Queue
          </h1>
          <p className="text-xs text-outline mt-0.5">
            {data ? `${data.total} document${data.total === 1 ? '' : 's'}` : '—'}
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number]);
            setPage(1);
          }}
          className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
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
          className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-on-primary-container/50 border-primary-container text-primary' : 'bg-error-container/20 border-error-container text-error'}`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-outline text-sm">Loading documents…</div>
        ) : !data || data.documents.length === 0 ? (
          <div className="py-16 text-center text-outline text-sm">
            No documents match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-['Space_Grotesk'] uppercase border-b border-surface-container-high">
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-mono">
                {data.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/drivers/${doc.driverProfile.id}`}
                        className="font-bold text-on-surface hover:text-primary transition-colors"
                      >
                        {driverDisplayName(doc.driverProfile)}
                      </Link>
                      <span className="block text-[10px] text-outline">
                        {doc.driverProfile.user.email ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {doc.documentType.replace(/_/g, ' ')}
                      {doc.documentNumber && (
                        <span className="block text-[10px] text-outline">
                          #{doc.documentNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-outline">{doc.originalFileName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(doc.status)}`}
                      >
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                      {doc.rejectionReason && (
                        <span className="block text-[10px] text-error mt-0.5">
                          {doc.rejectionReason}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(doc.id)}
                          className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-bright text-on-surface rounded text-[11px]"
                        >
                          View
                        </button>
                        {doc.status !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(doc.id)}
                            className="px-2.5 py-1 bg-primary-container hover:bg-primary text-on-primary-container font-bold rounded text-[11px]"
                          >
                            Verify
                          </button>
                        )}
                        {doc.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleReject(doc.id)}
                            className="px-2.5 py-1 bg-error-container/80 hover:bg-on-error text-on-error-container rounded text-[11px]"
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
  );
}
