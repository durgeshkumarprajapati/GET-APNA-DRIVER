'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';
import { RatingStars } from '@/components/ui/rating-stars';
import { RatingSummary } from '@/components/ui/rating-summary';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/shared/formatting/money';

interface DriverPerformance {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  completedTrips: number;
  completionRate: string;
  cancellationRate: string;
  averageTripValue: string;
  totalEarnings: string;
}

interface DriverDetail {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  drivingLicenseNumber: string;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
  availabilityStatus: string;
  rejectionReason: string | null;
  changesRequestedReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    accountStatus: string;
  };
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

function driverDisplayName(driver: DriverDetail): string {
  if (driver.displayName) return driver.displayName;
  const combined = [driver.firstName, driver.lastName].filter(Boolean).join(' ');
  return combined || driver.user.email || 'Unnamed Driver';
}

export default function AdminDriverDetailPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = use(params);
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [performance, setPerformance] = useState<DriverPerformance | null>(null);
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
        const [driverRes, performanceRes] = await Promise.all([
          fetch(`/api/admin/drivers/${driverId}`),
          fetch(`/api/admin/drivers/${driverId}/performance`),
        ]);
        if (isMounted) {
          if (driverRes.ok) {
            const data = await driverRes.json();
            setDriver(data.profile);
          }
          if (performanceRes.ok) {
            const data = await performanceRes.json();
            setPerformance(data.performance);
          }
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
        setDriver(data.profile);
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
        setMessage({ type: 'error', text: data.message || 'Failed to verify document.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error verifying document.' });
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
        setMessage({ type: 'error', text: data.message || 'Failed to reject document.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error rejecting document.' });
    }
  };

  const handleDownloadDoc = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/download-url`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch document link.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error downloading document.' });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#68dba9] border-t-transparent mb-4" />
            <p className="text-[#bccac0]">Loading driver detail inspection...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!driver) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-4">
            <p className="text-[#ffb4ab] font-semibold">Driver application not found.</p>
            <Link href="/admin/drivers" className="text-[#68dba9] hover:underline text-sm">
              Return to Driver Directory
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const name = driverDisplayName(driver);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262a33] pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#87948b] mb-1">
              <Link href="/admin/drivers" className="hover:text-[#68dba9] transition-colors">
                Driver Directory
              </Link>
              <span>/</span>
              <span className="text-[#dfe2ee] font-medium">{name}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
                {name} Application Review
              </h1>
              {performance && performance.totalReviews > 0 && (
                <div className="flex items-center gap-1.5">
                  <RatingStars value={performance.averageRating} size="sm" />
                  <span className="text-xs text-[#87948b]">({performance.totalReviews})</span>
                </div>
              )}
            </div>
            <p className="text-[#bccac0] mt-1">
              DL: {driver.drivingLicenseNumber} • Account: {driver.user.email ?? 'No email on file'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/drivers"
              className="px-4 py-2 bg-[#181c24] hover:bg-[#262a33] text-[#bccac0] text-sm font-medium rounded-lg border border-[#262a33] transition-colors"
            >
              Back to List
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-[#00311f]/50 border-[#25a475] text-[#68dba9]' : 'bg-[#93000a]/20 border-[#93000a] text-[#ffb4ab]'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Action Panel */}
        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-[#87948b] tracking-wider">
              Status Summary
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#262a33] text-[#dfe2ee]">
                Onboarding: {driver.onboardingStatus}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#262a33] text-[#dfe2ee]">
                Verification: {driver.verificationStatus}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${driver.approvalStatus === 'APPROVED' ? 'bg-[#00311f] text-[#68dba9] border border-[#25a475]' : 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]'}`}
              >
                Approval: {driver.approvalStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('approve')}
              className="px-4 py-2 bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-sm rounded-lg shadow transition-colors"
            >
              Approve Driver
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('changes')}
              className="px-4 py-2 bg-[#5c4a00] hover:bg-[#7a6300] text-[#f5c04a] font-medium text-sm rounded-lg shadow transition-colors"
            >
              Request Changes
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('reject')}
              className="px-4 py-2 bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] font-medium text-sm rounded-lg shadow transition-colors"
            >
              Reject Application
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('suspend')}
              className="px-4 py-2 bg-[#3d2b5e] hover:bg-[#4e3878] text-[#dcc9ff] font-medium text-sm rounded-lg shadow transition-colors"
            >
              Suspend Driver
            </button>
          </div>
        </div>

        {/* Profile & Document Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1 bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-[#dfe2ee] border-b border-[#262a33] pb-3 font-['Space_Grotesk']">
              Personal &amp; Professional Info
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-[#87948b] block">Full Name</span>
                <span className="font-medium text-[#dfe2ee]">{name}</span>
              </div>
              <div>
                <span className="text-xs text-[#87948b] block">Contact</span>
                <span className="font-medium text-[#dfe2ee]">
                  {driver.user.email ?? 'No email on file'}
                </span>
                {driver.user.phoneNumber && (
                  <span className="block text-xs text-[#87948b]">{driver.user.phoneNumber}</span>
                )}
              </div>
              <div>
                <span className="text-xs text-[#87948b] block">Driving License</span>
                <span className="font-medium text-[#dfe2ee]">{driver.drivingLicenseNumber}</span>
              </div>
              <div>
                <span className="text-xs text-[#87948b] block">Experience</span>
                <span className="font-medium text-[#dfe2ee]">
                  {driver.drivingExperienceYears} Years
                </span>
              </div>
              <div>
                <span className="text-xs text-[#87948b] block">Primary Service Area</span>
                <span className="font-medium text-[#dfe2ee]">
                  {driver.primaryServiceArea || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#87948b] block">Availability</span>
                <span className="font-medium text-[#dfe2ee]">{driver.availabilityStatus}</span>
              </div>
            </div>
          </div>

          {/* Verification Documents */}
          <div className="lg:col-span-2 bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-[#dfe2ee] border-b border-[#262a33] pb-3 font-['Space_Grotesk']">
              Verification Documents
            </h2>

            {driver.documents.length === 0 ? (
              <p className="text-[#87948b] text-sm py-4">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {driver.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#dfe2ee]">
                          {doc.documentType.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.status === 'VERIFIED' ? 'bg-[#00311f] text-[#68dba9] border border-[#25a475]' : doc.status === 'REJECTED' ? 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]' : 'bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]'}`}
                        >
                          {doc.status}
                        </span>
                        <span className="text-xs text-[#87948b]">v{doc.version}</span>
                      </div>
                      <div className="text-xs text-[#87948b] space-x-3">
                        <span>File: {doc.originalFileName}</span>
                        {doc.documentNumber && <span>Doc #: {doc.documentNumber}</span>}
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-xs text-[#ffb4ab]">Rejection: {doc.rejectionReason}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(doc.id)}
                        className="px-3 py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-medium rounded-md border border-[#262a33] transition-colors"
                      >
                        View File
                      </button>

                      {doc.status !== 'VERIFIED' && (
                        <button
                          type="button"
                          onClick={() => handleDocumentVerify(doc.id)}
                          className="px-3 py-1.5 bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold rounded-md transition-colors"
                        >
                          Verify
                        </button>
                      )}

                      {doc.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleDocumentReject(doc.id)}
                          className="px-3 py-1.5 bg-[#93000a]/80 hover:bg-[#690005] text-[#ffdad6] text-xs font-medium rounded-md transition-colors"
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

        {/* Performance & Ratings */}
        {performance && (
          <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-[#dfe2ee] border-b border-[#262a33] pb-3 font-['Space_Grotesk']">
              Performance &amp; Ratings
            </h2>
            <RatingSummary
              averageRating={performance.averageRating}
              totalReviews={performance.totalReviews}
              distribution={performance.ratingDistribution}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Completed Trips" value={performance.completedTrips} />
              <MetricCard
                label="Completion Rate"
                value={`${(Number(performance.completionRate) * 100).toFixed(1)}%`}
                accent="positive"
              />
              <MetricCard
                label="Cancellation Rate"
                value={`${(Number(performance.cancellationRate) * 100).toFixed(1)}%`}
                accent={Number(performance.cancellationRate) > 0.1 ? 'negative' : 'default'}
              />
              <MetricCard
                label="Total Earnings"
                value={formatCurrency(performance.totalEarnings)}
                accent="positive"
              />
            </div>
          </div>
        )}

        {/* Modal Dialog for Actions */}
        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-[#dfe2ee] uppercase tracking-wider font-['Space_Grotesk']">
                Confirm {activeModal.toUpperCase()} Action
              </h3>

              {activeModal !== 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-[#bccac0] mb-1">
                    Reason for {activeModal} *
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide clear rationale for the driver..."
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-lg p-2.5 text-[#dfe2ee] text-sm focus:ring-2 focus:ring-[#68dba9] focus:outline-none"
                  />
                </div>
              )}

              {activeModal === 'approve' && (
                <p className="text-[#bccac0] text-sm">
                  Are you sure you want to approve driver <strong>{name}</strong>? Once approved and
                  documents verified, the driver can go AVAILABLE to accept rides.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#262a33] hover:bg-[#353942] text-[#bccac0] text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || (activeModal !== 'approve' && !actionReason.trim())}
                  onClick={handleAction}
                  className="px-4 py-2 bg-[#25a475] hover:bg-[#68dba9] disabled:opacity-50 text-[#00311f] text-sm font-bold rounded-lg flex items-center gap-2"
                >
                  {submitting && (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#00311f] border-t-transparent" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
