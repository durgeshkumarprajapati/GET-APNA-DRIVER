'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { EmptyState } from '@/components/ui/empty-state';

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

// Must stay in sync with the DriverDocumentType enum in prisma/schema.prisma
// — the server rejects any value outside this set (zod
// z.nativeEnum(DriverDocumentType) in the upload-url/register routes), so a
// mismatched list here would let a driver select a type that always fails
// on submit. "(Required)" mirrors the default `driver.onboarding.required_
// documents` configuration used by evaluateDriverEligibilityFromProfile.
const DOCUMENT_TYPES = [
  { value: 'DRIVING_LICENSE', label: 'Driving License (Required)' },
  { value: 'AADHAAR_CARD', label: 'Aadhaar Card (Required)' },
  { value: 'PROFILE_PHOTO', label: 'Profile Photo' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'POLICE_VERIFICATION', label: 'Police Verification Certificate' },
  { value: 'BACKGROUND_VERIFICATION', label: 'Background Verification' },
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
        setMessage({
          type: 'error',
          text: data.message || 'Failed to get document download link.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error fetching download link.' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            Verified
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            Rejected
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant border border-border">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-4"></div>
            <p className="text-on-surface-variant">Loading document portal...</p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface font-['Space_Grotesk']">
              Driver Verification Documents
            </h1>
            <p className="text-on-surface-variant mt-1">
              Upload required identity, license, and vehicle documentation for verification.
            </p>
          </div>
          <Link
            href="/driver/onboarding"
            className="inline-flex items-center justify-center min-h-[48px] px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium rounded-lg border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Back to Onboarding
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Upload New Document Form */}
        <div className="bg-surface-container border border-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-on-surface mb-4">Upload New Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                  Document Type *
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-surface-container-high border border-border rounded-lg px-3 py-2 text-on-surface text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                  Document / License Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-1420110012345"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full bg-surface-container-high border border-border rounded-lg px-3 py-2 text-on-surface text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-on-surface-variant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                  Expiration Date (If Applicable)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-surface-container-high border border-border rounded-lg px-3 py-2 text-on-surface text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                  Document File (PDF / JPEG / PNG, Max 10MB) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="w-full bg-surface-container-high border border-border rounded-lg px-3 py-1.5 text-on-surface-variant text-sm focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="min-h-[48px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm shadow-md transition-colors flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
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
        <div className="bg-surface-container border border-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-on-surface mb-4">Your Uploaded Documents</h2>

          {documents.length === 0 ? (
            <EmptyState
              icon="description"
              message="No documents uploaded yet. Upload required documents above."
            />
          ) : (
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-on-surface">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      {getStatusBadge(doc.status)}
                      <span className="text-xs text-on-surface-variant">v{doc.version}</span>
                    </div>

                    <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-4 gap-y-1">
                      <span>File: {doc.originalFileName}</span>
                      {doc.documentNumber && <span>Doc #: {doc.documentNumber}</span>}
                      {doc.expiresAt && (
                        <span>Expires: {new Date(doc.expiresAt).toLocaleDateString()}</span>
                      )}
                      <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>

                    {doc.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
                        <strong className="font-semibold">Rejection Reason:</strong>{' '}
                        {doc.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="min-h-[48px] px-3 py-1.5 text-xs font-medium bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
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
    </DriverLayout>
  );
}
