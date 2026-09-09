'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DocumentQueueItem {
  id: string;
  driverProfileId: string;
  documentType: string;
  documentNumber: string | null;
  status: string;
  version: number;
  originalFileName: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  driverProfile: {
    id: string;
    drivingLicenseNumber: string;
    user: {
      fullName: string;
      email: string;
    };
  };
}

export default function AdminDriverDocumentsQueuePage() {
  const [documents, setDocuments] = useState<DocumentQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('UPLOADED');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const url =
          statusFilter === 'all'
            ? '/api/admin/driver-documents'
            : `/api/admin/driver-documents?status=${statusFilter}`;
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch {
        // Ignore load error
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  const refreshQueue = async () => {
    try {
      const url =
        statusFilter === 'all'
          ? '/api/admin/driver-documents'
          : `/api/admin/driver-documents?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      // Ignore load error
    }
  };

  const handleVerify = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document verified.' });
        await refreshQueue();
      } else {
        alert(data.message || 'Failed to verify document.');
      }
    } catch {
      alert('Error verifying document.');
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
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document rejected.' });
        await refreshQueue();
      } else {
        alert(data.message || 'Failed to reject document.');
      }
    } catch {
      alert('Error rejecting document.');
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/download-url`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(data.message || 'Failed to fetch document download URL.');
      }
    } catch {
      alert('Error viewing document.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400">Loading document verification queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/admin/drivers" className="hover:text-emerald-400 transition-colors">
                Driver Applications
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Document Verification Queue</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Pending Document Verification Queue
            </h1>
            <p className="text-slate-400 mt-1">
              Inspect and verify submitted driver licenses, identity cards, and vehicle documents.
            </p>
          </div>

          <Link
            href="/admin/drivers"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            Driver Directory
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none"
            >
              <option value="UPLOADED">Uploaded (Pending)</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="all">All Documents</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Total Records: {documents.length}
          </span>
        </div>

        {/* Queue Table */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          {documents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No driver documents found matching status &apos;{statusFilter}&apos;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Driver Name & Contact</th>
                    <th className="px-6 py-4">Document Type</th>
                    <th className="px-6 py-4">Doc / License #</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/drivers/${doc.driverProfile.id}`}
                          className="font-semibold text-white hover:text-emerald-400 transition-colors"
                        >
                          {doc.driverProfile.user.fullName}
                        </Link>
                        <div className="text-xs text-slate-400">{doc.driverProfile.user.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">
                          {doc.documentType.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-400">
                          File: {doc.originalFileName} (v{doc.version})
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-300">
                          {doc.documentNumber || 'N/A'}
                        </div>
                        {doc.expiresAt && (
                          <div className="text-xs text-slate-500">
                            Exp: {new Date(doc.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}
                        >
                          {doc.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(doc.id)}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors"
                          >
                            View File
                          </button>
                          {doc.status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleVerify(doc.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
                            >
                              Verify
                            </button>
                          )}
                          {doc.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleReject(doc.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded transition-colors"
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
        </div>
      </div>
    </div>
  );
}
