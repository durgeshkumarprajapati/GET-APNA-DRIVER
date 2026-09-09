'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface DriverDetail {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    accountStatus: string;
  };
  dateOfBirth: string | null;
  gender: string | null;
  drivingLicenseNumber: string;
  licenseCategory: string | null;
  licenseExpiryDate: string | null;
  yearsOfExperience: number;
  badgeNumber: string | null;
  preferredVehicleTypes: string[];
  serviceAreas: string[];
  city: string | null;
  state: string | null;
  postalCode: string | null;
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
  availabilityStatus: string;
  rejectionReason: string | null;
  changesRequestedReason: string | null;
  createdAt: string;
  updatedAt: string;
  documents: {
    id: string;
    documentType: string;
    documentNumber: string | null;
    status: string;
    version: number;
    isCurrent: boolean;
    originalFileName: string;
    rejectionReason: string | null;
    expiresAt: string | null;
    createdAt: string;
  }[];
}

export default function AdminDriverDetailPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = use(params);
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState('');
  const [activeModal, setActiveModal] = useState<
    'approve' | 'reject' | 'changes' | 'suspend' | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/drivers/${driverId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setDriver(data.driver);
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
  }, [driverId]);

  const refreshDriver = async () => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`);
      if (res.ok) {
        const data = await res.json();
        setDriver(data.driver);
      }
    } catch {
      // Ignore load error
    }
  };

  const handleAction = async () => {
    if (!activeModal) return;
    setSubmitting(true);
    setMessage(null);

    let endpoint = '';
    let body: Record<string, unknown> | null = null;

    if (activeModal === 'approve') {
      endpoint = `/api/admin/drivers/${driverId}/approve`;
    } else if (activeModal === 'reject') {
      endpoint = `/api/admin/drivers/${driverId}/reject`;
      body = { reason: actionReason };
    } else if (activeModal === 'changes') {
      endpoint = `/api/admin/drivers/${driverId}/request-changes`;
      body = { reason: actionReason };
    } else if (activeModal === 'suspend') {
      endpoint = `/api/admin/drivers/${driverId}/suspend`;
      body = { reason: actionReason };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || data.error?.message || `Failed to execute ${activeModal} action.`,
        );
      }

      setMessage({
        type: 'success',
        text: `Driver application status updated via ${activeModal} action.`,
      });
      setActiveModal(null);
      setActionReason('');
      await refreshDriver();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentVerify = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document verified successfully.' });
        await refreshDriver();
      } else {
        alert(data.message || 'Failed to verify document.');
      }
    } catch {
      alert('Error verifying document.');
    }
  };

  const handleDocumentReject = async (documentId: string) => {
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
        await refreshDriver();
      } else {
        alert(data.message || 'Failed to reject document.');
      }
    } catch {
      alert('Error rejecting document.');
    }
  };

  const handleDownloadDoc = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/download-url`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(data.message || 'Failed to fetch document link.');
      }
    } catch {
      alert('Error downloading document.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400">Loading driver detail inspection...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-rose-400 font-semibold">Driver application not found.</p>
          <Link href="/admin/drivers" className="text-emerald-400 hover:underline text-sm">
            Return to Driver Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/admin/drivers" className="hover:text-emerald-400 transition-colors">
                Driver Directory
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">{driver.user.fullName}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {driver.user.fullName} Application Review
            </h1>
            <p className="text-slate-400 mt-1">
              DL: {driver.drivingLicenseNumber} • Account: {driver.user.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/drivers"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Back to List
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Action Panel */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Status Summary
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200">
                Onboarding: {driver.onboardingStatus}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200">
                Verification: {driver.verificationStatus}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${driver.approvalStatus === 'APPROVED' ? 'bg-emerald-900 text-emerald-200 border border-emerald-700' : 'bg-amber-900 text-amber-200 border border-amber-700'}`}
              >
                Approval: {driver.approvalStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveModal('approve')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg shadow transition-colors"
            >
              Approve Driver
            </button>

            <button
              onClick={() => setActiveModal('changes')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm rounded-lg shadow transition-colors"
            >
              Request Changes
            </button>

            <button
              onClick={() => setActiveModal('reject')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm rounded-lg shadow transition-colors"
            >
              Reject Application
            </button>

            <button
              onClick={() => setActiveModal('suspend')}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-medium text-sm rounded-lg shadow transition-colors"
            >
              Suspend Driver
            </button>
          </div>
        </div>

        {/* Profile & Document Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-3">
              Personal & Professional Info
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Full Name</span>
                <span className="font-medium text-white">{driver.user.fullName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Contact</span>
                <span className="font-medium text-slate-200">{driver.user.email}</span>
                {driver.user.phoneNumber && (
                  <span className="block text-xs text-slate-400">{driver.user.phoneNumber}</span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Driving License</span>
                <span className="font-medium text-slate-200">
                  {driver.drivingLicenseNumber} ({driver.licenseCategory || 'N/A'})
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Experience & Badge</span>
                <span className="font-medium text-slate-200">
                  {driver.yearsOfExperience} Years • Badge: {driver.badgeNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Location</span>
                <span className="font-medium text-slate-200">
                  {driver.city || 'N/A'}, {driver.state || 'N/A'} {driver.postalCode}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Preferred Vehicles</span>
                <span className="font-medium text-slate-200">
                  {driver.preferredVehicleTypes.join(', ') || 'None specified'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Service Areas</span>
                <span className="font-medium text-slate-200">
                  {driver.serviceAreas.join(', ') || 'None specified'}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Documents */}
          <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-3">
              Verification Documents
            </h2>

            {driver.documents.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {driver.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {doc.documentType.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : doc.status === 'REJECTED' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}
                        >
                          {doc.status}
                        </span>
                        <span className="text-xs text-slate-500">v{doc.version}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-x-3">
                        <span>File: {doc.originalFileName}</span>
                        {doc.documentNumber && <span>Doc #: {doc.documentNumber}</span>}
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-xs text-rose-400">Rejection: {doc.rejectionReason}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadDoc(doc.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 transition-colors"
                      >
                        View File
                      </button>

                      {doc.status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleDocumentVerify(doc.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          Verify
                        </button>
                      )}

                      {doc.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleDocumentReject(doc.id)}
                          className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Dialog for Actions */}
        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Confirm {activeModal.toUpperCase()} Action
              </h3>

              {activeModal !== 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Reason for {activeModal} *
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide clear rationale for the driver..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {activeModal === 'approve' && (
                <p className="text-slate-300 text-sm">
                  Are you sure you want to approve driver <strong>{driver.user.fullName}</strong>?
                  Once approved and documents verified, the driver can go AVAILABLE to accept rides.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || (activeModal !== 'approve' && !actionReason.trim())}
                  onClick={handleAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                >
                  {submitting && (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
