'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DriverDocument {
  id: string;
  documentType: string;
  documentNumber: string | null;
  status: string;
  version: number;
  isCurrent: boolean;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'DRIVING_LICENSE', label: 'Driving License (Required)' },
  { value: 'AADHAAR_CARD', label: 'Aadhaar Card (Required)' },
  { value: 'PAN_CARD', label: 'PAN Card' },
  { value: 'VEHICLE_REGISTRATION', label: 'Vehicle Registration (RC)' },
  { value: 'VEHICLE_INSURANCE', label: 'Vehicle Insurance' },
  { value: 'POLICE_VERIFICATION', label: 'Police Verification Certificate' },
];

export default function DriverDocumentsPage() {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('DRIVING_LICENSE');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/documents');
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
  }, []);

  const refreshDocuments = async () => {
    try {
      const res = await fetch('/api/driver/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      // Ignore load error
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a document file to upload.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // 1. Get pre-signed storage key / upload URL from backend
      const uploadUrlRes = await fetch('/api/driver/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedType,
          fileName: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          fileSizeBytes: selectedFile.size,
        }),
      });

      const uploadUrlData = await uploadUrlRes.json();
      if (!uploadUrlRes.ok) {
        throw new Error(
          uploadUrlData.message ||
            uploadUrlData.error?.message ||
            'Failed to initialize document upload.',
        );
      }

      // 2. Register document with storage key
      const registerRes = await fetch('/api/driver/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedType,
          storageKey: uploadUrlData.storageKey,
          originalFileName: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          fileSizeBytes: selectedFile.size,
          documentNumber: documentNumber.trim() || null,
          expiresAt: expiresAt || null,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(
          registerData.message || registerData.error?.message || 'Failed to register document.',
        );
      }

      setMessage({
        type: 'success',
        text: `Document '${selectedType}' uploaded successfully and submitted for review.`,
      });
      setSelectedFile(null);
      setDocumentNumber('');
      setExpiresAt('');
      await refreshDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/driver/documents/${documentId}/download-url`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(data.message || 'Failed to get document download link.');
      }
    } catch {
      alert('Error fetching download link.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            Verified
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
            Rejected
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400">Loading document portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/driver" className="hover:text-emerald-400 transition-colors">
                Driver Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Documents</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Driver Verification Documents
            </h1>
            <p className="text-slate-400 mt-1">
              Upload required identity, license, and vehicle documentation for verification.
            </p>
          </div>
          <Link
            href="/driver/onboarding"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            Back to Onboarding
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Upload New Document Form */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-4">Upload New Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Document Type *
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Document / License Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-1420110012345"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Expiration Date (If Applicable)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Document File (PDF / JPEG / PNG, Max 10MB) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 text-sm focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-md transition-colors flex items-center gap-2"
              >
                {uploading && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {uploading ? 'Uploading Document...' : 'Upload & Submit Document'}
              </button>
            </div>
          </form>
        </div>

        {/* Uploaded Documents List */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-4">Your Uploaded Documents</h2>

          {documents.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-700 rounded-xl">
              <p className="text-slate-400">
                No documents uploaded yet. Upload required documents above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/60">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      {getStatusBadge(doc.status)}
                      <span className="text-xs text-slate-500">v{doc.version}</span>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>File: {doc.originalFileName}</span>
                      {doc.documentNumber && <span>Doc #: {doc.documentNumber}</span>}
                      {doc.expiresAt && (
                        <span>Expires: {new Date(doc.expiresAt).toLocaleDateString()}</span>
                      )}
                      <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>

                    {doc.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                        <strong className="font-semibold">Rejection Reason:</strong>{' '}
                        {doc.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 transition-colors"
                    >
                      View / Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
